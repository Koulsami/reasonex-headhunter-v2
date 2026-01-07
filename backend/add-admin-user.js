// Script to add admin user to the database
const { Client } = require('pg');

// Your Railway DATABASE_PUBLIC_URL
const DATABASE_URL = 'postgresql://postgres:sDXQUDzxujteSQAUViZdxkbRsdEvGayH@centerbeam.proxy.rlwy.net:42798/railway';

async function addAdminUser() {
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

        // Add Sunil Koloti as admin
        const email = 'sunil.koloti@tead.in';
        const role = 'admin';

        await client.query(`
            INSERT INTO authorized_users (email, role, created_at)
            VALUES ($1, $2, NOW())
            ON CONFLICT (email)
            DO UPDATE SET role = $2
        `, [email, role]);

        console.log('✓ Admin user added/updated:');
        console.log('  Email:', email);
        console.log('  Role:', role);

        // Verify the user was added
        const result = await client.query(`
            SELECT email, role, created_at
            FROM authorized_users
            ORDER BY created_at DESC
        `);

        console.log('\n✓ All authorized users:');
        result.rows.forEach(user => {
            console.log(`  - ${user.email} (${user.role})`);
        });

        console.log('\n✅ Admin user added successfully!');

    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    } finally {
        await client.end();
    }
}

addAdminUser();
