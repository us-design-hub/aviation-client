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
    hour12: false,
  }).formatToParts(refUTC);

  const refH = Number(etParts.find((p) => p.type === "hour").value);
  const refM = Number(etParts.find((p) => p.type === "minute").value);
  const [targetH, targetM] = timeStr.split(":").map(Number);

  const diffMs = ((targetH - refH) * 60 + (targetM - refM)) * 60_000;
  return new Date(refUTC.getTime() + diffMs).toISOString();
}
