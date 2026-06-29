/**
 * PetroBook -- CI-Compatible Firebase Setup
 * ==========================================
 * Called by .github/workflows/firebase-setup.yml
 *
 * What it does (idempotent -- safe to re-run):
 *   1. Creates the super_owner Firebase Auth account if it doesn't exist
 *   2. Sets custom claims: { role, accountId, pumpId }
 *   3. Verifies claims by reading them back
 *
 * Auth:  Uses GOOGLE_APPLICATION_CREDENTIALS (set by google-github-actions/auth@v2)
 * NO serviceAccount.json is read from disk -- credentials come from the environment.
 *
 * SECURITY: passHash never reaches Firestore (enforced in firestore.rules too).
 */

'use strict';

const admin = require('firebase-admin');

// ── Config ─────────────────────────────────────────────────────────────────
const SUPER_OWNER_EMAIL    = 'surafrustom@gmail.com';
const SUPER_OWNER_DISPLAY  = 'Super Owner';
// Password shown once in CI logs -- change it after first login.
const SUPER_OWNER_PASSWORD = 'PetroBook@2026!';

// ── Init Admin SDK via application-default credentials ─────────────────────
// GOOGLE_APPLICATION_CREDENTIALS is exported by google-github-actions/auth@v2.
admin.initializeApp({
  credential: admin.credential.applicationDefault(),
});

// ── Main ────────────────────────────────────────────────────────────────────
async function main() {
  console.log('\n══════════════════════════════════════════');
  console.log('  PetroBook Firebase Initialization (CI)');
  console.log('══════════════════════════════════════════\n');

  // 1. Create or fetch the super_owner user
  let userRecord;

  try {
    userRecord = await admin.auth().getUserByEmail(SUPER_OWNER_EMAIL);
    console.log('User already exists:');
    console.log('  uid   :', userRecord.uid);
    console.log('  email :', userRecord.email);
  } catch (err) {
    if (err.code === 'auth/user-not-found') {
      console.log('User not found -- creating...');
      userRecord = await admin.auth().createUser({
        email:         SUPER_OWNER_EMAIL,
        password:      SUPER_OWNER_PASSWORD,
        displayName:   SUPER_OWNER_DISPLAY,
        emailVerified: true,
      });
      console.log('User created:');
      console.log('  uid      :', userRecord.uid);
      console.log('  email    :', userRecord.email);
      console.log('  password : ' + SUPER_OWNER_PASSWORD + '  <-- change after first login');
    } else {
      throw err;
    }
  }

  const uid = userRecord.uid;

  // 2. Set custom claims
  const claims = {
    role:      'super_owner',
    accountId: uid,
    pumpId:    null,
  };

  console.log('\nSetting custom claims:', JSON.stringify(claims));
  await admin.auth().setCustomUserClaims(uid, claims);

  // 3. Verify by reading back
  const check   = await admin.auth().getUser(uid);
  const actual  = check.customClaims || {};
  const verified = (
    actual.role      === claims.role &&
    actual.accountId === claims.accountId &&
    actual.pumpId    === claims.pumpId
  );

  if (!verified) {
    console.error('\nClaims readback mismatch!');
    console.error('  set:', JSON.stringify(claims));
    console.error('  got:', JSON.stringify(actual));
    process.exit(1);
  }

  console.log('\n══════════════════════════════════════════');
  console.log('Firebase initialization complete.');
  console.log('');
  console.log('  super_owner UID  :', uid);
  console.log('  role             :', actual.role);
  console.log('  accountId        :', actual.accountId);
  console.log('  pumpId           :', String(actual.pumpId));
  console.log('');
  console.log('  Login at: https://petrobook-prod.web.app');
  console.log('  Email   :', SUPER_OWNER_EMAIL);
  console.log('  Password: ' + SUPER_OWNER_PASSWORD + '  <-- change after first login');
  console.log('');
  console.log('  IMPORTANT: log out and log back in for claims to take effect.');
  console.log('══════════════════════════════════════════\n');
}

main().catch(err => {
  console.error('\nFatal error:', err.message || err);
  process.exit(1);
});
