CREATE TABLE IF NOT EXISTS profiles (
  id TEXT PRIMARY KEY,
  profile_json TEXT NOT NULL DEFAULT '{}',
  preferences_json TEXT NOT NULL DEFAULT '{}',
  feedback_profile_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  profile_id TEXT NOT NULL DEFAULT 'default',
  title TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('planned', 'active', 'completed', 'aborted')),
  focus_json TEXT NOT NULL DEFAULT '[]',
  summary TEXT,
  source TEXT NOT NULL DEFAULT 'hosted',
  active_version INTEGER NOT NULL DEFAULT 1,
  planned_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  started_at TEXT,
  completed_at TEXT,
  completion_json TEXT,
  agent_conversation_url TEXT,
  FOREIGN KEY (profile_id) REFERENCES profiles(id)
);

CREATE TABLE IF NOT EXISTS session_exercises (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  position INTEGER NOT NULL,
  exercise_id TEXT,
  name TEXT NOT NULL,
  prescription_json TEXT NOT NULL DEFAULT '{}',
  alternatives_json TEXT NOT NULL DEFAULT '[]',
  rationale TEXT,
  classification TEXT,
  version INTEGER NOT NULL DEFAULT 1,
  is_active INTEGER NOT NULL DEFAULT 1,
  FOREIGN KEY (session_id) REFERENCES sessions(id)
);

CREATE TABLE IF NOT EXISTS session_events (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  type TEXT NOT NULL,
  version INTEGER NOT NULL,
  payload_json TEXT NOT NULL DEFAULT '{}',
  idempotency_key TEXT,
  approved_by TEXT,
  reason TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (session_id) REFERENCES sessions(id)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_session_events_idempotency
  ON session_events(session_id, idempotency_key)
  WHERE idempotency_key IS NOT NULL;

CREATE TABLE IF NOT EXISTS session_telemetry (
  session_id TEXT PRIMARY KEY,
  telemetry_json TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (session_id) REFERENCES sessions(id)
);

CREATE TABLE IF NOT EXISTS agent_artifacts (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  kind TEXT NOT NULL,
  url TEXT,
  payload_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (session_id) REFERENCES sessions(id)
);
