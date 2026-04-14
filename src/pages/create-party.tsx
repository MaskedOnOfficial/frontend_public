import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import api from "../lib/api";
import { getApiErrorMessage } from "../lib/errors";
import { getTrustLevel } from "../lib/trust-levels";
import { isNative } from "../lib/capacitor";
import { takePhoto } from "../lib/native-camera";
import { motion } from "framer-motion";
import { Image, MapPin, Clock, Users, Ticket, Shield, Tag, Loader2, Sparkles, X, ChevronDown, Eye } from "lucide-react";

interface PreviewForm {
  title: string;
  location_city: string;
  date_time: string;
  max_capacity: number;
  ticket_price: number;
  min_rating: number;
}

function PreviewCard({ form, isFree }: { form: PreviewForm; isFree: boolean }) {
  return (
    <>
      <p className="text-[10px] uppercase tracking-[0.2em] text-text-dim font-bold mb-1.5">Live Preview</p>
      <h3 className="text-lg font-bold text-text mb-5 tracking-tight">{form.title.trim() || "Untitled Experience"}</h3>
      <div className="space-y-3.5 text-sm">
        {[
          { icon: MapPin, label: "City", value: form.location_city || "—", color: "text-accent" },
          { icon: Clock, label: "When", value: form.date_time ? new Date(form.date_time).toLocaleDateString("en-IN", { month: "short", day: "numeric" }) : "—", color: "text-primary" },
          { icon: Users, label: "Capacity", value: `${form.max_capacity} guests`, color: "text-text-muted" },
          { icon: Ticket, label: "Entry", value: isFree ? "Free" : `₹${Number(form.ticket_price || 0)}`, color: "text-hot" },
          { icon: Shield, label: "Trust gate", value: Number(form.min_rating) > 0 ? getTrustLevel(Number(form.min_rating), 1).name + "+" : "Open", color: "text-warning" },
        ].map((item) => (
          <div key={item.label} className="flex items-center justify-between">
            <span className="text-text-muted flex items-center gap-2"><item.icon className={`w-3.5 h-3.5 ${item.color}`} />{item.label}</span>
            <span className="text-text font-semibold">{item.value}</span>
          </div>
        ))}
      </div>
      <div className="mt-5 pt-5 border-t border-primary/[0.06]">
        <p className="text-sm text-text-dim leading-relaxed">Your listing goes live instantly after publish.</p>
      </div>
    </>
  );
}

export default function CreatePartyPage() {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    title: "",
    description: "",
    location_name: "",
    location_city: "",
    date_time: "",
    end_time: "",
    max_capacity: 20,
    ticket_price: 0,
    tags: "",
    min_rating: 0,
  });

  const [coverImage, setCoverImage] = useState<File | null>(null);
  const [coverImagePreview, setCoverImagePreview] = useState<string>("");
  const [showMobilePreview, setShowMobilePreview] = useState(false);
  // #34 — Track which fields have been touched for validation
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  function handleBlur(e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) {
    setTouched((prev) => ({ ...prev, [e.target.name]: true }));
  }

  // #34 — Validation helper
  function fieldError(name: string, value: string): boolean {
    return touched[name] === true && !value.trim();
  }

  function handleCoverImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    applyCoverImage(file);
  }

  function applyCoverImage(file: File) {
    if (file.size > 5 * 1024 * 1024) { setError("Cover image too large (max 5 MB)"); return; }
    setCoverImage(file);
    const reader = new FileReader();
    reader.onload = (event) => {
      setCoverImagePreview(event.target?.result as string);
    };
    reader.readAsDataURL(file);
  }

  async function triggerCoverUpload() {
    if (isNative()) {
      const file = await takePhoto();
      if (file) applyCoverImage(file);
    } else {
      fileInputRef.current?.click();
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const formData = new FormData();
      formData.append("title", form.title);
      if (form.description) formData.append("description", form.description);
      formData.append("location_name", form.location_name);
      formData.append("location_city", form.location_city);
      formData.append("date_time", new Date(form.date_time).toISOString());
      if (form.end_time) {
      if (new Date(form.end_time) <= new Date(form.date_time)) {
        setError("End time must be after start time");
        setLoading(false);
        return;
      }
      formData.append("end_time", new Date(form.end_time).toISOString());
    }
      formData.append("max_capacity", String(form.max_capacity));
      formData.append("ticket_price", String(Math.round(Number(form.ticket_price) * 100)));
      if (form.tags) {
        const tags = form.tags.split(",").map((t) => t.trim()).filter(Boolean);
        if (tags.length > 0) formData.append("tags", JSON.stringify(tags));
      }
      if (Number(form.min_rating) > 0) formData.append("min_rating", String(form.min_rating));
      if (coverImage) formData.append("cover_image", coverImage);

      const res = await api.post("/parties", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      navigate(`/parties/${res.data.data.party.id}`);
    } catch (submitError: unknown) {
      setError(getApiErrorMessage(submitError, "Failed to create party"));
    } finally {
      setLoading(false);
    }
  }

  const tagCount = form.tags.split(",").map((tag) => tag.trim()).filter(Boolean).length;
  const isFree = Number(form.ticket_price) === 0;

  return (
    <div className="min-h-screen bg-bg pb-32 md:pb-12">
      <div className="max-w-6xl mx-auto px-4 py-6 md:py-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <h1 className="text-2xl md:text-3xl font-bold text-text tracking-tight">Create Party</h1>
          <p className="text-text-dim text-sm mt-0.5 max-w-lg">
            Configure vibe, capacity, trust gates, and pricing. Your listing goes live instantly.
          </p>
        </motion.div>

        {error && (
          <div className="bg-error/10 border border-error/20 text-error rounded-2xl p-4 mb-6 text-sm">{error}</div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          <form onSubmit={handleSubmit} className="space-y-6 lg:col-span-2">
            {/* Identity */}
            <section className="glass-panel rounded-2xl p-5 space-y-5">
              <h2 className="text-sm font-bold text-text flex items-center gap-2"><Tag className="w-3.5 h-3.5 text-primary" />Identity</h2>
              <div>
                <label className="block text-[11px] font-bold text-text-muted uppercase tracking-[0.12em] mb-2">Party Title *</label>
                <input name="title" value={form.title} onChange={handleChange} onBlur={handleBlur} placeholder="e.g., Rooftop Vibes Vol. 3" required maxLength={100}
                  className={`input-luxe w-full rounded-xl px-4 py-3.5 ${fieldError('title', form.title) ? 'ring-2 ring-error/50' : ''}`} />
                {fieldError('title', form.title) && <p className="text-error text-[10px] mt-1 font-semibold">Title is required</p>}
              </div>
              <div>
                <label className="block text-[11px] font-bold text-text-muted uppercase tracking-[0.12em] mb-2">Description</label>
                <textarea name="description" value={form.description} onChange={handleChange} placeholder="Set the mood, dress code, music profile..." rows={4} maxLength={2000} className="input-luxe w-full rounded-xl px-4 py-3.5 resize-none" />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-text-muted uppercase tracking-[0.12em] mb-2">Tags</label>
                <input name="tags" value={form.tags} onChange={handleChange} placeholder="rooftop, afro-house, intimate" maxLength={500} className="input-luxe w-full rounded-xl px-4 py-3.5" />
                <p className="text-text-dim text-xs mt-1.5">{tagCount} tag{tagCount === 1 ? "" : "s"} · Separate with commas</p>
              </div>
            </section>

            {/* Cover Image */}
            <section className="glass-panel rounded-2xl p-5 space-y-4">
              <h2 className="text-sm font-bold text-text flex items-center gap-2"><Image className="w-3.5 h-3.5 text-accent" />Cover Image</h2>
              {coverImagePreview && (
                <div className="relative rounded-2xl overflow-hidden bg-surface">
                  <img src={coverImagePreview} alt="Cover preview" className="w-full h-48 object-cover" />
                  <button type="button" aria-label="Remove cover image" onClick={() => { setCoverImage(null); setCoverImagePreview(""); if (fileInputRef.current) fileInputRef.current.value = ""; }}
                    className="absolute top-3 right-3 bg-error/80 text-white rounded-full w-8 h-8 flex items-center justify-center hover:bg-error transition">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}
              <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={handleCoverImageChange} aria-label="Upload cover image" className="hidden" />
              <button type="button" onClick={triggerCoverUpload} className="btn-secondary-luxe w-full px-4 py-3.5 rounded-xl font-bold flex items-center justify-center gap-2">
                <Image className="w-4 h-4" />
                {coverImage ? "Change Image" : "Choose Cover Image"}
              </button>
              <p className="text-text-dim text-xs">JPEG, PNG, or WebP (Max 5 MB)</p>
            </section>

            {/* Location & Time */}
            <section className="glass-panel rounded-2xl p-5 space-y-5">
              <h2 className="text-sm font-bold text-text flex items-center gap-2"><MapPin className="w-3.5 h-3.5 text-accent" />Location & Time</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-text-muted uppercase tracking-[0.12em] mb-2">Location Name *</label>
                  <input name="location_name" value={form.location_name} onChange={handleChange} onBlur={handleBlur} placeholder="Skydeck, Indiranagar" required
                    className={`input-luxe w-full rounded-xl px-4 py-3.5 ${fieldError('location_name', form.location_name) ? 'ring-2 ring-error/50' : ''}`} />
                  {fieldError('location_name', form.location_name) && <p className="text-error text-[10px] mt-1 font-semibold">Location is required</p>}
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-text-muted uppercase tracking-[0.12em] mb-2">City *</label>
                  <input name="location_city" value={form.location_city} onChange={handleChange} onBlur={handleBlur} placeholder="Bangalore" required
                    className={`input-luxe w-full rounded-xl px-4 py-3.5 ${fieldError('location_city', form.location_city) ? 'ring-2 ring-error/50' : ''}`} />
                  {fieldError('location_city', form.location_city) && <p className="text-error text-[10px] mt-1 font-semibold">City is required</p>}
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-text-muted uppercase tracking-[0.12em] mb-2">Start *</label>
                  <input type="datetime-local" name="date_time" value={form.date_time} onChange={handleChange} required className="input-luxe w-full rounded-xl px-4 py-3.5" aria-label="Start date and time" />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-text-muted uppercase tracking-[0.12em] mb-2">End</label>
                  <input type="datetime-local" name="end_time" value={form.end_time} onChange={handleChange} min={form.date_time || undefined} className="input-luxe w-full rounded-xl px-4 py-3.5" aria-label="End date and time" />
                  {form.end_time && form.date_time && new Date(form.end_time) <= new Date(form.date_time) && (
                    <p className="text-error text-[10px] mt-1 font-semibold">End time must be after start time</p>
                  )}
                </div>
              </div>
            </section>

            {/* Capacity & Pricing */}
            <section className="glass-panel rounded-2xl p-5 space-y-5">
              <h2 className="text-sm font-bold text-text flex items-center gap-2"><Users className="w-3.5 h-3.5 text-hot" />Capacity, Pricing & Trust</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-text-muted uppercase tracking-[0.12em] mb-2">Max Capacity *</label>
                  <input type="number" name="max_capacity" value={form.max_capacity} onChange={handleChange} min={2} max={10000} required className="input-luxe w-full rounded-xl px-4 py-3.5" aria-label="Maximum party capacity" />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-text-muted uppercase tracking-[0.12em] mb-2">Ticket Price (₹)</label>
                  <input type="number" name="ticket_price" value={form.ticket_price} onChange={(e) => setForm({ ...form, ticket_price: Math.max(0, Number(e.target.value)) })} min={0} step="1" className="input-luxe w-full rounded-xl px-4 py-3.5" aria-label="Ticket price in rupees" />
                  <span className="text-text-dim text-xs mt-1.5 block">0 = Free entry</span>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-text-muted uppercase tracking-[0.12em] mb-2">Min Rating</label>
                  <input type="number" name="min_rating" value={form.min_rating} onChange={handleChange} min={0} max={5} step="0.1" className="input-luxe w-full rounded-xl px-4 py-3.5" aria-label="Minimum attendee rating" />
                  <span className="text-text-dim text-xs mt-1.5 block">0 = No restriction</span>
                </div>
              </div>
            </section>

            <button type="submit" disabled={loading} className="btn-primary-luxe w-full font-bold py-4 rounded-2xl disabled:opacity-50 flex items-center justify-center gap-2">
              {loading ? <><Loader2 className="w-4 h-4 animate-spin" />Publishing...</> : <><Sparkles className="w-4 h-4" />Publish Party</>}
            </button>
          </form>

          {/* #33 — Mobile preview (collapsible) */}
          <div className="lg:hidden">
            <button type="button" onClick={() => setShowMobilePreview(!showMobilePreview)}
              className="w-full btn-secondary-luxe py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 mb-4 tap-active">
              <Eye className="w-4 h-4" /> Preview
              <ChevronDown className={`w-4 h-4 transition-transform ${showMobilePreview ? 'rotate-180' : ''}`} />
            </button>
            {showMobilePreview && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="overflow-hidden mb-6">
                <PreviewCard form={form} isFree={isFree} />
              </motion.div>
            )}
          </div>

          {/* Desktop Preview sidebar */}
          <motion.aside
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="hidden lg:block glass-panel rounded-2xl p-5 lg:sticky lg:top-24"
          >
            <PreviewCard form={form} isFree={isFree} />
          </motion.aside>
        </div>
      </div>
    </div>
  );
}
