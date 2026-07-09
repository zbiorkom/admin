import { useMemo } from "react";
import { metricsApi } from "../api/client";
import type { CompileRow } from "../api/types";
import { useApi } from "../hooks/useApi";
import { tsToMs, fmtInt, fmtMs, fmtRelative, fmtDateTime, cityLabel } from "../lib/format";
import { Async } from "../components/States";
import { Card } from "../components/Card";
import { StatTile } from "../components/StatTile";
import { DataTable, type Column } from "../components/DataTable";
import { LastUpdated, RefreshButton, LiveDot } from "../components/Toolbar";
import "./Compile.less";

export function Compile() {
  const res = useApi(() => metricsApi.compile(), [], { refreshMs: 60000 });

  // Memoized so the derived useMemo hooks below keep stable deps between renders.
  const rows = useMemo(() => res.data ?? [], [res.data]);

  const latest = useMemo(
    () =>
      rows.reduce<CompileRow | null>(
        (acc, r) => (acc == null || tsToMs(r.ts) > tsToMs(acc.ts) ? r : acc),
        null,
      ),
    [rows],
  );

  const meanDuration = useMemo(
    () => (rows.length ? rows.reduce((a, r) => a + r.duration_ms, 0) / rows.length : null),
    [rows],
  );

  const totalTrips = useMemo(() => rows.reduce((a, r) => a + r.trips, 0), [rows]);

  const maxTrips = useMemo(() => rows.reduce((m, r) => Math.max(m, r.trips), 0), [rows]);

  // One card per city — keep only the most recent compilation of each.
  const perCity = useMemo(() => {
    const byCity = new Map<string, CompileRow>();
    for (const r of rows) {
      const prev = byCity.get(r.city);
      if (!prev || tsToMs(r.ts) > tsToMs(prev.ts)) byCity.set(r.city, r);
    }
    return [...byCity.values()].sort((a, b) => tsToMs(b.ts) - tsToMs(a.ts));
  }, [rows]);

  const columns: Column<CompileRow>[] = [
    {
      key: "city",
      header: "Miasto",
      sortValue: (r) => r.city,
      render: (r) => cityLabel(r.city),
    },
    {
      key: "ts",
      header: "Kiedy",
      sortValue: (r) => tsToMs(r.ts),
      render: (r) => <span title={fmtDateTime(r.ts)}>{fmtRelative(r.ts)}</span>,
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
      key: "stops",
      header: "Przystanki",
      align: "right",
      mono: true,
      sortValue: (r) => r.stops,
      render: (r) => fmtInt(r.stops),
    },
    {
      key: "routes",
      header: "Linie",
      align: "right",
      mono: true,
      sortValue: (r) => r.routes,
      render: (r) => fmtInt(r.routes),
    },
    {
      key: "trips",
      header: "Tripy",
      align: "right",
      mono: true,
      sortValue: (r) => r.trips,
      render: (r) => (
        <span className="size-cell">
          <span className="size-cell__val">{fmtInt(r.trips)}</span>
          <span
            className="size-bar"
            style={{ ["--w" as string]: `${maxTrips ? (r.trips / maxTrips) * 100 : 0}%` }}
          />
        </span>
      ),
    },
    {
      key: "shapes",
      header: "Kształty",
      align: "right",
      mono: true,
      sortValue: (r) => r.shapes,
      render: (r) => fmtInt(r.shapes),
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

      <Async result={res} isEmpty={(d) => d.length === 0}>
        {(data) => (
          <div className="stack">
            <div className="grid" style={{ ["--min" as string]: "210px" }}>
              <StatTile label="Miasta" value={fmtInt(data.length)} hint="skompilowane feedy" />
              <StatTile
                label="Ostatnia"
                value={latest ? cityLabel(latest.city) : "—"}
                hint={latest ? fmtRelative(latest.ts) : undefined}
                status="good"
              />
              <StatTile label="Śr. czas" value={fmtMs(meanDuration)} hint="na kompilację" />
              <StatTile label="Tripy łącznie" value={fmtInt(totalTrips)} hint="we wszystkich miastach" />
            </div>

            <Card title="Kompilacje GTFS" subtitle="Ostatnia kompilacja rozkładu dla każdego miasta" flush>
              <DataTable
                columns={columns}
                rows={data}
                rowKey={(r) => `${r.city}-${r.ts}`}
                defaultSort={{ key: "ts", dir: "desc" }}
              />
            </Card>

            <div className="grid" style={{ ["--min" as string]: "260px" }}>
              {perCity.map((r) => (
                <Card key={r.city} title={cityLabel(r.city)} className="compile-city">
                  <div className="compile-city__stats">
                    <div className="compile-city__stat">
                      <span className="compile-city__label">Przystanki</span>
                      <span className="compile-city__num">{fmtInt(r.stops)}</span>
                    </div>
                    <div className="compile-city__stat">
                      <span className="compile-city__label">Linie</span>
                      <span className="compile-city__num">{fmtInt(r.routes)}</span>
                    </div>
                    <div className="compile-city__stat">
                      <span className="compile-city__label">Tripy</span>
                      <span className="compile-city__num">{fmtInt(r.trips)}</span>
                    </div>
                    <div className="compile-city__stat">
                      <span className="compile-city__label">Kształty</span>
                      <span className="compile-city__num">{fmtInt(r.shapes)}</span>
                    </div>
                  </div>
                  <div className="compile-city__foot">
                    <span className="pill">{fmtMs(r.duration_ms)}</span>
                    <span className="meta" title={fmtDateTime(r.ts)}>
                      {fmtRelative(r.ts)}
                    </span>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}
      </Async>
    </div>
  );
}
