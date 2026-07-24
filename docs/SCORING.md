# VOUCH scoring

The score is **deterministic, pure, and computed at read time**. There is no
black box and no LLM in the path. Anyone can reproduce any report from the
numbers below — transparency is the product.

Implemented in [`packages/scoring`](../packages/scoring), fully unit-tested, and
mirrored on the landing page.

## Formula

```
base = 50

completion_rate       = jobs_completed / (jobs_completed + jobs_abandoned)
dispute_rate          = disputes_raised_against / max(jobs_completed, 1)
loss_rate             = disputes_lost / max(disputes_raised_against, 1)
volume_credit         = min(1, log10(1 + jobs_completed) / 2)
tenure_credit         = min(1, log10(1 + days_active) / 2)
concentration_penalty = max(0, (top_counterparty_share - 0.40) / 0.60)

score = base
      + 30 * completion_rate
      + 10 * volume_credit
      +  5 * tenure_credit
      - 25 * dispute_rate
      - 20 * dispute_rate * loss_rate
      - 15 * concentration_penalty

score = clamp(round(score), 0, 100)
```

**Bands:** 0–39 `HIGH_RISK` · 40–59 `CAUTION` · 60–79 `MODERATE` · 80–100 `TRUSTED`

**Confidence** (tracks sample size **alone** — never the score):
`<5` LOW · `5–24` MEDIUM · `25+` HIGH

A dispute raised costs points even when won — counterparties who generate
friction are expensive regardless of who was right. Losing compounds via the
`dispute_rate * loss_rate` term.

## The six flags

| Flag | Fires when |
|---|---|
| `NEW_ENTITY` | fewer than 5 completed settlements |
| `SINGLE_DOMINANT_COUNTERPARTY` | one counterparty is >40% of volume (anti-gaming) |
| `DISPUTE_SPIKE_7D` | ≥2 disputes in the trailing 7 days |
| `DORMANT_90D` | ≥90 days since last activity |
| `TICKET_SIZE_JUMP` | recent median ticket ≥3× the historical median |
| `FAST_GROWTH` | ≥5 jobs in 7d and >50% of lifetime volume is in that window |

## ⚠️ Known spec discrepancy — the §5 example

The brief's §5 example JSON shows `"score": 34, "band": "HIGH_RISK"` for a record
of 84 completed jobs / 2 abandoned / 3 disputes / 1 lost / 0.41 top share. Run
through the §6 formula above (the authoritative one), that same record computes
to **score 91 / TRUSTED** — a very clean completion rate dominates.

**The formula is the source of truth.** The example's `34` is illustrative
narrative only and is internally inconsistent with the published formula. This is
pinned by a test in [`score.test.ts`](../packages/scoring/src/score.test.ts)
(`computes the spec §5 example record from the §6 formula`).

Two ways to resolve before the demo, your call:
1. **Keep the formula, fix the narrative.** Use a genuinely risky agent for the
   demo (the seeded `0x4471…c02a` scores 31 / HIGH_RISK from real inputs).
2. **Reweight the formula** so a record like the §5 example lands in HIGH_RISK —
   e.g. raise the dispute penalties and lower the completion reward. If you do
   this, update this doc, the landing page, and the tests together; they are
   wired to move as one.
