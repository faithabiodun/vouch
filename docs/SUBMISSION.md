# Submission — Google Form draft

[Form link](https://docs.google.com/forms/d/e/1FAIpQLSfIAgP_WmMGtZ5qyW_LnKZonsjyfOYwV3bduRwiuN4oBmcqjQ/viewform)
· six fields. Draft answers below; fill the bracketed ones once listing + socials
are done.

| Field | Answer |
|---|---|
| **ASP Name** | VOUCH |
| **Agent ID** | `[assigned on OKX.AI listing — paste here]` |
| **ASP Description** | VOUCH is a counterparty reputation service for the OKX.AI agent marketplace. It indexes every settlement and dispute on X Layer, builds a per-agent track record, and sells a single lookup — `check_counterparty(agent_id)` — as a paid MCP endpoint at $0.004/call. Returns a 0–100 risk score, band, confidence (which tracks sample size, never the score), dispute history, and six behavioural flags including an anti-gaming SINGLE_DOMINANT_COUNTERPARTY signal. A free `/check/basic` tier removes all friction. Built for agents to call before accepting a quote or entering escrow. |
| **X Account Handle** | `[@yourhandle]` |
| **X Participation Post link** | `[link to tweet 1 — must contain #OKXAI and the ≤90s demo video]` |
| **Telegram Handle** | `[@yourhandle]` |

## X thread plan (§12)

- **Tweet 1** — the ≤90s demo video (agent paying, 402 → payment → 200 → report),
  `#OKXAI`. Video goes in tweet 1, not a reply.
- **Replies, every few hours** — a real report screenshot each time. Social Buzz
  rewards consistency over one perfect thread.

## Demo script (90s, §12)

| Time | On screen |
|---|---|
| 0:00–0:20 | Two agents negotiate a job, escrow opens, dispute notice appears |
| 0:20–0:35 | Buyer calls `check_counterparty`; terminal shows 402 → payment → 200 |
| 0:35–0:55 | Report renders: score 31, HIGH_RISK, SINGLE_DOMINANT_COUNTERPARTY |
| 0:55–1:10 | Buyer declines, routes to a TRUSTED provider. No human touched this |
| 1:10–1:30 | Live `/stats` counter, then Agent ID and URL |

Two terminal panes and a browser. No slides, no face cam. Real transactions.
The landing page's auto-streaming report card doubles as B-roll — record the
screen instead of building a separate demo.

## Pre-submit checklist (§14)

- [ ] §3 validation complete → `VALIDATION.md`
- [ ] Agentic Wallet created
- [ ] ASP submitted for listing (start the ~24h review clock early)
- [ ] `/check/basic` live and free
- [ ] `/check` live behind x402
- [ ] Indexer running with a persisted cursor
- [ ] Scoring formula on landing page + `SCORING.md`
- [ ] `call_log` recording every request
- [ ] Frontend live: grey/black only, streaming card, `/stats` wired
- [ ] **ASP approved and live on OKX.AI** ← without this the entry is invalid
- [ ] 90s demo recorded (agent paying, not a human typing)
- [ ] X thread posted, `#OKXAI`, video in tweet 1
- [ ] Google Form submitted with all six fields
