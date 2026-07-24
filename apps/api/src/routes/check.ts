import type { FastifyInstance } from "fastify";
import { config } from "../lib/config.js";
import { getAgent, logCall } from "../lib/db.js";
import { buildFullReport, buildBasicReport } from "../lib/report.js";
import { TtlCache } from "../lib/cache.js";
import { requirePayment } from "../lib/x402.js";
import type { FullReport } from "../lib/report.js";

const reportCache = new TtlCache<FullReport>(config.reportCacheMs);

const AGENT_ID_RE = /^0x[0-9a-fA-F]{8,64}$/;

interface CheckQuery {
  agent_id?: string;
  depth?: string;
}

export async function checkRoutes(app: FastifyInstance): Promise<void> {
  // GET /check — the paid product. Full report behind x402.
  app.get<{ Querystring: CheckQuery }>("/check", async (request, reply) => {
    const { agent_id, depth = "standard" } = request.query;

    if (!agent_id || !AGENT_ID_RE.test(agent_id)) {
      return reply.code(400).send({
        error: {
          code: "INVALID_AGENT_ID",
          message: "agent_id must be a 0x-prefixed hex string.",
        },
      });
    }

    const payment = await requirePayment(request, reply);
    if (payment === null) {
      // 402 already sent. Log the metered attempt so /stats reflects demand.
      await logCall("check", agent_id, false);
      return reply;
    }

    const rec = await getAgent(agent_id);
    if (!rec) {
      await logCall("check", agent_id, payment.paid);
      return reply.code(404).send({
        error: {
          code: "AGENT_NOT_FOUND",
          message:
            "No settlement history on record for this agent — treat as unknown, not as safe.",
        },
      });
    }

    await logCall("check", agent_id, payment.paid);

    if (depth === "basic") {
      return reply.send(buildBasicReport(rec));
    }

    const cacheKey = `${agent_id}:standard`;
    const cached = reportCache.get(cacheKey);
    if (cached) return reply.send(cached);

    const report = buildFullReport(rec);
    reportCache.set(cacheKey, report);
    return reply.send(report);
  });

  // GET /check/basic — free. Band + sample size only. Zero friction for judges.
  app.get<{ Querystring: CheckQuery }>(
    "/check/basic",
    async (request, reply) => {
      const { agent_id } = request.query;

      if (!agent_id || !AGENT_ID_RE.test(agent_id)) {
        return reply.code(400).send({
          error: {
            code: "INVALID_AGENT_ID",
            message: "agent_id must be a 0x-prefixed hex string.",
          },
        });
      }

      await logCall("check_basic", agent_id, false);

      const rec = await getAgent(agent_id);
      if (!rec) {
        return reply.code(404).send({
          error: {
            code: "AGENT_NOT_FOUND",
            message:
              "No settlement history on record for this agent — treat as unknown, not as safe.",
          },
        });
      }

      return reply.send(buildBasicReport(rec));
    },
  );
}
