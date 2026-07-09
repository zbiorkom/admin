// Single source of truth for chart colors consumed by JS (uPlot strokes, canvas
// heatmap). These MUST stay in sync with the CSS custom properties in
// src/styles/theme.less (mirrored there for LESS-side chrome). The categorical
// set is the dataviz reference dark palette, validated against surface #141922:
// all 8 inside the dark lightness band, ≥3:1 contrast, worst adjacent CVD ΔE 10.3
// (floor band → we always ship a legend / direct labels as secondary encoding).

/** Categorical series slots — assign in fixed order, never cycled. */
export const SERIES = [
  "#3987e5", // 1 blue
  "#199e70", // 2 aqua
  "#c98500", // 3 yellow
  "#008300", // 4 green
  "#9085e9", // 5 violet
  "#e66767", // 6 red
  "#d55181", // 7 magenta
  "#d95926", // 8 orange
] as const;

/** Nth categorical color (folds back only past slot 8 — prefer to avoid). */
export function series(i: number): string {
  return SERIES[i % SERIES.length];
}

/** Reserved status colors — never reused as a series; ship with icon + label. */
export const STATUS = {
  good: "#0ca30c",
  warning: "#fab219",
  serious: "#ec835a",
  critical: "#d03b3b",
} as const;

/** Chart chrome + ink for the dark surface. */
export const CHART = {
  surface: "#141922",
  page: "#0b0e14",
  ink: "#e6ebf3",
  inkSecondary: "#9aa7b8",
  muted: "#6b7688",
  grid: "#212836",
  axis: "#2f3a49",
} as const;

/** Blue sequential ramp (light→dark) for magnitude encoding (heatmaps). */
export const SEQ_BLUE = [
  "#cde2fb",
  "#9ec5f4",
  "#6da7ec",
  "#3987e5",
  "#256abf",
  "#184f95",
  "#0d366b",
] as const;

/** Accent used for interactive chrome (matches series slot 1). */
export const ACCENT = "#3987e5";
