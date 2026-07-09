import type { ReactNode } from "react";
import "./Card.less";

export interface CardProps {
  title?: ReactNode;
  subtitle?: ReactNode;
  /** Right-aligned controls in the header (e.g. a range selector). */
  actions?: ReactNode;
  footer?: ReactNode;
  /** Remove body padding (e.g. for edge-to-edge tables / charts). */
  flush?: boolean;
  /** Make the card span the full grid width. */
  span?: boolean;
  className?: string;
  children?: ReactNode;
}

export function Card({
  title,
  subtitle,
  actions,
  footer,
  flush,
  span,
  className,
  children,
}: CardProps) {
  const cls = [
    "card",
    flush ? "card--flush" : "",
    span ? "card--span" : "",
    className ?? "",
  ]
    .filter(Boolean)
    .join(" ");

  const hasHeader = title != null || subtitle != null || actions != null;

  return (
    <section className={cls}>
      {hasHeader && (
        <header className="card__head">
          <div className="card__titles">
            {title != null && <h2 className="card__title">{title}</h2>}
            {subtitle != null && <p className="card__subtitle">{subtitle}</p>}
          </div>
          {actions != null && <div className="card__actions">{actions}</div>}
        </header>
      )}
      <div className="card__body">{children}</div>
      {footer != null && <footer className="card__foot">{footer}</footer>}
    </section>
  );
}
