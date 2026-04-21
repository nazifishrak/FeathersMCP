# Cloudflare D1: reset and recreate tables

The Worker API uses the `contributions` table plus an FTS5 virtual table (`contributions_fts`) and triggers. To **delete everything and recreate** from `schema.sql` (for example after a schema or flow change):

1. **Use the database name from `wrangler.toml`** (`database_name`, e.g. `feathermcp-db`).

2. **Against the remote D1 database** (production data):

```bash
cd cloud
npx wrangler d1 execute feathermcp-db --remote --file=./reset-schema.sql
npx wrangler d1 execute feathermcp-db --remote --file=./schema.sql
```

3. **Against a local D1 preview** (development):

```bash
cd cloud
npx wrangler d1 execute feathermcp-db --local --file=./reset-schema.sql
npx wrangler d1 execute feathermcp-db --local --file=./schema.sql
```

4. **Re-ingest data** if you rely on `/ingest` or other pipelines; resetting removes all rows.

5. **Deploy the Worker** when [`cloud/src/index.ts`](../../cloud/src/index.ts) or other Worker code has changed, or to ensure production runs the same revision as your repo. D1 SQL applies only to the database; the HTTP API lives in the Worker. From `cloud/`:

```bash
npx wrangler deploy
```

After schema changes that affect ingest (for example the partial unique index and `ON CONFLICT`), the live Worker and live D1 should both match this repository so `/ingest` and search behave as intended.

**Note:** `reset-schema.sql` drops triggers, the FTS table, and `contributions`. Dropping `contributions` automatically removes every index defined on it (no separate `DROP INDEX`). Re-running `schema.sql` recreates the table, indexes, FTS, and triggers. The `contributions` table stores `title`, `author`, `content`, `tags`, and `github_issue_url` (no separate `slug` or `excerpt` columns). For a small database, reset + `schema.sql` is usually simplest. If you have a lot of data, avoid a full reset unless you have a backup and a plan to re-ingest; you can instead apply a targeted SQL change by hand.

## Unique `github_issue_url` (ingest idempotency)

[`cloud/schema.sql`](../../cloud/schema.sql) defines a **partial** unique index on non-empty `github_issue_url`: each real GitHub issue URL may appear once; many rows may still have NULL or empty URLs.

If your D1 was created before that index existed, run the same **reset + `schema.sql`** flow above (or equivalent) so the index is recreated—then re-ingest rows as needed.
