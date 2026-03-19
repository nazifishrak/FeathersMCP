-- 1. Main Table (The Source of Truth)
CREATE TABLE IF NOT EXISTS contributions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    author TEXT NOT NULL,
    content TEXT NOT NULL,
    excerpt TEXT,
    tags TEXT,
    github_issue_url TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 2. Virtual Table for Full-Text Search (The "Search Engine")
CREATE VIRTUAL TABLE IF NOT EXISTS contributions_fts USING fts5(
    title,
    content,
    tags,
    content='contributions',
    content_rowid='id'
);

-- 3. Sync Triggers
CREATE TRIGGER IF NOT EXISTS contributions_ai AFTER INSERT ON contributions BEGIN
  INSERT INTO contributions_fts(rowid, title, content, tags) 
  VALUES (new.id, new.title, new.content, new.tags);
END;

-- Sync on Delete
CREATE TRIGGER IF NOT EXISTS contributions_ad AFTER DELETE ON contributions BEGIN
  INSERT INTO contributions_fts(contributions_fts, rowid, title, content, tags) 
  VALUES('delete', old.id, old.title, old.content, old.tags);
END;

-- Sync on Update
CREATE TRIGGER IF NOT EXISTS contributions_au AFTER UPDATE ON contributions BEGIN
  INSERT INTO contributions_fts(contributions_fts, rowid, title, content, tags) 
  VALUES('delete', old.id, old.title, old.content, old.tags);
  INSERT INTO contributions_fts(rowid, title, content, tags) 
  VALUES (new.id, new.title, new.content, new.tags);
END;
