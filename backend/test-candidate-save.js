// Quick test script to verify candidate save functionality
const { Client } = require('pg');

const DATABASE_URL = 'postgresql://postgres:sDXQUDzxujteSQAUViZdxkbRsdEvGayH@centerbeam.proxy.rlwy.net:42798/railway';

async function testCandidateSave() {
    const client = new Client({
        connectionString: DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    });

    try {
        console.log('🔌 Connecting to database...');
        await client.connect();
        console.log('✓ Connected\n');

        // Create test job first (required for foreign key)
        const testJobId = 'test-job-' + Date.now();
        console.log('📝 Creating test job...');
        await client.query(
            `INSERT INTO jobs (id, client_id, title, description, status, created_at)
             VALUES ($1, NULL, $2, $3, $4, NOW())`,
            [testJobId, 'Test Job', 'Test Description', 'Active']
        );
        console.log('✓ Test job created\n');

        // Create a test candidate
        const testCandidate = {
            id: 'test-' + Date.now(),
            job_id: testJobId,
            assignee_id: null,
            name: 'Test Candidate',
            current_role: 'Test Engineer',
            current_company: 'Test Company',
            stage: 'Identified',
            match_score: 85,
            email: 'test@example.com',
            linkedin_url: 'https://linkedin.com/in/test',
            source: 'Manual',
            added_at: new Date().toISOString(),
            ai_analysis: JSON.stringify({
                fitLevel: 'Good',
                strengths: 'Test strengths',
                concerns: 'None',
                summary: 'Test summary'
            })
        };

        console.log('💾 Attempting to save test candidate...');
        console.log('   Name:', testCandidate.name);
        console.log('   ID:', testCandidate.id);

        // Insert test candidate
        await client.query(
            `INSERT INTO candidates (id, job_id, assignee_id, name, "current_role", "current_company", stage, match_score, email, linkedin_url, source, added_at, ai_analysis)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
            [
                testCandidate.id,
                testCandidate.job_id,
                testCandidate.assignee_id,
                testCandidate.name,
                testCandidate.current_role,
                testCandidate.current_company,
                testCandidate.stage,
                testCandidate.match_score,
                testCandidate.email,
                testCandidate.linkedin_url,
                testCandidate.source,
                testCandidate.added_at,
                testCandidate.ai_analysis
            ]
        );

        console.log('✓ Test candidate saved successfully!\n');

        // Verify it exists
        console.log('🔍 Verifying test candidate exists...');
        const result = await client.query('SELECT * FROM candidates WHERE id = $1', [testCandidate.id]);

        if (result.rows.length === 0) {
            console.error('❌ ERROR: Test candidate not found after save!');
            process.exit(1);
        }

        console.log('✓ Test candidate found in database');
        console.log('   Name:', result.rows[0].name);
        console.log('   Role:', result.rows[0].current_role);
        console.log('   Company:', result.rows[0].current_company);
        console.log('   Stage:', result.rows[0].stage);
        console.log('   Added:', result.rows[0].added_at);

        // Clean up test data
        console.log('\n🧹 Cleaning up test data...');
        await client.query('DELETE FROM candidates WHERE id = $1', [testCandidate.id]);
        await client.query('DELETE FROM jobs WHERE id = $1', [testJobId]);
        console.log('✓ Test data deleted\n');

        // Show current stats
        const stats = await client.query('SELECT COUNT(*) as total FROM candidates');
        console.log('📊 Current Statistics:');
        console.log(`   Total candidates in database: ${stats.rows[0].total}`);

        console.log('\n✅ TEST PASSED: Candidate save functionality is working!\n');
        console.log('👉 If candidates are still disappearing in the app:');
        console.log('   1. Make sure Railway has deployed the latest code');
        console.log('   2. Check browser console for error messages');
        console.log('   3. Verify auth token is set (check localStorage)');
        console.log('   4. Check Railway backend logs for errors');

    } catch (error) {
        console.error('\n❌ TEST FAILED:', error.message);
        console.error('\nPossible issues:');
        console.error('   - Database connection problem');
        console.error('   - Schema not initialized (run schema.sql)');
        console.error('   - Permission issue with database user');
        process.exit(1);
    } finally {
        await client.end();
    }
}

testCandidateSave();
