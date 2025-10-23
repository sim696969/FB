// server.js - COMPLETE VERSION WITH PAYMENT PROOF SYSTEM AND IMAGE CLEANUP
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
    customerPhone: String,
    timestamp: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

const Order = mongoose.model('Order', orderSchema);

// Payment Proof Schema
const paymentProofSchema = new mongoose.Schema({
    id: { type: String, required: true, unique: true },
    orderId: { type: String, required: true },
    customerName: { type: String, required: true },
    customerPhone: { type: String, required: true },
    paymentReference: String,
    screenshot: { type: String, required: true }, // Base64 image or file path
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
            await Order.findOneAndUpdate({ id: orderId }, updateData);
        } else {
            const order = fileOrders.find(o => o.id === orderId);
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
                // Delete from database
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
app.use('/uploads', express.static('uploads')); // Serve uploaded files
app.use(express.json({ limit: '10mb' })); // Increase limit for base64 images

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

// Create order
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
            tipAmount: orderData.tip_amount || 0,
            paymentStatus: 'pending'
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
        const { paymentStatus, paymentMethod, customerName, customerPhone } = req.body;
        
        if (isMongoConnected()) {
            const updateData = { 
                paymentStatus: paymentStatus,
                paymentMethod: paymentMethod,
                updatedAt: new Date()
            };
            if (customerName) updateData.customerName = customerName;
            if (customerPhone) updateData.customerPhone = customerPhone;
            
            const order = await Order.findOneAndUpdate(
                { id: req.params.id },
                updateData,
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
            if (customerName) order.customerName = customerName;
            if (customerPhone) order.customerPhone = customerPhone;
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

// Payment Proof Routes
app.post('/api/payment-proof', async (req, res) => {
    try {
        const { orderId, customerName, customerPhone, paymentReference, screenshot } = req.body;
        
        if (!screenshot) {
            return res.status(400).json({ error: 'No screenshot provided' });
        }

        const proofId = `PROOF-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
        
        let screenshotPath = screenshot;
        
        // If base64 image is provided and it's large, save as file
        if (screenshot.startsWith('data:image/') && screenshot.length > 100000) {
            try {
                // Extract file extension from base64
                const matches = screenshot.match(/^data:image\/([a-zA-Z]+);base64,/);
                const extension = matches ? matches[1] : 'jpg';
                
                // Generate unique filename
                const filename = `proof-${proofId}.${extension}`;
                const filePath = path.join(__dirname, 'uploads', filename);
                
                // Convert base64 to file
                const base64Data = screenshot.replace(/^data:image\/\w+;base64,/, '');
                fs.writeFileSync(filePath, base64Data, 'base64');
                
                screenshotPath = `/uploads/${filename}`;
                console.log(`💾 Saved screenshot as file: ${filename}`);
            } catch (fileError) {
                console.error('Error saving screenshot as file:', fileError);
                // Continue with base64 if file save fails
            }
        }

        const proofData = {
            id: proofId,
            orderId,
            customerName,
            customerPhone,
            paymentReference,
            screenshot: screenshotPath,
            submittedAt: new Date().toISOString(),
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
        console.log(`👤 Customer: ${customerName} (${customerPhone})`);
        
        res.json({ 
            success: true, 
            proofId: proofId,
            message: 'Payment proof submitted successfully' 
        });
        
    } catch (error) {
        console.error('Payment proof error:', error);
        res.status(500).json({ error: 'Failed to submit payment proof: ' + error.message });
    }
});

// Get all payment proofs
app.get('/api/payment-proofs', async (req, res) => {
    try {
        if (isMongoConnected()) {
            const proofs = await PaymentProof.find().sort({ submittedAt: -1 });
            res.json(proofs);
        } else {
            const sortedProofs = fileProofs.sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt));
            res.json(sortedProofs);
        }
    } catch (error) {
        console.error('Error fetching payment proofs:', error);
        res.status(500).json({ error: 'Failed to fetch payment proofs' });
    }
});

// Verify payment proof (with automatic image cleanup)
app.put('/api/payment-proofs/:proofId/verify', async (req, res) => {
    try {
        const { proofId } = req.params;
        const { keepImage = false } = req.body; // Option to keep image for records
        
        if (isMongoConnected()) {
            const proof = await PaymentProof.findOneAndUpdate(
                { id: proofId },
                { 
                    status: 'verified',
                    verifiedAt: new Date()
                },
                { new: true }
            );
            if (!proof) return res.status(404).json({ error: 'Proof not found' });
            
            // Update order payment status
            await updateOrderPaymentStatus(proof.orderId, 'paid', 'qr_verified');
            
            // Clean up image file if not keeping it
            if (!keepImage) {
                setTimeout(async () => {
                    await cleanupPaymentProof(proofId);
                }, 3000); // Cleanup after 3 seconds
            }
            
            res.json({ success: true, proof });
        } else {
            const proof = fileProofs.find(p => p.id === proofId);
            if (!proof) return res.status(404).json({ error: 'Proof not found' });
            
            proof.status = 'verified';
            proof.verifiedAt = new Date().toISOString();
            saveFileProofs();
            
            // Update order payment status
            await updateOrderPaymentStatus(proof.orderId, 'paid', 'qr_verified');
            
            // Clean up image file if not keeping it
            if (!keepImage) {
                setTimeout(async () => {
                    await cleanupPaymentProof(proofId);
                }, 3000);
            }
            
            res.json({ success: true, proof });
        }
    } catch (error) {
        console.error('Error verifying payment proof:', error);
        res.status(500).json({ error: 'Failed to verify payment proof' });
    }
});

// Delete payment proof (manual cleanup)
app.delete('/api/payment-proofs/:proofId', async (req, res) => {
    try {
        const success = await cleanupPaymentProof(req.params.proofId);
        if (success) {
            res.json({ success: true, message: 'Payment proof deleted' });
        } else {
            res.status(500).json({ error: 'Failed to delete payment proof' });
        }
    } catch (error) {
        console.error('Error deleting payment proof:', error);
        res.status(500).json({ error: 'Failed to delete payment proof' });
    }
});

// Cleanup all verified proofs
app.delete('/api/payment-proofs', async (req, res) => {
    try {
        let verifiedProofs = [];
        
        if (isMongoConnected()) {
            verifiedProofs = await PaymentProof.find({ status: 'verified' });
            // Delete from database
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
        res.status(500).json({ error: 'Failed to clean up payment proofs' });
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

// Cleanup on server start (remove any orphaned files)
function cleanupOrphanedFiles() {
    try {
        const files = fs.readdirSync(uploadsDir);
        const proofFiles = files.filter(file => file.startsWith('proof-'));
        
        let existingProofs = [];
        if (isMongoConnected()) {
            // Would need to query all proofs, but for simplicity we'll just log
            console.log(`📁 Found ${proofFiles.length} proof files in uploads directory`);
        } else {
            existingProofs = fileProofs.map(p => {
                if (p.screenshot && p.screenshot.startsWith('/uploads/')) {
                    return p.screenshot.replace('/uploads/', '');
                }
                return null;
            }).filter(Boolean);
        }
        
        // In a production system, you'd compare files with database records
        // and delete orphaned files. For now, we'll just log.
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
    
    // Cleanup orphaned files on startup
    cleanupOrphanedFiles();
});

module.exports = app;