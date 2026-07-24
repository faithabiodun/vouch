import type { AgentMetrics, Flag } from "./types.js";

/** Sample size below which the record is too thin to trust. */
export const NEW_ENTITY_THRESHOLD = 5;
/** Volume share from one counterparty above which independence is suspect. */
export const DOMINANT_SHARE_THRESHOLD = 0.4;
/** Disputes in the trailing 7 days that constitute a spike. */
export const DISPUTE_SPIKE_THRESHOLD = 2;
/** Days of inactivity after which an agent reads as dormant. */
export const DORMANT_DAYS = 90;
/** Multiple of historical median ticket that counts as a jump. */
export const TICKET_JUMP_MULTIPLE = 3;
/** Trailing-7d job count above which rapid ramp is considered. */
export const FAST_GROWTH_MIN_JOBS = 5;
/** Share of lifetime jobs concentrated in the last 7 days to flag growth. */
export const FAST_GROWTH_SHARE = 0.5;

/**
 * Emits the behavioural flags a scalar score cannot carry. Exactly the six
 * flags in the type may ever be returned. SINGLE_DOMINANT_COUNTERPARTY is the
 * anti-gaming signal: it catches an agent farming reputation against its own
 * sock puppet.
 */
export function computeFlags(m: AgentMetrics): Flag[] {
  const flags: Flag[] = [];
  const sampleSize = m.jobs_completed;

  if (sampleSize < NEW_ENTITY_THRESHOLD) {
    flags.push("NEW_ENTITY");
  }

  if (m.top_counterparty_share > DOMINANT_SHARE_THRESHOLD) {
    flags.push("SINGLE_DOMINANT_COUNTERPARTY");
  }

  if (m.disputes_last_7d >= DISPUTE_SPIKE_THRESHOLD) {
    flags.push("DISPUTE_SPIKE_7D");
  }

  if (m.days_since_last_seen >= DORMANT_DAYS) {
    flags.push("DORMANT_90D");
  }

  if (
    m.median_ticket_usd > 0 &&
    m.recent_median_ticket_usd >= m.median_ticket_usd * TICKET_JUMP_MULTIPLE
  ) {
    flags.push("TICKET_SIZE_JUMP");
  }

  if (
    m.jobs_last_7d >= FAST_GROWTH_MIN_JOBS &&
    m.jobs_last_7d / Math.max(m.jobs_completed, 1) > FAST_GROWTH_SHARE
  ) {
    flags.push("FAST_GROWTH");
  }

  return flags;
}
