import { ideaCreateSchema, tripCreateSchema, tripUpdateSchema } from "@nomad/shared";
import { Hono } from "hono";
import { type AuthEnv, authMiddleware } from "../middleware/auth";
import { tripService } from "../services/trip";

export const tripsRouter = new Hono<AuthEnv>();
tripsRouter.use(authMiddleware);

tripsRouter.get("/", async (c) => c.json(await tripService.list(c.get("userId"))));

tripsRouter.get("/:id", async (c) =>
  c.json(await tripService.get(c.req.param("id"), c.get("userId")))
);

tripsRouter.post("/", async (c) => {
  const data = tripCreateSchema.parse(await c.req.json());
  return c.json(await tripService.create(c.get("userId"), data), 201);
});

tripsRouter.put("/:id", async (c) => {
  const data = tripUpdateSchema.parse(await c.req.json());
  return c.json(await tripService.update(c.req.param("id"), c.get("userId"), data));
});

tripsRouter.delete("/:id", async (c) =>
  c.json(await tripService.delete(c.req.param("id"), c.get("userId")))
);

tripsRouter.post("/:id/items", async (c) => {
  const data = ideaCreateSchema.parse(await c.req.json());
  return c.json(await tripService.addIdea(c.req.param("id"), c.get("userId"), data), 201);
});

tripsRouter.get("/:id/days", async (c) =>
  c.json(await tripService.listDays(c.req.param("id"), c.get("userId")))
);
