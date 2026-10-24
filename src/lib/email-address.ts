// Email address helpers. Addresses are stored trimmed and lower-case.

export function normalizeEmail(input: string): string | null {
  const e = input.trim().toLowerCase();
  if (e.length > 254 || !/^[^\s@]+@[^\s@]+\.[a-z]{2,}$/.test(e)) return null;
  return e;
}

/** amaka.obi@gmail.com → "am•••@gmail.com" */
export function maskEmail(email: string): string {
  const [user, domain] = email.split("@");
  return `${user.slice(0, Math.min(2, user.length))}•••@${domain}`;
}
