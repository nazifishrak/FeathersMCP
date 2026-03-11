# CI/CD Pipeline

## Pipeline Link

**GitHub Actions:** <https://github.com/nazifishrak/FeatherMCP/actions>

| Workflow | File | Runs on |
|---|---|---|
| Build & Test | `.github/workflows/build-and-test.yml` | Every push to `main` and all pull requests |
| Release | `.github/workflows/release.yml` | Every push to `main` (after merge) |

## High-Level Description

The Feathers MCP CI/CD pipeline is split into two GitHub Actions workflows:

### 1. Build & Test (`build-and-test.yml`)

Runs on every push to `main` and on every pull request. This workflow ensures the codebase compiles and all automated tests pass before code is merged.

**Steps:**

1. **Checkout** the repository (includes the tracked `data/contents.sqlite` database).
2. **Setup Node.js 20** with npm dependency caching.
3. **Install dependencies** via `npm ci`.
4. **Build** — runs `npm run build` to compile TypeScript to JavaScript in `build/`.
5. **Test ingestion-to-search pipeline** — runs `npm run test:pipeline`, which:
   - Verifies the database exists and source tables are reachable.
   - Drops and re-creates the `documents` table, then runs a fresh ingestion of all 47 documents.
   - Re-runs ingestion to verify incremental updates skip all existing documents.
   - Spot-checks content quality (text length, code block counts, source URLs).
   - Validates FTS5 full-text search index integrity and Porter stemmer functionality.
   - Tests search relevance for known queries across categories.
6. **Test MCP protocol compliance** — runs `npm run test:mcp`, which:
   - Spawns the MCP server (`node build/index.js`) over stdio.
   - Sends JSON-RPC `initialize`, `tools/list`, and `tools/call` messages.
   - Validates all 4 tools are registered (`get-schema`, `get-menu`, `search-doc`, `get-doc`).
   - Tests search with category filters, empty results, content truncation limits, and CSS noise stripping.
   - Tests document retrieval by title, path, and id, including not-found and missing-argument error handling.
   - Verifies `get-doc` returns full untruncated content vs. `search-doc` snippets.
   - Checks base64 data URI stripping and response size reasonableness.

### 2. Release (`release.yml`)

Runs only on push to `main` (i.e., after a PR is merged). This workflow produces the release artifact.

**Steps:**

1. **Checkout** the repository.
2. **Setup Node.js 20** with npm dependency caching.
3. **Install production dependencies** via `npm ci --omit=dev`.
4. **Build** — compiles TypeScript to `build/`.
5. **Read version** from `package.json` (currently `1.0.0`).
6. **Create zip** — packages `build/`, `data/`, `node_modules/`, and `package.json` into `feathers-mcp-v1.0.0.zip`.
7. **Create GitHub Release** — tags the commit as `v1.0.0` and attaches the zip. If the release already exists, the artifact is updated in place.

## Pipeline Flow

```
  Push to main / Open PR
         │
         ▼
  ┌──────────────────────┐
  │   Build & Test       │
  │                      │
  │  npm ci              │
  │  npm run build       │
  │  npm run test:pipeline│
  │  npm run test:mcp    │
  └──────────┬───────────┘
             │ pass
             ▼
  ┌──────────────────────┐
  │   Release            │  ◄── only on push to main
  │                      │
  │  npm ci --omit=dev   │
  │  npm run build       │
  │  zip build/ data/    │
  │  gh release create   │
  └──────────┬───────────┘
             │
             ▼
  GitHub Release v1.0.0
  └── feathers-mcp-v1.0.0.zip
```

## Release Artifact Contents

The `feathers-mcp-v1.0.0.zip` release artifact contains everything needed to run the MCP server:

| Directory/File | Description |
|---|---|
| `build/` | Compiled JavaScript (TypeScript output) |
| `data/` | SQLite documentation database (`contents.sqlite`) |
| `node_modules/` | Production runtime dependencies (includes `better-sqlite3` native bindings) |
| `package.json` | Package metadata and `bin` entry point |

## Test Evidence

Automated tests run in CI on every push and pull request. Evidence can be found in the **Actions** tab of the GitHub repository:

- **Build & Test workflow runs:** <https://github.com/nazifishrak/FeatherMCP/actions/workflows/build-and-test.yml>
- **Release workflow runs:** <https://github.com/nazifishrak/FeatherMCP/actions/workflows/release.yml>

Each workflow run shows step-by-step logs including full test output with pass/fail counts.
