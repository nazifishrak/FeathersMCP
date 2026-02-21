#!/usr/bin/env npx tsx
/**
 * Drop the documents and documents_fts tables so the ingestion script
 * can re-create them from scratch with the CSS noise fix applied.
 */
import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = process.argv[2] || path.resolve(__dirname, "../../../feathers/website/.data/content/contents.sqlite");

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
