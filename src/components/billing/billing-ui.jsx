"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

const money = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });

export const formatMoney = (cents = 0) => money.format(Number(cents || 0) / 100);

export const formatHours = (value) => Number(value || 0).toFixed(1);

export const formatDate = (value) => (value
  ? new Intl.DateTimeFormat("en-US", {
    month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit", timeZone: "America/New_York",
  }).format(new Date(value))
  : "-");

/** Tone tokens that stay legible in both themes. Never use bare bg-*-50 here. */
export const TONES = {
  neutral: {
    icon: "text-muted-foreground",
    chip: "bg-muted",
    value: "text-foreground",
    bar: "bg-muted-foreground/50",
  },
  gold: {
    icon: "text-golden",
    chip: "bg-golden/12",
    value: "text-foreground",
    bar: "bg-golden",
  },
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

/**
 * Primary metric tile. `value` is the headline and `unit` renders smaller beside it,
 * so a column of tiles keeps one visual weight for numbers and another for units.
 */
export function StatCard({
  label, value, unit, hint, icon: Icon, tone = "neutral", progress, progressLabel, className,
}) {
  const t = TONES[tone] || TONES.neutral;
  const pct = typeof progress === "number" ? Math.max(0, Math.min(100, progress)) : null;

  return (
    <Card className={cn("gap-0 overflow-hidden py-0 transition-shadow hover:shadow-md", className)}>
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

        {hint && <p className="mt-1.5 text-xs text-muted-foreground">{hint}</p>}

        {pct !== null && (
          <div className="mt-auto pt-4">
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
              <div className={cn("h-full rounded-full transition-all", t.bar)} style={{ width: `${pct}%` }} />
            </div>
            {progressLabel && <p className="mt-1.5 text-xs text-muted-foreground">{progressLabel}</p>}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/** Section wrapper: consistent titling so every list on the page reads the same way. */
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
          {action && <div className="flex flex-wrap items-center gap-2">{action}</div>}
        </div>
      )}
      <div className={cn("px-5 py-4", bodyClassName)}>{children}</div>
    </Card>
  );
}

const CALLOUT_RING = {
  info: "border-sky-500/30",
  warning: "border-amber-500/40",
  danger: "border-red-500/40",
  success: "border-emerald-500/30",
  neutral: "border-border",
  gold: "border-golden/40",
};

/** Inline banner. Replaces the default Alert so warning/blocked states read at a glance. */
export function Callout({ tone = "info", icon: Icon, title, children, action }) {
  const t = TONES[tone] || TONES.info;

  return (
    <div className={cn(
      "flex flex-wrap items-start gap-3 rounded-xl border px-4 py-3.5",
      CALLOUT_RING[tone] || CALLOUT_RING.neutral,
      t.chip,
    )}>
      {Icon && <Icon className={cn("mt-0.5 size-4.5 shrink-0", t.icon)} />}
      <div className="min-w-50 flex-1 space-y-0.5">
        {title && <p className="text-sm font-semibold">{title}</p>}
        <div className="text-sm text-muted-foreground">{children}</div>
      </div>
      {action}
    </div>
  );
}

const STATUS_TONES = {
  PAID: "success",
  COMPLETED: "success",
  OK: "success",
  PENDING: "warning",
  WARNING: "warning",
  REFUNDED: "info",
  CANCELED: "neutral",
  VOIDED: "neutral",
  PAYMENT_FAILED: "danger",
  BLOCKED: "danger",
};

export function StatusPill({ status, className }) {
  const tone = TONES[STATUS_TONES[status] || "neutral"];
  return (
    <span className={cn(
      "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold whitespace-nowrap",
      tone.chip, tone.value, className,
    )}>
      <span className={cn("size-1.5 rounded-full", tone.bar)} />
      {String(status || "").replaceAll("_", " ")}
    </span>
  );
}

/**
 * One row of a ledger or list. Amounts are right-aligned and tabular so columns of
 * numbers line up down the page.
 */
export function ListRow({ title, meta, note, amount, amountTone, sub, actions, badge, className }) {
  return (
    <div className={cn(
      "flex flex-col gap-3 border-b py-3.5 last:border-b-0 sm:flex-row sm:items-center sm:justify-between",
      className,
    )}>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-medium">{title}</p>
          {badge}
        </div>
        {meta && <p className="mt-0.5 text-sm text-muted-foreground">{meta}</p>}
        {note && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{note}</p>}
      </div>
      <div className="flex shrink-0 flex-wrap items-center gap-3 sm:justify-end">
        {(amount || sub) && (
          <div className="sm:text-right">
            {amount && <p className={cn("font-semibold tabular-nums", amountTone)}>{amount}</p>}
            {sub && <p className="text-xs text-muted-foreground tabular-nums">{sub}</p>}
          </div>
        )}
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
    </div>
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

/** Small label/value pair used inside breakdown cards. */
export function MiniStat({ label, value, tone = "neutral" }) {
  return (
    <div className="rounded-lg bg-muted/50 px-3 py-2.5">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={cn("mt-0.5 font-semibold tabular-nums", TONES[tone]?.value)}>{value}</p>
    </div>
  );
}

export function BillingSkeleton() {
  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 p-4 sm:p-6">
      <div className="space-y-2">
        <Skeleton className="h-9 w-44" />
        <Skeleton className="h-4 w-80 max-w-full" />
      </div>
      <Skeleton className="h-10 w-full max-w-md rounded-lg" />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[0, 1, 2, 3].map((key) => <Skeleton key={key} className="h-36 rounded-xl" />)}
      </div>
      <Skeleton className="h-64 rounded-xl" />
    </div>
  );
}
