// ----------------------------------------------------
// 1. IMPORT NECESSARY MODULES
// ----------------------------------------------------
const express = require('express');
const app = express();
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

// --- MODIFICATION 1: Use process.env.PORT for cloud hosting ---
const port = process.env.PORT || 3000;
// --------------------------------------------------------------

// Prefer firebase-admin on the server for secure, trusted access.
let useAdmin = false;
let admin = null;
let db = null;
let authReady = false;

// --- SQLite (file-based) fallback for free public hosting ---
// --- Lightweight JSON file fallback for free public hosting (no native build tools required) ---
const jsonDbPath = path.join(__dirname, 'orders.json');
try {
    if (!fs.existsSync(jsonDbPath)) {
        fs.writeFileSync(jsonDbPath, JSON.stringify({ orders: [] }, null, 2));
    }
    console.log('✅ JSON orders storage initialized at', jsonDbPath);
} catch (e) {
    console.warn('Could not initialize JSON orders storage:', e.message);
}

function readOrdersJson() {
    try {
        const raw = fs.readFileSync(jsonDbPath, 'utf8');
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed.orders) ? parsed.orders : [];
    } catch (e) {
        return [];
    }
}

function writeOrdersJson(orders) {
    fs.writeFileSync(jsonDbPath, JSON.stringify({ orders }, null, 2));
}

// Global variables provided by the Canvas environment (If you were using them)
const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : {};
const initialAuthToken = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : undefined;

// --- Supabase client (optional) for production persistence ---
let supabase = null;
try {
    const SUPABASE_URL = process.env.SUPABASE_URL;
    const SUPABASE_KEY = process.env.SUPABASE_KEY; // service_role key recommended for server
    if (SUPABASE_URL && SUPABASE_KEY) {
        const { createClient } = require('@supabase/supabase-js');
        supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
        console.log('✅ Supabase client initialized from environment variables');
    }
} catch (e) {
    console.warn('Supabase client initialization failed:', e.message);
}

// --- MODIFICATION 2: Use Environment Variable for Service Account Key ---
try {
    // 1. CHECK ENVIRONMENT VARIABLE (PRIMARY METHOD FOR DEPLOYMENT)
    const serviceAccountJson = process.env.SERVICE_ACCOUNT_KEY;

    if (serviceAccountJson) {
        // Parse the JSON string from the secure environment variable
        const serviceAccount = JSON.parse(serviceAccountJson); 
        admin = require('firebase-admin');
        admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
        db = admin.firestore();
        useAdmin = true;
        authReady = true;
        console.log('✅ Using firebase-admin via SERVICE_ACCOUNT_KEY env var');
    } 
    // 2. FALLBACK TO LOCAL FILE (EXISTING LOGIC FOR LOCAL DEVELOPMENT)
    else if (fs.existsSync(path.join(__dirname, 'serviceAccountKey.json'))) {
        admin = require('firebase-admin');
        const serviceAccount = require(path.join(__dirname, 'serviceAccountKey.json'));
        admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
        db = admin.firestore();
        useAdmin = true;
        authReady = true;
        console.log('✅ Using firebase-admin with local serviceAccountKey.json');
    }
} catch (e) {
    console.warn('⚠️ firebase-admin initialization failed (Service Account Check):', e.message);
} 
// ----------------------------------------------------------------------


// If firebase-admin didn't initialize, try client SDK fallback (if you use it)
if (!useAdmin && Object.keys(firebaseConfig).length > 0) {
    // THIS BLOCK REMAINS UNMODIFIED (from your original file)
    // Add your existing Firebase Client SDK initialization logic here if it was present
    // ...
}


// ----------------------------------------------------
// 2. MIDDLEWARE CONFIGURATION
// ----------------------------------------------------
// You should keep your existing middleware code here (e.g., app.use(express.json());)
app.use(express.json());
app.use(express.urlencoded({ extended: true }));


// ----------------------------------------------------
// 3. STATIC FILE SERVING
// ----------------------------------------------------
// This serves your index.html and any other static assets (CSS, JS, images)
app.use(express.static(path.join(__dirname, '')));


// ----------------------------------------------------
// 4. API ROUTES (Keep your existing routes here)
// ----------------------------------------------------

function getPublicCollectionPath(name) {
    // Match the client collection path used by index.html
    return `artifacts/${appId}/public/data/${name}`;
}

// Route to serve your main index.html file
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Your existing API route (POST /order) should be here
app.post('/api/orders', async (req, res) => {
    try {
        const { customer_name, total_amount, order_details, sub_total, tip_amount } = req.body;

        if (!customer_name || typeof total_amount !== 'number' || !Array.isArray(order_details) || order_details.length === 0) {
            return res.status(400).json({ error: 'Order must include customer_name, numeric total_amount, and a non-empty order_details array.' });
        }

        const orderData = {
            customer_name,
            sub_total: typeof sub_total === 'number' ? sub_total : 0,
            tip_amount: typeof tip_amount === 'number' ? tip_amount : 0,
            total_amount,
            order_details,
            order_date: new Date().toISOString(),
            status: 'pending'
        };

        // If sqlite is available, persist to orders.db
        if (sqliteDb) {
            const id = crypto.randomUUID();
            const stmt = sqliteDb.prepare(`INSERT INTO orders (id, customer_name, sub_total, tip_amount, total_amount, order_details, order_date, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`);
            stmt.run(id, orderData.customer_name, orderData.sub_total, orderData.tip_amount, orderData.total_amount, JSON.stringify(orderData.order_details), orderData.order_date, orderData.status);
            return res.status(201).json({ message: 'Order saved to local SQLite DB', order_id: id });
        }

        // Otherwise, attempt to use firebase-admin / firestore
        if (useAdmin && db) {
            const ordersRef = db.collection(getPublicCollectionPath('orders'));
            const docRef = await ordersRef.add(orderData);
            return res.status(201).json({ message: 'Order saved to Firestore (admin)', order_id: docRef.id });
        }

        return res.status(503).json({ error: 'No persistent database configured on server.' });

    } catch (error) {
        console.error('API Error (orders):', error);
        res.status(500).json({ error: 'Failed to process order.' });
    }
});

    app.get('/api/menu', async (req, res) => {
        try {
            if (sqliteDb) {
                // For simple demo, store menu items in sqlite as well (if any). We'll return an empty list for now.
                const rows = sqliteDb.prepare('SELECT id, customer_name FROM orders LIMIT 0').all();
                res.json([]);
                return;
            }

            if (!db) return res.status(503).json({ error: 'Database not configured on server. Provide serviceAccountKey.json for firebase-admin or valid client config.' });
            const menuRef = useAdmin ? db.collection(getPublicCollectionPath('menu_items')) : collection(db, getPublicCollectionPath('menu_items'));
            const q = query(menuRef);
            const snapshot = await getDocs(q);

            const menuItems = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));

            res.json(menuItems);
        } catch (error) {
            console.error('API Error (menu):', error);
            res.status(500).json({ error: 'Failed to retrieve menu.' });
        }
    });

// Status endpoint so client can detect server-side DB availability
app.get('/api/status', (req, res) => {
    try {
        if (fs.existsSync(jsonDbPath)) {
            return res.json({ db: 'sqlite' });
        }
        if (useAdmin) {
            return res.json({ db: 'firestore' });
        }
        return res.json({ db: 'none' });
    } catch (e) {
        return res.json({ db: 'unknown', error: e.message });
    }
});

// ----------------------------------------------------
// 5. START THE SERVER
// ----------------------------------------------------

app.listen(port, () => {
    console.log(`🚀 F&B Server is ready and listening on port ${port}`);
    console.log('Database:', useAdmin ? 'Firestore (firebase-admin)' : (db ? 'Firestore (client SDK fallback)' : 'NOT CONFIGURED'));
    if (!useAdmin && !db) {
        console.warn('Server database not configured. To enable persistent storage, set the SERVICE_ACCOUNT_KEY environment variable on your host.');
    }
});