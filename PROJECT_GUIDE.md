# FeatherMCP — Project Guide

A complete walkthrough of how the FeathersJS MCP Server works, from data ingestion to serving search results to LLM clients.

---

## Table of Contents

1. [What This Project Does](#what-this-project-does)
2. [Architecture Overview](#architecture-overview)
3. [Data Flow](#data-flow)
4. [Project Structure](#project-structure)
5. [File-by-File Breakdown](#file-by-file-breakdown)
6. [How the Database Works](#how-the-database-works)
7. [How the MCP Server Works](#how-the-mcp-server-works)
8. [How to Run Everything](#how-to-run-everything)
9. [Common Tasks](#common-tasks)

---

## What This Project Does

FeatherMCP is an **MCP (Model Context Protocol) server** that gives LLMs (like Claude, GPT, etc.) the ability to search FeathersJS documentation. When a user asks an LLM a question about FeathersJS, the LLM can call our tools to look up the answer from the actual docs instead of relying on its training data.

**In simple terms:** We take the FeathersJS documentation website → extract the content into a searchable SQLite database → serve it through MCP tools that any LLM client can call.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    Nuxt Content (Stage 1)                    │
│  The feathers/website build process creates a SQLite DB     │
│  with raw markdown content in "minimark" JSON AST format    │
│  across 4 source tables.                                    │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│                  Ingestion Script (Stage 2)                  │
│  src/scripts/ingest.ts                                      │
│                                                             │
│  Reads the 4 source tables → Parses minimark AST →          │
│  Extracts plain text + code blocks → Creates unified        │
│  "documents" table + FTS5 full-text search index            │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│                  SQLite Database (data/)                     │
│  contents.sqlite                                            │
│                                                             │
│  ┌─────────────┐    ┌──────────────────┐                    │
│  │  documents   │───▶│  documents_fts   │ (FTS5 index)      │
│  │  (47 rows)   │    │  (BM25 ranking)  │                   │
│  └─────────────┘    └──────────────────┘                    │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│                    MCP Server (stdio)                        │
│  src/index.ts                                               │
│                                                             │
│  3 tools:                                                   │
│    🔍 search-doc  — Full-text search with BM25 ranking      │
│    📋 get-schema  — Show database structure                  │
│    📂 get-menu    — Browse documentation by category         │
│                                                             │
│  Communicates via JSON-RPC over stdin/stdout                 │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│                  LLM Client (Claude, etc.)                   │
│  Connects to our server, calls tools, gets documentation    │
│  content back, uses it to answer user questions.            │
└─────────────────────────────────────────────────────────────┘
```

---

## Data Flow

Here's the step-by-step journey of a piece of documentation from the website to an LLM's answer:

### Stage 1: Nuxt Content Build (not our code)
The FeathersJS website uses Nuxt Content, which compiles Markdown files into a SQLite database. Each doc page becomes a row in one of 4 tables:
- `_content_api` → 17 API reference pages
- `_content_guides` → 14 tutorial/guide pages
- `_content_cookbook` → 15 recipe/how-to pages
- `_content_ecosystem` → 1 ecosystem page

The body of each page is stored as a **minimark AST** — a compact JSON format like `["tag", {attrs}, ...children]`.

### Stage 2: Our Ingestion (`npm run ingest`)
Our ingestion script reads those 4 tables and creates:
1. A **`documents`** table with clean, searchable columns (title, plain text, code examples, category, URL, etc.)
2. A **`documents_fts`** FTS5 virtual table for full-text search with BM25 relevance ranking

### Stage 3: MCP Server (`npm start`)
The server starts, connects to the bundled SQLite database, and exposes 3 tools over the MCP protocol (JSON-RPC over stdio).

### Stage 4: LLM Interaction
1. LLM client (e.g., Claude Desktop) connects to our server
2. Client calls `tools/list` to discover our 3 tools
3. User asks "How do hooks work in Feathers?"
4. LLM calls `search-doc` with `{"query": "hooks"}`
5. We run an FTS5 search, return truncated results
6. LLM reads the results and synthesizes an answer

---

## Project Structure

```
FeatherMCP/
├── src/                          # All TypeScript source code
│   ├── index.ts                  # MCP server entry point
│   ├── db/
│   │   └── database.ts           # SQLite query layer (search, schema, menu)
│   ├── tools/
│   │   ├── index.ts              # Barrel file — exports all tools
│   │   ├── get-menu.ts           # MCP tool: browse docs by category
│   │   ├── get-schema.ts         # MCP tool: show database structure
│   │   └── search-doc.ts         # MCP tool: full-text search
│   ├── types/
│   │   └── tool.ts               # TypeScript types for tool definitions
│   ├── scripts/
│   │   └── ingest.ts             # Ingestion script (minimark → documents table)
│   └── tests/
│       ├── test-search.ts        # Smoke test: database queries
│       ├── test-mcp-protocol.ts  # Integration test: full MCP protocol
│       ├── verify-css-fix.ts     # Verification: CSS noise removal
│       ├── full-pipeline-test.ts # End-to-end pipeline test
│       └── drop-tables.ts       # Utility: reset tables for re-ingestion
├── data/
│   └── contents.sqlite           # Pre-built database (bundled with package)
├── build/                        # Compiled JS output (git-ignored)
├── package.json
├── tsconfig.json
└── .gitignore
```

**Key distinction:**
- `src/scripts/` = production utilities (ingestion), things the pipeline needs
- `src/tests/` = test and verification scripts, things developers need

---

## File-by-File Breakdown

### `src/index.ts` — Server Entry Point (33 lines)

The simplest file in the project. It does three things:
1. Creates an MCP server instance (`McpServer` from the SDK)
2. Loops over all tools and registers them with the server
3. Starts a stdio transport (reads JSON-RPC from stdin, writes to stdout)

```typescript
// This is essentially the whole file:
const server = new McpServer({ name: "FeatherJSMCP", version: "1.0.0" });
tools.forEach(tool => server.registerTool(tool.name, tool.schema, tool.handler));
await server.connect(new StdioServerTransport());
```

**Why stdio?** The MCP protocol uses stdin/stdout for communication. The LLM client spawns our server as a child process and talks to it via pipes. No network ports needed.

---

### `src/db/database.ts` — Query Layer (310 lines)

The heart of the project. This file manages the SQLite connection and provides all the query functions that tools call:

| Function | What It Does |
|----------|-------------|
| `getDatabase()` | Returns a singleton read-only connection to the SQLite DB |
| `findDatabasePath()` | Locates the database file (checks `data/` bundled copy first, then feathers workspace) |
| `searchDocumentation(query, category?, limit?)` | FTS5 full-text search with BM25 ranking |
| `sanitizeFtsQuery(query)` | Cleans user queries — removes stop words, handles special chars, joins tokens with OR |
| `getSchema()` | Returns the `documents` table structure (columns and types) |
| `getMenuStructure()` | Returns all documents grouped by category |
| `getDocumentByPath(path)` | Fetches a single document by its source file path |
| `getDocumentById(id)` | Fetches a single document by its row ID |
| `closeDatabase()` | Closes the DB connection (used by tests for cleanup) |

**How FTS5 search works:**

SQLite FTS5 is a full-text search engine built into SQLite. We configure it with:
- **Porter stemmer** — so "authenticating" matches "authentication"
- **Unicode61 tokenizer** — proper handling of non-ASCII characters
- **BM25 column weights** — title matches count 10x more than content matches

```
Column weights: title(10.0), category(5.0), content_plain(1.0), keywords(3.0)
```

When someone searches for "authentication hooks", the query gets sanitized to `"authentication" OR "hooks"` and matched against the FTS5 index. Results are ranked by BM25 relevance score.

---

### `src/tools/search-doc.ts` — Search Tool (78 lines)

The main tool that LLMs use. Accepts a search query, optional category filter, and optional result limit.

**Input schema (Zod):**
```typescript
{
  query: z.string(),           // Required — the search terms
  category: z.string().optional(),  // Optional — "api", "guides", "cookbook", "ecosystem"
  limit: z.number().optional(),     // Optional — max results (default: 5)
}
```

**Response format:**
```json
{
  "query": "authentication",
  "category": "all",
  "result_count": 5,
  "results": [
    {
      "rank": 1,
      "title": "Authentication",
      "category": "api",
      "source_url": "https://v6.feathersjs.com/api/authentication",
      "content_snippet": "The @feathersjs/authentication plugins provide...",
      "code_examples": [{ "language": "ts", "code": "..." }],
      "total_code_examples": 1
    }
  ]
}
```

**Truncation:** Content snippets are capped at 500 characters and code examples at 3 per result. This keeps responses small enough for LLM context windows (~8.5K chars for 5 results instead of potentially 50K+).

---

### `src/tools/get-schema.ts` — Schema Tool (22 lines)

Returns the structure of the `documents` table so the LLM understands what data is available. No input parameters.

**Response:** A JSON array with one entry (`documents` table) listing all 13 columns and their types.

---

### `src/tools/get-menu.ts` — Menu Tool (22 lines)

Returns all 47 documents organized by category. No input parameters. This helps the LLM browse available topics before searching.

**Response:**
```json
{
  "api": [
    { "id": 1, "title": "Application", "source_url": "..." },
    ...
  ],
  "cookbook": [...],
  "guides": [...],
  "ecosystem": [...]
}
```

---

### `src/tools/index.ts` — Tool Barrel (8 lines)

Simple barrel file that imports all 3 tools and exports them as an array. This is what `index.ts` imports to register everything.

---

### `src/types/tool.ts` — Type Definitions (12 lines)

Defines the `ToolDefinition<T>` interface that all tools implement:

```typescript
interface ToolDefinition<T extends ToolSchema> {
  name: string;
  description: string;
  schema: T;
  handler: (args: z.infer<...>) => Promise<{ content: [...] }>;
}
```

This ensures every tool has a consistent shape: a name, description, Zod schema for input validation, and a handler function.

---

### `src/scripts/ingest.ts` — Ingestion Script (568 lines)

The biggest file. Reads raw Nuxt Content data and transforms it into our searchable `documents` table.

**What it does, step by step:**

1. **Connects** to the source SQLite database
2. **Audits** the 4 source tables (`_content_api`, etc.) and counts rows
3. **Creates tables** — `documents` (12 columns) + `documents_fts` (FTS5 virtual table) + 3 sync triggers
4. **For each source table**, reads every row and:
   - Parses the `body` column (minimark AST JSON) 
   - Calls `extractPlainText()` — recursively walks the AST, extracts readable text, skips `<pre>`, `<style>`, `<badges>` tags
   - Calls `extractCodeBlocks()` — extracts `<pre>` nodes as `{language, code}` objects
   - Generates a content hash for incremental update detection
   - Inserts into `documents` table (or skips if hash unchanged)
5. **Verifies** the FTS5 index count matches document count
6. **Runs a test search** to confirm everything works

**Key functions:**
- `parseMinimark(body)` — Takes raw body JSON, returns `{plainText, codeBlocks}`
- `extractPlainText(node)` — Recursive AST walker for text content
- `extractCodeBlocks(node)` — Recursive AST walker for code blocks
- `createTables(db)` — DDL for documents + FTS5 + triggers
- `ingest(db)` — Main ingestion loop with transaction wrapping

---

### Test Files (in `src/tests/`)

| File | What It Tests | Run With |
|------|-------------|----------|
| `test-search.ts` | Core database functions: `getSchema()`, `getMenuStructure()`, `searchDocumentation()` with 5 different queries | `npm run test:search` |
| `test-mcp-protocol.ts` | Full MCP protocol over stdio: initialize handshake, tool listing, all 3 tool calls, response validation | `npm run test:mcp` |
| `verify-css-fix.ts` | Checks every document for CSS noise artifacts, validates content quality | `npm run test:css` |
| `full-pipeline-test.ts` | End-to-end: drops tables, re-ingests, verifies counts, tests incremental updates, content quality, FTS integrity, search relevance | `npm run test:pipeline` |
| `drop-tables.ts` | Utility to drop `documents` and FTS tables for a clean re-ingestion | `npx tsx src/tests/drop-tables.ts` |

---

## How the Database Works

### The `documents` Table

| Column | Type | Description |
|--------|------|-------------|
| `id` | INTEGER | Auto-increment primary key |
| `title` | TEXT | Page title (e.g., "Authentication") |
| `category` | TEXT | One of: `api`, `guides`, `cookbook`, `ecosystem` |
| `subcategory` | TEXT | Sub-grouping (e.g., "basics", "client") |
| `content_md` | TEXT | Raw markdown source |
| `content_plain` | TEXT | Clean plain text (no HTML, no CSS, no code blocks) |
| `code_examples` | TEXT | JSON array of `{language, code}` objects |
| `keywords` | TEXT | Extracted keywords for search boosting |
| `version` | TEXT | Doc version (currently "v6") |
| `source_file` | TEXT | Original file path in the feathers repo |
| `source_url` | TEXT | Live URL on feathersjs.com |
| `content_hash` | TEXT | SHA-256 hash for incremental update detection |
| `created_at` | TEXT | Timestamp of ingestion |

### The `documents_fts` Table (FTS5)

A virtual table that mirrors selected columns from `documents` for full-text search:
- Indexed columns: `title`, `category`, `content_plain`, `keywords`
- Tokenizer: Porter stemmer + Unicode61
- Ranking: BM25 with column weights (title: 10, category: 5, content_plain: 1, keywords: 3)

Three triggers (`documents_ai`, `documents_ad`, `documents_au`) keep the FTS index in sync with the `documents` table automatically.

### Content Statistics

| Category | Documents | Example Topics |
|----------|-----------|----------------|
| api | 17 | Application, Authentication, Hooks, Services, Events, Errors |
| guides | 14 | Quick Start, Creating an App, Schemas, Writing Tests |
| cookbook | 15 | OAuth (Google, Facebook, Auth0), JWT, File Uploads, Docker |
| ecosystem | 1 | Ecosystem overview |
| **Total** | **47** | |

---

## How the MCP Server Works

### Protocol: JSON-RPC 2.0 over stdio

The MCP protocol is built on JSON-RPC 2.0. Every message is a JSON object sent as a single line over stdin (requests) or stdout (responses).

**Connection lifecycle:**
```
Client                          Server
  │                                │
  ├─── initialize ─────────────────▶│  (handshake)
  │◀── result: capabilities ───────┤
  ├─── notifications/initialized ──▶│  (ready)
  │                                │
  ├─── tools/list ─────────────────▶│  (discover tools)
  │◀── result: [search-doc, ...] ──┤
  │                                │
  ├─── tools/call {search-doc} ────▶│  (use a tool)
  │◀── result: {content: [...]} ───┤
  │                                │
```

### Connecting to GitHub Copilot in VS Code (Primary Method)

This is the method that works for our team. VS Code reads MCP server config from a `.vscode/mcp.json` file in the workspace root.

**Step 1 — Build the server:**
```bash
cd FeatherMCP
npm run build
```

**Step 2 — The config file already exists** at `.vscode/mcp.json` in this repo:
```json
{
  "servers": {
    "feathersjsDocs": {
      "type": "stdio",
      "command": "node",
      "args": ["${workspaceFolder}/FeatherMCP/build/index.js"]
    }
  }
}
```

**Step 3 — Activate in VS Code:**
- `Cmd+Shift+P` → `Developer: Reload Window`
- `Cmd+Shift+P` → `MCP: List Servers` — confirm `feathersjsDocs` shows up with status `Running`
- If it shows `Stopped`, click it and select `Start Server`
- If prompted to trust the server, click **Allow**

**Step 4 — Use in Copilot Chat:**
- Open the GitHub Copilot Chat panel
- Switch to **Agent mode** (the dropdown next to the send button)
- Click the **Tools** icon (🔧) and enable `feathersjsDocs` tools
- Ask a question — Copilot will call our tools automatically

**Example prompts to test:**
```
How do hooks work in FeathersJS?
Show me code examples for authentication in FeathersJS.
What FeathersJS services are available?
```

**Troubleshooting:**
| Problem | Fix |
|---------|-----|
| Server not in MCP: List Servers | Make sure the workspace folder is `MVP/` (not `FeatherMCP/`) |
| Server stopped/won't start | Run `npm run build` then `MCP: Reset Cached Tools` |
| Tools not appearing in chat | Switch to Agent mode in Copilot Chat |
| Unknown config setting warning | Ignore it — the old `github.copilot.advanced.mcpServers` key is deprecated |

---

### Connecting to Claude Desktop (Alternative)

Add this to `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "feathersjs-docs": {
      "command": "node",
      "args": ["/absolute/path/to/FeatherMCP/build/index.js"]
    }
  }
}
```

Replace `/absolute/path/to/` with the actual path on your machine. Then restart Claude Desktop.

---

## How to Run Everything

### First-Time Setup
```bash
cd FeatherMCP
npm install          # Install dependencies
npm run build        # Compile TypeScript → build/
```

The database comes pre-built in `data/contents.sqlite`. You're ready to go.

### Running the Server
```bash
npm start            # Starts MCP server on stdio
```
(You won't see output — it communicates via JSON-RPC, not human-readable text)

### Re-Ingesting Documentation

Only needed if the FeathersJS website content changes:
```bash
# 1. Make sure the feathers website has been built (Stage 1)
cd ../feathers/website && npx nuxt build

# 2. Drop old tables and re-ingest
npx tsx src/tests/drop-tables.ts
npm run ingest

# 3. Copy the fresh DB to the bundled location
cp ../feathers/website/.data/content/contents.sqlite data/contents.sqlite
```

### Running Tests
```bash
npm run test:search    # Quick smoke test (5 queries)
npm run test:mcp       # Full MCP protocol test (8 checks)
npm run test:css       # Verify no CSS noise in content
npm run test:pipeline  # Full end-to-end pipeline test
```

---

## Common Tasks

### "I want to add a new MCP tool"

1. Create `src/tools/your-tool.ts` following the pattern in `get-schema.ts`
2. Define a Zod schema for inputs, write a handler function, export a `ToolDefinition`
3. Add it to the `tools` array in `src/tools/index.ts`
4. Run `npm run build` — the server will automatically register it

### "I want to index new documentation categories"

Edit the `SOURCE_TABLES` constant in `src/scripts/ingest.ts`:
```typescript
const SOURCE_TABLES = [
  { table: "_content_api", category: "api" },
  { table: "_content_guides", category: "guides" },
  // Add new ones here:
  { table: "_content_your_category", category: "your_category" },
];
```

### "I need to change how search results are formatted"

Edit the `handler` function in `src/tools/search-doc.ts`. The `formattedResults` mapping controls what fields are returned and how they're truncated.

### "The database seems corrupted or out of date"

```bash
npx tsx src/tests/drop-tables.ts   # Reset tables
npm run ingest                      # Re-ingest from source
cp ../feathers/website/.data/content/contents.sqlite data/contents.sqlite
npm run test:search                 # Verify
```
