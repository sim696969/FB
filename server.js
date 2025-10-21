const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

console.log('☕ Coffee Shop Server Starting...');
console.log('Current directory:', __dirname);
console.log('Files in directory:', fs.readdirSync(__dirname));

// Middleware
app.use(cors());
app.use(express.json());

// Serve static files from current directory
app.use(express.static(__dirname, {
  index: 'index.html',
  extensions: ['html', 'js', 'css', 'json']
}));

// Explicit route for root
app.get('/', (req, res) => {
  console.log('📄 Serving index.html from:', path.join(__dirname, 'index.html'));
  res.sendFile(path.join(__dirname, 'index.html'));
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

// Test if index.html exists
app.get('/test-file', (req, res) => {
  const indexPath = path.join(__dirname, 'index.html');
  const exists = fs.existsSync(indexPath);
  res.json({ 
    index_html_exists: exists,
    path: indexPath,
    directory: __dirname
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
  console.log(`📍 Main URL: http://0.0.0.0:${PORT}/`);
  console.log(`📍 Health: http://0.0.0.0:${PORT}/health`);
  console.log(`📍 File Test: http://0.0.0.0:${PORT}/test-file`);
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