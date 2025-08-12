-- Create simple conversation table
CREATE TABLE IF NOT EXISTS prospect_conversations (
    id SERIAL PRIMARY KEY,
    prospect_id INTEGER REFERENCES prospects(id) ON DELETE CASCADE UNIQUE,
    messages JSONB NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_prospect_conversations_prospect_id ON prospect_conversations(prospect_id);

-- Remove current_round column if it exists
ALTER TABLE prospects DROP COLUMN IF EXISTS current_round;
