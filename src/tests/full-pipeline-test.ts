#!/usr/bin/env npx tsx
/**
 * Full Pipeline Test Suite
 *
 * Tests the entire database pipeline end-to-end:
 *   Test 1 — Database exists and is reachable
 *   Test 2 — Fresh ingestion (drop tables, re-ingest, verify 47 inserted)
 *   Test 3 — Incremental update (re-run ingest, verify 47 skipped, 0 inserted)
 *   Test 4 — Content quality (text length, code block counts for spot-checked docs)
 *   Test 5 — FTS5 index integrity (FTS count matches documents count)
 *   Test 6 — Search relevance (verify top result is sensible for known queries)
 *
 * Run with:
 *   npm run test:pipeline
 */

import Database from "better-sqlite3";
import { execSync } from "child_process";
import path from "path";
import fs from "fs";

// ---------------------------------------------------------------------------
// SETUP
// ---------------------------------------------------------------------------

const DB_PATH = path.resolve(
  import.meta.dirname || ".",
  "../../data/contents.sqlite"
);

// Resolved absolute path to the FeathersMCP project root (for running npm scripts)
const PROJECT_ROOT = path.resolve(import.meta.dirname || ".", "../..");

// Track results
let passed = 0;
let failed = 0;
const failures: string[] = [];

function pass(label: string): void {
  console.log(`  ✅ PASS: ${label}`);
  passed++;
}

function fail(label: string, reason: string): void {
  console.log(`  ❌ FAIL: ${label}`);
  console.log(`         → ${reason}`);
  failed++;
  failures.push(`[${label}] ${reason}`);
}

function section(title: string): void {
  console.log(`\n${"─".repeat(60)}`);
  console.log(`📋 ${title}`);
  console.log("─".repeat(60));
}

// ---------------------------------------------------------------------------
// TEST 1 — DATABASE EXISTS AND IS REACHABLE
// ---------------------------------------------------------------------------
section("Test 1: Database exists and is reachable");

if (!fs.existsSync(DB_PATH)) {
  fail("Database file exists", `File not found at: ${DB_PATH}`);
  console.log("\n❌ Cannot proceed without the database. Run pnpm dev in feathers/website first.");
  throw new Error(`Database file not found at: ${DB_PATH}`);
}
pass("Database file exists");
console.log(`  📂 Path: ${DB_PATH}`);

let db: Database.Database;
try {
  db = new Database(DB_PATH);
  db.pragma("journal_mode = WAL");
  pass("Database connection opens");
} catch (err) {
  fail("Database connection opens", String(err));
  throw new Error(`Database connection failed: ${err}`);
}

// Verify source tables exist
const expectedSourceTables = ["_content_api", "_content_guides", "_content_cookbook", "_content_ecosystem"];
for (const table of expectedSourceTables) {
  const exists = db
    .prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name=?`)
    .get(table);
  if (exists) {
    pass(`Source table "${table}" exists`);
  } else {
    fail(`Source table "${table}" exists`, `Table not found in database`);
  }
}

db.close();

// ---------------------------------------------------------------------------
// TEST 2 — FRESH INGESTION
// Drop documents + documents_fts, re-run npm run ingest, verify 47 inserted
// ---------------------------------------------------------------------------
section("Test 2: Fresh ingestion (drop tables and re-ingest from scratch)");

// Drop the documents and FTS tables to simulate a fresh start
console.log("  🗑️  Dropping documents and documents_fts tables...");
try {
  const dbWrite = new Database(DB_PATH);
  dbWrite.exec(`
    DROP TABLE IF EXISTS documents_fts;
    DROP TRIGGER IF EXISTS documents_ai;
    DROP TRIGGER IF EXISTS documents_ad;
    DROP TRIGGER IF EXISTS documents_au;
    DROP TABLE IF EXISTS documents;
  `);
  dbWrite.close();
  pass("Tables dropped successfully");
} catch (err) {
  fail("Tables dropped successfully", String(err));
  throw new Error(`Failed to drop tables: ${err}`);
}

// Run the ingestion script and capture output
console.log("  🚀 Running npm run ingest...\n");
let ingestOutput = "";
try {
  ingestOutput = execSync("npm run ingest", {
    cwd: PROJECT_ROOT,
    encoding: "utf8",
    timeout: 60000,
  });
  // Print indented
  for (const line of ingestOutput.split("\n")) {
    console.log(`  ${line}`);
  }
} catch (err: unknown) {
  const execError = err as { stdout?: string; stderr?: string; message?: string };
  fail("npm run ingest exited with code 0", execError.stderr || execError.message || String(err));
  throw new Error(`npm run ingest failed: ${execError.stderr || execError.message || err}`);
}

// Verify counts from output
const insertedMatch = ingestOutput.match(/✅ Inserted:\s*(\d+)/);
const skippedMatch = ingestOutput.match(/⏭️\s*Skipped:\s*(\d+)/);
const errorsMatch = ingestOutput.match(/❌ Errors:\s*(\d+)/);

const inserted = insertedMatch ? parseInt(insertedMatch[1]) : -1;
const skipped = skippedMatch ? parseInt(skippedMatch[1]) : -1;
const errors = errorsMatch ? parseInt(errorsMatch[1]) : -1;

if (inserted === 47) {
  pass(`Fresh ingestion inserted 47 documents (got ${inserted})`);
} else {
  fail(`Fresh ingestion inserted 47 documents`, `Expected 47, got ${inserted}`);
}

if (skipped === 0) {
  pass(`Fresh ingestion skipped 0 documents (got ${skipped})`);
} else {
  fail(`Fresh ingestion skipped 0 documents`, `Expected 0, got ${skipped}`);
}

if (errors === 0) {
  pass(`Fresh ingestion had 0 errors (got ${errors})`);
} else {
  fail(`Fresh ingestion had 0 errors`, `Expected 0, got ${errors}`);
}

// Verify documents table now exists and has 47 rows
const dbCheck = new Database(DB_PATH);
const docCount = (dbCheck.prepare("SELECT COUNT(*) as count FROM documents").get() as { count: number }).count;

if (docCount === 47) {
  pass(`documents table contains 47 rows (got ${docCount})`);
} else {
  fail(`documents table contains 47 rows`, `Expected 47, got ${docCount}`);
}

dbCheck.close();

// ---------------------------------------------------------------------------
// TEST 3 — INCREMENTAL UPDATE
// Re-run ingest without dropping tables — should skip all 47
// ---------------------------------------------------------------------------
section("Test 3: Incremental update (re-run ingest, should skip everything)");

console.log("  🔄 Running npm run ingest again...\n");
let ingestOutput2 = "";
try {
  ingestOutput2 = execSync("npm run ingest", {
    cwd: PROJECT_ROOT,
    encoding: "utf8",
    timeout: 60000,
  });
  for (const line of ingestOutput2.split("\n")) {
    console.log(`  ${line}`);
  }
} catch (err: unknown) {
  const execError = err as { stdout?: string; stderr?: string; message?: string };
  fail("Second npm run ingest exited with code 0", execError.stderr || execError.message || String(err));
}

const inserted2Match = ingestOutput2.match(/✅ Inserted:\s*(\d+)/);
const skipped2Match = ingestOutput2.match(/⏭️\s*Skipped:\s*(\d+)/);
const errors2Match = ingestOutput2.match(/❌ Errors:\s*(\d+)/);

const inserted2 = inserted2Match ? parseInt(inserted2Match[1]) : -1;
const skipped2 = skipped2Match ? parseInt(skipped2Match[1]) : -1;
const errors2 = errors2Match ? parseInt(errors2Match[1]) : -1;

if (inserted2 === 0) {
  pass(`Second run inserted 0 documents (got ${inserted2})`);
} else {
  fail(`Second run inserted 0 documents`, `Expected 0, got ${inserted2}`);
}

if (skipped2 === 47) {
  pass(`Second run skipped all 47 documents (got ${skipped2})`);
} else {
  fail(`Second run skipped all 47 documents`, `Expected 47, got ${skipped2}`);
}

if (errors2 === 0) {
  pass(`Second run had 0 errors (got ${errors2})`);
} else {
  fail(`Second run had 0 errors`, `Expected 0, got ${errors2}`);
}

// ---------------------------------------------------------------------------
// TEST 4 — CONTENT QUALITY
// Spot-check that parsed content is readable and code blocks were extracted
// ---------------------------------------------------------------------------
section("Test 4: Content quality spot checks");

const dbQuality = new Database(DB_PATH, { readonly: true });

interface DocQuality {
  title: string;
  category: string;
  text_length: number;
  code_count: number;
  has_url: number;
}

// Check specific documents we know should have content
const spotChecks: Array<{ title: string; minTextLength: number; minCodeCount: number }> = [
  { title: "Hooks",           minTextLength: 1000, minCodeCount: 5  },
  { title: "Authentication",  minTextLength: 500,  minCodeCount: 1  },
  { title: "Services",        minTextLength: 500,  minCodeCount: 1  },
  { title: "Application",     minTextLength: 500,  minCodeCount: 1  },
];

for (const check of spotChecks) {
  const row = dbQuality
    .prepare(`
      SELECT
        title,
        category,
        LENGTH(content_plain) as text_length,
        json_array_length(code_examples) as code_count,
        CASE WHEN source_url LIKE 'https://v6.feathersjs.com%' THEN 1 ELSE 0 END as has_url
      FROM documents
      WHERE title = ?
      LIMIT 1
    `)
    .get(check.title) as DocQuality | undefined;

  if (!row) {
    fail(`"${check.title}" exists in documents table`, "Row not found");
    continue;
  }

  if (row.text_length >= check.minTextLength) {
    pass(`"${check.title}" has ≥${check.minTextLength} chars of plain text (got ${row.text_length})`);
  } else {
    fail(`"${check.title}" has ≥${check.minTextLength} chars of plain text`, `Got only ${row.text_length} chars`);
  }

  if (row.code_count >= check.minCodeCount) {
    pass(`"${check.title}" has ≥${check.minCodeCount} code block(s) (got ${row.code_count})`);
  } else {
    fail(`"${check.title}" has ≥${check.minCodeCount} code block(s)`, `Got only ${row.code_count}`);
  }

  if (row.has_url === 1) {
    pass(`"${check.title}" has a valid source_url`);
  } else {
    fail(`"${check.title}" has a valid source_url`, "URL does not start with https://v6.feathersjs.com");
  }
}

// Check category distribution
const categoryCounts = dbQuality
  .prepare(`SELECT category, COUNT(*) as count FROM documents GROUP BY category ORDER BY category`)
  .all() as Array<{ category: string; count: number }>;

const expectedCounts: Record<string, number> = {
  api: 17, cookbook: 15, ecosystem: 1, guides: 14,
};

console.log("\n  📊 Category distribution:");
for (const row of categoryCounts) {
  const expected = expectedCounts[row.category];
  console.log(`     ${row.category}: ${row.count} docs (expected ${expected ?? "?"})`);
  if (expected !== undefined && row.count === expected) {
    pass(`Category "${row.category}" has ${expected} docs`);
  } else if (expected !== undefined) {
    fail(`Category "${row.category}" has ${expected} docs`, `Got ${row.count}`);
  }
}

dbQuality.close();

// ---------------------------------------------------------------------------
// TEST 5 — FTS5 INDEX INTEGRITY
// Count in FTS must match count in documents
// ---------------------------------------------------------------------------
section("Test 5: FTS5 index integrity");

const dbFts = new Database(DB_PATH, { readonly: true });

const docsTotal = (dbFts.prepare("SELECT COUNT(*) as count FROM documents").get() as { count: number }).count;
const ftsTotal  = (dbFts.prepare("SELECT COUNT(*) as count FROM documents_fts").get() as { count: number }).count;

console.log(`  documents table:  ${docsTotal} rows`);
console.log(`  documents_fts:    ${ftsTotal} rows`);

if (docsTotal === ftsTotal) {
  pass(`FTS index count (${ftsTotal}) matches documents count (${docsTotal})`);
} else {
  fail(`FTS index count matches documents count`, `documents=${docsTotal}, fts=${ftsTotal}`);
}

// Verify FTS5 can actually handle a basic query without errors
try {
  const ftsTest = dbFts
    .prepare(`SELECT COUNT(*) as count FROM documents_fts WHERE documents_fts MATCH 'hook'`)
    .get() as { count: number };
  if (ftsTest.count > 0) {
    pass(`FTS5 MATCH query for "hook" returns results (${ftsTest.count} rows)`);
  } else {
    fail(`FTS5 MATCH query for "hook" returns results`, "Returned 0 rows — index may be empty");
  }
} catch (err) {
  fail(`FTS5 MATCH query executes without error`, String(err));
}

// Verify Porter stemmer is working (searching one word form matches another word form)
try {
  // "authenticate" and "authentication" should both stem to the same root,
  // so searching "authenticate" should match docs containing "authentication"
  const stemTest = dbFts
    .prepare(`SELECT COUNT(*) as count FROM documents_fts WHERE documents_fts MATCH 'authenticate'`)
    .get() as { count: number };
  if (stemTest.count > 0) {
    pass(`Porter stemmer works: searching "authenticate" matches ${stemTest.count} doc(s) containing "authentication"`);
  } else {
    fail(`Porter stemmer works`, 'Searching "authenticate" returned 0 rows — should match authentication docs');
  }
} catch (err) {
  fail(`Porter stemmer test executes without error`, String(err));
}

dbFts.close();

// ---------------------------------------------------------------------------
// TEST 6 — SEARCH RELEVANCE
// Use database.ts functions to verify search returns sensible top results
// ---------------------------------------------------------------------------
section("Test 6: Search relevance via database.ts");

import { searchDocumentation, getMenuStructure, getSchema, getDocumentByTitle, getDocumentById, getDocumentByPath, closeDatabase } from "../db/database.js";

interface RelevanceCheck {
  query: string;
  category?: string;
  expectedTitleContains: string;
  description: string;
}

const relevanceChecks: RelevanceCheck[] = [
  {
    query: "authentication",
    expectedTitleContains: "Authentication",
    description: 'searching "authentication" should surface the Authentication doc',
  },
  {
    query: "hooks middleware",
    expectedTitleContains: "Hooks",
    description: 'searching "hooks middleware" should surface the Hooks doc',
  },
  {
    query: "services",
    category: "api",
    expectedTitleContains: "Services",
    description: 'searching "services" in api should surface the Services doc',
  },
  {
    query: "jwt token revoke",
    expectedTitleContains: "JWT",
    description: 'searching "jwt token revoke" should surface a JWT-related cookbook doc',
  },
];

for (const check of relevanceChecks) {
  try {
    const results = searchDocumentation(check.query, check.category, 5);

    if (results.length === 0) {
      fail(`Relevance: ${check.description}`, `No results returned`);
      continue;
    }

    const topTitles = results.map((r) => r.title);
    const topMatch = topTitles.find((t) =>
      t.toLowerCase().includes(check.expectedTitleContains.toLowerCase())
    );

    if (topMatch) {
      pass(`Relevance: ${check.description} (got: ${topTitles.slice(0, 3).join(", ")})`);
    } else {
      fail(
        `Relevance: ${check.description}`,
        `Expected a result with "${check.expectedTitleContains}" in title. Got: ${topTitles.join(", ")}`
      );
    }
  } catch (err) {
    fail(`Relevance: ${check.description}`, String(err));
  }
}

// Spot-check: getMenuStructure returns all 4 categories
try {
  const menu = getMenuStructure();
  const categories = Object.keys(menu).sort();
  const expected = ["api", "cookbook", "ecosystem", "guides"];
  if (JSON.stringify(categories) === JSON.stringify(expected)) {
    pass(`getMenuStructure() returns all 4 categories: ${categories.join(", ")}`);
  } else {
    fail(`getMenuStructure() returns all 4 categories`, `Got: ${categories.join(", ")}`);
  }
} catch (err) {
  fail(`getMenuStructure() executes without error`, String(err));
}

// Spot-check: getSchema returns at least the documents table
try {
  const schema = getSchema();
  const tables = schema.map((t) => t.table_name);
  if (tables.includes("documents")) {
    pass(`getSchema() includes the "documents" table (${tables.length} tables total)`);
  } else {
    fail(`getSchema() includes the "documents" table`, `Got tables: ${tables.join(", ")}`);
  }
} catch (err) {
  fail(`getSchema() executes without error`, String(err));
}

// Spot-check: getDocumentByTitle returns a full document
try {
  const doc = getDocumentByTitle("Hooks");
  if (doc && doc.title === "Hooks" && doc.content_plain.length > 1000) {
    pass(`getDocumentByTitle("Hooks") returns full document (${doc.content_plain.length} chars)`);
  } else if (!doc) {
    fail(`getDocumentByTitle("Hooks") returns a document`, `Returned null`);
  } else {
    fail(`getDocumentByTitle("Hooks") returns full document`, `content_plain only ${doc.content_plain.length} chars`);
  }
} catch (err) {
  fail(`getDocumentByTitle() executes without error`, String(err));
}

// Spot-check: getDocumentById returns a document
try {
  const doc = getDocumentById(1);
  if (doc && doc.id === 1 && doc.title) {
    pass(`getDocumentById(1) returns document: "${doc.title}"`);
  } else {
    fail(`getDocumentById(1) returns a document`, doc ? `Missing title` : `Returned null`);
  }
} catch (err) {
  fail(`getDocumentById() executes without error`, String(err));
}

// Spot-check: getDocumentByPath returns a document
try {
  const doc = getDocumentByPath("api/hooks");
  if (doc && doc.title.toLowerCase().includes("hook")) {
    pass(`getDocumentByPath("api/hooks") returns document: "${doc.title}"`);
  } else {
    fail(`getDocumentByPath("api/hooks") returns a document`, doc ? `Got "${doc.title}"` : `Returned null`);
  }
} catch (err) {
  fail(`getDocumentByPath() executes without error`, String(err));
}

// Spot-check: getDocumentByTitle returns null for non-existent title
try {
  const doc = getDocumentByTitle("NonExistentDocument123");
  if (doc === null) {
    pass(`getDocumentByTitle("NonExistentDocument123") correctly returns null`);
  } else {
    fail(`getDocumentByTitle returns null for non-existent title`, `Got: "${doc.title}"`);
  }
} catch (err) {
  fail(`getDocumentByTitle null check executes without error`, String(err));
}

closeDatabase();

// ---------------------------------------------------------------------------
// FINAL SUMMARY
// ---------------------------------------------------------------------------
console.log("\n" + "=".repeat(60));
console.log("📊 FINAL RESULTS");
console.log("=".repeat(60));
console.log(`  ✅ Passed: ${passed}`);
console.log(`  ❌ Failed: ${failed}`);

if (failures.length > 0) {
  console.log("\n  Failures:");
  for (const f of failures) {
    console.log(`    • ${f}`);
  }
}

console.log("=".repeat(60));

if (failed === 0) {
  console.log("\n🎉 All tests passed! The pipeline is working correctly.");
} else {
  console.log(`\n⚠️  ${failed} test(s) failed. See details above.`);
  process.exitCode = 1;
}
