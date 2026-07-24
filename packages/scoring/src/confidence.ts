import type { Confidence } from "./types.js";

/**
 * Confidence tracks sample size ALONE — never the score. A high score on five
 * jobs is still LOW confidence. Below 5 settlements the caller must be told the
 * record is too thin to lean on.
 */
export function confidenceFor(sampleSize: number): Confidence {
  if (sampleSize < 5) return "LOW";
  if (sampleSize < 25) return "MEDIUM";
  return "HIGH";
}
