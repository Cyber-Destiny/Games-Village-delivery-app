import { json, withUser } from "@/lib/api";
import { isStaff } from "@/lib/auth/roles";
import { UserError } from "@/lib/errors";
import { supportInbox } from "@/lib/support";

export const GET = withUser(async (_req, user) => {
  if (!isStaff(user)) throw new UserError("Staff only.");
  return json({ threads: await supportInbox() });
});
