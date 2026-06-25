/**
 * PetroBook — Firebase Custom Claims Setup
 * =========================================
 * Run this ONCE after creating your Firebase Auth users.
 * Custom claims are required for Firestore security rules to work.
 *
 * USAGE:
 *   1. Place your serviceAccount.json in this folder
 *   2. npm install
 *   3. Edit the USERS array below with real UIDs and values
 *   4. node set-claims.js
 *
 * HOW TO GET A UID:
 *   Firebase Console → Authentication → Users → copy the UID column
 *
 * CLAIMS FORMAT (must match firestore.rules):
 *   accountId  — UID of the super_owner (same for all users in one station)
 *   role       — 'super_owner' | 'owner' | 'manager'
 *   pumpId     — 'p1' | 'p2' | ... | null (null = all pumps / owner/super_owner)
 */

'use strict';

const admin = require('firebase-admin');
const path  = require('path');
const fs    = require('fs');

// ── 1. Load service account ────────────────────────────────────────────────
const SA_PATH = path.join(__dirname, 'serviceAccount.json');
if (!fs.existsSync(SA_PATH)) {
  console.error('❌  serviceAccount.json not found in admin-scripts/');
  console.error('    Download it from: Firebase Console → ⚙️ Project Settings → Service accounts → Generate new private key');
  process.exit(1);
}

admin.initializeApp({
  credential: admin.credential.cert(SA_PATH),
});

// ── 2. CONFIGURE USERS HERE ───────────────────────────────────────────────
//
// Replace each UID and value with your real data.
//
// STEP A: Create the super_owner first in Firebase Auth.
//         Their UID becomes the accountId for ALL users at the same station.
//
// STEP B: Add each user below.
//
const SUPER_OWNER_UID = 'PASTE_SUPER_OWNER_UID_HERE';   // ← Firebase UID from Auth console

const USERS = [
  // ── Super owner (full access, manages the Firebase project) ──────────────
  {
    uid:       SUPER_OWNER_UID,
    accountId: SUPER_OWNER_UID,      // accountId === own UID for super_owner
    role:      'super_owner',
    pumpId:    null,                 // null = access to all pumps
  },

  // ── Example: regular owner (same station, all pumps) ─────────────────────
  // Uncomment and fill in when you add an owner account:
  //
  // {
  //   uid:       'PASTE_OWNER_UID_HERE',
  //   accountId: SUPER_OWNER_UID,   // same accountId as super_owner
  //   role:      'owner',
  //   pumpId:    null,
  // },

  // ── Example: manager for pump p1 ─────────────────────────────────────────
  // Uncomment and fill in when you add a manager account:
  //
  // {
  //   uid:       'PASTE_MANAGER_UID_HERE',
  //   accountId: SUPER_OWNER_UID,   // same accountId as super_owner
  //   role:      'manager',
  //   pumpId:    'p1',              // 'p1' | 'p2' | 'p3' | 'p4' | 'p5'
  // },
];

// ── 3. Validation ─────────────────────────────────────────────────────────
const VALID_ROLES  = ['super_owner', 'owner', 'manager'];
const VALID_PUMPS  = ['p1', 'p2', 'p3', 'p4', 'p5', null];

function validate(user) {
  const errs = [];
  if (!user.uid       || user.uid       === 'PASTE_SUPER_OWNER_UID_HERE' ||
      user.uid.startsWith('PASTE_'))    errs.push('uid is still a placeholder');
  if (!user.accountId || user.accountId.startsWith('PASTE_')) errs.push('accountId is still a placeholder');
  if (!VALID_ROLES.includes(user.role))  errs.push('role must be one of: ' + VALID_ROLES.join(', '));
  if (!VALID_PUMPS.includes(user.pumpId)) errs.push('pumpId must be one of: ' + VALID_PUMPS.join(', ') + ', or null');
  if (user.role === 'manager' && !user.pumpId) errs.push('manager must have a pumpId');
  return errs;
}

// ── 4. Set claims ─────────────────────────────────────────────────────────
async function setClaims() {
  console.log('\n──────────────────────────────────────────');
  console.log('  PetroBook Custom Claims Setup');
  console.log('──────────────────────────────────────────\n');

  let allOk = true;

  for (const user of USERS) {
    const errs = validate(user);
    if (errs.length > 0) {
      console.error('❌  Skipping UID ' + user.uid + ' — validation errors:');
      errs.forEach(function(e) { console.error('    • ' + e); });
      allOk = false;
      continue;
    }

    const claims = {
      accountId: user.accountId,
      role:      user.role,
      pumpId:    user.pumpId,
    };

    try {
      // Set claims
      await admin.auth().setCustomUserClaims(user.uid, claims);

      // Verify by reading back
      const check = await admin.auth().getUser(user.uid);
      const actual = check.customClaims || {};
      const ok = (
        actual.accountId === claims.accountId &&
        actual.role      === claims.role &&
        actual.pumpId    === claims.pumpId
      );

      if (ok) {
        console.log('✅  ' + user.uid + '  role=' + user.role +
          (user.pumpId ? '  pumpId=' + user.pumpId : '  pumpId=null') +
          '  accountId=' + user.accountId);
      } else {
        console.error('⚠️   ' + user.uid + ' — claims were set but readback mismatch');
        console.error('    set:', JSON.stringify(claims));
        console.error('    got:', JSON.stringify(actual));
        allOk = false;
      }
    } catch (err) {
      console.error('❌  ' + user.uid + ' — ' + (err.message || err));
      allOk = false;
    }
  }

  console.log('\n──────────────────────────────────────────');
  if (allOk) {
    console.log('✅  All claims set successfully.');
    console.log('');
    console.log('IMPORTANT: Users must log out and log back in for new claims to take effect.');
    console.log('           The JWT token is refreshed on next sign-in (~1 hour auto-refresh).');
  } else {
    console.log('⚠️   Some claims failed — review errors above.');
  }
  console.log('──────────────────────────────────────────\n');

  process.exit(allOk ? 0 : 1);
}

setClaims().catch(function(err) {
  console.error('Fatal error:', err);
  process.exit(1);
});
