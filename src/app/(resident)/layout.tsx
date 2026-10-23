import { and, eq, inArray } from "drizzle-orm";
import { redirect } from "next/navigation";
import { BottomNav } from "@/components/app/bottom-nav";
import { CallProvider } from "@/components/call/call-provider";
import { needsOnboarding, requireRole } from "@/lib/auth/dal";
import { db } from "@/lib/db";
import { orders } from "@/lib/db/schema";
import { ACTIVE_STATUSES } from "@/lib/orders/status";

export default async function ResidentLayout({ children }: { children: React.ReactNode }) {
  const user = await requireRole("resident", "admin");
  if (needsOnboarding(user)) redirect("/welcome");
  const active = await db
    .select({ id: orders.id })
    .from(orders)
    .where(and(eq(orders.residentId, user.id), inArray(orders.status, ACTIVE_STATUSES)));

  return (
    <div className="relative mx-auto min-h-dvh max-w-[480px] bg-bg sm:border-x sm:border-line/70 sm:shadow-[0_0_60px_-30px_rgb(var(--shadow-color)/0.25)]">
      <CallProvider>
        {children}
        <BottomNav activeCount={active.length} />
      </CallProvider>
    </div>
  );
}
