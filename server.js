// server.js - DEBUG VERSION
const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// File-based order storage
const ordersFile = './orders.json';

// Load existing orders from file
let orders = [];
function loadOrders() {
    try {
        if (fs.existsSync(ordersFile)) {
            const data = fs.readFileSync(ordersFile, 'utf8');
            const fileData = JSON.parse(data);
            orders = fileData.orders || fileData || [];
            console.log(`📂 Loaded ${orders.length} existing orders`);
        }
    } catch (error) {
        console.log('📂 No existing orders file or error loading, starting fresh');
        orders = [];
    }
}

// Save orders to file
function saveOrders() {
    try {
        const dataToSave = { orders: orders };
        fs.writeFileSync(ordersFile, JSON.stringify(dataToSave, null, 2));
        console.log(`💾 Saved ${orders.length} orders to file`);
    } catch (error) {
        console.error('❌ Error saving orders:', error);
    }
}

// Load orders when server starts
loadOrders();

// Middleware
app.use(express.static('public'));
app.use(express.json());
app.use(express.static(__dirname));

// Routes

// Main page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Admin page route
app.get('/admin/orders', (req, res) => {
    res.sendFile(path.join(__dirname, 'admin.html'));
});

// Status endpoint
app.get('/api/status', (req, res) => {
    res.json({ 
        status: 'OK', 
        db: 'file-based',
        orders_count: orders.length,
        timestamp: new Date().toISOString()
    });
});

// Order API endpoint - COMPATIBLE WITH FRONTEND
app.post('/api/orders', async (req, res) => {
    try {
        const orderData = req.body;
        
        console.log('📦 Received order data:', JSON.stringify(orderData, null, 2));
        
        // Extract items from different possible structures
        let items = [];
        if (orderData.order_details) {
            items = orderData.order_details;
        } else if (orderData.items) {
            items = orderData.items;
        }
        
        // Calculate total if not provided
        let total = orderData.total_amount || orderData.total;
        if (!total && items.length > 0) {
            total = items.reduce((sum, item) => sum + (item.price * (item.quantity || 1)), 0);
        }

        // Create order with ID and timestamp
        const order = {
            id: `ORDER-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
            items: items,
            total: total || 0,
            customerName: orderData.customer_name || orderData.customerName || 'Walk-in Customer',
            status: 'received',
            timestamp: new Date().toISOString(),
            subtotal: orderData.sub_total || total || 0,
            tipAmount: orderData.tip_amount || 0,
            originalData: orderData // Keep original for debugging
        };
        
        // Add to orders array
        orders.push(order);
        
        // Save to file
        saveOrders();
        
        console.log('✅ Order saved successfully:', {
            id: order.id,
            customer: order.customerName,
            total: order.total,
            items: order.items.length
        });
        
        res.json({
            success: true,
            order_id: order.id,
            message: 'Order received and saved successfully!'
        });
        
    } catch (error) {
        console.error('❌ Order processing error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to process order: ' + error.message
        });
    }
});

// Get all orders for admin page
app.get('/api/orders', (req, res) => {
    try {
        const sortedOrders = orders.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        console.log(`📊 Sending ${sortedOrders.length} orders to admin`);
        res.json(sortedOrders);
    } catch (error) {
        console.error('Error fetching orders:', error);
        res.status(500).json({ error: 'Failed to fetch orders' });
    }
});

// Update order status
app.put('/api/orders/:id/status', (req, res) => {
    try {
        const { status } = req.body;
        const order = orders.find(o => o.id === req.params.id);
        
        if (!order) {
            return res.status(404).json({ error: 'Order not found' });
        }
        
        order.status = status;
        order.updatedAt = new Date().toISOString();
        saveOrders();
        
        console.log(`🔄 Order ${order.id} status updated to: ${status}`);
        res.json({ success: true, order });
        
    } catch (error) {
        console.error('Error updating order status:', error);
        res.status(500).json({ error: 'Failed to update order' });
    }
});

// Delete single order
app.delete('/api/orders/:id', (req, res) => {
    try {
        const index = orders.findIndex(o => o.id === req.params.id);
        
        if (index === -1) {
            return res.status(404).json({ error: 'Order not found' });
        }
        
        const deletedOrder = orders.splice(index, 1)[0];
        saveOrders();
        
        console.log(`🗑️ Order deleted: ${deletedOrder.id}`);
        res.json({ success: true, message: 'Order deleted' });
        
    } catch (error) {
        console.error('Error deleting order:', error);
        res.status(500).json({ error: 'Failed to delete order' });
    }
});

// Clear all orders
app.delete('/api/orders', (req, res) => {
    try {
        const orderCount = orders.length;
        orders = [];
        saveOrders();
        
        console.log(`🧹 Cleared all ${orderCount} orders`);
        res.json({ success: true, message: `Cleared ${orderCount} orders` });
        
    } catch (error) {
        console.error('Error clearing orders:', error);
        res.status(500).json({ error: 'Failed to clear orders' });
    }
});

// Export orders (download as JSON)
app.get('/api/orders/export', (req, res) => {
    try {
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
        server: 'The Daily Grind',
        uptime: process.uptime(),
        orders: orders.length,
        timestamp: new Date().toISOString()
    });
});

// Start server
app.listen(PORT, () => {
    console.log(`
🍕 The Daily Grind Server Started!
📍 Port: ${PORT}
🌐 URL: http://localhost:${PORT}
💾 Order storage: FILE-BASED (permanent)
📊 Current orders: ${orders.length}
👑 Admin panel: /admin/orders  
💰 Payment page: /payment/:orderId
✅ Ready to receive orders!
    `);
});

module.exports = app;

// Payment page route
app.get('/payment/:orderId', (req, res) => {
    res.sendFile(path.join(__dirname, 'payment.html'));
});

// Update order with payment status
app.put('/api/orders/:id/payment', (req, res) => {
    try {
        const { paymentStatus, paymentMethod } = req.body;
        const order = orders.find(o => o.id === req.params.id);
        
        if (!order) {
            return res.status(404).json({ error: 'Order not found' });
        }
        
        order.paymentStatus = paymentStatus;
        order.paymentMethod = paymentMethod;
        order.paymentTime = new Date().toISOString();
        order.updatedAt = new Date().toISOString();
        
        saveOrders();
        
        console.log(`💰 Order ${order.id} payment updated: ${paymentStatus}`);
        res.json({ success: true, order });
        
    } catch (error) {
        console.error('Error updating payment:', error);
        res.status(500).json({ error: 'Failed to update payment' });
    }
});

// Get order details for payment page
app.get('/api/orders/:id', (req, res) => {
    try {
        const order = orders.find(o => o.id === req.params.id);
        if (!order) {
            return res.status(404).json({ error: 'Order not found' });
        }
        res.json(order);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch order' });
    }
});