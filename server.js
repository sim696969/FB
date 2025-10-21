const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

console.log('=== STARTING SERVER ===');

// Add basic health check middleware that responds immediately
app.use((req, res, next) => {
  if (req.path === '/health' || req.path === '/') {
    console.log('Health check received:', req.path);
  }
  next();
});

// Root route - respond immediately
app.get('/', (req, res) => {
  console.log('Root route called');
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
        <title>☕ Coffee Shop</title>
        <style>
            body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
            h1 { color: #8B4513; }
        </style>
    </head>
    <body>
        <h1>☕ Welcome to The Coffee Shop!</h1>
        <p>✅ Server is running successfully</p>
        <p><a href="/health">Health Check</a></p>
    </body>
    </html>
  `);
});

// Health check - critical for Railway
app.get('/health', (req, res) => {
  console.log('Health endpoint called');
  res.json({ 
    status: 'OK', 
    message: 'Coffee Shop Server is healthy!',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Start server
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log('✅ SERVER RUNNING ON PORT: ' + PORT);
  console.log('📍 Ready for health checks');
});

// Critical: Handle health checks properly
let isHealthy = true;

// Railway sends requests to determine if app is healthy
// We need to respond quickly and successfully

// Keep the process alive
const keepAlive = setInterval(() => {
  console.log('💓 Server alive for ' + Math.floor(process.uptime()) + ' seconds');
}, 15000); // More frequent heartbeats

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('🛑 SIGTERM received - Graceful shutdown');
  clearInterval(keepAlive);
  server.close(() => {
    console.log('✅ Server closed gracefully');
    process.exit(0);
  });
});