import * as React from "react";

import { cn } from "@/lib/utils";

export function Button({
  className,
  variant = "primary",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost";
}) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-2xl border px-4 py-2.5 text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--green)] disabled:cursor-not-allowed disabled:opacity-50 active:scale-[0.99]",
        variant === "primary" &&
          "border-[rgba(62,143,92,0.18)] bg-[var(--green)] text-white shadow-[0_12px_24px_rgba(62,143,92,0.18)] hover:bg-[var(--green-deep)]",
        variant === "secondary" &&
          "border-[rgba(62,143,92,0.16)] bg-[rgba(62,143,92,0.08)] text-[var(--green-deep)] hover:bg-[rgba(62,143,92,0.14)]",
        variant === "ghost" && "border-transparent bg-transparent text-[var(--slate)] hover:bg-white/70 hover:text-[var(--ink)]",
        className,
      )}
      {...props}
    />
  );
}

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={cn(
        "h-12 w-full rounded-2xl border border-[var(--border)] bg-white px-4 text-sm text-[var(--ink)] outline-none transition placeholder:text-[rgba(111,125,112,0.72)] focus:border-[var(--green)] focus:ring-2 focus:ring-[rgba(62,143,92,0.16)]",
        props.className,
      )}
    />
  );
}

export function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-[28px] border border-[var(--border)] bg-[var(--card)] shadow-[var(--shadow)] backdrop-blur",
        className,
      )}
      {...props}
    />
  );
}

export function Badge({
  className,
  tone = "default",
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & {
  tone?: "default" | "success" | "sage" | "amber" | "critical" | "neutral";
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-medium tracking-[0.02em]",
        tone === "default" && "border-[var(--border)] bg-white/90 text-[var(--slate)]",
        tone === "success" && "border-[rgba(62,143,92,0.16)] bg-[var(--green-soft)] text-[var(--green-deep)]",
        tone === "sage" && "border-[rgba(141,187,149,0.18)] bg-[var(--sage-soft)] text-[var(--green-deep)]",
        tone === "amber" && "border-[rgba(209,165,66,0.18)] bg-[var(--amber-soft)] text-[#8a6921]",
        tone === "critical" && "border-[rgba(201,105,90,0.18)] bg-[var(--red-soft)] text-[#9b4d41]",
        tone === "neutral" && "border-[rgba(73,86,74,0.16)] bg-[rgba(73,86,74,0.06)] text-[var(--slate)]",
        className,
      )}
      {...props}
    />
  );
}

export function SectionHeading({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description?: string;
}) {
  return (
    <div className="space-y-2">
      <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[var(--green-deep)]">{eyebrow}</div>
      <div className="space-y-1">
        <h2 className="text-2xl font-semibold tracking-[-0.04em] text-[var(--ink)] sm:text-3xl">{title}</h2>
        {description ? <p className="max-w-3xl text-sm text-[var(--slate)] sm:text-[15px]">{description}</p> : null}
      </div>
    </div>
  );
}
