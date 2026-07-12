// Central configuration for the recommendations subsystem.
// Values can be overridden per environment via `process.env.*` (server) or
// `import.meta.env.VITE_*` (client). Keeping them in one file makes it easy
// to tune limits, pagination, and caching without hunting through code.

function readNumber(value: string | undefined, fallback: number, min: number, max: number): number {
  if (value === undefined || value === "") return fallback;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(Math.max(parsed, min), max);
}

// Read `process.env` only on the server; browser bundles never see it.
const env: Record<string, string | undefined> =
  typeof process !== "undefined" && process.env ? process.env : {};
const viteEnv = (typeof import.meta !== "undefined" && (import.meta as any).env) || {};

export const recoConfig = {
  // Default page size when the caller does not specify a limit.
  defaultLimit: readNumber(
    env.RECO_DEFAULT_LIMIT ?? viteEnv.VITE_RECO_DEFAULT_LIMIT,
    4, 1, 48,
  ),
  // Hard ceiling for the `limit` input on the server function.
  maxLimit: readNumber(
    env.RECO_MAX_LIMIT ?? viteEnv.VITE_RECO_MAX_LIMIT,
    24, 1, 96,
  ),
  // Max offset the endpoint will honor (prevents unbounded pagination).
  maxOffset: readNumber(
    env.RECO_MAX_OFFSET ?? viteEnv.VITE_RECO_MAX_OFFSET,
    500, 0, 10_000,
  ),
  // Page size used by the storefront's "Show more" pagination.
  pageSize: readNumber(
    env.RECO_PAGE_SIZE ?? viteEnv.VITE_RECO_PAGE_SIZE,
    4, 1, 24,
  ),
  // Server-side cache TTL, in milliseconds.
  cacheTtlMs: readNumber(
    env.RECO_CACHE_TTL_MS ?? viteEnv.VITE_RECO_CACHE_TTL_MS,
    5 * 60 * 1000, 0, 60 * 60 * 1000,
  ),
  // Max cache entries kept in memory on the server.
  cacheMax: readNumber(
    env.RECO_CACHE_MAX ?? viteEnv.VITE_RECO_CACHE_MAX,
    200, 1, 5_000,
  ),
  // Client-side (sessionStorage) cache TTL, in milliseconds.
  clientCacheTtlMs: readNumber(
    env.RECO_CLIENT_CACHE_TTL_MS ?? viteEnv.VITE_RECO_CLIENT_CACHE_TTL_MS,
    5 * 60 * 1000, 0, 60 * 60 * 1000,
  ),
} as const;

export type RecoConfig = typeof recoConfig;
