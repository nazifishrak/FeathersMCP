/**
 * FeathersJS Documentation Database - Query Layer
 *
 * PURPOSE:
 * This module provides the query interface for the MCP tools to search
 * the FeathersJS documentation database. It wraps FTS5 queries into
 * clean TypeScript functions that return structured results.
 *
 * HOW IT WORKS:
 * 1. Opens the SQLite database (contents.sqlite) in read-only mode
 * 2. Provides search functions that use FTS5 full-text search
 * 3. Returns ranked results with BM25 scoring
 * 4. All queries are parameterized (prevents SQL injection)
 *
 * USED BY:
 * - src/tools/search-doc.ts    → searchDocumentation()
 * - src/tools/get-schema.ts    → getSchema()
 * - src/tools/get-menu.ts      → getMenuStructure()
 */

import Database from "better-sqlite3";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

// ---------------------------------------------------------------------------
// TYPES
// ---------------------------------------------------------------------------

/** A single search result returned by searchDocumentation() */
export interface SearchResult {
  id: number;
  title: string;
  category: string;
  subcategory: string;
  content_plain: string;
  code_examples: Array<{ language: string; code: string }>;
  source_url: string;
  score: number;
}

/** Schema information for a table */
export interface TableSchema {
  table_name: string;
  columns: string[];
}

/** Menu/navigation item */
export interface MenuItem {
  id: number;
  title: string;
  category: string;
  subcategory: string;
  source_url: string;
}

// ---------------------------------------------------------------------------
// DATABASE CONNECTION
// ---------------------------------------------------------------------------

let db: Database.Database | null = null;

/**
 * Get or create the database connection.
 * Opens in read-only mode since MCP tools should never modify the docs.
 *
 * @param dbPath - Optional explicit path to the SQLite file.
 *                 Defaults to: ../feathers/website/.data/content/contents.sqlite
 */
export function getDatabase(dbPath?: string): Database.Database {
  if (db) return db;

  const resolvedPath = dbPath || findDatabasePath();

  if (!fs.existsSync(resolvedPath)) {
    throw new Error(
      `Documentation database not found at: ${resolvedPath}\n` +
        `Run the ingestion script first: npm run ingest`,
    );
  }

  db = new Database(resolvedPath, { readonly: true });
  db.pragma("journal_mode = WAL");

  // Verify the FTS5 table exists
  const ftsCheck = db
    .prepare(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='documents_fts'",
    )
    .get();
  if (!ftsCheck) {
    throw new Error(
      "FTS5 index not found. Run the ingestion script: npm run ingest",
    );
  }

  return db;
}

/**
 * Finds the database file by checking common locations.
 */
function findDatabasePath(): string {
  // When running from FeatherMCP/build/ or FeatherMCP/src/
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);

  const candidates = [
    // Relative to FeatherMCP/src/db/ -> workspace root -> feathers
    path.resolve(
      __dirname,
      "../../../feathers/website/.data/content/contents.sqlite",
    ),
    // Relative to build output (FeatherMCP/build/db/)
    path.resolve(
      __dirname,
      "../../../feathers/website/.data/content/contents.sqlite",
    ),
    // Bundled in the project's data directory
    path.resolve(__dirname, "../data/contents.sqlite"),
    path.resolve(__dirname, "../../data/contents.sqlite"),
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }

  // Default fallback
  return candidates[0];
}

/**
 * Close the database connection (for clean shutdown).
 */
export function closeDatabase(): void {
  if (db) {
    db.close();
    db = null;
  }
}

// ---------------------------------------------------------------------------
// SEARCH FUNCTIONS
// ---------------------------------------------------------------------------

/**
 * Execute a read-only SQL query and return the results.
 * Use for ad-hoc queries from MCP tools.
 *
 * @param sql - The SQL query to execute
 * @param params - Optional query parameters
 */
export function executeQuery(sql: string, params: unknown[] = []): unknown[] {
  const database = getDatabase();

  // Safety check: only allow SELECT statements
  const trimmed = sql.trim().toUpperCase();
  if (!trimmed.startsWith("SELECT")) {
    throw new Error("Only SELECT queries are allowed");
  }

  return database.prepare(sql).all(...params);
}

/**
 * Search the documentation using FTS5 full-text search.
 *
 * HOW BM25 SCORING WORKS:
 * - BM25 assigns a relevance score to each document
 * - We weight columns differently:
 *     title (10.0)  – title matches are most important
 *     category (5.0) – category matches help narrow scope
 *     content_plain (1.0) – body text matches are baseline
 *     keywords (3.0) – keyword matches boost relevance
 * - Lower (more negative) scores = better matches
 *
 * @param query     - The search terms (e.g., "authentication hooks")
 * @param category  - Optional category filter ("api", "guides", "cookbook", "ecosystem")
 * @param limit     - Max results to return (default: 5)
 */
export function searchDocumentation(
  query: string,
  category?: string,
  limit: number = 5,
): SearchResult[] {
  const database = getDatabase();

  // Sanitize the query for FTS5
  // FTS5 has its own query syntax - we need to handle special chars
  const sanitizedQuery = sanitizeFtsQuery(query);

  if (!sanitizedQuery) {
    return [];
  }

  let sql: string;
  let params: unknown[];

  if (category) {
    sql = `
      SELECT
        d.id,
        d.title,
        d.category,
        d.subcategory,
        d.content_plain,
        d.code_examples,
        d.source_url,
        bm25(documents_fts, 10.0, 5.0, 1.0, 3.0) as score
      FROM documents_fts
      JOIN documents d ON d.id = documents_fts.rowid
      WHERE documents_fts MATCH ?
        AND d.category = ?
      ORDER BY score
      LIMIT ?
    `;
    params = [sanitizedQuery, category, limit];
  } else {
    sql = `
      SELECT
        d.id,
        d.title,
        d.category,
        d.subcategory,
        d.content_plain,
        d.code_examples,
        d.source_url,
        bm25(documents_fts, 10.0, 5.0, 1.0, 3.0) as score
      FROM documents_fts
      JOIN documents d ON d.id = documents_fts.rowid
      WHERE documents_fts MATCH ?
      ORDER BY score
      LIMIT ?
    `;
    params = [sanitizedQuery, limit];
  }

  const rows = database.prepare(sql).all(...params) as Array<{
    id: number;
    title: string;
    category: string;
    subcategory: string;
    content_plain: string;
    code_examples: string;
    source_url: string;
    score: number;
  }>;

  return rows.map((row) => ({
    ...row,
    code_examples: JSON.parse(row.code_examples || "[]"),
  }));
}

/**
 * Sanitize a user's natural language query for FTS5.
 *
 * FTS5 has special syntax characters that can cause parse errors.
 * We convert the user's query into a safe OR-based keyword search.
 *
 * Example: "how do hooks work?" → "hooks OR work"
 */
function sanitizeFtsQuery(query: string): string {
  // Common stop words to remove
  const stopWords = new Set([
    "a",
    "an",
    "and",
    "are",
    "as",
    "at",
    "be",
    "but",
    "by",
    "do",
    "for",
    "from",
    "had",
    "has",
    "have",
    "he",
    "her",
    "his",
    "how",
    "i",
    "if",
    "in",
    "into",
    "is",
    "it",
    "its",
    "me",
    "my",
    "no",
    "not",
    "of",
    "on",
    "or",
    "our",
    "so",
    "that",
    "the",
    "their",
    "them",
    "then",
    "there",
    "these",
    "they",
    "this",
    "to",
    "too",
    "up",
    "us",
    "was",
    "we",
    "what",
    "when",
    "where",
    "which",
    "who",
    "why",
    "will",
    "with",
    "you",
    "your",
    "can",
    "does",
    "did",
    "should",
    "would",
    "could",
    "about",
  ]);

  // Extract only alphanumeric words, remove stop words
  const words = query
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ") // Remove special characters
    .split(/\s+/) // Split on whitespace
    .filter((w) => w.length > 1) // Remove single chars
    .filter((w) => !stopWords.has(w)); // Remove stop words

  if (words.length === 0) return "";

  // Join with OR for broad matching
  return words.join(" OR ");
}

// ---------------------------------------------------------------------------
// SCHEMA & MENU FUNCTIONS
// ---------------------------------------------------------------------------

/**
 * Get the database schema — returns all tables and their columns.
 * This is what the get_db_schema MCP tool calls.
 */
export function getSchema(): TableSchema[] {
  const database = getDatabase();

  // Get all table names (excluding FTS internal tables)
  const tables = database
    .prepare(
      `SELECT name FROM sqlite_master
       WHERE type='table'
       AND name NOT LIKE '%_fts%'
       AND name NOT LIKE 'sqlite_%'
       AND name NOT LIKE '%_config'
       AND name NOT LIKE '%_data'
       AND name NOT LIKE '%_idx'
       AND name NOT LIKE '%_content'
       AND name NOT LIKE '%_docsize'
       ORDER BY name`,
    )
    .all() as Array<{ name: string }>;

  return tables.map((t) => {
    const columns = database
      .prepare(`PRAGMA table_info("${t.name}")`)
      .all() as Array<{ name: string; type: string }>;
    return {
      table_name: t.name,
      columns: columns.map((c) => `${c.name} (${c.type || "TEXT"})`),
    };
  });
}

/**
 * Get the document menu structure — returns categories and their documents.
 * This is what the get_menu_structure MCP tool calls.
 *
 * Provides a hierarchical view of all documentation organized by category.
 */
export function getMenuStructure(): Record<string, MenuItem[]> {
  const database = getDatabase();

  const rows = database
    .prepare(
      `SELECT id, title, category, subcategory, source_url
       FROM documents
       ORDER BY category, subcategory, title`,
    )
    .all() as MenuItem[];

  // Group by category
  const menu: Record<string, MenuItem[]> = {};
  for (const row of rows) {
    if (!menu[row.category]) {
      menu[row.category] = [];
    }
    menu[row.category].push(row);
  }

  return menu;
}
