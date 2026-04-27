import { format } from "date-fns";

export const TZ = "America/New_York";

/**
 * Convert any date value to a Date object whose local‑timezone fields
 * equal the Eastern‑Time representation of the original instant.
 * Use the returned Date ONLY for display formatting – its UTC timestamp
 * is intentionally shifted and must not be used for date math or storage.
 */
export function toET(date) {
  const d = date instanceof Date ? date : new Date(date);
  return new Date(d.toLocaleString("en-US", { timeZone: TZ }));
}

/**
 * Format a date in Eastern Time using a date‑fns pattern string.
 *   formatET("2025-03-08T20:00:00Z", "h:mm a")  → "3:00 PM"
 */
export function formatET(date, pattern) {
  return format(toET(date), pattern);
}

/**
 * toLocaleDateString locked to Eastern Time.
 */
export function formatDateET(date, options = {}) {
  const d = date instanceof Date ? date : new Date(date);
  return d.toLocaleDateString("en-US", { ...options, timeZone: TZ });
}

/**
 * toLocaleTimeString locked to Eastern Time.
 */
export function formatTimeET(date, options = {}) {
  const d = date instanceof Date ? date : new Date(date);
  return d.toLocaleTimeString("en-US", { ...options, timeZone: TZ });
}

export function nowET() {
  return toET(new Date());
}

export function dateKeyET(date) {
  const d = date instanceof Date ? date : new Date(date);
  const y = d.toLocaleString("en-US", { year: "numeric", timeZone: TZ });
  const m = d.toLocaleString("en-US", { month: "2-digit", timeZone: TZ });
  const day = d.toLocaleString("en-US", { day: "2-digit", timeZone: TZ });
  return `${y}-${m}-${day}`;
}

export function getETDateParts(date) {
  const d = toET(date);
  return {
    year: d.getFullYear(),
    month: d.getMonth(),
    date: d.getDate(),
    day: d.getDay(),
  };
}

export function isSameDateET(a, b) {
  return dateKeyET(a) === dateKeyET(b);
}

export function isSameMonthET(a, b) {
  const aParts = getETDateParts(a);
  const bParts = getETDateParts(b);
  return aParts.year === bParts.year && aParts.month === bParts.month;
}

export function startOfWeekET(date) {
  const parts = getETDateParts(date);
  return new Date(parts.year, parts.month, parts.date - parts.day);
}

export function isDateInCurrentWeekET(date, reference = new Date()) {
  const dateParts = getETDateParts(date);
  const weekStart = startOfWeekET(reference);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);
  const dateOnly = new Date(dateParts.year, dateParts.month, dateParts.date);
  return dateOnly >= weekStart && dateOnly <= weekEnd;
}

/**
 * Convert a calendar‑date + "HH:mm" time (intended as Eastern Time)
 * into a proper UTC ISO string for storage / API calls.
 *
 * This works correctly regardless of the browser's local timezone.
 */
export function etToISO(dateObj, timeStr) {
  const y = dateObj.toLocaleString("en-US", { year: "numeric", timeZone: TZ });
  const m = dateObj.toLocaleString("en-US", { month: "2-digit", timeZone: TZ });
  const d = dateObj.toLocaleString("en-US", { day: "2-digit", timeZone: TZ });
  const dateStr = `${y}-${m}-${d}`;

  const refUTC = new Date(`${dateStr}T${timeStr}:00Z`);

  const etParts = new Intl.DateTimeFormat("en-US", {
    timeZone: TZ,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(refUTC);

  const refH = Number(etParts.find((p) => p.type === "hour").value);
  const refM = Number(etParts.find((p) => p.type === "minute").value);
  const [targetH, targetM] = timeStr.split(":").map(Number);

  const diffMs = ((targetH - refH) * 60 + (targetM - refM)) * 60_000;
  return new Date(refUTC.getTime() + diffMs).toISOString();
}
