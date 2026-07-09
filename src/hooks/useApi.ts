import { useCallback, useEffect, useRef, useState } from "react";
import { ApiError } from "../api/client";
import { useAuth } from "../auth/AuthContext";

export interface ApiResult<T> {
  data: T | null;
  error: ApiError | Error | null;
  /** True only on the very first load (no data yet). */
  loading: boolean;
  /** True on background refetches (poll or manual) while data is shown. */
  reloading: boolean;
  /** Epoch ms of the last successful load, or null. */
  lastUpdated: number | null;
  reload: () => void;
}

interface Options {
  /** Auto-refetch interval in ms (e.g. live overview). Omit to disable. */
  refreshMs?: number;
  /** Skip fetching while false (e.g. city not chosen yet). */
  enabled?: boolean;
}

/**
 * Generic data loader for the metrics endpoints. Re-runs whenever `deps` change,
 * supports manual reload + optional polling, and bounces the whole app to the
 * login screen if the session expires (any 401).
 *
 * Pass a fresh inline fetcher; the identity is captured via ref so only `deps`
 * (and reload/poll) drive refetching.
 */
export function useApi<T>(
  fetcher: () => Promise<T>,
  deps: readonly unknown[],
  opts: Options = {},
): ApiResult<T> {
  const { refreshMs, enabled = true } = opts;
  const { refresh: refreshAuth } = useAuth();

  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<ApiError | Error | null>(null);
  const [loading, setLoading] = useState<boolean>(enabled);
  const [reloading, setReloading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<number | null>(null);
  const [token, setToken] = useState(0);

  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;
  const hasData = useRef(false);

  const reload = useCallback(() => setToken((t) => t + 1), []);

  useEffect(() => {
    if (!enabled) {
      setLoading(false);
      return;
    }
    let cancelled = false;

    const run = async () => {
      if (hasData.current) setReloading(true);
      else setLoading(true);
      try {
        const result = await fetcherRef.current();
        if (cancelled) return;
        setData(result);
        setError(null);
        hasData.current = true;
        setLastUpdated(Date.now());
      } catch (err) {
        if (cancelled) return;
        if (err instanceof ApiError && err.status === 401) {
          // Session gone — re-check /me, which flips the app to <LoginPage>.
          void refreshAuth();
        }
        setError(err as Error);
      } finally {
        if (!cancelled) {
          setLoading(false);
          setReloading(false);
        }
      }
    };

    void run();

    if (refreshMs && refreshMs > 0) {
      const id = window.setInterval(run, refreshMs);
      return () => {
        cancelled = true;
        window.clearInterval(id);
      };
    }
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, refreshMs, token, refreshAuth, ...deps]);

  return { data, error, loading, reloading, lastUpdated, reload };
}
