import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../lib/api";

export default function CreatePartyPage() {
  const navigate = useNavigate();
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

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const payload = {
        title: form.title,
        description: form.description || undefined,
        location_name: form.location_name,
        location_city: form.location_city,
        date_time: new Date(form.date_time).toISOString(),
        end_time: form.end_time ? new Date(form.end_time).toISOString() : undefined,
        max_capacity: Number(form.max_capacity),
        ticket_price: Math.round(Number(form.ticket_price) * 100), // rupees → paisa
        tags: form.tags ? form.tags.split(",").map((t) => t.trim()).filter(Boolean) : undefined,
        min_rating: Number(form.min_rating) || undefined,
      };

      const res = await api.post("/parties", payload);
      navigate(`/parties/${res.data.data.party.id}`);
    } catch (err: any) {
      setError(err.response?.data?.error?.message || "Failed to create party");
    } finally {
      setLoading(false);
    }
  }

  const inputClass =
    "w-full bg-bg border border-text-muted/20 text-text rounded-lg px-4 py-3 focus:outline-none focus:border-primary";
  const labelClass = "block text-text font-semibold text-sm mb-1";

  return (
    <div className="min-h-screen bg-bg">
      <div className="max-w-2xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-text mb-2">Host a Party</h1>
        <p className="text-text-muted mb-8">Fill in the details and let people discover your event.</p>

        {error && (
          <div className="bg-error/10 border border-error/30 text-error rounded-lg p-3 mb-6 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className={labelClass}>Party Title *</label>
            <input
              name="title"
              value={form.title}
              onChange={handleChange}
              placeholder="e.g., Rooftop Vibes vol. 3"
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
              placeholder="Tell people what to expect..."
              rows={4}
              className={`${inputClass} resize-none`}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Location Name *</label>
              <input
                name="location_name"
                value={form.location_name}
                onChange={handleChange}
                placeholder="e.g., My Terrace, 4th Block"
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
                value={form.end_time}
                onChange={handleChange}
                className={inputClass}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className={labelClass}>Max Capacity *</label>
              <input
                type="number"
                name="max_capacity"
                value={form.max_capacity}
                onChange={handleChange}
                min={2}
                max={10000}
                required
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Ticket Price (₹)</label>
              <input
                type="number"
                name="ticket_price"
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

          <div>
            <label className={labelClass}>Tags</label>
            <input
              name="tags"
              value={form.tags}
              onChange={handleChange}
              placeholder="rooftop, music, chill (comma-separated)"
              className={inputClass}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary hover:bg-primary-hover text-white font-semibold py-3 rounded-lg transition disabled:opacity-50"
          >
            {loading ? "Creating..." : "Create Party"}
          </button>
        </form>
      </div>
    </div>
  );
}
