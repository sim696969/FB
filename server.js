// server.js - FIXED VERSION WITH CORRECTED API ENDPOINTS
const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// MongoDB connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/coffeeshop';

// Connect to MongoDB
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
    orderId: { type: String, required: true, unique: true }, // Added orderId field
    customerName: { type: String, required: true },
    customerPhone: String,
    items: [{
        name: String,
        price: Number,
        quantity: Number,
        itemId: String,
        image: String
    }],
    subtotal: { type: Number, required: true },
    tipAmount: { type: Number, default: 0 },
    total: { type: Number, required: true },
    status: { type: String, default: 'received' },
    paymentStatus: { type: String, default: 'pending' },
    paymentMethod: String,
    tableNumber: String,
    specialInstructions: String,
    timestamp: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
    createdAt: { type: Date, default: Date.now } // Added createdAt
});

const Order = mongoose.model('Order', orderSchema);

// Payment Proof Schema
const paymentProofSchema = new mongoose.Schema({
    id: { type: String, required: true, unique: true },
    orderId: { type: String, required: true },
    customerName: { type: String, required: true },
    customerPhone: { type: String, required: true },
    paymentReference: String,
    screenshot: { type: String, required: true },
    status: { type: String, default: 'pending' },
    submittedAt: { type: Date, default: Date.now },
    verifiedAt: Date
});

const PaymentProof = mongoose.model('PaymentProof', paymentProofSchema);

// File-based fallback
const ordersFile = './orders.json';
const proofsFile = './payment-proofs.json';
let fileOrders = [];
let fileProofs = [];

function loadFileData() {
    try {
        if (fs.existsSync(ordersFile)) {
            const data = fs.readFileSync(ordersFile, 'utf8');
            const fileData = JSON.parse(data);
            fileOrders = fileData.orders || fileData || [];
        }
        if (fs.existsSync(proofsFile)) {
            const data = fs.readFileSync(proofsFile, 'utf8');
            const fileData = JSON.parse(data);
            fileProofs = fileData.proofs || fileData || [];
        }
    } catch (error) {
        fileOrders = [];
        fileProofs = [];
    }
}

function saveFileOrders() {
    try {
        const dataToSave = { orders: fileOrders };
        fs.writeFileSync(ordersFile, JSON.stringify(dataToSave, null, 2));
    } catch (error) {
        console.error('Error saving orders to file:', error);
    }
}

function saveFileProofs() {
    try {
        const dataToSave = { proofs: fileProofs };
        fs.writeFileSync(proofsFile, JSON.stringify(dataToSave, null, 2));
    } catch (error) {
        console.error('Error saving proofs to file:', error);
    }
}

loadFileData();

// Create uploads directory if it doesn't exist
const uploadsDir = './uploads';
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir);
}

// Helper function to check MongoDB connection
const isMongoConnected = () => mongoose.connection.readyState === 1;

// Helper function to update order payment status
async function updateOrderPaymentStatus(orderId, paymentStatus, paymentMethod, customerPhone = null) {
    try {
        if (isMongoConnected()) {
            const updateData = { 
                paymentStatus, 
                paymentMethod,
                updatedAt: new Date()
            };
            if (customerPhone) {
                updateData.customerPhone = customerPhone;
            }
            await Order.findOneAndUpdate({ orderId: orderId }, updateData);
        } else {
            const order = fileOrders.find(o => o.orderId === orderId);
            if (order) {
                order.paymentStatus = paymentStatus;
                order.paymentMethod = paymentMethod;
                order.updatedAt = new Date().toISOString();
                if (customerPhone) {
                    order.customerPhone = customerPhone;
                }
                saveFileOrders();
            }
        }
    } catch (error) {
        console.error('Error updating order payment status:', error);
    }
}

// Image cleanup function
async function cleanupPaymentProof(proofId) {
    try {
        let proof = null;
        
        if (isMongoConnected()) {
            proof = await PaymentProof.findOne({ id: proofId });
            if (proof) {
                await PaymentProof.findOneAndDelete({ id: proofId });
            }
        } else {
            const proofIndex = fileProofs.findIndex(p => p.id === proofId);
            if (proofIndex !== -1) {
                proof = fileProofs[proofIndex];
                fileProofs.splice(proofIndex, 1);
                saveFileProofs();
            }
        }
        
        // Clean up image file if it exists in uploads directory
        if (proof && proof.screenshot && proof.screenshot.startsWith('/uploads/')) {
            const filename = proof.screenshot.replace('/uploads/', '');
            const filePath = path.join(__dirname, 'uploads', filename);
            
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
                console.log(`🗑️ Deleted image file: ${filename}`);
            }
        }
        
        return true;
    } catch (error) {
        console.error('Error cleaning up payment proof:', error);
        return false;
    }
}

// Middleware
app.use(express.static(__dirname));
app.use('/uploads', express.static('uploads'));
app.use(express.json({ limit: '10mb' }));

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

app.get('/payment-confirm', (req, res) => {
    res.sendFile(path.join(__dirname, 'payment-confirm.html'));
});

// API Routes
app.get('/api/status', (req, res) => {
    res.json({ 
        status: 'OK', 
        db: isMongoConnected() ? 'mongodb' : 'file',
        timestamp: new Date().toISOString()
    });
});

// Get menu items
app.get('/api/menu', (req, res) => {
    const menuItems = [
        { id: 'espresso', name: 'Espresso', price: 3.50, category: 'coffee', image: 'Espresso.jpeg', description: 'Rich and bold espresso shot' },
        { id: 'latte', name: 'Latte', price: 4.50, category: 'coffee', image: 'Latte.jpg', description: 'Smooth espresso with steamed milk' },
        { id: 'cappuccino', name: 'Cappuccino', price: 4.25, category: 'coffee', image: 'Cappuccino.jpeg', description: 'Equal parts espresso, milk, and foam' },
        { id: 'cold_brew', name: 'Cold Brew', price: 4.75, category: 'coffee', image: 'Cold Brew.jpg', description: '16-hour steeped smooth coffee' },
        { id: 'chocolate_croissant', name: 'Chocolate Croissant', price: 3.25, category: 'pastries', image: 'Chocolate Croissant.jpeg', description: 'Flaky croissant with chocolate' },
        { id: 'blueberry_muffin', name: 'Blueberry Muffin', price: 2.95, category: 'pastries', image: 'Blueberry Muffin.jpeg', description: 'Moist muffin with blueberries' },
        { id: 'almond_biscotti', name: 'Almond Biscotti', price: 2.50, category: 'pastries', image: 'Almond Biscotti.jpeg', description: 'Crunchy almond cookies' },
        { id: 'iced_lemon_tea', name: 'Iced Lemon Tea', price: 3.75, category: 'drinks', image: 'Iced Lemon Tea.jpeg', description: 'Refreshing tea with lemon' },
        { id: 'orange_juice', name: 'Orange Juice', price: 3.50, category: 'drinks', image: 'Orange Juice.jpeg', description: 'Freshly squeezed orange juice' },
        { id: 'sparkling_water', name: 'Sparkling Water', price: 2.50, category: 'drinks', image: 'Sparkling Water.jpeg', description: 'Refreshing sparkling water' }
    ];
    
    res.json({
        success: true,
        data: menuItems
    });
});

// Create order - FIXED ENDPOINT
app.post('/api/orders', async (req, res) => {
    try {
        const orderData = req.body;
        console.log('📦 Received order data:', orderData);
        
        const orderId = `ORDER-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
        
        // Process items
        let items = [];
        if (orderData.order_details) {
            items = orderData.order_details;
        } else if (orderData.items) {
            items = orderData.items;
        }
        
        // Calculate totals
        let subtotal = orderData.sub_total || orderData.subtotal || 0;
        let total = orderData.total_amount || orderData.total || 0;
        let tipAmount = orderData.tip_amount || orderData.tipAmount || 0;
        
        if (!subtotal && items.length > 0) {
            subtotal = items.reduce((sum, item) => sum + (item.price * (item.quantity || 1)), 0);
        }
        
        if (!total) {
            total = subtotal + tipAmount;
        }

        const orderPayload = {
            id: orderId,
            orderId: orderId, // Add orderId field
            customerName: orderData.customer_name || orderData.customerName || 'Walk-in Customer',
            customerPhone: orderData.customer_phone || orderData.customerPhone || '',
            tableNumber: orderData.table_number || orderData.tableNumber || '',
            specialInstructions: orderData.special_instructions || orderData.specialInstructions || '',
            items: items,
            subtotal: subtotal,
            tipAmount: tipAmount,
            total: total,
            status: 'received',
            paymentStatus: 'pending',
            createdAt: new Date(),
            updatedAt: new Date(),
            timestamp: new Date()
        };

        console.log('💾 Saving order:', orderPayload);

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
            message: 'Order received successfully!',
            data: orderPayload // Return the order data for frontend
        });
        
    } catch (error) {
        console.error('❌ Order processing error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to process order: ' + error.message
        });
    }
});

// Get all orders - FIXED RESPONSE FORMAT
app.get('/api/orders', async (req, res) => {
    try {
        let orders = [];
        
        if (isMongoConnected()) {
            orders = await Order.find().sort({ createdAt: -1 });
        } else {
            orders = fileOrders.sort((a, b) => new Date(b.createdAt || b.timestamp) - new Date(a.createdAt || a.timestamp));
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

// Get single order - FIXED ENDPOINT
app.get('/api/orders/:orderId', async (req, res) => {
    try {
        const { orderId } = req.params;
        console.log('🔍 Fetching order:', orderId);
        
        let order = null;
        
        if (isMongoConnected()) {
            // Try both id and orderId fields
            order = await Order.findOne({ 
                $or: [
                    { id: orderId },
                    { orderId: orderId }
                ]
            });
        } else {
            order = fileOrders.find(o => o.id === orderId || o.orderId === orderId);
        }
        
        if (!order) {
            console.log('❌ Order not found:', orderId);
            return res.status(404).json({ 
                success: false,
                error: 'Order not found' 
            });
        }
        
        console.log('✅ Order found:', order);
        res.json({
            success: true,
            data: order
        });
    } catch (error) {
        console.error('Error fetching order:', error);
        res.status(500).json({ 
            success: false,
            error: 'Failed to fetch order' 
        });
    }
});

// Update order status - FIXED ENDPOINT
app.put('/api/orders/:orderId/status', async (req, res) => {
    try {
        const { orderId } = req.params;
        const { status } = req.body;
        
        let order = null;
        
        if (isMongoConnected()) {
            order = await Order.findOneAndUpdate(
                { 
                    $or: [
                        { id: orderId },
                        { orderId: orderId }
                    ]
                },
                { 
                    status: status,
                    updatedAt: new Date()
                },
                { new: true }
            );
        } else {
            order = fileOrders.find(o => o.id === orderId || o.orderId === orderId);
            if (order) {
                order.status = status;
                order.updatedAt = new Date().toISOString();
                saveFileOrders();
            }
        }
        
        if (!order) {
            return res.status(404).json({ 
                success: false,
                error: 'Order not found' 
            });
        }
        
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

// Update payment status - FIXED ENDPOINT
app.put('/api/orders/:orderId/payment', async (req, res) => {
    try {
        const { orderId } = req.params;
        const { paymentStatus, paymentMethod, customerPhone } = req.body;
        
        const updateData = { 
            paymentStatus: paymentStatus,
            paymentMethod: paymentMethod,
            updatedAt: new Date()
        };
        
        if (customerPhone) {
            updateData.customerPhone = customerPhone;
        }

        let order = null;
        
        if (isMongoConnected()) {
            order = await Order.findOneAndUpdate(
                { 
                    $or: [
                        { id: orderId },
                        { orderId: orderId }
                    ]
                },
                updateData,
                { new: true }
            );
        } else {
            order = fileOrders.find(o => o.id === orderId || o.orderId === orderId);
            if (order) {
                Object.assign(order, updateData);
                saveFileOrders();
            }
        }
        
        if (!order) {
            return res.status(404).json({ 
                success: false,
                error: 'Order not found' 
            });
        }
        
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

// Delete order - FIXED ENDPOINT
app.delete('/api/orders/:orderId', async (req, res) => {
    try {
        const { orderId } = req.params;
        let deleted = false;
        
        if (isMongoConnected()) {
            const result = await Order.findOneAndDelete({ 
                $or: [
                    { id: orderId },
                    { orderId: orderId }
                ]
            });
            deleted = !!result;
        } else {
            const index = fileOrders.findIndex(o => o.id === orderId || o.orderId === orderId);
            if (index !== -1) {
                fileOrders.splice(index, 1);
                saveFileOrders();
                deleted = true;
            }
        }
        
        if (!deleted) {
            return res.status(404).json({ 
                success: false,
                error: 'Order not found' 
            });
        }
        
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
        let deletedCount = 0;
        
        if (isMongoConnected()) {
            const result = await Order.deleteMany({});
            deletedCount = result.deletedCount;
        } else {
            deletedCount = fileOrders.length;
            fileOrders = [];
            saveFileOrders();
        }
        
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

// Export orders
app.get('/api/orders/export', async (req, res) => {
    try {
        let ordersToExport = [];
        
        if (isMongoConnected()) {
            ordersToExport = await Order.find().sort({ createdAt: -1 });
        } else {
            ordersToExport = fileOrders.sort((a, b) => new Date(b.createdAt || b.timestamp) - new Date(a.createdAt || a.timestamp));
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
        res.status(500).json({ 
            success: false,
            error: 'Failed to export orders' 
        });
    }
});

// Dashboard statistics
app.get('/api/dashboard/stats', async (req, res) => {
    try {
        let orders = [];
        
        if (isMongoConnected()) {
            orders = await Order.find();
        } else {
            orders = fileOrders;
        }
        
        const today = new Date().toDateString();
        const todayOrders = orders.filter(order => {
            const orderDate = new Date(order.createdAt || order.timestamp).toDateString();
            return orderDate === today;
        });
        
        const totalRevenue = orders
            .filter(order => order.paymentStatus === 'paid')
            .reduce((sum, order) => sum + (order.total || 0), 0);
            
        const todayRevenue = todayOrders
            .filter(order => order.paymentStatus === 'paid')
            .reduce((sum, order) => sum + (order.total || 0), 0);

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

// Payment Proof Routes - FIXED ENDPOINTS
app.post('/api/payment-proof', async (req, res) => {
    try {
        const { orderId, customerName, customerPhone, paymentReference, screenshot } = req.body;
        
        if (!screenshot) {
            return res.status(400).json({ 
                success: false,
                error: 'No screenshot provided' 
            });
        }

        const proofId = `PROOF-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
        
        let screenshotPath = screenshot;
        
        // If base64 image is provided and it's large, save as file
        if (screenshot.startsWith('data:image/') && screenshot.length > 100000) {
            try {
                const matches = screenshot.match(/^data:image\/([a-zA-Z]+);base64,/);
                const extension = matches ? matches[1] : 'jpg';
                const filename = `proof-${proofId}.${extension}`;
                const filePath = path.join(__dirname, 'uploads', filename);
                const base64Data = screenshot.replace(/^data:image\/\w+;base64,/, '');
                fs.writeFileSync(filePath, base64Data, 'base64');
                screenshotPath = `/uploads/${filename}`;
                console.log(`💾 Saved screenshot as file: ${filename}`);
            } catch (fileError) {
                console.error('Error saving screenshot as file:', fileError);
            }
        }

        const proofData = {
            id: proofId,
            orderId,
            customerName,
            customerPhone,
            paymentReference,
            screenshot: screenshotPath,
            submittedAt: new Date(),
            status: 'pending'
        };

        // Save to database
        if (isMongoConnected()) {
            const proof = new PaymentProof(proofData);
            await proof.save();
        } else {
            fileProofs.push(proofData);
            saveFileProofs();
        }
        
        console.log(`📸 Payment proof submitted for order ${orderId}`);
        
        res.json({ 
            success: true, 
            proofId: proofId,
            message: 'Payment proof submitted successfully' 
        });
        
    } catch (error) {
        console.error('Payment proof error:', error);
        res.status(500).json({ 
            success: false,
            error: 'Failed to submit payment proof: ' + error.message 
        });
    }
});

// Get all payment proofs
app.get('/api/payment-proofs', async (req, res) => {
    try {
        let proofs = [];
        
        if (isMongoConnected()) {
            proofs = await PaymentProof.find().sort({ submittedAt: -1 });
        } else {
            proofs = fileProofs.sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt));
        }
        
        res.json({
            success: true,
            data: proofs
        });
    } catch (error) {
        console.error('Error fetching payment proofs:', error);
        res.status(500).json({ 
            success: false,
            error: 'Failed to fetch payment proofs' 
        });
    }
});

// Verify payment proof
app.put('/api/payment-proofs/:proofId/verify', async (req, res) => {
    try {
        const { proofId } = req.params;
        const { keepImage = false } = req.body;
        
        let proof = null;
        
        if (isMongoConnected()) {
            proof = await PaymentProof.findOneAndUpdate(
                { id: proofId },
                { 
                    status: 'verified',
                    verifiedAt: new Date()
                },
                { new: true }
            );
        } else {
            proof = fileProofs.find(p => p.id === proofId);
            if (proof) {
                proof.status = 'verified';
                proof.verifiedAt = new Date().toISOString();
                saveFileProofs();
            }
        }
        
        if (!proof) {
            return res.status(404).json({ 
                success: false,
                error: 'Proof not found' 
            });
        }
        
        // Update order payment status
        await updateOrderPaymentStatus(proof.orderId, 'paid', 'qr_verified');
        
        // Clean up image file if not keeping it
        if (!keepImage) {
            setTimeout(async () => {
                await cleanupPaymentProof(proofId);
            }, 3000);
        }
        
        res.json({ 
            success: true, 
            message: 'Payment proof verified',
            data: proof 
        });
    } catch (error) {
        console.error('Error verifying payment proof:', error);
        res.status(500).json({ 
            success: false,
            error: 'Failed to verify payment proof' 
        });
    }
});

// Delete payment proof
app.delete('/api/payment-proofs/:proofId', async (req, res) => {
    try {
        const success = await cleanupPaymentProof(req.params.proofId);
        if (success) {
            res.json({ 
                success: true, 
                message: 'Payment proof deleted' 
            });
        } else {
            res.status(500).json({ 
                success: false,
                error: 'Failed to delete payment proof' 
            });
        }
    } catch (error) {
        console.error('Error deleting payment proof:', error);
        res.status(500).json({ 
            success: false,
            error: 'Failed to delete payment proof' 
        });
    }
});

// Cleanup all verified proofs
app.delete('/api/payment-proofs', async (req, res) => {
    try {
        let verifiedProofs = [];
        
        if (isMongoConnected()) {
            verifiedProofs = await PaymentProof.find({ status: 'verified' });
            await PaymentProof.deleteMany({ status: 'verified' });
        } else {
            verifiedProofs = fileProofs.filter(p => p.status === 'verified');
            fileProofs = fileProofs.filter(p => p.status !== 'verified');
            saveFileProofs();
        }
        
        // Clean up image files
        for (const proof of verifiedProofs) {
            if (proof.screenshot && proof.screenshot.startsWith('/uploads/')) {
                const filename = proof.screenshot.replace('/uploads/', '');
                const filePath = path.join(__dirname, 'uploads', filename);
                
                if (fs.existsSync(filePath)) {
                    fs.unlinkSync(filePath);
                    console.log(`🗑️ Deleted image file: ${filename}`);
                }
            }
        }
        
        res.json({ 
            success: true, 
            message: `Cleaned up ${verifiedProofs.length} verified payment proofs` 
        });
    } catch (error) {
        console.error('Error cleaning up proofs:', error);
        res.status(500).json({ 
            success: false,
            error: 'Failed to clean up payment proofs' 
        });
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
        proofs_count: isMongoConnected() ? 'unknown' : fileProofs.length,
        timestamp: new Date().toISOString()
    });
});

// Cleanup on server start
function cleanupOrphanedFiles() {
    try {
        const files = fs.readdirSync(uploadsDir);
        const proofFiles = files.filter(file => file.startsWith('proof-'));
        console.log(`🔄 Uploads directory ready with ${proofFiles.length} files`);
    } catch (error) {
        console.error('Error cleaning up orphaned files:', error);
    }
}

// Start server
app.listen(PORT, () => {
    console.log(`
🍕 The Daily Grind Server Started!
📍 Port: ${PORT}
🌐 URL: http://localhost:${PORT}
🗄️ Database: ${isMongoConnected() ? 'MongoDB' : 'File-based'}
📸 Payment Proof System: ✅ Active
🖼️ Image Cleanup: ✅ Automatic
✅ Ready to receive orders!
👑 Admin: /admin/orders  
💰 Payment: /payment/:orderId
📷 Proof Upload: /payment-confirm
    `);
    
    cleanupOrphanedFiles();
});

module.exports = app;