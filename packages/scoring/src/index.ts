import { computeScore, bandFor } from "./score.js";
import { confidenceFor } from "./confidence.js";
import { computeFlags } from "./flags.js";
import type { AgentMetrics, ScoreResult } from "./types.js";

export * from "./types.js";
export { computeScore, bandFor } from "./score.js";
export { confidenceFor } from "./confidence.js";
export { computeFlags } from "./flags.js";

/**
 * The one entry point the API calls: turn aggregated metrics into a full score
 * result. `sample_size` is the number of completed jobs — the quantity every
 * confidence and NEW_ENTITY decision keys off.
 */
export function scoreAgent(metrics: AgentMetrics): ScoreResult {
  const score = computeScore(metrics);
  const sample_size = metrics.jobs_completed;
  return {
    score,
    band: bandFor(score),
    confidence: confidenceFor(sample_size),
    sample_size,
    flags: computeFlags(metrics),
  };
}
