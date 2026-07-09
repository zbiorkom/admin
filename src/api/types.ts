/** Time window + bucket resolution shared by the series endpoints. */
export type Range = "1h" | "6h" | "24h" | "7d" | "30d";

export const RANGES: readonly Range[] = ["1h", "6h", "24h", "7d", "30d"] as const;

/** Human labels for the range selector. */
export const RANGE_LABELS: Record<Range, string> = {
  "1h": "1 godz.",
  "6h": "6 godz.",
  "24h": "24 godz.",
  "7d": "7 dni",
  "30d": "30 dni",
};

/** Approximate bucket size (seconds) per range — used to derive rates (QPS etc.). */
export const RANGE_BUCKET_SECONDS: Record<Range, number> = {
  "1h": 60,
  "6h": 300,
  "24h": 900,
  "7d": 3600,
  "30d": 21600,
};

/** A known-literal union that still accepts arbitrary strings, keeping literal
 *  autocomplete. The `& {}` intersection is intentional (prevents the union from
 *  widening to plain `string`). */
// eslint-disable-next-line @typescript-eslint/ban-types
type Loose<T extends string> = T | (string & {});

export type WorkerRole =
  | "server"
  | "router"
  | "realtime"
  | "bike"
  | "discord"
  | "main";

// ── Auth ─────────────────────────────────────────────────────────────────────

export interface LoginOptionsResponse {
  /** PublicKeyCredentialRequestOptionsJSON — pass whole to startAuthentication. */
  options: PublicKeyCredentialRequestOptionsJSON;
  /** Opaque signed challenge, echoed back to /verify. Keep in memory only. */
  token: string;
}

export interface VerifyResponse {
  verified: true;
  username: string;
}

export interface MeResponse {
  username: string;
}

// The @simplewebauthn/browser types cover the request/response option shapes; we
// only need a loose alias here so client.ts stays independent of that import.
export type PublicKeyCredentialRequestOptionsJSON = Record<string, unknown>;

// ── Overview snapshot ──────────────────────────────────────────────────────────

export interface RealtimeSnapshot {
  city: string;
  ts: string;
  positions: number;
  matched: number;
  ghost: number;
  conflicts: number;
  /** 100 * matched / positions; null when positions = 0. */
  matched_pct: number | null;
}

export interface CompileRow {
  city: string;
  ts: string;
  duration_ms: number;
  stops: number;
  routes: number;
  trips: number;
  shapes: number;
}

export interface WorkerSnapshot {
  role: WorkerRole;
  worker: string;
  ts: string;
  cpu_pct: number;
  rss_bytes: number;
  heap_bytes: number;
  event_loop_lag_ms: number;
  /** Meaningful only for role === "main"; others report 0. */
  sab_bytes: number;
}

export type WorkerEventKind = Loose<"crash">;

export interface WorkerEvent {
  ts: string;
  role: WorkerRole;
  label: string;
  event: WorkerEventKind;
}

export interface OverviewResponse {
  realtime: RealtimeSnapshot[];
  compile: CompileRow[];
  workers: WorkerSnapshot[];
  events: WorkerEvent[];
}

// ── Series ──────────────────────────────────────────────────────────────────

export interface RealtimePoint {
  bucket: string;
  positions: number;
  matched: number;
  ghost: number;
  conflicts: number;
  matched_pct: number | null;
}

export interface FeedRow {
  /** Feed function name or its index ("0", "1", …). */
  feed: string;
  /** Mean duration of successful runs; null when every run failed. */
  avg_ms: number | null;
  max_ms: number;
  /** Runs that errored/timed out (feed_ms = -1). fail rate = failures/total. */
  failures: number;
  total: number;
}

export interface RouterPoint {
  bucket: string;
  queries: number;
  no_route: number;
  no_route_pct: number;
  p50: number;
  p95: number;
  p99: number;
}

export interface RouterTrip {
  /** Requested departure/arrival time (not the query execution time). */
  query_time: string;
  duration_ms: number;
  found: number;
  /** Coordinates rounded to 2 decimals (~1 km grid) — aggregate only. */
  from_lon: number;
  from_lat: number;
  to_lon: number;
  to_lat: number;
}

export interface SseActivePoint {
  bucket: string;
  connections: number;
}

export interface SseThroughputPoint {
  bucket: string;
  closed: number;
  messages: number;
  avg_duration_ms: number;
}

export interface SseResponse {
  active: SseActivePoint[];
  throughput: SseThroughputPoint[];
}

export interface WorkerPoint {
  bucket: string;
  role: WorkerRole;
  worker: string;
  cpu_pct: number;
  rss_bytes: number;
  heap_bytes: number;
  event_loop_lag_ms: number;
  sab_bytes: number;
}

// ── Errors ────────────────────────────────────────────────────────────────────

export type ApiErrorCode = Loose<
  | "MISSING_CITY"
  | "CHALLENGE_EXPIRED"
  | "UNKNOWN_CREDENTIAL"
  | "VERIFICATION_FAILED"
  | "UNAUTHORIZED"
  | "CITY_NOT_FOUND"
  | "UNKNOWN_ERROR"
>;
