#!/usr/bin/env npx tsx
/**
 * Quick smoke test for the documentation database.
 *
 * Run with: npm run test:search
 * 
 * Or run with: npx tsx src/tests/test-search.ts [path/to/contents.sqlite]
 *
 * Tests the key functions that MCP tools rely on:
 *   1. getSchema()         — database structure
 *   2. getMenuStructure()  — navigation tree
 *   3. searchDocumentation() — FTS5 search with various queries
 *
 * Exits with code 1 if any check fails.
 */

import {
  getDatabase,
  getSchema,
  getMenuStructure,
  searchDocumentation,
  closeDatabase,
} from "../db/database.js";
import path from "path";
import fs from "fs";

// Allow explicit path or use default.
// Priority: CLI arg → bundled data/ copy → feathers workspace copy
const dbPath = process.argv[2] || findDbPath();

function findDbPath(): string {
  const scriptDir = import.meta.dirname || ".";
  const candidates = [
    // Bundled in FeathersMCP/data/ (preferred — works without feathers repo)
    path.resolve(scriptDir, "../../data/contents.sqlite"),
    // Feathers workspace copy (for development)
    path.resolve(scriptDir, "../../../feathers/website/.data/content/contents.sqlite"),
  ];
  for (const c of candidates) {
    if (fs.existsSync(c)) return c;
  }
  return candidates[0];
}

let failCount = 0;

function check(cond: boolean, passMsg: string, failMsg: string): void {
  if (cond) {
    console.log(`  ✅ ${passMsg}`);
  } else {
    console.log(`  ❌ ${failMsg}`);
    failCount++;
  }
}

console.log("🧪 FeathersJS Documentation Database — Smoke Test");
console.log("=".repeat(60));
console.log(`📂 Database: ${dbPath}\n`);

// Initialize database
try {
  getDatabase(dbPath);
  console.log("✅ Database connection: OK\n");
} catch (e) {
  console.error("❌ Database connection failed:", e);
  process.exit(1);
}

// Test 1: Schema
console.log("── Test 1: getSchema() ──");
const schema = getSchema();
console.log(`  Found ${schema.length} table(s):`);
for (const t of schema) {
  console.log(`    ${t.table_name} (${t.columns.length} columns)`);
}
check(schema.length >= 1, "Schema returns at least 1 table", "Schema returned no tables");
check(
  schema.some((t) => t.table_name === "documents"),
  'Schema includes the "documents" table',
  'Schema is missing the "documents" table',
);
console.log();

// Test 2: Menu Structure
console.log("── Test 2: getMenuStructure() ──");
const menu = getMenuStructure();
let totalMenuDocs = 0;
for (const [category, items] of Object.entries(menu)) {
  console.log(`  ${category}: ${items.length} documents`);
  for (const item of items.slice(0, 3)) {
    console.log(`    - ${item.title}`);
  }
  if (items.length > 3) console.log(`    ... and ${items.length - 3} more`);
  totalMenuDocs += items.length;
}
const requiredCategories = ["api", "cookbook", "ecosystem", "guides"];
for (const cat of requiredCategories) {
  check(cat in menu, `Category "${cat}" present in menu`, `Category "${cat}" missing from menu`);
}
check(totalMenuDocs >= 47, `Menu contains ${totalMenuDocs} documents (≥47)`, `Menu only has ${totalMenuDocs} documents, expected ≥47`);
console.log();

// Test 3: Search
const testQueries = [
  { query: "authentication", category: undefined, description: "Basic keyword search" },
  { query: "how do hooks work in feathers", category: undefined, description: "Natural language query" },
  { query: "file upload multer", category: "cookbook", description: "Category-filtered search" },
  { query: "services", category: "api", description: "API-only search" },
  { query: "jwt token", category: undefined, description: "Multi-keyword search" },
];

console.log("── Test 3: searchDocumentation() ──");
for (const test of testQueries) {
  console.log(`\n  Query: "${test.query}" ${test.category ? `(category: ${test.category})` : ""}`);
  console.log(`  Type: ${test.description}`);

  const results = searchDocumentation(test.query, test.category, 3);

  if (results.length > 0) {
    for (const r of results) {
      console.log(`    📄 [${r.category}] ${r.title} — ${r.code_examples.length} code blocks`);
      console.log(`       ${r.source_url}`);
    }
  }
  check(results.length > 0, `"${test.query}" returned ${results.length} result(s)`, `"${test.query}" returned 0 results`);
}

console.log("\n" + "=".repeat(60));

if (failCount > 0) {
  console.error(`❌ ${failCount} check(s) failed`);
  closeDatabase();
  process.exit(1);
}
console.log("✅ All smoke tests passed!");
closeDatabase();
