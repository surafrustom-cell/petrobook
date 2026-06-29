# PetroBook — Deployment Guide

Complete these steps **in order**. Read `FIREBASE_SETUP.md` first.

---

## Prerequisites Checklist

Before running any command below, confirm:

- [ ] Firebase project created (see FIREBASE_SETUP.md Step 1)
- [ ] Firestore Database enabled — Production mode, asia-south1
- [ ] Authentication enabled — Email/Password
- [ ] Real credentials pasted into `FIREBASE_CONFIG` in `index_standalone.html`
- [ ] `.firebaserc` updated with your real project ID
- [ ] Node.js installed (https://nodejs.org — download LTS version)

---

## Phase 1 — Install Firebase CLI

Run once per computer:

```bash
npm install -g firebase-tools
```

Verify installation:
```bash
firebase --version
```

---

## Phase 2 — Login to Firebase

```bash
firebase login
```

A browser window opens. Log in with the **same Google account** you used to create the Firebase project.

When you see "Success! Logged in as your@email.com" — continue.

---

## Phase 3 — Link to Your Firebase Project

In the deployment folder:

```bash
firebase use YOUR_PROJECT_ID
```

Replace `YOUR_PROJECT_ID` with your actual project ID (example: `petrobook-prod`).

Confirm with:
```bash
firebase projects:list
```

---

## Phase 4 — Deploy Firestore Rules and Indexes

⚠️ **Do this before deploying the app or running migration.**

```bash
firebase deploy --only firestore:rules,firestore:indexes
```

Expected output:
```
✔  firestore: rules file deployed successfully
✔  firestore: indexes deployed successfully
```

### Wait for indexes to build

1. Open Firebase Console → **Firestore Database → Indexes**
2. Wait until all indexes show **"Enabled"** (not "Building")
3. This takes 2–5 minutes

Do **not** proceed to Phase 5 until all indexes show Enabled.

---

## Phase 5 — Deploy the App to Firebase Hosting

```bash
firebase deploy --only hosting
```

Expected output:
```
✔  Deploy complete!
Hosting URL: https://YOUR_PROJECT_ID.web.app
```

Open the URL in your browser. The app should load.

---

## Phase 6 — First-Time Migration

This runs **once only** — uploads all your local station data to Firestore.

### 6a. Set Custom Claims First

Before migration, Firebase Auth custom claims must be set.
See **FIREBASE_SETUP.md Step 8** for the Node.js script.

### 6b. Run Migration in Browser Console

Open your deployed app URL. Log in as the **super_owner**.

Open browser console (F12 → Console tab) and paste:

```javascript
firebase.auth().signInWithEmailAndPassword('your@email.com', 'yourpassword')
  .then(function(cred) {
    var db  = firebase.firestore();
    var uid = cred.user.uid;

    // Initialise the Firestore writer with your account ID
    PB_FirestoreWriter.init(db, uid);

    // Run migration (safe to re-run — completed steps are skipped)
    return PB_MigrationPlan.run(db, function(progress) {
      console.log(
        'Step ' + progress.done + '/' + progress.total +
        ': ' + progress.step.id +
        (progress.skipped ? ' (skipped — already done)' : '')
      );
    });
  })
  .then(function(result) {
    console.log('Migration complete:', result);
  })
  .catch(function(err) {
    console.error('Migration error:', err);
  });
```

Expected output:
```
Step 1/12: 01_global_config
Step 2/12: 02_language
Step 3/12: 03_users
Step 4/12: 04_pumps
Step 5/12: 05_configs
Step 6/12: 06_snapshots
Step 7/12: 07_fuel_history
Step 8/12: 08_records
Step 9/12: 09_history
Step 10/12: 10_ledger
Step 11/12: 11_verify
Step 12/12: 12_cutover
Migration complete: {status: "ok", completed: 12, total: 12}
```

After step 12, Firebase sync is permanently enabled. The app will:
- Write all new data to both localStorage AND Firestore
- Resume sync automatically after every page reload
- Work offline and sync when connection returns

---

## Phase 7 — Post-Deployment Verification

### 7a. Check Firebase Console

Go to **Firestore Database → Data** and verify:
- `accounts/YOUR_UID/users/` — your user (no `passHash` field)
- `accounts/YOUR_UID/pumps/p1/history/` — date documents
- `accounts/YOUR_UID/pumps/p1/ledger/` — ledger entries

### 7b. Check browser console

After a page reload, you should see:
```
[PB_FirebaseAuth] Ready. Project: petrobook-prod
[PetroBook] Firebase sync resumed from persistent flag.
[PB_AuthBridge] Activated.
```

### 7c. Test sync

1. Enter a test expense in the app
2. Go to Firebase Console → Firestore → `records` collection
3. The document should appear within 2–3 seconds

### 7d. Test offline

1. Disconnect your internet
2. Use the app normally — it should work fine
3. Reconnect internet
4. Data syncs automatically (check console for confirmation)

---

## Future Deployments (after initial setup)

For app-only updates (no rules/index changes):

```bash
git add index_standalone.html
git commit -m "Update: description of change"
git push
firebase deploy --only hosting
```

For rules/index updates:

```bash
firebase deploy --only firestore:rules,firestore:indexes
firebase deploy --only hosting
```

---

## Rollback

If something goes wrong after deployment:

### Instant code rollback

```bash
firebase hosting:releases:list
firebase hosting:channel:deploy --target live RELEASE_ID
```

Or restore a previous version from GitHub:
```bash
git checkout PREVIOUS_COMMIT_HASH -- index_standalone.html
firebase deploy --only hosting
```

### Disable Firebase sync (emergency)

In the browser console on the live app:
```javascript
localStorage.removeItem('pb-sync-active');
location.reload();
```

The app falls back to 100% localStorage mode instantly. No data is lost.

---

## Commands Reference Card

| Task | Command |
|------|---------|
| Login to Firebase | `firebase login` |
| Set project | `firebase use PROJECT_ID` |
| Deploy rules | `firebase deploy --only firestore:rules,firestore:indexes` |
| Deploy app | `firebase deploy --only hosting` |
| Deploy everything | `firebase deploy` |
| Check deploy status | `firebase hosting:releases:list` |
| Open app in browser | `firebase open hosting:site` |
| View logs | `firebase functions:log` (if using Cloud Functions) |
