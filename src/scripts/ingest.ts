#!/usr/bin/env npx tsx
/**
 * FeathersJS Documentation Ingestion Script (Stage 2)
 *
 * PURPOSE:
 * This script takes the raw SQLite database that Nuxt Content generates (Stage 1)
 * and creates a search-optimized version with:
 *   1. A unified `documents` table — consolidates 4 source content tables into one
 *   2. A `documents_fts` FTS5 virtual table — enables fast full-text search with
 *      BM25 ranking, Porter stemming, and Unicode61 tokenization
 *
 * HOW IT WORKS:
 * Stage 1 (automatic): Nuxt Content reads Markdown files from website/content/
 *   and produces website/.data/content/contents.sqlite with 11 tables.
 * Stage 2 (this script): We read from 4 of those tables (_content_api,
 *   _content_guides, _content_cookbook, _content_ecosystem), extract text + code,
 *   and insert into our own optimized tables for MCP search.
 *
 * KEY CONCEPTS:
 * - "minimark" is Nuxt Content's internal JSON AST format for Markdown content.
 *   We parse this to extract plain text and code blocks.
 * - FTS5 (Full-Text Search 5) is SQLite's built-in search engine. It creates
 *   an inverted index like a book index — mapping words to documents.
 * - BM25 is the ranking algorithm. It scores documents based on term frequency
 *   and document length. Higher weight = more important matches.
 * - Porter stemmer normalizes words: "authenticating" → "authenticate" so
 *   variations match.
 * - Incremental updates use __hash__ to avoid re-processing unchanged docs.
 *
 * USAGE:
 *   npx tsx src/scripts/ingest.ts [path-to-contents.sqlite]
 *
 * If no path is provided, it looks for:
 *   ../feathers/website/.data/content/contents.sqlite
 */

import Database from "better-sqlite3";
import path from "path";
import fs from "fs";

// ---------------------------------------------------------------------------
// CONFIGURATION
// ---------------------------------------------------------------------------

/** The 4 tables we ingest from. Each maps to a category name. */
const SOURCE_TABLES: Record<string, string> = {
  _content_api: "api",
  _content_guides: "guides",
  _content_cookbook: "cookbook",
  _content_ecosystem: "ecosystem",
};

/** FTS5 column weights for BM25 ranking.
 *  Higher weight = matches in that column score higher.
 *  title (10) > category (5) > keywords (3) > content_plain (1.0)
 */
const FTS_WEIGHTS = {
  title: 10.0,
  category: 5.0,
  keywords: 3.0,
  content_plain: 1.0,
};

// ---------------------------------------------------------------------------
// MINIMARK PARSER
// ---------------------------------------------------------------------------
// The body column in Nuxt Content's tables is NOT raw Markdown.
// It's a JSON format called "minimark" — a compact AST (Abstract Syntax Tree).
//
// Structure looks like:
//   { "type": "minimark", "value": [ ...nodes ] }
//
// Where each node is either:
//   - A string (plain text)
//   - An array: [tagName, attributes, ...children]
//
// Example:
//   ["p", {}, "Hello ", ["code", {}, "world"]]
//   → <p>Hello <code>world</code></p>
//   → plain text: "Hello world"
//
// We need TWO outputs from parsing:
//   1. content_plain — all text with Markdown/HTML stripped (for FTS indexing)
//   2. code_examples — extracted fenced code blocks (for returning to users)
// ---------------------------------------------------------------------------

interface CodeBlock {
  language: string;
  code: string;
}

/**
 * Recursively extracts plain text from a minimark node.
 * Skips code blocks (those are extracted separately).
 */
function extractPlainText(node: unknown): string {
  // Base case: it's a string → return it
  if (typeof node === "string") {
    return node;
  }

  // It's an array node: [tagName, attrs, ...children]
  if (Array.isArray(node)) {
    const tagName = node[0];

    // Skip <pre> blocks entirely — we handle them in extractCodeBlocks
    if (tagName === "pre") {
      return "";
    }

    // Skip badge elements (changelog links, npm badges, etc.)
    if (tagName === "badges") {
      return "";
    }

    // For all other tags, recursively extract text from children
    // Children start at index 2 (index 0 = tag, index 1 = attrs)
    const children = node.slice(2);
    const texts = children.map((child: unknown) => extractPlainText(child));

    // Add spacing after block-level elements
    const blockTags = ["h1", "h2", "h3", "h4", "h5", "h6", "p", "li", "tr"];
    const suffix = blockTags.includes(tagName as string) ? "\n" : "";

    return texts.join("") + suffix;
  }

  return "";
}

/**
 * Recursively extracts fenced code blocks from minimark nodes.
 * Code blocks in minimark look like:
 *   ["pre", { "code": "...", "language": "ts", ... }, ["code", ...]]
 *
 * The actual code string is in the "code" attribute of the <pre> tag.
 */
function extractCodeBlocks(node: unknown): CodeBlock[] {
  const blocks: CodeBlock[] = [];

  if (!Array.isArray(node)) {
    return blocks;
  }

  const tagName = node[0];

  if (tagName === "pre") {
    // The attributes object is at index 1
    const attrs = node[1];
    if (attrs && typeof attrs === "object" && "code" in attrs) {
      blocks.push({
        language: (attrs as Record<string, string>).language || "text",
        code: (attrs as Record<string, string>).code || "",
      });
    }
    return blocks; // Don't recurse into <pre> children
  }

  // Recurse into children of non-pre nodes
  const children = node.slice(typeof node[1] === "object" && !Array.isArray(node[1]) ? 2 : 1);
  for (const child of children) {
    blocks.push(...extractCodeBlocks(child));
  }

  return blocks;
}

/**
 * Parses a minimark body JSON string and returns plain text + code blocks.
 */
function parseMinimark(bodyJson: string): {
  plainText: string;
  codeExamples: CodeBlock[];
} {
  try {
    const parsed = JSON.parse(bodyJson);

    if (!parsed || parsed.type !== "minimark" || !Array.isArray(parsed.value)) {
      return { plainText: "", codeExamples: [] };
    }

    // Extract plain text from all top-level nodes
    const textParts = parsed.value.map((node: unknown) =>
      extractPlainText(node)
    );
    const plainText = textParts
      .join("\n")
      .replace(/\n{3,}/g, "\n\n") // Collapse excessive newlines
      .trim();

    // Extract code blocks from all top-level nodes
    const codeExamples: CodeBlock[] = [];
    for (const node of parsed.value) {
      codeExamples.push(...extractCodeBlocks(node));
    }

    return { plainText, codeExamples };
  } catch {
    // If JSON parsing fails, return empty
    return { plainText: "", codeExamples: [] };
  }
}

/**
 * Extracts the subcategory from a document path.
 * Example: "/api/client/rest" → "client"
 *          "/guides/basics/setup" → "basics"
 *          "/api/hooks" → "" (no subcategory)
 */
function extractSubcategory(docPath: string): string {
  // Path looks like: /api/hooks or /guides/basics/setup
  const segments = docPath.split("/").filter(Boolean);
  // segments[0] is the category (api, guides, etc.)
  // segments[1] might be a subcategory if there are 3+ segments
  if (segments.length >= 3) {
    return segments[1];
  }
  return "";
}

// ---------------------------------------------------------------------------
// DATABASE SETUP
// ---------------------------------------------------------------------------

/**
 * Creates the `documents` table and `documents_fts` FTS5 virtual table.
 *
 * The `documents` table is where we store the unified, processed content.
 * The `documents_fts` table is the FTS5 search index — it's a "virtual table"
 * meaning SQLite manages its internal inverted index automatically.
 *
 * We also create triggers so that when you INSERT/UPDATE/DELETE in `documents`,
 * the FTS index updates automatically.
 */
function createTables(db: Database.Database): void {
  // Run everything in a transaction for speed and atomicity
  db.exec(`
    -- =====================================================
    -- UNIFIED DOCUMENTS TABLE
    -- One row per documentation page, regardless of source
    -- =====================================================
    CREATE TABLE IF NOT EXISTS documents (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      title           TEXT NOT NULL,                  -- Page title ("Hooks", "Authentication", etc.)
      category        TEXT NOT NULL,                  -- Source: "api", "guides", "cookbook", "ecosystem"
      subcategory     TEXT DEFAULT '',                -- Sub-path: "basics", "client", "deploy", etc.
      content_md      TEXT NOT NULL,                  -- Original minimark JSON body (preserved for reference)
      content_plain   TEXT NOT NULL,                  -- Plain text with Markdown stripped (for FTS indexing)
      code_examples   TEXT DEFAULT '[]',              -- JSON array of {language, code} objects
      keywords        TEXT DEFAULT '',                -- Concatenated title + description for FTS boosting
      version         TEXT DEFAULT 'v6',              -- FeathersJS version
      source_file     TEXT NOT NULL,                  -- Original stem (e.g., "api/hooks")
      source_url      TEXT NOT NULL,                  -- Full URL: https://v6.feathersjs.com/api/hooks
      content_hash    TEXT UNIQUE,                    -- Hash from __hash__ for incremental updates
      created_at      TEXT DEFAULT (datetime('now'))  -- When this row was ingested
    );

    -- =====================================================
    -- FTS5 FULL-TEXT SEARCH INDEX
    -- This is the magic that makes search fast.
    --
    -- How FTS5 works (conceptual):
    -- 1. When you insert text, FTS5 breaks it into words (tokens)
    -- 2. The Porter stemmer reduces words to roots:
    --    "authenticating" → "authenticat"
    --    "authentication" → "authenticat"
    --    So they MATCH each other!
    -- 3. It builds an inverted index: word → [doc1, doc3, doc7]
    -- 4. When you search, it looks up words in the index instantly
    -- 5. BM25 ranking scores results by relevance
    --
    -- content='documents' means this FTS table is linked to the
    -- documents table — it reads content FROM documents.
    -- content_rowid='id' tells it which column is the row ID.
    -- =====================================================
    CREATE VIRTUAL TABLE IF NOT EXISTS documents_fts USING fts5(
      title,
      category,
      content_plain,
      keywords,
      content='documents',
      content_rowid='id',
      tokenize='porter unicode61'
    );

    -- =====================================================
    -- TRIGGERS: Keep FTS index in sync with documents table
    -- These fire automatically on INSERT/UPDATE/DELETE
    -- =====================================================

    -- When a new document is inserted, also add it to FTS
    CREATE TRIGGER IF NOT EXISTS documents_ai AFTER INSERT ON documents BEGIN
      INSERT INTO documents_fts(rowid, title, category, content_plain, keywords)
      VALUES (new.id, new.title, new.category, new.content_plain, new.keywords);
    END;

    -- When a document is deleted, remove it from FTS
    CREATE TRIGGER IF NOT EXISTS documents_ad AFTER DELETE ON documents BEGIN
      INSERT INTO documents_fts(documents_fts, rowid, title, category, content_plain, keywords)
      VALUES('delete', old.id, old.title, old.category, old.content_plain, old.keywords);
    END;

    -- When a document is updated, remove old FTS entry and add new one
    CREATE TRIGGER IF NOT EXISTS documents_au AFTER UPDATE ON documents BEGIN
      INSERT INTO documents_fts(documents_fts, rowid, title, category, content_plain, keywords)
      VALUES('delete', old.id, old.title, old.category, old.content_plain, old.keywords);
      INSERT INTO documents_fts(rowid, title, category, content_plain, keywords)
      VALUES (new.id, new.title, new.category, new.content_plain, new.keywords);
    END;
  `);
}

// ---------------------------------------------------------------------------
// INGESTION LOGIC
// ---------------------------------------------------------------------------

interface SourceRow {
  id: string;
  title: string;
  body: string;
  description: string | null;
  path: string;
  stem: string;
  __hash__: string;
}

/**
 * Main ingestion function.
 *
 * For each of the 4 source tables:
 *   1. Read all rows
 *   2. Check if this row was already ingested (via content_hash)
 *   3. Parse the minimark body → plain text + code examples
 *   4. Insert into the unified `documents` table
 *   5. FTS5 triggers auto-populate the search index
 */
function ingest(db: Database.Database): {
  inserted: number;
  skipped: number;
  errors: number;
} {
  const stats = { inserted: 0, skipped: 0, errors: 0 };

  // Prepare the INSERT statement (reusable for performance)
  const insertStmt = db.prepare(`
    INSERT INTO documents (
      title, category, subcategory, content_md, content_plain,
      code_examples, keywords, version, source_file, source_url, content_hash
    ) VALUES (
      @title, @category, @subcategory, @content_md, @content_plain,
      @code_examples, @keywords, @version, @source_file, @source_url, @content_hash
    )
  `);

  // Check if a hash already exists (for incremental updates)
  const hashExists = db.prepare(
    "SELECT 1 FROM documents WHERE content_hash = ?"
  );

  // Process each source table
  for (const [tableName, category] of Object.entries(SOURCE_TABLES)) {
    console.log(`\n📖 Processing table: ${tableName} (category: ${category})`);

    // Read all rows from this source table
    let rows: SourceRow[];
    try {
      rows = db
        .prepare(
          `SELECT id, title, body, description, path, stem, "__hash__" FROM "${tableName}"`
        )
        .all() as SourceRow[];
    } catch (err) {
      console.error(`  ❌ Failed to read table ${tableName}:`, err);
      stats.errors++;
      continue;
    }

    console.log(`  Found ${rows.length} rows`);

    for (const row of rows) {
      // Skip if already ingested (incremental update check)
      if (row.__hash__ && hashExists.get(row.__hash__)) {
        console.log(`  ⏭️  Skipping "${row.title}" (unchanged)`);
        stats.skipped++;
        continue;
      }

      try {
        // Parse the minimark body
        const { plainText, codeExamples } = parseMinimark(row.body);

        if (!plainText && codeExamples.length === 0) {
          console.log(`  ⚠️  Skipping "${row.title}" (empty content)`);
          stats.skipped++;
          continue;
        }

        // Build the keywords field (title + description for FTS boosting)
        const keywords = [row.title, row.description || ""]
          .filter(Boolean)
          .join(" ");

        // Build the source URL
        const sourceUrl = `https://v6.feathersjs.com${row.path}`;

        // Insert into unified documents table
        insertStmt.run({
          title: row.title,
          category: category,
          subcategory: extractSubcategory(row.path),
          content_md: row.body,
          content_plain: plainText,
          code_examples: JSON.stringify(codeExamples),
          keywords: keywords,
          version: "v6",
          source_file: row.stem,
          source_url: sourceUrl,
          content_hash: row.__hash__,
        });

        console.log(
          `  ✅ Ingested "${row.title}" (${plainText.length} chars, ${codeExamples.length} code blocks)`
        );
        stats.inserted++;
      } catch (err) {
        console.error(`  ❌ Failed to ingest "${row.title}":`, err);
        stats.errors++;
      }
    }
  }

  return stats;
}

// ---------------------------------------------------------------------------
// MAIN
// ---------------------------------------------------------------------------

function main(): void {
  console.log("🚀 FeathersJS Documentation Ingestion Script (Stage 2)");
  console.log("=".repeat(60));

  // Resolve database path
  const dbPathArg = process.argv[2];
  const dbPath = dbPathArg
    ? path.resolve(dbPathArg)
    : path.resolve(
        __dirname,
        "../../feathers/website/.data/content/contents.sqlite"
      );

  console.log(`\n📂 Database path: ${dbPath}`);

  // Verify database exists
  if (!fs.existsSync(dbPath)) {
    console.error(`\n❌ Database file not found at: ${dbPath}`);
    console.error(
      "   Run 'pnpm run dev' in the feathers/website directory first to generate it."
    );
    console.error(
      "   Or provide the path as an argument: npx tsx src/scripts/ingest.ts /path/to/contents.sqlite"
    );
    process.exit(1);
  }

  // Open database (WAL mode for better concurrent read performance)
  const db = new Database(dbPath);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");

  console.log("\n📋 Stage 1: Database audit...");

  // Quick audit — show what we're working with
  for (const [tableName, category] of Object.entries(SOURCE_TABLES)) {
    const count = (
      db.prepare(`SELECT COUNT(*) as count FROM "${tableName}"`).get() as {
        count: number;
      }
    ).count;
    console.log(`  ${tableName} (→ ${category}): ${count} rows`);
  }

  console.log("\n🔨 Stage 2: Creating search tables...");
  createTables(db);
  console.log("  ✅ Tables and FTS5 index created");

  console.log("\n📥 Stage 3: Ingesting content...");

  // Wrap ingestion in a transaction for speed
  // (SQLite is ~100x faster when you batch inserts in a transaction)
  const transaction = db.transaction(() => {
    return ingest(db);
  });

  const stats = transaction();

  console.log("\n" + "=".repeat(60));
  console.log("📊 Ingestion Summary:");
  console.log(`  ✅ Inserted: ${stats.inserted} documents`);
  console.log(`  ⏭️  Skipped:  ${stats.skipped} documents (already ingested)`);
  console.log(`  ❌ Errors:   ${stats.errors}`);

  // Verify FTS index
  const ftsCount = (
    db.prepare("SELECT COUNT(*) as count FROM documents_fts").get() as {
      count: number;
    }
  ).count;
  console.log(`\n🔍 FTS index contains ${ftsCount} documents`);

  // Run a test search to verify everything works
  console.log("\n🧪 Test search: 'authentication hooks'");
  const testResults = db
    .prepare(
      `
    SELECT
      d.title,
      d.category,
      d.source_url,
      rank
    FROM documents_fts
    JOIN documents d ON d.id = documents_fts.rowid
    WHERE documents_fts MATCH 'authentication OR hooks'
    ORDER BY rank
    LIMIT 5
  `
    )
    .all() as Array<{
    title: string;
    category: string;
    source_url: string;
    rank: number;
  }>;

  if (testResults.length > 0) {
    console.log(`  Found ${testResults.length} results:`);
    for (const r of testResults) {
      console.log(`    📄 [${r.category}] ${r.title} (rank: ${r.rank.toFixed(4)})`);
      console.log(`       ${r.source_url}`);
    }
  } else {
    console.log("  ⚠️  No results found — FTS index may be empty");
  }

  // Close cleanly
  db.close();

  console.log("\n✅ Ingestion complete!");
  console.log(
    "   The database now has a searchable FTS5 index for MCP tools to use."
  );
}

main();
