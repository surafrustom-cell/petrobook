/**
 * PetroBook — SaaS Phase 1 Migration Script
 * ==========================================
 * Run this ONCE per existing account to:
 *   1. Create companies/{autoId} document from existing accounts/{uid}/
 *   2. Create userProfiles/{uid} document mapping UID → companyId
 *   3. Create companies/{cid}/members/{uid} for each user
 *
 * This is a server-side complement to the client-side migration that runs
 * automatically on first login with a SaaS-aware app version.
 * Running this script ahead of time makes the client migration instant
 * (userProfiles/{uid} already exists → no legacy accounts/ read needed).
 *
 * USAGE:
 *   1. Place your serviceAccount.json in this folder (or use GOOGLE_APPLICATION_CREDENTIALS)
 *   2. npm install firebase-admin
 *   3. Edit ACCOUNT_UID below with the super_owner Firebase Auth UID
 *   4. node migrate-to-saas.js
 *
 * SAFETY:
 *   - Does NOT delete any existing accounts/{uid}/... data
 *   - Idempotent: safe to re-run (uses { merge: true })
 *   - Never touches passHash (enforced by server-side check)
 *
 * SECURITY:
 *   - serviceAccount.json must NEVER be committed to GitHub
 *   - passHash must NEVER reach Firestore
 */

'use strict';

const admin = require('firebase-admin');
const path  = require('path');
const fs    = require('fs');

// ── Auth: prefer env credentials (CI), fall back to serviceAccount.json ───────
const SA_PATH = path.join(__dirname, 'serviceAccount.json');
if (fs.existsSync(SA_PATH)) {
  admin.initializeApp({ credential: admin.credential.cert(SA_PATH) });
} else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
  admin.initializeApp({ credential: admin.credential.applicationDefault() });
} else {
  console.error('❌  No credentials found.');
  console.error('    Either place serviceAccount.json in admin-scripts/');
  console.error('    or set GOOGLE_APPLICATION_CREDENTIALS environment variable.');
  process.exit(1);
}

const db = admin.firestore();

// ── Configure these before running ───────────────────────────────────────────
const ACCOUNT_UID    = 'PASTE_SUPER_OWNER_UID_HERE';  // Firebase Auth UID
const OWNER_EMAIL    = 'PASTE_OWNER_EMAIL_HERE';       // e.g. surafrustom@gmail.com
const STATION_NAME   = 'PASTE_STATION_NAME_HERE';      // e.g. 'Al Mana Petrol'

// ── Validate config ───────────────────────────────────────────────────────────
if (ACCOUNT_UID.startsWith('PASTE_') || OWNER_EMAIL.startsWith('PASTE_') || STATION_NAME.startsWith('PASTE_')) {
  console.error('❌  Edit the ACCOUNT_UID, OWNER_EMAIL, and STATION_NAME at the top of this file before running.');
  process.exit(1);
}

// ── Main migration ────────────────────────────────────────────────────────────
async function migrate() {
  console.log('\n══════════════════════════════════════════════');
  console.log('  PetroBook SaaS Phase 1 — Account Migration');
  console.log('══════════════════════════════════════════════\n');

  // 1. Check if already migrated (userProfiles/{uid} exists)
  const profRef  = db.doc('userProfiles/' + ACCOUNT_UID);
  const profSnap = await profRef.get();
  if (profSnap.exists && profSnap.data().companyId) {
    console.log('ℹ️   Already migrated. companyId:', profSnap.data().companyId);
    console.log('    Re-running will update the existing company document (merge).\n');
  }

  // 2. Check legacy account data exists
  const legacyUsersSnap = await db.collection('accounts/' + ACCOUNT_UID + '/users').limit(1).get();
  if (legacyUsersSnap.empty) {
    console.error('❌  No users found in accounts/' + ACCOUNT_UID + '/users');
    console.error('    Either the UID is wrong or the account has no Firestore data yet.');
    process.exit(1);
  }
  console.log('✅  Legacy account data found. accounts/' + ACCOUNT_UID + '/users has data.\n');

  // 3. Create or reuse company document
  let companyId;
  if (profSnap.exists && profSnap.data().companyId) {
    companyId = profSnap.data().companyId;
    console.log('ℹ️   Using existing companyId:', companyId);
  } else {
    const companyRef = db.collection('companies').doc();
    companyId = companyRef.id;
    console.log('🔧  Creating new company document. companyId:', companyId);
  }

  // 4. Write company document
  await db.doc('companies/' + companyId).set({
    companyId:    companyId,
    name:         STATION_NAME,
    ownerUid:     ACCOUNT_UID,
    ownerEmail:   OWNER_EMAIL,
    status:       'active',
    createdAt:    admin.firestore.FieldValue.serverTimestamp(),
    migratedFrom: 'accounts/' + ACCOUNT_UID,
    migratedAt:   admin.firestore.FieldValue.serverTimestamp(),
  }, { merge: true });
  console.log('✅  companies/' + companyId + ' written.');

  // 5. Write owner member document
  await db.doc('companies/' + companyId + '/members/' + ACCOUNT_UID).set({
    uid:           ACCOUNT_UID,
    role:          'owner',
    status:        'active',
    assignedPumps: [],
    joinedAt:      admin.firestore.FieldValue.serverTimestamp(),
  }, { merge: true });
  console.log('✅  companies/' + companyId + '/members/' + ACCOUNT_UID + ' written.');

  // 6. Copy users from accounts/{uid}/users → companies/{cid}/users
  //    SKIP passHash — it must NEVER reach Firestore
  const usersSnap = await db.collection('accounts/' + ACCOUNT_UID + '/users').get();
  const batch = db.batch();
  let userCount = 0;
  usersSnap.forEach(function(doc) {
    const data = Object.assign({}, doc.data());
    delete data.passHash;          // SECURITY: never write passHash to Firestore
    delete data._syncedAt;
    delete data._v;
    batch.set(
      db.doc('companies/' + companyId + '/users/' + doc.id),
      Object.assign(data, { _migratedAt: admin.firestore.FieldValue.serverTimestamp() }),
      { merge: true }
    );
    userCount++;

    // Also write member documents for managers
    if (data.role === 'manager' && data.email) {
      // Manager UIDs are not known at this point — userProfiles will be written
      // client-side when each manager logs in on a SaaS-aware device.
      console.log('  ℹ️  Manager found: ' + data.name + ' (' + data.email + ') — userProfile written on their next login');
    }
  });
  await batch.commit();
  console.log('✅  ' + userCount + ' user(s) copied to companies/' + companyId + '/users/');

  // 7. Copy global/config
  const globalConfigSnap = await db.doc('accounts/' + ACCOUNT_UID + '/global/config').get();
  if (globalConfigSnap.exists) {
    const cfgData = Object.assign({}, globalConfigSnap.data(), {
      _migratedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    await db.doc('companies/' + companyId + '/global/config').set(cfgData, { merge: true });
    console.log('✅  global/config copied.');
  } else {
    console.log('ℹ️   global/config not found in accounts/ — skipping.');
  }

  // 8. Copy global/lang
  const globalLangSnap = await db.doc('accounts/' + ACCOUNT_UID + '/global/lang').get();
  if (globalLangSnap.exists) {
    const langData = Object.assign({}, globalLangSnap.data(), {
      _migratedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    await db.doc('companies/' + companyId + '/global/lang').set(langData, { merge: true });
    console.log('✅  global/lang copied.');
  } else {
    console.log('ℹ️   global/lang not found in accounts/ — skipping.');
  }

  // 9. Copy all pump docs + their data sub-documents
  const pumpsSnap = await db.collection('accounts/' + ACCOUNT_UID + '/pumps').get();
  if (pumpsSnap.empty) {
    console.log('ℹ️   No pumps found in accounts/ — skipping pump copy.');
  } else {
    let pumpCount = 0;
    for (const pDoc of pumpsSnap.docs) {
      const pid = pDoc.id;
      const pData = Object.assign({}, pDoc.data(), {
        _migratedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      // Pump metadata doc
      await db.doc('companies/' + companyId + '/pumps/' + pid).set(pData, { merge: true });

      // data/config
      const pCfgSnap = await db.doc('accounts/' + ACCOUNT_UID + '/pumps/' + pid + '/data/config').get();
      if (pCfgSnap.exists) {
        const d = Object.assign({}, pCfgSnap.data(), { _migratedAt: admin.firestore.FieldValue.serverTimestamp() });
        await db.doc('companies/' + companyId + '/pumps/' + pid + '/data/config').set(d, { merge: true });
      }

      // data/snapshot
      const pSnapSnap = await db.doc('accounts/' + ACCOUNT_UID + '/pumps/' + pid + '/data/snapshot').get();
      if (pSnapSnap.exists) {
        const d = Object.assign({}, pSnapSnap.data(), { _migratedAt: admin.firestore.FieldValue.serverTimestamp() });
        await db.doc('companies/' + companyId + '/pumps/' + pid + '/data/snapshot').set(d, { merge: true });
      }

      // data/fuelHistory
      const pFHSnap = await db.doc('accounts/' + ACCOUNT_UID + '/pumps/' + pid + '/data/fuelHistory').get();
      if (pFHSnap.exists) {
        const d = Object.assign({}, pFHSnap.data(), { _migratedAt: admin.firestore.FieldValue.serverTimestamp() });
        await db.doc('companies/' + companyId + '/pumps/' + pid + '/data/fuelHistory').set(d, { merge: true });
      }

      pumpCount++;
      console.log('✅  Pump ' + pid + ' + sub-data copied.');
    }
    console.log('✅  ' + pumpCount + ' pump(s) total copied.');
  }

  // 10. Write userProfile for the super_owner
  await db.doc('userProfiles/' + ACCOUNT_UID).set({
    uid:           ACCOUNT_UID,
    companyId:     companyId,
    role:          'owner',
    assignedPumps: [],
    email:         OWNER_EMAIL,
    createdAt:     admin.firestore.FieldValue.serverTimestamp(),
  }, { merge: true });
  console.log('✅  userProfiles/' + ACCOUNT_UID + ' written.');

  console.log('\n══════════════════════════════════════════════');
  console.log('✅  Migration complete.');
  console.log('');
  console.log('  companyId :', companyId);
  console.log('  ownerUid  :', ACCOUNT_UID);
  console.log('  email     :', OWNER_EMAIL);
  console.log('');
  console.log('  NEXT STEPS:');
  console.log('  1. Deploy the updated firestore.rules (v2.0)');
  console.log('  2. Deploy the updated index_standalone.html (SaaS Phase 1)');
  console.log('  3. Log out and log back in — next login uses companies/ path');
  console.log('  4. Existing accounts/{uid}/... data is preserved (no rollback needed)');
  console.log('══════════════════════════════════════════════\n');
}

migrate().catch(function(err) {
  console.error('\n❌  Fatal error:', err.message || err);
  process.exit(1);
});
