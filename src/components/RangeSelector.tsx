import { RANGES, RANGE_LABELS, type Range } from "../api/types";
import "./RangeSelector.less";

/** Segmented control for the shared `range` query param. */
export function RangeSelector({
  value,
  onChange,
  ranges = RANGES,
}: {
  value: Range;
  onChange: (r: Range) => void;
  ranges?: readonly Range[];
}) {
  return (
    <div className="range-seg" role="tablist" aria-label="Zakres czasu">
      {ranges.map((r) => (
        <button
          key={r}
          role="tab"
          aria-selected={r === value}
          className={`range-seg__btn${r === value ? " is-active" : ""}`}
          onClick={() => onChange(r)}
        >
          {RANGE_LABELS[r]}
        </button>
      ))}
    </div>
  );
}
