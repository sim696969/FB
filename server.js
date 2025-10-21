const express = require('express');
const cors = require('cors');
const path = require('path');
const { Client } = require('pg');

const app = express();
const PORT = process.env.PORT || 3000;

console.log('☕ Coffee Shop Starting on Render...');
console.log('Current directory:', __dirname);
console.log('Files available:', ['server.js', 'package.json', 'index.html']); // Manual file list

// Middleware
app.use(cors());
app.use(express.json());

// Serve static files explicitly
app.use(express.static(__dirname, {
  dotfiles: 'ignore',
  index: 'index.html'
}));

// Explicit routes
app.get('/', (req, res) => {
  console.log('📄 Serving index.html from:', path.join(__dirname, 'index.html'));
  try {
    res.sendFile(path.join(__dirname, 'index.html'));
  } catch (error) {
    console.error('Error serving index.html:', error);
    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
          <title>☕ Coffee Shop</title>
          <style>
              body { font-family: Arial, sans-serif; text-align: center; padding: 50px; background: #8B4513; color: white; }
              .container { background: rgba(255,255,255,0.1); padding: 40px; border-radius: 15px; }
              h1 { font-size: 2.5em; }
          </style>
      </head>
      <body>
          <div class="container">
              <h1>☕ Coffee Shop</h1>
              <p>✅ Server is running on Render!</p>
              <p>But index.html not found. Check file structure.</p>
              <p><a href="/health" style="color: #FFD700;">Health Check</a></p>
          </div>
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
    environment: 'render'
  });
});

// Simple in-memory orders for testing
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

// Catch-all route
app.get('*', (req, res) => {
  res.redirect('/');
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log('✅ COFFEE SHOP RUNNING ON PORT: ' + PORT);
  console.log('📍 Visit your site to test!');
});

// Keep alive
setInterval(() => {
  console.log('💓 Server alive: ' + Math.floor(process.uptime()) + 's');
}, 30000);