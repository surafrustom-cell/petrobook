# Auth Dependency Report — PetroBook Auth v3
**Date:** 2026-06-29  
**Commit:** (auth-v3 — pending push)

---

## Root Causes Identified and Fixed

### Root Cause A — `companies/{cid}/users` read on login (FIXED)

**Location:** `_pbHandleFirebaseUser()` (previously lines 29871–29949)

**Problem:** After resolving companyId, the function read `companies/{cid}/users` collection to build the user object. This requires the caller to be a member (`isMemberOf(cid)` → `exists(members/{uid})`). On a fresh device where the member doc was never written (or the doSetup IIFE failed silently), this read returned permission-denied, which fell through to `_pbRestoreLegacyPath()` → "Cloud account data not found."

**Fix:** Rewrote `_pbHandleFirebaseUser()` to build the owner user object directly from Firebase Auth (`fbUser.uid`, `fbUser.email`, `fbUser.displayName`). No `companies/{cid}/users` read. Owner identity = Firebase Auth UID, always.

---

### Root Cause B — `doSetup()` Firebase IIFE silent failure (MITIGATED)

**Location:** `doSetup()` non-blocking IIFE

**Problem:** The Firebase company creation (companies doc + member doc + userProfile) runs in a fire-and-forget IIFE. If it fails silently (network error, Firebase not initialized, etc.), the user is granted access locally but has no Firestore company. Cross-device login will fail because `_pbResolveUserCompany()` finds no userProfile and no companies by ownerUid.

**Mitigation:** The new `_pbEnsureMemberDoc()` function (called by the new `_pbHandleFirebaseUser()` on every login) will self-heal missing member docs. But it cannot create a missing company doc — that still requires the user to run through setup again.

**Recommendation:** Make the doSetup IIFE `await`-able and show an error toast if it fails, so the user knows to retry.

---

### Root Cause C — `doResetManagerPass()` passHash check on Google owners (FIXED)

**Location:** `doResetManagerPass()` (lines ~30009–30027)

**Problem:** The function validated owner identity by comparing `requester.passHash` to a freshly hashed `ownerPass`. Google-only owners have `passHash: null` → the comparison always failed → "Owner credentials incorrect."

**Fix:** Rewrote to use two auth paths:
1. **Firebase Auth current user** (primary): if `firebase.auth().currentUser.email` matches the entered email, identity is proven by Firebase session. No password needed for Google owners.
2. **passHash fallback** (secondary): for email/password owners without an active Firebase session, the original passHash check is preserved.

---

### Root Cause D — Firestore rules missing `isOwnerOf()` on read paths (FIXED)

**Location:** `firestore.rules`

**Problem:** All `companies/{cid}/...` sub-collection reads required `isMemberOf(cid)`, which relies on `exists(members/{uid})`. If the member doc is missing, all reads fail with permission-denied.

**Fix:** Added `|| isOwnerOf(cid)` to all company sub-collection read rules. `isOwnerOf(cid)` uses `get(companies/{cid}).data.ownerUid == uid()` — this works even when no member doc exists, because `isOwnerOf()` reads the company root doc (not the members sub-collection).

---

### Root Cause E — `pb-sync-active` gate on `onAuthStateChanged` (FIXED)

**Location:** `_pbInitStorage()` onAuthStateChanged registration

**Problem:** The `onAuthStateChanged` handler (which inits `PB_FirestoreWriter`) was gated on `localStorage.getItem('pb-sync-active') === '1'`. Fresh devices never set this flag, so `PB_FirestoreWriter` was never initialized on first login.

**Fix:** Split the block — SyncEngine activation still requires `pb-sync-active=1` (correct, avoids activating sync before first login completes), but `onAuthStateChanged` registration is now unconditional (`if(true)`).

---

### Root Cause F — `set-claims-ci.js` missing `companyId` claim (DOCUMENTED, NOT FIXED HERE)

**Location:** `admin-scripts/set-claims-ci.js`

**Problem:** Custom claims set as `{role, accountId, pumpId}` but not `companyId`. The `isMemberOf()` fast path (`companyId() == cid`) in Firestore rules never matches. The slow path (`exists(members/{uid})`) is always used.

**Impact:** Minor performance overhead (extra Firestore read per rule evaluation). Not a correctness bug once `isOwnerOf()` is added to read rules.

**Recommendation:** Add `companyId` to claims in a future set-claims update.

---

### Root Cause SyncEngine — Cross-device restores didn't activate live sync (FIXED)

**Location:** `_pbFinaliseRestore()`

**Problem:** `_pbFinaliseRestore()` set `pb-sync-active=1` and inited `PB_FirestoreWriter`, but did NOT call `SyncEngine.ACTIVE = true`, `StorageService.setProvider(SyncEngine)`, or `PB_AuthBridge.activate()`. This meant writes made after cross-device login went to `LocalStorageProvider` only (no Firestore sync).

**Fix:** Added SyncEngine activation + StorageService provider switch + PB_AuthBridge.activate() to `_pbFinaliseRestore()`, matching what `doSetup()` IIFE does.

---

## New Functions

### `_pbEnsureMemberDoc(uid, cid, role, email, displayName, fsDb)`

Self-heals the `companies/{cid}/members/{uid}` document if it doesn't exist. Also writes `companies/{cid}/users/{uid}` if missing. Called by `_pbHandleFirebaseUser()` BEFORE `_pbFinaliseRestore()`, so `isMemberOf()` checks pass for all subsequent Firestore reads.

Uses `isOwnerOf(cid)` write rule (company root doc `ownerUid` check) — does NOT require member doc to already exist. Safe to call on first login from any device.

---

## Auth Flow — v3

```
doLogin() or doGoogleLogin()
  → Firebase Auth (signIn / signInWithPopup)
  → _pbHandleFirebaseUser(fbUser)
    → getIdTokenResult(true)  [force-refresh claims]
    → _pbResolveUserCompany()
        → userProfiles/{uid}   [cross-device restore key]
        → companies?ownerUid=uid  [fallback query]
        → accounts/{uid}/users   [legacy fallback]
    → [companyId found] → _pbSetCompanyId(cid)
    → [build ownerUser from Firebase Auth — no Firestore users read]
    → _pbEnsureMemberDoc()   [self-heal member doc]
    → _pbFinaliseRestore()
        → read companies/{cid}/global/config
        → read companies/{cid}/pumps
        → activate SyncEngine
        → init PB_FirestoreWriter
        → _doGrantAccess()
            → enterOwnerMode() / enterManagerMode()
```

---

## Manager Auth — Unchanged

Manager accounts are local-only (no Firebase Auth). Auth is via `passHash` stored in localStorage. The `doLogin()` Path 1 (manager local auth) is unchanged.

`doResetManagerPass()` still writes the new passHash to localStorage only — passHash never reaches Firestore.

---

## Security Constraints Compliance

- ✅ `passHash` never reaches Firestore (noPassHash() rule enforced)
- ✅ `serviceAccount.json` not committed (in .gitignore)
- ✅ UI unchanged
- ✅ Calculations unchanged
- ✅ No features removed
- ✅ Firestore sync not broken
