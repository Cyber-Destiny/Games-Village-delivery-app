import { json, withUser } from "@/lib/api";
import { UserError } from "@/lib/errors";
import { supportInbox } from "@/lib/support";

export const GET = withUser(async (_req, user) => {
  if (user.role !== "admin") throw new UserError("Admins only.");
  return json({ threads: await supportInbox() });
});
