import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "../db";
import { users, type Role, type User } from "../db/schema";
import { isListedAdmin } from "./admins";
import { readSession } from "./session";

export const getCurrentUser = cache(async (): Promise<User | null> => {
  const session = await readSession();
  if (!session) return null;
  const [user] = await db.select().from(users).where(eq(users.id, session.uid));
  if (!user || !user.isActive || user.sessionVersion !== session.v) return null;
  // Taken off ADMIN_EMAILS → signed out now, not at their next sign-in (which then makes them a resident).
  if (user.role === "admin" && !isListedAdmin(user.email)) return null;
  return user;
});

export function homeFor(user: Pick<User, "role">): string {
  if (user.role === "admin") return "/admin";
  if (user.role === "support") return "/admin/support";
  if (user.role === "runner") return "/runner";
  if (user.role === "vendor") return "/shop";
  return "/home";
}

export function needsOnboarding(user: User): boolean {
  return !user.name || (user.role === "resident" && (!user.block || !user.house || !user.phone));
}

export async function requireUser(): Promise<User> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

/** Ensures the signed-in user has one of the roles, otherwise sends them to their own home. */
export async function requireRole(...roles: Role[]): Promise<User> {
  const user = await requireUser();
  if (!roles.includes(user.role)) redirect(homeFor(user));
  return user;
}

/** Shop staff: vendor accounts, or residents who also work at a shop. */
export async function requireShopStaff(): Promise<User & { vendorId: string }> {
  const user = await requireUser();
  if (!user.vendorId) redirect(homeFor(user));
  return user as User & { vendorId: string };
}

/** For server actions / route handlers: throws instead of redirecting. */
export async function assertRole(...roles: Role[]): Promise<User> {
  const user = await getCurrentUser();
  if (!user) throw new AuthError("Please sign in again.");
  if (!roles.includes(user.role)) throw new AuthError("You don't have access to that.");
  return user;
}

export class AuthError extends Error {}
