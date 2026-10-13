import "server-only";
import { NextResponse } from "next/server";
import type { User } from "./db/schema";
import { getCurrentUser } from "./auth/dal";
import { errorMessage, UserError } from "./errors";

export function json(data: unknown, init?: number | ResponseInit) {
  const res = NextResponse.json(data, typeof init === "number" ? { status: init } : init);
  res.headers.set("Cache-Control", "no-store");
  return res;
}

/** Route handler wrapper: requires a signed-in user and maps errors to JSON. */
export function withUser<C>(handler: (req: Request, user: User, ctx: C) => Promise<Response>) {
  return async (req: Request, ctx: C) => {
    const user = await getCurrentUser();
    if (!user) return json({ error: "Please sign in." }, 401);
    try {
      return await handler(req, user, ctx);
    } catch (err) {
      const status = err instanceof UserError ? 400 : 500;
      return json({ error: errorMessage(err) }, status);
    }
  };
}
