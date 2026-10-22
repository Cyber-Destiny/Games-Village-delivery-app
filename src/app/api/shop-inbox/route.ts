import { json, withUser } from "@/lib/api";
import { vendorInbox, vendorPickups } from "@/lib/shop-chat";

export const GET = withUser(async (_req, user) => {
  const [threads, pickups] = await Promise.all([vendorInbox(user), vendorPickups(user)]);
  return json({ threads, pickups });
});
