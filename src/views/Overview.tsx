import { useMemo } from "react";
import { metricsApi } from "../api/client";
import type {
  CompileRow,
  RealtimeSnapshot,
  WorkerEvent,
  WorkerSnapshot,
} from "../api/types";
import { useApi } from "../hooks/useApi";
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
} from "../lib/format";
import { Async, EmptyState } from "../components/States";
import { Card } from "../components/Card";
import { StatTile, type StatStatus } from "../components/StatTile";
import { DataTable, type Column } from "../components/DataTable";
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

export function Overview() {
  const res = useApi(() => metricsApi.overview(), [], { refreshMs: 15000 });

  const kpi = useMemo(() => {
    const rt = res.data?.realtime ?? [];
    const positions = rt.reduce((a, r) => a + r.positions, 0);
    const conflicts = rt.reduce((a, r) => a + r.conflicts, 0);

    // Positions-weighted mean of matched_pct (ignoring rows without a value).
    let wSum = 0;
    let wTotal = 0;
    for (const r of rt) {
      if (r.matched_pct == null) continue;
      wSum += r.matched_pct * r.positions;
      wTotal += r.positions;
    }
    const meanPct = wTotal > 0 ? wSum / wTotal : null;

    return { positions, conflicts, meanPct };
  }, [res.data]);

  const rtCols: Column<RealtimeSnapshot>[] = [
    {
      key: "city",
      header: "Miasto",
      render: (r) => cityLabel(r.city),
      sortValue: (r) => r.city,
    },
    {
      key: "positions",
      header: "Pozycje",
      align: "right",
      mono: true,
      render: (r) => fmtInt(r.positions),
      sortValue: (r) => r.positions,
    },
    {
      key: "matched",
      header: "Dopasowane",
      align: "right",
      mono: true,
      render: (r) => fmtInt(r.matched),
      sortValue: (r) => r.matched,
    },
    {
      key: "matched_pct",
      header: "Skuteczność",
      align: "right",
      mono: true,
      render: (r) => pctPill(r.matched_pct),
      sortValue: (r) => r.matched_pct ?? -1,
    },
    {
      key: "ghost",
      header: "Ghost",
      align: "right",
      mono: true,
      render: (r) => fmtInt(r.ghost),
      sortValue: (r) => r.ghost,
    },
    {
      key: "conflicts",
      header: "Konflikty",
      align: "right",
      mono: true,
      render: (r) => fmtInt(r.conflicts),
      sortValue: (r) => r.conflicts,
    },
    {
      key: "ts",
      header: "Aktualizacja",
      align: "right",
      mono: true,
      render: (r) => <span title={fmtDateTime(r.ts)}>{fmtRelative(r.ts)}</span>,
      sortValue: (r) => tsToMs(r.ts),
    },
  ];

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
              <StatTile
                label="Konflikty"
                value={fmtInt(kpi.conflicts)}
                status={kpi.conflicts > 0 ? "warning" : "good"}
                hint="suma miast"
              />
              <StatTile label="Workery" value={fmtInt(data.workers.length)} />
              <StatTile
                label="Crashe (50)"
                value={fmtInt(data.events.length)}
                status={data.events.length > 0 ? "critical" : "good"}
                hint="ostatnie zdarzenia"
              />
            </div>

            <Card title="Realtime — miasta" flush>
              {data.realtime.length === 0 ? (
                <EmptyState title="Brak danych realtime" />
              ) : (
                <DataTable
                  columns={rtCols}
                  rows={data.realtime}
                  rowKey={(r) => r.city}
                  defaultSort={{ key: "positions", dir: "desc" }}
                />
              )}
            </Card>

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
