import { forwardRef, type InputHTMLAttributes } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, id, className = "", ...rest },
  ref,
) {
  const inputId = id ?? label.toLowerCase().replace(/\s+/g, "-");
  return (
    <label htmlFor={inputId} className="flex flex-col gap-1.5 text-left">
      <span className="text-sm font-display font-medium text-ink">{label}</span>
      <input
        ref={ref}
        id={inputId}
        className={`rounded-2xl border border-line px-4 py-2.5 min-h-11 text-base focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent transition-colors ${className}`}
        {...rest}
      />
    </label>
  );
});
