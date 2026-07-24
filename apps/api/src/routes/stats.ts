import type { FastifyInstance } from "fastify";
import { getStats } from "../lib/db.js";

/**
 * GET /stats — free, never cached (§13). The public traction counter the
 * landing page renders live. Revenue Rocket is judged on this number, so it
 * reads straight from call_log every request.
 */
export async function statsRoutes(app: FastifyInstance): Promise<void> {
  app.get("/stats", async (_request, reply) => {
    const s = await getStats();
    reply.header("cache-control", "no-store");
    return reply.send({
      agents_indexed: s.agents_indexed,
      calls_served: s.calls_served,
      paid_calls: s.paid_calls,
      marketplace_dispute_rate: Number(s.marketplace_dispute_rate.toFixed(4)),
      last_indexed_block: s.last_indexed_block,
      generated_at: new Date().toISOString(),
    });
  });
}
