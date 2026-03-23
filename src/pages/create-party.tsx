import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import api from "../lib/api";
import { getApiErrorMessage } from "../lib/errors";

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

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  function handleCoverImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setCoverImage(file);
    const reader = new FileReader();
    reader.onload = (event) => {
      setCoverImagePreview(event.target?.result as string);
    };
    reader.readAsDataURL(file);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      // Create FormData to handle file upload
      const formData = new FormData();
      formData.append("title", form.title);
      if (form.description) formData.append("description", form.description);
      formData.append("location_name", form.location_name);
      formData.append("location_city", form.location_city);
      formData.append("date_time", new Date(form.date_time).toISOString());
      if (form.end_time) formData.append("end_time", new Date(form.end_time).toISOString());
      formData.append("max_capacity", String(form.max_capacity));
      formData.append("ticket_price", String(Math.round(Number(form.ticket_price) * 100)));
      if (form.tags) {
        const tags = form.tags.split(",").map((t) => t.trim()).filter(Boolean);
        if (tags.length > 0) formData.append("tags", JSON.stringify(tags));
      }
      if (Number(form.min_rating) > 0) formData.append("min_rating", String(form.min_rating));
      
      // Add cover image if selected
      if (coverImage) {
        formData.append("cover_image", coverImage);
      }

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

  const inputClass = "input-luxe w-full rounded-xl px-4 py-3";
  const labelClass = "block text-text font-semibold text-sm mb-1";
  const tagCount = form.tags
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean).length;
  const isFree = Number(form.ticket_price) === 0;

  return (
    <div className="min-h-screen bg-bg">
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="glass-panel rounded-3xl p-6 sm:p-8 mb-6">
          <p className="text-xs uppercase tracking-[0.25em] text-text-muted mb-2">Host Control Suite</p>
          <h1 className="text-3xl sm:text-4xl font-bold text-text">Design Your Next Signature Night</h1>
          <p className="text-text-muted mt-2 max-w-2xl">
            Configure vibe, capacity, trust gates, and pricing in one flow. Guests will see a polished listing the moment you publish.
          </p>
        </div>

        {error && (
          <div className="bg-error/10 border border-error/30 text-error rounded-xl p-3 mb-6 text-sm">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          <form onSubmit={handleSubmit} className="space-y-6 lg:col-span-2">
            <section className="glass-panel rounded-2xl p-5 space-y-4">
              <h2 className="text-lg font-bold text-text">Identity</h2>
              <div>
                <label className={labelClass}>Party Title *</label>
                <input
                  name="title"
                  value={form.title}
                  onChange={handleChange}
                  placeholder="e.g., Rooftop Vibes Vol. 3"
                  required
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Description</label>
                <textarea
                  name="description"
                  value={form.description}
                  onChange={handleChange}
                  placeholder="Set the mood, dress code, music profile, and guest expectations..."
                  rows={4}
                  className={`${inputClass} resize-none`}
                />
              </div>
              <div>
                <label className={labelClass}>Tags</label>
                <input
                  name="tags"
                  value={form.tags}
                  onChange={handleChange}
                  placeholder="rooftop, afro-house, intimate, invite-only"
                  className={inputClass}
                />
                <p className="text-xs text-text-muted mt-1">{tagCount} tag{tagCount === 1 ? "" : "s"} configured</p>
              </div>
            </section>

            <section className="glass-panel rounded-2xl p-5 space-y-4">
              <h2 className="text-lg font-bold text-text">📸 Cover Image</h2>
              <p className="text-text-muted text-sm">Upload an attractive image that will be shown as the party thumbnail and featured in the photo gallery.</p>
              
              {coverImagePreview && (
                <div className="relative rounded-xl overflow-hidden bg-surface">
                  <img src={coverImagePreview} alt="Cover preview" className="w-full h-48 object-cover" />
                  <button
                    type="button"
                    onClick={() => {
                      setCoverImage(null);
                      setCoverImagePreview("");
                      if (fileInputRef.current) fileInputRef.current.value = "";
                    }}
                    className="absolute top-2 right-2 bg-error/80 text-white rounded-full w-8 h-8 flex items-center justify-center hover:bg-error transition text-sm"
                  >
                    ✕
                  </button>
                </div>
              )}

              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleCoverImageChange}
                aria-label="Upload cover image"
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="btn-secondary-luxe w-full px-4 py-3 rounded-xl font-semibold transition"
              >
                {coverImage ? "📤 Change Image" : "📤 Choose Cover Image"}
              </button>
              <p className="text-text-muted text-xs">JPEG, PNG, or WebP (Max 5 MB)</p>
            </section>

            <section className="glass-panel rounded-2xl p-5 space-y-4">
              <h2 className="text-lg font-bold text-text">Location & Time</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Location Name *</label>
                  <input
                    name="location_name"
                    value={form.location_name}
                    onChange={handleChange}
                    placeholder="e.g., Skydeck, Indiranagar"
                    required
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>City *</label>
                  <input
                    name="location_city"
                    value={form.location_city}
                    onChange={handleChange}
                    placeholder="e.g., Bangalore"
                    required
                    className={inputClass}
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Start Date & Time *</label>
                  <input
                    type="datetime-local"
                    name="date_time"
                    aria-label="Start date and time"
                    value={form.date_time}
                    onChange={handleChange}
                    required
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>End Date & Time</label>
                  <input
                    type="datetime-local"
                    name="end_time"
                    aria-label="End date and time"
                    value={form.end_time}
                    onChange={handleChange}
                    className={inputClass}
                  />
                </div>
              </div>
            </section>

            <section className="glass-panel rounded-2xl p-5 space-y-4">
              <h2 className="text-lg font-bold text-text">Capacity, Pricing & Trust</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className={labelClass}>Max Capacity *</label>
                  <input
                    type="number"
                    name="max_capacity"
                    aria-label="Maximum party capacity"
                    value={form.max_capacity}
                    onChange={handleChange}
                    min={2}
                    max={10000}
                    required
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>Ticket Price (?)</label>
                  <input
                    type="number"
                    name="ticket_price"
                    aria-label="Ticket price in rupees"
                    value={form.ticket_price}
                    onChange={handleChange}
                    min={0}
                    step="1"
                    className={inputClass}
                  />
                  <span className="text-text-muted text-xs mt-1 block">0 = Free entry</span>
                </div>
                <div>
                  <label className={labelClass}>Min Rating</label>
                  <input
                    type="number"
                    name="min_rating"
                    aria-label="Minimum attendee rating"
                    value={form.min_rating}
                    onChange={handleChange}
                    min={0}
                    max={5}
                    step="0.1"
                    className={inputClass}
                  />
                  <span className="text-text-muted text-xs mt-1 block">0 = No restriction</span>
                </div>
              </div>
            </section>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary-luxe w-full font-semibold py-3 rounded-xl transition disabled:opacity-50"
            >
              {loading ? "Publishing Party..." : "Publish Party"}
            </button>
          </form>

          <aside className="glass-panel rounded-2xl p-5 lg:sticky lg:top-24">
            <p className="text-xs uppercase tracking-[0.2em] text-text-muted mb-2">Live Brief</p>
            <h3 className="text-xl font-bold text-text mb-4">
              {form.title.trim() || "Untitled Experience"}
            </h3>
            <div className="space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-text-muted">City</span>
                <span className="text-text">{form.location_city || "-"}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-text-muted">Capacity</span>
                <span className="text-text">{form.max_capacity} guests</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-text-muted">Entry</span>
                <span className="text-text">{isFree ? "Free" : `?${Number(form.ticket_price || 0)}`}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-text-muted">Trust gate</span>
                <span className="text-text">{Number(form.min_rating) > 0 ? `? ${Number(form.min_rating).toFixed(1)}+` : "Open"}</span>
              </div>
            </div>

            <div className="mt-5 pt-5 border-t border-white/10">
              <p className="text-sm text-text-muted leading-relaxed">
                Your listing goes live instantly after publish. Keep details precise for higher request quality and faster approvals.
              </p>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
