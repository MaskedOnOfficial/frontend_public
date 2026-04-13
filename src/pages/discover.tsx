import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import api from "../lib/api";
import type { Party } from "../types";
import { getApiErrorMessage } from "../lib/errors";
import { motion } from "framer-motion";
import { Search, MapPin, Calendar, Ticket, Sparkles, Loader2, PartyPopper, TrendingUp } from "lucide-react";

function getStatusClasses(status: string) {
  switch (status) {
    case "upcoming": return "status-upcoming";
    case "ongoing": return "status-ongoing";
    case "completed": return "status-completed";
    default: return "status-cancelled";
  }
}

export default function DiscoverPage() {
  const [allParties, setAllParties] = useState<Party[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedCity, setSelectedCity] = useState("");
  const [loadError, setLoadError] = useState("");

  const cities = useMemo(
    () =>
      Array.from(
        new Set(
          allParties
            .map((p) => p.location_city)
            .filter((c): c is string => Boolean(c))
        )
      ).slice(0, 6),
    [allParties]
  );

  useEffect(() => {
    async function fetchPartiesOnce() {
      setLoading(true);
      setLoadError("");
      try {
        const res = await api.get("/parties?limit=1000&page=1&sort=date_asc");
        setAllParties(res.data.data.parties || []);
      } catch (error) {
        setLoadError(getApiErrorMessage(error, "Failed to load events"));
        console.error("Failed to fetch parties:", getApiErrorMessage(error, "Unknown parties error"));
      } finally {
        setLoading(false);
      }
    }

    fetchPartiesOnce();
  }, []);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
  }

  const parties = useMemo(() => {
    return allParties.filter((party) => {
      const cityMatch = !selectedCity || party.location_city === selectedCity;
      if (!cityMatch) return false;

      if (!search.trim()) return true;
      const term = search.trim().toLowerCase();
      return (
        party.title.toLowerCase().includes(term) ||
        (party.description || "").toLowerCase().includes(term) ||
        party.location_city.toLowerCase().includes(term) ||
        party.location_name.toLowerCase().includes(term)
      );
    });
  }, [allParties, selectedCity, search]);

  // Featured party (first upcoming with cover image)
  const featured = allParties.find(p => p.status === "upcoming" && p.cover_image_url);

  return (
    <div className="min-h-screen bg-bg pb-28 md:pb-12">
      <div className="max-w-6xl mx-auto px-4 py-6 md:py-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent to-primary flex items-center justify-center shadow-lg shadow-accent/20">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-text tracking-tight">Discover Events</h1>
              <p className="text-text-muted text-sm">Find your next unforgettable vibe</p>
            </div>
          </div>
        </motion.div>

        {/* Featured Party */}
        {featured && !search && !selectedCity && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="mb-8"
          >
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp className="w-4 h-4 text-hot" />
              <span className="text-[11px] font-bold uppercase tracking-[0.15em] text-hot">Featured Event</span>
            </div>
            <Link
              to={`/parties/${featured.id}`}
              className="group relative block overflow-hidden rounded-3xl aspect-[2.2/1] md:aspect-[3/1] bg-surface"
            >
              <img
                src={featured.cover_image_url!}
                alt={featured.title}
                loading="lazy"
                className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-bg via-bg/50 to-transparent" />
              <div className="absolute inset-0 bg-gradient-to-r from-bg/40 to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 p-6 md:p-8">
                <span className={`text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full inline-block mb-3 ${getStatusClasses(featured.status)}`}>
                  {featured.status}
                </span>
                <h2 className="text-2xl md:text-3xl font-bold text-white mb-3 tracking-tight">{featured.title}</h2>
                <div className="flex flex-wrap items-center gap-4 text-sm text-white/80">
                  <span className="flex items-center gap-1.5"><MapPin className="w-4 h-4 text-accent" />{featured.location_city}</span>
                  <span className="flex items-center gap-1.5"><Calendar className="w-4 h-4 text-primary" />{new Date(featured.date_time).toLocaleDateString("en-IN", { month: "short", day: "numeric" })}</span>
                  <span className="flex items-center gap-1.5"><Ticket className="w-4 h-4 text-hot" />{featured.ticket_price === 0 ? "Free" : `₹${(featured.ticket_price / 100).toLocaleString("en-IN")}`}</span>
                </div>
              </div>
            </Link>
          </motion.div>
        )}

        {/* Search bar */}
        <motion.form
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          onSubmit={handleSearch}
          className="mb-6"
        >
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-text-muted pointer-events-none" />
            <input
              type="text"
              placeholder="Search events by name, city, or vibe..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input-luxe w-full rounded-2xl pl-12 pr-4 py-4 text-sm"
              aria-label="Search events by name, city, or vibe"
            />
          </div>
        </motion.form>

        {/* City filter chips */}
        <div className="flex overflow-x-auto gap-2 mb-8 pb-2 scrollbar-hide">
          <button
            onClick={() => setSelectedCity("")}
            className={`px-5 py-2.5 rounded-full text-sm font-semibold whitespace-nowrap transition-all ${
              selectedCity === ""
                ? "bg-primary text-white shadow-lg shadow-primary/25"
                : "bg-surface-light text-text-muted hover:text-text border border-primary/[0.08] hover:border-primary/20"
            }`}
          >
            All Events
          </button>
          {cities.map((city) => (
            <button
              key={city}
              onClick={() => setSelectedCity(city)}
              className={`px-5 py-2.5 rounded-full text-sm font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                selectedCity === city
                  ? "bg-accent text-white shadow-lg shadow-accent/25"
                  : "bg-surface-light text-text-muted hover:text-text border border-primary/[0.08] hover:border-accent/20"
              }`}
            >
              <MapPin className="w-3.5 h-3.5" />
              {city}
            </button>
          ))}
        </div>

        {/* Section title */}
        <div className="flex items-center gap-2 mb-6">
          <PartyPopper className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-bold text-text">
            {selectedCity ? `Events in ${selectedCity}` : "All Events"}
          </h2>
          <span className="text-text-dim text-sm ml-1">({parties.length})</span>
        </div>

        {/* Events grid */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
            <p className="text-text-muted text-sm">Loading events...</p>
          </div>
        ) : loadError ? (
          <div className="text-center py-20">
            <p className="text-error text-sm">{loadError}</p>
          </div>
        ) : parties.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-16 h-16 rounded-2xl bg-surface-light flex items-center justify-center mx-auto mb-4">
              <PartyPopper className="w-8 h-8 text-text-dim" />
            </div>
            <p className="text-text-muted text-lg font-semibold mb-2">No events found</p>
            <p className="text-text-dim text-sm">Try adjusting your search or filters</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {parties.map((party, i) => (
              <motion.div
                key={party.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(i * 0.05, 0.3) }}
              >
                <Link
                  to={`/parties/${party.id}`}
                  className="group relative block overflow-hidden rounded-2xl aspect-[4/3] bg-surface glass-card"
                >
                  {party.cover_image_url ? (
                    <>
                      <img
                        src={party.cover_image_url}
                        alt={party.title}
                        loading="lazy"
                        className="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-bg via-bg/70 to-bg/20" />
                    </>
                  ) : (
                    <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-accent/15 to-hot/10 flex items-center justify-center">
                      <PartyPopper className="w-12 h-12 text-text-dim/20" />
                    </div>
                  )}

                  {/* Status */}
                  <div className="absolute top-3 left-3">
                    <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full ${getStatusClasses(party.status)}`}>
                      {party.status}
                    </span>
                  </div>

                  {/* Price */}
                  <div className="absolute top-3 right-3">
                    <div className="bg-bg/70 backdrop-blur-md text-text text-xs font-bold px-3 py-1.5 rounded-full border border-primary/10">
                      {party.ticket_price === 0 ? "Free" : `₹${(party.ticket_price / 100).toLocaleString("en-IN")}`}
                    </div>
                  </div>

                  {/* Content */}
                  <div className="absolute bottom-0 left-0 right-0 p-4">
                    <h3 className="text-base font-bold text-white mb-2 line-clamp-1 tracking-tight group-hover:text-accent transition-colors">{party.title}</h3>
                    <div className="space-y-1">
                      <p className="flex items-center gap-1.5 text-xs text-white/70">
                        <MapPin className="w-3 h-3 text-accent" />
                        {party.location_city}
                      </p>
                      <p className="flex items-center gap-1.5 text-xs text-white/70">
                        <Calendar className="w-3 h-3 text-primary" />
                        {new Date(party.date_time).toLocaleDateString("en-IN", { month: "short", day: "numeric" })}
                      </p>
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
