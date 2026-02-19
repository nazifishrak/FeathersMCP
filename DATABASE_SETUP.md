# Static Database Setup

This document explains the database layer for the FeathersJS MCP Server, including what was built, the design choices made, and how to get it running locally.

## Overview

The MCP server needs to search FeathersJS v6 documentation. Instead of calling an external API, we use a local SQLite database with FTS5 (Full-Text Search) so that the LLM can query docs instantly with zero latency and no API costs.

The database is built in two stages, following Section 2.1 of the design report.

## Two-Stage Build Process

### Stage 1: Generate the Source Database

Nuxt Content (the framework that powers the FeathersJS website) automatically creates a SQLite database when you run the dev server. This database lives at:

```
feathers/website/.data/content/contents.sqlite
```

To generate it:

```bash
cd feathers/website
pnpm install
pnpm run dev
```

Wait until the server finishes building (you will see output like "Nitro built"), then stop it with Ctrl+C. The `contents.sqlite` file will now exist in `.data/content/`.

**Note:** The design report originally said the file would be called `content.sqlite`, but Nuxt Content actually generates `contents.sqlite` (with an "s"). The ingestion script accounts for this.

### Stage 2: Run the Ingestion Script

The ingestion script reads from the Nuxt-generated database and creates a search-optimized `documents` table with an FTS5 index.

```bash
cd FeatherMCP
npm run ingest
```

This will:

1. Open the `contents.sqlite` database (read from `feathers/website/.data/content/`)
2. Create a `documents` table with columns: `id`, `title`, `path`, `category`, `keywords`, `content_plain`, `code_blocks`, `content_hash`
3. Create an FTS5 virtual table `documents_fts` for full-text search
4. Create triggers to keep the FTS index in sync with the documents table
5. Parse all documentation from the Nuxt Content source tables (`content_api_*`, `content_guides_*`, `content_cookbook_*`, `content_ecosystem_*`)
6. Extract plain text and code blocks from Nuxt Content's minimark JSON format
7. Insert 47 documents with incremental update support (uses content hashing to skip unchanged docs on re-run)

## Database Schema

### `documents` Table

| Column | Type | Description |
|--------|------|-------------|
| id | INTEGER | Auto-incrementing primary key |
| title | TEXT | Document title extracted from metadata |
| path | TEXT | Unique document path (e.g., `/api/application`) |
| category | TEXT | One of: `api`, `guides`, `cookbook`, `ecosystem` |
| keywords | TEXT | Comma-separated keywords from frontmatter |
| content_plain | TEXT | Full plain text extracted from minimark AST |
| code_blocks | TEXT | JSON array of `{lang, code}` objects |
| content_hash | TEXT | MD5-style hash for incremental updates |

### `documents_fts` Virtual Table (FTS5)

This is the full-text search index. It mirrors `title`, `category`, `keywords`, and `content_plain` from the documents table.

Search uses BM25 ranking with these column weights:
- **title**: 10.0 (highest priority)
- **category**: 5.0
- **keywords**: 3.0
- **content_plain**: 1.0

## File Structure

```
src/
  db/
    database.ts        # Query layer (searchDocumentation, getSchema, getMenuStructure)
  scripts/
    ingest.ts          # Stage 2 ingestion script
  tools/
    get-schema.ts      # MCP tool: get_db_schema
    get-menu.ts        # MCP tool: get_menu_structure
    search-doc.ts      # MCP tool: search_documentation
  index.ts             # Main entry point, registers all tools
```

## `src/scripts/ingest.ts`

This is the ingestion script that:

- Reads 4 source tables from the Nuxt-generated `contents.sqlite` database
- Parses the Nuxt Content minimark JSON format to extract plain text and code blocks
- Creates a unified `documents` table with 47 rows (one per documentation page)
- Creates a `documents_fts` FTS5 virtual table (the full-text search index)
- Uses content hashing so subsequent runs only process changed documents

Run it once before doing anything else:

```bash
npm run ingest
```

### `src/db/database.ts`

This is the file you will import from. It provides three exported functions and three exported TypeScript types. It handles:

- Opening the database connection (singleton, read-only)
- Building FTS5 search queries
- Sanitizing user input for safe database queries
- Returning typed results



## 3. The Three Query Functions

### `searchDocumentation(query, category?, limit?)`

The primary search function. Searches all 47 documentation pages using FTS5 full-text search with BM25 relevance ranking.

**Import:**
```typescript
import { searchDocumentation } from "../db/database.js";
```

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `query` | `string` | Yes | The search terms, e.g. `"authentication hooks"` |
| `category` | `string` | No | Filter by category: `"api"`, `"guides"`, `"cookbook"`, or `"ecosystem"` |
| `limit` | `number` | No | Max results to return. Defaults to `5` |

**Returns:** `SearchResult[]`

Each `SearchResult` object looks like:

```typescript
{
  id: 3,
  title: "Hooks",
  category: "api",
  subcategory: "",
  content_plain: "Hooks are middleware functions that allow you to intercept...",
  code_examples: [
    { language: "typescript", code: "app.service('messages').hooks({ ... })" },
    { language: "typescript", code: "const myHook = async (context) => { ... }" }
  ],
  source_url: "https://v6.feathersjs.com/api/hooks",
  score: -12.847   // More negative = better match
}
```

**Important:** `score` values are negative. A score of `-15.0` is a better match than `-3.0`. Sort by `score` ascending (which is what the query already does).

**Examples:**

```typescript
// Basic search
const results = searchDocumentation("hooks");

// Search within a specific category
const apiResults = searchDocumentation("authentication", "api");

// Search with a custom result limit
const topTen = searchDocumentation("services", undefined, 10);
```

---

### `getSchema()`

Returns the structure of the `documents` table. Used by the `get_db_schema` MCP tool to tell the LLM what the database looks like so it can reason about what queries are possible.

**Import:**
```typescript
import { getSchema } from "../db/database.js";
```

**Parameters:** None

**Returns:** `TableSchema[]`

Each `TableSchema` object looks like:

```typescript
{
  table_name: "documents",
  columns: [
    "id (INTEGER)",
    "title (TEXT)",
    "category (TEXT)",
    "subcategory (TEXT)",
    "content_md (TEXT)",
    "content_plain (TEXT)",
    "code_examples (TEXT)",
    "keywords (TEXT)",
    "version (TEXT)",
    "source_file (TEXT)",
    "source_url (TEXT)",
    "content_hash (TEXT)",
    "created_at (TEXT)"
  ]
}
```

**Example:**

```typescript
const schema = getSchema();
// Returns an array with one entry: the documents table and all its columns
```

---

### `getMenuStructure()`

Returns all 47 documents organized by category. Used by the `get_menu_structure` MCP tool to give the LLM a navigation overview of the documentation so it knows what topics exist.

**Import:**
```typescript
import { getMenuStructure } from "../db/database.js";
```

**Parameters:** None

**Returns:** `Record<string, MenuItem[]>`

This is an object where each key is a category name and each value is an array of documents in that category:

```typescript
{
  "api": [
    { id: 1, title: "Application", category: "api", subcategory: "", source_url: "https://v6.feathersjs.com/api/application" },
    { id: 2, title: "Services",    category: "api", subcategory: "", source_url: "https://v6.feathersjs.com/api/services" },
    { id: 3, title: "Hooks",       category: "api", subcategory: "", source_url: "https://v6.feathersjs.com/api/hooks" },
    // ... 14 more api docs
  ],
  "guides": [
    { id: 18, title: "Getting Started", category: "guides", subcategory: "", source_url: "https://v6.feathersjs.com/guides" },
    // ... 13 more guide docs
  ],
  "cookbook": [
    // ... 15 cookbook docs
  ],
  "ecosystem": [
    // ... 1 ecosystem doc
  ]
}
```

**Example:**

```typescript
const menu = getMenuStructure();
const apiDocs = menu["api"];      // Array of 17 API docs
const guideDocs = menu["guides"]; // Array of 14 guide docs
```

---

### `closeDatabase()`

Closes the database connection cleanly. Call this in your server shutdown handler.

```typescript
import { closeDatabase } from "../db/database.js";

process.on("SIGINT", () => {
  closeDatabase();
  process.exit(0);
});
```
