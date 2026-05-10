import { Hono } from "hono";
import { dayUpdateSchema, itemCreateSchema, reorderItemsSchema } from "@nomad/shared";
import { authMiddleware, type AuthEnv } from "../middleware/auth";
import { dayService } from "../services/day";

export const daysRouter = new Hono<AuthEnv>();
daysRouter.use(authMiddleware);

daysRouter.post("/:id/items", async (c) => {
  const data = itemCreateSchema.parse(await c.req.json());
  return c.json(await dayService.addItem(c.req.param("id"), c.get("userId"), data), 201);
});

daysRouter.put("/:id/items/reorder", async (c) => {
  const data = reorderItemsSchema.parse(await c.req.json());
  return c.json(await dayService.reorderItems(c.req.param("id"), c.get("userId"), data));
});

daysRouter.put("/:id", async (c) => {
  const data = dayUpdateSchema.parse(await c.req.json());
  return c.json(await dayService.update(c.req.param("id"), c.get("userId"), data));
});

daysRouter.delete("/:id", async (c) =>
  c.json(await dayService.delete(c.req.param("id"), c.get("userId")))
);
