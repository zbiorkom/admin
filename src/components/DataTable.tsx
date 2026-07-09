import { useMemo, useState, type ReactNode } from "react";
import "./DataTable.less";

export interface Column<T> {
  key: string;
  header: ReactNode;
  align?: "left" | "right" | "center";
  /** CSS width, e.g. "120px" or "20%". */
  width?: string;
  render?: (row: T, index: number) => ReactNode;
  /** Provide to make the column sortable. */
  sortValue?: (row: T) => number | string;
  /** Tabular-nums monospace cell (numbers/ids). */
  mono?: boolean;
}

export interface DataTableProps<T> {
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T, index: number) => string | number;
  defaultSort?: { key: string; dir: "asc" | "desc" };
  onRowClick?: (row: T) => void;
  /** Highlight predicate for e.g. failing rows. */
  rowClass?: (row: T) => string | undefined;
  compact?: boolean;
  stickyHeader?: boolean;
  emptyLabel?: string;
}

export function DataTable<T>({
  columns,
  rows,
  rowKey,
  defaultSort,
  onRowClick,
  rowClass,
  compact,
  stickyHeader = true,
  emptyLabel = "Brak wierszy",
}: DataTableProps<T>) {
  const [sort, setSort] = useState<{ key: string; dir: "asc" | "desc" } | null>(
    defaultSort ?? null,
  );

  const sorted = useMemo(() => {
    if (!sort) return rows;
    const col = columns.find((c) => c.key === sort.key);
    if (!col?.sortValue) return rows;
    const getter = col.sortValue;
    const mul = sort.dir === "asc" ? 1 : -1;
    return [...rows].sort((a, b) => {
      const va = getter(a);
      const vb = getter(b);
      if (va < vb) return -1 * mul;
      if (va > vb) return 1 * mul;
      return 0;
    });
  }, [rows, sort, columns]);

  const toggleSort = (col: Column<T>) => {
    if (!col.sortValue) return;
    setSort((prev) => {
      if (prev?.key !== col.key) return { key: col.key, dir: "desc" };
      if (prev.dir === "desc") return { key: col.key, dir: "asc" };
      return null;
    });
  };

  return (
    <div className="dtable-wrap">
      <table className={`dtable${compact ? " dtable--compact" : ""}`}>
        <thead className={stickyHeader ? "dtable--sticky" : undefined}>
          <tr>
            {columns.map((col) => {
              const active = sort?.key === col.key;
              return (
                <th
                  key={col.key}
                  style={{ width: col.width, textAlign: col.align ?? "left" }}
                  className={[
                    col.sortValue ? "dtable__sortable" : "",
                    active ? "dtable__sorted" : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  onClick={() => toggleSort(col)}
                  aria-sort={
                    active ? (sort!.dir === "asc" ? "ascending" : "descending") : undefined
                  }
                >
                  <span className="dtable__th-inner">
                    {col.header}
                    {col.sortValue && (
                      <span className="dtable__caret">
                        {active ? (sort!.dir === "asc" ? "▲" : "▼") : "⇅"}
                      </span>
                    )}
                  </span>
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {sorted.length === 0 ? (
            <tr className="dtable__empty">
              <td colSpan={columns.length}>{emptyLabel}</td>
            </tr>
          ) : (
            sorted.map((row, i) => (
              <tr
                key={rowKey(row, i)}
                className={rowClass?.(row)}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                data-clickable={onRowClick ? "" : undefined}
              >
                {columns.map((col) => (
                  <td
                    key={col.key}
                    style={{ textAlign: col.align ?? "left" }}
                    className={col.mono ? "dtable__mono" : undefined}
                  >
                    {col.render ? col.render(row, i) : (row as Record<string, ReactNode>)[col.key]}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
