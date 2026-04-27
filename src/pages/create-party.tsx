import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/auth-hook";
import { compressAndStripMetadata } from "../lib/image-utils";
import api from "../lib/api";
import { getApiErrorMessage } from "../lib/errors";
import { isNative } from "../lib/capacitor";
import { takePhoto } from "../lib/native-camera";
import { hapticsMedium } from "../lib/haptics";
import { motion, AnimatePresence } from "framer-motion";
import {
  MapPin, Clock, Users, Ticket, Shield, Loader2, Sparkles, X,
  ChevronRight, ChevronLeft, Camera, Upload, Calendar,
  Zap, Crown, PartyPopper, Check, Save, Trash2, Info,
} from "lucide-react";

// ═══════════════════════════════════════════════════════════
// Constants
// ═══════════════════════════════════════════════════════════

const DRAFT_KEY = "maskedon_party_draft";

const SUGGESTED_TAGS = [
  "rooftop", "underground", "house-music", "afro-house", "techno", "hip-hop",
  "lounge", "pool-party", "brunch", "sunset", "warehouse", "intimate",
  "luxury", "themed", "costume", "halloween", "new-year", "desi-night",
  "bollywood", "indie", "live-music", "acoustic", "open-mic", "karaoke",
  "networking", "art-show", "garden", "beach", "yacht", "after-party",
];

const PRICE_PRESETS = [
  { label: "Free", value: 0, icon: PartyPopper, desc: "Open to all" },
  { label: "\u20B9100\u2013500", value: 300, icon: Ticket, desc: "Budget friendly" },
  { label: "\u20B9500\u20132K", value: 1000, icon: Crown, desc: "Premium vibes" },
  { label: "Custom", value: -1, icon: Zap, desc: "Set your own" },
];

const CAPACITY_PRESETS = [
  { label: "Intimate", value: 10, emoji: "\uD83D\uDD6F\uFE0F" },
  { label: "Small", value: 30, emoji: "\uD83C\uDF78" },
  { label: "Medium", value: 75, emoji: "\uD83C\uDF89" },
  { label: "Large", value: 200, emoji: "\uD83C\uDFDF\uFE0F" },
  { label: "Massive", value: 500, emoji: "\uD83D\uDD25" },
];

const TRUST_GATES = [
  { rating: 0, label: "Open", desc: "Anyone can join", color: "text-success" },
  { rating: 2.0, label: "Drifter+", desc: "Rating 2.0+", color: "text-orange-400" },
  { rating: 3.0, label: "Socialite+", desc: "Rating 3.0+", color: "text-yellow-400" },
  { rating: 3.6, label: "Spark+", desc: "Rating 3.6+", color: "text-accent" },
  { rating: 4.3, label: "Luminary+", desc: "Rating 4.3+", color: "text-primary" },
  { rating: 4.8, label: "Inferno+", desc: "Rating 4.8+", color: "text-hot" },
];

const STEP_META = [
  { title: "The Vibe", sub: "Name your experience" },
  { title: "When & Where", sub: "Set the scene" },
  { title: "Access & Pricing", sub: "Control the gate" },
];

interface FormState {
  title: string;
  description: string;
  location_name: string;
  location_city: string;
  date_time: string;
  end_time: string;
  max_capacity: number;
  ticket_price: number;
  tags: string[];
  min_rating: number;
}

const EMPTY_FORM: FormState = {
  title: "",
  description: "",
  location_name: "",
  location_city: "",
  date_time: "",
  end_time: "",
  max_capacity: 30,
  ticket_price: 0,
  tags: [],
  min_rating: 0,
};

// ═══════════════════════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════════════════════

function loadDraft(draftKey: string): Partial<FormState> | null {
  try {
    const raw = localStorage.getItem(draftKey);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}
function saveDraft(draftKey: string, form: FormState) {
  try { localStorage.setItem(draftKey, JSON.stringify(form)); } catch { /* quota */ }
}
function clearDraft(draftKey: string) { localStorage.removeItem(draftKey); }

function getRelativeDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = date.getTime() - now.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays < 0) return "In the past";
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Tomorrow";
  if (diffDays <= 7) return `This ${date.toLocaleDateString("en-IN", { weekday: "long" })}`;
  if (diffDays <= 14) return `Next ${date.toLocaleDateString("en-IN", { weekday: "long" })}`;
  return `In ${diffDays} days`;
}

function getDuration(start: string, end: string): string {
  const ms = new Date(end).getTime() - new Date(start).getTime();
  const h = Math.floor(ms / 3_600_000);
  const m = Math.round((ms % 3_600_000) / 60_000);
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

// ═══════════════════════════════════════════════════════════
// Sub-Components
// ═══════════════════════════════════════════════════════════

function StepIndicator({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex items-center gap-1.5 w-full max-w-xs mx-auto">
      {Array.from({ length: total }, (_, i) => {
        const s = i + 1;
        const done = s < current;
        const active = s === current;
        return (
          <div key={s} className="flex items-center flex-1">
            <div className={`
              flex items-center justify-center w-8 h-8 rounded-full text-xs font-bold transition-all duration-300
              ${done ? "bg-primary text-white shadow-[0_0_12px_rgba(139,92,246,0.4)]" : active ? "host-step-active" : "bg-surface-light text-text-dim border border-border"}
            `}>
              {done ? <Check className="w-3.5 h-3.5" /> : s}
            </div>
            {s < total && (
              <div className={`flex-1 h-0.5 mx-1.5 rounded-full transition-all duration-500 ${done ? "bg-primary" : "bg-border"}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

function TagChip({ tag, selected, onToggle }: { tag: string; selected: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={() => { onToggle(); hapticsMedium(); }}
      className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all duration-200 tap-active
        ${selected ? "host-tag-selected" : "host-tag-idle"}`}
    >
      {tag}
    </button>
  );
}

function CapacitySelector({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [custom, setCustom] = useState(false);

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-5 gap-2">
        {CAPACITY_PRESETS.map((p) => (
          <button
            key={p.value}
            type="button"
            onClick={() => { setCustom(false); onChange(p.value); hapticsMedium(); }}
            className={`flex flex-col items-center gap-0.5 p-2.5 rounded-xl transition-all duration-200 tap-active
              ${!custom && value === p.value ? "host-capacity-active" : "host-capacity-idle"}`}
          >
            <span className="text-base leading-none">{p.emoji}</span>
            <span className="text-[9px] font-bold uppercase tracking-wider mt-0.5">{p.label}</span>
            <span className="text-[9px] text-text-dim">{p.value}</span>
          </button>
        ))}
      </div>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => { setCustom(true); hapticsMedium(); }}
          className={`text-xs font-semibold transition-colors ${custom ? "text-primary" : "text-text-dim hover:text-text-muted"}`}
        >
          Custom capacity \u2192
        </button>
        {custom && (
          <motion.div initial={{ opacity: 0, width: 0 }} animate={{ opacity: 1, width: "auto" }}>
            <input
              type="number"
              value={value}
              onChange={(e) => onChange(Math.max(2, Math.min(10000, Number(e.target.value))))}
              min={2}
              max={10000}
              className="input-luxe w-24 rounded-lg px-3 py-2 text-sm text-center"
            />
          </motion.div>
        )}
      </div>
    </div>
  );
}

function TrustGateSelector({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div className="grid grid-cols-3 gap-2">
      {TRUST_GATES.map((g) => (
        <button
          key={g.rating}
          type="button"
          onClick={() => { onChange(g.rating); hapticsMedium(); }}
          className={`flex flex-col items-center gap-0.5 p-2.5 rounded-xl transition-all duration-200 tap-active
            ${value === g.rating ? "host-gate-active" : "host-gate-idle"}`}
        >
          <span className={`text-sm font-bold ${g.color}`}>{g.label}</span>
          <span className="text-[9px] text-text-dim">{g.desc}</span>
        </button>
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// Main Page
// ═══════════════════════════════════════════════════════════

export default function CreatePartyPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const fileRef = useRef<HTMLInputElement>(null);

  const draftKey = user ? `${DRAFT_KEY}_${user.id}` : DRAFT_KEY;

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [step, setStep] = useState(1);
  const [dir, setDir] = useState(1);
  const [showDraft, setShowDraft] = useState(false);
  const [priceTier, setPriceTier] = useState(0);

  const [form, setForm] = useState<FormState>({ ...EMPTY_FORM });
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState("");
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  // --- Draft load ---
  useEffect(() => {
    const d = loadDraft(draftKey);
    if (d && (d.title || d.description || d.location_name)) {
      setForm((prev) => ({ ...prev, ...d }));
      setShowDraft(true);
    }
  }, [draftKey]);

  // --- Auto-save ---
  useEffect(() => {
    if (!form.title && !form.description && !form.location_name) return;
    const t = setTimeout(() => saveDraft(draftKey, form), 1200);
    return () => clearTimeout(t);
  }, [draftKey, form]);

  // --- Handlers ---
  function set(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    setForm((p) => ({ ...p, [e.target.name]: e.target.value }));
  }
  function blur(e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) {
    setTouched((p) => ({ ...p, [e.target.name]: true }));
  }
  function getFieldError(name: string): string {
    if (!touched[name]) return "";
    switch (name) {
      case "title":
        if (!form.title.trim()) return "Give your party a name so guests know what to expect";
        if (form.title.trim().length < 3) return "Title needs to be at least 3 characters long";
        return "";
      case "location_name":
        if (!form.location_name.trim()) return "Add the venue or place name — guests need to know where to go";
        if (form.location_name.trim().length < 2) return "Venue name is too short";
        return "";
      case "location_city":
        if (!form.location_city.trim()) return "Which city is this happening in?";
        return "";
      case "date_time":
        if (!form.date_time) return "Pick a date and time for the party";
        if (new Date(form.date_time) <= new Date()) return "That date is already in the past — choose a future date";
        return "";
      default:
        return "";
    }
  }
  function toggleTag(tag: string) {
    setForm((p) => {
      if (p.tags.includes(tag)) return { ...p, tags: p.tags.filter((t) => t !== tag) };
      if (p.tags.length >= 10) return p;
      return { ...p, tags: [...p.tags, tag] };
    });
  }

  function applyCover(file: File) {
    const allowedMimes = ["image/jpeg", "image/png", "image/webp"];
    if (!allowedMimes.includes(file.type)) { setError("Only JPEG, PNG, and WebP images are allowed"); return; }
    if (file.size > 5 * 1024 * 1024) { setError("Cover image too large (max 5 MB)"); return; }
    setCoverFile(file);
    const r = new FileReader();
    r.onload = (e) => setCoverPreview(e.target?.result as string);
    r.readAsDataURL(file);
  }
  function handleCoverInput(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (f) applyCover(f);
  }
  async function triggerCover() {
    if (isNative()) {
      const f = await takePhoto();
      if (f) applyCover(f);
    } else {
      fileRef.current?.click();
    }
  }
  function removeCover() {
    setCoverFile(null);
    setCoverPreview("");
    if (fileRef.current) fileRef.current.value = "";
  }

  // --- Step nav ---
  function canProceed(): boolean {
    if (step === 1) return form.title.trim().length >= 3;
    if (step === 2) {
      return !!form.location_name.trim() &&
        form.location_name.trim().length >= 2 &&
        !!form.location_city.trim() &&
        !!form.date_time &&
        new Date(form.date_time) > new Date();
    }
    return true;
  }
  function goNext() {
    if (step === 1) {
      setTouched((p) => ({ ...p, title: true }));
    } else if (step === 2) {
      setTouched((p) => ({ ...p, location_name: true, location_city: true, date_time: true }));
    }
    if (!canProceed()) return;
    setDir(1);
    setStep((s) => Math.min(s + 1, 3));
    hapticsMedium();
  }
  function goBack() {
    setDir(-1);
    setStep((s) => Math.max(s - 1, 1));
    hapticsMedium();
  }

  // --- Submit ---
  async function handleSubmit() {
    setLoading(true);
    setError("");
    try {
      const fd = new FormData();
      fd.append("title", form.title);
      if (form.description) fd.append("description", form.description);
      fd.append("location_name", form.location_name);
      fd.append("location_city", form.location_city);
      fd.append("date_time", new Date(form.date_time).toISOString());
      if (form.end_time) {
        if (new Date(form.end_time) <= new Date(form.date_time)) {
          setError("The end time needs to be after the start time — please go back and fix it");
          setLoading(false);
          return;
        }
        fd.append("end_time", new Date(form.end_time).toISOString());
      }
      fd.append("max_capacity", String(form.max_capacity));
      fd.append("ticket_price", String(Math.round(Number(form.ticket_price) * 100)));
      if (form.tags.length > 0) fd.append("tags", JSON.stringify(form.tags));
      if (form.min_rating > 0) fd.append("min_rating", String(form.min_rating));
      if (coverFile) fd.append("cover_image", await compressAndStripMetadata(coverFile, { maxSizeMB: 1, maxWidthOrHeight: 1920 }));

      const res = await api.post("/parties", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      clearDraft(draftKey);
      navigate(`/parties/${res.data.data.party.id}`);
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, "Failed to create party"));
    } finally {
      setLoading(false);
    }
  }

  const isFree = Number(form.ticket_price) === 0;

  // animation
  const slide = {
    enter: (d: number) => ({ x: d > 0 ? 80 : -80, opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (d: number) => ({ x: d > 0 ? -80 : 80, opacity: 0 }),
  };

  return (
    <div className="min-h-screen bg-bg pb-32">
      <div className="max-w-lg mx-auto px-4 pt-6 pb-4">

        {/* --- Header --- */}
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-5">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/8 border border-primary/15 mb-3">
            <Sparkles className="w-3.5 h-3.5 text-primary" />
            <span className="text-[11px] font-bold text-primary uppercase tracking-[0.15em]">Create Experience</span>
          </div>
          <h1 className="text-2xl font-bold text-text tracking-tight">{STEP_META[step - 1].title}</h1>
          <p className="text-text-dim text-sm mt-0.5">{STEP_META[step - 1].sub}</p>
        </motion.div>

        {/* --- Steps --- */}
        <div className="mb-5">
          <StepIndicator current={step} total={3} />
        </div>

        {/* --- Draft Banner --- */}
        <AnimatePresence>
          {showDraft && (
            <motion.div
              initial={{ opacity: 0, y: -8, height: 0 }}
              animate={{ opacity: 1, y: 0, height: "auto" }}
              exit={{ opacity: 0, y: -8, height: 0 }}
              className="overflow-hidden mb-4"
            >
              <div className="host-draft-banner flex items-center justify-between px-4 py-2.5 rounded-xl">
                <div className="flex items-center gap-2">
                  <Save className="w-3.5 h-3.5 text-accent" />
                  <span className="text-xs font-semibold text-text">Draft restored</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    clearDraft(draftKey);
                    setForm({ ...EMPTY_FORM });
                    removeCover();
                    setShowDraft(false);
                    setStep(1);
                  }}
                  className="flex items-center gap-1 text-xs font-semibold text-error hover:text-error/80 transition-colors"
                >
                  <Trash2 className="w-3 h-3" /> Clear
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* --- Error --- */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              role="alert"
              aria-live="polite"
              className="bg-error/10 border border-error/20 text-error rounded-2xl p-4 mb-4 text-sm font-medium"
            >
              {error}
            </motion.div>
          )}
        </AnimatePresence>

        {/* ═══════════════════════════════════════════════
            Step Content
        ═══════════════════════════════════════════════ */}
        <div className="relative overflow-hidden" style={{ minHeight: 420 }}>
          <AnimatePresence mode="wait" custom={dir}>

            {/* ---- STEP 1: The Vibe ---- */}
            {step === 1 && (
              <motion.div
                key="s1"
                custom={dir}
                variants={slide}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.28, ease: "easeInOut" }}
                className="space-y-4"
              >
                {/* Cover Image */}
                <div className="host-cover-zone rounded-2xl overflow-hidden">
                  {coverPreview ? (
                    <div className="relative">
                      <img src={coverPreview} alt="Cover" className="w-full h-48 object-cover" />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                      <div className="absolute bottom-3 right-3 flex gap-2">
                        <button type="button" onClick={triggerCover} className="host-cover-btn">
                          <Camera className="w-3.5 h-3.5" /> Change
                        </button>
                        <button type="button" onClick={removeCover} className="host-cover-btn-danger">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button type="button" onClick={triggerCover} className="w-full h-44 flex flex-col items-center justify-center gap-2.5 host-cover-empty">
                      <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center border border-primary/15">
                        <Upload className="w-6 h-6 text-primary" />
                      </div>
                      <div className="text-center">
                        <p className="text-sm font-semibold text-text">Add Cover Image</p>
                        <p className="text-[11px] text-text-dim mt-0.5">JPEG, PNG, WebP \u2022 Max 5 MB</p>
                      </div>
                    </button>
                  )}
                  <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={handleCoverInput} className="hidden" />
                </div>

                {/* Title + Desc */}
                <div className="glass-panel rounded-2xl p-5 space-y-4">
                  <div>
                    <label className="block text-[11px] font-bold text-text-muted uppercase tracking-[0.12em] mb-2">Party Title *</label>
                    <input
                      name="title"
                      value={form.title}
                      onChange={set}
                      onBlur={blur}
                      placeholder="e.g., Rooftop Vibes Vol. 3"
                      maxLength={100}
                      className={`input-luxe w-full rounded-xl px-4 py-3.5 text-base ${getFieldError("title") ? "ring-2 ring-error/50" : ""}`}
                    />
                    <div className="flex items-center justify-between mt-1.5">
                      {getFieldError("title") && <p className="text-error text-xs font-medium break-words">{getFieldError("title")}</p>}
                      <p className="text-text-dim text-[10px] ml-auto shrink-0">{form.title.length}/100</p>
                    </div>
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-text-muted uppercase tracking-[0.12em] mb-2">Description</label>
                    <textarea
                      name="description"
                      value={form.description}
                      onChange={set}
                      placeholder="Set the mood, dress code, music profile..."
                      rows={3}
                      maxLength={2000}
                      className="input-luxe w-full rounded-xl px-4 py-3.5 resize-none text-sm"
                    />
                    <p className="text-text-dim text-[10px] text-right mt-1">{form.description.length}/2000</p>
                  </div>
                </div>

                {/* Tags */}
                <div className="glass-panel rounded-2xl p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-bold text-text-muted uppercase tracking-[0.12em]">Vibe Tags</label>
                    <span className="text-[10px] text-text-dim font-medium">{form.tags.length}/10</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {SUGGESTED_TAGS.map((tag) => (
                      <TagChip key={tag} tag={tag} selected={form.tags.includes(tag)} onToggle={() => toggleTag(tag)} />
                    ))}
                  </div>
                  {form.tags.length > 0 && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      className="pt-2.5 border-t border-border overflow-hidden"
                    >
                      <p className="text-[10px] text-text-dim mb-1.5 font-medium">Selected:</p>
                      <div className="flex flex-wrap gap-1.5">
                        {form.tags.map((tag) => (
                          <span key={tag} className="host-tag-active-pill">
                            {tag}
                            <button type="button" onClick={() => toggleTag(tag)} className="ml-1 hover:text-error transition-colors">
                              <X className="w-3 h-3" />
                            </button>
                          </span>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </div>
              </motion.div>
            )}

            {/* ---- STEP 2: When & Where ---- */}
            {step === 2 && (
              <motion.div
                key="s2"
                custom={dir}
                variants={slide}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.28, ease: "easeInOut" }}
                className="space-y-4"
              >
                {/* Location */}
                <div className="glass-panel rounded-2xl p-5 space-y-4">
                  <h2 className="text-sm font-bold text-text flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-accent/10 flex items-center justify-center">
                      <MapPin className="w-4 h-4 text-accent" />
                    </div>
                    Location
                  </h2>
                  <div>
                    <label className="block text-[11px] font-bold text-text-muted uppercase tracking-[0.12em] mb-2">Venue Name *</label>
                    <input
                      name="location_name"
                      value={form.location_name}
                      onChange={set}
                      onBlur={blur}
                      placeholder="Skydeck, Indiranagar"
                      className={`input-luxe w-full rounded-xl px-4 py-3.5 ${getFieldError("location_name") ? "ring-2 ring-error/50" : ""}`}
                    />
                    {getFieldError("location_name") && <p className="text-error text-xs mt-1 font-medium break-words">{getFieldError("location_name")}</p>}
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-text-muted uppercase tracking-[0.12em] mb-2">City *</label>
                    <input
                      name="location_city"
                      value={form.location_city}
                      onChange={set}
                      onBlur={blur}
                      placeholder="Bangalore"
                      className={`input-luxe w-full rounded-xl px-4 py-3.5 ${getFieldError("location_city") ? "ring-2 ring-error/50" : ""}`}
                    />
                    {getFieldError("location_city") && <p className="text-error text-xs mt-1 font-medium break-words">{getFieldError("location_city")}</p>}
                  </div>
                </div>

                {/* Date & Time */}
                <div className="glass-panel rounded-2xl p-5 space-y-4">
                  <h2 className="text-sm font-bold text-text flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Calendar className="w-4 h-4 text-primary" />
                    </div>
                    Date & Time
                  </h2>
                  <div>
                    <label className="block text-[11px] font-bold text-text-muted uppercase tracking-[0.12em] mb-2">Starts *</label>
                    <input
                      type="datetime-local"
                      name="date_time"
                      value={form.date_time}
                      onChange={(e) => { set(e); setTouched((p) => ({ ...p, date_time: true })); }}
                      className={`input-luxe w-full rounded-xl px-4 py-3.5 ${getFieldError("date_time") ? "ring-2 ring-error/50" : ""}`}
                    />
                    {getFieldError("date_time") && <p className="text-error text-xs mt-1 font-medium break-words">{getFieldError("date_time")}</p>}
                    {form.date_time && !getFieldError("date_time") && (
                      <p className="text-accent text-[10px] mt-1.5 font-semibold">{getRelativeDate(form.date_time)}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-text-muted uppercase tracking-[0.12em] mb-2">Ends <span className="text-text-dim font-normal">(optional)</span></label>
                    <input
                      type="datetime-local"
                      name="end_time"
                      value={form.end_time}
                      onChange={set}
                      min={form.date_time || undefined}
                      className="input-luxe w-full rounded-xl px-4 py-3.5"
                    />
                    {form.end_time && form.date_time && new Date(form.end_time) <= new Date(form.date_time) && (
                      <p className="text-error text-xs mt-1 font-medium">End time needs to be after the start time</p>
                    )}
                    {form.end_time && form.date_time && new Date(form.end_time) > new Date(form.date_time) && (
                      <p className="text-text-dim text-[10px] mt-1.5 font-medium">
                        <Clock className="w-3 h-3 inline mr-1" />Duration: {getDuration(form.date_time, form.end_time)}
                      </p>
                    )}
                  </div>
                </div>

                {/* Quick schedule hint */}
                {!form.date_time && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-start gap-2.5 px-4 py-3 rounded-xl bg-accent/5 border border-accent/10">
                    <Info className="w-4 h-4 text-accent shrink-0 mt-0.5" />
                    <p className="text-[11px] text-text-muted leading-relaxed">
                      Tip: Parties scheduled 3-7 days ahead get <span className="text-accent font-semibold">2.5x more join requests</span> on average.
                    </p>
                  </motion.div>
                )}
              </motion.div>
            )}

            {/* ---- STEP 3: Access & Pricing ---- */}
            {step === 3 && (
              <motion.div
                key="s3"
                custom={dir}
                variants={slide}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.28, ease: "easeInOut" }}
                className="space-y-4"
              >
                {/* Capacity */}
                <div className="glass-panel rounded-2xl p-5 space-y-3">
                  <h2 className="text-sm font-bold text-text flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-hot/10 flex items-center justify-center">
                      <Users className="w-4 h-4 text-hot" />
                    </div>
                    Capacity
                  </h2>
                  <CapacitySelector value={form.max_capacity} onChange={(v) => setForm({ ...form, max_capacity: v })} />
                </div>

                {/* Pricing */}
                <div className="glass-panel rounded-2xl p-5 space-y-4">
                  <h2 className="text-sm font-bold text-text flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-warning/10 flex items-center justify-center">
                      <Ticket className="w-4 h-4 text-warning" />
                    </div>
                    Pricing
                  </h2>
                  <div className="grid grid-cols-2 gap-2">
                    {PRICE_PRESETS.map((p, i) => {
                      const active = priceTier === i;
                      return (
                        <button
                          key={p.label}
                          type="button"
                          onClick={() => {
                            setPriceTier(i);
                            if (p.value >= 0) setForm((prev) => ({ ...prev, ticket_price: p.value }));
                            hapticsMedium();
                          }}
                          className={`flex flex-col items-center gap-1 p-3 rounded-xl transition-all duration-200 tap-active
                            ${active ? "host-price-active" : "host-price-idle"}`}
                        >
                          <p.icon className={`w-5 h-5 ${active ? "text-warning" : "text-text-dim"}`} />
                          <span className="text-xs font-bold">{p.label}</span>
                          <span className="text-[9px] text-text-dim">{p.desc}</span>
                        </button>
                      );
                    })}
                  </div>
                  <AnimatePresence>
                    {priceTier === 3 && (
                      <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                        <label className="block text-[11px] font-bold text-text-muted uppercase tracking-[0.12em] mb-2">Price (\u20B9)</label>
                        <input
                          type="number"
                          value={form.ticket_price}
                          onChange={(e) => setForm({ ...form, ticket_price: Math.max(0, Number(e.target.value)) })}
                          min={0}
                          placeholder="Enter custom price"
                          className="input-luxe w-full rounded-xl px-4 py-3.5"
                        />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Trust Gate */}
                <div className="glass-panel rounded-2xl p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <h2 className="text-sm font-bold text-text flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Shield className="w-4 h-4 text-primary" />
                      </div>
                      Trust Gate
                    </h2>
                    <span className="text-[9px] text-text-dim flex items-center gap-1">
                      <Info className="w-3 h-3" /> Min rating to join
                    </span>
                  </div>
                  <TrustGateSelector value={form.min_rating} onChange={(v) => setForm({ ...form, min_rating: v })} />
                </div>

                {/* Preview Card */}
                <div className="host-preview-card rounded-2xl p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] uppercase tracking-[0.2em] text-text-dim font-bold">Live Preview</p>
                    <div className="w-2 h-2 rounded-full bg-success animate-pulse" />
                  </div>
                  {coverPreview && (
                    <img src={coverPreview} alt="" className="w-full h-24 object-cover rounded-xl" />
                  )}
                  <h3 className="text-lg font-bold text-text break-words line-clamp-3">{form.title || "Untitled Experience"}</h3>
                  <div className="grid grid-cols-2 gap-y-2 gap-x-4 text-sm">
                    <div className="flex items-center gap-2 text-text-muted">
                      <MapPin className="w-3.5 h-3.5 text-accent shrink-0" />
                      <span className="truncate">{form.location_city || "\u2014"}</span>
                    </div>
                    <div className="flex items-center gap-2 text-text-muted">
                      <Clock className="w-3.5 h-3.5 text-primary shrink-0" />
                      <span>{form.date_time ? new Date(form.date_time).toLocaleDateString("en-IN", { month: "short", day: "numeric" }) : "\u2014"}</span>
                    </div>
                    <div className="flex items-center gap-2 text-text-muted">
                      <Users className="w-3.5 h-3.5 text-hot shrink-0" />
                      <span>{form.max_capacity} guests</span>
                    </div>
                    <div className="flex items-center gap-2 text-text-muted">
                      <Ticket className="w-3.5 h-3.5 text-warning shrink-0" />
                      <span>{isFree ? "Free" : `\u20B9${form.ticket_price}`}</span>
                    </div>
                  </div>
                  {form.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 pt-1">
                      {form.tags.slice(0, 5).map((t) => (
                        <span key={t} className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">{t}</span>
                      ))}
                      {form.tags.length > 5 && <span className="text-[10px] text-text-dim ml-1">+{form.tags.length - 5}</span>}
                    </div>
                  )}
                  {form.min_rating > 0 && (
                    <div className="flex items-center gap-1.5 pt-1">
                      <Shield className="w-3 h-3 text-primary" />
                      <span className="text-[10px] font-semibold text-primary">
                        {TRUST_GATES.find((g) => g.rating === form.min_rating)?.label || `${form.min_rating}+`} required
                      </span>
                    </div>
                  )}
                </div>
              </motion.div>
            )}

          </AnimatePresence>
        </div>

        {/* ═══════════════════════════════════════════════
            Bottom Navigation
        ═══════════════════════════════════════════════ */}
        <div className="mt-6 flex items-center gap-3">
          {step > 1 && (
            <motion.button
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              type="button"
              onClick={goBack}
              className="btn-secondary-luxe px-5 py-3.5 rounded-xl font-bold flex items-center gap-2 tap-active"
            >
              <ChevronLeft className="w-4 h-4" /> Back
            </motion.button>
          )}
          <div className="flex-1" />
          {step < 3 ? (
            <button
              type="button"
              onClick={goNext}
              disabled={!canProceed()}
              className="btn-primary-luxe px-6 py-3.5 rounded-xl font-bold flex items-center gap-2 disabled:opacity-40 tap-active"
            >
              Next <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={loading || !canProceed()}
              className="btn-primary-luxe flex-1 py-4 rounded-2xl font-bold flex items-center justify-center gap-2 disabled:opacity-40 tap-active"
            >
              {loading ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Publishing...</>
              ) : (
                <><Sparkles className="w-4 h-4" /> Publish Party</>
              )}
            </button>
          )}
        </div>

      </div>
    </div>
  );
}
