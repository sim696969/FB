console.log('=== STARTING SERVER ===');

const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => {
  res.send(`
    <h1>☕ Coffee Shop</h1>
    <p>Server is running!</p>
    <p><a href="/health">Health Check</a></p>
  `);
});

app.get('/health', (req, res) => {
  res.json({ status: 'OK', time: new Date().toISOString() });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log('✅ SERVER RUNNING ON PORT: ' + PORT);
});

console.log('=== SERVER SETUP COMPLETE ===');