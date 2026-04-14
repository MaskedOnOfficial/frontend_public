import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import api from "../lib/api";
import type { Party } from "../types";
import { getApiErrorMessage } from "../lib/errors";
import { motion } from "framer-motion";
import { Search, MapPin, Calendar, Ticket, PartyPopper, TrendingUp, Users } from "lucide-react";
import { SkeletonPartyCard } from "../components/skeleton";

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
          className="mb-6"
        >
          <h1 className="text-2xl md:text-3xl font-bold text-text tracking-tight">Discover</h1>
          <p className="text-text-dim text-sm mt-0.5">Find your next unforgettable vibe</p>
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
              <TrendingUp className="w-3.5 h-3.5 text-hot" />
              <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-hot">Featured</span>
            </div>
            <Link
              to={`/parties/${featured.id}`}
              className="group relative block overflow-hidden rounded-2xl aspect-[2.2/1] md:aspect-[3/1] bg-surface"
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
        <div className="flex overflow-x-auto gap-2 mb-8 pb-2 scrollbar-hide scroll-smooth-x" style={{ scrollSnapType: 'x mandatory' }}>
          <button
            onClick={() => setSelectedCity("")}
            style={{ scrollSnapAlign: 'start' }}
            className={`px-4 py-2 rounded-full text-sm font-semibold whitespace-nowrap transition-all ${
              selectedCity === ""
                ? "chip-active"
                : "chip-idle hover:text-text"
            }`}
          >
            All Events
          </button>
          {cities.map((city) => (
            <button
              key={city}
              onClick={() => setSelectedCity(city)}
              style={{ scrollSnapAlign: 'start' }}
              className={`px-4 py-2 rounded-full text-sm font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                selectedCity === city
                  ? "chip-active"
                  : "chip-idle hover:text-text"
              }`}
            >
              <MapPin className="w-3 h-3" />
              {city}
            </button>
          ))}
        </div>

        {/* Section title */}
        <div className="flex items-center gap-2 mb-5">
          <h2 className="text-base font-bold text-text">
            {selectedCity ? `Events in ${selectedCity}` : "All Events"}
          </h2>
          <span className="text-text-dim text-xs">({parties.length})</span>
        </div>

        {/* Events grid */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {Array.from({ length: 6 }, (_, i) => (
              <SkeletonPartyCard key={i} />
            ))}
          </div>
        ) : loadError ? (
          <div className="text-center py-20">
            <p className="text-error text-sm mb-3">{loadError}</p>
            <button
              onClick={() => {
                setLoadError("");
                setLoading(true);
                api.get("/parties?limit=1000&page=1&sort=date_asc")
                  .then((res) => setAllParties(res.data.data.parties || []))
                  .catch((error) => setLoadError(getApiErrorMessage(error, "Failed to load events")))
                  .finally(() => setLoading(false));
              }}
              className="btn-secondary-luxe px-5 py-2.5 rounded-xl text-sm font-bold"
            >
              Retry
            </button>
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
            {parties.map((party, i) => {
              const capacityPercent = party.max_capacity > 0 ? Math.round((party.current_attendees / party.max_capacity) * 100) : 0;
              const isFillingFast = capacityPercent >= 75 && party.status === "upcoming";
              const isSoldOut = party.max_capacity > 0 && party.current_attendees >= party.max_capacity;

              return (
              <motion.div
                key={party.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(i * 0.05, 0.3) }}
              >
                <Link
                  to={`/parties/${party.id}`}
                  className="group relative block overflow-hidden rounded-2xl aspect-[4/3] bg-surface event-card card-shine"
                >
                  {party.cover_image_url ? (
                    <>
                      <img
                        src={party.cover_image_url}
                        alt={party.title}
                        loading="lazy"
                        className="absolute inset-0 w-full h-full object-cover transition-transform duration-700"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-bg via-bg/60 to-transparent" />
                    </>
                  ) : (
                    <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-accent/15 to-hot/10 flex items-center justify-center">
                      <PartyPopper className="w-12 h-12 text-text-dim/20" />
                    </div>
                  )}

                  {/* Sold out overlay */}
                  {isSoldOut && (
                    <div className="absolute inset-0 bg-bg/50 backdrop-blur-[2px] flex items-center justify-center z-10">
                      <span className="text-[10px] font-black uppercase tracking-widest text-hot bg-bg/80 px-4 py-2 rounded-full border border-hot/30">Sold Out</span>
                    </div>
                  )}

                  {/* Top badges row */}
                  <div className="absolute top-3 left-3 right-3 flex items-start justify-between z-10">
                    <div className="flex flex-col gap-1.5">
                      <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full ${getStatusClasses(party.status)}`}>
                        {party.status}
                      </span>
                      {isFillingFast && !isSoldOut && (
                        <span className="filling-fast px-2 py-0.5 rounded-full">
                          <span className="filling-fast-dot" />
                          Filling Fast
                        </span>
                      )}
                    </div>
                    <div className="bg-bg/70 backdrop-blur-md text-text text-xs font-bold px-3 py-1.5 rounded-full border border-white/10">
                      {party.ticket_price === 0 ? "Free" : `₹${(party.ticket_price / 100).toLocaleString("en-IN")}`}
                    </div>
                  </div>

                  {/* Content */}
                  <div className="absolute bottom-0 left-0 right-0 p-4">
                    <h3 className="text-base font-bold text-white mb-2 line-clamp-1 tracking-tight group-hover:text-accent transition-colors">{party.title}</h3>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                      <p className="flex items-center gap-1.5 text-xs text-white/70">
                        <MapPin className="w-3 h-3 text-accent" />
                        {party.location_city}
                      </p>
                      <p className="flex items-center gap-1.5 text-xs text-white/70">
                        <Calendar className="w-3 h-3 text-primary" />
                        {new Date(party.date_time).toLocaleDateString("en-IN", { month: "short", day: "numeric" })}
                      </p>
                      {party.max_capacity > 0 && (
                        <p className="flex items-center gap-1.5 text-xs text-white/70">
                          <Users className="w-3 h-3 text-hot" />
                          {party.current_attendees}/{party.max_capacity}
                        </p>
                      )}
                    </div>
                  </div>
                </Link>
              </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
