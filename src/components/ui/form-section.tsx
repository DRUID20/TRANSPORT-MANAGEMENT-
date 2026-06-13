import { cn } from "@/lib/utils";

/**
 * FormSection — a quiet group of related fields.
 *
 * Visual rhythm: header is a single short title (no eyebrow, no
 * description paragraph), content is a tight responsive grid.
 * Instructional copy belongs in placeholders, errors, and onboarding
 * flows, NOT permanently on the page.
 *
 * Props still accept eyebrow / description / action for any caller
 * that wants to re-enable instructional chrome (settings page,
 * onboarding wizard), but defaults drop them.
 */
export function FormSection({
  title,
  action,
  columns = 2,
  className,
  contentClassName,
  children,
  // Legacy props — ignored visually by default for clutter purge.
  eyebrow: _eyebrow,
  description: _description,
}: {
  title?: string;
  action?: React.ReactNode;
  columns?: 1 | 2 | 3;
  className?: string;
  contentClassName?: string;
  children: React.ReactNode;
  eyebrow?: string;
  description?: string;
}) {
  const columnClass =
    columns === 1
      ? "grid-cols-1"
      : columns === 2
        ? "grid-cols-1 sm:grid-cols-2"
        : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3";

  return (
    <section className="surface-card animate-content-in overflow-hidden">
      {(title || action) && (
        <header
          className={cn(
            "flex items-center justify-between gap-3 border-b border-border px-5 py-3.5",
            className,
          )}
        >
          {title && (
            <h2 className="text-[13px] font-semibold tracking-tight text-fg-primary">
              {title}
            </h2>
          )}
          {action && <div className="shrink-0">{action}</div>}
        </header>
      )}
      <div className={cn("grid gap-x-4 gap-y-4 px-5 py-5", columnClass, contentClassName)}>
        {children}
      </div>
    </section>
  );
}

/**
 * FormField — label + control + optional inline error.
 *
 * Helper text is gone by default. Errors render directly below
 * the control. Optional one-word hint (units like LITRES / KES) sits
 * on the right of the label.
 */
export function FormField({
  label,
  htmlFor,
  required = false,
  error,
  className,
  hint,
  children,
  // Legacy — ignored visually.
  helper: _helper,
}: {
  label: string;
  htmlFor?: string;
  required?: boolean;
  error?: string;
  className?: string;
  hint?: string;
  children: React.ReactNode;
  helper?: string;
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
              className="ml-0.5 text-status-danger/80"
              title="Required"
            >
              *
            </span>
          )}
        </label>
        {hint && (
          <span className="font-mono text-[10px] uppercase tracking-wider text-fg-tertiary">
            {hint}
          </span>
        )}
      </div>
      {children}
      {error && (
        <span className="text-[11px] font-medium text-status-danger">{error}</span>
      )}
    </div>
  );
}
