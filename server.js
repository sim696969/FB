const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('.')); // Serve all files in current directory

// Serve the main page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Simple order storage (in-memory for now)
let orders = [];

// Submit new order
app.post('/api/orders', (req, res) => {
    try {
        const orderData = req.body;
        const orderId = 'ORD-' + Date.now();
        
        const order = {
            orderId: orderId,
            items: orderData.items,
            subtotal: orderData.subtotal,
            tipAmount: orderData.tipAmount,
            total: orderData.total,
            status: 'received',
            timestamp: new Date().toISOString()
        };
        
        orders.push(order);
        
        console.log('📦 New order received:', order);
        
        res.json({ 
            success: true, 
            orderId: orderId,
            message: 'Order received successfully!'
        });
        
    } catch (error) {
        console.error('Error processing order:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Failed to process order' 
        });
    }
});

// Get all orders
app.get('/api/orders', (req, res) => {
    res.json({ 
        success: true, 
        orders: orders,
        count: orders.length
    });
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        message: 'Server is running', 
        timestamp: new Date().toISOString(),
        database: 'In-memory storage'
    });
});

// Test endpoint
app.get('/test', (req, res) => {
    res.json({ 
        message: 'Server is working!',
        timestamp: new Date().toISOString(),
        port: PORT
    });
});

// START SERVER
app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`✅ Server started successfully!`);
});