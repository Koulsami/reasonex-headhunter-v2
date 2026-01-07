// Script to verify all required database tables exist
const { Client } = require('pg');

const DATABASE_URL = 'postgresql://postgres:sDXQUDzxujteSQAUViZdxkbRsdEvGayH@centerbeam.proxy.rlwy.net:42798/railway';

async function checkTables() {
    const client = new Client({
        connectionString: DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    });

    try {
        await client.connect();
        console.log('✓ Connected to database\n');

        // Check which tables exist
        const result = await client.query(`
            SELECT table_name
            FROM information_schema.tables
            WHERE table_schema = 'public'
            ORDER BY table_name
        `);

        console.log('📋 Tables in database:');
        console.log('═'.repeat(50));

        const requiredTables = [
            'clients',
            'jobs',
            'candidates',
            'app_users',
            'authorized_users',
            'audit_logs',
            'system_config'
        ];

        const existingTables = result.rows.map(r => r.table_name);

        requiredTables.forEach(table => {
            const exists = existingTables.includes(table);
            const icon = exists ? '✓' : '✗';
            const status = exists ? 'EXISTS' : 'MISSING';
            console.log(`${icon} ${table.padEnd(20)} ${status}`);
        });

        console.log('\n' + '═'.repeat(50));

        // Check for any extra tables
        const extraTables = existingTables.filter(t => !requiredTables.includes(t));
        if (extraTables.length > 0) {
            console.log('\n📌 Additional tables found:');
            extraTables.forEach(t => console.log(`  - ${t}`));
        }

        // Check candidates table structure
        if (existingTables.includes('candidates')) {
            console.log('\n📊 Candidates table structure:');
            const columns = await client.query(`
                SELECT column_name, data_type, is_nullable
                FROM information_schema.columns
                WHERE table_name = 'candidates'
                ORDER BY ordinal_position
            `);

            columns.rows.forEach(col => {
                const nullable = col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL';
                console.log(`  - ${col.column_name.padEnd(20)} ${col.data_type.padEnd(30)} ${nullable}`);
            });
        }

        // Check for any data in tables
        console.log('\n📈 Row counts:');
        for (const table of requiredTables) {
            if (existingTables.includes(table)) {
                try {
                    const count = await client.query(`SELECT COUNT(*) FROM ${table}`);
                    console.log(`  ${table.padEnd(20)} ${count.rows[0].count} rows`);
                } catch (e) {
                    console.log(`  ${table.padEnd(20)} ERROR: ${e.message}`);
                }
            }
        }

        const missingTables = requiredTables.filter(t => !existingTables.includes(t));

        if (missingTables.length > 0) {
            console.log('\n⚠️  MISSING TABLES DETECTED!');
            console.log('Missing tables:', missingTables.join(', '));
            console.log('\n💡 Solution:');
            console.log('Run the schema initialization:');
            console.log('1. Go to Railway Dashboard → PostgreSQL → Query tab');
            console.log('2. Copy contents of backend/schema.sql');
            console.log('3. Paste and execute');
        } else {
            console.log('\n✅ All required tables exist!');
        }

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await client.end();
    }
}

checkTables();
