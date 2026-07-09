import { useEffect, useState } from "react";
import { metricsApi } from "../api/client";

// The API has no "list cities" endpoint, so we derive the set from the overview
// snapshot (realtime + compile rows). Cached at module scope for the session so
// every selector shares one request.
let citiesPromise: Promise<string[]> | null = null;

function loadCities(): Promise<string[]> {
  if (!citiesPromise) {
    citiesPromise = metricsApi
      .overview()
      .then((o) => {
        const set = new Set<string>();
        for (const r of o.realtime) set.add(r.city);
        for (const c of o.compile) set.add(c.city);
        return [...set].sort();
      })
      .catch((err) => {
        citiesPromise = null; // allow retry on failure
        throw err;
      });
  }
  return citiesPromise;
}

export interface CitiesResult {
  cities: string[];
  loading: boolean;
  error: Error | null;
}

export function useCities(): CitiesResult {
  const [cities, setCities] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let alive = true;
    loadCities()
      .then((c) => alive && (setCities(c), setLoading(false)))
      .catch((e) => alive && (setError(e as Error), setLoading(false)));
    return () => {
      alive = false;
    };
  }, []);

  return { cities, loading, error };
}
