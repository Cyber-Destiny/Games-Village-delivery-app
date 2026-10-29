import "server-only";
import { normalizeEmail } from "../email-address";

/** ADMIN_EMAILS (comma-separated) is the single source of truth for who is an admin. */
export function adminEmails(): string[] {
  return (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => normalizeEmail(e))
    .filter((e): e is string => !!e);
}

export function isListedAdmin(email: string | null | undefined): boolean {
  return !!email && adminEmails().includes(email);
}
