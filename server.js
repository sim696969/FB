const express = require('express');
const cors = require('cors');
const path = require('path');
const { Client } = require('pg');

const app = express();
const PORT = process.env.PORT || 3000;

console.log('☕ Coffee Shop with ALL Dependencies Starting...');

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

// Routes
app.get('/', (req, res) => {
  console.log('📄 Serving coffee shop homepage');
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'Coffee Shop with all dependencies is running!',
    timestamp: new Date().toISOString(),
    dependencies: {
      express: '✓',
      cors: '✓', 
      pg: '✓'
    }
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
app.listen(PORT, '0.0.0.0', () => {
  console.log('✅ COFFEE SHOP WITH ALL DEPENDENCIES RUNNING!');
  console.log(`📍 Port: ${PORT}`);
  console.log('☕ Ready to take orders!');
});

// Keep alive
setInterval(() => {
  console.log('💓 Server alive: ' + Math.floor(process.uptime()) + 's');
}, 30000);