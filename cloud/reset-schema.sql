-- Run this before re-applying schema.sql when you need a clean slate (D1 / SQLite).
-- Order matters: triggers first, then FTS virtual table, then base table.

DROP TRIGGER IF EXISTS contributions_ai;
DROP TRIGGER IF EXISTS contributions_ad;
DROP TRIGGER IF EXISTS contributions_au;
DROP TABLE IF EXISTS contributions_fts;
DROP TABLE IF EXISTS contributions;
