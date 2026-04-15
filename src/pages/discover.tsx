import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import api from "../lib/api";
import type { Party } from "../types";
import { getApiErrorMessage } from "../lib/errors";
import { motion } from "framer-motion";
import { Search, MapPin, Calendar, Ticket, PartyPopper, Users, Clock, Flame } from "lucide-react";
import { SkeletonPartyCard } from "../components/skeleton";

function getStatusClasses(status: string) {
  switch (status) {
    case "upcoming": return "status-upcoming";
    case "ongoing": return "status-ongoing";
    case "completed": return "status-completed";
    default: return "status-cancelled";
  }
}

function formatPrice(price: number) {
  if (price === 0) return "Free";
  return `₹${(price / 100).toLocaleString("en-IN")}`;
}

function formatShortDate(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-IN", { month: "short", day: "numeric" });
}

function formatTime(dateStr: string) {
  return new Date(dateStr).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
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
          <p className="text-text-muted text-sm mt-1">Find your next unforgettable experience</p>
        </motion.div>

        {/* Search bar */}
        <motion.form
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08 }}
          onSubmit={handleSearch}
          className="mb-5"
        >
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-text-dim pointer-events-none" />
            <input
              type="text"
              placeholder="Search events, cities, vibes..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input-luxe w-full rounded-2xl pl-11 pr-4 py-3.5 text-sm"
              aria-label="Search events by name, city, or vibe"
            />
          </div>
        </motion.form>

        {/* City filter chips */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.12 }}
          className="flex overflow-x-auto gap-2 mb-7 pb-1 scrollbar-hide scroll-smooth-x"
          style={{ scrollSnapType: 'x mandatory' }}
        >
          <button
            onClick={() => setSelectedCity("")}
            style={{ scrollSnapAlign: 'start' }}
            className={`px-4 py-2 rounded-full text-sm font-semibold whitespace-nowrap transition-all ${
              selectedCity === ""
                ? "chip-active"
                : "chip-idle hover:text-text"
            }`}
          >
            All
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
        </motion.div>

        {/* Featured Party */}
        {featured && !search && !selectedCity && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="mb-8"
          >
            <div className="flex items-center gap-2 mb-3">
              <Flame className="w-3.5 h-3.5 text-hot" />
              <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-hot">Trending</span>
            </div>
            <Link
              to={`/parties/${featured.id}`}
              className="group relative block overflow-hidden rounded-2xl aspect-[2/1] md:aspect-[2.8/1] card-shine"
            >
              <img
                src={featured.cover_image_url!}
                alt={featured.title}
                loading="lazy"
                className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
              />
              {/* Always-dark gradient for text readability over images */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-black/5" />
              <div className="absolute inset-0 bg-gradient-to-r from-black/30 to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 p-5 md:p-7">
                <span className={`text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full inline-block mb-2.5 ${getStatusClasses(featured.status)}`}>
                  {featured.status}
                </span>
                <h2 className="text-xl md:text-2xl font-bold text-white mb-2.5 tracking-tight line-clamp-1">{featured.title}</h2>
                <div className="flex flex-wrap items-center gap-3 text-xs text-white/80">
                  <span className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5 text-accent" />{featured.location_city}</span>
                  <span className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5 text-primary" />{formatShortDate(featured.date_time)}</span>
                  <span className="flex items-center gap-1.5 bg-white/15 backdrop-blur-sm px-2.5 py-1 rounded-full font-bold">
                    <Ticket className="w-3 h-3" />{formatPrice(featured.ticket_price)}
                  </span>
                </div>
              </div>
            </Link>
          </motion.div>
        )}

        {/* Section title */}
        <div className="flex items-baseline gap-2 mb-4">
          <h2 className="text-sm font-bold text-text uppercase tracking-wide">
            {selectedCity ? `Events in ${selectedCity}` : "All Events"}
          </h2>
          <span className="text-text-dim text-xs font-medium">{parties.length}</span>
        </div>

        {/* Events grid */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-5">
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
            <div className="w-14 h-14 rounded-2xl bg-surface-light flex items-center justify-center mx-auto mb-4">
              <PartyPopper className="w-7 h-7 text-text-dim" />
            </div>
            <p className="text-text font-semibold mb-1">No events found</p>
            <p className="text-text-dim text-sm">Try adjusting your search or filters</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-5">
            {parties.map((party, i) => {
              const capacityPercent = party.max_capacity > 0 ? Math.round((party.current_attendees / party.max_capacity) * 100) : 0;
              const isFillingFast = capacityPercent >= 75 && party.status === "upcoming";
              const isSoldOut = party.max_capacity > 0 && party.current_attendees >= party.max_capacity;

              return (
              <motion.div
                key={party.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(i * 0.04, 0.25) }}
              >
                <Link
                  to={`/parties/${party.id}`}
                  className="group block overflow-hidden rounded-2xl discover-card"
                >
                  {/* Image section */}
                  <div className="relative aspect-[16/10] overflow-hidden bg-surface-light">
                    {party.cover_image_url ? (
                      <img
                        src={party.cover_image_url}
                        alt={party.title}
                        loading="lazy"
                        className="w-full h-full object-cover group-hover:scale-[1.06] transition-transform duration-600"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-primary/15 via-accent/10 to-hot/8 flex items-center justify-center">
                        <PartyPopper className="w-10 h-10 text-text-dim/20 group-hover:scale-110 transition-transform" />
                      </div>
                    )}

                    {/* Sold out overlay */}
                    {isSoldOut && (
                      <div className="absolute inset-0 bg-black/45 backdrop-blur-[2px] flex items-center justify-center z-10">
                        <span className="text-[10px] font-black uppercase tracking-widest text-white bg-hot/90 px-4 py-1.5 rounded-full">Sold Out</span>
                      </div>
                    )}

                    {/* Status badge */}
                    <div className="absolute top-2.5 left-2.5 z-10">
                      <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full ${getStatusClasses(party.status)}`}>
                        {party.status}
                      </span>
                    </div>

                    {/* Price pill */}
                    <div className="absolute top-2.5 right-2.5 z-10">
                      <span className="discover-price-pill">
                        {formatPrice(party.ticket_price)}
                      </span>
                    </div>

                    {/* Filling fast indicator */}
                    {isFillingFast && !isSoldOut && (
                      <div className="absolute bottom-2.5 left-2.5 z-10">
                        <span className="filling-fast px-2 py-0.5 rounded-full text-[10px]">
                          <span className="filling-fast-dot" />
                          Filling Fast
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Content section */}
                  <div className="p-3.5 space-y-2.5">
                    <h3 className="text-text font-bold text-[15px] line-clamp-1 tracking-tight group-hover:text-primary transition-colors">{party.title}</h3>

                    <div className="flex items-center gap-3">
                      <span className="flex items-center gap-1.5 text-text-muted text-xs">
                        <MapPin className="w-3 h-3 text-accent shrink-0" />
                        <span className="truncate">{party.location_city}</span>
                      </span>
                      <span className="flex items-center gap-1.5 text-text-muted text-xs">
                        <Calendar className="w-3 h-3 text-primary shrink-0" />
                        {formatShortDate(party.date_time)}
                      </span>
                      <span className="flex items-center gap-1.5 text-text-muted text-xs">
                        <Clock className="w-3 h-3 text-text-dim shrink-0" />
                        {formatTime(party.date_time)}
                      </span>
                    </div>

                    {/* Capacity bar */}
                    {party.max_capacity > 0 && (
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <span className="flex items-center gap-1 text-text-dim text-[11px]">
                            <Users className="w-3 h-3" />
                            {party.current_attendees}/{party.max_capacity}
                          </span>
                          {party.host_display_name && (
                            <div className="flex items-center gap-1.5">
                              <div className="w-4.5 h-4.5 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-[7px] text-white font-bold shrink-0">
                                {party.host_display_name.charAt(0).toUpperCase()}
                              </div>
                              <span className="text-text-dim text-[11px] truncate max-w-[72px]">{party.host_display_name}</span>
                            </div>
                          )}
                        </div>
                        <div className="h-1 bg-surface-light rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-primary via-accent to-hot transition-all duration-500"
                            style={{ width: `${capacityPercent}%` }}
                          />
                        </div>
                      </div>
                    )}
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
