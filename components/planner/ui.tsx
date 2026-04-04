"use client";

import type {
  ButtonHTMLAttributes,
  InputHTMLAttributes,
  MouseEvent as ReactMouseEvent,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from "react";
import { forwardRef, useEffect, useId, useRef, useState } from "react";

import {
  cn,
  formatMoneyInput,
  sanitizeMoneyInput,
} from "@/lib/planner-utils";

import { MoreHorizontalIcon } from "./nav-icons";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
type ButtonSize = "md" | "sm";
type BadgeTone = "neutral" | "info" | "success" | "warning" | "danger";
type SummaryTone = "default" | "highlight" | "danger";
type SummaryPriority = "primary" | "secondary" | "tertiary";
type SummaryChipTone = "default" | "highlight" | "success" | "danger";

const buttonVariantClasses: Record<ButtonVariant, string> = {
  primary:
    "bg-[var(--primary)] text-[#FFFFFF] shadow-[var(--shadow-primary)] hover:bg-[var(--primary-hover)] hover:text-[#FFFFFF] active:text-[#FFFFFF] focus-visible:text-[#FFFFFF]",
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

const summaryPriorityClasses: Record<SummaryPriority, string> = {
  primary: "p-4 sm:p-5",
  secondary: "p-4 sm:p-5",
  tertiary: "p-4 shadow-none",
};

const summaryLabelClasses: Record<SummaryPriority, string> = {
  primary: "text-[14px] font-medium text-[var(--text-label)]",
  secondary: "text-[13px] font-medium text-[var(--text-label)]",
  tertiary: "text-[12px] font-medium text-[var(--text-muted)]",
};

const summaryValueClasses: Record<SummaryPriority, string> = {
  primary:
    "mt-2.5 text-[1.75rem] font-semibold tracking-[-0.04em] sm:text-[2rem]",
  secondary:
    "mt-2 text-[1.375rem] font-semibold tracking-[-0.035em] sm:text-[1.5rem]",
  tertiary:
    "mt-2 text-[1.25rem] font-semibold tracking-[-0.03em] sm:text-[1.375rem]",
};

function getSummaryToneClass(priority: SummaryPriority, tone: SummaryTone) {
  if (priority === "tertiary") {
    if (tone === "danger") {
      return "bg-[color-mix(in_srgb,var(--danger)_5%,white)] border-[color-mix(in_srgb,var(--danger)_12%,white)]";
    }

    if (tone === "highlight") {
      return "bg-[color-mix(in_srgb,var(--surface-blue)_38%,white)] border-[color-mix(in_srgb,var(--primary)_10%,white)]";
    }

    return "bg-[color-mix(in_srgb,var(--surface-muted)_44%,white)] border-[color-mix(in_srgb,var(--border)_78%,white)]";
  }

  return summaryToneClasses[tone];
}

const inputClassName =
  "radius-control h-12 w-full border border-[var(--border)] bg-[var(--surface)] px-4 text-sm text-[var(--text-primary)] outline-none transition placeholder:text-[var(--text-muted)] focus:border-[var(--primary)] focus:ring-4 focus:ring-[color-mix(in_srgb,var(--primary)_12%,white)]";

const summaryChipToneClasses: Record<SummaryChipTone, string> = {
  default: "bg-[var(--surface)] text-[var(--text-secondary)]",
  highlight: "bg-[var(--surface-blue)] text-[var(--primary)]",
  success:
    "bg-[color-mix(in_srgb,var(--success)_10%,white)] text-[var(--success)]",
  danger:
    "bg-[color-mix(in_srgb,var(--danger)_9%,white)] text-[var(--danger)]",
};

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
        "planner-card radius-surface p-4 sm:p-5",
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
  title?: string;
  description?: string;
  action?: ReactNode;
}) {
  const hasText = Boolean(title || description);

  if (!hasText) {
    return action ? <div className="flex justify-end">{action}</div> : null;
  }

  return (
    <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
      <div>
        {title ? (
          <h2 className="text-[1.35rem] font-semibold tracking-[-0.03em] text-[var(--text-primary)]">
            {title}
          </h2>
        ) : null}
        {description ? (
          <p className="mt-1 text-sm leading-6 text-[var(--text-label)]">
            {description}
          </p>
        ) : null}
      </div>
      {action}
    </div>
  );
}

export function SummaryCard({
  label,
  value,
  tone = "default",
  priority = "secondary",
  meta,
  className,
  labelPrefix,
  labelClassName,
  valueClassName,
}: {
  label: string;
  value: string;
  tone?: SummaryTone;
  priority?: SummaryPriority;
  meta?: ReactNode;
  className?: string;
  labelPrefix?: ReactNode;
  labelClassName?: string;
  valueClassName?: string;
}) {
  return (
    <article
      className={cn(
        "planner-card radius-card",
        getSummaryToneClass(priority, tone),
        summaryPriorityClasses[priority],
        className,
      )}
    >
      <div className="flex items-center gap-2">
        {labelPrefix}
        <p className={cn(summaryLabelClasses[priority], labelClassName)}>{label}</p>
      </div>
      <p
        className={cn(
          summaryValueClasses[priority],
          tone === "danger"
            ? "text-[var(--danger)]"
            : priority !== "primary"
              ? "text-[var(--text-secondary)]"
              : "text-[var(--text-primary)]",
          valueClassName,
        )}
      >
        {value}
      </p>
      {meta ? <div className="mt-3">{meta}</div> : null}
    </article>
  );
}

export function SummaryChip({
  children,
  tone = "default",
  className,
}: {
  children: ReactNode;
  tone?: SummaryChipTone;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "radius-pill inline-flex min-h-7 items-center whitespace-nowrap px-3 text-[12px] font-medium",
        summaryChipToneClasses[tone],
        className,
      )}
    >
      {children}
    </span>
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
        "radius-pill inline-flex h-[1.625rem] min-w-[4.25rem] items-center justify-center whitespace-nowrap px-2.5 text-[11.5px] font-semibold leading-none tracking-[-0.01em]",
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

export function SelectionCheckbox({
  checked,
  indeterminate = false,
  className,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & {
  checked: boolean;
  indeterminate?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!inputRef.current) {
      return;
    }

    inputRef.current.indeterminate = indeterminate && !checked;
  }, [checked, indeterminate]);

  return (
    <input
      ref={inputRef}
      checked={checked}
      type="checkbox"
      className={cn(
        "h-4 w-4 cursor-pointer rounded-[4px] border border-[var(--border-strong)] accent-[var(--primary)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[color-mix(in_srgb,var(--primary)_12%,white)]",
        className,
      )}
      {...props}
    />
  );
}

export function BulkActionBar({
  count,
  onClear,
  children,
}: {
  count: number;
  onClear: () => void;
  children: ReactNode;
}) {
  return (
    <div className="radius-card border border-[color-mix(in_srgb,var(--primary)_10%,var(--border))] bg-[color-mix(in_srgb,var(--surface-blue)_54%,white)] px-4 py-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2 text-sm">
          <span className="font-semibold text-[var(--text-primary)]">
            {count}개 선택됨
          </span>
          <button
            type="button"
            className="text-[13px] font-medium text-[var(--text-label)] transition hover:text-[var(--text-secondary)]"
            onClick={() => onClear()}
          >
            선택 해제
          </button>
        </div>
        <div className="flex flex-wrap items-center gap-2">{children}</div>
      </div>
    </div>
  );
}

export function PanelHeader({
  title,
  href,
  hrefLabel = "전체 보기",
  action,
}: {
  title: string;
  href?: string;
  hrefLabel?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <h3 className="text-lg font-semibold tracking-[-0.03em] text-[var(--text-primary)]">
        {title}
      </h3>
      {action
        ? action
        : href ? (
            <a href={href} className="planner-link text-sm font-semibold">
              {hrefLabel}
            </a>
          ) : null}
    </div>
  );
}

export function TableContainer({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={cn("table-shell", className)}>{children}</div>;
}

export function RowActionMenu({
  label,
  description,
  mode,
  onEdit,
  onDelete,
  triggerClassName,
}: {
  label: string;
  description?: string;
  mode: "desktop" | "mobile";
  onEdit: () => void;
  onDelete: () => void;
  triggerClassName?: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [menuPosition, setMenuPosition] = useState<{
    left: number;
    top: number;
  } | null>(null);

  const closeMenu = () => {
    setIsOpen(false);
    setMenuPosition(null);
  };

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handleClose = () => {
      setIsOpen(false);
      setMenuPosition(null);
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        handleClose();
      }
    };

    window.addEventListener("resize", handleClose);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("resize", handleClose);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  const handleTriggerClick = (event: ReactMouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();

    if (isOpen) {
      closeMenu();
      return;
    }

    if (mode === "desktop") {
      const menuWidth = 168;
      const menuHeight = 104;
      const viewportPadding = 12;
      const triggerRect = event.currentTarget.getBoundingClientRect();
      const left = Math.max(
        viewportPadding,
        Math.min(
          triggerRect.right - menuWidth,
          window.innerWidth - menuWidth - viewportPadding,
        ),
      );

      setMenuPosition({
        left,
        top: Math.max(
          viewportPadding,
          Math.min(
            triggerRect.bottom + 8,
            window.innerHeight - menuHeight - viewportPadding,
          ),
        ),
      });
    }

    setIsOpen(true);
  };

  const handleEdit = () => {
    closeMenu();
    onEdit();
  };

  const handleDelete = () => {
    closeMenu();
    onDelete();
  };

  return (
    <>
      <button
        type="button"
        aria-expanded={isOpen}
        aria-haspopup="menu"
        aria-label={`${label} 관리 메뉴`}
        className={cn(
          "radius-control inline-flex h-[2.125rem] w-[2.125rem] items-center justify-center border border-transparent text-[var(--text-muted)] transition hover:border-[color-mix(in_srgb,var(--border)_82%,white)] hover:bg-[var(--surface-muted)] hover:text-[var(--text-secondary)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[color-mix(in_srgb,var(--primary)_12%,white)]",
          isOpen &&
            "border-[color-mix(in_srgb,var(--border)_82%,white)] bg-[var(--surface-muted)] text-[var(--text-secondary)]",
          triggerClassName,
        )}
        onClick={handleTriggerClick}
      >
        <MoreHorizontalIcon />
      </button>

      {isOpen && mode === "desktop" ? (
        <div className="fixed inset-0 z-40" onClick={closeMenu}>
          <div
            className="radius-card fixed z-50 w-[10.25rem] overflow-hidden border border-[color-mix(in_srgb,var(--border)_84%,white)] bg-[var(--surface)] p-1.5 shadow-[0_20px_40px_-28px_rgba(15,23,42,0.28)]"
            role="menu"
            onClick={(event) => event.stopPropagation()}
            style={{
              left: `${menuPosition?.left ?? 12}px`,
              top: `${menuPosition?.top ?? 12}px`,
            }}
          >
            <button
              type="button"
              className="radius-control flex h-10 w-full items-center px-3 text-left text-sm font-medium text-[var(--text-primary)] transition hover:bg-[var(--surface-muted)]"
              onClick={handleEdit}
            >
              수정
            </button>
            <button
              type="button"
              className="radius-control flex h-10 w-full items-center px-3 text-left text-sm font-medium text-[var(--danger)] transition hover:bg-[color-mix(in_srgb,var(--danger)_8%,white)]"
              onClick={handleDelete}
            >
              삭제
            </button>
          </div>
        </div>
      ) : null}

      {isOpen && mode === "mobile" ? (
        <div
          className="fixed inset-0 z-40 bg-[rgba(25,31,40,0.18)]"
          onClick={closeMenu}
        >
          <div
            className="fixed inset-x-0 bottom-0 z-50 px-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] pt-10"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="planner-card planner-card-strong radius-surface overflow-hidden px-5 pb-5 pt-4">
              <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-[var(--border-strong)]" />
              <p className="text-sm font-semibold text-[var(--text-primary)]">
                {label}
              </p>
              {description ? (
                <p className="mt-1 text-sm text-[var(--text-label)]">
                  {description}
                </p>
              ) : null}

              <div className="mt-5 grid gap-2">
                <button
                  type="button"
                  className="radius-control flex h-11 w-full items-center justify-center border border-[color-mix(in_srgb,var(--border)_90%,white)] bg-[var(--surface-muted)] px-4 text-sm font-semibold text-[var(--text-secondary)] transition hover:bg-[color-mix(in_srgb,var(--surface-muted)_84%,var(--border-strong))]"
                  onClick={handleEdit}
                >
                  수정
                </button>
                <button
                  type="button"
                  className="radius-control flex h-11 w-full items-center justify-center border border-[color-mix(in_srgb,var(--danger)_14%,white)] bg-[color-mix(in_srgb,var(--danger)_10%,white)] px-4 text-sm font-semibold text-[var(--danger)] transition hover:bg-[color-mix(in_srgb,var(--danger)_16%,white)]"
                  onClick={handleDelete}
                >
                  삭제
                </button>
                <button
                  type="button"
                  className="radius-control flex h-11 w-full items-center justify-center border border-[var(--border)] bg-[var(--surface)] px-4 text-sm font-semibold text-[var(--text-secondary)] transition hover:bg-[var(--surface-muted)]"
                  onClick={closeMenu}
                >
                  닫기
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

export function FormDialog({
  open,
  title,
  description,
  onClose,
  panelClassName,
  bodyClassName,
  children,
}: {
  open: boolean;
  title: string;
  description: string;
  onClose: () => void;
  panelClassName?: string;
  bodyClassName?: string;
  children: ReactNode;
}) {
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    if (!open) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose, open]);

  if (!open) {
    return null;
  }

  return (
    <div
      role="presentation"
      className="fixed inset-0 z-50 flex items-end justify-center bg-[rgba(25,31,40,0.38)] p-0 sm:items-center sm:p-6"
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        aria-describedby={descriptionId}
        aria-labelledby={titleId}
        aria-modal="true"
        className={cn(
          "planner-card planner-card-strong planner-dialog max-h-[90vh] w-full max-w-2xl overflow-hidden",
          panelClassName,
        )}
        role="dialog"
      >
        <div className="flex items-start justify-between gap-4 border-b border-[var(--border)] px-5 py-4 sm:px-6">
          <div>
            <h3
              id={titleId}
              className="text-xl font-semibold tracking-[-0.03em] text-[var(--text-primary)]"
            >
              {title}
            </h3>
            <p
              id={descriptionId}
              className="mt-1 text-sm leading-6 text-[var(--text-label)]"
            >
              {description}
            </p>
          </div>
          <Button aria-label="닫기" onClick={() => onClose()} size="sm" variant="ghost">
            닫기
          </Button>
        </div>
        <div
          className={cn(
            "max-h-[calc(90vh-96px)] overflow-y-auto px-5 py-5 sm:px-6",
            bodyClassName,
          )}
        >
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
      <span className="text-[13px] font-medium text-[var(--text-label)]">
        {label}
      </span>
      {children}
      {hint ? <span className="text-[12px] text-[var(--text-muted)]">{hint}</span> : null}
    </label>
  );
}

export function DialogActions({
  onCancel,
  submitLabel,
  submitting = false,
  cancelLabel = "취소",
  submitVariant = "primary",
  className,
}: {
  onCancel: () => void;
  submitLabel: string;
  submitting?: boolean;
  cancelLabel?: string;
  submitVariant?: ButtonVariant;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end",
        className,
      )}
    >
      <Button className="w-full sm:w-auto" variant="secondary" onClick={() => onCancel()}>
        {cancelLabel}
      </Button>
      <Button
        className="w-full sm:w-auto"
        disabled={submitting}
        type="submit"
        variant={submitVariant}
      >
        {submitLabel}
      </Button>
    </div>
  );
}

export function SegmentedControl({
  children,
  className,
  fullWidth = false,
}: {
  children: ReactNode;
  className?: string;
  fullWidth?: boolean;
}) {
  return (
    <div
      className={cn(
        fullWidth
          ? "grid w-full gap-2 rounded-[var(--radius-control)] bg-[var(--surface-muted)] p-1"
          : "inline-flex gap-2 self-start rounded-[var(--radius-control)] bg-[var(--surface-muted)] p-1",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function SegmentedControlButton({
  active,
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  active?: boolean;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      className={cn(
        "radius-control inline-flex h-9 items-center justify-center px-3 text-sm transition",
        active
          ? "bg-[var(--surface)] font-semibold text-[var(--text-primary)] shadow-[0_8px_18px_-16px_rgba(15,23,42,0.4)]"
          : "font-medium text-[var(--text-secondary)]",
        className,
      )}
      {...props}
    />
  );
}

function SelectChevronIcon() {
  return (
    <svg
      aria-hidden="true"
      className="h-4 w-4"
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.8"
    >
      <path d="m5.75 7.75 4.25 4.5 4.25-4.5" />
    </svg>
  );
}

export const TextInput = forwardRef<
  HTMLInputElement,
  InputHTMLAttributes<HTMLInputElement>
>(function TextInput({ className, ...props }, ref) {
  return <input ref={ref} className={cn(inputClassName, className)} {...props} />;
});

type MoneyInputProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "type" | "value" | "onChange"
> & {
  value: string | number;
  onValueChange: (value: string) => void;
};

export const MoneyInput = forwardRef<HTMLInputElement, MoneyInputProps>(
  function MoneyInput(
    { className, onBlur, onFocus, onValueChange, value, ...props },
    ref,
  ) {
    const [isFocused, setIsFocused] = useState(false);
    const [draftValue, setDraftValue] = useState(() => formatMoneyInput(value));
    const rawValue =
      typeof value === "number" ? (value > 0 ? String(value) : "") : sanitizeMoneyInput(value);

    useEffect(() => {
      if (isFocused) {
        return;
      }

      setDraftValue(formatMoneyInput(value));
    }, [isFocused, value]);

    return (
      <TextInput
        {...props}
        ref={ref}
        className={className}
        inputMode="numeric"
        type="text"
        value={draftValue}
        onBlur={(event) => {
          setIsFocused(false);
          setDraftValue(formatMoneyInput(rawValue));
          onBlur?.(event);
        }}
        onChange={(event) => {
          const nextValue =
            typeof event.target.value === "string" ? event.target.value : "";
          const sanitized = sanitizeMoneyInput(nextValue);

          setDraftValue(sanitized);
          onValueChange(sanitized);
        }}
        onFocus={(event) => {
          setIsFocused(true);
          setDraftValue(rawValue);
          onFocus?.(event);
        }}
      />
    );
  },
);

export const SelectInput = forwardRef<
  HTMLSelectElement,
  SelectHTMLAttributes<HTMLSelectElement>
>(function SelectInput({ className, children, ...props }, ref) {
  return (
    <div className="relative w-full">
      <select
        ref={ref}
        className={cn(
          inputClassName,
          "appearance-none bg-[var(--surface)] pr-11",
          className,
        )}
        {...props}
      >
        {children}
      </select>
      <span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]">
        <SelectChevronIcon />
      </span>
    </div>
  );
});

export const TextArea = forwardRef<
  HTMLTextAreaElement,
  TextareaHTMLAttributes<HTMLTextAreaElement>
>(function TextArea({ className, ...props }, ref) {
  return (
    <textarea
      ref={ref}
      className={cn(
        "radius-control min-h-[120px] w-full border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-sm text-[var(--text-primary)] outline-none transition placeholder:text-[var(--text-muted)] focus:border-[var(--primary)] focus:ring-4 focus:ring-[color-mix(in_srgb,var(--primary)_12%,white)]",
        className,
      )}
      {...props}
    />
  );
});

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
      <p className="mt-2 text-sm leading-6 text-[var(--text-label)]">
        {description}
      </p>
    </div>
  );
}

export function ValuePreviewPanel({
  label,
  value,
  caption,
}: {
  label: string;
  value: string;
  caption?: string;
}) {
  return (
    <div className="planner-panel-muted p-4">
      <p className="text-[13px] font-medium text-[var(--text-label)]">{label}</p>
      <p className="mt-2 text-[1.5rem] font-semibold tracking-[-0.035em] text-[var(--text-primary)] sm:text-[1.625rem]">
        {value}
      </p>
      {caption ? (
        <p className="mt-2 text-[12px] leading-5 text-[var(--text-muted)]">
          {caption}
        </p>
      ) : null}
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
      <span className="text-[var(--text-label)]">{label}</span>
      <span className="text-right font-semibold text-[var(--text-primary)]">
        {value}
      </span>
    </div>
  );
}
