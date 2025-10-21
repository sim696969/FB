const express = require('express');
const path = require('path');
const app = express();
const port = 3000;

// Serve static files
app.use(express.static('public'));
app.use(express.static(__dirname));
app.use(express.json());

// Demo menu data
const demoMenu = [
    { id: 'item_c1', name: 'Espresso', description: 'Strong double shot of our signature blend.', price: 3.50, category: 'Coffee' },
    { id: 'item_c2', name: 'Latte', description: 'Espresso with steamed milk and a thin layer of foam.', price: 5.00, category: 'Coffee' },
    { id: 'item_p1', name: 'Chocolate Croissant', description: 'Flaky pastry filled with dark chocolate.', price: 3.80, category: 'Pastries' },
    { id: 'item_d1', name: 'Iced Lemon Tea', description: 'Refreshing black tea with a hint of lemon.', price: 4.00, category: 'Drinks' }
];

// Routes
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/api/menu', (req, res) => {
    res.json(demoMenu);
});

app.post('/api/orders', (req, res) => {
    const order = req.body;
    console.log('Order received:', order);
    
    // Simulate order processing
    const orderId = 'DEMO-' + Date.now();
    
    res.json({
        message: 'Order placed successfully (DEMO MODE)',
        order_id: orderId,
        customer_name: order.customer_name
    });
});

app.listen(port, () => {
    console.log(`🍕 F&B Kiosk running at http://localhost:${port}`);
    console.log('📝 Running in DEMO MODE - no database required');
});