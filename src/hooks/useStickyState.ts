import { useCallback, useState } from "react";

/** useState mirrored to localStorage, so range/city choices survive reloads. */
export function useStickyState<T>(
  key: string,
  initial: T,
): [T, (v: T) => void] {
  const storageKey = `zbk-admin:${key}`;

  const [value, setValue] = useState<T>(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      return raw != null ? (JSON.parse(raw) as T) : initial;
    } catch {
      return initial;
    }
  });

  const set = useCallback(
    (v: T) => {
      setValue(v);
      try {
        localStorage.setItem(storageKey, JSON.stringify(v));
      } catch {
        /* ignore quota / disabled storage */
      }
    },
    [storageKey],
  );

  return [value, set];
}
