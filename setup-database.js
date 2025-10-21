const { Client } = require('pg');

const connectionString = 'postgresql://postgres:@1234Abcd@db.wmwvgxcwasqestkgqxxs.supabase.co:5432/postgres';

async function setupDatabase() {
    const client = new Client({
        connectionString: connectionString,
        ssl: { rejectUnauthorized: false }
    });

    try {
        await client.connect();
        console.log('Connected to database');

        // Create orders table
        const createTableQuery = `
            CREATE TABLE IF NOT EXISTS orders (
                id SERIAL PRIMARY KEY,
                order_id VARCHAR(50) UNIQUE NOT NULL,
                items JSONB NOT NULL,
                subtotal DECIMAL(10,2) NOT NULL,
                tip_amount DECIMAL(10,2) DEFAULT 0,
                total DECIMAL(10,2) NOT NULL,
                status VARCHAR(20) DEFAULT 'received',
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW()
            );
        `;

        await client.query(createTableQuery);
        console.log('✅ Orders table created successfully!');

        await client.end();
    } catch (error) {
        console.error('Error setting up database:', error);
    }
}

setupDatabase();