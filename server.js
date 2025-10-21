const express = require('express');
const cors = require('cors');
const path = require('path');
const { Client } = require('pg');

const app = express();
const PORT = process.env.PORT || 3000;

// Database connection
const client = new Client({
    connectionString: process.env.SUPABASE_CONNECTION_STRING || 'postgresql://postgres:@1234Abcd@db.wmwvgxcwasqestkgqxxs.supabase.co:5432/postgres',
    ssl: { rejectUnauthorized: false }
});

// Connect to database
client.connect().then(() => {
    console.log('✅ Connected to Supabase PostgreSQL database');
}).catch(err => {
    console.error('❌ Database connection failed:', err);
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('.')); // Serve all files in current directory

// Serve the main page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// API Routes

// Get all orders (for admin viewing)
app.get('/api/orders', async (req, res) => {
    try {
        const result = await client.query(`
            SELECT * FROM orders 
            ORDER BY created_at DESC
        `);
        
        res.json({ 
            success: true, 
            orders: result.rows,
            count: result.rowCount
        });
    } catch (error) {
        console.error('Error reading orders:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Cannot read orders from database' 
        });
    }
});

// Submit new order
app.post('/api/orders', async (req, res) => {
    try {
        const orderData = req.body;
        
        // Generate order ID
        const orderId = 'ORD-' + Date.now();
        
        console.log('📦 New order received:', orderData);
        
        // Save to PostgreSQL database
        const query = `
            INSERT INTO orders (order_id, items, subtotal, tip_amount, total, status)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING id, order_id, created_at
        `;
        
        const values = [
            orderId,
            JSON.stringify(orderData.items),
            parseFloat(orderData.subtotal),
            parseFloat(orderData.tipAmount),
            parseFloat(orderData.total),
            'received'
        ];

        const result = await client.query(query, values);
        const savedOrder = result.rows[0];
        
        console.log('💾 Order saved to database with ID:', savedOrder.id);
        
        res.json({ 
            success: true, 
            orderId: savedOrder.order_id,
            message: 'Order received successfully!',
            timestamp: savedOrder.created_at
        });
        
    } catch (error) {
        console.error('Error processing order:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Failed to process order in database' 
        });
    }
});

// Get single order by ID
app.get('/api/orders/:orderId', async (req, res) => {
    try {
        const { orderId } = req.params;
        
        const result = await client.query(
            'SELECT * FROM orders WHERE order_id = $1',
            [orderId]
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Order not found'
            });
        }
        
        res.json({
            success: true,
            order: result.rows[0]
        });
        
    } catch (error) {
        console.error('Error fetching order:', error);
        res.status(500).json({
            success: false,
            error: 'Cannot fetch order'
        });
    }
});

// Update order status
app.put('/api/orders/:orderId/status', async (req, res) => {
    try {
        const { orderId } = req.params;
        const { status } = req.body;
        
        const result = await client.query(
            'UPDATE orders SET status = $1, updated_at = NOW() WHERE order_id = $2 RETURNING *',
            [status, orderId]
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Order not found'
            });
        }
        
        res.json({
            success: true,
            order: result.rows[0],
            message: 'Order status updated'
        });
        
    } catch (error) {
        console.error('Error updating order:', error);
        res.status(500).json({
            success: false,
            error: 'Cannot update order'
        });
    }
});

// Admin page to view all orders
app.get('/admin', async (req, res) => {
    try {
        const result = await client.query(`
            SELECT * FROM orders 
            ORDER BY created_at DESC
        `);
        
        const orders = result.rows;
        
        let html = `
        <!DOCTYPE html>
        <html>
        <head>
            <title>Order Admin - Coffee Shop</title>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <style>
                * {
                    margin: 0;
                    padding: 0;
                    box-sizing: border-box;
                }
                
                body {
                    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                    line-height: 1.6;
                    color: #333;
                    background-color: #f5f5f5;
                    padding: 20px;
                    max-width: 1200px;
                    margin: 0 auto;
                }
                
                .header {
                    background: white;
                    padding: 30px;
                    border-radius: 10px;
                    box-shadow: 0 2px 10px rgba(0,0,0,0.1);
                    margin-bottom: 30px;
                    text-align: center;
                }
                
                h1 {
                    color: #5d4037;
                    margin-bottom: 10px;
                    font-size: 2.5rem;
                }
                
                .stats {
                    display: flex;
                    justify-content: center;
                    gap: 20px;
                    margin-top: 20px;
                    flex-wrap: wrap;
                }
                
                .stat-card {
                    background: #8d6e63;
                    color: white;
                    padding: 15px 25px;
                    border-radius: 8px;
                    text-align: center;
                    min-width: 150px;
                }
                
                .stat-number {
                    font-size: 2rem;
                    font-weight: bold;
                    display: block;
                }
                
                .orders-grid {
                    display: grid;
                    gap: 20px;
                }
                
                .order-card {
                    background: white;
                    padding: 25px;
                    border-radius: 10px;
                    box-shadow: 0 2px 10px rgba(0,0,0,0.1);
                    border-left: 5px solid #8d6e63;
                }
                
                .order-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: flex-start;
                    margin-bottom: 15px;
                    flex-wrap: wrap;
                    gap: 10px;
                }
                
                .order-id {
                    font-weight: bold;
                    color: #5d4037;
                    font-size: 1.2rem;
                }
                
                .order-time {
                    color: #666;
                    font-size: 0.9rem;
                }
                
                .order-status {
                    background: #e8f5e9;
                    color: #2e7d32;
                    padding: 5px 12px;
                    border-radius: 20px;
                    font-size: 0.8rem;
                    font-weight: bold;
                }
                
                .order-items {
                    margin: 15px 0;
                }
                
                .order-item {
                    display: flex;
                    justify-content: space-between;
                    padding: 8px 0;
                    border-bottom: 1px solid #f0f0f0;
                }
                
                .order-item:last-child {
                    border-bottom: none;
                }
                
                .item-name {
                    font-weight: 500;
                }
                
                .item-details {
                    color: #666;
                    font-size: 0.9rem;
                }
                
                .order-totals {
                    background: #f9f9f9;
                    padding: 15px;
                    border-radius: 8px;
                    margin-top: 15px;
                }
                
                .total-line {
                    display: flex;
                    justify-content: space-between;
                    margin-bottom: 8px;
                }
                
                .grand-total {
                    font-weight: bold;
                    font-size: 1.1rem;
                    color: #5d4037;
                    border-top: 2px solid #e0e0e0;
                    padding-top: 10px;
                    margin-top: 10px;
                }
                
                .no-orders {
                    text-align: center;
                    padding: 60px 20px;
                    color: #666;
                    font-size: 1.1rem;
                }
                
                .no-orders h2 {
                    color: #999;
                    margin-bottom: 10px;
                }
                
                @media (max-width: 768px) {
                    .header {
                        padding: 20px;
                    }
                    
                    h1 {
                        font-size: 2rem;
                    }
                    
                    .stat-card {
                        min-width: 120px;
                        padding: 12px 20px;
                    }
                    
                    .order-header {
                        flex-direction: column;
                        align-items: flex-start;
                    }
                }
            </style>
        </head>
        <body>
            <div class="header">
                <h1>☕ Coffee Shop Orders</h1>
                <p>Real-time order management system</p>
                <div class="stats">
                    <div class="stat-card">
                        <span class="stat-number">${orders.length}</span>
                        <span>Total Orders</span>
                    </div>
                    <div class="stat-card">
                        <span class="stat-number">$${orders.reduce((sum, order) => sum + parseFloat(order.total), 0).toFixed(2)}</span>
                        <span>Total Revenue</span>
                    </div>
                </div>
            </div>
        `;
        
        if (orders.length === 0) {
            html += `
            <div class="no-orders">
                <h2>No Orders Yet</h2>
                <p>Waiting for customers to place orders...</p>
            </div>
            `;
        } else {
            html += `<div class="orders-grid">`;
            
            orders.forEach((order, index) => {
                const orderDate = new Date(order.created_at).toLocaleString();
                const items = typeof order.items === 'string' ? JSON.parse(order.items) : order.items;
                
                html += `
                <div class="order-card">
                    <div class="order-header">
                        <div>
                            <div class="order-id">Order #${index + 1}: ${order.order_id}</div>
                            <div class="order-time">${orderDate}</div>
                        </div>
                        <div class="order-status">${order.status.toUpperCase()}</div>
                    </div>
                    
                    <div class="order-items">
                        ${items.map(item => `
                            <div class="order-item">
                                <div>
                                    <div class="item-name">${item.name}</div>
                                    <div class="item-details">$${item.price} × ${item.quantity}</div>
                                </div>
                                <div class="item-total">$${(item.price * item.quantity).toFixed(2)}</div>
                            </div>
                        `).join('')}
                    </div>
                    
                    <div class="order-totals">
                        <div class="total-line">
                            <span>Subtotal:</span>
                            <span>$${parseFloat(order.subtotal).toFixed(2)}</span>
                        </div>
                        <div class="total-line">
                            <span>Tip:</span>
                            <span>$${parseFloat(order.tip_amount).toFixed(2)}</span>
                        </div>
                        <div class="total-line grand-total">
                            <span>Total:</span>
                            <span>$${parseFloat(order.total).toFixed(2)}</span>
                        </div>
                    </div>
                </div>
                `;
            });
            
            html += `</div>`;
        }
        
        html += `
            </body>
            </html>
        `;
        
        res.send(html);
    } catch (error) {
        console.error('Error loading admin page:', error);
        res.status(500).send(`
            <html>
            <body style="font-family: Arial, sans-serif; padding: 20px;">
                <h1>Error Loading Admin Page</h1>
                <p>${error.message}</p>
            </body>
            </html>
        `);
    }
});

// Health check endpoint
app.get('/health', async (req, res) => {
    try {
        // Test database connection
        await client.query('SELECT 1');
        
        res.json({ 
            status: 'OK', 
            message: 'Server and database are running', 
            timestamp: new Date().toISOString(),
            database: 'Connected ✅'
        });
    } catch (error) {
        res.status(500).json({
            status: 'ERROR',
            message: 'Server running but database connection failed',
            timestamp: new Date().toISOString(),
            database: 'Disconnected ❌',
            error: error.message
        });
    }
});

// Debug endpoint to see orders
app.get('/debug-orders', async (req, res) => {
    try {
        const result = await client.query('SELECT * FROM orders ORDER BY created_at DESC');
        
        console.log('All orders in database:', result.rows);
        
        res.json({ 
            success: true, 
            orders: result.rows,
            count: result.rowCount
        });
    } catch (error) {
        console.error('Error reading orders:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Cannot read orders from database' 
        });
    }
});

// Test endpoint
app.get('/test', (req, res) => {
    res.json({ 
        message: 'Server is working!',
        timestamp: new Date().toISOString(),
        port: PORT,
        database: process.env.SUPABASE_CONNECTION_STRING ? 'Configured ✅' : 'Not configured ❌'
    });
});

// Error handling for database connection
process.on('SIGINT', async () => {
    console.log('\n🛑 Shutting down server...');
    await client.end();
    process.exit(0);
});

// START SERVER - THIS IS CRITICAL!
app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📍 Main site: http://localhost:${PORT}`);
    console.log(`📊 Admin panel: http://localhost:${PORT}/admin`);
    console.log(`🔍 Debug orders: http://localhost:${PORT}/debug-orders`);
    console.log(`❤️ Health check: http://localhost:${PORT}/health`);
    console.log(`💾 Database: Supabase PostgreSQL`);
    console.log(`✅ Server started successfully!`);
});