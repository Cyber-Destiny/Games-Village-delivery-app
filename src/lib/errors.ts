/** An error whose message is safe to show to the user. */
export class UserError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UserError";
  }
}

export type ActionResult<T = undefined> = { ok: true; data: T } | { ok: false; error: string };

export function errorMessage(err: unknown): string {
  if (err instanceof UserError) return err.message;
  if (err && typeof err === "object" && "name" in err && (err as Error).name === "AuthError") return (err as Error).message;
  console.error(err);
  return "Something went wrong. Please try again.";
}

/** Wraps a server action body so expected errors become `{ ok: false, error }`. */
export async function attempt<T>(fn: () => Promise<T>): Promise<ActionResult<T>> {
  try {
    return { ok: true, data: await fn() };
  } catch (err) {
    // Let Next.js redirects / notFound bubble up.
    if (err && typeof err === "object" && "digest" in err && typeof (err as { digest: unknown }).digest === "string" && (err as { digest: string }).digest.startsWith("NEXT_")) {
      throw err;
    }
    return { ok: false, error: errorMessage(err) };
  }
}
