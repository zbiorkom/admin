import { useMemo } from "react";
import { metricsApi } from "../api/client";
import type { Range, WorkerEvent } from "../api/types";
import { useApi } from "../hooks/useApi";
import { useStickyState } from "../hooks/useStickyState";
import { tsToUnix, tsToMs, fmtInt, fmtNum, fmtPct, fmtBytes, fmtMs, fmtDateTime } from "../lib/format";
import { SERIES } from "../theme/palette";
import { Async, EmptyState } from "../components/States";
import { Card } from "../components/Card";
import { StatTile, type StatStatus } from "../components/StatTile";
import { DataTable, type Column } from "../components/DataTable";
import { RangeSelector } from "../components/RangeSelector";
import { UPlotChart } from "../components/UPlotChart";
import { LastUpdated, RefreshButton } from "../components/Toolbar";
import "./Workers.less";

/** CPU load thresholds: a single worker can exceed 100% across cores. */
function cpuStatus(v: number | null): StatStatus {
  if (v == null) return "neutral";
  if (v > 150) return "critical";
  if (v > 80) return "warning";
  return "good";
}

/** Last non-null sample in an axis-aligned series (most recent bucket). */
function lastVal(arr: (number | null)[]): number | null {
  for (let i = arr.length - 1; i >= 0; i--) {
    const v = arr[i];
    if (v != null) return v;
  }
  return null;
}

interface WorkerChart {
  labels: string[];
  colors: string[];
  data: (number | null)[][];
  shown: number;
  total: number;
}

export function Workers() {
  const [range, setRange] = useStickyState<Range>("workers.range", "24h");

  const res = useApi(() => metricsApi.workers(range), [range]);
  const eventsRes = useApi(() => metricsApi.workerEvents(range), [range]);

  const model = useMemo(() => {
    const rows = res.data ?? [];

    // Unique workers, sorted → stable color slot follows an entity everywhere.
    const workers = Array.from(new Set(rows.map((r) => r.worker))).sort();
    const colorOf = new Map<string, string>();
    workers.forEach((w, i) => colorOf.set(w, SERIES[i % SERIES.length]));

    // Shared union of buckets as the x axis (unix seconds, ascending).
    const bucketSet = new Set<number>();
    for (const r of rows) bucketSet.add(tsToUnix(r.bucket));
    const x = Array.from(bucketSet).sort((a, b) => a - b);
    const xIndex = new Map<number, number>();
    x.forEach((t, i) => xIndex.set(t, i));

    // Per-worker arrays aligned to x (null where that worker has no sample).
    // heap is the only per-worker memory signal; ram/swap/sab are process-wide.
    interface Slot {
      cpu: (number | null)[];
      heap: (number | null)[];
      lag: (number | null)[];
    }
    const byWorker = new Map<string, Slot>();
    for (const w of workers) {
      byWorker.set(w, {
        cpu: new Array<number | null>(x.length).fill(null),
        heap: new Array<number | null>(x.length).fill(null),
        lag: new Array<number | null>(x.length).fill(null),
      });
    }

    // Process-wide memory series (reported only by role "main").
    const ram = new Array<number | null>(x.length).fill(null);
    const swap = new Array<number | null>(x.length).fill(null);
    const sab = new Array<number | null>(x.length).fill(null);

    for (const r of rows) {
      const i = xIndex.get(tsToUnix(r.bucket));
      if (i == null) continue;
      const slot = byWorker.get(r.worker);
      if (slot) {
        slot.cpu[i] = r.cpu_pct;
        slot.heap[i] = r.heap_bytes;
        slot.lag[i] = r.event_loop_lag_ms;
      }
      if (r.role === "main") {
        ram[i] = r.ram_bytes;
        swap[i] = r.swap_bytes;
        sab[i] = r.sab_bytes;
      }
    }

    // Top-8 workers by peak value for one metric (cap at 8 categorical colors).
    const topChart = (field: keyof Slot): WorkerChart => {
      const withPeak = workers
        .map((w) => {
          const arr = byWorker.get(w)![field];
          let peak = -Infinity;
          for (const v of arr) if (v != null && v > peak) peak = v;
          return { w, peak, arr };
        })
        .filter((e) => e.peak > -Infinity);
      withPeak.sort((a, b) => b.peak - a.peak);
      const top = withPeak.slice(0, 8);
      return {
        labels: top.map((e) => e.w),
        colors: top.map((e) => colorOf.get(e.w)!),
        data: top.map((e) => e.arr),
        shown: top.length,
        total: withPeak.length,
      };
    };

    const latestCpu = workers
      .map((w) => lastVal(byWorker.get(w)!.cpu))
      .filter((v): v is number => v != null);
    const maxCpu = latestCpu.length ? Math.max(...latestCpu) : null;

    return {
      x,
      workerCount: workers.length,
      maxCpu,
      ramProc: lastVal(ram),
      swapProc: lastVal(swap),
      sabProc: lastVal(sab),
      hasProcMem: ram.some((v) => v != null),
      procMem: [ram, swap, sab] as (number | null)[][],
      cpu: topChart("cpu"),
      heap: topChart("heap"),
      lag: topChart("lag"),
    };
  }, [res.data]);

  const events = eventsRes.data ?? [];
  const crashCount = events.length;

  const eventColumns: Column<WorkerEvent>[] = [
    {
      key: "ts",
      header: "Czas",
      width: "180px",
      mono: true,
      sortValue: (r) => tsToMs(r.ts),
      render: (r) => fmtDateTime(r.ts),
    },
    { key: "role", header: "Rola", width: "120px", sortValue: (r) => r.role },
    { key: "label", header: "Worker", mono: true, sortValue: (r) => r.label },
    {
      key: "event",
      header: "Zdarzenie",
      align: "right",
      width: "140px",
      sortValue: (r) => r.event,
      render: (r) => <span className="pill pill--critical">{r.event}</span>,
    },
  ];

  return (
    <div className="view">
      <div className="toolbar">
        <div className="toolbar__group">
          <RangeSelector value={range} onChange={setRange} />
        </div>
        <div className="toolbar__group toolbar__spacer updated">
          <LastUpdated at={res.lastUpdated} />
          <RefreshButton reloading={res.reloading} onClick={res.reload} />
        </div>
      </div>

      <Async result={res} isEmpty={(d) => d.length === 0}>
        {() => (
          <div className="stack">
            <div className="grid" style={{ ["--min" as string]: "210px" }}>
              <StatTile label="Workery" value={fmtInt(model.workerCount)} hint="unikalne wątki" />
              <StatTile
                label="RAM procesu"
                value={fmtBytes(model.ramProc)}
                hint="PSS całości (main)"
              />
              <StatTile
                label="SAB"
                value={fmtBytes(model.sabProc)}
                hint={`swap ${fmtBytes(model.swapProc)}`}
              />
              <StatTile
                label="Maks. CPU"
                value={fmtNum(model.maxCpu, 1)}
                unit="%"
                status={cpuStatus(model.maxCpu)}
                hint="ostatnie próbki"
              />
              <StatTile
                label="Crashe"
                value={fmtInt(crashCount)}
                hint="zdarzenia w oknie"
                status={crashCount > 0 ? "critical" : "good"}
              />
            </div>

            <div className="stack">
              <Card title="CPU (%) per worker" subtitle="Zużycie CPU każdego workera">
                <UPlotChart
                  x={model.x}
                  data={model.cpu.data}
                  series={model.cpu.labels.map((label, i) => ({
                    label,
                    color: model.cpu.colors[i],
                    fmt: (v) => fmtPct(v, 1),
                  }))}
                  yFmt={(v) => `${fmtNum(v, 0)}%`}
                  zeroBased
                />
                {model.cpu.total > model.cpu.shown && (
                  <p className="workers__note">
                    pokazano {model.cpu.shown} z {model.cpu.total} workerów
                  </p>
                )}
              </Card>

              <Card
                title="Sterta JS (heap) per worker"
                subtitle="Jedyny sensowny sygnał „który worker puchnie” — heap każdego workera"
              >
                <UPlotChart
                  x={model.x}
                  data={model.heap.data}
                  series={model.heap.labels.map((label, i) => ({
                    label,
                    color: model.heap.colors[i],
                    fmt: (v) => fmtBytes(v),
                  }))}
                  yFmt={(v) => fmtBytes(v)}
                  zeroBased
                />
                {model.heap.total > model.heap.shown && (
                  <p className="workers__note">
                    pokazano {model.heap.shown} z {model.heap.total} workerów
                  </p>
                )}
              </Card>

              {model.hasProcMem && (
                <Card
                  title="Pamięć procesu (main)"
                  subtitle="PSS / SwapPss / SharedArrayBuffer całego procesu — raportowane przez main"
                >
                  <UPlotChart
                    x={model.x}
                    data={model.procMem}
                    series={[
                      { label: "RAM (PSS)", color: SERIES[0], fill: true, fmt: (v) => fmtBytes(v) },
                      { label: "Swap", color: SERIES[2], fmt: (v) => fmtBytes(v) },
                      { label: "SAB", color: SERIES[4], fmt: (v) => fmtBytes(v) },
                    ]}
                    yFmt={(v) => fmtBytes(v)}
                    zeroBased
                  />
                </Card>
              )}

              <Card title="Event loop lag (ms) per worker" subtitle="Opóźnienie pętli zdarzeń">
                <UPlotChart
                  x={model.x}
                  data={model.lag.data}
                  series={model.lag.labels.map((label, i) => ({
                    label,
                    color: model.lag.colors[i],
                    fmt: (v) => fmtMs(v),
                  }))}
                  yFmt={(v) => fmtMs(v)}
                  zeroBased
                />
                {model.lag.total > model.lag.shown && (
                  <p className="workers__note">
                    pokazano {model.lag.shown} z {model.lag.total} workerów
                  </p>
                )}
              </Card>

              <Card title="Zdarzenia workerów" subtitle="Crashe i restarty procesów" flush>
                {events.length === 0 ? (
                  <EmptyState title="Brak zdarzeń" hint="W wybranym oknie nie odnotowano zdarzeń workerów." />
                ) : (
                  <DataTable
                    columns={eventColumns}
                    rows={events}
                    rowKey={(r, i) => `${r.ts}-${r.label}-${i}`}
                    defaultSort={{ key: "ts", dir: "desc" }}
                    compact
                  />
                )}
              </Card>
            </div>
          </div>
        )}
      </Async>
    </div>
  );
}
