import type { FastifyInstance } from "fastify";
import { usingDatabase } from "../lib/db.js";

/** GET /health — uptime and mode. Free. */
export async function healthRoutes(app: FastifyInstance): Promise<void> {
  app.get("/health", async (_request, reply) => {
    return reply.send({
      status: "ok",
      mode: usingDatabase ? "database" : "demo",
      uptime_seconds: Math.round(process.uptime()),
      generated_at: new Date().toISOString(),
    });
  });
}
