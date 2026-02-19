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

