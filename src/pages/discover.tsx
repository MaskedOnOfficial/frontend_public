import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import api from "../lib/api";
import type { Party } from "../types";
import { getApiErrorMessage } from "../lib/errors";

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

  return (
    <div className="min-h-screen bg-bg">
      <div className="max-w-6xl mx-auto px-4 py-6 md:py-8">
        {/* Greeting */}
        <div className="mb-8">
          <h1 className="text-2xl md:text-3xl font-bold text-text">Discover Events</h1>
          <p className="text-text-muted text-sm md:text-base mt-1">Find your next unforgettable vibe</p>
        </div>

        {/* Search bar */}
        <form onSubmit={handleSearch} className="mb-6">
          <div className="relative">
            <svg
              className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-text-muted"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Search events..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  const formEvent = { preventDefault: () => {} } as React.FormEvent<HTMLFormElement>;
                  handleSearch(formEvent);
                }
              }}
              className="input-luxe w-full rounded-full pl-12 pr-4 py-3.5"
            />
          </div>
        </form>

        {/* Filter chips */}
        <div className="flex overflow-x-auto gap-2 mb-8 pb-2">
          <button
            onClick={() => {
              setSelectedCity("");
            }}
            className={`px-4 py-2 rounded-full text-sm font-semibold whitespace-nowrap transition ${
              selectedCity === "" ? "bg-primary/20 text-primary" : "bg-white/8 text-text-muted hover:text-text"
            }`}
          >
            All Events
          </button>
          {cities.map((city) => (
            <button
              key={city}
              onClick={() => {
                setSelectedCity(city);
              }}
              className={`px-4 py-2 rounded-full text-sm font-semibold whitespace-nowrap transition ${
                selectedCity === city ? "bg-primary/20 text-primary" : "bg-white/8 text-text-muted hover:text-text"
              }`}
            >
              {city}
            </button>
          ))}
        </div>

        {/* Events section title */}
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-text">Popular Events</h2>
        </div>

        {/* Events grid */}
        {loading ? (
          <div className="text-center text-text-muted py-20">Loading events...</div>
        ) : loadError ? (
          <div className="text-center py-20">
            <p className="text-error text-sm">{loadError}</p>
          </div>
        ) : parties.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-text-muted text-lg mb-4">No events found</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 mb-8">
              {parties.map((party) => (
                <Link
                  key={party.id}
                  to={`/parties/${party.id}`}
                  className="group relative overflow-hidden rounded-2xl aspect-video bg-gradient-to-br from-primary/30 to-accent/30 border border-white/10 hover:border-primary/30 transition"
                >
                  {party.cover_image_url ? (
                    <>
                      <img
                        src={party.cover_image_url}
                        alt={party.title}
                        className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition duration-500"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
                    </>
                  ) : (
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent flex items-center justify-center">
                      <span className="text-4xl opacity-20">🎉</span>
                    </div>
                  )}
                  <div className="absolute inset-0 flex flex-col justify-between p-5">
                    <div className="flex items-start justify-between">
                      <span
                        className={`text-xs font-bold px-3 py-1 rounded-full ${
                          party.status === "upcoming"
                            ? "bg-success/30 text-success"
                            : party.status === "ongoing"
                              ? "bg-primary/30 text-primary"
                              : "bg-text-muted/30 text-text-muted"
                        }`}
                      >
                        {party.status.toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <h3 className="text-lg md:text-xl font-bold text-text mb-2 line-clamp-2">{party.title}</h3>
                      <div className="space-y-1 text-sm text-white/80">
                        <p className="flex items-center gap-1.5">
                          <span>📍</span>
                          {party.location_city}
                        </p>
                        <p className="flex items-center gap-1.5">
                          <span>📅</span>
                          {new Date(party.date_time).toLocaleDateString("en-IN", {
                            month: "short",
                            day: "numeric",
                          })}
                        </p>
                        <p className="flex items-center gap-1.5">
                          <span>💰</span>
                          {party.ticket_price === 0 ? "Free" : `₹${(party.ticket_price / 100).toLocaleString("en-IN")}`}
                        </p>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
