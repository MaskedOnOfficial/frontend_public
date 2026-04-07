/**
 * api-cache.ts — Transparent SWR caching engine for the Axios API client.
 *
 * LOGIC OVERVIEW
 * ──────────────
 * 1. Every GET response is stored in an in-memory Map keyed by the full URL
 *    (including query string). Each entry stores: data, timestamp, ETag.
 *
 * 2. Tiered TTLs: endpoints are classified into 4 freshness tiers based on
 *    pattern matching. Static data (profiles) gets 10 min, live data (feed)
 *    gets 30 sec.
 *
 * 3. Stale-While-Revalidate (SWR): If a cached entry exists past its TTL but
 *    within its max-age, we return it immediately AND fire a background fetch
 *    to update the cache. The caller gets instant data, the cache stays fresh.
 *
 * 4. Deduplication: If two components request the same URL simultaneously,
 *    only one network request fires. The second caller receives the same promise.
 *
 * 5. Mutation-aware invalidation: After any POST/PUT/PATCH/DELETE, we purge
 *    all cache entries whose keys match related patterns (e.g. uploading a photo
 *    purges all `/photos` and `/feed` cache entries).
 *
 * 6. LRU eviction: When cache exceeds MAX_ENTRIES, the oldest entries are pruned.
 *
 * 7. sessionStorage persistence: On every write, we mirror the cache to
 *    sessionStorage (budget-capped at 2MB) so that a page refresh doesn't
 *    lose everything. On init, we rehydrate from sessionStorage.
 */

// ─── Types ───────────────────────────────────────────────────────────
interface CacheEntry {
  data: unknown;
  timestamp: number;
  url: string;
}

interface TierConfig {
  /** How long the data is considered "fresh" (return without revalidating) */
  freshMs: number;
  /** How long the data is considered "stale but OK" (return + background refresh) */
  maxAgeMs: number;
}

type CacheStatus = "fresh" | "stale" | "expired";

// ─── Constants ──────────────────────────────────────────────────────
const MAX_ENTRIES = 200;
const PRUNE_COUNT = 50;
const STORAGE_KEY = "maskon_api_cache";
const STORAGE_BUDGET = 2 * 1024 * 1024; // 2 MB

// ─── TTL Tiers (matched via regex patterns) ─────────────────────────
const TIERS: { pattern: RegExp; config: TierConfig }[] = [
  // Event listing endpoints only (not event details)
  { pattern: /^\/parties$/, config: { freshMs: 30_000, maxAgeMs: 2 * 60_000 } },
  { pattern: /^\/users\/me\/parties$/, config: { freshMs: 30_000, maxAgeMs: 2 * 60_000 } },

  // Images/photo endpoints
  { pattern: /^\/photos(?:\/|$)/, config: { freshMs: 60_000, maxAgeMs: 5 * 60_000 } },
  { pattern: /^\/parties\/[^/]+\/photos$/, config: { freshMs: 60_000, maxAgeMs: 5 * 60_000 } },

  // Notifications list
  { pattern: /^\/notifications$/, config: { freshMs: 30_000, maxAgeMs: 2 * 60_000 } },
];

// URLs that should NEVER be cached
const NEVER_CACHE_PATTERNS = [
  /^\/auth\//,
  /^\/users\/me$/,       // Auth bootstrap — always fresh
  /^\/health$/,
  /^\/parties\/[^/]+$/,  // Event detail must always hit API
];

// ─── Mutation → Invalidation mapping ────────────────────────────────
// After a mutation matches a pattern, all cache entries matching the invalidation
// globs are purged.
const INVALIDATION_RULES: { mutationPattern: RegExp; purgePatterns: RegExp[] }[] = [
  // Event CRUD/actions may change event listings
  { mutationPattern: /^\/parties(?:\/|$)/, purgePatterns: [/^\/parties$/, /^\/users\/me\/parties$/] },
  // Photo changes affect image endpoints
  { mutationPattern: /^\/photos(?:\/|$)|\/photos$/, purgePatterns: [/^\/photos(?:\/|$)/, /^\/parties\/[^/]+\/photos$/] },
  // Notification read/update invalidates notifications list cache
  { mutationPattern: /^\/notifications(?:\/|$)/, purgePatterns: [/^\/notifications$/] },
];

// ─── Cache State ────────────────────────────────────────────────────
const cache = new Map<string, CacheEntry>();
const inflightRequests = new Map<string, Promise<unknown>>();

// ─── Core Functions ─────────────────────────────────────────────────

/** Normalize URL to a stable cache key (strip base URL, keep path+query) */
export function getCacheKey(url: string): string {
  // Remove base URL prefix if present, keep just path + query
  return url.replace(/^https?:\/\/[^/]+/, "");
}

/** Determine which TTL tier an endpoint belongs to */
function getTierConfig(path: string): TierConfig | null {
  // Check never-cache first
  for (const pattern of NEVER_CACHE_PATTERNS) {
    if (pattern.test(path)) return null;
  }
  // Find matching tier
  for (const tier of TIERS) {
    if (tier.pattern.test(path)) return tier.config;
  }
  // Unknown endpoints are not cached.
  return null;
}

/** Check if a URL should be cached */
export function isCacheable(url: string): boolean {
  const path = extractPath(url);
  return getTierConfig(path) !== null;
}

/** Extract the path portion from a URL (strip query params for tier matching) */
function extractPath(url: string): string {
  return url.split("?")[0];
}

/** Get the cache status of an entry */
function getCacheStatus(entry: CacheEntry, config: TierConfig): CacheStatus {
  const age = Date.now() - entry.timestamp;
  if (age <= config.freshMs) return "fresh";
  if (age <= config.maxAgeMs) return "stale";
  return "expired";
}

/** Read from cache. Returns { data, status } or null if not cached/expired. */
export function getFromCache(url: string): { data: unknown; status: CacheStatus } | null {
  const key = getCacheKey(url);
  const entry = cache.get(key);
  if (!entry) return null;

  const path = extractPath(url);
  const config = getTierConfig(path);
  if (!config) return null;

  const status = getCacheStatus(entry, config);
  if (status === "expired") {
    cache.delete(key);
    return null;
  }

  return { data: entry.data, status };
}

/** Write to cache */
export function setInCache(url: string, data: unknown): void {
  const key = getCacheKey(url);
  const path = extractPath(url);
  if (!getTierConfig(path)) return; // Don't cache un-cacheable URLs

  cache.set(key, { data, timestamp: Date.now(), url });

  // LRU eviction
  if (cache.size > MAX_ENTRIES) {
    const entries = [...cache.entries()].sort((a, b) => a[1].timestamp - b[1].timestamp);
    for (let i = 0; i < PRUNE_COUNT && i < entries.length; i++) {
      cache.delete(entries[i][0]);
    }
  }

  // Persist to sessionStorage (debounced)
  debouncedPersist();
}

/** Invalidate cache entries based on a mutation URL */
export function invalidateOnMutation(mutationUrl: string): void {
  const path = extractPath(mutationUrl);

  for (const rule of INVALIDATION_RULES) {
    if (rule.mutationPattern.test(path)) {
      const keysToDelete: string[] = [];
      for (const [key] of cache) {
        const keyPath = extractPath(key);
        for (const purge of rule.purgePatterns) {
          if (purge.test(keyPath)) {
            keysToDelete.push(key);
            break;
          }
        }
      }
      keysToDelete.forEach((k) => cache.delete(k));
    }
  }

  debouncedPersist();
}

/** Clear the entire cache (used on logout) */
export function clearAllCache(): void {
  cache.clear();
  inflightRequests.clear();
  try { sessionStorage.removeItem(STORAGE_KEY); } catch { /* ignore */ }
}

// ─── Deduplication ──────────────────────────────────────────────────

/** Register an inflight request. Returns existing promise if one exists for this URL. */
export function getInflight(url: string): Promise<unknown> | null {
  return inflightRequests.get(getCacheKey(url)) || null;
}

/** Set an inflight request promise */
export function setInflight(url: string, promise: Promise<unknown>): void {
  const key = getCacheKey(url);
  inflightRequests.set(key, promise);
  // Auto-cleanup when done
  promise.finally(() => {
    if (inflightRequests.get(key) === promise) {
      inflightRequests.delete(key);
    }
  });
}

// ─── sessionStorage Persistence ─────────────────────────────────────

let persistTimer: ReturnType<typeof setTimeout> | null = null;

function debouncedPersist(): void {
  if (persistTimer) clearTimeout(persistTimer);
  persistTimer = setTimeout(persistToStorage, 1000);
}

function persistToStorage(): void {
  try {
    const serializable: Record<string, CacheEntry> = {};
    for (const [key, entry] of cache) {
      serializable[key] = entry;
    }
    const json = JSON.stringify(serializable);
    // Respect budget
    if (json.length <= STORAGE_BUDGET) {
      sessionStorage.setItem(STORAGE_KEY, json);
    }
  } catch {
    // sessionStorage full or unavailable — silently ignore
  }
}

/** Rehydrate cache from sessionStorage on init */
export function rehydrateCache(): void {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw) as Record<string, CacheEntry>;
    const now = Date.now();

    for (const [key, entry] of Object.entries(parsed)) {
      const path = extractPath(key);
      const config = getTierConfig(path);
      if (!config) continue;

      // Only rehydrate entries that aren't fully expired
      const age = now - entry.timestamp;
      if (age <= config.maxAgeMs) {
        cache.set(key, entry);
      }
    }
  } catch {
    // Corrupt data — clear it
    try { sessionStorage.removeItem(STORAGE_KEY); } catch { /* ignore */ }
  }
}

// ─── Initialize on import ──────────────────────────────────────────
rehydrateCache();
