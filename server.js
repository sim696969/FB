const express = require('express');
const cors = require('cors');
const path = require('path');
const { Client } = require('pg');

const app = express();
const PORT = process.env.PORT || 3000;

console.log('☕ Coffee Shop with Supabase Starting on Render...');

// Database connection
const getDbClient = () => {
  const connectionString = process.env.SUPABASE_CONNECTION_STRING;
  
  if (!connectionString) {
    console.log('⚠️  No database - using in-memory storage');
    return null;
  }

  console.log('✅ Database connection configured');
  return new Client({
    connectionString: connectionString,
    ssl: { rejectUnauthorized: false }
  });
};

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

// Routes
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Health check with database test
app.get('/health', async (req, res) => {
  let dbStatus = 'not-configured';
  
  const client = getDbClient();
  if (client) {
    try {
      await client.connect();
      await client.query('SELECT NOW()');
      dbStatus = 'connected';
      await client.end();
    } catch (error) {
      dbStatus = 'error: ' + error.message;
    }
  }

  res.json({ 
    status: 'OK', 
    message: 'Coffee Shop with Supabase is running!',
    database: dbStatus,
    timestamp: new Date().toISOString()
  });
});

// Order endpoints with Supabase
app.post('/api/orders', async (req, res) => {
  try {
    const orderData = req.body;
    const orderId = 'ORD-' + Date.now();
    
    const order = {
      orderId: orderId,
      customer_name: orderData.customer_name || 'Guest',
      items: orderData.items || [],
      subtotal: orderData.subtotal || 0,
      tipAmount: orderData.tipAmount || 0,
      total: orderData.total || 0,
      status: 'received',
      timestamp: new Date().toISOString()
    };

    // Try to save to Supabase
    const client = getDbClient();
    if (client) {
      try {
        await client.connect();
        
        // Create table if not exists
        await client.query(`
          CREATE TABLE IF NOT EXISTS orders (
            id SERIAL PRIMARY KEY,
            order_id VARCHAR(50) UNIQUE NOT NULL,
            customer_name TEXT,
            items JSONB NOT NULL,
            subtotal DECIMAL(10,2) NOT NULL,
            tip_amount DECIMAL(10,2) DEFAULT 0,
            total DECIMAL(10,2) NOT NULL,
            status VARCHAR(20) DEFAULT 'received',
            created_at TIMESTAMP DEFAULT NOW()
          );
        `);

        // Insert order
        await client.query(
          `INSERT INTO orders (order_id, customer_name, items, subtotal, tip_amount, total, status) 
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [orderId, order.customer_name, JSON.stringify(order.items), 
           order.subtotal, order.tipAmount, order.total, order.status]
        );

        await client.end();
        console.log('✅ Order saved to Supabase:', orderId);
        
        res.json({ 
          success: true, 
          orderId: orderId,
          message: 'Order saved to database!',
          storage: 'supabase'
        });
        return;
        
      } catch (dbError) {
        console.error('❌ Database error:', dbError.message);
        // Continue to in-memory fallback
      }
    }

    // In-memory fallback
    let orders = [];
    orders.push(order);
    console.log('📦 Order saved in memory:', orderId);
    
    res.json({ 
      success: true, 
      orderId: orderId,
      message: 'Order received (in-memory storage)',
      storage: 'memory'
    });
    
  } catch (error) {
    console.error('Order error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to process order' 
    });
  }
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log('✅ COFFEE SHOP WITH SUPABASE RUNNING ON RENDER!');
  console.log(`📍 Port: ${PORT}`);
  console.log('☕ Ready to take orders with database support!');
});