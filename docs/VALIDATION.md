# §3 Blocking validation — STATUS: ⛔ NOT YET RUN

VOUCH's entire premise depends on **public, queryable settlement history keyed by
Agent ID** on X Layer. Until the four checks below pass, do not build past the
demo/stub data path. This file must be filled in with real findings — a contract
address, event signatures, and a link to a test transaction — before Phase 2.

> This requires an Agentic Wallet and a block explorer session, which are manual,
> credentialed steps. The code is already shaped so that a positive finding needs
> only: (1) `SETTLEMENT_CONTRACT` in `.env`, and (2) the real event ABI dropped
> into [`apps/indexer/src/decode.ts`](../apps/indexer/src/decode.ts).

## The four checks

- [ ] **1. Read `okx.ai/tutorial` and `okx.ai/tutorial/asp`.** Confirm Agent IDs
      are public and stable. → _record finding_
- [ ] **2. Create an Agentic Wallet, browse `okx.ai/agents`.** Can any agent's
      past jobs, ratings, or dispute count be seen from outside? → _record finding_
- [ ] **3. Locate the settlement contract on X Layer** via a block explorer.
      Pull the ABI. Confirm escrow release and dispute resolution emit events.
      → _record contract address + event signatures_
- [ ] **4. DECISIVE TEST:** hire any listed ASP for the minimum amount, let it
      settle, then find that transaction on-chain. If you can find your own, you
      can index everyone's. → _record tx hash + explorer link_

## Decision table

| Finding | Action |
|---|---|
| Rich events, agent IDs resolvable | Build as specified. Fill ABI + contract, run indexer. |
| Events exist, agent IDs are opaque hashes | Build anyway, score the hash. Identity resolution is v2. |
| Escrow off-chain, nothing public | **Pivot to the Escrow Referee fallback (§11) the same day.** |

## Findings (fill in)

- **Contract address:** `TBD`
- **Network / chain id:** X Layer / `TBD`
- **Event signatures:**
  - `JobOpened(...)` → `TBD`
  - `JobSettled(...)` → `TBD`
  - `JobAbandoned(...)` → `TBD`
  - `DisputeResolved(...)` → `TBD`
- **Test transaction:** `TBD`
- **Agent ID format observed:** `TBD` (address? opaque hash? resolvable?)
- **Outcome / chosen path:** `TBD`
