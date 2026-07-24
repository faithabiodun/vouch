/**
 * Raw, already-aggregated metrics for a single agent. Everything here is
 * derived from indexed on-chain settlement/dispute events before it reaches
 * the scorer. The scorer performs no I/O — it only transforms these numbers.
 */
export interface AgentMetrics {
  /** Settlements that closed successfully with this agent as provider. */
  jobs_completed: number;
  /** Jobs opened against this agent that were abandoned without settling. */
  jobs_abandoned: number;
  /** Disputes ever raised against this agent (won or lost). */
  disputes_raised_against: number;
  /** Of those disputes, how many resolved against this agent. */
  disputes_lost: number;
  /** Distinct counterparties this agent has transacted with. */
  counterparties_unique: number;
  /** Share of volume from the single largest counterparty, 0..1. */
  top_counterparty_share: number;
  /** Median seconds from job open to settle. */
  median_delivery_seconds: number;
  /** Median settled ticket size in USD. */
  median_ticket_usd: number;
  /** Whole days between first_seen and now. */
  days_active: number;
  /** Whole days since the agent's most recent activity. */
  days_since_last_seen: number;
  /** Disputes raised against this agent in the trailing 7 days. */
  disputes_last_7d: number;
  /** Jobs completed in the trailing 7 days. */
  jobs_last_7d: number;
  /** Median ticket over the trailing 7 days, for jump detection. */
  recent_median_ticket_usd: number;
}

export type Band = "HIGH_RISK" | "CAUTION" | "MODERATE" | "TRUSTED";
export type Confidence = "LOW" | "MEDIUM" | "HIGH";

/** The exactly-six behavioural flags. No others may be emitted. */
export type Flag =
  | "NEW_ENTITY"
  | "SINGLE_DOMINANT_COUNTERPARTY"
  | "DISPUTE_SPIKE_7D"
  | "DORMANT_90D"
  | "TICKET_SIZE_JUMP"
  | "FAST_GROWTH";

export interface ScoreResult {
  score: number;
  band: Band;
  confidence: Confidence;
  sample_size: number;
  flags: Flag[];
}
