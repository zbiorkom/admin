import { useEffect } from "react";
import { useCities } from "../hooks/useCities";
import { cityLabel } from "../lib/format";
import "./CitySelector.less";

/** Sentinel used when `allowAll` and no city is selected. */
export const ALL_CITIES = "";

/**
 * Dropdown of known cities (derived from the overview snapshot). Controlled.
 * When `allowAll` is set, "" means aggregate-over-all (used by /metrics/sse).
 * Otherwise the first city is auto-selected once the list loads.
 */
export function CitySelector({
  value,
  onChange,
  allowAll = false,
  allowAllLabel = "Wszystkie miasta",
}: {
  value: string;
  onChange: (city: string) => void;
  allowAll?: boolean;
  allowAllLabel?: string;
}) {
  const { cities, loading } = useCities();

  // Auto-select the first city when required and nothing valid is chosen yet.
  useEffect(() => {
    if (loading || cities.length === 0) return;
    if (!allowAll && (value === ALL_CITIES || !cities.includes(value))) {
      onChange(cities[0]);
    }
  }, [loading, cities, allowAll, value, onChange]);

  return (
    <label className="city-sel">
      <span className="city-sel__label">Miasto</span>
      <div className="city-sel__control">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={loading && cities.length === 0}
        >
          {allowAll && <option value={ALL_CITIES}>{allowAllLabel}</option>}
          {cities.map((c) => (
            <option key={c} value={c}>
              {cityLabel(c)}
            </option>
          ))}
          {!loading && cities.length === 0 && (
            <option value={ALL_CITIES}>— brak miast —</option>
          )}
        </select>
        <span className="city-sel__caret" aria-hidden>
          ▾
        </span>
      </div>
    </label>
  );
}
