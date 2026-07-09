import { useMemo } from "react";
import { metricsApi } from "../api/client";
import type { FeedRow, Range } from "../api/types";
import { useApi } from "../hooks/useApi";
import { useStickyState } from "../hooks/useStickyState";
import { fmtInt, fmtMs, fmtPct } from "../lib/format";
import { Async } from "../components/States";
import { Card } from "../components/Card";
import { StatTile, type StatStatus } from "../components/StatTile";
import { DataTable, type Column } from "../components/DataTable";
import { RangeSelector } from "../components/RangeSelector";
import { CitySelector } from "../components/CitySelector";
import { LastUpdated, RefreshButton } from "../components/Toolbar";
import "./Feeds.less";

/** Fail rate (0–100) for a row; 0 when the feed had no runs. */
function failRate(row: FeedRow): number {
  return row.total > 0 ? (row.failures / row.total) * 100 : 0;
}

/** good <1%, warning <5%, critical otherwise. */
function rateStatus(pct: number): StatStatus {
  if (pct < 1) return "good";
  if (pct < 5) return "warning";
  return "critical";
}

export function Feeds() {
  const [range, setRange] = useStickyState<Range>("feeds.range", "24h");
  const [city, setCity] = useStickyState<string>("feeds.city", "");

  const res = useApi(() => metricsApi.feeds(city, range), [city, range], {
    enabled: city !== "",
  });

  const rows = useMemo(() => res.data ?? [], [res.data]);

  const agg = useMemo(() => {
    const totalRuns = rows.reduce((a, r) => a + r.total, 0);
    const totalFailures = rows.reduce((a, r) => a + r.failures, 0);
    const globalMax = rows.reduce((a, r) => Math.max(a, r.max_ms), 0);
    const worst = rows.reduce<FeedRow | null>((best, r) => {
      if (!best) return r;
      return failRate(r) > failRate(best) ? r : best;
    }, null);
    const failPct = totalRuns > 0 ? (totalFailures / totalRuns) * 100 : 0;
    return { totalRuns, totalFailures, globalMax, worst, failPct };
  }, [rows]);

  const columns: Column<FeedRow>[] = [
    {
      key: "feed",
      header: "Feed",
      mono: true,
      sortValue: (r) => r.feed,
    },
    {
      key: "avg_ms",
      header: "Śr. czas",
      align: "right",
      mono: true,
      render: (r) => fmtMs(r.avg_ms),
      sortValue: (r) => r.avg_ms ?? -1,
    },
    {
      key: "max_ms",
      header: "Maks. czas",
      align: "right",
      mono: true,
      render: (r) => fmtMs(r.max_ms),
      sortValue: (r) => r.max_ms,
    },
    {
      key: "bar",
      header: "Czas (avg/max)",
      width: "180px",
      render: (r) => {
        const max = agg.globalMax || 1;
        const trackPct = (r.max_ms / max) * 100;
        const fillPct = ((r.avg_ms ?? 0) / max) * 100;
        return (
          <div
            className="feed-bar"
            title={`avg ${fmtMs(r.avg_ms)} / max ${fmtMs(r.max_ms)}`}
          >
            <div
              className="feed-bar__track"
              style={{ ["--w" as string]: `${trackPct}%` }}
            />
            <div
              className="feed-bar__fill"
              style={{ ["--w" as string]: `${fillPct}%` }}
            />
          </div>
        );
      },
    },
    {
      key: "failures",
      header: "Błędy",
      align: "right",
      mono: true,
      render: (r) => fmtInt(r.failures),
      sortValue: (r) => r.failures,
    },
    {
      key: "total",
      header: "Przebiegi",
      align: "right",
      mono: true,
      render: (r) => fmtInt(r.total),
      sortValue: (r) => r.total,
    },
    {
      key: "fail_rate",
      header: "Fail rate",
      align: "right",
      render: (r) => {
        const pct = failRate(r);
        return <span className={`pill pill--${rateStatus(pct)}`}>{fmtPct(pct)}</span>;
      },
      sortValue: (r) => (r.total > 0 ? r.failures / r.total : 0),
    },
  ];

  return (
    <div className="view">
      <div className="toolbar">
        <div className="toolbar__group">
          <CitySelector value={city} onChange={setCity} />
          <RangeSelector value={range} onChange={setRange} />
        </div>
        <div className="toolbar__group toolbar__spacer updated">
          <LastUpdated at={res.lastUpdated} />
          <RefreshButton reloading={res.reloading} onClick={res.reload} />
        </div>
      </div>

      {city === "" ? null : (
        <Async result={res} isEmpty={(d) => d.length === 0}>
          {(data) => (
            <div className="stack">
              <div className="grid" style={{ ["--min" as string]: "210px" }}>
                <StatTile label="Przebiegi" value={fmtInt(agg.totalRuns)} hint="suma w oknie" />
                <StatTile
                  label="Błędy"
                  value={fmtInt(agg.totalFailures)}
                  hint="suma w oknie"
                  status={agg.totalFailures > 0 ? "critical" : "good"}
                />
                <StatTile
                  label="Fail rate"
                  value={fmtPct(agg.failPct)}
                  hint="błędy / przebiegi"
                  status={rateStatus(agg.failPct)}
                />
                <StatTile label="Feedy" value={fmtInt(data.length)} hint="aktywne funkcje" />
                <StatTile
                  label="Najgorszy feed"
                  value={agg.worst?.feed ?? "—"}
                  hint={agg.worst ? fmtPct(failRate(agg.worst)) : undefined}
                  status={agg.worst ? rateStatus(failRate(agg.worst)) : "neutral"}
                />
              </div>

              <Card title="Feedy" subtitle="Czasy i skuteczność funkcji feed w oknie" flush>
                <DataTable
                  columns={columns}
                  rows={data}
                  rowKey={(r) => r.feed}
                  defaultSort={{ key: "total", dir: "desc" }}
                  rowClass={(r) => {
                    const pct = failRate(r);
                    if (pct >= 5) return "row-danger";
                    if (pct >= 1) return "row-warn";
                    return undefined;
                  }}
                />
              </Card>
            </div>
          )}
        </Async>
      )}
    </div>
  );
}
