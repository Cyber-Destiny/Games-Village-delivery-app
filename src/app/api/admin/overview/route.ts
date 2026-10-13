import { getAdminBadges, getOverview } from "@/lib/admin";
import { json, withUser } from "@/lib/api";
import { UserError } from "@/lib/errors";
import { tick } from "@/lib/orders/service";

export const GET = withUser(async (_req, user) => {
  if (user.role !== "admin") throw new UserError("Admins only.");
  await tick();
  const [overview, badges] = await Promise.all([getOverview(), getAdminBadges()]);
  return json({ overview, badges });
});
