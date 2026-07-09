import type { ReactNode } from "react";
import { Sparkline } from "./Sparkline";
import "./StatTile.less";

export type StatStatus = "good" | "warning" | "serious" | "critical" | "neutral";

export interface StatTileProps {
  label: ReactNode;
  value: ReactNode;
  /** Small unit suffix rendered next to the value (e.g. "ms", "%"). */
  unit?: ReactNode;
  /** Extra context below the value. */
  hint?: ReactNode;
  /** Colored left accent + status dot. */
  status?: StatStatus;
  /** Optional trailing sparkline series. */
  spark?: (number | null)[];
  sparkColor?: string;
  icon?: ReactNode;
}

const STATUS_LABEL: Record<StatStatus, string> = {
  good: "ok",
  warning: "uwaga",
  serious: "poważne",
  critical: "krytyczne",
  neutral: "",
};

export function StatTile({
  label,
  value,
  unit,
  hint,
  status = "neutral",
  spark,
  sparkColor,
  icon,
}: StatTileProps) {
  return (
    <div className={`stat stat--${status}`}>
      <div className="stat__top">
        <span className="stat__label">
          {icon && <span className="stat__icon">{icon}</span>}
          {label}
        </span>
        {status !== "neutral" && (
          <span
            className={`status-dot status-dot--${status}`}
            title={STATUS_LABEL[status]}
          />
        )}
      </div>
      <div className="stat__value">
        {value}
        {unit != null && <span className="stat__unit">{unit}</span>}
      </div>
      <div className="stat__bottom">
        {hint != null && <span className="stat__hint">{hint}</span>}
        {spark && spark.length > 1 && (
          <span className="stat__spark">
            <Sparkline
              values={spark}
              color={sparkColor ?? "var(--accent)"}
              width={84}
              height={26}
            />
          </span>
        )}
      </div>
    </div>
  );
}
