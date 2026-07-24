import type { FastifyReply, FastifyRequest } from "fastify";
import { config } from "./config.js";

/**
 * x402 payment gate for the paid /check endpoint (§8).
 *
 * Flow: an unpaid request gets HTTP 402 with x-402-* headers describing what to
 * pay and where. The caller pays, retries with proof in the `X-PAYMENT` header,
 * and receives the data. We verify the proof — we do NOT implement a payment
 * system ourselves.
 *
 * Verification is wired through the OKX Payment SDK / an x402 facilitator. Until
 * a facilitator URL and ASP wallet are configured, set X402_BYPASS=true so local
 * dev and the on-stage demo still work if the rails hiccup.
 */
export interface PaymentResult {
  paid: boolean;
  /** True when the request was allowed through the dev/demo bypass, not real payment. */
  bypassed: boolean;
}

function setChallengeHeaders(reply: FastifyReply): void {
  reply.header("x-402-price", config.x402.price);
  reply.header("x-402-asset", config.x402.asset);
  reply.header("x-402-recipient", config.x402.recipient);
  reply.header("x-402-network", config.x402.network);
}

async function verifyProof(proof: string): Promise<boolean> {
  const facilitator = process.env.X402_FACILITATOR_URL;
  if (!facilitator) {
    // No verifier configured yet. Refuse rather than trust an unverified proof.
    return false;
  }
  try {
    const res = await fetch(`${facilitator.replace(/\/$/, "")}/verify`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        proof,
        recipient: config.x402.recipient,
        price: config.x402.price,
        asset: config.x402.asset,
        network: config.x402.network,
      }),
    });
    if (!res.ok) return false;
    const body = (await res.json()) as { valid?: boolean };
    return body.valid === true;
  } catch {
    return false;
  }
}

/**
 * Returns a settled PaymentResult when the request may proceed, or sends a 402
 * (and returns null) when payment is required. The route should stop if null.
 */
/** Read the bypass flag at request time so tests and hot config can flip it. */
function bypassEnabled(): boolean {
  const v = process.env.X402_BYPASS;
  return v === undefined ? config.x402.bypass : v === "true" || v === "1";
}

export async function requirePayment(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<PaymentResult | null> {
  if (bypassEnabled()) {
    return { paid: false, bypassed: true };
  }

  const proof =
    (request.headers["x-payment"] as string | undefined) ??
    (request.headers["x-402-proof"] as string | undefined);

  if (proof && (await verifyProof(proof))) {
    return { paid: true, bypassed: false };
  }

  setChallengeHeaders(reply);
  reply.code(402).send({
    error: {
      code: "PAYMENT_REQUIRED",
      message: `This endpoint costs ${config.x402.price} ${config.x402.asset} on ${config.x402.network}. Pay to ${config.x402.recipient} and retry with proof in the X-PAYMENT header.`,
    },
  });
  return null;
}
