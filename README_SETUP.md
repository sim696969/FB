Setup: Run server locally and enable firebase-admin

1) Install Node.js (Windows)
   - Download and run the LTS installer from https://nodejs.org/en/download/
   - Verify installation in PowerShell:
     node -v
     npm -v

2) Install project dependencies (from project root):
   Open PowerShell in C:\Users\Win11\Desktop\VSC\Javascript and run:

   npm install express firebase-admin firebase @firebase/firestore firebase/auth

   Note: `package.json` already includes `express` but not `firebase-admin` or the firebase client SDK. The command above installs both.

3) Add a service account (recommended for production)
   - In the Firebase Console go to Project Settings > Service Accounts > Generate new private key.
   - Save the downloaded file as `serviceAccountKey.json` in the project root (same folder as `server.js`).
   - You can use the provided `serviceAccountKey.json.example` as a template but DO NOT commit your real service account to source control.

4) Start the server
   In PowerShell run:

   node server.js

   - The server will serve `index.html` at http://localhost:3000
   - If `serviceAccountKey.json` is present the server will use `firebase-admin` and connect to Firestore.
   - If no service account is present but you provided `__firebase_config` environment variables, the server will attempt to use the Firebase client SDK (not recommended for production).

5) Testing the app
   - Open http://localhost:3000 in a browser.
   - If `index.html` still shows the "Database Connection Warning", click the red "Paste Firebase Config" button and paste your web app config for a quick client-side test.
   - For long-term persistence, use the `serviceAccountKey.json` approach in step 3.

Security reminder
- Never commit `serviceAccountKey.json` to a public repo. Add it to `.gitignore`.

Troubleshooting
- If `node` command is missing, make sure Node was installed and the installer added it to PATH. You may need to restart your terminal.
- If Firestore writes fail with `permission-denied`, check your Firestore rules to allow server writes or use the admin SDK.

If you want, I can add a small npm script to start the server and update `package.json` for convenience.
