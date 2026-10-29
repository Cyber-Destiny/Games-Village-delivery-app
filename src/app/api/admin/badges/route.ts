import { getAdminBadges } from "@/lib/admin";
import { json, withUser } from "@/lib/api";
import { isStaff } from "@/lib/auth/roles";
import { UserError } from "@/lib/errors";
import { tick } from "@/lib/orders/service";

/** Tab counts for the console, polled by admins and support agents. */
export const GET = withUser(async (_req, user) => {
  if (!isStaff(user)) throw new UserError("Staff only.");
  await tick();
  return json({ badges: await getAdminBadges(user.role === "admin") });
});
