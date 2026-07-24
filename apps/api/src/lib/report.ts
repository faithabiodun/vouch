import { scoreAgent } from "@vouch/scoring";
import type { AgentMetrics, ScoreResult } from "@vouch/scoring";
import type { AgentRecord } from "./db.js";

export interface FullReport {
  agent_id: string;
  score: number;
  band: ScoreResult["band"];
  confidence: ScoreResult["confidence"];
  sample_size: number;
  first_seen: string;
  record: {
    jobs_completed: number;
    jobs_abandoned: number;
    disputes_raised_against: number;
    disputes_lost: number;
    median_delivery_seconds: number;
    median_ticket_usd: number;
    counterparties_unique: number;
    top_counterparty_share: number;
  };
  flags: string[];
  summary: string;
  generated_at: string;
  stale?: boolean;
}

export interface BasicReport {
  agent_id: string;
  band: ScoreResult["band"];
  sample_size: number;
  confidence: ScoreResult["confidence"];
  generated_at: string;
}

const shortDate = (iso: string): string =>
  new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });

const roundHours = (seconds: number): string => {
  if (seconds <= 0) return "under an hour";
  const h = seconds / 3600;
  if (h < 1) return `~${Math.round(seconds / 60)}m`;
  return `~${h % 1 === 0 ? h : h.toFixed(1)}h`;
};

/**
 * Deterministic, template-built summary written FOR A MACHINE to paste into its
 * own reasoning (§5). No LLM call — the latency budget is 200ms p95. One
 * paragraph, concrete numbers, states the caveat explicitly.
 */
function buildSummary(m: AgentMetrics, r: ScoreResult, firstSeen: string): string {
  if (r.flags.includes("NEW_ENTITY") && m.jobs_completed === 0) {
    return "No settlement history on record — treat as unknown, not as safe. There is not yet enough on-chain activity to score this agent.";
  }

  const parts: string[] = [];
  parts.push(`${m.jobs_completed} jobs since ${shortDate(firstSeen)}.`);

  if (m.disputes_raised_against > 0) {
    const lost =
      m.disputes_lost > 0 ? `, ${m.disputes_lost} lost` : ", none lost";
    parts.push(
      `${m.disputes_raised_against} dispute${m.disputes_raised_against === 1 ? "" : "s"} raised against it${lost}.`,
    );
  } else {
    parts.push("No disputes on record.");
  }

  if (m.jobs_completed > 0) {
    parts.push(`Delivers in ${roundHours(m.median_delivery_seconds)} median.`);
  }

  if (r.flags.includes("SINGLE_DOMINANT_COUNTERPARTY")) {
    const pct = Math.round(m.top_counterparty_share * 100);
    parts.push(
      `${pct}% of volume comes from one counterparty — treat the track record as less independent than the job count suggests.`,
    );
  }
  if (r.flags.includes("NEW_ENTITY")) {
    parts.push(
      "Fewer than five settlements: confidence is LOW, lean on this lightly.",
    );
  }
  if (r.flags.includes("DISPUTE_SPIKE_7D")) {
    parts.push("Disputes have spiked in the last 7 days.");
  }
  if (r.flags.includes("DORMANT_90D")) {
    parts.push("Inactive for over 90 days — the record may be stale.");
  }
  if (r.flags.includes("TICKET_SIZE_JUMP")) {
    parts.push(
      "Recent ticket sizes are far above its historical median — a behaviour change worth noting.",
    );
  }

  return parts.join(" ");
}

export function buildFullReport(rec: AgentRecord, stale = false): FullReport {
  const r = scoreAgent(rec.metrics);
  const m = rec.metrics;
  const report: FullReport = {
    agent_id: rec.agent_id,
    score: r.score,
    band: r.band,
    confidence: r.confidence,
    sample_size: r.sample_size,
    first_seen: rec.first_seen,
    record: {
      jobs_completed: m.jobs_completed,
      jobs_abandoned: m.jobs_abandoned,
      disputes_raised_against: m.disputes_raised_against,
      disputes_lost: m.disputes_lost,
      median_delivery_seconds: m.median_delivery_seconds,
      median_ticket_usd: Number(m.median_ticket_usd.toFixed(2)),
      counterparties_unique: m.counterparties_unique,
      top_counterparty_share: Number(m.top_counterparty_share.toFixed(2)),
    },
    flags: r.flags,
    summary: buildSummary(m, r, rec.first_seen),
    generated_at: new Date().toISOString(),
  };
  if (stale) report.stale = true;
  return report;
}

export function buildBasicReport(rec: AgentRecord): BasicReport {
  const r = scoreAgent(rec.metrics);
  return {
    agent_id: rec.agent_id,
    band: r.band,
    sample_size: r.sample_size,
    confidence: r.confidence,
    generated_at: new Date().toISOString(),
  };
}
