# PetroBook — DEPLOY NOW
### Everything in one place. Follow in exact order.

> This document assumes you have completed `FIREBASE_SETUP_GUIDE.md` and have:
> - Firebase project created with your credentials in `index_standalone.html`
> - `.firebaserc` updated with your project ID

---

## PART 1 — TERMINAL SETUP

Open **Command Prompt** (Windows: Win+R → type `cmd` → Enter) or **Terminal** (Mac).

### Install Node.js (skip if already installed)
```
# Check first:
node --version
```
If you see a version number (v18+ or v20+), skip to the next step.
If you see an error: download from https://nodejs.org (click the LTS button).

### Install Firebase CLI
```
npm install -g firebase-tools
```
Expected output: several lines ending with `added X packages`

**Verify:**
```
firebase --version
```
Expected output: `13.x.x` (any version number)

---

## PART 2 — LOGIN AND LINK PROJECT

### Login to Firebase
```
firebase login
```
- A browser window opens automatically
- Sign in with the **same Google account** you used to create the Firebase project
- When done, terminal shows: `Success! Logged in as your@email.com`

### Navigate to your project folder
```
# Windows example:
cd C:\Users\YourName\Desktop\READY_FOR_GITHUB

# Mac example:
cd /Users/YourName/Desktop/READY_FOR_GITHUB
```
> Replace the path with wherever your `READY_FOR_GITHUB` folder actually is.

### Link to your Firebase project
```
firebase use YOUR_PROJECT_ID
```
> Replace `YOUR_PROJECT_ID` with your real project ID (e.g. `petrobook-prod`).

Expected output: `Now using project YOUR_PROJECT_ID`

**Verify the link:**
```
firebase projects:list
```
Your project should appear with a ✓ or asterisk next to it.

---

## PART 3 — DEPLOY FIRESTORE RULES AND INDEXES

```
firebase deploy --only firestore:rules,firestore:indexes
```

Expected output:
```
i  deploying firestore
i  firestore: reading indexes from firestore.indexes.json
i  firestore: reading rules from firestore.rules
✔  firestore: released rules firestore.rules to cloud.firestore
✔  firestore: deployed indexes in firestore.indexes.json successfully

✔  Deploy complete!
```

### Wait for indexes to build

1. Open **https://console.firebase.google.com**
2. Click your project
3. Left sidebar → **Build → Firestore Database**
4. Click the **Indexes** tab
5. You will see 3 indexes listed — wait until all 3 show **"Enabled"**
   - If they show "Building..." — wait 2–5 minutes and refresh the page
   - Do NOT continue to Part 4 until all 3 show "Enabled"

---

## PART 4 — DEPLOY THE APP

```
firebase deploy --only hosting
```

Expected output:
```
i  deploying hosting
i  hosting[YOUR_PROJECT_ID]: beginning deploy...
i  hosting[YOUR_PROJECT_ID]: found 2 files in .
✔  hosting[YOUR_PROJECT_ID]: file upload complete
i  hosting[YOUR_PROJECT_ID]: finalizing version...
✔  hosting[YOUR_PROJECT_ID]: version finalized
i  hosting[YOUR_PROJECT_ID]: releasing new version...
✔  hosting[YOUR_PROJECT_ID]: release complete

✔  Deploy complete!

Project Console: https://console.firebase.google.com/project/YOUR_PROJECT_ID/overview
Hosting URL: https://YOUR_PROJECT_ID.web.app
```

**Open the Hosting URL in your browser.**
You should see the PetroBook login screen.
> If it shows a blank page or error — check that you filled in `FIREBASE_CONFIG` correctly.

---

## PART 5 — SET CUSTOM CLAIMS

Custom claims tell Firestore who is an owner, who is a manager, and which pump each manager controls. **This must be done before running migration.**

### Step 5A — Get your super_owner UID

1. Firebase Console → **Authentication** → **Users**
2. You should see the user you created
3. Copy the **UID** (click the copy icon next to it)
   - It looks like: `aBcDeFgHiJkLmNoPqRsTuVwXyZ123456`

### Step 5B — Download service account key

1. Firebase Console → **⚙️ Project Settings** (gear icon, top-left)
2. Click the **Service accounts** tab
3. Click **Generate new private key**
4. Click **Generate key** in the dialog
5. A file downloads — it's called something like `your-project-firebase-adminsdk-xxxxx.json`
6. **Rename it to `serviceAccount.json`**
7. **Move it into the `admin-scripts/` folder** inside `READY_FOR_GITHUB`

### Step 5C — Edit set-claims.js

1. Open `admin-scripts/set-claims.js` in Notepad / TextEdit
2. Find this line:
   ```javascript
   const SUPER_OWNER_UID = 'PASTE_SUPER_OWNER_UID_HERE';
   ```
3. Replace `PASTE_SUPER_OWNER_UID_HERE` with your real UID:
   ```javascript
   const SUPER_OWNER_UID = 'aBcDeFgHiJkLmNoPqRsTuVwXyZ123456';
   ```
4. Save the file

### Step 5D — Run set-claims.js

In terminal, navigate to admin-scripts:
```
cd admin-scripts
npm install
node set-claims.js
```

Expected output:
```
──────────────────────────────────────────
  PetroBook Custom Claims Setup
──────────────────────────────────────────

✅  aBcDeFgHiJkLmNoPqRsTuVwXyZ123456  role=super_owner  pumpId=null  accountId=aBcDeFgHiJkLmNoPqRsTuVwXyZ123456

──────────────────────────────────────────
✅  All claims set successfully.

IMPORTANT: Users must log out and log back in for new claims to take effect.
           The JWT token is refreshed on next sign-in (~1 hour auto-refresh).
──────────────────────────────────────────
```

### Step 5E — Delete serviceAccount.json

```
# Windows:
del serviceAccount.json

# Mac/Linux:
rm serviceAccount.json
```

> **Critical:** Never commit `serviceAccount.json` to GitHub. It gives full admin access to your Firebase project.

Navigate back to main folder:
```
# Windows:
cd ..

# Mac:
cd ..
```

---

## PART 6 — RUN DATA MIGRATION

The migration uploads your existing station data from the device into Firestore.
**Run this once only.**

### Step 6A — Open the app and log in

1. Open `https://YOUR_PROJECT_ID.web.app` in Chrome
2. Log in with the email and password of your super_owner account

### Step 6B — Open browser console

1. Press **F12** (Windows) or **Cmd+Option+I** (Mac)
2. Click the **Console** tab
3. You'll see a text input area at the bottom

### Step 6C — Initialise the Firestore writer

Copy and paste this EXACT command, then press **Enter**:
```javascript
firebase.auth().currentUser.getIdTokenResult().then(function(t) {
  var aid = (t.claims && t.claims.accountId) || firebase.auth().currentUser.uid;
  var db = firebase.firestore();
  var ok = PB_FirestoreWriter.init(db, aid);
  console.log('Writer ready:', ok, '  accountId:', aid);
});
```

Expected output:
```
Writer ready: true   accountId: aBcDeFgHiJkLmNoPqRsTuVwXyZ123456
```

> If it says `Writer ready: false` — your custom claims may not have propagated yet.
> Log out of the app, wait 1 minute, log back in, and try again.

### Step 6D — Run the migration

Copy and paste this ENTIRE block, then press **Enter**:
```javascript
PB_MigrationPlan.run(firebase.firestore(), function(p) {
  var symbol = p.skipped ? '⏭ ' : '✓ ';
  console.log(symbol + 'Step ' + p.done + '/12: ' + p.step.id +
    (p.skipped ? ' — skipped (already done)' : ''));
}).then(function(result) {
  console.log('');
  console.log('══════════════════════════════');
  console.log('Migration result:', JSON.stringify(result));
  if (result.status === 'ok') {
    console.log('✅  Migration COMPLETE — Firebase sync is now LIVE');
  } else {
    console.log('❌  Migration had errors — check above');
  }
}).catch(function(e) {
  console.error('❌  Migration failed:', e.message || e);
});
```

Expected output:
```
✓ Step 1/12: 01_global_config
✓ Step 2/12: 02_language
✓ Step 3/12: 03_users
✓ Step 4/12: 04_pumps
✓ Step 5/12: 05_configs
✓ Step 6/12: 06_snapshots
✓ Step 7/12: 07_fuel_history
✓ Step 8/12: 08_records
✓ Step 9/12: 09_history
✓ Step 10/12: 10_ledger
✓ Step 11/12: 11_verify
✓ Step 12/12: 12_cutover

══════════════════════════════
Migration result: {"status":"ok","completed":12,"total":12}
✅  Migration COMPLETE — Firebase sync is now LIVE
```

> **If a step shows an error:** The migration is idempotent — you can safely run it again.
> Completed steps will show ⏭ (skipped). Only failed steps will re-run.

---

## PART 7 — VERIFY EVERYTHING WORKS

### Step 7A — Check console messages after reload

1. Press **F5** to reload the app
2. In the browser console (F12), you should see:
   ```
   [FirebaseProvider] Connected to Firebase project: YOUR_PROJECT_ID
   [PB_FirebaseAuth] Ready. Project: YOUR_PROJECT_ID
   [PetroBook] Firebase sync resumed from persistent flag.
   [PetroBook] PB_FirestoreWriter initialised. accountId: YOUR_UID
   [PB_AuthBridge] Activated.
   ```

### Step 7B — Verify data in Firestore Console

1. Firebase Console → **Firestore Database → Data**
2. Verify the following structure exists:
   ```
   accounts/
   └── YOUR_UID/
       ├── global/
       │   ├── config        ← global settings
       │   └── lang          ← language preference
       ├── users/
       │   └── [user docs]   ← NO passHash field visible
       └── pumps/
           └── p1/
               ├── [pump doc]
               ├── data/
               │   ├── config
               │   └── snapshot
               ├── history/
               │   └── [date docs]
               └── ledger/
                   └── [date docs]
   ```
3. Click on any user document — confirm there is **no `passHash` field**

### Step 7C — Test live sync

1. In the app, enter a test expense (any small amount)
2. Go to Firebase Console → Firestore → your pump's `records` or `ledger` collection
3. The new entry should appear within **3 seconds**

### Step 7D — Test offline mode

1. Turn off Wi-Fi (or disconnect your network cable)
2. Use the app — enter readings, expenses, etc. — it should work normally
3. Turn Wi-Fi back on
4. Check browser console — you should see:
   ```
   [SyncEngine] replayQueue complete: {replayed: X, failed: 0}
   ```
5. Check Firestore Console — the offline data now appears

---

## PART 8 — ADD ADDITIONAL USERS (OPTIONAL)

To add an owner or manager:

### Step 8A — Create the user in Firebase Auth

1. Firebase Console → **Authentication → Users → Add user**
2. Enter email and password → **Add user**
3. Copy the new user's **UID**

### Step 8B — Set their claims

1. Open `admin-scripts/set-claims.js` in a text editor
2. Find the commented-out sections:
   ```javascript
   // ── Example: regular owner ──
   // {
   //   uid:       'PASTE_OWNER_UID_HERE',
   //   accountId: SUPER_OWNER_UID,
   //   role:      'owner',
   //   pumpId:    null,
   // },
   ```
3. Uncomment the block (remove the `//` from each line)
4. Replace `PASTE_OWNER_UID_HERE` with the real UID
5. For a manager: use `role: 'manager'` and set `pumpId: 'p1'` (or `'p2'`, etc.)
6. Place `serviceAccount.json` back in `admin-scripts/`
7. Run: `node set-claims.js`
8. Delete `serviceAccount.json` again

---

## TROUBLESHOOTING

| Problem | Cause | Solution |
|---------|-------|----------|
| App shows blank page | Wrong `FIREBASE_CONFIG` | Re-check all 6 values in `index_standalone.html` |
| "Firebase SDK not loaded" in console | Config has placeholders | Search for `YOUR_API_KEY` — must be 0 results |
| Migration step shows `permission-denied` | Custom claims not set | Log out, wait 1 min, log in, try migration again |
| Migration step shows `NOT_FOUND` | Indexes still building | Wait for all indexes to say "Enabled" in Console |
| `Writer ready: false` | Claims not propagated | Log out, wait 1 minute, log back in |
| `firebase deploy` says "not logged in" | Session expired | Run `firebase login` again |
| `firebase use` says "project not found" | Wrong project ID | Run `firebase projects:list` to see your real ID |
| App works but data not in Firestore | Migration not run | Run Part 6 again |
| CI/CD workflow fails | Secrets not set | Check GitHub → Settings → Secrets — must have both secrets |

---

## ROLLBACK COMMANDS (EMERGENCY)

**Instantly disable Firebase sync (reverts to 100% local mode):**
```javascript
// Run in browser console on the live app:
localStorage.removeItem('pb-sync-active');
location.reload();
```

**Re-enable sync:**
```javascript
localStorage.setItem('pb-sync-active', '1');
location.reload();
```

**Reset migration (to re-run from step 1):**
```javascript
PB_MigrationPlan.resetProgress();
// Then run the migration command from Part 6D again
```

**Check sync status:**
```javascript
console.log('SyncEngine active:', SyncEngine.ACTIVE);
console.log('Writer ready:', PB_FirestoreWriter.isReady());
console.log('Writer accountId:', PB_FirestoreWriter.getAccountId());
console.log('Queue depth:', SyncEngine.getDiagnostics());
```

**Check dead letter queue (failed writes):**
```javascript
var dead = JSON.parse(localStorage.getItem('pb-sync-dead-v1') || '[]');
console.log('Dead letter queue:', dead.length, 'items');
if (dead.length) console.table(dead);
```
