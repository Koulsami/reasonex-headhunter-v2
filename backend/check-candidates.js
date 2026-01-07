// Script to check if candidates are in the database
const { Client } = require('pg');

// Your Railway DATABASE_PUBLIC_URL
const DATABASE_URL = 'postgresql://postgres:sDXQUDzxujteSQAUViZdxkbRsdEvGayH@centerbeam.proxy.rlwy.net:42798/railway';

async function checkCandidates() {
    const client = new Client({
        connectionString: DATABASE_URL,
        ssl: {
            rejectUnauthorized: false
        }
    });

    try {
        console.log('Connecting to database...');
        await client.connect();
        console.log('✓ Connected to database\n');

        // Check candidates count
        const countResult = await client.query('SELECT COUNT(*) FROM candidates');
        const count = parseInt(countResult.rows[0].count);

        console.log(`📊 Total candidates in database: ${count}\n`);

        if (count > 0) {
            // Show all candidates
            const result = await client.query(`
                SELECT
                    c.id,
                    c.name,
                    c."current_role" as role,
                    c."current_company" as company,
                    c.stage,
                    c.match_score,
                    c.source,
                    c.assignee_id,
                    u.name as assignee_name,
                    c.added_at
                FROM candidates c
                LEFT JOIN app_users u ON c.assignee_id = u.id
                ORDER BY c.added_at DESC
                LIMIT 20
            `);

            console.log('✓ Recent candidates:');
            console.log('═'.repeat(100));
            result.rows.forEach((cand, idx) => {
                console.log(`${idx + 1}. ${cand.name}`);
                console.log(`   Role: ${cand.role || 'N/A'} at ${cand.company || 'N/A'}`);
                console.log(`   Stage: ${cand.stage} | Match: ${cand.match_score}% | Source: ${cand.source}`);
                console.log(`   Assigned to: ${cand.assignee_name || 'Unassigned'}`);
                console.log(`   Added: ${cand.added_at}`);
                console.log('');
            });

            // Check jobs
            const jobsResult = await client.query('SELECT COUNT(*) FROM jobs');
            const jobsCount = parseInt(jobsResult.rows[0].count);
            console.log(`📋 Total jobs in database: ${jobsCount}`);

            // Check clients
            const clientsResult = await client.query('SELECT COUNT(*) FROM clients');
            const clientsCount = parseInt(clientsResult.rows[0].count);
            console.log(`🏢 Total clients in database: ${clientsCount}`);

        } else {
            console.log('⚠️  No candidates found in the database.');
            console.log('\nPossible reasons:');
            console.log('1. Candidates haven\'t been added yet from the UI');
            console.log('2. Candidates were in frontend local state only');
            console.log('3. The "Add to Pipeline" button wasn\'t clicked after search');
        }

    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    } finally {
        await client.end();
    }
}

checkCandidates();
