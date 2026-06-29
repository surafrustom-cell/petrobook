# PetroBook — Final Deployment Checklist

> Print this page. Check every box in order. Do not skip steps.
> The checklist is split into 5 stages. Each stage must be fully complete before starting the next.

---

## STAGE 1 — LOCAL FILE PREPARATION

### 1A — Get your Firebase credentials
- [ ] Created Firebase project at https://console.firebase.google.com
- [ ] Enabled Firestore Database (Production mode, region **asia-south1**)
- [ ] Enabled Authentication → Email/Password
- [ ] Registered a Web App inside the project (gave it any nickname)
- [ ] Copied the `firebaseConfig` block shown after registering the app
  ```
  apiKey: "..."
  authDomain: "..."
  projectId: "..."
  storageBucket: "..."
  messagingSenderId: "..."
  appId: "..."
  ```

### 1B — Edit index_standalone.html
- [ ] Opened `index_standalone.html` in a text editor
- [ ] Found the block starting with `var FIREBASE_CONFIG = {` (search: `YOUR_API_KEY`)
- [ ] Replaced `YOUR_API_KEY` with your real `apiKey` value
- [ ] Replaced `YOUR_PROJECT_ID.firebaseapp.com` with your real `authDomain`
- [ ] Replaced `YOUR_PROJECT_ID` (projectId field) with your real project ID
- [ ] Replaced `YOUR_PROJECT_ID.appspot.com` with your real `storageBucket`
- [ ] Replaced `YOUR_SENDER_ID` with your real `messagingSenderId`
- [ ] Replaced `YOUR_APP_ID` with your real `appId`
- [ ] Saved the file
- [ ] **Verify**: searched for `YOUR_API_KEY` again — must find **zero** results

### 1C — Edit .firebaserc
- [ ] Opened `.firebaserc` in a text editor
- [ ] Replaced `YOUR_PROJECT_ID` with your real Firebase project ID (e.g. `petrobook-prod`)
- [ ] Saved the file
- [ ] **Verify**: the file now looks like `"default": "petrobook-prod"` (your real ID)

---

## STAGE 2 — FIREBASE CLI DEPLOYMENT

### 2A — Install tools (one-time)
- [ ] Node.js installed — check with: `node --version` (need v18 or higher)
- [ ] Firebase CLI installed: `npm install -g firebase-tools`
- [ ] Firebase CLI works: `firebase --version` (shows a version number)

### 2B — Login and link project
- [ ] Logged in: `firebase login` (browser opens, sign in with Google account used for Firebase)
- [ ] Terminal shows: `Success! Logged in as your@email.com`
- [ ] Navigated terminal to the `READY_FOR_GITHUB` folder (`cd /path/to/READY_FOR_GITHUB`)
- [ ] Linked project: `firebase use YOUR_PROJECT_ID`
- [ ] Terminal shows: `Now using project YOUR_PROJECT_ID`

### 2C — Deploy Firestore rules and indexes
- [ ] Ran: `firebase deploy --only firestore:rules,firestore:indexes`
- [ ] Terminal shows: `✔  firestore: rules file deployed successfully`
- [ ] Terminal shows: `✔  firestore: indexes deployed successfully`
- [ ] Opened Firebase Console → **Firestore Database → Indexes** tab
- [ ] Waited for all 3 indexes to show **"Enabled"** (not "Building")
  - ledger — date ASC + _syncedAt DESC — **Enabled** ✓
  - history — date ASC + _syncedAt DESC — **Enabled** ✓
  - records — date ASC + _syncedAt DESC — **Enabled** ✓

### 2D — Deploy app to hosting
- [ ] Ran: `firebase deploy --only hosting`
- [ ] Terminal shows: `✔  Deploy complete!`
- [ ] Terminal shows the Hosting URL: `https://YOUR_PROJECT_ID.web.app`
- [ ] Opened the URL in browser — app loads and shows PetroBook login screen

---

## STAGE 3 — USER SETUP AND CUSTOM CLAIMS

### 3A — Create super_owner account in Firebase Auth
- [ ] Firebase Console → **Authentication → Users**
- [ ] Clicked **Add user**
- [ ] Entered email and password for the main account owner
- [ ] Clicked **Add user**
- [ ] Copied the **UID** (long string in the UID column — looks like `abc123...`)

### 3B — Install admin script dependencies
- [ ] Opened terminal, navigated to `admin-scripts/` folder
  ```
  cd /path/to/READY_FOR_GITHUB/admin-scripts
  ```
- [ ] Ran: `npm install`
- [ ] Shows: `added X packages` (no errors)

### 3C — Download service account key
- [ ] Firebase Console → **⚙️ Project Settings** (gear icon top-left)
- [ ] Clicked **Service accounts** tab
- [ ] Clicked **Generate new private key**
- [ ] Clicked **Generate key** in the confirmation dialog
- [ ] Downloaded file saved as `serviceAccount.json`
- [ ] Moved/copied `serviceAccount.json` into the `admin-scripts/` folder

### 3D — Edit set-claims.js
- [ ] Opened `admin-scripts/set-claims.js` in a text editor
- [ ] Found: `const SUPER_OWNER_UID = 'PASTE_SUPER_OWNER_UID_HERE';`
- [ ] Replaced `PASTE_SUPER_OWNER_UID_HERE` with the real UID copied in Step 3A
- [ ] Saved the file

### 3E — Run set-claims.js
- [ ] Ran (from `admin-scripts/` folder): `node set-claims.js`
- [ ] Output shows: `✅  [UID]  role=super_owner  pumpId=null  accountId=[UID]`
- [ ] Output shows: `✅  All claims set successfully.`
- [ ] **Deleted** `serviceAccount.json` from the folder (do NOT commit it to GitHub)

---

## STAGE 4 — MIGRATION

### 4A — Log in to the live app and run migration
- [ ] Opened the live app URL (`https://YOUR_PROJECT_ID.web.app`) in Chrome
- [ ] Pressed **F12** to open Developer Tools
- [ ] Clicked the **Console** tab
- [ ] Pasted and ran the migration command (from DEPLOY_NOW.md → Step 6)
- [ ] Console output shows all 12 migration steps completing
- [ ] Final line shows: `Migration complete: {status: "ok", completed: 12, total: 12}`

### 4B — Verify migration in Firebase Console
- [ ] Firebase Console → **Firestore Database → Data**
- [ ] Expanded `accounts/` → found your UID document
- [ ] Expanded `users/` → user documents present, **no `passHash` field** visible
- [ ] Expanded `pumps/p1/` → pump document present
- [ ] Expanded `pumps/p1/data/` → `config` document present
- [ ] Expanded `pumps/p1/history/` → date documents present (if you have history)
- [ ] Expanded `pumps/p1/ledger/` → ledger documents present (if you have ledger data)

### 4C — Verify sync is live
- [ ] Reloaded the app page
- [ ] Browser console (F12) shows:
  - `[PetroBook] Firebase sync resumed from persistent flag.`
  - `[PetroBook] PB_FirestoreWriter initialised. accountId: [your UID]`
- [ ] Entered a test expense in the app
- [ ] Checked Firestore Console — the record appears within 3 seconds

---

## STAGE 5 — FINAL VERIFICATION

### 5A — Offline test
- [ ] Disconnected internet (turned off Wi-Fi or airplane mode)
- [ ] Used the app — works normally (offline mode)
- [ ] Reconnected internet
- [ ] Browser console shows: `[SyncEngine] replayQueue complete:`
- [ ] Firestore Console — offline data synced

### 5B — Security check
- [ ] Confirmed no `passHash` field on any user document in Firestore
- [ ] Confirmed history documents have `locked: true` for saved days
- [ ] Confirmed ledger entries are present and have no delete option from app

### 5C — Role test (if you have multiple users)
- [ ] Manager can log in and sees only their assigned pump
- [ ] Owner can log in and sees all pumps
- [ ] Wrong password shows error message, does not crash app

### 5D — GitHub CI/CD (if using GitHub)
- [ ] Pushed code to GitHub main branch
- [ ] GitHub Actions tab shows workflow running
- [ ] Workflow completes with green checkmarks
- [ ] Visit Firebase Hosting URL — latest version is live

---

## BLOCKERS CHECK

Before marking deployment complete, confirm all blockers are resolved:

| Blocker | Status |
|---------|--------|
| `FIREBASE_CONFIG` all 6 values replaced | [ ] Done |
| `.firebaserc` project ID replaced | [ ] Done |
| Firestore rules deployed | [ ] Done |
| Indexes all show Enabled | [ ] Done |
| App loads at hosting URL | [ ] Done |
| Custom claims set on super_owner | [ ] Done |
| Migration completed (12/12 steps) | [ ] Done |
| No passHash in Firestore | [ ] Done |

---

## EMERGENCY ROLLBACK

If anything goes wrong at any stage:

**Instantly disable Firebase sync (app reverts to 100% local mode):**
Open browser console on the live app and run:
```javascript
localStorage.removeItem('pb-sync-active');
location.reload();
```
All data remains safe in localStorage. Nothing is deleted.

**Re-run migration from scratch:**
```javascript
PB_MigrationPlan.resetProgress();
```
Then run the full migration command again.
