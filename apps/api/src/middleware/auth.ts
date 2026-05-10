import type { Context, Next } from "hono";
import { UnauthorizedError } from "../errors";
import { auth } from "../lib/auth";

export type AuthEnv = {
  Variables: {
    userId: string;
  };
};

export async function authMiddleware(c: Context<AuthEnv>, next: Next) {
  const session = await auth.api.getSession({ headers: c.req.raw.headers });
  if (!session) {
    throw new UnauthorizedError();
  }
  c.set("userId", session.user.id);
  await next();
}
