-- Yenta AI Matchmaker Database Schema
-- Designed for PostgreSQL

-- Create database (run separately)
-- CREATE DATABASE yenta_db;

-- Users table (for authentication)
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'vendor', -- vendor, admin, prospect
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Vendors table
CREATE TABLE vendors (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    company_name VARCHAR(255) NOT NULL,
    website VARCHAR(255),
    description TEXT,
    capabilities JSONB, -- {nlp: true, computer_vision: true, etc}
    industries TEXT[], -- Array of industries
    typical_deal_size VARCHAR(50), -- "10k-50k", "50k-100k", etc
    case_studies JSONB, -- Array of case study objects
    logo_url VARCHAR(255),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Prospects table
CREATE TABLE prospects (
    id SERIAL PRIMARY KEY,
    session_id VARCHAR(255) UNIQUE NOT NULL, -- For anonymous tracking
    company_name VARCHAR(255),
    contact_name VARCHAR(255),
    email VARCHAR(255),
    phone VARCHAR(50),
    industry VARCHAR(100),
    company_size VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Prospect conversations table
CREATE TABLE prospect_conversations (
    id SERIAL PRIMARY KEY,
    prospect_id INTEGER REFERENCES prospects(id) ON DELETE CASCADE,
    messages JSONB NOT NULL, -- Array of {role, content, timestamp}
    ai_summary TEXT,
    project_details JSONB, -- Extracted project info
    readiness_score INTEGER, -- 0-100
    readiness_category VARCHAR(20), -- HOT, WARM, COOL, COLD
    score_breakdown JSONB, -- Detailed scoring
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Meetings table
CREATE TABLE meetings (
    id SERIAL PRIMARY KEY,
    vendor_id INTEGER REFERENCES vendors(id),
    prospect_id INTEGER REFERENCES prospects(id),
    scheduled_at TIMESTAMP,
    meeting_link VARCHAR(255),
    status VARCHAR(50) DEFAULT 'pending', -- pending, scheduled, completed, cancelled
    match_score INTEGER, -- 0-100
    match_reasons JSONB, -- Why they were matched
    outcome VARCHAR(50), -- no_show, not_qualified, opportunity, closed_won
    vendor_feedback JSONB,
    prospect_feedback JSONB,
    payment_status VARCHAR(50) DEFAULT 'pending', -- pending, paid, refunded
    payment_amount DECIMAL(10, 2),
    stripe_payment_id VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- MDF allocations table
CREATE TABLE mdf_allocations (
    id SERIAL PRIMARY KEY,
    vendor_id INTEGER REFERENCES vendors(id),
    cloud_provider VARCHAR(50), -- aws, gcp, azure
    allocation_amount DECIMAL(10, 2),
    used_amount DECIMAL(10, 2) DEFAULT 0,
    allocation_period VARCHAR(50), -- Q1 2024, etc
    program_name VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- MDF transactions table
CREATE TABLE mdf_transactions (
    id SERIAL PRIMARY KEY,
    mdf_allocation_id INTEGER REFERENCES mdf_allocations(id),
    meeting_id INTEGER REFERENCES meetings(id),
    amount DECIMAL(10, 2),
    invoice_number VARCHAR(100),
    invoice_url VARCHAR(255),
    status VARCHAR(50) DEFAULT 'pending', -- pending, approved, rejected
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Email logs table
CREATE TABLE email_logs (
    id SERIAL PRIMARY KEY,
    recipient_email VARCHAR(255),
    email_type VARCHAR(50), -- meeting_scheduled, meeting_reminder, etc
    subject VARCHAR(255),
    status VARCHAR(50), -- sent, failed, bounced
    error_message TEXT,
    metadata JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Audit logs table
CREATE TABLE audit_logs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    action VARCHAR(100),
    entity_type VARCHAR(50),
    entity_id INTEGER,
    old_values JSONB,
    new_values JSONB,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for performance
CREATE INDEX idx_vendors_user_id ON vendors(user_id);
CREATE INDEX idx_prospects_session_id ON prospects(session_id);
CREATE INDEX idx_prospects_email ON prospects(email);
CREATE INDEX idx_meetings_vendor_id ON meetings(vendor_id);
CREATE INDEX idx_meetings_prospect_id ON meetings(prospect_id);
CREATE INDEX idx_meetings_status ON meetings(status);
CREATE INDEX idx_meetings_scheduled_at ON meetings(scheduled_at);
CREATE INDEX idx_mdf_allocations_vendor_id ON mdf_allocations(vendor_id);
CREATE INDEX idx_email_logs_recipient ON email_logs(recipient_email);
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_entity ON audit_logs(entity_type, entity_id);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply updated_at triggers
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_vendors_updated_at BEFORE UPDATE ON vendors
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_prospect_conversations_updated_at BEFORE UPDATE ON prospect_conversations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_meetings_updated_at BEFORE UPDATE ON meetings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_mdf_allocations_updated_at BEFORE UPDATE ON mdf_allocations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();