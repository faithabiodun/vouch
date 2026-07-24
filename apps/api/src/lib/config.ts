import "dotenv/config";

const bool = (v: string | undefined, dflt: boolean): boolean =>
  v === undefined ? dflt : v === "true" || v === "1";

export const config = {
  port: Number(process.env.PORT ?? 8080),
  nodeEnv: process.env.NODE_ENV ?? "development",
  corsOrigin: (process.env.CORS_ORIGIN ?? "*").split(",").map((s) => s.trim()),
  databaseUrl: process.env.DATABASE_URL ?? "",
  x402: {
    recipient: process.env.X402_RECIPIENT ?? "0xYourASPWallet",
    price: process.env.X402_PRICE_USDC ?? "0.004",
    asset: process.env.X402_ASSET ?? "USDC",
    network: process.env.X402_NETWORK ?? "xlayer",
    /** When true, /check answers without payment — for local dev and the demo fallback. */
    bypass: bool(process.env.X402_BYPASS, true),
  },
  /** How far the indexer may lag before /check marks reports "stale": true. */
  staleBlockThreshold: 200,
  /** Report cache TTL in ms (§13: cache reports 60s, never cache /stats). */
  reportCacheMs: 60_000,
} as const;
