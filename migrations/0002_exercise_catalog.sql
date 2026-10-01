CREATE TABLE IF NOT EXISTS exercise_catalog (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT,
  equipment TEXT,
  muscles_json TEXT NOT NULL DEFAULT '[]',
  instructions_json TEXT NOT NULL DEFAULT '[]',
  images_json TEXT NOT NULL DEFAULT '[]',
  search_text TEXT NOT NULL DEFAULT '',
  risk TEXT NOT NULL DEFAULT 'caution'
);

CREATE INDEX IF NOT EXISTS idx_exercise_catalog_category ON exercise_catalog(category);
CREATE INDEX IF NOT EXISTS idx_exercise_catalog_equipment ON exercise_catalog(equipment);
CREATE INDEX IF NOT EXISTS idx_exercise_catalog_risk ON exercise_catalog(risk);

CREATE TABLE IF NOT EXISTS exercise_overlays (
  id TEXT PRIMARY KEY,
  profile_id TEXT NOT NULL DEFAULT 'default',
  exercise_id TEXT NOT NULL,
  preference TEXT NOT NULL,
  note TEXT,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(profile_id, exercise_id)
);
