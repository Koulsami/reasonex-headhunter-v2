// Script to check recent audit logs
const { Client } = require('pg');

const DATABASE_URL = 'postgresql://postgres:sDXQUDzxujteSQAUViZdxkbRsdEvGayH@centerbeam.proxy.rlwy.net:42798/railway';

async function checkAuditLogs() {
    const client = new Client({
        connectionString: DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    });

    try {
        await client.connect();
        console.log('✓ Connected to database\n');

        // Check recent audit logs
        const result = await client.query(`
            SELECT
                id,
                actor_email,
                event_type,
                resource_type,
                resource_id,
                created_at
            FROM audit_logs
            ORDER BY created_at DESC
            LIMIT 50
        `);

        if (result.rows.length === 0) {
            console.log('⚠️  No audit logs found.');
        } else {
            console.log(`📋 Recent activity (last ${result.rows.length} events):\n`);
            result.rows.forEach((log, idx) => {
                const time = new Date(log.created_at).toLocaleString();
                console.log(`${idx + 1}. [${time}] ${log.actor_email}`);
                console.log(`   Event: ${log.event_type} on ${log.resource_type || 'N/A'}`);
                if (log.resource_id) console.log(`   Resource ID: ${log.resource_id}`);
                console.log('');
            });
        }

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await client.end();
    }
}

checkAuditLogs();
