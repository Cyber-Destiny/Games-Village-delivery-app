import "server-only";
import { cache } from "react";
import { eq } from "drizzle-orm";
import { db } from "./db";
import { settings as settingsTable } from "./db/schema";
import { DEFAULT_SETTINGS, type Settings } from "./settings-shared";
import { lagosMinutes, parseHHMM } from "./time";

export type { Settings };

function merge(data: Partial<Settings> | null | undefined): Settings {
  return {
    ...DEFAULT_SETTINGS,
    ...(data ?? {}),
    fees: { ...DEFAULT_SETTINGS.fees, ...(data?.fees ?? {}) },
  };
}

export const getSettings = cache(async (): Promise<Settings> => {
  const [row] = await db.select().from(settingsTable).where(eq(settingsTable.id, 1));
  return merge(row?.data as Partial<Settings> | undefined);
});

export async function saveSettings(next: Settings) {
  await db
    .insert(settingsTable)
    .values({ id: 1, data: next })
    .onConflictDoUpdate({ target: settingsTable.id, set: { data: next, updatedAt: new Date() } });
}

export function isOpenNow(s: Settings, at: Date = new Date()): boolean {
  if (!s.serviceOpen) return false;
  const now = lagosMinutes(at);
  const open = parseHHMM(s.openTime);
  const close = parseHHMM(s.closeTime);
  if (open === close) return true;
  return open < close ? now >= open && now < close : now >= open || now < close;
}
