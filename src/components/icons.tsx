import type { SVGProps } from "react";

// Minimal 16px line icons (stroke = currentColor) — no icon-font dependency.

type P = SVGProps<SVGSVGElement>;

function Svg({ children, ...p }: P & { children: React.ReactNode }) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      {...p}
    >
      {children}
    </svg>
  );
}

export const IconGauge = (p: P) => (
  <Svg {...p}>
    <path d="M12 14l4-4" />
    <path d="M3.5 16a9 9 0 1 1 17 0" />
    <circle cx="12" cy="14" r="1.6" />
  </Svg>
);

export const IconActivity = (p: P) => (
  <Svg {...p}>
    <path d="M3 12h4l3 8 4-16 3 8h4" />
  </Svg>
);

export const IconFeed = (p: P) => (
  <Svg {...p}>
    <path d="M4 11a9 9 0 0 1 9 9" />
    <path d="M4 4a16 16 0 0 1 16 16" />
    <circle cx="5" cy="19" r="1.4" />
  </Svg>
);

export const IconRoute = (p: P) => (
  <Svg {...p}>
    <circle cx="6" cy="19" r="2.2" />
    <circle cx="18" cy="5" r="2.2" />
    <path d="M8 19h6a3 3 0 0 0 3-3V9" />
  </Svg>
);

export const IconPackage = (p: P) => (
  <Svg {...p}>
    <path d="M12 3l8 4.5v9L12 21l-8-4.5v-9L12 3z" />
    <path d="M4 7.5l8 4.5 8-4.5M12 12v9" />
  </Svg>
);

export const IconBroadcast = (p: P) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="2" />
    <path d="M7.5 7.5a6 6 0 0 0 0 9M16.5 7.5a6 6 0 0 1 0 9" />
    <path d="M4.5 4.5a10 10 0 0 0 0 15M19.5 4.5a10 10 0 0 1 0 15" />
  </Svg>
);

export const IconCpu = (p: P) => (
  <Svg {...p}>
    <rect x="6" y="6" width="12" height="12" rx="2" />
    <rect x="9.5" y="9.5" width="5" height="5" rx="1" />
    <path d="M9 3v2M15 3v2M9 19v2M15 19v2M3 9h2M3 15h2M19 9h2M19 15h2" />
  </Svg>
);

export const IconLogout = (p: P) => (
  <Svg {...p}>
    <path d="M9 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h3" />
    <path d="M15 16l4-4-4-4M19 12H9" />
  </Svg>
);

export const IconMenu = (p: P) => (
  <Svg {...p}>
    <path d="M4 6h16M4 12h16M4 18h16" />
  </Svg>
);

export const IconClose = (p: P) => (
  <Svg {...p}>
    <path d="M6 6l12 12M18 6L6 18" />
  </Svg>
);

export const IconRefresh = (p: P) => (
  <Svg {...p}>
    <path d="M20 11a8 8 0 1 0-.5 4" />
    <path d="M20 4v5h-5" />
  </Svg>
);

export const IconBus = (p: P) => (
  <Svg {...p}>
    <rect x="4" y="4" width="16" height="12" rx="2" />
    <path d="M4 11h16M8 16v2M16 16v2" />
    <circle cx="8" cy="13.5" r="0.6" fill="currentColor" />
    <circle cx="16" cy="13.5" r="0.6" fill="currentColor" />
  </Svg>
);
