CREATE TABLE IF NOT EXISTS profile_update_proposals (
  id TEXT PRIMARY KEY,
  profile_id TEXT NOT NULL,
  patch_json TEXT NOT NULL DEFAULT '{}',
  reason TEXT,
  created_by TEXT NOT NULL DEFAULT 'agent',
  approved_by TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (profile_id) REFERENCES profiles(id)
);

CREATE INDEX IF NOT EXISTS idx_profile_update_proposals_profile_status
  ON profile_update_proposals(profile_id, status, created_at DESC);
