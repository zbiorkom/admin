import { IconRefresh } from "./icons";
import { Spinner } from "./States";
import "./Toolbar.less";

/** "Odświeżono: 12:34:56" from an epoch-ms timestamp. */
export function LastUpdated({ at }: { at: number | null }) {
  if (at == null) return null;
  const time = new Date(at).toLocaleTimeString("pl-PL", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  return <span className="last-updated">Odświeżono: {time}</span>;
}

/** Manual refresh button that shows a spinner while a background reload runs. */
export function RefreshButton({
  reloading,
  onClick,
}: {
  reloading: boolean;
  onClick: () => void;
}) {
  return (
    <button
      className="btn btn--ghost refresh-btn"
      onClick={onClick}
      disabled={reloading}
      title="Odśwież"
      aria-label="Odśwież"
    >
      {reloading ? <Spinner size={14} /> : <IconRefresh />}
      <span className="refresh-btn__label">Odśwież</span>
    </button>
  );
}

/** Small green "na żywo" indicator for auto-refreshing views. */
export function LiveDot({ label = "na żywo" }: { label?: string }) {
  return (
    <span className="live-dot">
      <span className="live-dot__pulse" />
      {label}
    </span>
  );
}
