import { itemUpdateSchema } from "@nomad/shared";
import { Hono } from "hono";
import { type AuthEnv, authMiddleware } from "../middleware/auth";
import { itemService } from "../services/item";

export const itemsRouter = new Hono<AuthEnv>();
itemsRouter.use(authMiddleware);

itemsRouter.put("/:id", async (c) => {
  const data = itemUpdateSchema.parse(await c.req.json());
  return c.json(await itemService.update(c.req.param("id"), c.get("userId"), data));
});

itemsRouter.delete("/:id", async (c) =>
  c.json(await itemService.delete(c.req.param("id"), c.get("userId")))
);
