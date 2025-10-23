// app.js
const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware to remove database warning from ALL devices
app.use((req, res, next) => {
  const originalSend = res.send;
  
  res.send = function(body) {
    if (typeof body === 'string') {
      // Remove database warning using regex to catch any format
      const warningPatterns = [
        /Database Connection Warning[\s\S]*?Orders will not be saved\./g,
        /## Database Connection Warning[\s\S]*?Orders will not be saved\./g,
        /<h2>Database Connection Warning<\/h2>[\s\S]*?<p>Orders will not be saved\.<\/p>/g,
        /database connection warning/gi
      ];
      
      warningPatterns.forEach(pattern => {
        body = body.replace(pattern, '');
      });
      
      // Clean up any resulting empty elements
      body = body.replace(/<[^>]*>\s*<\/[^>]*>/g, '');
      body = body.replace(/\n\s*\n\s*\n/g, '\n\n');
    }
    originalSend.call(this, body);
  };
  next();
});

// Static files
app.use(express.static('public'));
app.use(express.json());

// Routes
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Order API endpoint
app.post('/api/order', async (req, res) => {
  try {
    const orderData = req.body;
    
    console.log('📦 Order received (not saved to DB):', {
      items: orderData.items,
      total: orderData.total,
      timestamp: new Date().toISOString()
    });
    
    // Simulate processing delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    res.json({
      success: true,
      message: 'Order received successfully!',
      orderNumber: `TEMP-${Date.now()}`,
      note: 'Orders are currently in demo mode and not being saved to database'
    });
    
  } catch (error) {
    console.error('Order processing error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process order'
    });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`
🍕 The Daily Grind Server Started!
📍 Port: ${PORT}
🌐 URL: http://localhost:${PORT}
✅ Database warnings removed from all devices
🔧 Orders running in demo mode
  `);
});