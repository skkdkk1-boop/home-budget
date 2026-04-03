"use client";

import type {
  ButtonHTMLAttributes,
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from "react";

import { cn } from "@/lib/planner-utils";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
type ButtonSize = "md" | "sm";
type BadgeTone = "neutral" | "info" | "success" | "warning" | "danger";
type SummaryTone = "default" | "highlight" | "danger";

const buttonVariantClasses: Record<ButtonVariant, string> = {
  primary:
    "bg-[var(--primary)] text-[#fff] shadow-[var(--shadow-primary)] hover:bg-[var(--primary-hover)] hover:text-[#fff] active:text-[#fff] focus-visible:text-[#fff]",
  secondary:
    "border border-[color-mix(in_srgb,var(--border)_90%,white)] bg-[var(--surface-muted)] text-[var(--text-secondary)] hover:bg-[color-mix(in_srgb,var(--surface-muted)_84%,var(--border-strong))]",
  ghost:
    "bg-[var(--surface)] text-[var(--text-secondary)] ring-1 ring-[var(--border)] hover:bg-[var(--surface-muted)]",
  danger:
    "border border-[color-mix(in_srgb,var(--danger)_14%,white)] bg-[color-mix(in_srgb,var(--danger)_10%,white)] text-[var(--danger)] hover:bg-[color-mix(in_srgb,var(--danger)_16%,white)]",
};

const buttonSizeClasses: Record<ButtonSize, string> = {
  md: "h-11 px-4 text-sm font-semibold",
  sm: "h-8 px-3 text-[13px] font-medium",
};

const badgeToneClasses: Record<BadgeTone, string> = {
  neutral:
    "border border-[color-mix(in_srgb,var(--border-strong)_72%,white)] bg-[var(--surface-muted)] text-[var(--text-secondary)]",
  info:
    "border border-[color-mix(in_srgb,var(--info)_18%,white)] bg-[color-mix(in_srgb,var(--info)_10%,white)] text-[var(--info)]",
  success:
    "border border-[color-mix(in_srgb,var(--success)_18%,white)] bg-[color-mix(in_srgb,var(--success)_10%,white)] text-[var(--success)]",
  warning:
    "border border-[color-mix(in_srgb,var(--warning)_18%,white)] bg-[color-mix(in_srgb,var(--warning)_12%,white)] text-[var(--warning)]",
  danger:
    "border border-[color-mix(in_srgb,var(--danger)_18%,white)] bg-[color-mix(in_srgb,var(--danger)_10%,white)] text-[var(--danger)]",
};

const summaryToneClasses: Record<SummaryTone, string> = {
  default: "bg-[var(--surface)]",
  highlight:
    "bg-[linear-gradient(180deg,color-mix(in_srgb,var(--surface-blue)_82%,white),var(--surface-blue))] border-[color-mix(in_srgb,var(--primary)_10%,var(--border))]",
  danger:
    "bg-[linear-gradient(180deg,color-mix(in_srgb,var(--danger)_8%,white),white)] border-[color-mix(in_srgb,var(--danger)_10%,var(--border))]",
};

const inputClassName =
  "radius-control h-12 w-full border border-[var(--border)] bg-[var(--surface)] px-4 text-sm text-[var(--text-primary)] outline-none transition placeholder:text-[var(--text-muted)] focus:border-[var(--primary)] focus:ring-4 focus:ring-[color-mix(in_srgb,var(--primary)_12%,white)]";

export function SurfaceCard({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "planner-card radius-surface p-5 sm:p-6",
        className,
      )}
    >
      {children}
    </section>
  );
}

export function SectionHeader({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
      <div>
        <h2 className="text-[1.45rem] font-semibold tracking-[-0.03em] text-[var(--text-primary)]">
          {title}
        </h2>
        <p className="mt-1 text-sm leading-6 text-[var(--text-secondary)]">
          {description}
        </p>
      </div>
      {action}
    </div>
  );
}

export function SummaryCard({
  label,
  value,
  description,
  tone = "default",
}: {
  label: string;
  value: string;
  description: string;
  tone?: SummaryTone;
}) {
  return (
    <article
      className={cn(
        "planner-card radius-card p-5",
        summaryToneClasses[tone],
      )}
    >
      <p className="text-sm font-medium text-[var(--text-secondary)]">{label}</p>
      <p className="mt-3 text-[1.9rem] font-semibold tracking-[-0.045em] text-[var(--text-primary)] sm:text-[2.05rem]">
        {value}
      </p>
      <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
        {description}
      </p>
    </article>
  );
}

export function StatusBadge({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: BadgeTone;
}) {
  return (
    <span
      className={cn(
        "radius-pill inline-flex h-7 min-w-[4.5rem] items-center justify-center whitespace-nowrap px-3 text-[12px] font-semibold leading-none",
        badgeToneClasses[tone],
      )}
    >
      {children}
    </span>
  );
}

export function Button({
  className,
  variant = "primary",
  size = "md",
  type = "button",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
}) {
  return (
    <button
      type={type}
      className={cn(
        "radius-control inline-flex items-center justify-center whitespace-nowrap transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[color-mix(in_srgb,var(--primary)_12%,white)] disabled:cursor-not-allowed disabled:opacity-50",
        buttonVariantClasses[variant],
        buttonSizeClasses[size],
        className,
      )}
      {...props}
    />
  );
}

export function FormDialog({
  open,
  title,
  description,
  onClose,
  children,
}: {
  open: boolean;
  title: string;
  description: string;
  onClose: () => void;
  children: ReactNode;
}) {
  if (!open) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-[rgba(25,31,40,0.38)] p-0 sm:items-center sm:p-6"
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="planner-card planner-card-strong planner-dialog max-h-[90vh] w-full max-w-2xl overflow-hidden">
        <div className="flex items-start justify-between gap-4 border-b border-[var(--border)] px-5 py-4 sm:px-6">
          <div>
            <h3 className="text-xl font-semibold tracking-[-0.03em] text-[var(--text-primary)]">
              {title}
            </h3>
            <p className="mt-1 text-sm leading-6 text-[var(--text-secondary)]">
              {description}
            </p>
          </div>
          <Button aria-label="닫기" onClick={onClose} size="sm" variant="ghost">
            닫기
          </Button>
        </div>
        <div className="max-h-[calc(90vh-96px)] overflow-y-auto px-5 py-5 sm:px-6">
          {children}
        </div>
      </div>
    </div>
  );
}

export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <label className="flex flex-col gap-2">
      <span className="text-sm font-semibold text-[var(--text-secondary)]">
        {label}
      </span>
      {children}
      {hint ? <span className="text-xs text-[var(--text-muted)]">{hint}</span> : null}
    </label>
  );
}

export function TextInput({
  className,
  ...props
}: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(inputClassName, className)} {...props} />;
}

export function SelectInput({
  className,
  children,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select className={cn(inputClassName, "pr-10", className)} {...props}>
      {children}
    </select>
  );
}

export function TextArea({
  className,
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(
        "radius-control min-h-[120px] w-full border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-sm text-[var(--text-primary)] outline-none transition placeholder:text-[var(--text-muted)] focus:border-[var(--primary)] focus:ring-4 focus:ring-[color-mix(in_srgb,var(--primary)_12%,white)]",
        className,
      )}
      {...props}
    />
  );
}

export function EmptyState({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="radius-card border border-dashed border-[var(--border-strong)] bg-[var(--surface-muted)] px-5 py-10 text-center">
      <p className="text-base font-semibold text-[var(--text-primary)]">{title}</p>
      <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
        {description}
      </p>
    </div>
  );
}

export function LoadingState() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: 6 }).map((_, index) => (
        <div
          key={index}
          className="radius-card animate-pulse border border-[var(--border)] bg-[var(--surface-muted)] p-5"
        >
          <div className="radius-pill h-4 w-24 bg-[var(--border)]" />
          <div className="radius-control mt-4 h-9 w-2/3 bg-[var(--border)]" />
          <div className="radius-pill mt-4 h-4 w-full bg-[var(--border)]" />
          <div className="radius-pill mt-2 h-4 w-5/6 bg-[var(--border)]" />
        </div>
      ))}
    </div>
  );
}

export function DetailRow({
  label,
  value,
}: {
  label: string;
  value: ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4 text-sm">
      <span className="text-[var(--text-secondary)]">{label}</span>
      <span className="text-right font-semibold text-[var(--text-primary)]">
        {value}
      </span>
    </div>
  );
}
