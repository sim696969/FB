const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

console.log('=== STARTING COFFEE SHOP SERVER ===');

// Basic middleware
app.use(express.json());

// Serve a simple HTML page directly
app.get('/', (req, res) => {
  console.log('Serving coffee shop homepage');
  res.send(`
<!DOCTYPE html>
<html>
<head>
    <title>The Coffee Shop</title>
    <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-gray-100 min-h-screen flex items-center justify-center">
    <div class="bg-white p-8 rounded-lg shadow-lg text-center">
        <h1 class="text-4xl font-bold text-red-600 mb-4">☕ The Coffee Shop</h1>
        <p class="text-gray-600 mb-4">Welcome to our coffee shop!</p>
        <p class="text-green-600 font-semibold">✅ Server is running successfully!</p>
        <div class="mt-6 space-y-2">
            <a href="/health" class="block bg-blue-500 text-white px-4 py-2 rounded">Health Check</a>
            <a href="/test" class="block bg-green-500 text-white px-4 py-2 rounded">Test API</a>
        </div>
    </div>
</body>
</html>
  `);
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

// Test endpoint
app.get('/test', (req, res) => {
  res.json({ 
    message: 'API is working!',
    timestamp: new Date().toISOString()
  });
});

// Order endpoint
app.post('/api/orders', (req, res) => {
  const orderId = 'ORD-' + Date.now();
  console.log('Order received:', orderId);
  
  res.json({ 
    success: true, 
    orderId: orderId,
    message: 'Order received successfully!'
  });
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log('✅ SERVER STARTED SUCCESSFULLY ON PORT ' + PORT);
});

// Keep alive
setInterval(() => {
  console.log('💓 Server alive for ' + Math.floor(process.uptime()) + ' seconds');
}, 30000);