-- Calendar integration schema additions

-- Vendor calendar credentials table
CREATE TABLE vendor_calendar_credentials (
    id SERIAL PRIMARY KEY,
    vendor_id INTEGER REFERENCES vendors(id) UNIQUE,
    google_access_token TEXT,
    google_refresh_token TEXT,
    google_token_expiry TIMESTAMP,
    is_calendar_connected BOOLEAN DEFAULT FALSE,
    default_timezone VARCHAR(50) DEFAULT 'UTC',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Vendor availability preferences table
CREATE TABLE vendor_availability (
    id SERIAL PRIMARY KEY,
    vendor_id INTEGER REFERENCES vendors(id),
    day_of_week INTEGER, -- 0=Sunday, 1=Monday, etc.
    start_time TIME,
    end_time TIME,
    timezone VARCHAR(50) DEFAULT 'UTC',
    is_available BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(vendor_id, day_of_week)
);

-- Meeting time slots table (for booking system)
CREATE TABLE meeting_time_slots (
    id SERIAL PRIMARY KEY,
    vendor_id INTEGER REFERENCES vendors(id),
    prospect_id INTEGER REFERENCES prospects(id),
    start_time TIMESTAMP,
    end_time TIMESTAMP,
    timezone VARCHAR(50) DEFAULT 'UTC',
    status VARCHAR(50) DEFAULT 'available', -- available, booked, blocked
    meeting_id INTEGER REFERENCES meetings(id) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add calendar fields to existing meetings table
ALTER TABLE meetings 
ADD COLUMN google_event_id VARCHAR(255),
ADD COLUMN calendar_link VARCHAR(500),
ADD COLUMN meet_link VARCHAR(500),
ADD COLUMN timezone VARCHAR(50) DEFAULT 'UTC',
ADD COLUMN duration_minutes INTEGER DEFAULT 60,
ADD COLUMN ics_file_generated BOOLEAN DEFAULT FALSE;

-- Indexes for performance
CREATE INDEX idx_vendor_calendar_credentials_vendor_id ON vendor_calendar_credentials(vendor_id);
CREATE INDEX idx_vendor_availability_vendor_id ON vendor_availability(vendor_id);
CREATE INDEX idx_vendor_availability_day ON vendor_availability(day_of_week);
CREATE INDEX idx_meeting_time_slots_vendor_id ON meeting_time_slots(vendor_id);
CREATE INDEX idx_meeting_time_slots_prospect_id ON meeting_time_slots(prospect_id);
CREATE INDEX idx_meeting_time_slots_start_time ON meeting_time_slots(start_time);
CREATE INDEX idx_meeting_time_slots_status ON meeting_time_slots(status);
CREATE INDEX idx_meetings_google_event_id ON meetings(google_event_id);

-- Triggers for updated_at timestamps
CREATE TRIGGER update_vendor_calendar_credentials_updated_at 
    BEFORE UPDATE ON vendor_calendar_credentials 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_vendor_availability_updated_at 
    BEFORE UPDATE ON vendor_availability 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_meeting_time_slots_updated_at 
    BEFORE UPDATE ON meeting_time_slots 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Sample data for vendor availability (Monday-Friday, 9 AM - 5 PM EST)
-- This would typically be set by vendors through the UI
INSERT INTO vendor_availability (vendor_id, day_of_week, start_time, end_time, timezone) VALUES
-- Assuming vendor ID 1 exists
-- (1, 1, '09:00:00', '17:00:00', 'America/New_York'), -- Monday
-- (1, 2, '09:00:00', '17:00:00', 'America/New_York'), -- Tuesday  
-- (1, 3, '09:00:00', '17:00:00', 'America/New_York'), -- Wednesday
-- (1, 4, '09:00:00', '17:00:00', 'America/New_York'), -- Thursday
-- (1, 5, '09:00:00', '17:00:00', 'America/New_York'); -- Friday

-- Views for easier querying
CREATE VIEW vendor_calendar_status AS
SELECT 
    v.id as vendor_id,
    v.company_name,
    v.email,
    vcc.is_calendar_connected,
    vcc.default_timezone,
    vcc.updated_at as last_calendar_sync,
    CASE 
        WHEN vcc.google_token_expiry < NOW() THEN 'expired'
        WHEN vcc.is_calendar_connected THEN 'connected'
        ELSE 'not_connected'
    END as calendar_status
FROM vendors v
LEFT JOIN vendor_calendar_credentials vcc ON v.id = vcc.vendor_id;

CREATE VIEW available_meeting_slots AS
SELECT 
    mts.id,
    mts.vendor_id,
    v.company_name as vendor_company,
    mts.start_time,
    mts.end_time,
    mts.timezone,
    mts.status,
    va.day_of_week,
    va.start_time as vendor_start_time,
    va.end_time as vendor_end_time
FROM meeting_time_slots mts
JOIN vendors v ON mts.vendor_id = v.id
LEFT JOIN vendor_availability va ON mts.vendor_id = va.vendor_id 
    AND EXTRACT(DOW FROM mts.start_time) = va.day_of_week
WHERE mts.status = 'available'
    AND mts.start_time > NOW()
ORDER BY mts.start_time;