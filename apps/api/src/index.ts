import { Hono } from "hono";
import { cors } from "hono/cors";
import { auth } from "./lib/auth";
import { tripsRouter } from "./routes/trips";
import { daysRouter } from "./routes/days";
import { itemsRouter } from "./routes/items";
import { documentsRouter } from "./routes/documents";

export const app = new Hono();

app.use("*", cors());

const ts = () => new Date().toISOString();

app.on(["POST", "GET"], "/api/auth/**", (c) => {
  const url = new URL(c.req.url);
  console.log(`[AUTH ${ts()}] ${c.req.method} ${url.pathname}${url.search}`);
  console.log(`[AUTH ${ts()}] Origin: ${c.req.header("origin") ?? "none"}`);
  console.log(`[AUTH ${ts()}] Cookie: ${c.req.header("cookie") ?? "none"}`);
  console.log(`[AUTH ${ts()}] Authorization: ${c.req.header("authorization") ?? "none"}`);
  console.log(`[AUTH ${ts()}] Expo-Origin: ${c.req.header("expo-origin") ?? "none"}`);

  return auth.handler(c.req.raw).then((res) => {
    console.log(`[AUTH ${ts()}] Response: ${res.status} ${res.statusText}`);
    if (res.status >= 300 && res.status < 400) {
      console.log(`[AUTH ${ts()}] Redirect → ${res.headers.get("location")}`);
    }
    if (res.headers.has("set-cookie")) {
      console.log(`[AUTH ${ts()}] Set-Cookie: ${res.headers.get("set-cookie")}`);
    }
    return res;
  });
});

app.route("/trips", tripsRouter);
app.route("/days", daysRouter);
app.route("/items", itemsRouter);
app.route("/", documentsRouter);


app.get("/health", (c) => c.json({ status: "ok" }));

const port = Number(process.env.PORT) || 3000;

const server = Bun.serve({
  port,
  fetch: app.fetch,
});

console.log(`Nomad API running on http://${server.hostname}:${server.port}`);
