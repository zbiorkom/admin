import type { ComponentType, SVGProps } from "react";
import {
  IconGauge,
  IconActivity,
  IconFeed,
  IconRoute,
  IconPackage,
  IconBroadcast,
  IconCpu,
} from "./components/icons";

export interface NavItem {
  to: string;
  label: string;
  /** Longer description shown in the topbar under the section title. */
  desc: string;
  Icon: ComponentType<SVGProps<SVGSVGElement>>;
}

export const NAV: NavItem[] = [
  {
    to: "/overview",
    label: "Przegląd",
    desc: "Migawka stanu systemu — realtime, kompilacje, workery, zdarzenia.",
    Icon: IconGauge,
  },
  {
    to: "/realtime",
    label: "Realtime",
    desc: "Pozycje pojazdów, dopasowania i konflikty w czasie — per miasto.",
    Icon: IconActivity,
  },
  {
    to: "/feeds",
    label: "Feedy",
    desc: "Czasy i awaryjność poszczególnych feedów — per miasto.",
    Icon: IconFeed,
  },
  {
    to: "/router",
    label: "Router",
    desc: "Planner RAPTOR — przepustowość, percentyle, mapa zapytań OD.",
    Icon: IconRoute,
  },
  {
    to: "/compile",
    label: "Kompilacje",
    desc: "Ostatnie kompilacje GTFS per miasto i rozmiar rozkładów.",
    Icon: IconPackage,
  },
  {
    to: "/sse",
    label: "SSE",
    desc: "Strumienie SSE — aktywne połączenia i przepustowość wiadomości.",
    Icon: IconBroadcast,
  },
  {
    to: "/workers",
    label: "Workery",
    desc: "Zużycie CPU / pamięci per worker oraz crashe i restarty.",
    Icon: IconCpu,
  },
];
