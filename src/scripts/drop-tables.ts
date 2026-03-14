#!/usr/bin/env npx tsx
/**
 * Drop the documents and documents_fts tables so the ingestion script
 * can re-create them from scratch on a clean run.
 *
 * Run with: npm run drop
 *
 * Defaults to the bundled data/contents.sqlite; pass an explicit path to
 * target a different database file.
 */
import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function findDbPath(): string {
  const candidates = [
    // Bundled copy (preferred — works without feathers repo)
    path.resolve(__dirname, "../../data/contents.sqlite"),
    // Feathers workspace copy (for development)
    path.resolve(__dirname, "../../../feathers/website/.data/content/contents.sqlite"),
  ];
  for (const c of candidates) {
    if (fs.existsSync(c)) return c;
  }
  return candidates[0];
}

const dbPath = process.argv[2] || findDbPath();

console.log(`Dropping tables from: ${dbPath}`);
const db = new Database(dbPath);
db.exec(`
  DROP TABLE IF EXISTS documents_fts;
  DROP TRIGGER IF EXISTS documents_ai;
  DROP TRIGGER IF EXISTS documents_ad;
  DROP TRIGGER IF EXISTS documents_au;
  DROP TABLE IF EXISTS documents;
`);
db.close();
console.log("Done — tables dropped. Run npm run ingest to rebuild.");
