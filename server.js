// ----------------------------------------------------
// 1. IMPORT NECESSARY MODULES
// ----------------------------------------------------
const express = require('express');
const app = express();
const path = require('path');
const fs = require('fs');

// --- MODIFICATION 1: Use process.env.PORT for cloud hosting ---
const port = process.env.PORT || 3000;
// --------------------------------------------------------------

// Prefer firebase-admin on the server for secure, trusted access.
let useAdmin = false;
let admin = null;
let db = null;
let authReady = false;

// Global variables provided by the Canvas environment (If you were using them)
const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : {};
const initialAuthToken = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : undefined;

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
    // Example from your original logic to scope data per app
    return `apps/${appId}/${name}`;
}

// Route to serve your main index.html file
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Your existing API route (POST /order) should be here
app.post('/order', async (req, res) => {
    try {
        const orderPayload = req.body;
        // The rest of your existing database logic (Firestore/MySQL)
        // ...
        
        // Ensure you use the correct variable (db, useAdmin, ordersRef) 
        // as defined in your original file for your database operations.

        if (!db) return res.status(503).json({ error: 'Database not configured on server.' });
        
        // Example: Inserting data into Firestore using the configured SDK
        // const ordersRef = useAdmin ? db.collection(getPublicCollectionPath('orders')) : collection(db, getPublicCollectionPath('orders'));
        // const docRef = useAdmin ? await ordersRef.add(orderData) : await addDoc(ordersRef, orderData);

        // res.status(201).json({ message: 'Order successfully placed...' });

        // Add your existing /order logic back here
        res.status(200).json({ message: 'Order received and processed!' }); 

    } catch (error) {
        console.error('API Error (orders):', error);
        res.status(500).json({ error: 'Failed to process order.' });
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