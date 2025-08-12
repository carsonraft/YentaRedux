const fs = require('fs');
const path = require('path');
const db = require('../db/pool');

async function applyVettingSchema() {
  const client = await db.pool.connect();
  
  try {
    console.log('🚀 Starting Enhanced Vetting Schema Migration...');
    
    // Read the schema file
    const schemaPath = path.join(__dirname, '../db/enhanced_vetting_schema.sql');
    const schemaSql = fs.readFileSync(schemaPath, 'utf8');
    
    console.log('Schema file content length:', schemaSql.length);
    console.log('First 500 chars:', schemaSql.substring(0, 500));
    
    // Split by semicolons to execute each statement separately
    const rawStatements = schemaSql.split(';');
    console.log('Raw statements count:', rawStatements.length);
    
    const allStatements = rawStatements
      .map(stmt => {
        // Remove comments and clean up whitespace
        const lines = stmt.split('\n')
          .map(line => line.trim())
          .filter(line => !line.startsWith('--') && line.length > 0);
        return lines.join(' ').trim();
      })
      .filter(stmt => stmt.length > 0);
    
    console.log('Filtered statements count:', allStatements.length);
    
    console.log('Debug: Found statements:');
    allStatements.forEach((stmt, i) => {
      console.log(`${i + 1}: ${stmt.substring(0, 50)}...`);
    });
    
    // Separate ALTER TABLE statements from CREATE statements and indexes
    const alterStatements = allStatements.filter(stmt => stmt.toUpperCase().startsWith('ALTER TABLE'));
    const createStatements = allStatements.filter(stmt => stmt.toUpperCase().startsWith('CREATE TABLE'));
    const insertStatements = allStatements.filter(stmt => stmt.toUpperCase().startsWith('INSERT'));
    const indexStatements = allStatements.filter(stmt => stmt.toUpperCase().startsWith('CREATE INDEX'));
    const triggerStatements = allStatements.filter(stmt => stmt.toUpperCase().startsWith('CREATE TRIGGER'));
    
    const statementGroups = [
      { name: 'ALTER TABLE', statements: alterStatements },
      { name: 'CREATE TABLE', statements: createStatements },
      { name: 'INSERT', statements: insertStatements },
      { name: 'CREATE INDEX', statements: indexStatements },
      { name: 'CREATE TRIGGER', statements: triggerStatements }
    ];
    
    console.log(`📝 Found ${allStatements.length} SQL statements to execute`);
    
    await client.query('BEGIN');
    
    for (const group of statementGroups) {
      if (group.statements.length === 0) continue;
      
      console.log(`\n🔨 Executing ${group.name} statements (${group.statements.length})...`);
      
      for (let i = 0; i < group.statements.length; i++) {
        const statement = group.statements[i];
        try {
          console.log(`   ⚡ ${group.name} ${i + 1}/${group.statements.length}...`);
          await client.query(statement);
        } catch (error) {
          if (error.message.includes('already exists') || 
              error.message.includes('duplicate column') ||
              error.message.includes('relation') && error.message.includes('already exists') ||
              error.message.includes('duplicate key')) {
            console.log(`   ⚠️  Skipping: Already exists`);
            continue;
          }
          console.error(`   ❌ Error in statement: ${statement.substring(0, 100)}...`);
          throw error;
        }
      }
    }
    
    await client.query('COMMIT');
    console.log('✅ Enhanced Vetting Schema Migration completed successfully!');
    
    // Verify some key tables were created
    const tables = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('website_analysis_cache', 'conversation_rounds', 'message_analytics', 'linkedin_company_cache', 'validation_summary')
    `);
    
    console.log('📊 Verified new tables created:');
    tables.rows.forEach(row => {
      console.log(`   ✓ ${row.table_name}`);
    });
    
    // Check prospect table columns were added
    const prospectColumns = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'prospects' 
      AND column_name IN ('domain', 'website_intelligence', 'linkedin_company_data', 'budget_assessment')
    `);
    
    console.log('📊 Verified prospect table enhancements:');
    prospectColumns.rows.forEach(row => {
      console.log(`   ✓ prospects.${row.column_name}`);
    });
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Schema migration failed:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Run the migration if this script is executed directly
if (require.main === module) {
  applyVettingSchema()
    .then(() => {
      console.log('🎉 Migration completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Migration failed:', error);
      process.exit(1);
    });
}

module.exports = { applyVettingSchema };