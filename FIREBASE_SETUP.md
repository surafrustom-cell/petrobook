# PetroBook — Firebase Setup Guide

Complete this guide **before** running any deployment commands.

---

## Step 1 — Create Firebase Project

1. Go to **https://console.firebase.google.com**
2. Click **Add project**
3. Project name: `petrobook-prod` (or your preferred name)
4. **Disable** Google Analytics (not needed)
5. Click **Create project**
6. Wait for provisioning to finish → Click **Continue**

---

## Step 2 — Enable Firestore Database

1. In left menu: **Build → Firestore Database**
2. Click **Create database**
3. Select **Production mode**
4. Location: **asia-south1** *(closest to Saudi Arabia — Middle East)*
5. Click **Enable**
6. Wait for database to initialise

---

## Step 3 — Enable Authentication

1. In left menu: **Build → Authentication**
2. Click **Get started**
3. Click **Email/Password**
4. Toggle **Enable** → ON
5. Click **Save**

---

## Step 4 — Get Web App Credentials

1. Click the **⚙️ gear icon** → **Project settings**
2. Scroll to **Your apps** section
3. Click the **`</>`** (Web) icon
4. App nickname: `petrobook-web`
5. **Do NOT** check "Firebase Hosting" here
6. Click **Register app**
7. You will see a block like this:

```javascript
const firebaseConfig = {
  apiKey: "AIzaSy...",
  authDomain: "petrobook-prod.firebaseapp.com",
  projectId: "petrobook-prod",
  storageBucket: "petrobook-prod.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abc123def456"
};
```

8. Copy these **6 values**

---

## Step 5 — Paste Credentials into the App

Open `index_standalone.html` in a text editor.

Find this block (around line 11464):

```javascript
var FIREBASE_CONFIG = {
  apiKey:            'YOUR_API_KEY',
  authDomain:        'YOUR_PROJECT_ID.firebaseapp.com',
  projectId:         'YOUR_PROJECT_ID',
  storageBucket:     'YOUR_PROJECT_ID.appspot.com',
  messagingSenderId: 'YOUR_SENDER_ID',
  appId:             'YOUR_APP_ID',
};
```

Replace with your real values:

```javascript
var FIREBASE_CONFIG = {
  apiKey:            'AIzaSy...',
  authDomain:        'petrobook-prod.firebaseapp.com',
  projectId:         'petrobook-prod',
  storageBucket:     'petrobook-prod.appspot.com',
  messagingSenderId: '123456789',
  appId:             '1:123456789:web:abc123def456',
};
```

---

## Step 6 — Update .firebaserc

Open `.firebaserc` and replace `YOUR_PROJECT_ID` with your real project ID:

```json
{
  "projects": {
    "default": "petrobook-prod"
  }
}
```

---

## Step 7 — Enable PITR Backup (Recommended)

1. In Firebase Console → **Firestore Database**
2. Click the **Backups** tab
3. Click **Configure PITR**
4. Enable it → **Save**

This gives you 7-day point-in-time recovery for all financial data.

---

## Step 8 — Set Firebase Auth Custom Claims (Required)

The Firestore security rules require custom claims on every user's token:
- `accountId` — the Firebase UID of the super_owner
- `role` — `super_owner`, `manager`, or `owner`
- `pumpId` — the assigned pump ID (managers only), or `null`

**You must set these claims before running the migration.**

### Install Firebase Admin SDK (one-time)

```bash
mkdir petrobook-admin && cd petrobook-admin
npm init -y
npm install firebase-admin
```

### Download Service Account Key

1. Firebase Console → **⚙️ Project Settings → Service accounts**
2. Click **Generate new private key**
3. Save file as `serviceAccount.json` in the `petrobook-admin/` folder

> ⚠️  Never commit `serviceAccount.json` to GitHub

### Create set-claims.js

```javascript
const admin = require('firebase-admin');
admin.initializeApp({
  credential: admin.credential.cert('./serviceAccount.json')
});

async function setClaims() {
  // Replace with your super_owner Firebase Auth UID
  // Find it: Firebase Console → Authentication → Users → copy UID column
  const superOwnerUID = 'PASTE_SUPER_OWNER_UID_HERE';

  await admin.auth().setCustomUserClaims(superOwnerUID, {
    accountId: superOwnerUID,
    role:      'super_owner',
    pumpId:    null
  });
  console.log('Super owner claims set.');

  // For each manager, repeat:
  // const managerUID = 'PASTE_MANAGER_UID_HERE';
  // await admin.auth().setCustomUserClaims(managerUID, {
  //   accountId: superOwnerUID,   // same accountId as super_owner
  //   role:      'manager',
  //   pumpId:    'p1'             // their assigned pump
  // });
  // console.log('Manager claims set.');

  process.exit(0);
}

setClaims().catch(console.error);
```

### Run it

```bash
node set-claims.js
```

Claims take effect on the **next login** (token refresh). If the user is already logged in, they must log out and back in.

---

## Step 9 — Verify Setup

After deploying (see DEPLOYMENT.md), open the app and check the browser console:

```
[PB_FirebaseAuth] Ready. Project: petrobook-prod
[PetroBook] Firebase sync resumed from persistent flag.   ← after migration
```

In the Settings panel, the **Cloud Sync** card should show:
- SDK: ✅ Loaded
- Config: ✅ Configured  
- Firestore: ✅ Ready
- Auth: ✅ Ready
