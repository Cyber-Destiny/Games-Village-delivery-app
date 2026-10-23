import { eq } from "drizzle-orm";
import { requireRole } from "@/lib/auth/dal";
import { db } from "@/lib/db";
import { runnerProfiles } from "@/lib/db/schema";
import { getSettings } from "@/lib/settings";
import { supportUnread } from "@/lib/support";
import { ProfileView } from "./profile-view";

export const metadata = { title: "Profile" };

export default async function RunnerProfilePage() {
  const user = await requireRole("runner");
  const [[p], s, unread] = await Promise.all([
    db.select().from(runnerProfiles).where(eq(runnerProfiles.userId, user.id)),
    getSettings(),
    supportUnread(user.id),
  ]);
  return (
    <ProfileView
      name={user.name ?? ""}
      phone={user.phone}
      tag={p?.tag ?? null}
      bank={p?.accountNumber ? { bankName: p.bankName ?? "", accountNumber: p.accountNumber, accountName: p.accountName ?? "" } : null}
      rating={p?.ratingCount ? p.ratingSum / p.ratingCount : null}
      ratingCount={p?.ratingCount ?? 0}
      supportPhone={s.supportPhone}
      supportUnread={unread}
    />
  );
}
