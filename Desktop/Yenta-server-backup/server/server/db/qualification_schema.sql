-- Structured Qualification System Schema
-- Stores responses and progress for 4-step qualification flow

CREATE TABLE IF NOT EXISTS qualification_responses (
    id SERIAL PRIMARY KEY,
    conversation_id INTEGER REFERENCES prospect_conversations(id) ON DELETE CASCADE,
    
    -- Progress tracking
    current_step INTEGER DEFAULT 1,
    status VARCHAR(20) DEFAULT 'active', -- active, completed, abandoned
    optional_asked BOOLEAN DEFAULT FALSE, -- Track if we asked for optional data this section
    
    -- Extracted structured data (JSON)
    extracted_data JSONB DEFAULT '{}',
    
    -- Completion tracking
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP,
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add trigger for updated_at
CREATE TRIGGER update_qualification_responses_updated_at 
    BEFORE UPDATE ON qualification_responses
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_qualification_conversation_id ON qualification_responses(conversation_id);
CREATE INDEX IF NOT EXISTS idx_qualification_status ON qualification_responses(status);
CREATE INDEX IF NOT EXISTS idx_qualification_step ON qualification_responses(current_step);

-- Add conversation_type to prospect_conversations if it doesn't exist
ALTER TABLE prospect_conversations 
ADD COLUMN IF NOT EXISTS conversation_type VARCHAR(50) DEFAULT 'MULTI_ROUND';