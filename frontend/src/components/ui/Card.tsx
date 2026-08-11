import type { HTMLAttributes, ReactNode } from "react";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
}

export function Card({ className = "", children, ...rest }: CardProps) {
  return (
    <div
      className={`rounded-3xl bg-white border border-line shadow-[0_2px_12px_rgba(0,0,0,0.06)] ${className}`}
      {...rest}
    >
      {children}
    </div>
  );
}
