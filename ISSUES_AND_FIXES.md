# Issues & Fixes — FeatherMCP MVP

This document records every issue found during the MVP audit and what was done to fix it.

---

## Issue #1: CSS Noise in Search Content (Critical)

**Problem:** 39 out of 47 documents had Shiki syntax-highlighting CSS leaking into `content_plain`. The Nuxt Content pipeline embeds `<style>` nodes inside the minimark AST for code block theming. Our `extractPlainText()` function was recursing into these nodes and treating CSS rules like normal text.

**Impact:** Search results contained garbage like `html pre.shiki code .line{--shiki-default:#F97583}` mixed with real documentation text. The worst case was the Authentication (API) page — 58% of its `content_plain` was CSS noise (1311 chars total, only 546 were real content). This polluted FTS rankings and wasted context window space for any LLM consuming the results.

**Fix:** Added a `<style>` tag skip in `extractPlainText()` at [src/scripts/ingest.ts](src/scripts/ingest.ts), line ~120:
```typescript
if (tagName === "style") {
  return "";
}
```
Then dropped all tables (`npm run test:drop`) and re-ran ingestion (`npm run ingest`).

**Verified:** `npm run test:css` confirms 0/47 documents contain CSS artifacts. Authentication page is now 546 chars (clean text only).

---

## Issue #2: Schema Exposing Internal Tables

**Problem:** The `get-schema` MCP tool called `getSchema()` which returned all 12+ tables in the SQLite database — including Nuxt Content internals (`_content_api`, `_content_guides`, `_content_pages`, etc.) and FTS virtual tables. An LLM client receiving this response would see a confusing wall of tables it can't actually query through our tools.

**Impact:** Wasted tokens and confused LLM reasoning. The LLM might try to reference internal tables that have no corresponding tool support.

**Fix:** Rewrote `getSchema()` in [src/db/database.ts](src/db/database.ts) to only return the `documents` table:
```sql
SELECT name FROM sqlite_master WHERE type='table' AND name = 'documents'
```

**Verified:** `get-schema` MCP tool now returns exactly 1 table with 13 columns.

---

## Issue #3: Search Results Blowing Up Context Windows

**Problem:** The `search-doc` tool returned the full `content_plain` and all `code_examples` for every result. Some documents have 15,000+ chars of plain text and 40+ code blocks. A single 5-result search could dump 50K+ chars into the LLM context.

**Impact:** Wasteful token consumption. Most LLMs have finite context windows and the raw dump provided far more text than needed to answer a user's question.

**Fix:** In [src/tools/search-doc.ts](src/tools/search-doc.ts):
- Truncate `content_plain` to a 500-character snippet (with `...` indicator)
- Cap `code_examples` at 3 per result (with `total_code_examples` count so the LLM knows there are more)
- Wrap response in a structured JSON envelope with `query`, `category`, `result_count`, and `results`
- Return helpful suggestions when zero results are found

**Verified:** `npm run test:mcp` confirms search responses are ~8.5K chars for 5 results (previously could be 50K+). Content snippets are ≤503 chars and code examples capped at 3.

---

## Issue #4: Test Script Path Resolution Broken

**Problem:** `test-search.ts` used `require("fs")` in an ESM module and resolved the database path relative to the feathers workspace, which doesn't exist in all environments.

**Impact:** Running `npm run test:search` failed in any environment where the feathers source repo wasn't cloned at the expected relative path.

**Fix:** In [src/tests/test-search.ts](src/tests/test-search.ts):
- Replaced `require("fs")` with proper ESM `import fs from "fs"`
- Added priority path resolution: checks `data/contents.sqlite` (bundled copy) first, then falls back to the feathers workspace path
- Used `import.meta.dirname` for ESM-compatible directory resolution

**Verified:** `npm run test:search` now finds the bundled DB automatically and runs all 5 query tests.

---

## Issue #5: Database Not Bundled for Distribution

**Problem:** The MCP server expected the SQLite database to exist inside the feathers website build directory (`../feathers/website/.data/content/contents.sqlite`). This path only works during development when you have the full monorepo cloned. Anyone installing the server via npm or using it standalone would get a "database not found" error.

**Impact:** The server was unusable outside of the development monorepo structure.

**Fix:** Three changes:
1. **`package.json`** — Added `"data"` to the `"files"` array so `data/contents.sqlite` is included in npm packages
2. **`src/db/database.ts`** — Updated `findDatabasePath()` to check `data/contents.sqlite` (bundled) first, then fall back to the feathers workspace path
3. **`.gitignore`** — Added `*.sqlite-shm` and `*.sqlite-wal` to exclude SQLite journal files (these are temp files that shouldn't be committed)

**Verified:** All tools now find and use `data/contents.sqlite` automatically.

---

## Issue #6: No Test Organization

**Problem:** All test scripts were mixed in with utility scripts in `src/scripts/`. There was no separation between production scripts (ingestion) and test/verification scripts.

**Impact:** Unclear project structure — hard to know what's a test vs. what's a production utility.

**Fix:** Created `src/tests/` directory and moved all test files there:
- `test-search.ts` — Smoke test for database queries
- `test-mcp-protocol.ts` — End-to-end MCP protocol test
- `verify-css-fix.ts` — CSS noise verification
- `full-pipeline-test.ts` — Full pipeline integration test
- `drop-tables.ts` — Table reset utility

Updated `package.json` scripts to point to new paths. The `src/scripts/` folder now only contains `ingest.ts` (the actual production ingestion script).

---

## Summary

| # | Issue | Severity | Status |
|---|-------|----------|--------|
| 1 | CSS noise in content_plain | Critical | ✅ Fixed |
| 2 | Schema exposing internal tables | Medium | ✅ Fixed |
| 3 | Context window blowup from search | High | ✅ Fixed |
| 4 | Test script path resolution | Medium | ✅ Fixed |
| 5 | Database not bundled | High | ✅ Fixed |
| 6 | No test organization | Low | ✅ Fixed |
