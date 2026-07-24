import { parseAbiItem, type Log } from "viem";

/**
 * Event ABI for the OKX.AI settlement contract on X Layer.
 *
 * ⚠️  PLACEHOLDER SIGNATURES — fill these in from §3 validation (docs/VALIDATION.md).
 * Pull the real ABI from the block explorer, confirm the exact event names and
 * indexed fields, and replace the four items below. The rest of the indexer is
 * shaped around these decoded rows, so this file is the only thing that changes
 * once the real signatures are known.
 */
export const SETTLEMENT_EVENTS = {
  jobOpened: parseAbiItem(
    "event JobOpened(bytes32 indexed jobId, address indexed provider, address indexed buyer, uint256 amountUsd, uint256 openedAt)",
  ),
  jobSettled: parseAbiItem(
    "event JobSettled(bytes32 indexed jobId, uint256 closedAt)",
  ),
  jobAbandoned: parseAbiItem(
    "event JobAbandoned(bytes32 indexed jobId, uint256 closedAt)",
  ),
  disputeResolved: parseAbiItem(
    "event DisputeResolved(bytes32 indexed disputeId, bytes32 indexed jobId, address indexed against, uint8 outcome)",
  ),
} as const;

export type DecodedRow =
  | {
      kind: "job_opened";
      jobId: string;
      provider: string;
      buyer: string;
      amountUsd: number;
      openedAt: Date;
      blockNumber: bigint;
      txHash: string;
    }
  | { kind: "job_settled"; jobId: string; closedAt: Date; blockNumber: bigint }
  | { kind: "job_abandoned"; jobId: string; closedAt: Date; blockNumber: bigint }
  | {
      kind: "dispute_resolved";
      disputeId: string;
      jobId: string;
      against: string;
      outcome: "provider" | "buyer" | "pending";
      blockNumber: bigint;
    };

const OUTCOME = ["pending", "provider", "buyer"] as const;
const toSeconds = (v: bigint): Date => new Date(Number(v) * 1000);

/**
 * Turn a raw decoded log into a normalized row. `log.eventName` and `log.args`
 * are populated by viem's getLogs when the event ABI is supplied. Unknown events
 * return null and are skipped.
 */
export function decodeLog(log: Log & { eventName?: string; args?: any }): DecodedRow | null {
  const a = log.args ?? {};
  const block = log.blockNumber ?? 0n;
  switch (log.eventName) {
    case "JobOpened":
      return {
        kind: "job_opened",
        jobId: String(a.jobId),
        provider: String(a.provider).toLowerCase(),
        buyer: String(a.buyer).toLowerCase(),
        // amountUsd is assumed 6-decimal fixed point (USDC-style). Adjust to
        // the contract's actual scaling once confirmed in validation.
        amountUsd: Number(a.amountUsd ?? 0n) / 1e6,
        openedAt: toSeconds(a.openedAt ?? 0n),
        blockNumber: block,
        txHash: log.transactionHash ?? "",
      };
    case "JobSettled":
      return {
        kind: "job_settled",
        jobId: String(a.jobId),
        closedAt: toSeconds(a.closedAt ?? 0n),
        blockNumber: block,
      };
    case "JobAbandoned":
      return {
        kind: "job_abandoned",
        jobId: String(a.jobId),
        closedAt: toSeconds(a.closedAt ?? 0n),
        blockNumber: block,
      };
    case "DisputeResolved":
      return {
        kind: "dispute_resolved",
        disputeId: String(a.disputeId),
        jobId: String(a.jobId),
        against: String(a.against).toLowerCase(),
        outcome: OUTCOME[Number(a.outcome ?? 0)] ?? "pending",
        blockNumber: block,
      };
    default:
      return null;
  }
}
