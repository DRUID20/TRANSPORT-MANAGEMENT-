import { cn } from "@/lib/utils";

/**
 * FormSection — the canonical wrapper for any section of a form.
 *
 * Renders as a card with a header (title + optional description + optional
 * eyebrow + optional right-aligned action slot) followed by a content area
 * with consistent vertical rhythm. Use one FormSection per logical group
 * (Customer & route / Product & volume / Rate / Notes…).
 *
 * Layout: the content area is a CSS grid with sensible breakpoints. Pass
 * `columns` to switch between 1, 2, or 3-column field layouts. Individual
 * fields can span columns via `sm:col-span-2` / `lg:col-span-3` on the
 * field wrapper.
 */
export function FormSection({
  eyebrow,
  title,
  description,
  action,
  columns = 2,
  className,
  contentClassName,
  children,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: React.ReactNode;
  columns?: 1 | 2 | 3;
  className?: string;
  contentClassName?: string;
  children: React.ReactNode;
}) {
  const columnClass =
    columns === 1
      ? "grid-cols-1"
      : columns === 2
        ? "grid-cols-1 sm:grid-cols-2"
        : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3";

  return (
    <section className="surface-card animate-content-in overflow-hidden">
      <header
        className={cn(
          "flex flex-wrap items-start justify-between gap-3 border-b border-border px-6 py-5",
          className,
        )}
      >
        <div className="min-w-0">
          {eyebrow && <div className="section-eyebrow mb-1.5">{eyebrow}</div>}
          <h2 className="text-base font-semibold tracking-tight text-fg-primary">
            {title}
          </h2>
          {description && (
            <p className="mt-1 max-w-2xl text-sm text-fg-secondary">{description}</p>
          )}
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </header>
      <div className={cn("grid gap-x-5 gap-y-5 px-6 py-6", columnClass, contentClassName)}>
        {children}
      </div>
    </section>
  );
}

/**
 * FormField — label + control + optional helper / error microcopy.
 *
 * Always pair a label with its control. Helper text appears under the
 * control in muted text; error text replaces helper text when present
 * and turns danger-red. `required` prints a discreet asterisk after the
 * label (not a noisy "required" pill).
 */
export function FormField({
  label,
  htmlFor,
  required = false,
  helper,
  error,
  className,
  hint,
  children,
}: {
  label: string;
  htmlFor?: string;
  required?: boolean;
  helper?: string;
  error?: string;
  className?: string;
  /** Right-aligned tiny hint next to the label (e.g. unit, "optional"). */
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <div className="flex items-baseline justify-between gap-2">
        <label
          htmlFor={htmlFor}
          className="text-[12px] font-medium text-fg-secondary"
        >
          {label}
          {required && (
            <span
              aria-hidden="true"
              className="ml-0.5 text-status-danger"
              title="Required"
            >
              *
            </span>
          )}
        </label>
        {hint && (
          <span className="text-[10px] uppercase tracking-wider text-fg-tertiary">
            {hint}
          </span>
        )}
      </div>
      {children}
      {error ? (
        <span className="text-[11px] font-medium text-status-danger">{error}</span>
      ) : helper ? (
        <span className="text-[11px] text-fg-tertiary">{helper}</span>
      ) : null}
    </div>
  );
}
