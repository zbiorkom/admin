import { useEffect, useMemo, useRef, useState } from "react";
import { metricsApi } from "../api/client";
import { RANGE_BUCKET_SECONDS, type Range, type RouterTrip } from "../api/types";
import { useApi } from "../hooks/useApi";
import { useStickyState } from "../hooks/useStickyState";
import { tsToUnix, tsToMs, fmtInt, fmtNum, fmtPct, fmtMs, fmtDateTime } from "../lib/format";
import { SERIES, STATUS, SEQ_BLUE } from "../theme/palette";
import { Async, EmptyState } from "../components/States";
import { Card } from "../components/Card";
import { StatTile, type StatStatus } from "../components/StatTile";
import { RangeSelector } from "../components/RangeSelector";
import { UPlotChart } from "../components/UPlotChart";
import { DataTable, type Column } from "../components/DataTable";
import { LastUpdated, RefreshButton } from "../components/Toolbar";
import "./Router.less";

// ── Origin-density heatmap ────────────────────────────────────────────────────

// Magnitude ramp for the dark surface: low counts sit near the surface (deep
// blue), high counts brighten toward cyan. Reversed SEQ_BLUE with a bright cap.
const HEAT_RAMP: string[] = (() => {
  const r: string[] = [...SEQ_BLUE].reverse();
  r[r.length - 1] = "#7fdcff";
  return r;
})();

function hexToRgb(hex: string): [number, number, number] {
  let h = hex.replace("#", "");
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  const n = parseInt(h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function rampColor(t: number): string {
  const clamped = t < 0 ? 0 : t > 1 ? 1 : t;
  const seg = clamped * (HEAT_RAMP.length - 1);
  const i = Math.floor(seg);
  if (i >= HEAT_RAMP.length - 1) return HEAT_RAMP[HEAT_RAMP.length - 1];
  const f = seg - i;
  const [r1, g1, b1] = hexToRgb(HEAT_RAMP[i]);
  const [r2, g2, b2] = hexToRgb(HEAT_RAMP[i + 1]);
  const r = Math.round(r1 + (r2 - r1) * f);
  const g = Math.round(g1 + (g2 - g1) * f);
  const b = Math.round(b1 + (b2 - b1) * f);
  return `rgb(${r}, ${g}, ${b})`;
}

const GX = 70;

function OdHeatmap({ trips }: { trips: RouterTrip[] }) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [size, setSize] = useState<{ w: number; h: number }>({ w: 0, h: 0 });

  // Track the wrapper width; height is a clamped 3:5-ish aspect of the width.
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const w = Math.round(entries[0].contentRect.width);
      if (w <= 0) return;
      const h = Math.max(240, Math.min(460, Math.round(w * 0.6)));
      setSize((prev) => (prev.w === w && prev.h === h ? prev : { w, h }));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Rasterize the origin points into a GX×GY density grid, then paint.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || size.w === 0 || trips.length === 0) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.round(size.w * dpr);
    canvas.height = Math.round(size.h * dpr);
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, size.w, size.h);

    let minLon = Infinity;
    let maxLon = -Infinity;
    let minLat = Infinity;
    let maxLat = -Infinity;
    for (const t of trips) {
      if (t.from_lon < minLon) minLon = t.from_lon;
      if (t.from_lon > maxLon) maxLon = t.from_lon;
      if (t.from_lat < minLat) minLat = t.from_lat;
      if (t.from_lat > maxLat) maxLat = t.from_lat;
    }
    if (!Number.isFinite(minLon) || !Number.isFinite(minLat)) return;
    let lonSpan = maxLon - minLon;
    let latSpan = maxLat - minLat;
    if (lonSpan <= 0) lonSpan = 0.01;
    if (latSpan <= 0) latSpan = 0.01;

    const gy = Math.max(1, Math.round((GX * size.h) / size.w));
    const counts = new Int32Array(GX * gy);
    let maxCount = 0;
    for (const t of trips) {
      let cx = Math.floor(((t.from_lon - minLon) / lonSpan) * GX);
      // Latitude grows northward → invert so north sits at the top.
      let cy = Math.floor(((maxLat - t.from_lat) / latSpan) * gy);
      if (cx < 0) cx = 0;
      else if (cx >= GX) cx = GX - 1;
      if (cy < 0) cy = 0;
      else if (cy >= gy) cy = gy - 1;
      const c = ++counts[cy * GX + cx];
      if (c > maxCount) maxCount = c;
    }
    if (maxCount === 0) return;

    const cellW = size.w / GX;
    const cellH = size.h / gy;
    for (let y = 0; y < gy; y++) {
      for (let x = 0; x < GX; x++) {
        const c = counts[y * GX + x];
        if (c === 0) continue;
        // sqrt scale spreads the long tail of low-count cells.
        ctx.fillStyle = rampColor(Math.sqrt(c / maxCount));
        ctx.fillRect(x * cellW, y * cellH, cellW + 0.6, cellH + 0.6);
      }
    }
  }, [trips, size]);

  if (trips.length === 0) {
    return (
      <div className="odheat">
        <EmptyState
          title="Brak zapytań"
          hint="W wybranym oknie czasowym nie zarejestrowano żadnych zapytań routingu."
        />
      </div>
    );
  }

  return (
    <div className="odheat">
      <div className="odheat__canvas-wrap" ref={wrapRef}>
        <canvas
          ref={canvasRef}
          className="odheat__canvas"
          style={{ width: size.w, height: size.h }}
          role="img"
          aria-label="Mapa gęstości punktów początkowych zapytań"
        />
      </div>
      <div className="odheat__legend">
        <span>mało</span>
        <span className="odheat__bar" aria-hidden="true" />
        <span>dużo</span>
      </div>
      <p className="odheat__caption">
        {fmtInt(trips.length)} zapytań • siatka ~1 km (współrzędne zaokrąglone)
      </p>
    </div>
  );
}

// ── View ──────────────────────────────────────────────────────────────────────

function noRouteStatus(pct: number | null): StatStatus {
  if (pct == null) return "neutral";
  return pct > 5 ? "warning" : "good";
}

const tripColumns: Column<RouterTrip>[] = [
  {
    key: "query_time",
    header: "Czas zapytania",
    sortValue: (r) => tsToMs(r.query_time),
    render: (r) => fmtDateTime(r.query_time),
  },
  {
    key: "duration_ms",
    header: "Czas",
    align: "right",
    mono: true,
    sortValue: (r) => r.duration_ms,
    render: (r) => fmtMs(r.duration_ms),
  },
  {
    key: "found",
    header: "Znaleziono",
    align: "right",
    mono: true,
    sortValue: (r) => r.found,
    render: (r) =>
      r.found === 0 ? (
        <span className="pill pill--critical">0</span>
      ) : (
        fmtInt(r.found)
      ),
  },
  {
    key: "origin",
    header: "OD (origin)",
    mono: true,
    render: (r) => `${r.from_lat.toFixed(2)}, ${r.from_lon.toFixed(2)}`,
  },
  {
    key: "dest",
    header: "DO (dest)",
    mono: true,
    render: (r) => `${r.to_lat.toFixed(2)}, ${r.to_lon.toFixed(2)}`,
  },
];

export function RouterView() {
  const [range, setRange] = useStickyState<Range>("router.range", "24h");

  const seriesRes = useApi(() => metricsApi.router(range), [range]);
  const tripsRes = useApi(() => metricsApi.routerTrips(range), [range]);

  const reloadBoth = () => {
    seriesRes.reload();
    tripsRes.reload();
  };

  // Series aligned to the bucket axis (unix seconds for uPlot).
  const s = useMemo(() => {
    const pts = seriesRes.data ?? [];
    return {
      x: pts.map((p) => tsToUnix(p.bucket)),
      queries: pts.map((p) => p.queries),
      noRoute: pts.map((p) => p.no_route),
      noRoutePct: pts.map((p) => p.no_route_pct),
      p50: pts.map((p) => p.p50),
      p95: pts.map((p) => p.p95),
      p99: pts.map((p) => p.p99),
    };
  }, [seriesRes.data]);

  return (
    <div className="view">
      <div className="toolbar">
        <div className="toolbar__group">
          <RangeSelector value={range} onChange={setRange} />
        </div>
        <div className="toolbar__group toolbar__spacer updated">
          <LastUpdated at={seriesRes.lastUpdated} />
          <RefreshButton
            reloading={seriesRes.reloading || tripsRes.reloading}
            onClick={reloadBoth}
          />
        </div>
      </div>

      <div className="stack">
        <Async result={seriesRes} isEmpty={(d) => d.length === 0}>
          {(points) => {
            const sumQueries = points.reduce((a, p) => a + p.queries, 0);
            const sumNoRoute = points.reduce((a, p) => a + p.no_route, 0);
            const seconds = RANGE_BUCKET_SECONDS[range] * points.length;
            const avgQps = seconds > 0 ? sumQueries / seconds : null;
            const noRoutePct = sumQueries > 0 ? (sumNoRoute / sumQueries) * 100 : null;
            const last = points[points.length - 1];

            return (
              <>
                <div className="grid" style={{ ["--min" as string]: "210px" }}>
                  <StatTile
                    label="Zapytania"
                    value={fmtInt(sumQueries)}
                    hint="suma w oknie"
                    spark={s.queries}
                    sparkColor={SERIES[0]}
                  />
                  <StatTile
                    label="Śr. QPS"
                    value={fmtNum(avgQps, 2)}
                    hint="zapytań / s"
                    spark={s.queries}
                    sparkColor={SERIES[1]}
                  />
                  <StatTile
                    label="Bez trasy"
                    value={fmtInt(sumNoRoute)}
                    hint={fmtPct(noRoutePct)}
                    status={noRouteStatus(noRoutePct)}
                    spark={s.noRoute}
                    sparkColor={SERIES[5]}
                  />
                  <StatTile
                    label="p95 (ost.)"
                    value={fmtMs(last?.p95 ?? null)}
                    hint="ostatni cykl"
                    spark={s.p95}
                    sparkColor={SERIES[2]}
                  />
                  <StatTile
                    label="p99 (ost.)"
                    value={fmtMs(last?.p99 ?? null)}
                    hint="ostatni cykl"
                    spark={s.p99}
                    sparkColor={SERIES[7]}
                  />
                </div>

                <Card
                  title="Zapytania i bez trasy"
                  subtitle="Liczba zapytań routingu i tych zakończonych bez trasy w każdym cyklu"
                >
                  <UPlotChart
                    x={s.x}
                    data={[s.queries, s.noRoute]}
                    series={[
                      { label: "Zapytania", color: SERIES[0], fill: true, fmt: (v) => fmtInt(v) },
                      { label: "Bez trasy", color: SERIES[5], fmt: (v) => fmtInt(v) },
                    ]}
                    yFmt={(v) => fmtInt(v)}
                    zeroBased
                    height={280}
                  />
                </Card>

                <Card
                  title="Latencja RAPTOR (percentyle)"
                  subtitle="Czas odpowiedzi wyszukiwania połączeń — p50 / p95 / p99"
                >
                  <UPlotChart
                    x={s.x}
                    data={[s.p50, s.p95, s.p99]}
                    series={[
                      { label: "p50", color: SERIES[1], fmt: (v) => fmtMs(v) },
                      { label: "p95", color: SERIES[2], fmt: (v) => fmtMs(v) },
                      { label: "p99", color: SERIES[7], fmt: (v) => fmtMs(v) },
                    ]}
                    yFmt={(v) => fmtMs(v)}
                    zeroBased
                    height={280}
                  />
                </Card>

                <Card
                  title="Zapytania bez trasy (%)"
                  subtitle="Udział zapytań zakończonych bez znalezionej trasy"
                >
                  <UPlotChart
                    x={s.x}
                    data={[s.noRoutePct]}
                    series={[
                      {
                        label: "Bez trasy",
                        color: STATUS.warning,
                        fill: true,
                        fmt: (v) => fmtPct(v),
                      },
                    ]}
                    yFmt={(v) => fmtPct(v, 0)}
                    zeroBased
                    height={240}
                  />
                </Card>
              </>
            );
          }}
        </Async>

        <Async result={tripsRes}>
          {(trips) => {
            const rows = trips.slice(0, 60);
            return (
              <>
                <Card title="Mapa zapytań OD (origin)" flush>
                  <OdHeatmap trips={trips} />
                </Card>

                <Card
                  title="Ostatnie zapytania"
                  flush
                  footer={`Pokazano ${fmtInt(rows.length)} z ${fmtInt(trips.length)}`}
                >
                  <DataTable
                    columns={tripColumns}
                    rows={rows}
                    rowKey={(r, i) => `${r.query_time}-${i}`}
                    defaultSort={{ key: "query_time", dir: "desc" }}
                    compact
                    emptyLabel="Brak zapytań w wybranym oknie"
                  />
                </Card>
              </>
            );
          }}
        </Async>
      </div>
    </div>
  );
}
