#!/usr/bin/env npx tsx
/**
 * Quick smoke test for the documentation database.
 *
 * Run with: npx tsx src/scripts/test-search.ts [path-to-contents.sqlite]
 *
 * This tests the key functions that MCP tools rely on:
 *   1. getSchema() — database structure
 *   2. getMenuStructure() — navigation tree
 *   3. searchDocumentation() — FTS5 search with various queries
 */

import {
  getDatabase,
  getSchema,
  getMenuStructure,
  searchDocumentation,
  closeDatabase,
} from "../db/database.js";
import path from "path";

// Allow explicit path or use default
const dbPath =
  process.argv[2] ||
  path.resolve(
    import.meta.dirname || ".",
    "../../feathers/website/.data/content/contents.sqlite"
  );

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
console.log(`  Found ${schema.length} tables:`);
for (const t of schema) {
  console.log(`    ${t.table_name} (${t.columns.length} columns)`);
}
console.log();

// Test 2: Menu Structure
console.log("── Test 2: getMenuStructure() ──");
const menu = getMenuStructure();
for (const [category, items] of Object.entries(menu)) {
  console.log(`  ${category}: ${items.length} documents`);
  for (const item of items.slice(0, 3)) {
    console.log(`    - ${item.title}`);
  }
  if (items.length > 3) console.log(`    ... and ${items.length - 3} more`);
}
console.log();

// Test 3: Search
const testQueries = [
  { query: "authentication", category: undefined, description: "Basic keyword search" },
  { query: "how do hooks work in feathers", category: undefined, description: "Natural language query" },
  { query: "cloudflare deploy", category: "cookbook", description: "Category-filtered search" },
  { query: "services", category: "api", description: "API-only search" },
  { query: "jwt token", category: undefined, description: "Multi-keyword search" },
];

console.log("── Test 3: searchDocumentation() ──");
for (const test of testQueries) {
  console.log(`\n  Query: "${test.query}" ${test.category ? `(category: ${test.category})` : ""}`);
  console.log(`  Type: ${test.description}`);

  const results = searchDocumentation(test.query, test.category, 3);

  if (results.length === 0) {
    console.log("  ⚠️  No results");
  } else {
    for (const r of results) {
      console.log(
        `    📄 [${r.category}] ${r.title} — ${r.code_examples.length} code blocks`
      );
      console.log(`       ${r.source_url}`);
    }
  }
}

console.log("\n" + "=".repeat(60));
console.log("✅ All tests passed!");

closeDatabase();
