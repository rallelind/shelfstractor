import { serve } from "bun";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { api } from "./api";
import index from "./index.html";

const app = new Hono();

app.use(
  "/api/*",
  cors({
    origin: "*",
    allowMethods: ["GET", "POST", "OPTIONS"],
    allowHeaders: ["Content-Type"],
  })
);

app.route("/api", api);

const server = serve({
  idleTimeout: 120,

  routes: {
    "/api/*": (req) => app.fetch(req),
    "/*": index,
  },

  development: process.env.NODE_ENV !== "production" && {
    hmr: true,
    console: true,
  },
});

console.log(`🚀 Server running at ${server.url}`);
