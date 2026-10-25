// Time helpers pinned to Abuja (Africa/Lagos, UTC+1, no DST).

export const TZ = "Africa/Lagos";
const LAGOS_OFFSET_MS = 60 * 60 * 1000;

/** Monday (YYYY-MM-DD) of the week containing `at`, in Lagos time. */
export function weekStart(at: Date = new Date()): string {
  const local = new Date(at.getTime() + LAGOS_OFFSET_MS);
  const day = (local.getUTCDay() + 6) % 7; // Monday = 0
  local.setUTCDate(local.getUTCDate() - day);
  return local.toISOString().slice(0, 10);
}

/** Start of the current Lagos day as a Date (UTC instant). */
export function startOfDay(at: Date = new Date()): Date {
  const local = new Date(at.getTime() + LAGOS_OFFSET_MS);
  local.setUTCHours(0, 0, 0, 0);
  return new Date(local.getTime() - LAGOS_OFFSET_MS);
}

export function lagosDateKey(at: Date): string {
  return new Date(at.getTime() + LAGOS_OFFSET_MS).toISOString().slice(0, 10);
}

/** Minutes since midnight in Lagos. */
export function lagosMinutes(at: Date = new Date()): number {
  const local = new Date(at.getTime() + LAGOS_OFFSET_MS);
  return local.getUTCHours() * 60 + local.getUTCMinutes();
}

export function parseHHMM(v: string): number {
  const [h, m] = v.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
}

export function timeAgo(date: Date | string | null | undefined, now: Date = new Date()): string {
  if (!date) return "";
  const d = typeof date === "string" ? new Date(date) : date;
  const s = Math.max(0, Math.round((now.getTime() - d.getTime()) / 1000));
  if (s < 45) return "just now";
  const m = Math.round(s / 60);
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  const days = Math.round(h / 24);
  if (days < 7) return `${days}d ago`;
  return formatDate(d);
}

export function formatTime(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleTimeString("en-NG", { hour: "numeric", minute: "2-digit", hour12: true, timeZone: TZ }).toLowerCase();
}

export function formatDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("en-NG", { day: "numeric", month: "short", timeZone: TZ });
}

/** "07:00" → "7am", "21:30" → "9:30pm" */
export function to12h(hhmm: string): string {
  const [h, m] = hhmm.split(":").map(Number);
  const suffix = h >= 12 ? "pm" : "am";
  const hr = h % 12 || 12;
  return m ? `${hr}:${String(m).padStart(2, "0")}${suffix}` : `${hr}${suffix}`;
}

/** Opening hours for people to read, e.g. "7am–11pm". */
export function formatHours(open: string, close: string): string {
  return open === close ? "24 hours" : `${to12h(open)}–${to12h(close)}`;
}

export function formatDateTime(date: Date | string): string {
  return `${formatDate(date)}, ${formatTime(date)}`;
}

export function greeting(at: Date = new Date()): string {
  const m = lagosMinutes(at);
  if (m < 12 * 60) return "Good morning";
  if (m < 17 * 60) return "Good afternoon";
  return "Good evening";
}
