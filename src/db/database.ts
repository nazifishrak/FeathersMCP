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
  source_file: string;
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
  source_file: string;
  source_url: string;
}

/** Full document with all fields */
export interface FullDocument {
  id: number;
  title: string;
  category: string;
  subcategory: string;
  content_plain: string;
  code_examples: Array<{ language: string; code: string }>;
  keywords: string;
  version: string;
  source_file: string;
  source_url: string;
  created_at: string;
}

/** Replace inline base64 data URIs with a placeholder to avoid bloating LLM context. */
export function stripBase64DataURIs(text: string): string {
  return text.replace(
    /data:[a-z]+\/[a-z0-9.+-]+;base64,[A-Za-z0-9+/=\s]+/gi,
    "[base64 image removed]",
  );
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
      `Run the ingestion script first: npm run ingest`
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
  // When running from FeathersMCP/build/ or FeathersMCP/src/
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);

  // Priority order:
  // 1. Bundled data/ directory (for end users who installed the package)
  // 2. Feathers workspace copy (for developers working on the MCP server)
  //
  // From src/db/  → ../../data/   = FeathersMCP/data/
  // From build/db/ → ../../data/  = FeathersMCP/data/
  const candidates = [
    // Bundled database — this is what users will have
    path.resolve(__dirname, "../../data/contents.sqlite"),
    // Dev fallback: feathers repo sitting next to FeathersMCP
    path.resolve(__dirname, "../../../feathers/website/.data/content/contents.sqlite"),
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }

  // Default fallback — will trigger a clear error in getDatabase()
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
        d.source_file,
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
        d.source_file,
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
    source_file: string;
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
 * We convert the user's query into a hybrid search that boosts title
 * matches while still matching across all columns.
 *
 * Example: "how do hooks work?" → "title:hooks OR title:work OR hooks OR work"
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

  // Hybrid search: boost title matches, then fall back to broad body match.
  // title:X terms get ranked higher by BM25 (weight 10.0) so pages whose
  // title contains the keyword surface first.
  const titleTerms = words.map((w) => `title:${w}`).join(" OR ");
  const bodyTerms = words.join(" OR ");
  return `${titleTerms} OR ${bodyTerms}`;
}

// ---------------------------------------------------------------------------
// SCHEMA & MENU FUNCTIONS
// ---------------------------------------------------------------------------

/**
 * Get the database schema — returns the documents table structure.
 * This is what the get_db_schema MCP tool calls.
 *
 * Only returns the `documents` table (the unified search table), not the
 * raw Nuxt Content source tables or internal FTS tables. The LLM only
 * needs to know about the table it can actually search.
 */
export function getSchema(): TableSchema[] {
  const database = getDatabase();

  // Only return the documents table — the only table MCP tools query.
  // The database also contains Nuxt Content internal tables (_content_api,
  // _content_guides, etc.) and FTS internal tables, but exposing those
  // to the LLM would be confusing and wasteful.
  const tables = database
    .prepare(
      `SELECT name FROM sqlite_master
       WHERE type='table'
       AND name = 'documents'
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
      `SELECT id, title, category, subcategory, source_file, source_url
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

/**
 * Fetch a single document by its title (case-insensitive).
 * Returns null if no document matches.
 */
export function getDocumentByTitle(title: string): FullDocument | null {
  const database = getDatabase();

  const raw = database
    .prepare(
      `SELECT
         id, title, category, subcategory, content_plain,
         code_examples, keywords, version, source_file, source_url, created_at
       FROM documents
       WHERE lower(title) = lower(?)
       LIMIT 1`
    )
    .get(title) as
    | (Omit<FullDocument, "code_examples"> & { code_examples: string })
    | undefined;

  if (!raw) return null;

  return {
    ...raw,
    code_examples: JSON.parse(raw.code_examples || "[]"),
  };
}

/**
 * Fetch a single document by its source_file path.
 *
 * The path is the stem stored during ingestion, e.g.:
 *   "api/hooks"          → /api/hooks page
 *   "guides/basics/setup" → /guides/basics/setup page
 *
 * Matching is case-insensitive and trims leading slashes so callers can
 * pass either "api/hooks" or "/api/hooks".
 *
 * Returns null if no document matches.
 */
export function getDocumentByPath(docPath: string): FullDocument | null {
  const database = getDatabase();

  // Normalise: strip leading slash, lowercase
  const normalised = docPath.replace(/^\/+/, "").toLowerCase();

  const raw = database
    .prepare(
      `SELECT
         id, title, category, subcategory, content_plain,
         code_examples, keywords, version, source_file, source_url, created_at
       FROM documents
       WHERE lower(source_file) = ?
       LIMIT 1`
    )
    .get(normalised) as
    | (Omit<FullDocument, "code_examples"> & { code_examples: string })
    | undefined;

  if (!raw) return null;

  return {
    ...raw,
    code_examples: JSON.parse(raw.code_examples || "[]"),
  };
}

/**
 * Fetch a single document by its numeric ID.
 * Useful when the caller already has an ID from getMenuStructure().
 */
export function getDocumentById(id: number): FullDocument | null {
  const database = getDatabase();

  const raw = database
    .prepare(
      `SELECT
         id, title, category, subcategory, content_plain,
         code_examples, keywords, version, source_file, source_url, created_at
       FROM documents
       WHERE id = ?
       LIMIT 1`
    )
    .get(id) as
    | (Omit<FullDocument, "code_examples"> & { code_examples: string })
    | undefined;

  if (!raw) return null;

  return {
    ...raw,
    code_examples: JSON.parse(raw.code_examples || "[]"),
  };
}
