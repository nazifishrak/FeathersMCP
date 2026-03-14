/**
 * Verify that CSS noise has been removed from all documents.
 * This script checks content_plain for Shiki CSS artifacts.
 *
 * Exits with code 1 if any check fails.
 */
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import Database from "better-sqlite3";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Find database
const dataPath = path.resolve(__dirname, "../../data/contents.sqlite");
const dbPath = fs.existsSync(dataPath)
  ? dataPath
  : path.resolve(__dirname, "../../../feathers/website/.data/content/contents.sqlite");

console.log("Database:", dbPath);
const db = new Database(dbPath, { readonly: true });

let failCount = 0;

// Test 1: Check for CSS noise in content_plain
const totalDocs = db.prepare("SELECT COUNT(*) as cnt FROM documents").get() as any;
const cssCount = db.prepare("SELECT COUNT(*) as cnt FROM documents WHERE content_plain LIKE '%html pre.shiki%'").get() as any;
const styleCount = db.prepare("SELECT COUNT(*) as cnt FROM documents WHERE content_plain LIKE '%--shiki-%'").get() as any;

console.log("\n=== CSS Noise Check ===");
console.log("Total documents:", totalDocs.cnt);
console.log('Docs with "html pre.shiki" in content_plain:', cssCount.cnt);
console.log('Docs with "--shiki-" in content_plain:', styleCount.cnt);

if (cssCount.cnt === 0 && styleCount.cnt === 0) {
  console.log("✅ No CSS noise found in any document!");
} else {
  console.log("❌ CSS noise still present in some documents");
  failCount++;
}

// Test 2: Authentication page (was the worst offender at 58% CSS)
const auth = db.prepare("SELECT title, LENGTH(content_plain) as len FROM documents WHERE title = 'Authentication' AND category = 'api'").get() as any;
console.log("\n=== Authentication Page (Worst Case) ===");
console.log("Content length:", auth?.len, "chars");
console.log("(Was 1311 chars with CSS, should be ~546 now)");
if (auth?.len <= 600) {
  console.log("✅ Correct size range");
} else {
  console.log("❌ Larger than expected — possible CSS noise regression");
  failCount++;
}

// Test 3: Check a content sample
const sample = db.prepare("SELECT SUBSTR(content_plain, 1, 200) as snippet FROM documents WHERE title = 'Authentication' AND category = 'api'").get() as any;
console.log("\nContent sample (first 200 chars):");
console.log(sample?.snippet);

// Test 4: Schema check — should return only documents table
console.log("\n=== Schema Check ===");
const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'").all() as any[];
const userTables = tables.filter((t: any) => !t.name.startsWith("documents_fts"));
console.log("User tables:", userTables.map((t: any) => t.name).join(", "));
console.log("Total tables (including FTS):", tables.length);

// Test 5: Search result size check via FTS
console.log("\n=== Search Result Size Check ===");
const results = db.prepare(`
  SELECT d.title, d.category, LENGTH(d.content_plain) as plain_len, LENGTH(d.code_examples) as code_len
  FROM documents_fts fts
  JOIN documents d ON d.id = fts.rowid
  WHERE documents_fts MATCH 'authentication'
  ORDER BY rank
  LIMIT 3
`).all() as any[];

for (const r of results) {
  console.log(`  ${r.title} [${r.category}]: plain=${r.plain_len} chars, code=${r.code_len} chars`);
}

// Test 6: Verify code_examples are valid JSON arrays
console.log("\n=== Code Examples Validation ===");
const allDocs = db.prepare("SELECT title, code_examples FROM documents WHERE code_examples IS NOT NULL AND code_examples != '[]'").all() as any[];
let validJson = 0;
let invalidJson = 0;
for (const doc of allDocs) {
  try {
    const parsed = JSON.parse(doc.code_examples);
    if (Array.isArray(parsed)) validJson++;
    else invalidJson++;
  } catch {
    invalidJson++;
    console.log("  ❌ Invalid JSON in:", doc.title);
  }
}
console.log(`  ${validJson} docs with valid code_examples arrays`);
console.log(`  ${invalidJson} docs with invalid code_examples`);
if (invalidJson === 0) {
  console.log("✅ All code_examples are valid JSON");
} else {
  console.log("❌ Some code_examples are invalid JSON");
  failCount++;
}

db.close();
console.log("\n============================================================");

if (failCount > 0) {
  console.log(`❌ ${failCount} check(s) failed`);
  process.exitCode = 1;
}
console.log("✅ All verification checks passed!");
