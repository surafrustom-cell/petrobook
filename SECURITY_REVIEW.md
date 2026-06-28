# Security Review — PetroBook Auth v3
**Date:** 2026-06-29  
**Reviewer:** Auth v3 Security Audit  
**Scope:** Authentication, Authorization, Firestore Rules, Data Isolation

---

## 1. Authentication Security

### Owner Authentication
**Status: SECURE ✅**

- Identity source: Firebase Auth UID only (Google Sign-In or email/password)
- No passHash stored for owners
- No owner password ever stored in Firestore
- No owner credential fallback in localStorage
- Token refresh forced on every login (`getIdTokenResult(true)`)

### Manager Authentication
**Status: SECURE ✅**

- Managers are local-only accounts with no Firebase Auth
- passHash (SHA-256) stored in localStorage only — never in Firestore
- `noPassHash()` rule enforced in ALL Firestore write paths
- Manager credentials isolated per device (intended behavior)

### passHash Security
**Status: SECURE ✅**

- `noPassHash()` Firestore rule: `!('passHash' in request.resource.data)`
- Applied to ALL write rules across accounts/ and companies/ paths
- Verified: no Firestore write path omits this check

---

## 2. Firestore Rules

### Owner Access — v3
**Status: SECURE ✅**

Owners can access their company data via two rule paths:

1. `isMemberOf(cid)` — requires `companies/{cid}/members/{uid}` to exist
2. `isOwnerOf(cid)` — reads `companies/{cid}.ownerUid == uid()` (added in v3)

`isOwnerOf()` does NOT require member doc to exist. This enables:
- Self-healing member doc writes (`_pbEnsureMemberDoc`)
- Cross-device restore without prior member doc

**Security note:** `isOwnerOf()` uses `get()` which counts as a Firestore read. Each rule evaluation that triggers `isOwnerOf()` costs one document read. For high-volume paths, consider setting `companyId` as a custom claim to enable the fast `companyId() == cid` path.

### Company Isolation
**Status: SECURE ✅**

- All company paths scoped under `companies/{cid}/...`
- No cross-company reads possible without correct `cid`
- Owner can only access companies where `ownerUid == uid()`
- No wildcard collection reads permitted

### Manager Access Scope
**Status: SECURE ✅**

- Managers have `isMemberOf(cid)` access only (no `isOwnerOf()`)
- Pump access gated by `canAccessCompanyPump(cid, pid)` which checks `pumpClaim(pid)`
- Managers cannot write to global config (`isOwner()` required)
- Managers cannot delete records

### Privilege Escalation
**Status: SECURE ✅**

- Role from JWT claims only — not from user-supplied data
- `isOwner()` checks `userRole() == 'owner' || 'super_owner'` from token
- Manager cannot self-promote (no write to their own member doc without `isOwnerOf()`)

### Catch-All Deny
**Status: SECURE ✅**

```
match /{document=**} {
  allow read, write: if false;
}
```
All unmatched paths are denied.

---

## 3. Data Storage Security

### localStorage Exposure
**Status: ACCEPTABLE ⚠️**

localStorage stores:
- Session token (role, userId, expiry) — device-specific, short-lived
- User objects (name, email, role) — no passwords for owners
- Company data (config, pumps, readings) — necessary for offline operation
- `pb-company-id` — cache only, validated against Firestore on restore

**Risk:** Device theft could expose business data from localStorage. No encryption at rest.

**Recommendation:** Future enhancement — encrypt sensitive localStorage keys with a device-derived key.

### Firebase Auth Tokens
**Status: SECURE ✅**

- Firebase handles token storage (IndexedDB, httpOnly where possible)
- Token refresh handled automatically by Firebase SDK
- Force-refresh (`getIdTokenResult(true)`) on every login ensures stale claims are not used

---

## 4. Identified Risks

### LOW RISK: `companyId` custom claim not set
The `set-claims-ci.js` sets `{role, accountId, pumpId}` but not `companyId`. The `isMemberOf()` fast path (`companyId() == cid`) never triggers. The slow `exists()` path is used instead, costing an extra Firestore read per rule evaluation.

**No security impact.** Performance impact only.

**Fix:** Add `companyId` to claims in set-claims-ci.js.

### LOW RISK: `doSetup()` IIFE silent failure
If the Firebase company creation IIFE fails silently, the owner has local access but no Firestore company. Cross-device login will fail (no userProfile, no company by ownerUid).

**Impact:** Data loss risk — owner's data not synced to Firestore.

**Mitigation:** `_pbEnsureMemberDoc()` self-heals member doc on subsequent logins. Company doc cannot be self-healed — owner must run setup again.

**Recommendation:** Make doSetup IIFE awaitable and show an error toast on failure.

### LOW RISK: Legacy accounts/ path still active
The legacy `accounts/{uid}/...` path is still used as a fallback in `_pbRestoreLegacyPath()`. Owners with legacy data may still hit this path on first post-migration login.

**No security impact.** The legacy rules are unchanged and secure.

**Recommendation:** After all users have migrated, remove legacy path and rules.

### INFORMATIONAL: Manager passHash in localStorage
Manager passHash is stored in localStorage. On shared devices, a manager's credentials could be extracted by a user with device access.

**Accepted risk** — manager accounts are intentionally device-local. The app is designed for deployment on a dedicated station device.

---

## 5. Constraints Verified

| Constraint | Status |
|---|---|
| passHash must NEVER reach Firestore | ✅ Enforced by noPassHash() on all write rules |
| serviceAccount.json must NEVER be committed | ✅ In .gitignore |
| Do NOT redesign UI | ✅ No UI changes |
| Do NOT change any calculations | ✅ No calculation changes |
| Do NOT remove any existing features | ✅ No features removed |
| Do NOT break existing Firestore sync | ✅ SyncEngine activation preserved and extended |

---

## 6. v3 Security Improvements

| Area | Before v3 | After v3 |
|---|---|---|
| Owner identity source | Firebase Auth + localStorage passHash fallback | Firebase Auth ONLY |
| Cross-device restore | Required companies/{cid}/users read (permission-denied risk) | Firebase Auth UID → userProfile → direct restore |
| Member doc dependency | Hard requirement for all company reads | Soft requirement — isOwnerOf() as fallback |
| doResetManagerPass | Required owner passHash (broke for Google owners) | Firebase Auth current user (primary) + passHash (fallback) |
| SyncEngine on cross-device | Not activated after restore | Activated in _pbFinaliseRestore() |
| onAuthStateChanged | Gated on pb-sync-active=1 | Always registered |
