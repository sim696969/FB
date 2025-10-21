const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

console.log('☕ Coffee Shop Server Starting...');

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

// Routes
app.get('/', (req, res) => {
  console.log('Homepage requested');
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Health check - Railway monitors this
app.get('/health', (req, res) => {
  console.log('Health check requested');
  res.json({ 
    status: 'OK', 
    message: 'Coffee Shop Server is running!',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Additional test endpoint
app.get('/api/status', (req, res) => {
  res.json({ 
    status: 'active', 
    service: 'coffee-shop',
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
  console.log(`📍 Health: http://0.0.0.0:${PORT}/health`);
  console.log('☕ Ready to take orders!');
});

// Critical: Keep the process alive and handle signals properly
process.on('SIGTERM', () => {
  console.log('🛑 SIGTERM received - Graceful shutdown');
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('🛑 SIGINT received - Graceful shutdown');
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});

// Keep the process alive
setInterval(() => {
  console.log('💓 Heartbeat - Server alive for', process.uptime(), 'seconds');
}, 30000); // Log every 30 seconds