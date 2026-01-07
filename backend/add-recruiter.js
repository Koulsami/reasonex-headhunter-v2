// Script to add Sunil Koloti as a recruiter (app_user)
const { Client } = require('pg');

// Your Railway DATABASE_PUBLIC_URL
const DATABASE_URL = 'postgresql://postgres:sDXQUDzxujteSQAUViZdxkbRsdEvGayH@centerbeam.proxy.rlwy.net:42798/railway';

async function addRecruiter() {
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

        // Add Sunil Koloti as an app_user (recruiter)
        const userId = 'u3';
        const name = 'Sunil Koloti';
        const role = 'Manager';
        const avatar = 'SK';
        const color = 'bg-green-100 text-green-700';

        await client.query(`
            INSERT INTO app_users (id, name, role, avatar, color, created_at)
            VALUES ($1, $2, $3, $4, $5, NOW())
            ON CONFLICT (id)
            DO UPDATE SET name = $2, role = $3, avatar = $4, color = $5
        `, [userId, name, role, avatar, color]);

        console.log('✓ Recruiter added/updated:');
        console.log('  ID:', userId);
        console.log('  Name:', name);
        console.log('  Role:', role);
        console.log('  Avatar:', avatar);
        console.log('  Color:', color);

        // Verify the user was added
        const result = await client.query(`
            SELECT id, name, role, avatar, color
            FROM app_users
            ORDER BY created_at
        `);

        console.log('\n✓ All app users (recruiters):');
        result.rows.forEach(user => {
            console.log(`  - ${user.name} (${user.role}) - ${user.avatar}`);
        });

        console.log('\n✅ Recruiter added successfully!');
        console.log('\nℹ️  Sunil Koloti will now appear in:');
        console.log('  - Recruiter assignment dropdowns');
        console.log('  - Team performance reports');
        console.log('  - Kanban board filters');

    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    } finally {
        await client.end();
    }
}

addRecruiter();
