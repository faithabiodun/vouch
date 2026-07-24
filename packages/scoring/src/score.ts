import type { AgentMetrics, Band } from "./types.js";

const clamp = (n: number, lo: number, hi: number): number =>
  Math.max(lo, Math.min(hi, n));

/**
 * The published VOUCH score. Deterministic, pure, and identical to the formula
 * in docs/SCORING.md and on the landing page — transparency is the product.
 *
 * A dispute costs points even when won (friction is expensive regardless of who
 * was right); losing compounds via the dispute_rate * loss_rate term.
 */
export function computeScore(m: AgentMetrics): number {
  const base = 50;

  const totalJobs = m.jobs_completed + m.jobs_abandoned;
  const completion_rate = totalJobs > 0 ? m.jobs_completed / totalJobs : 0;

  const dispute_rate = m.disputes_raised_against / Math.max(m.jobs_completed, 1);
  const loss_rate =
    m.disputes_lost / Math.max(m.disputes_raised_against, 1);

  const volume_credit = Math.min(1, Math.log10(1 + m.jobs_completed) / 2);
  const tenure_credit = Math.min(1, Math.log10(1 + m.days_active) / 2);
  const concentration_penalty = Math.max(
    0,
    (m.top_counterparty_share - 0.4) / 0.6,
  );

  const score =
    base +
    30 * completion_rate +
    10 * volume_credit +
    5 * tenure_credit -
    25 * dispute_rate -
    20 * dispute_rate * loss_rate -
    15 * concentration_penalty;

  return clamp(Math.round(score), 0, 100);
}

/** Map a 0..100 score to its risk band. */
export function bandFor(score: number): Band {
  if (score <= 39) return "HIGH_RISK";
  if (score <= 59) return "CAUTION";
  if (score <= 79) return "MODERATE";
  return "TRUSTED";
}
