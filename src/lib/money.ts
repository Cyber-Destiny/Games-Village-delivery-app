// Money helpers. Everything is stored in kobo (integers).

const fmt = new Intl.NumberFormat("en-NG", { maximumFractionDigits: 0 });

/** 150000 → "₦1,500" */
export function naira(kobo: number | null | undefined): string {
  const value = Math.round((kobo ?? 0) / 100);
  const sign = value < 0 ? "−" : "";
  return `${sign}₦${fmt.format(Math.abs(value))}`;
}

/** "1,500" / "1500" → 150000 */
export function parseNaira(input: string | number | null | undefined): number {
  if (input === null || input === undefined) return 0;
  const n = typeof input === "number" ? input : Number(String(input).replace(/[^0-9.]/g, ""));
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.round(n * 100);
}

export function toNairaNumber(kobo: number): number {
  return Math.round(kobo / 100);
}
