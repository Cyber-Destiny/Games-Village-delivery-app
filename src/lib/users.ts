import "server-only";
import { and, eq, ne } from "drizzle-orm";
import { db, type DbOrTx } from "./db";
import { users } from "./db/schema";
import { UserError } from "./errors";

/** Phone numbers aren't verified, so make sure one isn't already on someone else's account. */
export async function assertPhoneFree(phone: string, userId: string | null, tx: DbOrTx = db) {
  const [clash] = await tx
    .select({ id: users.id })
    .from(users)
    .where(userId ? and(eq(users.phone, phone), ne(users.id, userId)) : eq(users.phone, phone));
  if (clash) throw new UserError("That phone number is already on another account. Message support if it's yours.");
}
