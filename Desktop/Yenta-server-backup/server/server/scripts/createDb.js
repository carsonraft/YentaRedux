require('dotenv').config();
const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

async function createDatabase() {
  const client = new Client({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD,
    database: 'postgres' // Connect to default postgres database first
  });

  try {
    await client.connect();
    console.log('📦 Connected to PostgreSQL server');

    // Check if database exists
    const dbName = process.env.DB_NAME || 'yenta_db';
    const result = await client.query(
      'SELECT 1 FROM pg_database WHERE datname = $1',
      [dbName]
    );

    if (result.rows.length === 0) {
      // Create database
      await client.query(`CREATE DATABASE ${dbName}`);
      console.log(`✅ Database "${dbName}" created successfully`);
    } else {
      console.log(`📁 Database "${dbName}" already exists`);
    }

    await client.end();

    // Now connect to the new database and run schema
    const dbClient = new Client({
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 5432,
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD,
      database: dbName
    });

    await dbClient.connect();
    console.log(`📊 Connected to "${dbName}" database`);

    // Read and execute schema
    const schemaPath = path.join(__dirname, '../db/schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');
    
    await dbClient.query(schema);
    console.log('✅ Database schema created successfully');

    await dbClient.end();
    console.log('🎉 Database setup complete!');

  } catch (error) {
    console.error('❌ Error setting up database:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  createDatabase();
}

module.exports = createDatabase;