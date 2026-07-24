import "dotenv/config";
import { createPublicClient, http, type Address } from "viem";
import { Cursor } from "./cursor.js";
import { SETTLEMENT_EVENTS, decodeLog, type DecodedRow } from "./decode.js";
import { applyRows } from "./write.js";

const RPC_URL = process.env.XLAYER_RPC_URL ?? "https://rpc.xlayer.tech";
const CONTRACT = (process.env.SETTLEMENT_CONTRACT ?? "").toLowerCase();
const START_BLOCK = BigInt(process.env.INDEXER_START_BLOCK ?? "0");
const BATCH = BigInt(process.env.INDEXER_BATCH_SIZE ?? "2000");
const POLL_MS = Number(process.env.INDEXER_POLL_MS ?? "5000");
const DATABASE_URL = process.env.DATABASE_URL ?? "";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function main(): Promise<void> {
  if (!DATABASE_URL) {
    console.error("[indexer] DATABASE_URL is required. Exiting.");
    process.exit(1);
  }
  if (!CONTRACT || CONTRACT === "0x0000000000000000000000000000000000000000") {
    console.warn(
      "[indexer] SETTLEMENT_CONTRACT not set. Idling until §3 validation " +
        "provides the address. Fill .env and restart.",
    );
    // Idle rather than crash-loop, so the worker stays deployed on Railway.
    for (;;) await sleep(30_000);
  }

  const client = createPublicClient({ transport: http(RPC_URL) });
  const cursor = new Cursor(DATABASE_URL);
  const events = Object.values(SETTLEMENT_EVENTS);

  let from = (await cursor.read(START_BLOCK)) + 1n;
  console.log(`[indexer] resuming from block ${from}`);

  for (;;) {
    let head: bigint;
    try {
      head = await client.getBlockNumber();
    } catch (err) {
      console.error("[indexer] getBlockNumber failed, retrying", err);
      await sleep(POLL_MS);
      continue;
    }

    if (from > head) {
      // Caught up to chain head — poll for new blocks.
      await sleep(POLL_MS);
      continue;
    }

    const to = from + BATCH - 1n > head ? head : from + BATCH - 1n;

    try {
      const logs = await client.getLogs({
        address: CONTRACT as Address,
        events,
        fromBlock: from,
        toBlock: to,
      });

      const rows: DecodedRow[] = [];
      for (const log of logs) {
        const row = decodeLog(log as never);
        if (row) rows.push(row);
      }

      if (rows.length > 0) {
        await applyRows(cursor.poolRef(), rows);
      }

      await cursor.commit(to);
      if (rows.length > 0) {
        console.log(`[indexer] blocks ${from}–${to}: wrote ${rows.length} rows`);
      }
      from = to + 1n;
    } catch (err) {
      console.error(`[indexer] batch ${from}–${to} failed, retrying`, err);
      await sleep(POLL_MS);
    }
  }
}

main().catch((err) => {
  console.error("[indexer] fatal", err);
  process.exit(1);
});
