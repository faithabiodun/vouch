import pg from "pg";
import type { AgentMetrics } from "@vouch/scoring";
import { config } from "./config.js";
import { DEMO_AGENTS } from "./demo.js";

const { Pool } = pg;

export interface AgentRecord {
  agent_id: string;
  first_seen: string;
  metrics: AgentMetrics;
}

export interface MarketStats {
  agents_indexed: number;
  calls_served: number;
  paid_calls: number;
  marketplace_dispute_rate: number;
  last_indexed_block: number;
}

/**
 * Data access for VOUCH. Backed by Supabase Postgres when DATABASE_URL is set;
 * otherwise falls back to the in-memory demo seed so the API, landing page, and
 * demo all work before the indexer exists (§10 Phase 1).
 */
const pool = config.databaseUrl
  ? new Pool({ connectionString: config.databaseUrl, max: 5 })
  : null;

export const usingDatabase = pool !== null;

// Aggregates raw job/dispute rows into the AgentMetrics the scorer consumes.
// All temporal windows are computed relative to now() in the query so scoring
// stays a pure function of already-aggregated numbers.
const METRICS_SQL = `
with j as (
  select
    count(*) filter (where status = 'settled')                              as jobs_completed,
    count(*) filter (where status = 'abandoned')                            as jobs_abandoned,
    count(*) filter (where status = 'settled' and closed_at > now() - interval '7 days') as jobs_last_7d,
    percentile_cont(0.5) within group (order by extract(epoch from (closed_at - opened_at)))
      filter (where status = 'settled')                                     as median_delivery_seconds,
    percentile_cont(0.5) within group (order by amount_usd)
      filter (where status = 'settled')                                     as median_ticket_usd,
    percentile_cont(0.5) within group (order by amount_usd)
      filter (where status = 'settled' and closed_at > now() - interval '7 days') as recent_median_ticket_usd,
    count(distinct buyer_id)                                                as counterparties_unique,
    min(opened_at)                                                          as first_seen,
    max(coalesce(closed_at, opened_at))                                     as last_seen
  from jobs where provider_id = $1
),
top as (
  select buyer_id, count(*) as n
  from jobs where provider_id = $1 and status = 'settled'
  group by buyer_id order by n desc limit 1
),
tot as (
  select count(*) as n from jobs where provider_id = $1 and status = 'settled'
),
d as (
  select
    count(*)                                                                as disputes_raised_against,
    count(*) filter (where outcome = 'buyer')                              as disputes_lost,
    count(*) filter (where coalesce(resolved_at, now()) > now() - interval '7 days') as disputes_last_7d
  from disputes where against_id = $1
)
select
  coalesce(j.jobs_completed, 0)                                            as jobs_completed,
  coalesce(j.jobs_abandoned, 0)                                            as jobs_abandoned,
  coalesce(d.disputes_raised_against, 0)                                   as disputes_raised_against,
  coalesce(d.disputes_lost, 0)                                             as disputes_lost,
  coalesce(d.disputes_last_7d, 0)                                          as disputes_last_7d,
  coalesce(j.jobs_last_7d, 0)                                              as jobs_last_7d,
  coalesce(j.counterparties_unique, 0)                                     as counterparties_unique,
  coalesce(j.median_delivery_seconds, 0)                                   as median_delivery_seconds,
  coalesce(j.median_ticket_usd, 0)                                         as median_ticket_usd,
  coalesce(j.recent_median_ticket_usd, 0)                                  as recent_median_ticket_usd,
  case when tot.n > 0 then coalesce(top.n, 0)::float / tot.n else 0 end    as top_counterparty_share,
  j.first_seen,
  coalesce(extract(day from (now() - j.first_seen)), 0)                    as days_active,
  coalesce(extract(day from (now() - j.last_seen)), 0)                     as days_since_last_seen
from j
left join top on true
left join tot on true
left join d on true
`;

function rowToMetrics(r: Record<string, unknown>): AgentMetrics {
  const num = (k: string): number => Number(r[k] ?? 0);
  return {
    jobs_completed: num("jobs_completed"),
    jobs_abandoned: num("jobs_abandoned"),
    disputes_raised_against: num("disputes_raised_against"),
    disputes_lost: num("disputes_lost"),
    counterparties_unique: num("counterparties_unique"),
    top_counterparty_share: num("top_counterparty_share"),
    median_delivery_seconds: num("median_delivery_seconds"),
    median_ticket_usd: num("median_ticket_usd"),
    recent_median_ticket_usd: num("recent_median_ticket_usd"),
    days_active: num("days_active"),
    days_since_last_seen: num("days_since_last_seen"),
    disputes_last_7d: num("disputes_last_7d"),
    jobs_last_7d: num("jobs_last_7d"),
  };
}

export async function getAgent(agentId: string): Promise<AgentRecord | null> {
  if (!pool) {
    const demo = DEMO_AGENTS[agentId.toLowerCase()];
    return demo ?? null;
  }
  const { rows } = await pool.query(METRICS_SQL, [agentId]);
  const r = rows[0];
  if (!r || Number(r.jobs_completed) + Number(r.jobs_abandoned) === 0) {
    return null;
  }
  return {
    agent_id: agentId,
    first_seen: new Date(r.first_seen).toISOString(),
    metrics: rowToMetrics(r),
  };
}

export async function getStats(): Promise<MarketStats> {
  if (!pool) {
    return {
      agents_indexed: Object.keys(DEMO_AGENTS).length,
      calls_served: 0,
      paid_calls: 0,
      marketplace_dispute_rate: 0.06,
      last_indexed_block: 0,
    };
  }
  const [{ rows: a }, { rows: c }, { rows: dr }, { rows: st }] =
    await Promise.all([
      pool.query(`select count(*)::int as n from agents`),
      pool.query(
        `select count(*)::int as total,
                count(*) filter (where paid)::int as paid from call_log`,
      ),
      pool.query(
        `select coalesce(
           count(*) filter (where status = 'disputed')::float
           / nullif(count(*), 0), 0) as rate from jobs`,
      ),
      pool.query(
        `select coalesce(last_indexed_block, 0)::bigint as b from indexer_state where id = 1`,
      ),
    ]);
  return {
    agents_indexed: a[0]?.n ?? 0,
    calls_served: c[0]?.total ?? 0,
    paid_calls: c[0]?.paid ?? 0,
    marketplace_dispute_rate: Number(dr[0]?.rate ?? 0),
    last_indexed_block: Number(st[0]?.b ?? 0),
  };
}

export async function logCall(
  endpoint: string,
  agentId: string | null,
  paid: boolean,
): Promise<void> {
  if (!pool) return; // demo mode: nothing to persist
  try {
    await pool.query(
      `insert into call_log (endpoint, agent_id, paid) values ($1, $2, $3)`,
      [endpoint, agentId, paid],
    );
  } catch {
    // A logging failure must never break the actual response.
  }
}

export async function getIndexerLagBlocks(): Promise<number> {
  if (!pool) return 0;
  try {
    const { rows } = await pool.query(
      `select coalesce(last_indexed_block, 0)::bigint as b from indexer_state where id = 1`,
    );
    // Lag against head is computed by the caller via RPC; here we only expose
    // the last indexed block. Staleness is derived in the route.
    return Number(rows[0]?.b ?? 0);
  } catch {
    return 0;
  }
}
