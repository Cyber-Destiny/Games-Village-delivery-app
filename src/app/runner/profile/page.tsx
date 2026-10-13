import { eq } from "drizzle-orm";
import { requireRole } from "@/lib/auth/dal";
import { db } from "@/lib/db";
import { runnerProfiles } from "@/lib/db/schema";
import { ProfileView } from "./profile-view";

export const metadata = { title: "Profile" };

export default async function RunnerProfilePage() {
  const user = await requireRole("runner");
  const [p] = await db.select().from(runnerProfiles).where(eq(runnerProfiles.userId, user.id));
  return (
    <ProfileView
      name={user.name ?? ""}
      phone={user.phone}
      tag={p?.tag ?? null}
      bank={p?.accountNumber ? { bankName: p.bankName ?? "", accountNumber: p.accountNumber, accountName: p.accountName ?? "" } : null}
      rating={p?.ratingCount ? p.ratingSum / p.ratingCount : null}
      ratingCount={p?.ratingCount ?? 0}
    />
  );
}
