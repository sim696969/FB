const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

console.log('=== RAILWAY DEPLOYMENT DEBUG ===');
console.log('PORT:', PORT);
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('RAILWAY_ENVIRONMENT:', process.env.RAILWAY_ENVIRONMENT);
console.log('All Railway env vars:');
Object.keys(process.env).forEach(key => {
  if (key.includes('RAILWAY') || key.includes('PORT')) {
    console.log('  ', key, '=', process.env[key]);
  }
});

// Log ALL requests
app.use((req, res, next) => {
  console.log(`📨 INCOMING REQUEST: ${req.method} ${req.url} from ${req.ip}`);
  next();
});

app.get('/', (req, res) => {
  console.log('✅ SERVING COFFEE SHOP HOMEPAGE');
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
        <title>☕ Coffee Shop - RAILWAY FIX</title>
        <style>
            body { font-family: Arial, sans-serif; text-align: center; padding: 50px; background: #8B4513; color: white; }
            .container { background: rgba(255,255,255,0.1); padding: 40px; border-radius: 15px; }
            h1 { font-size: 3em; }
            .debug { background: #333; padding: 20px; border-radius: 10px; margin: 20px 0; text-align: left; }
        </style>
    </head>
    <body>
        <div class="container">
            <h1>☕ COFFEE SHOP</h1>
            <h2 style="color: #90EE90;">✅ SERVER IS RUNNING!</h2>
            <div class="debug">
                <strong>Debug Info:</strong><br>
                Port: ${PORT}<br>
                Time: ${new Date().toISOString()}<br>
                Environment: ${process.env.RAILWAY_ENVIRONMENT || 'not set'}<br>
                If you see this, Railway routing works! 🎉
            </div>
            <p><a href="/health" style="color: #FFD700;">Health Check</a></p>
        </div>
    </body>
    </html>
  `);
});

app.get('/health', (req, res) => {
  console.log('❤️ HEALTH CHECK REQUESTED');
  res.json({ 
    status: 'HEALTHY', 
    service: 'coffee-shop',
    port: PORT,
    environment: process.env.RAILWAY_ENVIRONMENT,
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

app.get('*', (req, res) => {
  console.log('🔍 UNHANDLED ROUTE:', req.url);
  res.status(404).send('Route not found');
});

app.listen(PORT, '0.0.0.0', () => {
  console.log('🎉 SERVER SUCCESSFULLY STARTED ON PORT: ' + PORT);
  console.log('📍 Waiting for Railway to route traffic...');
  console.log('📍 If you see request logs below, routing works!');
});

// Keep alive
setInterval(() => {
  console.log('💓 Heartbeat - Server alive for ' + Math.floor(process.uptime()) + 's');
}, 15000);