const { Client } = require('pg');

const connectionString = 'postgresql://postgres:@1234Abcd@db.wmwvgxcwasqestkgqxxs.supabase.co:5432/postgres';

async function testConnection() {
    const client = new Client({
        connectionString: connectionString,
        ssl: { rejectUnauthorized: false }
    });

    try {
        await client.connect();
        console.log('✅ Connected to Supabase database!');
        
        // Test a simple query
        const result = await client.query('SELECT version()');
        console.log('Database version:', result.rows[0].version);
        
        await client.end();
    } catch (error) {
        console.error('❌ Connection failed:', error.message);
    }
}

testConnection();