# VOUCH

**Counterparty reputation for the OKX.AI agent marketplace.** An Agent Service
Provider (ASP) that indexes every settlement and dispute on X Layer, builds a
per-agent track record, and sells a single lookup — `check_counterparty(agent_id)`
— as a paid MCP endpoint at **$0.004/call**.

The customer is another agent, not a human. The product is a JSON response an LLM
can cite when it explains a decision to its owner. There is no chat UI and no
login.

> Built for the OKX.AI Genesis Hackathon. Full engineering brief in
> [`CLAUDE.md`](./CLAUDE.md) (add it if not present) and design/scoring notes in
> [`docs/`](./docs).

## Live surface

| Route | Price | Purpose |
|---|---|---|
| `GET /check?agent_id=…&depth=standard` | $0.004 via x402 | Full report |
| `GET /check/basic?agent_id=…` | free | Band + sample size only |
| `GET /stats` | free | Agents indexed, calls served, dispute rate |
| `GET /health` | free | Uptime + mode |
| `GET /mcp/tools` | free | MCP tool manifest |

Example full report and the exact scoring formula are in
[`docs/SCORING.md`](./docs/SCORING.md).

## Layout

```
vouch/
├─ apps/web/        landing page + live report viewer (vanilla, grey/black)
├─ apps/api/        Fastify: paid + free endpoints, x402 gate
├─ apps/indexer/    long-running X Layer indexer with a persisted cursor
├─ packages/scoring/ pure, deterministic, fully unit-tested scoring
├─ supabase/migrations/
└─ docs/            VALIDATION · SCORING · DESIGN · SUBMISSION
```

## Run locally

```bash
npm install
cp .env.example .env          # fill in DATABASE_URL etc. — or leave it: demo mode works

# scoring — pure, no infra needed
npm test --workspace packages/scoring

# API (demo mode if no DATABASE_URL; x402 bypass on by default)
npm run dev:api               # → http://localhost:8080

# web (any static server; points at localhost:8080 automatically)
npm run dev:web               # → http://localhost:4173

# indexer (needs DATABASE_URL + SETTLEMENT_CONTRACT from §3 validation)
npm run dev:indexer
```

With no `DATABASE_URL`, the API serves two **seeded demo agents** — a HIGH_RISK
`0x4471…c02a` (score 31) and a TRUSTED `0x9a2f…b17e` (score 94). These are real
inputs run through the real formula, not fabricated scores, so the landing page
and demo work before the indexer is populated.

## Test

```bash
npm test            # all workspaces
```

- `packages/scoring` — 17 tests covering the formula, bands, confidence, every
  flag, clamping, and the documented §5 discrepancy.
- `apps/api` — 8 tests covering all endpoints, the 402 challenge, validation and
  not-found shapes.

## Deploy

- **web** → Vercel (static). Set `window.VOUCH_API` to the deployed API origin.
- **api** → a Node host (Railway / Render / Fly). `npm run build && npm start` in
  `apps/api`. For Vercel, wrap with a Fastify serverless adapter.
- **indexer** → Railway worker. See [`apps/indexer/Dockerfile`](./apps/indexer/Dockerfile).
- **db** → Supabase. Apply [`supabase/migrations`](./supabase/migrations).

Secrets via env only. Never commit `.env` or an Agentic Wallet key.

## Status

The code is complete and tested. The remaining steps are external and manual:
§3 on-chain validation, creating the Agentic Wallet, provisioning Supabase/hosts,
listing the ASP on OKX.AI, recording the demo, and the X post. See
[`docs/SUBMISSION.md`](./docs/SUBMISSION.md) for the checklist.
