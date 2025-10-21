console.log('🚀 Starting Coffee Shop Server...');

const express = require('express');
const app = express();

// Use Railway's provided port
const PORT = process.env.PORT || 3000;

console.log('Using port:', PORT);

// Root route
app.get('/', (req, res) => {
  console.log('📄 Homepage requested');
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
        <title>☕ Coffee Shop</title>
        <style>
            body { font-family: Arial, sans-serif; text-align: center; padding: 50px; background: #f5f5f5; }
            .container { background: white; padding: 40px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
            h1 { color: #8B4513; font-size: 2.5em; }
            .status { color: green; font-weight: bold; }
        </style>
    </head>
    <body>
        <div class="container">
            <h1>☕ Welcome to The Coffee Shop!</h1>
            <p class="status">✅ Server is running successfully on Railway</p>
            <p>Port: ${PORT}</p>
            <p>Time: ${new Date().toISOString()}</p>
            <p><a href="/health">Health Check</a> | <a href="/test">Test API</a></p>
        </div>
    </body>
    </html>
  `);
});

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'Coffee Shop Server is healthy!',
    timestamp: new Date().toISOString(),
    port: PORT,
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

// Start server - CRITICAL: Bind to 0.0.0.0
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log('✅ SERVER STARTED on port ' + PORT);
  console.log('📍 Server is ready to accept requests');
});

// Keep process alive
setInterval(() => {
  console.log('💓 Server alive for ' + Math.floor(process.uptime()) + ' seconds');
}, 15000);