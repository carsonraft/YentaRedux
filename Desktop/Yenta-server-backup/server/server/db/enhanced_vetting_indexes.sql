-- Enhanced Vetting System - Index Creation
-- Run after the main schema migration is complete

-- Prospect table indexes
CREATE INDEX IF NOT EXISTS idx_prospects_domain ON prospects(domain);
CREATE INDEX IF NOT EXISTS idx_prospects_legitimacy_score ON prospects(legitimacy_score);
CREATE INDEX IF NOT EXISTS idx_prospects_company_verified ON prospects(company_verified);
CREATE INDEX IF NOT EXISTS idx_prospects_budget_category ON prospects(budget_category);

-- Website analysis cache indexes
CREATE INDEX IF NOT EXISTS idx_website_analysis_cache_domain ON website_analysis_cache(domain);
CREATE INDEX IF NOT EXISTS idx_website_analysis_cache_last_analyzed ON website_analysis_cache(last_analyzed);

-- Conversation rounds indexes
CREATE INDEX IF NOT EXISTS idx_conversation_rounds_conversation_id ON conversation_rounds(conversation_id);
CREATE INDEX IF NOT EXISTS idx_conversation_rounds_round_number ON conversation_rounds(round_number);
CREATE INDEX IF NOT EXISTS idx_conversation_rounds_completed_at ON conversation_rounds(completed_at);

-- Message analytics indexes
CREATE INDEX IF NOT EXISTS idx_message_analytics_conversation_id ON message_analytics(conversation_id);
CREATE INDEX IF NOT EXISTS idx_message_analytics_content_hash ON message_analytics(message_content_hash);
CREATE INDEX IF NOT EXISTS idx_message_analytics_created_at ON message_analytics(created_at);

-- LinkedIn cache indexes
CREATE INDEX IF NOT EXISTS idx_linkedin_company_cache_company_name ON linkedin_company_cache(company_name);
CREATE INDEX IF NOT EXISTS idx_linkedin_person_cache_person_company ON linkedin_person_cache(person_name, company_name);

-- Validation summary indexes
CREATE INDEX IF NOT EXISTS idx_validation_summary_prospect_id ON validation_summary(prospect_id);
CREATE INDEX IF NOT EXISTS idx_validation_summary_final_score ON validation_summary(final_readiness_score);
CREATE INDEX IF NOT EXISTS idx_validation_summary_final_category ON validation_summary(final_category);
CREATE INDEX IF NOT EXISTS idx_validation_summary_priority_level ON validation_summary(priority_level);