import type { Role } from "../db/schema";

// Staff run the service. Admins see everything; support agents only handle
// errands and support chats (no money, people or settings).
export const STAFF_ROLES = ["admin", "support"] as const satisfies readonly Role[];

export function isStaff(user: { role: Role } | null | undefined): boolean {
  return user?.role === "admin" || user?.role === "support";
}
