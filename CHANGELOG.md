# PetroBook — Changelog

All notable changes to this project are documented here.
Format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

---

## [1.1.0] — 2026-06-25 — Production Hardening Release

### Fixed — Critical Bugs

- **BUG-001** `SyncEngine._intercept()` was checking the closure-private `ACTIVE`
  variable (always `false`) instead of the public `SyncEngine.ACTIVE` property.
  Result: sync interception never fired after migration cutover. Fixed to read
  `SyncEngine.ACTIVE` at call time.

- **BUG-002** `SyncEngine._cloudWrite()` was a no-op stub — it immediately marked
  every operation as confirmed without writing to Firestore.
  Fixed to route through `PB_FirestoreWriter.enqueue()` + `flush()` when the
  writer is initialised and active.

- **BUG-003** Firestore security rules used `/pumps/{pid}/config`,
  `/pumps/{pid}/snapshot`, and `/pumps/{pid}/fuelHistory` paths.
  The application code (`PB_FIRESTORE_PATHS`) actually writes to
  `/pumps/{pid}/data/config`, `/pumps/{pid}/data/snapshot`, and
  `/pumps/{pid}/data/fuelHistory` (note the `data/` sub-collection).
  Result: all config, snapshot, and fuel-history writes were silently denied
  by the catch-all `allow read, write: if false` rule.
  Fixed `firestore.rules` to match the actual code paths.

- **BUG-004** Migration step `04_pumps` called `PB_FIRESTORE_PATHS.pumps(aid)`
  which returns `accounts/{aid}/pumps` — a collection path (3 segments, odd).
  Firestore only accepts document paths (even segments).
  Fixed to write each pump individually to `PB_FIRESTORE_PATHS.pump(aid, pump.id)`.

- **BUG-005** The boot sequence sync-restore block set `SyncEngine.ACTIVE = true`
  but never called `StorageService.setProvider(SyncEngine)` — so all app writes
  continued going directly to `LocalStorageProvider` with no cloud sync.
  Fixed: `StorageService.setProvider(SyncEngine)` is now called immediately,
  and `PB_FirestoreWriter.init()` is called via `onAuthStateChanged` once the
  user's `accountId` custom claim is available.

- **BUG-006** `SyncEngine.replayQueue()` was not wired to `PB_QueueReplayEngine`.
  Fixed to delegate to `PB_QueueReplayEngine.replayAll()`.

### Fixed — Firestore Rules

- Corrected path patterns for `config`, `snapshot`, `fuelHistory` sub-documents
  (added `data/` intermediate collection segment to match code paths).
- Tightened `records` delete permission: now requires `isOwner()` rather than
  allowing any pump accessor to delete session records.

### Added

- **PWA manifest** (`manifest.json`) — enables "Add to Home Screen" on mobile.
- **Manifest link** in `<head>` of `index_standalone.html`.
- **Content-Security-Policy** header in `firebase.json` — restricts script/connect
  sources to `gstatic.com`, `googleapis.com`, and Firebase domains.
- **Permissions-Policy** header — disables camera, microphone, geolocation, payment.
- **Online reconnect handler** in boot sequence — calls `SyncEngine.replayQueue()`
  automatically when the device comes back online.
- **GitHub Actions CI/CD** (`.github/workflows/firebase-hosting.yml`) — auto-deploys
  production on push to `main`; deploys preview channels for pull requests.

### Improved

- `firestore.indexes.json` — removed redundant single-field indexes (Firestore
  creates these automatically); kept only true composite indexes.
- Added composite indexes for `history` and `records` collections (matching ledger).

---

## [1.0.0] — Initial Production Release

- Complete offline-first PWA: 38,969 lines, single HTML file.
- Multi-pump fuel station management (91, 95, Diesel).
- Daily meter readings, expenses, stock, ledger, P&L reports.
- PIN + password authentication with SHA-256 via Web Crypto API.
- Firebase Firestore cloud sync (activation via migration plan).
- Bilingual: English / Bengali.
- Role system: Super Owner / Owner / Manager.
- Firebase Hosting deployment configuration.
- Firestore security rules: account isolation, role-based access, passHash guard.
