-- Add missing columns to validation_summary table for round tracking
ALTER TABLE validation_summary 
ADD COLUMN IF NOT EXISTS round_number INTEGER,
ADD COLUMN IF NOT EXISTS validation_timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN IF NOT EXISTS full_summary JSONB;

-- Add unique constraint for prospect + round combination
ALTER TABLE validation_summary 
ADD CONSTRAINT unique_prospect_round UNIQUE (prospect_id, round_number);

🤖 Generated with Claude Code

Co-Authored-By: Claude <noreply@anthropic.com>