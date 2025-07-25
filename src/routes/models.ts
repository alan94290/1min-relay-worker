import { Hono } from "hono";
import { HonoEnv } from "../types/hono";
import { handleModelsEndpoint } from "../handlers";

const app = new Hono<HonoEnv>();

app.get("/", async (c) => {
  const response = await handleModelsEndpoint();
  return c.json(await response.json());
});

export default app;
