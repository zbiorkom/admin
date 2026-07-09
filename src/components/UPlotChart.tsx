import { useEffect, useMemo, useRef } from "react";
import uPlot from "uplot";
import "uplot/dist/uPlot.min.css";
import { series as seriesColor, CHART } from "../theme/palette";
import { fmtNum } from "../lib/format";

export interface UPlotSeries {
  label: string;
  /** Stroke color; defaults to the categorical slot at this index. */
  color?: string;
  /** Fill a translucent area under the line. */
  fill?: boolean;
  /** Dashed stroke, e.g. [6, 4]. */
  dash?: number[];
  /** Line width in px (default 2). */
  width?: number;
  /** Value formatter for tooltip + legend (default: 1-dp number). */
  fmt?: (v: number | null) => string;
}

export interface UPlotChartProps {
  /** X values in unix SECONDS, ascending. */
  x: number[];
  /** One array per series, aligned to x; null = gap. */
  data: (number | null)[][];
  series: UPlotSeries[];
  height?: number;
  /** Y-axis tick formatter. */
  yFmt?: (v: number) => string;
  /** Force the y-axis to include 0. */
  zeroBased?: boolean;
  className?: string;
  ariaLabel?: string;
}

function hexToRgba(hex: string, a: number): string {
  let h = hex.replace("#", "");
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  const n = parseInt(h, 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`;
}

const AXIS_FONT = '11px "Segoe UI", system-ui, sans-serif';

export function UPlotChart({
  x,
  data,
  series,
  height = 260,
  yFmt = (v) => fmtNum(v, 0),
  zeroBased = false,
  className,
  ariaLabel,
}: UPlotChartProps) {
  const elRef = useRef<HTMLDivElement>(null);
  const plotRef = useRef<uPlot | null>(null);

  const colors = useMemo(
    () => series.map((s, i) => s.color ?? seriesColor(i)),
    [series],
  );
  const fmts = useMemo(
    () => series.map((s) => s.fmt ?? ((v: number | null) => (v == null ? "—" : fmtNum(v, 1)))),
    [series],
  );

  const aligned = useMemo(
    () => [x, ...data] as unknown as uPlot.AlignedData,
    [x, data],
  );
  const alignedRef = useRef(aligned);
  alignedRef.current = aligned;

  // Rebuild only when the structure changes (labels/colors/count/height), not on
  // every data poll — that path uses setData below to preserve zoom.
  const structSig = useMemo(
    () =>
      JSON.stringify({
        s: series.map((s, i) => [s.label, colors[i], s.fill, s.dash, s.width]),
        height,
        zeroBased,
      }),
    [series, colors, height, zeroBased],
  );

  useEffect(() => {
    const el = elRef.current;
    if (!el) return;

    const tooltipPlugin: uPlot.Plugin = (() => {
      let tip: HTMLDivElement | null = null;
      return {
        hooks: {
          init: (u) => {
            tip = document.createElement("div");
            tip.className = "uplot-tooltip";
            tip.style.opacity = "0";
            u.over.appendChild(tip);
          },
          setCursor: (u) => {
            if (!tip) return;
            const idx = u.cursor.idx;
            const left = u.cursor.left ?? -1;
            const top = u.cursor.top ?? -1;
            if (idx == null || left < 0) {
              tip.style.opacity = "0";
              return;
            }
            const tsSec = u.data[0][idx] as number;
            const date = new Date(tsSec * 1000);
            const timeStr = date.toLocaleString("pl-PL", {
              day: "2-digit",
              month: "2-digit",
              hour: "2-digit",
              minute: "2-digit",
              second: "2-digit",
            });
            let html = `<div class="uplot-tooltip__time">${timeStr}</div>`;
            for (let si = 1; si < u.series.length; si++) {
              if (u.series[si].show === false) continue;
              const v = u.data[si][idx] as number | null;
              html +=
                `<div class="uplot-tooltip__row">` +
                `<span class="uplot-tooltip__swatch" style="background:${colors[si - 1]}"></span>` +
                `<span class="uplot-tooltip__label">${series[si - 1].label}</span>` +
                `<span class="uplot-tooltip__val">${fmts[si - 1](v)}</span>` +
                `</div>`;
            }
            tip.innerHTML = html;
            const w = u.over.clientWidth;
            const h = u.over.clientHeight;
            const flipX = left > w * 0.6;
            const flipY = top > h * 0.55;
            tip.style.left = `${left}px`;
            tip.style.top = `${top}px`;
            tip.style.transform = `translate(${
              flipX ? "calc(-100% - 14px)" : "14px"
            }, ${flipY ? "calc(-100% - 14px)" : "14px"})`;
            tip.style.opacity = "1";
          },
        },
      };
    })();

    const opts: uPlot.Options = {
      width: el.clientWidth || 600,
      height,
      cursor: {
        points: { show: true, size: 7, width: 2 },
        focus: { prox: 24 },
        drag: { x: true, y: false, uni: 16 },
      },
      legend: { show: series.length > 1, live: true },
      scales: {
        x: { time: true },
        y: {
          range: (_u, dataMin: number | null, dataMax: number | null) => {
            if (dataMin == null || dataMax == null) return [0, 1];
            const lo = zeroBased ? Math.min(0, dataMin) : dataMin;
            let hi = dataMax;
            if (lo === hi) hi = lo + 1;
            const pad = (hi - lo) * 0.08;
            return [lo === 0 && zeroBased ? 0 : lo - pad, hi + pad];
          },
        },
      },
      series: [
        {},
        ...series.map((s, i) => ({
          label: s.label,
          stroke: colors[i],
          width: s.width ?? 2,
          dash: s.dash,
          spanGaps: false,
          points: { show: false },
          fill: s.fill ? hexToRgba(colors[i], 0.14) : undefined,
          value: (_u: uPlot, v: number | null) => fmts[i](v),
        })),
      ],
      axes: [
        {
          stroke: CHART.muted,
          grid: { stroke: CHART.grid, width: 1 },
          ticks: { stroke: CHART.grid, width: 1, size: 5 },
          font: AXIS_FONT,
          size: 34,
        },
        {
          stroke: CHART.muted,
          grid: { stroke: CHART.grid, width: 1 },
          ticks: { stroke: CHART.grid, width: 1, size: 5 },
          font: AXIS_FONT,
          size: 52,
          values: (_u, splits) => splits.map((v) => yFmt(v)),
        },
      ],
      plugins: [tooltipPlugin],
    };

    const u = new uPlot(opts, alignedRef.current, el);
    plotRef.current = u;

    const ro = new ResizeObserver((entries) => {
      const w = Math.round(entries[0].contentRect.width);
      if (w > 0) u.setSize({ width: w, height });
    });
    ro.observe(el);

    return () => {
      ro.disconnect();
      u.destroy();
      plotRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [structSig]);

  // Push new data without rebuilding.
  useEffect(() => {
    plotRef.current?.setData(aligned);
  }, [aligned]);

  return (
    <div
      ref={elRef}
      className={className}
      role="img"
      aria-label={ariaLabel ?? series.map((s) => s.label).join(", ")}
    />
  );
}
