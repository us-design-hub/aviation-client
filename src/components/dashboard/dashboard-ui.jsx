"use client";

import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

/** Tone tokens that stay legible in both themes. */
export const TONES = {
  neutral: { icon: "text-muted-foreground", chip: "bg-muted", value: "text-foreground", bar: "bg-muted-foreground/50" },
  gold: { icon: "text-golden", chip: "bg-golden/12", value: "text-foreground", bar: "bg-golden" },
  success: {
    icon: "text-emerald-600 dark:text-emerald-400",
    chip: "bg-emerald-500/12 dark:bg-emerald-400/15",
    value: "text-emerald-700 dark:text-emerald-400",
    bar: "bg-emerald-500 dark:bg-emerald-400",
  },
  warning: {
    icon: "text-amber-600 dark:text-amber-400",
    chip: "bg-amber-500/12 dark:bg-amber-400/15",
    value: "text-amber-700 dark:text-amber-400",
    bar: "bg-amber-500 dark:bg-amber-400",
  },
  danger: {
    icon: "text-red-600 dark:text-red-400",
    chip: "bg-red-500/12 dark:bg-red-400/15",
    value: "text-red-700 dark:text-red-400",
    bar: "bg-red-500 dark:bg-red-400",
  },
  info: {
    icon: "text-sky-600 dark:text-sky-400",
    chip: "bg-sky-500/12 dark:bg-sky-400/15",
    value: "text-sky-700 dark:text-sky-400",
    bar: "bg-sky-500 dark:bg-sky-400",
  },
};

export function greetingFor(date = new Date()) {
  const hour = date.getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

export const firstNameOf = (name = "") => name.trim().split(" ")[0] || "there";

/**
 * Headline metric. When `href` is given the whole tile becomes a link, so a number
 * that raises a question leads straight to the page that answers it.
 */
export function StatTile({
  label, value, unit, hint, icon: Icon, tone = "neutral", href, progress, progressLabel,
}) {
  const t = TONES[tone] || TONES.neutral;
  const pct = typeof progress === "number" ? Math.max(0, Math.min(100, progress)) : null;

  const body = (
    <CardContent className="flex h-full flex-col p-5">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
        {Icon && (
          <span className={cn("flex size-9 shrink-0 items-center justify-center rounded-lg", t.chip)}>
            <Icon className={cn("size-4.5", t.icon)} />
          </span>
        )}
      </div>

      <p className={cn("mt-3 flex items-baseline gap-1.5 text-3xl font-bold tracking-tight tabular-nums", t.value)}>
        {value}
        {unit && <span className="text-base font-semibold text-muted-foreground">{unit}</span>}
      </p>

      {hint && (
        <p className="mt-1.5 flex items-center gap-1 text-xs text-muted-foreground">
          {hint}
          {href && <ArrowUpRight className="size-3 opacity-0 transition-opacity group-hover:opacity-100" />}
        </p>
      )}

      {pct !== null && (
        <div className="mt-auto pt-4">
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
            <div className={cn("h-full rounded-full transition-all", t.bar)} style={{ width: `${pct}%` }} />
          </div>
          {progressLabel && <p className="mt-1.5 text-xs text-muted-foreground">{progressLabel}</p>}
        </div>
      )}
    </CardContent>
  );

  const card = (
    <Card className={cn(
      "group h-full gap-0 py-0 transition-all",
      href && "hover:-translate-y-0.5 hover:border-golden/40 hover:shadow-md",
    )}>
      {body}
    </Card>
  );

  return href ? <Link href={href} className="block h-full rounded-xl">{card}</Link> : card;
}

export function SectionCard({ title, description, icon: Icon, action, children, className, bodyClassName }) {
  return (
    <Card className={cn("gap-0 py-0", className)}>
      {(title || action) && (
        <div className="flex flex-wrap items-start justify-between gap-3 border-b px-5 py-4">
          <div className="flex items-start gap-3">
            {Icon && (
              <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted">
                <Icon className="size-4 text-muted-foreground" />
              </span>
            )}
            <div>
              <h2 className="font-semibold leading-tight">{title}</h2>
              {description && <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>}
            </div>
          </div>
          {action}
        </div>
      )}
      <div className={cn("px-5 py-4", bodyClassName)}>{children}</div>
    </Card>
  );
}

/** Tile-sized shortcut. Reads as a destination rather than a bare button. */
export function QuickAction({ href, icon: Icon, label, description }) {
  return (
    <Link
      href={href}
      className="group flex items-start gap-3 rounded-xl border bg-card p-4 transition-all hover:-translate-y-0.5 hover:border-golden/40 hover:shadow-md"
    >
      <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-golden/12">
        <Icon className="size-4.5 text-golden" />
      </span>
      <span className="min-w-0">
        <span className="flex items-center gap-1 font-medium">
          {label}
          <ArrowUpRight className="size-3.5 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
        </span>
        {description && <span className="mt-0.5 block text-xs text-muted-foreground">{description}</span>}
      </span>
    </Link>
  );
}

/** One entry in a list panel (a lesson, a booking, an aircraft). */
export function ListItem({ icon: Icon, iconTone = "neutral", title, meta, detail, trailing }) {
  const t = TONES[iconTone] || TONES.neutral;
  return (
    <div className="flex items-start justify-between gap-3 border-b py-3.5 last:border-b-0">
      <div className="flex min-w-0 items-start gap-3">
        {Icon && (
          <span className={cn("mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg", t.chip)}>
            <Icon className={cn("size-4", t.icon)} />
          </span>
        )}
        <div className="min-w-0">
          <p className="truncate font-medium">{title}</p>
          {meta && <p className="mt-0.5 text-sm text-muted-foreground">{meta}</p>}
          {detail && <p className="mt-1 text-sm">{detail}</p>}
        </div>
      </div>
      {trailing && <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">{trailing}</div>}
    </div>
  );
}

export function Pill({ tone = "neutral", icon: Icon, children }) {
  const t = TONES[tone] || TONES.neutral;
  return (
    <span className={cn(
      "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold whitespace-nowrap",
      t.chip, t.value,
    )}>
      {Icon ? <Icon className="size-3.5" /> : <span className={cn("size-1.5 rounded-full", t.bar)} />}
      {children}
    </span>
  );
}

export function EmptyRow({ icon: Icon, title, description }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-10 text-center">
      {Icon && (
        <span className="flex size-11 items-center justify-center rounded-full bg-muted">
          <Icon className="size-5 text-muted-foreground" />
        </span>
      )}
      <p className="text-sm font-medium">{title}</p>
      {description && <p className="max-w-sm text-sm text-muted-foreground">{description}</p>}
    </div>
  );
}

export function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-9 w-64" />
        <Skeleton className="h-4 w-80 max-w-full" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[0, 1, 2, 3].map((key) => <Skeleton key={key} className="h-36 rounded-xl" />)}
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <Skeleton className="h-64 rounded-xl" />
        <Skeleton className="h-64 rounded-xl" />
      </div>
    </div>
  );
}
