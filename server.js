const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

console.log('☕ Coffee Shop Server Starting...');
console.log('Environment:', process.env.RAILWAY_ENVIRONMENT || 'development');

// Basic middleware - no database dependencies initially
app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

// Routes
app.get('/', (req, res) => {
  console.log('Serving index.html');
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Health check - simple version
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'Coffee Shop Server is running!',
    timestamp: new Date().toISOString(),
    environment: process.env.RAILWAY_ENVIRONMENT || 'development',
    supabase_configured: !!process.env.SUPABASE_URL
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
  console.log('✅ SERVER STARTED SUCCESSFULLY!');
  console.log(`📍 Port: ${PORT}`);
  console.log(`📍 Health: http://0.0.0.0:${PORT}/health`);
  console.log('☕ Ready to take orders!');
});

// Handle graceful shutdown
process.on('SIGTERM', () => {
  console.log('🛑 Shutting down gracefully');
  process.exit(0);
});