import pg from "pg";
import type { DecodedRow } from "./decode.js";

/**
 * Idempotent upserts for a decoded batch. Every write is on-conflict-safe so a
 * re-processed batch (after a crash before the cursor committed) produces the
 * same state — the audit trail stays consistent.
 */
export async function applyRows(
  pool: pg.Pool,
  rows: DecodedRow[],
): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query("begin");
    for (const row of rows) {
      switch (row.kind) {
        case "job_opened": {
          // Ensure both provider and buyer exist as agents (buyer may be new).
          for (const id of [row.provider, row.buyer]) {
            await client.query(
              `insert into agents (agent_id, first_seen, last_seen)
               values ($1, $2, $2)
               on conflict (agent_id) do update
                 set last_seen = greatest(agents.last_seen, excluded.last_seen)`,
              [id, row.openedAt],
            );
          }
          await client.query(
            `insert into jobs (job_id, provider_id, buyer_id, amount_usd, status,
                               opened_at, block_number, tx_hash)
             values ($1, $2, $3, $4, 'open', $5, $6, $7)
             on conflict (job_id) do nothing`,
            [
              row.jobId,
              row.provider,
              row.buyer,
              row.amountUsd,
              row.openedAt,
              row.blockNumber.toString(),
              row.txHash,
            ],
          );
          break;
        }
        case "job_settled":
          await client.query(
            `update jobs set status = 'settled', closed_at = $2
             where job_id = $1`,
            [row.jobId, row.closedAt],
          );
          break;
        case "job_abandoned":
          await client.query(
            `update jobs set status = 'abandoned', closed_at = $2
             where job_id = $1`,
            [row.jobId, row.closedAt],
          );
          break;
        case "dispute_resolved":
          await client.query(
            `update jobs set status = 'disputed' where job_id = $1`,
            [row.jobId],
          );
          await client.query(
            `insert into disputes (dispute_id, job_id, against_id, outcome,
                                   resolved_at, block_number)
             values ($1, $2, $3, $4, now(), $5)
             on conflict (dispute_id) do update
               set outcome = excluded.outcome, resolved_at = excluded.resolved_at`,
            [
              row.disputeId,
              row.jobId,
              row.against,
              row.outcome,
              row.blockNumber.toString(),
            ],
          );
          break;
      }
    }
    await client.query("commit");
  } catch (err) {
    await client.query("rollback");
    throw err;
  } finally {
    client.release();
  }
}
