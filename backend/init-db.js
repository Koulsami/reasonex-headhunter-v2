// Quick script to initialize the database with schema.sql
const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

// Your Railway DATABASE_PUBLIC_URL
const DATABASE_URL = 'postgresql://postgres:sDXQUDzxujteSQAUViZdxkbRsdEvGayH@centerbeam.proxy.rlwy.net:42798/railway';

async function initDatabase() {
    const client = new Client({
        connectionString: DATABASE_URL,
        ssl: {
            rejectUnauthorized: false
        }
    });

    try {
        console.log('Connecting to database...');
        await client.connect();
        console.log('✓ Connected to database');

        // Read the schema.sql file
        const schemaPath = path.join(__dirname, 'schema.sql');
        const schemaSql = fs.readFileSync(schemaPath, 'utf8');

        console.log('Running schema.sql...');
        await client.query(schemaSql);
        console.log('✓ Schema executed successfully');

        // Verify tables were created
        const result = await client.query(`
            SELECT table_name
            FROM information_schema.tables
            WHERE table_schema = 'public'
            ORDER BY table_name
        `);

        console.log('\n✓ Tables created:');
        result.rows.forEach(row => {
            console.log('  -', row.table_name);
        });

        // Verify webhook URL
        const configResult = await client.query(`
            SELECT key, value
            FROM system_config
            WHERE key = 'linkedinApiUrl'
        `);

        console.log('\n✓ Webhook URL configured:');
        console.log('  ', configResult.rows[0].value);

        console.log('\n✅ Database initialization complete!');

    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    } finally {
        await client.end();
    }
}

initDatabase();
