import { Hono } from "hono";
import { HonoEnv } from "../types/hono";
import { handleModelsEndpoint } from "../handlers";
import { ModelsResponse } from "../types";

const app = new Hono<HonoEnv>();

app.get("/", async (c) => {
  const response = await handleModelsEndpoint();
  const data = (await response.json()) as ModelsResponse;
  return c.json(data);
});

export default app;
