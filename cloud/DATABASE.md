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

**Note:** `reset-schema.sql` drops triggers, the FTS table, and `contributions`. Re-running `schema.sql` recreates them. The `contributions` table stores `title`, `author`, `content`, `tags`, and `github_issue_url` (no separate `slug` or `excerpt` columns). If you only need a one-off SQL change, prefer a migration script instead of a full reset.
