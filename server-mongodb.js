const express = require('express');
const mongoose = require('mongoose');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// MongoDB connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://coffeeShopAdmin:yourPassword@cluster0.xxxxx.mongodb.net/coffeeShop?retryWrites=true&w=majority';

// Connect to MongoDB
mongoose.connect(MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
})
.then(() => console.log('✅ Connected to MongoDB Atlas'))
.catch(err => console.error('❌ MongoDB connection error:', err));

// Order Schema
const orderSchema = new mongoose.Schema({
    orderId: { type: String, required: true, unique: true },
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
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

const Order = mongoose.model('Order', orderSchema);

// Middleware
app.use(express.static('public'));
app.use(express.static(__dirname));
app.use(express.json());

// Routes
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/payment/:orderId', (req, res) => {
    res.sendFile(path.join(__dirname, 'payment.html'));
});

app.get('/admin/orders', (req, res) => {
    res.sendFile(path.join(__dirname, 'admin.html'));
});

// API Routes
app.get('/api/status', (req, res) => {
    res.json({ 
        status: 'OK', 
        db: 'mongodb',
        timestamp: new Date().toISOString()
    });
});

// Create new order
app.post('/api/orders', async (req, res) => {
    try {
        const orderData = req.body;
        const orderId = `ORDER-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
        
        const order = new Order({
            orderId: orderId,
            customerName: orderData.customer_name,
            items: orderData.order_details || [],
            subtotal: orderData.sub_total || 0,
            tipAmount: orderData.tip_amount || 0,
            total: orderData.total_amount || 0,
            status: 'received',
            paymentStatus: 'pending'
        });

        await order.save();
        
        console.log('✅ Order saved to MongoDB:', orderId);
        
        res.json({
            success: true,
            order_id: orderId,
            message: 'Order saved successfully!'
        });
        
    } catch (error) {
        console.error('❌ Order save error:', error);
        res.status(500).json({ 
            success: false,
            error: 'Failed to save order: ' + error.message 
        });
    }
});

// Get all orders (for admin)
app.get('/api/orders', async (req, res) => {
    try {
        const orders = await Order.find().sort({ createdAt: -1 });
        res.json(orders);
    } catch (error) {
        console.error('Error fetching orders:', error);
        res.status(500).json({ error: 'Failed to fetch orders' });
    }
});

// Get single order (for payment page)
app.get('/api/orders/:orderId', async (req, res) => {
    try {
        const order = await Order.findOne({ orderId: req.params.orderId });
        if (!order) {
            return res.status(404).json({ error: 'Order not found' });
        }
        res.json(order);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch order' });
    }
});

// Update order status
app.put('/api/orders/:orderId/status', async (req, res) => {
    try {
        const { status } = req.body;
        const order = await Order.findOneAndUpdate(
            { orderId: req.params.orderId },
            { 
                status: status,
                updatedAt: new Date()
            },
            { new: true }
        );
        
        if (!order) {
            return res.status(404).json({ error: 'Order not found' });
        }
        
        console.log(`🔄 Order ${order.orderId} status updated to: ${status}`);
        res.json({ success: true, order });
        
    } catch (error) {
        console.error('Error updating order status:', error);
        res.status(500).json({ error: 'Failed to update order' });
    }
});

// Update payment status
app.put('/api/orders/:orderId/payment', async (req, res) => {
    try {
        const { paymentStatus, paymentMethod } = req.body;
        const order = await Order.findOneAndUpdate(
            { orderId: req.params.orderId },
            { 
                paymentStatus: paymentStatus,
                paymentMethod: paymentMethod,
                updatedAt: new Date()
            },
            { new: true }
        );
        
        if (!order) {
            return res.status(404).json({ error: 'Order not found' });
        }
        
        console.log(`💰 Order ${order.orderId} payment updated: ${paymentStatus}`);
        res.json({ success: true, order });
        
    } catch (error) {
        console.error('Error updating payment:', error);
        res.status(500).json({ error: 'Failed to update payment' });
    }
});

// Delete order
app.delete('/api/orders/:orderId', async (req, res) => {
    try {
        const order = await Order.findOneAndDelete({ orderId: req.params.orderId });
        
        if (!order) {
            return res.status(404).json({ error: 'Order not found' });
        }
        
        console.log(`🗑️ Order deleted: ${req.params.orderId}`);
        res.json({ success: true, message: 'Order deleted' });
        
    } catch (error) {
        console.error('Error deleting order:', error);
        res.status(500).json({ error: 'Failed to delete order' });
    }
});

// Clear all orders
app.delete('/api/orders', async (req, res) => {
    try {
        const result = await Order.deleteMany({});
        console.log(`🧹 Cleared all orders: ${result.deletedCount}`);
        res.json({ success: true, message: `Cleared ${result.deletedCount} orders` });
    } catch (error) {
        console.error('Error clearing orders:', error);
        res.status(500).json({ error: 'Failed to clear orders' });
    }
});

// Export orders
app.get('/api/orders/export', async (req, res) => {
    try {
        const orders = await Order.find().sort({ createdAt: -1 });
        const exportData = {
            exported_at: new Date().toISOString(),
            total_orders: orders.length,
            orders: orders
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
        server: 'The Daily Grind - MongoDB',
        database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
        uptime: process.uptime(),
        timestamp: new Date().toISOString()
    });
});

// Start server
app.listen(PORT, () => {
    console.log(`
☕ The Daily Grind Server Started!
📍 Port: ${PORT}
🌐 URL: http://localhost:${PORT}
🗄️ Database: MongoDB Atlas
✅ Orders will persist after deployment!
👑 Admin: /admin/orders  
💰 Payment: /payment/:orderId
    `);
});

module.exports = app;