import { serve } from "bun";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { api } from "./api";
import index from "./index.html";

const app = new Hono();

// Enable CORS for API
app.use(
  "/api/*",
  cors({
    origin: "*",
    allowMethods: ["GET", "POST", "OPTIONS"],
    allowHeaders: ["Content-Type"],
  })
);

// Mount API routes
app.route("/api", api);

// Use Bun.serve with Hono for the API routes, and HTML import for frontend
const server = serve({
  routes: {
    // API endpoint handled by Hono
    "/api/*": (req) => app.fetch(req),

    // Serve frontend for all other routes
    "/*": index,
  },

  development: process.env.NODE_ENV !== "production" && {
    hmr: true,
    console: true,
  },
});

console.log(`🚀 Server running at ${server.url}`);
