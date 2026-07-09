import type {
  ApiErrorCode,
  CompileRow,
  FeedRow,
  LoginOptionsResponse,
  MeResponse,
  OverviewResponse,
  Range,
  RealtimePoint,
  RouterPoint,
  RouterTrip,
  SseResponse,
  VerifyResponse,
  WorkerEvent,
  WorkerPoint,
} from "./types";

/** Backend origin. Empty string in dev → relative URLs hit the Vite proxy. */
const API_BASE = import.meta.env.VITE_API_BASE ?? "";
const PREFIX = "/api6/admin";

/** Typed error carrying the backend `error` code + HTTP status. */
export class ApiError extends Error {
  constructor(
    public readonly code: ApiErrorCode,
    public readonly status: number,
  ) {
    super(code);
    this.name = "ApiError";
  }
}

/** Polish, human-readable message per known error code. */
export function describeError(err: unknown): string {
  const code = err instanceof ApiError ? err.code : String(err);
  switch (code) {
    case "UNAUTHORIZED":
      return "Sesja wygasła lub jej brak. Zaloguj się ponownie.";
    case "CHALLENGE_EXPIRED":
      return "Wyzwanie logowania wygasło (>60 s). Spróbuj jeszcze raz.";
    case "UNKNOWN_CREDENTIAL":
      return "Ten klucz nie należy do żadnego administratora.";
    case "VERIFICATION_FAILED":
      return "Weryfikacja klucza nie powiodła się.";
    case "MISSING_CITY":
      return "Nie wybrano miasta.";
    case "CITY_NOT_FOUND":
      return "Nie znaleziono miasta.";
    case "UNKNOWN_ERROR":
      return "Błąd serwera. Spróbuj ponownie za chwilę.";
    default:
      return err instanceof ApiError
        ? `Błąd: ${err.code}`
        : "Nie udało się połączyć z serwerem.";
  }
}

type QueryValue = string | number | undefined | null;

function buildUrl(path: string, query?: Record<string, QueryValue>): string {
  const qs = new URLSearchParams();
  if (query) {
    for (const [k, v] of Object.entries(query)) {
      if (v !== undefined && v !== null && v !== "") qs.set(k, String(v));
    }
  }
  const suffix = qs.toString();
  return `${API_BASE}${PREFIX}${path}${suffix ? `?${suffix}` : ""}`;
}

interface RequestOptions {
  method?: "GET" | "POST";
  body?: unknown;
  query?: Record<string, QueryValue>;
}

/** Core fetch: always credentialed, JSON in/out, throws ApiError on non-2xx. */
async function request<T>(path: string, opts: RequestOptions = {}): Promise<T> {
  const { method = "GET", body, query } = opts;

  let res: Response;
  try {
    res = await fetch(buildUrl(path, query), {
      method,
      credentials: "include",
      headers: body !== undefined ? { "Content-Type": "application/json" } : undefined,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    // Network / CORS failure — no HTTP status available.
    throw new ApiError("NETWORK_ERROR", 0);
  }

  if (!res.ok) {
    let code: ApiErrorCode = "UNKNOWN_ERROR";
    try {
      const data = (await res.json()) as { error?: string };
      if (data?.error) code = data.error;
    } catch {
      /* body wasn't JSON — keep UNKNOWN_ERROR */
    }
    throw new ApiError(code, res.status);
  }

  // 204 / empty body tolerance.
  const text = await res.text();
  return (text ? JSON.parse(text) : undefined) as T;
}

// ── Auth ─────────────────────────────────────────────────────────────────────

export const authApi = {
  /** Public — no session required. */
  loginOptions: () => request<LoginOptionsResponse>("/login/options"),

  loginVerify: (authResponse: unknown, token: string) =>
    request<VerifyResponse>("/login/verify", {
      method: "POST",
      body: { authResponse, token },
    }),

  /** null when unauthenticated (401) instead of throwing — used for bootstrap. */
  async me(): Promise<MeResponse | null> {
    try {
      return await request<MeResponse>("/me");
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) return null;
      throw err;
    }
  },

  logout: () => request<{ ok: true }>("/logout", { method: "POST" }),
};

// ── Metrics ────────────────────────────────────────────────────────────────

export const metricsApi = {
  overview: () => request<OverviewResponse>("/metrics/overview"),

  realtime: (city: string, range: Range) =>
    request<RealtimePoint[]>("/metrics/realtime", { query: { city, range } }),

  feeds: (city: string, range: Range) =>
    request<FeedRow[]>("/metrics/feeds", { query: { city, range } }),

  router: (range: Range) =>
    request<RouterPoint[]>("/metrics/router", { query: { range } }),

  routerTrips: (range: Range) =>
    request<RouterTrip[]>("/metrics/router/trips", { query: { range } }),

  compile: () => request<CompileRow[]>("/metrics/compile"),

  sse: (city: string | undefined, range: Range) =>
    request<SseResponse>("/metrics/sse", { query: { city, range } }),

  workers: (range: Range) =>
    request<WorkerPoint[]>("/metrics/workers", { query: { range } }),

  workerEvents: (range: Range) =>
    request<WorkerEvent[]>("/metrics/workers/events", { query: { range } }),
};
