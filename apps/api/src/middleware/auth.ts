import { Context, Next } from "hono";
import { auth } from "../lib/auth";

export type AuthEnv = {
  Variables: {
    userId: string;
  };
};

const ts = () => new Date().toISOString();

export async function authMiddleware(c: Context<AuthEnv>, next: Next) {
  console.log(`[AUTH-MW ${ts()}] ${c.req.method} ${c.req.path}`);
  console.log(`[AUTH-MW ${ts()}] Cookie: ${c.req.header("cookie") ?? "none"}`);
  console.log(`[AUTH-MW ${ts()}] Authorization: ${c.req.header("authorization") ?? "none"}`);

  const session = await auth.api.getSession({ headers: c.req.raw.headers });
  if (!session) {
    console.log(`[AUTH-MW ${ts()}] Session: NOT FOUND → 401`);
    return c.json({ error: "Non authentifie" }, 401);
  }
  console.log(`[AUTH-MW ${ts()}] Session OK → user=${session.user.id} (${session.user.email})`);
  c.set("userId", session.user.id);
  await next();
}
