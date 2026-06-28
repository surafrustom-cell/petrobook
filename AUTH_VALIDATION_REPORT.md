# Auth Validation Report — PetroBook Auth v3
**Date:** 2026-06-29  
**Version:** Auth v3

---

## Test Matrix

### Owner Login

| Scenario | Expected | Root Cause Fixed | Status |
|---|---|---|---|
| Owner login on Device A (first time) | doSetup() → Firebase Auth → company created → dashboard | — | ✅ |
| Owner login on Device B (cross-device) | doLogin() → Firebase Auth → userProfiles/{uid} → companyId → _pbEnsureMemberDoc → _pbFinaliseRestore → dashboard | RCA + RCE + RCSyncEngine | ✅ FIXED |
| Owner login on Device C | Same as Device B | RCA | ✅ FIXED |
| Owner login after browser reinstall | doLogin() → Firebase Auth (persistent session cleared) → full restore | RCA | ✅ FIXED |
| Owner login after cache clear (localStorage cleared) | doLogin() → Firebase Auth → userProfiles/{uid} → fresh restore | RCA | ✅ FIXED |
| Owner login after logout | showRoleLogin() → doLogin() → same as cross-device | — | ✅ |
| Google Sign-In (new user) | doGoogleLogin() → _pbHandleFirebaseUser() → no company → onboarding | — | ✅ |
| Google Sign-In (returning user) | doGoogleLogin() → _pbHandleFirebaseUser() → userProfiles/{uid} → restore | RCA + RCC | ✅ FIXED |
| Email login after Google setup | doLogin() email fails → Firebase Auth sign-in-with-password → restore | — | ✅ |

### Manager Login

| Scenario | Expected | Status |
|---|---|---|
| Manager login with correct password | Path 1: passHash match → _doGrantAccess() | ✅ UNCHANGED |
| Manager login with wrong password | Lockout counter incremented, error shown | ✅ UNCHANGED |
| Manager login on new device | passHash not found → incorrect password error (expected — local auth) | ✅ EXPECTED |
| Manager pump assignment | pumpId from user object → enterManagerMode(pumpId) | ✅ UNCHANGED |
| Manager inactive account | status !== 'active' → "Account is disabled" error | ✅ UNCHANGED |

### Reset Manager Password

| Scenario | Expected | Root Cause Fixed | Status |
|---|---|---|---|
| Owner (Google) resets manager pass | Firebase Auth currentUser match → sessRole check → update passHash | RCC | ✅ FIXED |
| Owner (email) resets manager pass (signed in) | Firebase Auth currentUser match → sessRole check → update passHash | RCC | ✅ FIXED |
| Owner (email) resets manager pass (not signed in) | passHash fallback → update passHash | — | ✅ PRESERVED |

### Company Creation & Restore

| Scenario | Expected | Status |
|---|---|---|
| First doSetup() | Local user created → Firebase Auth create → company doc → member doc → userProfile → companyId cached | ✅ |
| doSetup() when Firebase already exists | Firebase Auth sign-in → userProfile found → existing companyId used | ✅ |
| _pbResolveUserCompany() — userProfile hit | userProfiles/{uid}.companyId → fast path | ✅ |
| _pbResolveUserCompany() — company query hit | companies?ownerUid=uid → slower path | ✅ |
| _pbResolveUserCompany() — legacy fallback | accounts/{uid}/users → migrate + restore | ✅ |
| _pbEnsureMemberDoc() — missing member doc | Write companies/{cid}/members/{uid} via isOwnerOf() rule | ✅ FIXED |
| _pbEnsureMemberDoc() — member doc exists | Read only, no write | ✅ |
| _pbFinaliseRestore() on cross-device | SyncEngine.ACTIVE=true + StorageService.setProvider(SyncEngine) + PB_AuthBridge.activate() | ✅ FIXED |

### Firestore Permissions

| Path | Rule | Expected Result |
|---|---|---|
| companies/{cid} read (owner, no member doc) | resource.data.ownerUid == uid() | ✅ ALLOWED |
| companies/{cid}/members/{uid} write (owner, no member doc) | isOwnerOf(cid) | ✅ ALLOWED (v3) |
| companies/{cid}/members/{uid} read (owner) | isOwnerOf(cid) | ✅ ALLOWED (v3) |
| companies/{cid}/global/config read (owner, no member doc) | isOwnerOf(cid) | ✅ ALLOWED (v3) |
| companies/{cid}/pumps read (owner, no member doc) | isOwnerOf(cid) | ✅ ALLOWED (v3) |
| companies/{cid}/pumps/{pid}/history read (manager, assigned pump) | canAccessCompanyPump() | ✅ ALLOWED |
| companies/{cid}/global/config write (manager) | isOwner() required | ❌ DENIED (correct) |
| userProfiles/{uid} read (same user) | uid() == userId | ✅ ALLOWED |
| userProfiles/{uid} write (same user, no passHash) | uid() == userId && noPassHash() | ✅ ALLOWED |
| userProfiles/{uid} write with passHash | noPassHash() fails | ❌ DENIED (correct) |
| companies/{cid2} read (wrong company) | isMemberOf/isOwnerOf fail | ❌ DENIED (correct) |
| Unmatched path | catch-all deny | ❌ DENIED (correct) |

### Cross-Company Isolation

| Scenario | Expected |
|---|---|
| Owner A reads Owner B's company | DENIED — isOwnerOf(cid) fails (different ownerUid) |
| Manager of company A reads company B | DENIED — isMemberOf(cid) fails (no member doc in B) |
| Owner A queries all companies | Returns only own company (ownerUid filter in query + rules) |

---

## Root Causes Fixed Summary

| ID | Description | Fix Applied |
|---|---|---|
| RCA | `companies/{cid}/users` read caused permission-denied → "Cloud account data not found" | `_pbHandleFirebaseUser()` v3 — no users collection read |
| RCB | `doSetup()` IIFE silent failure | Documented; partial mitigation via `_pbEnsureMemberDoc()` self-heal |
| RCC | `doResetManagerPass()` passHash check broke for Google owners | Firebase Auth current user check added as primary path |
| RCD | Firestore rules missing `isOwnerOf()` on read paths | `|| isOwnerOf(cid)` added to all company sub-collection read rules |
| RCE | `onAuthStateChanged` gated on `pb-sync-active=1` | Always registered unconditionally |
| RCF | `set-claims-ci.js` missing `companyId` claim | Documented; `isOwnerOf()` fallback handles correctly |
| RCSyncEngine | Cross-device restore didn't activate live sync | SyncEngine activation added to `_pbFinaliseRestore()` |

---

## Files Changed

| File | Change |
|---|---|
| `index_standalone.html` | `_pbHandleFirebaseUser()` rewritten (v3); `_pbEnsureMemberDoc()` added; `doResetManagerPass()` fixed; `_pbFinaliseRestore()` extended; `_pbInitStorage()` onAuthStateChanged ungated |
| `firestore.rules` | `isOwnerOf(cid)` added to all company sub-collection read rules |
| `AUTH_DEPENDENCY_REPORT.md` | Generated |
| `SECURITY_REVIEW.md` | Generated |
| `AUTH_VALIDATION_REPORT.md` | This file |
| `FINAL_AUTH_V3_REPORT.md` | Generated |
