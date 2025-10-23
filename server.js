// server.js - PRODUCTION VERSION WITH MONGODB
const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// MongoDB connection - using environment variable for security
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/coffeeshop';

// Connect to MongoDB with better error handling
mongoose.connect(MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
})
.then(() => console.log('✅ Connected to MongoDB'))
.catch(err => {
    console.error('❌ MongoDB connection error:', err);
    console.log('🔄 Falling back to file-based storage');
});

// Order Schema
const orderSchema = new mongoose.Schema({
    id: { type: String, required: true, unique: true },
    customerName: { type: String, required: true },
    items: [{
        name: String,
        price: Number,
        quantity: Number,
        itemId: String
    }],
    subtotal: { type: Number, required: true },
    tipAmount: { type: Number, default: 0 },
    total: { type: Number, required: true },
    status: { type: String, default: 'received' },
    paymentStatus: { type: String, default: 'pending' },
    paymentMethod: String,
    timestamp: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

const Order = mongoose.model('Order', orderSchema);

// File-based fallback
const ordersFile = './orders.json';
let fileOrders = [];

function loadFileOrders() {
    try {
        if (fs.existsSync(ordersFile)) {
            const data = fs.readFileSync(ordersFile, 'utf8');
            const fileData = JSON.parse(data);
            fileOrders = fileData.orders || fileData || [];
        }
    } catch (error) {
        fileOrders = [];
    }
}

function saveFileOrders() {
    try {
        const dataToSave = { orders: fileOrders };
        fs.writeFileSync(ordersFile, JSON.stringify(dataToSave, null, 2));
    } catch (error) {
        console.error('Error saving to file:', error);
    }
}

loadFileOrders();

// Helper function to check MongoDB connection
const isMongoConnected = () => mongoose.connection.readyState === 1;

// Middleware
app.use(express.static(__dirname));
app.use(express.json());

// Routes
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/admin/orders', (req, res) => {
    res.sendFile(path.join(__dirname, 'admin.html'));
});

app.get('/payment/:orderId', (req, res) => {
    res.sendFile(path.join(__dirname, 'payment.html'));
});

// API Routes
app.get('/api/status', (req, res) => {
    res.json({ 
        status: 'OK', 
        db: isMongoConnected() ? 'mongodb' : 'file',
        timestamp: new Date().toISOString()
    });
});

// Create order - tries MongoDB first, falls back to file
app.post('/api/orders', async (req, res) => {
    try {
        const orderData = req.body;
        
        let items = [];
        if (orderData.order_details) {
            items = orderData.order_details;
        } else if (orderData.items) {
            items = orderData.items;
        }
        
        let total = orderData.total_amount || orderData.total;
        if (!total && items.length > 0) {
            total = items.reduce((sum, item) => sum + (item.price * (item.quantity || 1)), 0);
        }

        const orderId = `ORDER-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
        const orderPayload = {
            id: orderId,
            items: items,
            total: total || 0,
            customerName: orderData.customer_name || orderData.customerName || 'Walk-in Customer',
            status: 'received',
            timestamp: new Date().toISOString(),
            subtotal: orderData.sub_total || total || 0,
            tipAmount: orderData.tip_amount || 0
        };

        // Try MongoDB first
        if (isMongoConnected()) {
            const order = new Order(orderPayload);
            await order.save();
            console.log('✅ Order saved to MongoDB:', orderId);
        } else {
            // Fallback to file
            fileOrders.push(orderPayload);
            saveFileOrders();
            console.log('✅ Order saved to file:', orderId);
        }

        res.json({
            success: true,
            order_id: orderId,
            message: 'Order received successfully!'
        });
        
    } catch (error) {
        console.error('❌ Order processing error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to process order: ' + error.message
        });
    }
});

// Get all orders
app.get('/api/orders', async (req, res) => {
    try {
        if (isMongoConnected()) {
            const orders = await Order.find().sort({ timestamp: -1 });
            res.json(orders);
        } else {
            const sortedOrders = fileOrders.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
            res.json(sortedOrders);
        }
    } catch (error) {
        console.error('Error fetching orders:', error);
        res.status(500).json({ error: 'Failed to fetch orders' });
    }
});

// Get single order
app.get('/api/orders/:id', async (req, res) => {
    try {
        if (isMongoConnected()) {
            const order = await Order.findOne({ id: req.params.id });
            if (!order) return res.status(404).json({ error: 'Order not found' });
            res.json(order);
        } else {
            const order = fileOrders.find(o => o.id === req.params.id);
            if (!order) return res.status(404).json({ error: 'Order not found' });
            res.json(order);
        }
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch order' });
    }
});

// Update order status
app.put('/api/orders/:id/status', async (req, res) => {
    try {
        const { status } = req.body;
        
        if (isMongoConnected()) {
            const order = await Order.findOneAndUpdate(
                { id: req.params.id },
                { 
                    status: status,
                    updatedAt: new Date()
                },
                { new: true }
            );
            if (!order) return res.status(404).json({ error: 'Order not found' });
            res.json({ success: true, order });
        } else {
            const order = fileOrders.find(o => o.id === req.params.id);
            if (!order) return res.status(404).json({ error: 'Order not found' });
            order.status = status;
            order.updatedAt = new Date().toISOString();
            saveFileOrders();
            res.json({ success: true, order });
        }
    } catch (error) {
        console.error('Error updating order status:', error);
        res.status(500).json({ error: 'Failed to update order' });
    }
});

// Update payment status
app.put('/api/orders/:id/payment', async (req, res) => {
    try {
        const { paymentStatus, paymentMethod } = req.body;
        
        if (isMongoConnected()) {
            const order = await Order.findOneAndUpdate(
                { id: req.params.id },
                { 
                    paymentStatus: paymentStatus,
                    paymentMethod: paymentMethod,
                    updatedAt: new Date()
                },
                { new: true }
            );
            if (!order) return res.status(404).json({ error: 'Order not found' });
            res.json({ success: true, order });
        } else {
            const order = fileOrders.find(o => o.id === req.params.id);
            if (!order) return res.status(404).json({ error: 'Order not found' });
            order.paymentStatus = paymentStatus;
            order.paymentMethod = paymentMethod;
            order.updatedAt = new Date().toISOString();
            saveFileOrders();
            res.json({ success: true, order });
        }
    } catch (error) {
        console.error('Error updating payment:', error);
        res.status(500).json({ error: 'Failed to update payment' });
    }
});

// Delete order
app.delete('/api/orders/:id', async (req, res) => {
    try {
        if (isMongoConnected()) {
            const order = await Order.findOneAndDelete({ id: req.params.id });
            if (!order) return res.status(404).json({ error: 'Order not found' });
            res.json({ success: true, message: 'Order deleted' });
        } else {
            const index = fileOrders.findIndex(o => o.id === req.params.id);
            if (index === -1) return res.status(404).json({ error: 'Order not found' });
            fileOrders.splice(index, 1);
            saveFileOrders();
            res.json({ success: true, message: 'Order deleted' });
        }
    } catch (error) {
        console.error('Error deleting order:', error);
        res.status(500).json({ error: 'Failed to delete order' });
    }
});

// Clear all orders
app.delete('/api/orders', async (req, res) => {
    try {
        if (isMongoConnected()) {
            const result = await Order.deleteMany({});
            res.json({ success: true, message: `Cleared ${result.deletedCount} orders` });
        } else {
            const orderCount = fileOrders.length;
            fileOrders = [];
            saveFileOrders();
            res.json({ success: true, message: `Cleared ${orderCount} orders` });
        }
    } catch (error) {
        console.error('Error clearing orders:', error);
        res.status(500).json({ error: 'Failed to clear orders' });
    }
});

// Export orders
app.get('/api/orders/export', async (req, res) => {
    try {
        let ordersToExport;
        if (isMongoConnected()) {
            ordersToExport = await Order.find().sort({ timestamp: -1 });
        } else {
            ordersToExport = fileOrders.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        }
        
        const exportData = {
            exported_at: new Date().toISOString(),
            total_orders: ordersToExport.length,
            orders: ordersToExport
        };
        
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', 'attachment; filename=orders-export.json');
        res.json(exportData);
    } catch (error) {
        console.error('Error exporting orders:', error);
        res.status(500).json({ error: 'Failed to export orders' });
    }
});

// Health check
app.get('/health', (req, res) => {
    res.json({ 
        status: 'healthy',
        server: 'The Daily Grind',
        database: isMongoConnected() ? 'mongodb' : 'file',
        uptime: process.uptime(),
        orders_count: isMongoConnected() ? 'unknown' : fileOrders.length,
        timestamp: new Date().toISOString()
    });
});

// Start server
app.listen(PORT, () => {
    console.log(`
🍕 The Daily Grind Server Started!
📍 Port: ${PORT}
🌐 URL: http://localhost:${PORT}
🗄️ Database: ${isMongoConnected() ? 'MongoDB' : 'File-based'}
✅ Ready to receive orders!
👑 Admin: /admin/orders  
💰 Payment: /payment/:orderId
    `);
});

module.exports = app;