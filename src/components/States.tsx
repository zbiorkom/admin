import type { ReactNode } from "react";
import type { ApiResult } from "../hooks/useApi";
import { describeError } from "../api/client";
import "./States.less";

export function Spinner({ size = 20 }: { size?: number }) {
  return (
    <span
      className="spinner"
      style={{ width: size, height: size }}
      role="status"
      aria-label="Ładowanie"
    />
  );
}

export function Loading({ label = "Ładowanie…" }: { label?: string }) {
  return (
    <div className="state-block">
      <Spinner size={26} />
      <p>{label}</p>
    </div>
  );
}

export function EmptyState({
  title = "Brak danych",
  hint = "W wybranym oknie czasowym nie ma jeszcze żadnych metryk.",
  icon = "∅",
}: {
  title?: string;
  hint?: string;
  icon?: ReactNode;
}) {
  return (
    <div className="state-block">
      <div className="state-block__icon">{icon}</div>
      <p className="state-block__title">{title}</p>
      <p>{hint}</p>
    </div>
  );
}

export function ErrorBox({
  error,
  onRetry,
}: {
  error: unknown;
  onRetry?: () => void;
}) {
  return (
    <div className="state-block state-block--error">
      <div className="state-block__icon">⚠</div>
      <p className="state-block__title">Coś poszło nie tak</p>
      <p>{describeError(error)}</p>
      {onRetry && (
        <button className="btn" onClick={onRetry}>
          Spróbuj ponownie
        </button>
      )}
    </div>
  );
}

/**
 * Declarative wrapper around an {@link ApiResult}: renders loading / error /
 * empty states, otherwise calls `children` with the loaded data.
 *
 *   <Async result={r} isEmpty={(d) => d.length === 0}>
 *     {(data) => <Chart data={data} />}
 *   </Async>
 */
export function Async<T>({
  result,
  isEmpty,
  loadingLabel,
  emptyProps,
  children,
}: {
  result: ApiResult<T>;
  isEmpty?: (data: T) => boolean;
  loadingLabel?: string;
  emptyProps?: Parameters<typeof EmptyState>[0];
  children: (data: T) => ReactNode;
}) {
  if (result.loading && result.data == null) {
    return <Loading label={loadingLabel} />;
  }
  if (result.error && result.data == null) {
    return <ErrorBox error={result.error} onRetry={result.reload} />;
  }
  if (result.data == null || (isEmpty && isEmpty(result.data))) {
    return <EmptyState {...emptyProps} />;
  }
  return <>{children(result.data)}</>;
}
