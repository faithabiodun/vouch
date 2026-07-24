import { describe, it, expect, beforeAll, afterAll } from "vitest";
import type { FastifyInstance } from "fastify";
import { buildServer } from "./server.js";
import { DEFAULT_DEMO_AGENT_ID } from "./lib/demo.js";

let app: FastifyInstance;

beforeAll(async () => {
  app = await buildServer();
});
afterAll(async () => {
  await app.close();
});

describe("API (demo mode)", () => {
  it("GET /health reports demo mode", async () => {
    const res = await app.inject({ method: "GET", url: "/health" });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({ status: "ok", mode: "demo" });
  });

  it("GET /mcp/tools exposes check_counterparty with the trigger phrase", async () => {
    const res = await app.inject({ method: "GET", url: "/mcp/tools" });
    expect(res.statusCode).toBe(200);
    const tool = res.json().tools[0];
    expect(tool.name).toBe("check_counterparty");
    expect(tool.description).toContain("before you commit to a deal");
  });

  it("GET /check returns a full report for the demo agent (bypass on)", async () => {
    const res = await app.inject({
      method: "GET",
      url: `/check?agent_id=${DEFAULT_DEMO_AGENT_ID}`,
    });
    expect(res.statusCode).toBe(200);
    const r = res.json();
    expect(r.agent_id).toBe(DEFAULT_DEMO_AGENT_ID);
    expect(r.band).toBe("HIGH_RISK");
    expect(r.flags).toContain("SINGLE_DOMINANT_COUNTERPARTY");
    expect(typeof r.summary).toBe("string");
    expect(r.generated_at).toBeTruthy();
  });

  it("GET /check/basic returns only band + sample size", async () => {
    const res = await app.inject({
      method: "GET",
      url: `/check/basic?agent_id=${DEFAULT_DEMO_AGENT_ID}`,
    });
    expect(res.statusCode).toBe(200);
    const r = res.json();
    expect(r).toHaveProperty("band");
    expect(r).toHaveProperty("sample_size");
    expect(r).not.toHaveProperty("score");
  });

  it("rejects a malformed agent_id", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/check?agent_id=not-an-address",
    });
    expect(res.statusCode).toBe(400);
    expect(res.json().error.code).toBe("INVALID_AGENT_ID");
  });

  it("404s an unknown but well-formed agent_id", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/check?agent_id=0xdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef",
    });
    expect(res.statusCode).toBe(404);
    expect(res.json().error.code).toBe("AGENT_NOT_FOUND");
  });

  it("GET /stats is never cached and reports demo counts", async () => {
    const res = await app.inject({ method: "GET", url: "/stats" });
    expect(res.statusCode).toBe(200);
    expect(res.headers["cache-control"]).toBe("no-store");
    expect(res.json()).toHaveProperty("agents_indexed");
  });
});

describe("API (paid mode, no bypass)", () => {
  it("GET /check returns 402 with challenge headers when payment required", async () => {
    // Rebuild with bypass forced off via a fresh env.
    process.env.X402_BYPASS = "false";
    const paidApp = await buildServer();
    const res = await paidApp.inject({
      method: "GET",
      url: `/check?agent_id=${DEFAULT_DEMO_AGENT_ID}`,
    });
    expect(res.statusCode).toBe(402);
    expect(res.headers["x-402-recipient"]).toBeTruthy();
    expect(res.json().error.code).toBe("PAYMENT_REQUIRED");
    await paidApp.close();
    process.env.X402_BYPASS = "true";
  });
});
