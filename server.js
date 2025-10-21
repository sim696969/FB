const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

console.log('☕ Coffee Shop Server Starting...');
console.log('Environment: production');

// Middleware
app.use(cors());
app.use(express.json());

// Serve static files from current directory - SIMPLIFIED
app.use(express.static(__dirname));

// Explicit route for root
app.get('/', (req, res) => {
  console.log('📄 Serving index.html');
  try {
    res.sendFile(path.join(__dirname, 'index.html'));
  } catch (error) {
    console.error('Error serving index.html:', error);
    res.status(500).send(`
      <html>
        <body>
          <h1>Coffee Shop Server is Running! ☕</h1>
          <p>But index.html is not accessible.</p>
          <p><a href="/health">Health Check</a></p>
        </body>
      </html>
    `);
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'Coffee Shop Server is running!',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Simple test endpoint
app.get('/test', (req, res) => {
  res.json({ 
    message: 'Server is working!',
    timestamp: new Date().toISOString()
  });
});

// Simple in-memory orders
let orders = [];

app.post('/api/orders', (req, res) => {
  try {
    const orderData = req.body;
    const orderId = 'ORD-' + Date.now();
    
    const order = {
      orderId: orderId,
      items: orderData.items || [],
      subtotal: orderData.subtotal || 0,
      tipAmount: orderData.tipAmount || 0,
      total: orderData.total || 0,
      customer_name: orderData.customer_name || 'Guest',
      status: 'received',
      timestamp: new Date().toISOString()
    };
    
    orders.push(order);
    console.log('📦 Order received:', orderId);
    
    res.json({ 
      success: true, 
      orderId: orderId,
      message: 'Order received successfully!'
    });
    
  } catch (error) {
    console.error('Order error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to process order' 
    });
  }
});

app.get('/api/orders', (req, res) => {
  res.json({ 
    success: true, 
    orders: orders,
    count: orders.length
  });
});

// Start server
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log('✅ SERVER STARTED SUCCESSFULLY!');
  console.log(`📍 Port: ${PORT}`);
  console.log('☕ Ready to take orders!');
});

// Keep alive
process.on('SIGTERM', () => {
  console.log('🛑 SIGTERM received - Graceful shutdown');
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});

setInterval(() => {
  console.log('💓 Server alive for', Math.floor(process.uptime()), 'seconds');
}, 30000);