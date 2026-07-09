import { useMemo } from "react";
import { metricsApi } from "../api/client";
import type { Range } from "../api/types";
import { useApi } from "../hooks/useApi";
import { useStickyState } from "../hooks/useStickyState";
import { tsToUnix, fmtInt, fmtPct, fmtNum } from "../lib/format";
import { SERIES, STATUS } from "../theme/palette";
import { Async } from "../components/States";
import { Card } from "../components/Card";
import { StatTile, type StatStatus } from "../components/StatTile";
import { RangeSelector } from "../components/RangeSelector";
import { CitySelector } from "../components/CitySelector";
import { UPlotChart } from "../components/UPlotChart";
import { LastUpdated, RefreshButton } from "../components/Toolbar";
import "./Realtime.less";

function matchStatus(pct: number | null): StatStatus {
  if (pct == null) return "neutral";
  if (pct >= 90) return "good";
  if (pct >= 75) return "warning";
  return "critical";
}

export function Realtime() {
  const [range, setRange] = useStickyState<Range>("rt.range", "24h");
  const [city, setCity] = useStickyState<string>("rt.city", "");

  // Refresh faster on the short windows; leave long windows manual.
  const refreshMs = range === "1h" ? 20000 : range === "6h" ? 60000 : undefined;

  const res = useApi(() => metricsApi.realtime(city, range), [city, range], {
    enabled: city !== "",
    refreshMs,
  });

  // Series aligned to the bucket axis (unix seconds for uPlot).
  const s = useMemo(() => {
    const pts = res.data ?? [];
    return {
      x: pts.map((p) => tsToUnix(p.bucket)),
      positions: pts.map((p) => p.positions),
      matched: pts.map((p) => p.matched),
      ghost: pts.map((p) => p.ghost),
      conflicts: pts.map((p) => p.conflicts),
      matchedPct: pts.map((p) => p.matched_pct),
    };
  }, [res.data]);

  const pts = res.data ?? [];
  const last = pts[pts.length - 1];
  const totalConflicts = pts.reduce((a, p) => a + p.conflicts, 0);

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
          {() => (
            <div className="stack">
              <div className="grid" style={{ ["--min" as string]: "210px" }}>
                <StatTile
                  label="Pozycje"
                  value={fmtInt(last?.positions)}
                  hint="ostatni cykl"
                  spark={s.positions}
                  sparkColor={SERIES[0]}
                />
                <StatTile
                  label="Dopasowane"
                  value={fmtInt(last?.matched)}
                  hint="ostatni cykl"
                  spark={s.matched}
                  sparkColor={SERIES[1]}
                />
                <StatTile
                  label="Skuteczność"
                  value={fmtNum(last?.matched_pct ?? null, 1)}
                  unit="%"
                  status={matchStatus(last?.matched_pct ?? null)}
                  spark={s.matchedPct}
                  sparkColor={STATUS.good}
                />
                <StatTile
                  label="Konflikty"
                  value={fmtInt(totalConflicts)}
                  hint="suma w oknie"
                  status={totalConflicts > 0 ? "warning" : "good"}
                  spark={s.conflicts}
                  sparkColor={SERIES[5]}
                />
              </div>

              <Card
                title="Pozycje i dopasowania"
                subtitle="Średnia liczba pozycji pojazdów i pozycji zmatchowanych do tripu"
              >
                <UPlotChart
                  x={s.x}
                  data={[s.positions, s.matched]}
                  series={[
                    { label: "Pozycje", color: SERIES[0], fill: true, fmt: (v) => fmtNum(v, 1) },
                    { label: "Dopasowane", color: SERIES[1], fill: true, fmt: (v) => fmtNum(v, 1) },
                  ]}
                  yFmt={(v) => fmtInt(v)}
                  zeroBased
                  height={280}
                />
              </Card>

              <div className="grid" style={{ ["--min" as string]: "420px" }}>
                <Card
                  title="Skuteczność dopasowań"
                  subtitle="100 × dopasowane / pozycje"
                >
                  <UPlotChart
                    x={s.x}
                    data={[s.matchedPct]}
                    series={[
                      {
                        label: "Skuteczność",
                        color: STATUS.good,
                        fill: true,
                        fmt: (v) => fmtPct(v, 1),
                      },
                    ]}
                    yFmt={(v) => fmtPct(v, 0)}
                    zeroBased
                    height={240}
                  />
                </Card>

                <Card
                  title="Ghost i konflikty"
                  subtitle="Pozycje-ghost oraz konflikty block/trip"
                >
                  <UPlotChart
                    x={s.x}
                    data={[s.ghost, s.conflicts]}
                    series={[
                      { label: "Ghost", color: SERIES[7], fill: true, fmt: (v) => fmtNum(v, 1) },
                      { label: "Konflikty", color: SERIES[5], fmt: (v) => fmtInt(v) },
                    ]}
                    yFmt={(v) => fmtInt(v)}
                    zeroBased
                    height={240}
                  />
                </Card>
              </div>
            </div>
          )}
        </Async>
      )}
    </div>
  );
}
