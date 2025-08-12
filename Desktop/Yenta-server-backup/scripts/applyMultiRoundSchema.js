const fs = require('fs');
const path = require('path');
const { pool } = require('../db/pool');

const applySchema = async () => {
  try {
    console.log('Applying multi-round conversation schema...');
    const schema = fs.readFileSync(path.join(__dirname, '../db/multi_round_schema.sql'), 'utf8');
    await pool.query(schema);
    console.log('Schema applied successfully.');
  } catch (error) {
    console.error('Error applying schema:', error);
  } finally {
    pool.end();
  }
};

applySchema();
