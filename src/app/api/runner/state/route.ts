import { json, withUser } from "@/lib/api";
import { UserError } from "@/lib/errors";
import { getRunnerState } from "@/lib/orders/queries";
import { tick } from "@/lib/orders/service";

export const GET = withUser(async (_req, user) => {
  if (user.role !== "runner") throw new UserError("Runners only.");
  await tick();
  return json({ state: await getRunnerState(user) });
});
