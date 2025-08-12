const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

async function addCalendarSchema() {
  try {
    console.log('Adding calendar schema to database...');
    
    // Read the calendar schema SQL file
    const schemaPath = path.join(__dirname, '..', 'db', 'calendar_schema.sql');
    const schemaSql = fs.readFileSync(schemaPath, 'utf8');
    
    // Execute the schema
    await pool.query(schemaSql);
    
    console.log('✅ Calendar schema added successfully');
    
    // Add some test vendor availability data
    console.log('Adding test vendor availability...');
    
    // First, let's check if we have any vendors
    const vendorResult = await pool.query('SELECT id FROM vendors LIMIT 1');
    
    if (vendorResult.rows.length > 0) {
      const vendorId = vendorResult.rows[0].id;
      
      // Add Monday-Friday availability (9 AM - 5 PM EST)
      const availabilityData = [
        [vendorId, 1, '09:00:00', '17:00:00', 'America/New_York', true], // Monday
        [vendorId, 2, '09:00:00', '17:00:00', 'America/New_York', true], // Tuesday
        [vendorId, 3, '09:00:00', '17:00:00', 'America/New_York', true], // Wednesday
        [vendorId, 4, '09:00:00', '17:00:00', 'America/New_York', true], // Thursday
        [vendorId, 5, '09:00:00', '17:00:00', 'America/New_York', true], // Friday
        [vendorId, 0, '10:00:00', '14:00:00', 'America/New_York', false], // Sunday - not available
        [vendorId, 6, '10:00:00', '14:00:00', 'America/New_York', false]  // Saturday - not available
      ];
      
      for (const [vendorId, day, start, end, tz, available] of availabilityData) {
        await pool.query(`
          INSERT INTO vendor_availability 
          (vendor_id, day_of_week, start_time, end_time, timezone, is_available)
          VALUES ($1, $2, $3, $4, $5, $6)
          ON CONFLICT (vendor_id, day_of_week) DO UPDATE SET
            start_time = $3,
            end_time = $4,
            timezone = $5,
            is_available = $6
        `, [vendorId, day, start, end, tz, available]);
      }
      
      console.log(`✅ Added test availability for vendor ${vendorId}`);
    } else {
      console.log('⚠️  No vendors found. Create some vendor profiles first.');
    }
    
    console.log('🎉 Calendar integration setup complete!');
    console.log('');
    console.log('Next steps to test calendar integration:');
    console.log('1. Create Google OAuth credentials at https://console.cloud.google.com/');
    console.log('2. Update .env with your GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET');
    console.log('3. Start the server: npm start');
    console.log('4. Test the calendar endpoints with a vendor account');
    
  } catch (error) {
    console.error('❌ Error adding calendar schema:', error);
  } finally {
    await pool.end();
  }
}

addCalendarSchema();