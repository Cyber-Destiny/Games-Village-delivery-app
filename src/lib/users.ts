import "server-only";
import { and, eq, ne } from "drizzle-orm";
import { db, type DbOrTx } from "./db";
import { users } from "./db/schema";
import { UserError } from "./errors";
import { formatPhoneLocal } from "./phone";
import { getSettings } from "./settings";

/** Phone numbers aren't verified, so make sure one isn't already on someone else's account. */
export async function assertPhoneFree(phone: string, userId: string | null, tx: DbOrTx = db) {
  const [clash] = await tx
    .select({ id: users.id })
    .from(users)
    .where(userId ? and(eq(users.phone, phone), ne(users.id, userId)) : eq(users.phone, phone));
  if (clash) {
    // They may not be able to open the support chat yet (e.g. mid sign-up), so give the number.
    const { supportPhone } = await getSettings();
    const reach = supportPhone ? `call or WhatsApp us on ${formatPhoneLocal(supportPhone)}` : "message support";
    throw new UserError(`That phone number is already on another account. If it's yours, ${reach}.`);
  }
}
