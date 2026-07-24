import pg from "pg";

const { Pool } = pg;

/**
 * The persisted block cursor (§7, §10). A crash resumes from the last committed
 * block rather than re-scanning from genesis. The cursor is advanced only after
 * a batch's rows are written, so at worst a batch is re-processed idempotently.
 */
export class Cursor {
  private pool: pg.Pool;

  constructor(connectionString: string) {
    this.pool = new Pool({ connectionString, max: 3 });
  }

  async read(fallback: bigint): Promise<bigint> {
    const { rows } = await this.pool.query(
      `select last_indexed_block from indexer_state where id = 1`,
    );
    const stored = rows[0]?.last_indexed_block;
    if (stored === undefined || stored === null) return fallback;
    const n = BigInt(stored);
    return n > fallback ? n : fallback;
  }

  async commit(block: bigint): Promise<void> {
    await this.pool.query(
      `insert into indexer_state (id, last_indexed_block, updated_at)
       values (1, $1, now())
       on conflict (id) do update set last_indexed_block = excluded.last_indexed_block,
                                       updated_at = now()`,
      [block.toString()],
    );
  }

  poolRef(): pg.Pool {
    return this.pool;
  }

  async close(): Promise<void> {
    await this.pool.end();
  }
}
