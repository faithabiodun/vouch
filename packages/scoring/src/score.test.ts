import { describe, it, expect } from "vitest";
import {
  scoreAgent,
  computeScore,
  bandFor,
  confidenceFor,
  computeFlags,
} from "./index.js";
import type { AgentMetrics } from "./types.js";

/** A clean, empty-history baseline. Override only what a test cares about. */
function metrics(over: Partial<AgentMetrics> = {}): AgentMetrics {
  return {
    jobs_completed: 0,
    jobs_abandoned: 0,
    disputes_raised_against: 0,
    disputes_lost: 0,
    counterparties_unique: 0,
    top_counterparty_share: 0,
    median_delivery_seconds: 0,
    median_ticket_usd: 0,
    days_active: 0,
    days_since_last_seen: 0,
    disputes_last_7d: 0,
    jobs_last_7d: 0,
    recent_median_ticket_usd: 0,
    ...over,
  };
}

describe("computeScore", () => {
  it("returns the base score for a zero-history agent", () => {
    // base 50, no credits or penalties apply.
    expect(computeScore(metrics())).toBe(50);
  });

  it("rewards a clean completion record", () => {
    const s = computeScore(
      metrics({ jobs_completed: 50, days_active: 30, counterparties_unique: 20 }),
    );
    expect(s).toBeGreaterThan(80);
  });

  it("punishes abandonment via completion_rate", () => {
    const clean = computeScore(metrics({ jobs_completed: 40 }));
    const messy = computeScore(
      metrics({ jobs_completed: 40, jobs_abandoned: 40 }),
    );
    expect(messy).toBeLessThan(clean);
  });

  it("makes a lost dispute cost more than a won one", () => {
    const won = computeScore(
      metrics({ jobs_completed: 30, disputes_raised_against: 3, disputes_lost: 0 }),
    );
    const lost = computeScore(
      metrics({ jobs_completed: 30, disputes_raised_against: 3, disputes_lost: 3 }),
    );
    expect(lost).toBeLessThan(won);
  });

  it("applies a concentration penalty only above 40% share", () => {
    const diffuse = computeScore(
      metrics({ jobs_completed: 30, top_counterparty_share: 0.3 }),
    );
    const concentrated = computeScore(
      metrics({ jobs_completed: 30, top_counterparty_share: 0.9 }),
    );
    expect(concentrated).toBeLessThan(diffuse);
  });

  it("clamps to the 0..100 range", () => {
    const floor = computeScore(
      metrics({
        jobs_completed: 1,
        jobs_abandoned: 100,
        disputes_raised_against: 50,
        disputes_lost: 50,
        top_counterparty_share: 1,
      }),
    );
    expect(floor).toBeGreaterThanOrEqual(0);
    expect(floor).toBeLessThanOrEqual(100);
  });
});

describe("bandFor", () => {
  it("maps scores to bands at the documented boundaries", () => {
    expect(bandFor(0)).toBe("HIGH_RISK");
    expect(bandFor(39)).toBe("HIGH_RISK");
    expect(bandFor(40)).toBe("CAUTION");
    expect(bandFor(59)).toBe("CAUTION");
    expect(bandFor(60)).toBe("MODERATE");
    expect(bandFor(79)).toBe("MODERATE");
    expect(bandFor(80)).toBe("TRUSTED");
    expect(bandFor(100)).toBe("TRUSTED");
  });
});

describe("confidenceFor", () => {
  it("keys off sample size alone at the documented boundaries", () => {
    expect(confidenceFor(0)).toBe("LOW");
    expect(confidenceFor(4)).toBe("LOW");
    expect(confidenceFor(5)).toBe("MEDIUM");
    expect(confidenceFor(24)).toBe("MEDIUM");
    expect(confidenceFor(25)).toBe("HIGH");
    expect(confidenceFor(500)).toBe("HIGH");
  });
});

describe("computeFlags", () => {
  it("flags a thin record as NEW_ENTITY", () => {
    expect(computeFlags(metrics({ jobs_completed: 4 }))).toContain("NEW_ENTITY");
    expect(computeFlags(metrics({ jobs_completed: 5 }))).not.toContain(
      "NEW_ENTITY",
    );
  });

  it("flags a dominant counterparty above 40%", () => {
    expect(
      computeFlags(metrics({ jobs_completed: 30, top_counterparty_share: 0.41 })),
    ).toContain("SINGLE_DOMINANT_COUNTERPARTY");
    expect(
      computeFlags(metrics({ jobs_completed: 30, top_counterparty_share: 0.4 })),
    ).not.toContain("SINGLE_DOMINANT_COUNTERPARTY");
  });

  it("flags a 7-day dispute spike", () => {
    expect(
      computeFlags(metrics({ jobs_completed: 30, disputes_last_7d: 2 })),
    ).toContain("DISPUTE_SPIKE_7D");
  });

  it("flags dormancy at 90 days", () => {
    expect(
      computeFlags(metrics({ jobs_completed: 30, days_since_last_seen: 90 })),
    ).toContain("DORMANT_90D");
  });

  it("flags a ticket-size jump", () => {
    expect(
      computeFlags(
        metrics({
          jobs_completed: 30,
          median_ticket_usd: 4,
          recent_median_ticket_usd: 40,
        }),
      ),
    ).toContain("TICKET_SIZE_JUMP");
  });

  it("flags fast growth when the last 7d dominate lifetime volume", () => {
    expect(
      computeFlags(metrics({ jobs_completed: 8, jobs_last_7d: 6 })),
    ).toContain("FAST_GROWTH");
  });

  it("emits only flags from the allowed set", () => {
    const allowed = new Set([
      "NEW_ENTITY",
      "SINGLE_DOMINANT_COUNTERPARTY",
      "DISPUTE_SPIKE_7D",
      "DORMANT_90D",
      "TICKET_SIZE_JUMP",
      "FAST_GROWTH",
    ]);
    const flags = computeFlags(
      metrics({
        jobs_completed: 2,
        top_counterparty_share: 0.9,
        disputes_last_7d: 5,
        days_since_last_seen: 200,
        median_ticket_usd: 1,
        recent_median_ticket_usd: 100,
        jobs_last_7d: 2,
      }),
    );
    for (const f of flags) expect(allowed.has(f)).toBe(true);
  });
});

describe("scoreAgent (integration)", () => {
  it("marks a brand-new agent LOW confidence with NEW_ENTITY", () => {
    const r = scoreAgent(metrics({ jobs_completed: 2, days_active: 1 }));
    expect(r.confidence).toBe("LOW");
    expect(r.flags).toContain("NEW_ENTITY");
    expect(r.sample_size).toBe(2);
  });

  // Documents a KNOWN inconsistency in the spec: §5's example JSON shows
  // score 34 / HIGH_RISK for this record, but the §6 formula (the authoritative,
  // published one) computes ~91 for the same numbers. The formula is the source
  // of truth; the example's 34 is illustrative narrative only. See docs/SCORING.md.
  it("computes the spec §5 example record from the §6 formula", () => {
    const r = scoreAgent(
      metrics({
        jobs_completed: 84,
        jobs_abandoned: 2,
        disputes_raised_against: 3,
        disputes_lost: 1,
        counterparties_unique: 39,
        top_counterparty_share: 0.41,
        median_delivery_seconds: 21600,
        median_ticket_usd: 4.1,
        days_active: 18,
        disputes_last_7d: 3,
      }),
    );
    expect(r.score).toBe(91);
    expect(r.band).toBe("TRUSTED");
    expect(r.confidence).toBe("HIGH");
    expect(r.flags).toContain("SINGLE_DOMINANT_COUNTERPARTY");
    expect(r.flags).toContain("DISPUTE_SPIKE_7D");
  });
});
