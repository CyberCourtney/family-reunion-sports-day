import { forwardRef, type SelectHTMLAttributes, type ReactNode } from "react";

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  children: ReactNode;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { label, id, className = "", children, ...rest },
  ref,
) {
  const selectId = id ?? label.toLowerCase().replace(/\s+/g, "-");
  return (
    <label htmlFor={selectId} className="flex flex-col gap-1.5 text-left">
      <span className="text-sm font-display font-medium text-ink">{label}</span>
      <select
        ref={ref}
        id={selectId}
        className={`rounded-2xl border border-line px-4 py-2.5 min-h-11 text-base bg-white focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent transition-colors ${className}`}
        {...rest}
      >
        {children}
      </select>
    </label>
  );
});
