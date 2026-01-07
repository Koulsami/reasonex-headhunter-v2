// Script to check system configuration
const { Client } = require('pg');

const DATABASE_URL = 'postgresql://postgres:sDXQUDzxujteSQAUViZdxkbRsdEvGayH@centerbeam.proxy.rlwy.net:42798/railway';

async function checkConfig() {
    const client = new Client({
        connectionString: DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    });

    try {
        await client.connect();
        console.log('✓ Connected to database\n');

        // Check system_config
        const result = await client.query('SELECT * FROM system_config');

        if (result.rows.length === 0) {
            console.log('⚠️  No system configuration found.');
        } else {
            console.log('📋 System Configuration:\n');
            result.rows.forEach(row => {
                console.log(`${row.key}: ${row.value}`);
            });
        }

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await client.end();
    }
}

checkConfig();
