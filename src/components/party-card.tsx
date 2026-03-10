import { Link } from "react-router-dom";
import type { Party } from "../types";

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-IN", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatPrice(price: number, currency: string) {
  if (price === 0) return "Free";
  // price is in paisa, convert to rupees
  return `₹${(price / 100).toLocaleString("en-IN")}`;
}

function parseTags(tags: string | string[] | null): string[] {
  if (!tags) return [];
  if (Array.isArray(tags)) return tags;
  try { return JSON.parse(tags); } catch { return []; }
}

export default function PartyCard({ party }: { party: Party }) {
  const tags = parseTags(party.tags);

  return (
    <Link
      to={`/parties/${party.id}`}
      className="bg-surface rounded-xl border border-text-muted/10 overflow-hidden hover:border-primary/30 transition group"
    >
      {/* Cover image or gradient placeholder */}
      <div className="h-40 bg-gradient-to-br from-accent/40 to-primary/30 relative">
        {party.cover_image_url && (
          <img src={party.cover_image_url} alt={party.title} className="w-full h-full object-cover" />
        )}
        <div className="absolute top-3 right-3 bg-bg/70 text-text text-xs font-semibold px-2 py-1 rounded">
          {formatPrice(party.ticket_price, party.currency)}
        </div>
      </div>

      <div className="p-4">
        <h3 className="text-text font-semibold text-lg mb-1 group-hover:text-primary transition line-clamp-1">
          {party.title}
        </h3>
        <p className="text-text-muted text-sm mb-2">
          📍 {party.location_city} · 📅 {formatDate(party.date_time)}
        </p>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {party.host_display_name && (
              <>
                <div className="w-6 h-6 rounded-full bg-accent flex items-center justify-center text-xs text-white font-bold">
                  {party.host_display_name.charAt(0).toUpperCase()}
                </div>
                <span className="text-text-muted text-xs">{party.host_display_name}</span>
              </>
            )}
          </div>
          <span className="text-text-muted text-xs">
            👥 {party.current_attendees}/{party.max_capacity}
          </span>
        </div>

        {tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-3">
            {tags.slice(0, 3).map((tag) => (
              <span
                key={tag}
                className="bg-accent/20 text-accent-hover text-xs px-2 py-0.5 rounded-full"
              >
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>
    </Link>
  );
}
