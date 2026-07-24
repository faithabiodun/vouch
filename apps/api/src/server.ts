import Fastify from "fastify";
import type { FastifyError } from "fastify";
import cors from "@fastify/cors";
import fastifyStatic from "@fastify/static";
import { pathToFileURL, fileURLToPath } from "node:url";
import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { config } from "./lib/config.js";
import { checkRoutes } from "./routes/check.js";
import { statsRoutes } from "./routes/stats.js";
import { mcpRoutes } from "./routes/mcp.js";
import { healthRoutes } from "./routes/health.js";

export async function buildServer() {
  const app = Fastify({
    logger: config.nodeEnv === "development",
    // Every response carries generated_at from the routes themselves.
  });

  await app.register(cors, {
    origin: config.corsOrigin.includes("*") ? true : config.corsOrigin,
    exposedHeaders: [
      "x-402-price",
      "x-402-asset",
      "x-402-recipient",
      "x-402-network",
    ],
  });

  // Uniform error shape (§13): { error: { code, message } }, never a bare string.
  app.setErrorHandler((err: FastifyError, _req, reply) => {
    reply.code(err.statusCode ?? 500).send({
      error: {
        code: "INTERNAL_ERROR",
        message: err.message || "Unexpected error",
      },
    });
  });

  app.setNotFoundHandler((_req, reply) => {
    reply.code(404).send({
      error: { code: "NOT_FOUND", message: "No such route." },
    });
  });

  await app.register(healthRoutes);
  await app.register(statsRoutes);
  await app.register(mcpRoutes);
  await app.register(checkRoutes);

  // Serve the landing page from the same origin as the API, so the frontend
  // talks to the backend over the exact public endpoints an external agent
  // uses (§4). API routes above are explicit and take precedence; everything
  // else falls through to the static site. Skipped if the web dir isn't present.
  const webDir =
    process.env.WEB_DIR ??
    resolve(dirname(fileURLToPath(import.meta.url)), "../../../apps/web");
  if (existsSync(webDir)) {
    await app.register(fastifyStatic, { root: webDir, index: "index.html" });
  }

  return app;
}

// Start only when run directly (not when imported by tests).
const isMain =
  process.argv[1] !== undefined &&
  import.meta.url === pathToFileURL(process.argv[1]).href;
if (isMain) {
  buildServer()
    .then((app) =>
      app.listen({ port: config.port, host: "0.0.0.0" }).then(() => {
        app.log?.info?.(`VOUCH API listening on :${config.port}`);
      }),
    )
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
