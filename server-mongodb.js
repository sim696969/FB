const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const cors = require('cors');

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
.catch(err => {
    console.error('❌ MongoDB connection error:', err);
    console.log('🔄 Running in standalone mode - orders will be stored in memory');
});

// Order Schema
const orderSchema = new mongoose.Schema({
    orderId: { type: String, required: true, unique: true },
    customerName: { type: String, required: true },
    customerPhone: String,
    items: [{
        name: String,
        price: Number,
        quantity: Number,
        itemId: String,
        image: String // Store product image path
    }],
    subtotal: { type: Number, required: true },
    tipAmount: { type: Number, default: 0 },
    total: { type: Number, required: true },
    status: { type: String, default: 'received' },
    paymentStatus: { type: String, default: 'pending' },
    paymentMethod: String,
    tableNumber: String,
    specialInstructions: String,
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

const Order = mongoose.model('Order', orderSchema);

// Menu items with your actual images
const menuItems = [
    // Coffee
    { id: 'espresso', name: 'Espresso', price: 3.50, category: 'coffee', image: 'Espresso.jpeg', description: 'Rich and bold espresso shot' },
    { id: 'latte', name: 'Latte', price: 4.50, category: 'coffee', image: 'Latte.jpg', description: 'Smooth espresso with steamed milk' },
    { id: 'cappuccino', name: 'Cappuccino', price: 4.25, category: 'coffee', image: 'Cappuccino.jpeg', description: 'Equal parts espresso, milk, and foam' },
    { id: 'cold_brew', name: 'Cold Brew', price: 4.75, category: 'coffee', image: 'Cold Brew.jpg', description: '16-hour steeped smooth coffee' },
    
    // Pastries
    { id: 'chocolate_croissant', name: 'Chocolate Croissant', price: 3.25, category: 'pastries', image: 'Chocolate Croissant.j...', description: 'Flaky croissant with chocolate' },
    { id: 'blueberry_muffin', name: 'Blueberry Muffin', price: 2.95, category: 'pastries', image: 'Blueberry Muffin.jpeg', description: 'Moist muffin with blueberries' },
    { id: 'almond_biscotti', name: 'Almond Biscotti', price: 2.50, category: 'pastries', image: 'Aimond Biscotti.jpeg', description: 'Crunchy almond cookies' },
    
    // Drinks
    { id: 'iced_lemon_tea', name: 'Iced Lemon Tea', price: 3.75, category: 'drinks', image: 'Iced Lemon Tea.jpeg', description: 'Refreshing tea with lemon' },
    { id: 'orange_juice', name: 'Orange Juice', price: 3.50, category: 'drinks', image: 'Orange Juice.jpeg', description: 'Freshly squeezed orange juice' },
    { id: 'sparkling_water', name: 'Sparkling Water', price: 2.50, category: 'drinks', image: 'Sparkling Water.jpeg', description: 'Refreshing sparkling water' }
];

// In-memory fallback for orders
let memoryOrders = [];

// Middleware
app.use(cors());
app.use(express.static('public'));
app.use(express.static(__dirname));
app.use('/picture', express.static(path.join(__dirname, 'picture'))); // Serve product images
app.use(express.json({ limit: '10mb' }));

// Helper function to check MongoDB connection
const isMongoConnected = () => mongoose.connection.readyState === 1;

// Routes
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/payment/:orderId', (req, res) => {
    res.sendFile(path.join(__dirname, 'payment.html'));
});

app.get('/payment-confirm', (req, res) => {
    res.sendFile(path.join(__dirname, 'payment-confirm.html'));
});

app.get('/admin/orders', (req, res) => {
    res.sendFile(path.join(__dirname, 'admin.html'));
});

// API Routes
app.get('/api/status', (req, res) => {
    res.json({ 
        status: 'OK', 
        db: isMongoConnected() ? 'mongodb' : 'memory',
        timestamp: new Date().toISOString()
    });
});

// Get menu items
app.get('/api/menu', (req, res) => {
    res.json({
        success: true,
        data: menuItems
    });
});

// Create new order
app.post('/api/orders', async (req, res) => {
    try {
        const orderData = req.body;
        const orderId = `ORDER-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
        
        // Enhance items with image data
        const enhancedItems = (orderData.order_details || []).map(item => {
            const menuItem = menuItems.find(m => m.id === item.itemId);
            return {
                ...item,
                image: menuItem ? menuItem.image : null
            };
        });

        const orderPayload = {
            orderId: orderId,
            customerName: orderData.customer_name,
            customerPhone: orderData.customer_phone,
            tableNumber: orderData.table_number,
            specialInstructions: orderData.special_instructions,
            items: enhancedItems,
            subtotal: orderData.sub_total || 0,
            tipAmount: orderData.tip_amount || 0,
            total: orderData.total_amount || 0,
            status: 'received',
            paymentStatus: 'pending'
        };

        let savedOrder;

        // Try MongoDB first
        if (isMongoConnected()) {
            const order = new Order(orderPayload);
            savedOrder = await order.save();
            console.log('✅ Order saved to MongoDB:', orderId);
        } else {
            // Fallback to memory
            savedOrder = { ...orderPayload, _id: Date.now().toString() };
            memoryOrders.push(savedOrder);
            console.log('✅ Order saved to memory:', orderId);
        }
        
        res.json({
            success: true,
            order_id: orderId,
            message: 'Order received successfully!',
            data: savedOrder
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
        let orders;
        
        if (isMongoConnected()) {
            orders = await Order.find().sort({ createdAt: -1 });
        } else {
            orders = memoryOrders.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        }
        
        res.json({
            success: true,
            data: orders
        });
    } catch (error) {
        console.error('Error fetching orders:', error);
        res.status(500).json({ 
            success: false,
            error: 'Failed to fetch orders' 
        });
    }
});

// Get single order
app.get('/api/orders/:orderId', async (req, res) => {
    try {
        let order;
        
        if (isMongoConnected()) {
            order = await Order.findOne({ orderId: req.params.orderId });
        } else {
            order = memoryOrders.find(o => o.orderId === req.params.orderId);
        }
        
        if (!order) {
            return res.status(404).json({ 
                success: false,
                error: 'Order not found' 
            });
        }
        
        res.json({
            success: true,
            data: order
        });
    } catch (error) {
        res.status(500).json({ 
            success: false,
            error: 'Failed to fetch order' 
        });
    }
});

// Update order status
app.put('/api/orders/:orderId/status', async (req, res) => {
    try {
        const { status } = req.body;
        let order;
        
        if (isMongoConnected()) {
            order = await Order.findOneAndUpdate(
                { orderId: req.params.orderId },
                { 
                    status: status,
                    updatedAt: new Date()
                },
                { new: true }
            );
        } else {
            order = memoryOrders.find(o => o.orderId === req.params.orderId);
            if (order) {
                order.status = status;
                order.updatedAt = new Date();
            }
        }
        
        if (!order) {
            return res.status(404).json({ 
                success: false,
                error: 'Order not found' 
            });
        }
        
        console.log(`🔄 Order ${order.orderId} status updated to: ${status}`);
        res.json({ 
            success: true, 
            message: `Order status updated to ${status}`,
            data: order 
        });
        
    } catch (error) {
        console.error('Error updating order status:', error);
        res.status(500).json({ 
            success: false,
            error: 'Failed to update order status' 
        });
    }
});

// Update payment status
app.put('/api/orders/:orderId/payment', async (req, res) => {
    try {
        const { paymentStatus, paymentMethod, customerPhone } = req.body;
        let order;
        
        const updateData = { 
            paymentStatus: paymentStatus,
            paymentMethod: paymentMethod,
            updatedAt: new Date()
        };
        
        if (customerPhone) {
            updateData.customerPhone = customerPhone;
        }

        if (isMongoConnected()) {
            order = await Order.findOneAndUpdate(
                { orderId: req.params.orderId },
                updateData,
                { new: true }
            );
        } else {
            order = memoryOrders.find(o => o.orderId === req.params.orderId);
            if (order) {
                Object.assign(order, updateData);
            }
        }
        
        if (!order) {
            return res.status(404).json({ 
                success: false,
                error: 'Order not found' 
            });
        }
        
        console.log(`💰 Order ${order.orderId} payment updated: ${paymentStatus}`);
        res.json({ 
            success: true, 
            message: `Payment status updated to ${paymentStatus}`,
            data: order 
        });
        
    } catch (error) {
        console.error('Error updating payment:', error);
        res.status(500).json({ 
            success: false,
            error: 'Failed to update payment' 
        });
    }
});

// Delete order
app.delete('/api/orders/:orderId', async (req, res) => {
    try {
        let deleted = false;
        
        if (isMongoConnected()) {
            const order = await Order.findOneAndDelete({ orderId: req.params.orderId });
            deleted = !!order;
        } else {
            const index = memoryOrders.findIndex(o => o.orderId === req.params.orderId);
            if (index !== -1) {
                memoryOrders.splice(index, 1);
                deleted = true;
            }
        }
        
        if (!deleted) {
            return res.status(404).json({ 
                success: false,
                error: 'Order not found' 
            });
        }
        
        console.log(`🗑️ Order deleted: ${req.params.orderId}`);
        res.json({ 
            success: true, 
            message: 'Order deleted successfully' 
        });
        
    } catch (error) {
        console.error('Error deleting order:', error);
        res.status(500).json({ 
            success: false,
            error: 'Failed to delete order' 
        });
    }
});

// Clear all orders
app.delete('/api/orders', async (req, res) => {
    try {
        let deletedCount;
        
        if (isMongoConnected()) {
            const result = await Order.deleteMany({});
            deletedCount = result.deletedCount;
        } else {
            deletedCount = memoryOrders.length;
            memoryOrders = [];
        }
        
        console.log(`🧹 Cleared all orders: ${deletedCount}`);
        res.json({ 
            success: true, 
            message: `Cleared ${deletedCount} orders` 
        });
    } catch (error) {
        console.error('Error clearing orders:', error);
        res.status(500).json({ 
            success: false,
            error: 'Failed to clear orders' 
        });
    }
});

// Dashboard statistics
app.get('/api/dashboard/stats', async (req, res) => {
    try {
        let orders;
        
        if (isMongoConnected()) {
            orders = await Order.find();
        } else {
            orders = memoryOrders;
        }
        
        const today = new Date().toDateString();
        const todayOrders = orders.filter(order => 
            new Date(order.createdAt).toDateString() === today
        );
        
        const totalRevenue = orders
            .filter(order => order.paymentStatus === 'paid')
            .reduce((sum, order) => sum + order.total, 0);
            
        const todayRevenue = todayOrders
            .filter(order => order.paymentStatus === 'paid')
            .reduce((sum, order) => sum + order.total, 0);

        res.json({
            success: true,
            data: {
                totalOrders: orders.length,
                todayOrders: todayOrders.length,
                pendingOrders: orders.filter(o => o.status === 'received').length,
                totalRevenue: totalRevenue,
                todayRevenue: todayRevenue
            }
        });

    } catch (error) {
        console.error('Error fetching dashboard stats:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch dashboard statistics'
        });
    }
});

// Health check
app.get('/health', (req, res) => {
    res.json({ 
        status: 'healthy',
        server: 'The Daily Grind - Enhanced',
        database: isMongoConnected() ? 'mongodb' : 'memory',
        uptime: process.uptime(),
        orders_count: isMongoConnected() ? 'unknown' : memoryOrders.length,
        timestamp: new Date().toISOString()
    });
});

// Start server
app.listen(PORT, () => {
    console.log(`
☕ The Daily Grind - Enhanced Server Started!
📍 Port: ${PORT}
🌐 URL: http://localhost:${PORT}
🗄️ Database: ${isMongoConnected() ? 'MongoDB Atlas' : 'Memory (Fallback)'}
🖼️ Product Images: ✅ Integrated
📊 Dashboard Stats: ✅ Available
✅ Ready to serve coffee!
👑 Admin: /admin/orders  
💰 Payment: /payment/:orderId
📷 Proof Upload: /payment-confirm
    `);
});

module.exports = app;