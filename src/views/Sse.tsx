import { useMemo } from "react";
import { metricsApi } from "../api/client";
import type { Range } from "../api/types";
import { useApi } from "../hooks/useApi";
import { useStickyState } from "../hooks/useStickyState";
import { tsToUnix, fmtInt, fmtNum, fmtMs } from "../lib/format";
import { SERIES } from "../theme/palette";
import { Async } from "../components/States";
import { Card } from "../components/Card";
import { StatTile } from "../components/StatTile";
import { RangeSelector } from "../components/RangeSelector";
import { CitySelector, ALL_CITIES } from "../components/CitySelector";
import { UPlotChart } from "../components/UPlotChart";
import { LastUpdated, RefreshButton } from "../components/Toolbar";
import "./Sse.less";

export function Sse() {
  const [range, setRange] = useStickyState<Range>("sse.range", "24h");
  const [city, setCity] = useStickyState<string>("sse.city", "");

  // Refresh faster on the short windows; leave long windows manual.
  const refreshMs = range === "1h" ? 20000 : range === "6h" ? 60000 : undefined;

  const res = useApi(
    () => metricsApi.sse(city === ALL_CITIES ? undefined : city, range),
    [city, range],
    { refreshMs },
  );

  // Two independent bucket axes: `active` and `throughput` each carry their own.
  const s = useMemo(() => {
    const active = res.data?.active ?? [];
    const throughput = res.data?.throughput ?? [];
    return {
      activeX: active.map((p) => tsToUnix(p.bucket)),
      connections: active.map((p) => p.connections),
      throughputX: throughput.map((p) => tsToUnix(p.bucket)),
      messages: throughput.map((p) => p.messages),
      closed: throughput.map((p) => p.closed),
      avgDuration: throughput.map((p) => p.avg_duration_ms),
    };
  }, [res.data]);

  const active = res.data?.active ?? [];
  const throughput = res.data?.throughput ?? [];
  const lastConnections = active[active.length - 1]?.connections ?? null;
  const totalMessages = throughput.reduce((a, p) => a + p.messages, 0);
  const totalClosed = throughput.reduce((a, p) => a + p.closed, 0);
  const avgDurationMean =
    throughput.length > 0
      ? throughput.reduce((a, p) => a + p.avg_duration_ms, 0) / throughput.length
      : null;

  return (
    <div className="view">
      <div className="toolbar">
        <div className="toolbar__group">
          <CitySelector value={city} onChange={setCity} allowAll />
          <RangeSelector value={range} onChange={setRange} />
        </div>
        <div className="toolbar__group toolbar__spacer updated">
          <LastUpdated at={res.lastUpdated} />
          <RefreshButton reloading={res.reloading} onClick={res.reload} />
        </div>
      </div>

      <Async
        result={res}
        isEmpty={(d) => d.active.length === 0 && d.throughput.length === 0}
      >
        {() => (
          <div className="stack">
            <div className="grid" style={{ ["--min" as string]: "210px" }}>
              <StatTile
                label="Aktywne połączenia"
                value={fmtNum(lastConnections, 0)}
                hint="ostatni cykl"
                spark={s.connections}
                sparkColor={SERIES[0]}
              />
              <StatTile
                label="Wiadomości"
                value={fmtInt(totalMessages)}
                hint="suma w oknie"
                spark={s.messages}
                sparkColor={SERIES[1]}
              />
              <StatTile
                label="Zamknięte"
                value={fmtInt(totalClosed)}
                hint="suma w oknie"
                spark={s.closed}
                sparkColor={SERIES[7]}
              />
              <StatTile
                label="Śr. czas życia"
                value={fmtMs(avgDurationMean)}
                hint="średnia w oknie"
                spark={s.avgDuration}
                sparkColor={SERIES[4]}
              />
            </div>

            <Card
              title="Aktywne połączenia"
              subtitle="Liczba otwartych strumieni SSE w każdym oknie"
            >
              <UPlotChart
                x={s.activeX}
                data={[s.connections]}
                series={[
                  {
                    label: "Połączenia",
                    color: SERIES[0],
                    fill: true,
                    fmt: (v) => fmtInt(v),
                  },
                ]}
                yFmt={(v) => fmtInt(v)}
                zeroBased
                height={280}
              />
            </Card>

            <div className="grid" style={{ ["--min" as string]: "420px" }}>
              <Card
                title="Wiadomości SSE"
                subtitle="Zdarzenia wysłane do klientów"
              >
                <UPlotChart
                  x={s.throughputX}
                  data={[s.messages]}
                  series={[
                    {
                      label: "Wiadomości",
                      color: SERIES[1],
                      fill: true,
                      fmt: (v) => fmtInt(v),
                    },
                  ]}
                  yFmt={(v) => fmtInt(v)}
                  zeroBased
                  height={240}
                />
              </Card>

              <Card
                title="Zamknięte połączenia"
                subtitle="Strumienie zakończone w każdym oknie"
              >
                <UPlotChart
                  x={s.throughputX}
                  data={[s.closed]}
                  series={[
                    {
                      label: "Zamknięte",
                      color: SERIES[7],
                      fmt: (v) => fmtInt(v),
                    },
                  ]}
                  yFmt={(v) => fmtInt(v)}
                  zeroBased
                  height={240}
                />
              </Card>
            </div>

            <Card
              title="Średni czas życia połączenia"
              subtitle="Średni czas trwania zamkniętych strumieni"
            >
              <UPlotChart
                x={s.throughputX}
                data={[s.avgDuration]}
                series={[
                  {
                    label: "Śr. czas życia",
                    color: SERIES[4],
                    fmt: (v) => fmtMs(v),
                  },
                ]}
                yFmt={(v) => fmtMs(v)}
                zeroBased
                height={240}
              />
            </Card>
          </div>
        )}
      </Async>
    </div>
  );
}
