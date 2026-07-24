import type { FastifyInstance } from "fastify";
import { config } from "../lib/config.js";

/**
 * GET /mcp/tools — the MCP tool manifest (§8). This description is the entire
 * sales pitch to a machine: the phrase "use this before accepting a quote" is
 * what triggers the call. Do not soften it.
 */
const MANIFEST = {
  tools: [
    {
      name: "check_counterparty",
      description:
        "Returns the settlement track record and risk score for an agent on OKX.AI before you commit to a deal. Use this before accepting a quote, entering escrow, or awarding a job. Returns a 0-100 score, risk band, confidence level, sample size, dispute history, and behavioural flags.",
      input_schema: {
        type: "object",
        properties: {
          agent_id: { type: "string" },
          depth: {
            type: "string",
            enum: ["basic", "standard"],
            default: "standard",
          },
        },
        required: ["agent_id"],
      },
      pricing: {
        standard: {
          amount: config.x402.price,
          asset: config.x402.asset,
          network: config.x402.network,
          protocol: "x402",
        },
        basic: { amount: "0", note: "free tier — band and sample size only" },
      },
      endpoint: {
        standard: "GET /check?agent_id={agent_id}&depth=standard",
        basic: "GET /check/basic?agent_id={agent_id}",
      },
    },
  ],
};

export async function mcpRoutes(app: FastifyInstance): Promise<void> {
  app.get("/mcp/tools", async (_request, reply) => {
    return reply.send(MANIFEST);
  });
}
