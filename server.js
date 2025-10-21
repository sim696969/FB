const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

console.log('=== STARTING SERVER ===');

// Minimal middleware
app.use(express.static(__dirname));

// Basic route
app.get('/', (req, res) => {
  console.log('Homepage requested');
  res.sendFile(__dirname + '/index.html');
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', time: new Date().toISOString() });
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log('=== SERVER STARTED SUCCESSFULLY ===');
  console.log('Port:', PORT);
  console.log('Directory:', __dirname);
});

console.log('=== SERVER SETUP COMPLETE ===');