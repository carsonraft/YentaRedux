-- Add current_round to prospects table
ALTER TABLE prospects ADD COLUMN current_round INTEGER DEFAULT 1;

-- Create table for multi-round conversation data
CREATE TABLE prospect_conversation_rounds (
    id SERIAL PRIMARY KEY,
    prospect_id INTEGER REFERENCES prospects(id) ON DELETE CASCADE,
    round_number INTEGER NOT NULL,
    messages JSONB NOT NULL,
    ai_summary TEXT,
    round_completion_quality VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add index for faster lookups
CREATE INDEX idx_conversation_rounds_prospect_id ON prospect_conversation_rounds(prospect_id);
