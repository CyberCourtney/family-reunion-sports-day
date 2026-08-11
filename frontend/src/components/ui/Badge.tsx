import type { ReactNode } from "react";

interface BadgeProps {
  children: ReactNode;
  style?: React.CSSProperties;
  className?: string;
}

export function Badge({ children, style, className = "" }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-display font-semibold tracking-wide ${className}`}
      style={style}
    >
      {children}
    </span>
  );
}
