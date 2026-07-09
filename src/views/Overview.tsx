import { useMemo } from "react";
import { metricsApi } from "../api/client";
import type {
  CompileRow,
  Range,
  WorkerEvent,
  WorkerSnapshot,
} from "../api/types";
import { useApi } from "../hooks/useApi";
import { useStickyState } from "../hooks/useStickyState";
import {
  cityLabel,
  fmtBytes,
  fmtDateTime,
  fmtInt,
  fmtMs,
  fmtNum,
  fmtPct,
  fmtRelative,
  tsToMs,
  tsToUnix,
} from "../lib/format";
import { SERIES } from "../theme/palette";
import { Async, EmptyState } from "../components/States";
import { Card } from "../components/Card";
import { StatTile, type StatStatus } from "../components/StatTile";
import { DataTable, type Column } from "../components/DataTable";
import { RangeSelector } from "../components/RangeSelector";
import { UPlotChart } from "../components/UPlotChart";
import { LastUpdated, RefreshButton, LiveDot } from "../components/Toolbar";
import "./Overview.less";

/** Skuteczność → status by the standard 90 / 75 thresholds. */
function matchStatus(pct: number | null): StatStatus {
  if (pct == null) return "neutral";
  if (pct >= 90) return "good";
  if (pct >= 75) return "warning";
  return "critical";
}

/** Colored .pill reflecting a matched-% value. */
function pctPill(pct: number | null) {
  const status = matchStatus(pct);
  const cls = status === "neutral" ? "" : ` pill--${status}`;
  return <span className={`pill${cls}`}>{fmtPct(pct, 1)}</span>;
}

/** One small-multiple chart: a single city's realtime series over `range`. */
function CityChart({ city, range }: { city: string; range: Range }) {
  const res = useApi(() => metricsApi.realtime(city, range), [city, range]);

  const s = useMemo(() => {
    const pts = res.data ?? [];
    return {
      x: pts.map((p) => tsToUnix(p.bucket)),
      positions: pts.map((p) => p.positions),
      matched: pts.map((p) => p.matched),
      last: pts[pts.length - 1],
    };
  }, [res.data]);

  return (
    <Card
      title={cityLabel(city)}
      subtitle={s.last ? `${fmtInt(s.last.positions)} pozycji` : "—"}
      actions={s.last ? pctPill(s.last.matched_pct) : null}
    >
      <Async result={res} isEmpty={(d) => d.length === 0}>
        {() => (
          <UPlotChart
            x={s.x}
            data={[s.positions, s.matched]}
            series={[
              { label: "Pozycje", color: SERIES[0], fill: true, fmt: (v) => fmtNum(v, 1) },
              { label: "Dopasowane", color: SERIES[1], fill: true, fmt: (v) => fmtNum(v, 1) },
            ]}
            yFmt={(v) => fmtInt(v)}
            zeroBased
            height={168}
          />
        )}
      </Async>
    </Card>
  );
}

export function Overview() {
  const res = useApi(() => metricsApi.overview(), [], { refreshMs: 15000 });
  const [range, setRange] = useStickyState<Range>("ov.range", "24h");

  const kpi = useMemo(() => {
    const rt = res.data?.realtime ?? [];
    const positions = rt.reduce((a, r) => a + r.positions, 0);

    // Positions-weighted mean of matched_pct (ignoring rows without a value).
    let wSum = 0;
    let wTotal = 0;
    for (const r of rt) {
      if (r.matched_pct == null) continue;
      wSum += r.matched_pct * r.positions;
      wTotal += r.positions;
    }
    const meanPct = wTotal > 0 ? wSum / wTotal : null;

    return { positions, meanPct };
  }, [res.data]);

  const cities = useMemo(
    () => (res.data?.realtime ?? []).map((r) => r.city).sort(),
    [res.data],
  );

  const workerCols: Column<WorkerSnapshot>[] = [
    { key: "role", header: "Rola", render: (w) => w.role, sortValue: (w) => w.role },
    {
      key: "worker",
      header: "Worker",
      mono: true,
      render: (w) => w.worker,
      sortValue: (w) => w.worker,
    },
    {
      key: "cpu_pct",
      header: "CPU",
      align: "right",
      mono: true,
      render: (w) => {
        const cls =
          w.cpu_pct > 150 ? " pill--critical" : w.cpu_pct > 80 ? " pill--warning" : "";
        return <span className={`pill${cls}`}>{fmtNum(w.cpu_pct, 1)}%</span>;
      },
      sortValue: (w) => w.cpu_pct,
    },
    {
      key: "rss_bytes",
      header: "RSS",
      align: "right",
      mono: true,
      render: (w) => fmtBytes(w.rss_bytes),
      sortValue: (w) => w.rss_bytes,
    },
    {
      key: "heap_bytes",
      header: "Heap",
      align: "right",
      mono: true,
      render: (w) => fmtBytes(w.heap_bytes),
      sortValue: (w) => w.heap_bytes,
    },
    {
      key: "event_loop_lag_ms",
      header: "Lag pętli",
      align: "right",
      mono: true,
      render: (w) => {
        const cls = w.event_loop_lag_ms > 50 ? " pill--warning" : "";
        return <span className={`pill${cls}`}>{fmtMs(w.event_loop_lag_ms)}</span>;
      },
      sortValue: (w) => w.event_loop_lag_ms,
    },
    {
      key: "sab_bytes",
      header: "SAB",
      align: "right",
      mono: true,
      render: (w) => (w.role === "main" ? fmtBytes(w.sab_bytes) : "—"),
      sortValue: (w) => (w.role === "main" ? w.sab_bytes : -1),
    },
  ];

  const compileCols: Column<CompileRow>[] = [
    { key: "city", header: "Miasto", render: (c) => cityLabel(c.city), sortValue: (c) => c.city },
    {
      key: "ts",
      header: "Kompilacja",
      align: "right",
      mono: true,
      render: (c) => <span title={fmtDateTime(c.ts)}>{fmtRelative(c.ts)}</span>,
      sortValue: (c) => tsToMs(c.ts),
    },
    {
      key: "duration_ms",
      header: "Czas",
      align: "right",
      mono: true,
      render: (c) => fmtMs(c.duration_ms),
      sortValue: (c) => c.duration_ms,
    },
    {
      key: "stops",
      header: "Przystanki",
      align: "right",
      mono: true,
      render: (c) => fmtInt(c.stops),
      sortValue: (c) => c.stops,
    },
    {
      key: "routes",
      header: "Linie",
      align: "right",
      mono: true,
      render: (c) => fmtInt(c.routes),
      sortValue: (c) => c.routes,
    },
    {
      key: "trips",
      header: "Kursy",
      align: "right",
      mono: true,
      render: (c) => fmtInt(c.trips),
      sortValue: (c) => c.trips,
    },
    {
      key: "shapes",
      header: "Kształty",
      align: "right",
      mono: true,
      render: (c) => fmtInt(c.shapes),
      sortValue: (c) => c.shapes,
    },
  ];

  const eventCols: Column<WorkerEvent>[] = [
    {
      key: "ts",
      header: "Czas",
      mono: true,
      render: (e) => fmtDateTime(e.ts),
      sortValue: (e) => tsToMs(e.ts),
    },
    { key: "role", header: "Rola", render: (e) => e.role, sortValue: (e) => e.role },
    {
      key: "label",
      header: "Etykieta",
      mono: true,
      render: (e) => e.label,
      sortValue: (e) => e.label,
    },
    {
      key: "event",
      header: "Zdarzenie",
      render: (e) => <span className="pill pill--critical">{e.event}</span>,
      sortValue: (e) => e.event,
    },
  ];

  return (
    <div className="view">
      <div className="toolbar">
        <div className="toolbar__group">
          <LiveDot />
          <RangeSelector value={range} onChange={setRange} />
        </div>
        <div className="toolbar__group toolbar__spacer updated">
          <LastUpdated at={res.lastUpdated} />
          <RefreshButton reloading={res.reloading} onClick={res.reload} />
        </div>
      </div>

      <Async
        result={res}
        isEmpty={(d) =>
          d.realtime.length === 0 &&
          d.workers.length === 0 &&
          d.compile.length === 0 &&
          d.events.length === 0
        }
      >
        {(data) => (
          <div className="stack">
            <div className="grid" style={{ ["--min" as string]: "200px" }}>
              <StatTile label="Aktywne miasta" value={fmtInt(data.realtime.length)} />
              <StatTile
                label="Pozycje / cykl"
                value={fmtInt(kpi.positions)}
                hint="suma miast"
              />
              <StatTile
                label="Śr. skuteczność"
                value={fmtNum(kpi.meanPct, 1)}
                unit="%"
                status={matchStatus(kpi.meanPct)}
                hint="ważona pozycjami"
              />
              <StatTile label="Workery" value={fmtInt(data.workers.length)} />
              <StatTile
                label="Crashe (50)"
                value={fmtInt(data.events.length)}
                status={data.events.length > 0 ? "critical" : "good"}
                hint="ostatnie zdarzenia"
              />
            </div>

            <div>
              <div className="section-label">Realtime — miasta</div>
              {cities.length === 0 ? (
                <Card>
                  <EmptyState title="Brak danych realtime" />
                </Card>
              ) : (
                <div className="grid" style={{ ["--min" as string]: "380px" }}>
                  {cities.map((city) => (
                    <CityChart key={city} city={city} range={range} />
                  ))}
                </div>
              )}
            </div>

            <Card title="Workery" flush>
              {data.workers.length === 0 ? (
                <EmptyState title="Brak workerów" />
              ) : (
                <DataTable
                  columns={workerCols}
                  rows={data.workers}
                  rowKey={(w) => `${w.role}/${w.worker}`}
                  defaultSort={{ key: "cpu_pct", dir: "desc" }}
                />
              )}
            </Card>

            <Card title="Kompilacje GTFS" flush>
              {data.compile.length === 0 ? (
                <EmptyState title="Brak kompilacji" />
              ) : (
                <DataTable
                  columns={compileCols}
                  rows={data.compile}
                  rowKey={(c) => `${c.city}/${c.ts}`}
                  defaultSort={{ key: "ts", dir: "desc" }}
                />
              )}
            </Card>

            <Card title="Ostatnie zdarzenia workerów">
              {data.events.length === 0 ? (
                <EmptyState title="Brak crashy 🎉" hint="Żaden worker nie zgłosił awarii." />
              ) : (
                <DataTable
                  columns={eventCols}
                  rows={data.events}
                  rowKey={(e, i) => `${e.ts}/${e.label}/${i}`}
                  defaultSort={{ key: "ts", dir: "desc" }}
                />
              )}
            </Card>
          </div>
        )}
      </Async>
    </div>
  );
}
