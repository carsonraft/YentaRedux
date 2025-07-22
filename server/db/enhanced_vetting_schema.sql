-- Enhanced Prospect Vetting System - Database Schema Updates
-- Add these to the existing schema for comprehensive prospect validation

-- 1. WEBSITE INTELLIGENCE SYSTEM
-- Add website intelligence fields to prospects table
ALTER TABLE prospects 
ADD COLUMN domain VARCHAR(255),
ADD COLUMN website_intelligence JSONB,
ADD COLUMN legitimacy_score INTEGER DEFAULT 0,
ADD COLUMN website_analyzed_at TIMESTAMP;

-- Website analysis cache table
CREATE TABLE website_analysis_cache (
    id SERIAL PRIMARY KEY,
    domain VARCHAR(255) UNIQUE,
    analysis_result JSONB,
    legitimacy_score INTEGER,
    last_analyzed TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    analysis_version VARCHAR(10) DEFAULT 'v1.0'
);

-- 2. MULTI-ROUND CONVERSATION SYSTEM
-- Add round tracking to prospect_conversations
ALTER TABLE prospect_conversations 
ADD COLUMN current_round INTEGER DEFAULT 1,
ADD COLUMN round_1_completed_at TIMESTAMP,
ADD COLUMN round_2_completed_at TIMESTAMP,
ADD COLUMN round_3_completed_at TIMESTAMP,
ADD COLUMN round_1_score INTEGER DEFAULT 0,
ADD COLUMN round_2_score INTEGER DEFAULT 0,
ADD COLUMN round_3_score INTEGER DEFAULT 0,
ADD COLUMN progression_quality VARCHAR(50) DEFAULT 'improving',
ADD COLUMN overall_completion_status VARCHAR(50) DEFAULT 'in_progress';

-- Individual round details table
CREATE TABLE conversation_rounds (
    id SERIAL PRIMARY KEY,
    conversation_id INTEGER REFERENCES prospect_conversations(id) ON DELETE CASCADE,
    round_number INTEGER NOT NULL,
    messages JSONB NOT NULL,
    round_score INTEGER DEFAULT 0,
    key_insights JSONB DEFAULT '{}',
    red_flags JSONB DEFAULT '[]',
    completion_quality VARCHAR(50),
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP,
    next_round_eligible_at TIMESTAMP
);

-- Round progression rules
CREATE TABLE round_progression_rules (
    id SERIAL PRIMARY KEY,
    from_round INTEGER,
    to_round INTEGER,
    minimum_score_required INTEGER,
    minimum_hours_between INTEGER,
    max_attempts_per_round INTEGER DEFAULT 3
);

-- 3. BEHAVIORAL SCORING SYSTEM
-- Add behavioral tracking to conversations
ALTER TABLE prospect_conversations 
ADD COLUMN behavioral_score INTEGER DEFAULT 50,
ADD COLUMN authenticity_score INTEGER DEFAULT 50,
ADD COLUMN engagement_progression VARCHAR(50) DEFAULT 'stable',
ADD COLUMN red_flags_behavioral JSONB DEFAULT '[]';

-- Message-level analytics
CREATE TABLE message_analytics (
    id SERIAL PRIMARY KEY,
    conversation_id INTEGER REFERENCES prospect_conversations(id) ON DELETE CASCADE,
    round_number INTEGER,
    message_index INTEGER,
    message_content_hash VARCHAR(64), -- For duplicate detection
    response_time_seconds INTEGER,
    message_length INTEGER,
    word_count INTEGER,
    sentence_count INTEGER,
    reading_level_score INTEGER,
    sentiment_score DECIMAL(3,2),
    specificity_score INTEGER,
    business_sophistication_score INTEGER,
    template_similarity_score DECIMAL(3,2),
    previous_message_similarity DECIMAL(3,2),
    red_flags_detected JSONB DEFAULT '[]',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Template/pattern detection cache
CREATE TABLE response_patterns (
    id SERIAL PRIMARY KEY,
    pattern_hash VARCHAR(64),
    pattern_text TEXT,
    pattern_type VARCHAR(50), -- 'template', 'common_phrase', 'copy_paste'
    detection_count INTEGER DEFAULT 1,
    first_detected TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_detected TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. LINKEDIN INTEGRATION
-- Add LinkedIn validation fields to prospects
ALTER TABLE prospects 
ADD COLUMN linkedin_company_data JSONB,
ADD COLUMN linkedin_person_data JSONB,
ADD COLUMN company_verified BOOLEAN DEFAULT FALSE,
ADD COLUMN person_verified BOOLEAN DEFAULT FALSE,
ADD COLUMN authority_score INTEGER DEFAULT 0;

-- LinkedIn company cache
CREATE TABLE linkedin_company_cache (
    id SERIAL PRIMARY KEY,
    company_name VARCHAR(255),
    linkedin_company_id VARCHAR(100),
    company_data JSONB,
    employee_count INTEGER,
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(company_name, linkedin_company_id)
);

-- LinkedIn person cache
CREATE TABLE linkedin_person_cache (
    id SERIAL PRIMARY KEY,
    person_name VARCHAR(255),
    company_name VARCHAR(255),
    linkedin_profile_id VARCHAR(100),
    person_data JSONB,
    authority_score INTEGER,
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 5. SMART BUDGET ASSESSMENT
-- Add budget assessment fields to prospects
ALTER TABLE prospects 
ADD COLUMN budget_assessment JSONB,
ADD COLUMN budget_category VARCHAR(50), -- 'Startup', 'Growth', 'Mid-Market', 'Enterprise'
ADD COLUMN investment_seriousness VARCHAR(20), -- 'High', 'Medium', 'Low'
ADD COLUMN budget_analyzed_at TIMESTAMP;

-- Budget benchmarks by industry/size
CREATE TABLE budget_benchmarks (
    id SERIAL PRIMARY KEY,
    industry VARCHAR(100),
    company_size_min INTEGER,
    company_size_max INTEGER,
    typical_budget_min DECIMAL(12,2),
    typical_budget_max DECIMAL(12,2),
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 6. COMPREHENSIVE VALIDATION SUMMARY
-- Enhanced validation tracking
CREATE TABLE validation_summary (
    id SERIAL PRIMARY KEY,
    prospect_id INTEGER REFERENCES prospects(id) ON DELETE CASCADE,
    conversation_id INTEGER REFERENCES prospect_conversations(id) ON DELETE CASCADE,
    
    -- Overall scores
    final_readiness_score INTEGER,
    final_category VARCHAR(20), -- HOT, WARM, COOL, COLD
    confidence_level VARCHAR(20), -- High, Medium, Low
    
    -- Individual system scores
    website_legitimacy_score INTEGER DEFAULT 0,
    linkedin_validation_score INTEGER DEFAULT 0,
    behavioral_authenticity_score INTEGER DEFAULT 0,
    budget_realism_score INTEGER DEFAULT 0,
    conversation_quality_score INTEGER DEFAULT 0,
    
    -- Validation flags
    company_verified BOOLEAN DEFAULT FALSE,
    person_verified BOOLEAN DEFAULT FALSE,
    website_legitimate BOOLEAN DEFAULT FALSE,
    behavioral_authentic BOOLEAN DEFAULT FALSE,
    budget_realistic BOOLEAN DEFAULT FALSE,
    
    -- Recommendations
    recommendations JSONB DEFAULT '[]',
    manual_review_required BOOLEAN DEFAULT FALSE,
    priority_level VARCHAR(20) DEFAULT 'Normal', -- High, Normal, Low
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert default round progression rules
INSERT INTO round_progression_rules (from_round, to_round, minimum_score_required, minimum_hours_between) VALUES
(1, 2, 60, 48),
(2, 3, 55, 72);

-- Insert sample budget benchmarks
INSERT INTO budget_benchmarks (industry, company_size_min, company_size_max, typical_budget_min, typical_budget_max) VALUES
('Technology', 10, 50, 25000, 100000),
('Technology', 50, 200, 75000, 300000),
('Technology', 200, 1000, 200000, 800000),
('Technology', 1000, 10000, 500000, 2000000),
('Healthcare', 10, 50, 30000, 120000),
('Healthcare', 50, 200, 90000, 350000),
('Manufacturing', 10, 50, 20000, 80000),
('Manufacturing', 50, 200, 60000, 250000),
('Financial Services', 10, 50, 35000, 150000),
('Financial Services', 50, 200, 100000, 400000);

-- Enhanced indexes moved to separate file: enhanced_vetting_indexes.sql

-- Apply updated_at triggers to new tables
CREATE TRIGGER update_validation_summary_updated_at BEFORE UPDATE ON validation_summary
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();