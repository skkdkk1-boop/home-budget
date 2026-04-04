"use client";

import type { ReactNode, SVGProps } from "react";

import { cn } from "@/lib/planner-utils";

type IconProps = SVGProps<SVGSVGElement>;

function PlannerIcon({
  children,
  className,
  ...props
}: IconProps & {
  children: ReactNode;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.9}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={cn("h-4 w-4 shrink-0", className)}
      {...props}
    >
      {children}
    </svg>
  );
}

export function LayoutGridIcon(props: IconProps) {
  return (
    <PlannerIcon {...props}>
      <rect x="3.5" y="3.5" width="7" height="7" rx="1.5" />
      <rect x="13.5" y="3.5" width="7" height="7" rx="1.5" />
      <rect x="3.5" y="13.5" width="7" height="7" rx="1.5" />
      <rect x="13.5" y="13.5" width="7" height="7" rx="1.5" />
    </PlannerIcon>
  );
}

export function WalletIcon(props: IconProps) {
  return (
    <PlannerIcon {...props}>
      <path d="M4 7.5A2.5 2.5 0 0 1 6.5 5h10A2.5 2.5 0 0 1 19 7.5v9A2.5 2.5 0 0 1 16.5 19h-10A2.5 2.5 0 0 1 4 16.5z" />
      <path d="M4 8.5h13.5A2.5 2.5 0 0 1 20 11v2a2.5 2.5 0 0 1-2.5 2.5H16a2 2 0 1 1 0-4h4" />
      <path d="M7.5 8.5V6.8a1.8 1.8 0 0 1 1.8-1.8h7.2" />
    </PlannerIcon>
  );
}

export function ShoppingBagIcon(props: IconProps) {
  return (
    <PlannerIcon {...props}>
      <path d="M6.5 8.5h11l-1 11a2 2 0 0 1-2 1.8h-5A2 2 0 0 1 7.5 19.5z" />
      <path d="M9 9V7.5a3 3 0 0 1 6 0V9" />
      <path d="M9 12.5v0" />
      <path d="M15 12.5v0" />
    </PlannerIcon>
  );
}

export function TruckIcon(props: IconProps) {
  return (
    <PlannerIcon {...props}>
      <path d="M3.5 7.5h10v8h-10z" />
      <path d="M13.5 10h3.2l2.3 2.6v2.9h-5.5z" />
      <circle cx="8" cy="18" r="1.8" />
      <circle cx="17" cy="18" r="1.8" />
      <path d="M5.5 18H6.2" />
      <path d="M18.8 18H20" />
    </PlannerIcon>
  );
}

export function HammerIcon(props: IconProps) {
  return (
    <PlannerIcon {...props}>
      <path d="M14.5 5.2 18 8.7l-1.7 1.7-3.5-3.5z" />
      <path d="M13.6 6.1 9.8 9.9" />
      <path d="M11.2 12.3 6 17.5a1.8 1.8 0 1 0 2.5 2.5l5.2-5.2" />
      <path d="M16.3 10.4 18.8 7.9a1.8 1.8 0 0 0 0-2.5l-.2-.2a1.8 1.8 0 0 0-2.5 0l-2.5 2.5" />
    </PlannerIcon>
  );
}

export function BoxesIcon(props: IconProps) {
  return (
    <PlannerIcon {...props}>
      <path d="M12 3.8 5 7.3v9.4l7 3.5 7-3.5V7.3z" />
      <path d="M5 7.3 12 11l7-3.7" />
      <path d="M12 11v9.2" />
      <path d="M8.3 5.7 15.2 9" />
    </PlannerIcon>
  );
}

export function MoreHorizontalIcon(props: IconProps) {
  return (
    <PlannerIcon {...props}>
      <circle cx="6.5" cy="12" r="1" />
      <circle cx="12" cy="12" r="1" />
      <circle cx="17.5" cy="12" r="1" />
    </PlannerIcon>
  );
}
