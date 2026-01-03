import { serve } from "bun";
import { Hono } from "hono";
import { trpcServer } from "@hono/trpc-server";
import { cors } from "hono/cors";
import { appRouter } from "./router";
import index from "./index.html";

const app = new Hono();

// Enable CORS for tRPC
app.use(
  "/trpc/*",
  cors({
    origin: "*",
    allowMethods: ["GET", "POST", "OPTIONS"],
    allowHeaders: ["Content-Type"],
  })
);

// Mount tRPC
app.use(
  "/trpc/*",
  trpcServer({
    router: appRouter,
  })
);

// Use Bun.serve with Hono for the API routes, and HTML import for frontend
const server = serve({
  routes: {
    // tRPC endpoint handled by Hono
    "/trpc/*": (req) => app.fetch(req),
    
    // Serve frontend for all other routes
    "/*": index,
  },

  development: process.env.NODE_ENV !== "production" && {
    hmr: true,
    console: true,
  },
});

console.log(`🚀 Server running at ${server.url}`);
