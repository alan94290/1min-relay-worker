import { Hono } from "hono";
import { HonoEnv } from "../types/hono";
import modelsRoutes from "./models";
import chatRoutes from "./chat";
import responsesRoutes from "./responses";
import imagesRoutes from "./images";

const app = new Hono<HonoEnv>();

app.route("/models", modelsRoutes);
app.route("/chat", chatRoutes);
app.route("/responses", responsesRoutes);
app.route("/images", imagesRoutes);

export default app;
