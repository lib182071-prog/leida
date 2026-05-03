CREATE TABLE IF NOT EXISTS ideas (
  id INTEGER PRIMARY KEY,
  source TEXT,
  source_url TEXT,
  original_title TEXT,
  title_cn TEXT,
  summary_cn TEXT,
  content_angle TEXT,
  platform TEXT,
  score INTEGER,
  status TEXT DEFAULT 'new',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
