# PetroBook

**Fuel Station Management PWA** — Single-file Progressive Web App with Firebase cloud sync.

## Features

- Multi-pump fuel station management (91, 95, Diesel)
- Daily meter readings, expense tracking, stock snapshots
- Transaction ledger with date-range statements
- P&L reports and history
- Multi-role access: Super Owner / Owner / Manager
- PIN + password authentication
- Offline-first architecture (works without internet)
- Firebase Firestore cloud sync with automatic retry
- Bilingual: English / Bengali

## Quick Start

1. Read `FIREBASE_SETUP.md` — create your Firebase project
2. Read `DEPLOYMENT.md` — deploy the app
3. Read `GITHUB_SETUP.md` — set up version control

## Files

| File | Purpose |
|------|---------|
| `index_standalone.html` | The entire application (single file) |
| `firebase.json` | Firebase CLI configuration |
| `firestore.rules` | Firestore security rules |
| `firestore.indexes.json` | Firestore composite indexes |
| `.firebaserc` | Firebase project link |
| `.gitignore` | Files excluded from git |
| `FIREBASE_SETUP.md` | Firebase Console setup guide |
| `GITHUB_SETUP.md` | GitHub repository setup guide |
| `DEPLOYMENT.md` | Complete deployment commands |

## Architecture

```
index_standalone.html (38,969 lines)
├── StorageService          — abstraction layer (localStorage ↔ Firestore)
├── LocalStorageProvider    — offline-first storage
├── FirebaseProvider        — Firestore write-through sync
├── PB_FirestoreWriter      — Firestore write engine
├── PB_QueueReplayEngine    — offline queue replay
├── PB_MigrationPlan        — one-time data migration
├── PB_FirebaseAuth         — Firebase Authentication
├── PB_AuthBridge           — auth event bridge
└── SyncEngine              — sync state controller
```

## Security

- `passHash` (SHA-256 PIN hash) is **never** uploaded to Firestore — stripped at 2 code paths and blocked by Firestore rules
- History records are permanent (delete: false)
- Ledger is append-only (delete: false)
- Role-based access: managers can only access their assigned pump
- All Firestore writes require Firebase Authentication

## License

Private — all rights reserved.
