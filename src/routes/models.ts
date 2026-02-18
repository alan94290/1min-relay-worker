import { Hono } from "hono";
import { handleModelsEndpoint } from "../handlers";
import type { ModelsResponse } from "../types";
import type { HonoEnv } from "../types/hono";

const app = new Hono<HonoEnv>();

app.get("/", async (c) => {
  const response = await handleModelsEndpoint(c.env);
  const data = (await response.json()) as ModelsResponse;
  return c.json(data);
});

export default app;
