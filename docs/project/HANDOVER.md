# FeathersMCP — Handover and operations (repository)

**Who this is for:** **Incoming maintainers** and technical owners taking responsibility for the repository, plus **contributors** who will change server code, CI/CD, or the Cloudflare Worker.

**Who does not need this file:** People who only **install and run** the published package (`npx feathersjs-mcp`, IDE MCP config) are **end users** of the product. They should follow the root **[README.md](../../README.md)** only; they never have to open `docs/`.

This document is the **handover summary**: what was delivered, how the pieces fit together, what to expect in production, and what to own operationally.

For a clean-machine verification of the repo, use **[SETUP.md](./SETUP.md)**. For architecture and data flow, see **[PROJECT_GUIDE.md](./PROJECT_GUIDE.md)**.

---

## What this project is

**FeathersMCP** is an [MCP](https://modelcontextprotocol.io) (Model Context Protocol) server published as **`feathersjs-mcp`** on npm. It connects AI assistants in IDEs (VS Code, Cursor, Claude Desktop, Zed, etc.) to:

1. **Official FeathersJS v6 documentation** — full-text search and full-page retrieval from a bundled SQLite database (`data/contents.sqlite`).
2. **Optional community knowledge** — search and full-post retrieval via a **Cloudflare Worker** backed by **D1** (SQL + FTS5).
3. **Community submissions** — `share-knowledge` builds a pre-filled **GitHub issue** URL; a GitHub Action ingests approved, closed issues into the Worker.

---

## What ships where

| Artifact | Contents |
|----------|----------|
| **npm package** `feathersjs-mcp` | `build/` (compiled server), `data/` (docs DB), `.agents/skills/feathersjs-mcp/` (optional Agent Skill), `README.md`, `LICENSE`. **Does not** include `docs/` — by design, so npm consumers are not asked to read repository documentation. |
| **GitHub repository** | Full source (`src/`), tests, `cloud/` Worker source, GitHub Actions, and **`docs/`** — **`docs/project/`** (handover, setup, architecture) and **`docs/operations/`** (CI/CD, releases, D1) for people who work **in** the repo. |

---

## Fully working (as delivered)

- **MCP server (stdio)** — protocol handling, **7** registered tools, stable `tools/call` flow.
- **Doc tools** — `get-menu`, `search-doc`, `get-doc`, `get-schema` against the bundled v6 docs (47 pages).
- **Community tools** — `search-community`, `get-community-post` against the deployed Worker (when reachable).
- **`share-knowledge`** — GitHub “new issue” magic link with frontmatter for the ingest workflow. Long bodies are **truncated so the URL never exceeds 8191 characters** (GitHub/browser limit); the user is told to paste the rest into the issue after it opens.
- **CI/CD** — build, tests, release zip, npm publish, community ingest workflow (see operations docs below).
- **Agent skill** — `npx feathersjs-mcp install-skill` installs `.agents/skills/feathersjs-mcp/SKILL.md` for clients that support Agent Skills.

---

## Known limitations (behaviour / ecosystem)

1. **Community search invocation** — Some LLMs still favour official doc search first and may not always chain `search-community` / `get-community-post` unless the user or skill wording nudges them.
2. **Legacy / smaller models** — MCP tool-calling support varies; older or constrained models may not invoke tools reliably.
3. **Community KB quality** — Search usefulness depends on how much high-quality content has been seeded or submitted via the GitHub issue flow.
4. **`share-knowledge` URL length** — GitHub issue URLs are effectively capped (~8191 characters). Very long Markdown is truncated in the **query string** only; the assistant should tell the user to paste the remainder into the issue body after opening the link.

---

## Deferred features

Everything planned for the shipped product is implemented. Possible enhancements are listed under **Future work** below.

---

## Operational handover

### URLs and identifiers (public)

| Item | Location / value |
|------|------------------|
| GitHub repo | https://github.com/daffl/FeathersMCP |
| npm package | https://www.npmjs.com/package/feathersjs-mcp |
| Worker URL (search / post) | Hardcoded in `src/tools/search-community.ts` and `src/tools/get-community-post.ts` — update and redeploy if the Worker hostname changes. |
| D1 binding | `cloud/wrangler.toml` — `database_name` / `database_id` (public Cloudflare identifiers, not secrets). |

### GitHub Actions secrets (private)

| Secret | Used by |
|--------|---------|
| `NPM_TOKEN` | Publish to npm (`release` workflow). |
| `CLOUDFLARE_WORKER_URL` | `ingest-to-cloudflare.yml` — base URL for `POST /ingest`. |
| `INGESTION_SECRET` | Must match the Worker’s expected bearer token for ingestion. |
| `GITHUB_TOKEN` | Default Actions token for checkout/API; elevated permissions only if workflows require them (see workflow files). |

Ensure **incoming maintainers** (or a designated operations owner) have: npm package publish access, Cloudflare account for Worker + D1, GitHub admin on the repo, and secrets configured on `main`.

### Access checklist before sign-off

- [ ] Receiving party can open the GitHub repo (private → invite as needed).
- [ ] npm `feathersjs-mcp` maintainer role for the release account.
- [ ] Cloudflare Worker + D1 dashboard access; `wrangler` deploy works from `cloud/`.
- [ ] GitHub Actions green on `main`; release workflow can publish if that is in scope.

---

## Operations documentation index (DevOps / maintainers)

Same rule as above: only people changing **CI, releases, or D1** need these.

| Document | Purpose |
|----------|---------|
| [../operations/CI_CD.md](../operations/CI_CD.md) | Workflows, jobs, release artifact overview. |
| [../operations/PUBLISHING_SKILL.md](../operations/PUBLISHING_SKILL.md) | How to bump version and publish npm + skill sync. |
| [../operations/CLOUD_DATABASE.md](../operations/CLOUD_DATABASE.md) | D1 reset, schema apply, deploy notes. |

---

## Secrets and hygiene

- **Do not** commit `.env`, API keys, or real `INGESTION_SECRET` values. Use **`cloud/.env.example`** as a template for local Worker dev.
- No production tokens belong in the repo or in screenshots shared outside trusted channels.

---

## Future work (optional)

- Tune skill / tool descriptions if community tool invocation remains weak in telemetry or user reports.
- Consider a browse/list tool for the community index when search queries are too vague.
- Broader matrix of MCP clients and model families for regression notes.
- Automate doc re-ingestion when Feathers v6 site content changes (scheduled job or documented manual cadence).

---

## Readiness checklist

Before relying on this repository in production, have **at least one engineer** on the owning team follow **[SETUP.md](./SETUP.md)** on a **clean** machine (fresh clone, `npm ci`, `npm run build`, configure one MCP client, run `npm run test:mcp`). Resolve any gaps in SETUP before final sign-off.
