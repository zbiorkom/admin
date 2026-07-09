import { useMemo } from "react";

/** Tiny inline SVG sparkline for stat tiles. Renders nulls as gaps. */
export function Sparkline({
  values,
  width = 96,
  height = 30,
  color = "var(--accent)",
  fill = true,
  strokeWidth = 1.5,
}: {
  values: (number | null)[];
  width?: number;
  height?: number;
  color?: string;
  fill?: boolean;
  strokeWidth?: number;
}) {
  const { line, area } = useMemo(() => {
    const nums = values.filter((v): v is number => v != null && Number.isFinite(v));
    if (nums.length < 2) return { line: "", area: "" };
    const min = Math.min(...nums);
    const max = Math.max(...nums);
    const span = max - min || 1;
    const pad = strokeWidth;
    const w = width - pad * 2;
    const h = height - pad * 2;
    const n = values.length;

    const pts: (readonly [number, number] | null)[] = values.map((v, i) => {
      if (v == null || !Number.isFinite(v)) return null;
      const x = pad + (n === 1 ? w / 2 : (i / (n - 1)) * w);
      const y = pad + h - ((v - min) / span) * h;
      return [x, y] as const;
    });

    let d = "";
    let started = false;
    for (const p of pts) {
      if (!p) {
        started = false;
        continue;
      }
      d += `${started ? "L" : "M"}${p[0].toFixed(1)},${p[1].toFixed(1)} `;
      started = true;
    }

    const valid = pts.filter(Boolean) as (readonly [number, number])[];
    const areaD =
      valid.length >= 2
        ? `M${valid[0][0].toFixed(1)},${(height - pad).toFixed(1)} ` +
          valid.map((p) => `L${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(" ") +
          ` L${valid[valid.length - 1][0].toFixed(1)},${(height - pad).toFixed(1)} Z`
        : "";

    return { line: d.trim(), area: areaD };
  }, [values, width, height, strokeWidth]);

  if (!line) return <svg width={width} height={height} aria-hidden />;

  return (
    <svg width={width} height={height} aria-hidden style={{ overflow: "visible" }}>
      {fill && area && <path d={area} fill={color} opacity={0.14} />}
      <path
        d={line}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}
