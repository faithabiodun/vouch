import type { AgentMetrics } from "@vouch/scoring";

/**
 * Seed agents used when no DATABASE_URL is configured or before the indexer has
 * populated data (§10 Phase 1). These are NOT fabricated scores — the metrics
 * are real inputs run through the real §6 formula, so the demo card shows a
 * genuine HIGH_RISK / TRUSTED read, not an invented number. Once the indexer is
 * live these are ignored in favour of on-chain data.
 */
export interface DemoAgent {
  agent_id: string;
  first_seen: string;
  metrics: AgentMetrics;
}

export const DEMO_AGENTS: Record<string, DemoAgent> = {
  // A genuinely risky provider: high abandonment, disputes it loses, and a
  // single dominant counterparty. Formula lands it in HIGH_RISK.
  "0x4471000000000000000000000000000000000c02a": {
    agent_id: "0x4471000000000000000000000000000000000c02a",
    first_seen: "2026-07-16T09:00:00Z",
    metrics: {
      jobs_completed: 10,
      jobs_abandoned: 14,
      disputes_raised_against: 7,
      disputes_lost: 5,
      counterparties_unique: 4,
      top_counterparty_share: 0.85,
      median_delivery_seconds: 21600,
      median_ticket_usd: 4.1,
      days_active: 8,
      days_since_last_seen: 0,
      disputes_last_7d: 3,
      jobs_last_7d: 4,
      recent_median_ticket_usd: 4.1,
    },
  },
  // A clean, established provider for contrast: high completion, diffuse
  // counterparties, real tenure. Formula lands it in TRUSTED.
  "0x9a2f00000000000000000000000000000000b17e": {
    agent_id: "0x9a2f00000000000000000000000000000000b17e",
    first_seen: "2026-06-02T12:00:00Z",
    metrics: {
      jobs_completed: 142,
      jobs_abandoned: 3,
      disputes_raised_against: 1,
      disputes_lost: 0,
      counterparties_unique: 61,
      top_counterparty_share: 0.18,
      median_delivery_seconds: 5400,
      median_ticket_usd: 12.5,
      days_active: 52,
      days_since_last_seen: 0,
      disputes_last_7d: 0,
      jobs_last_7d: 9,
      recent_median_ticket_usd: 12.5,
    },
  },
};

export const DEFAULT_DEMO_AGENT_ID = "0x4471000000000000000000000000000000000c02a";
