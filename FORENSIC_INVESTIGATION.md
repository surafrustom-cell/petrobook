# PetroBook — Forensic Investigation Report

**Date:** 2026-06-29
**Status:** Code-only analysis complete. Live data collection pending deployment.
**Objective:** Determine the exact source of cross-device data staleness. No code changes made.

---

## PART 1 — IMPLEMENTATION VERIFICATION

All Phase 6 code changes confirmed present in `index_standalone.html`:

| Component | Status | Lines |
|---|---|---|
| `window.pbDataForensics()` | PRESENT | 29516, 29613 |
| `SyncEngine._cloudWrite` Phase 6 logic | PRESENT | `[QUEUE CONFIRMED]` at 12763, 12793, 12836 |
| `PB_FirestoreWriter.flush()` `verify_fail` | PRESENT | 14083–14099 |
| `PB_QueueReplayEngine.replayOne()` fresh LS reads | PRESENT | 13620–13630 |
| `PB_RESTORE_IN_PROGRESS` lock | PRESENT | Set 29174, released 29395 |
| `[DATA VERIFY]` timestamp logs | PRESENT | 29299–29317 |
| `===== DATA AUDIT =====` report | PRESENT | 29477–29493 |

---

## PART 2 — DEPLOYMENT BLOCKER

`.git/index.lock` is a stale 0-byte lock file (created 2026-06-28 20:23) that blocks all git write operations. The sandbox cannot delete it due to NTFS permissions.

### Run in PowerShell from the petrobook folder:

```powershell
cd "C:\Users\Suraf Rustom\OneDrive\Almana petrol\OneDrive\Documents\GitHub\petrobook"
Remove-Item -Force ".git\index.lock"
git add index_standalone.html
git commit -m "forensic: Phase 6 fixes + pbDataForensics audit function"
git push origin main
```

Wait for GitHub Actions CI to deploy, then continue to Part 4.

---

## PART 3 — CODE FINDINGS (Static Analysis Only)

### Finding 1 — `_syncedAt` is deleted before every localStorage write (CONFIRMED)

**`_pbFinaliseRestore` (lines 29309–29311):**
```javascript
var snap = Object.assign({}, sd.data());
delete snap._syncedAt;   // ← deleted
delete snap._v;
StorageService.saveStock(snap, pid);  // localStorage gets no _syncedAt
```

**`writeSnapshot()` (lines 37596–37600):**
```javascript
StorageService.saveStock({
  grand, cash, bank, sale, stockVal,
  date: _todayStr(),
  at: Date.now()   // ← uses 'at', not '_syncedAt'
});
```

**Impact:** The `[DATA VERIFY]` guard checks `lsUpdated = localStorage._syncedAt` — but localStorage snapshots NEVER contain `_syncedAt`. This guard will always show `lsUpdated=(none)` and will NEVER warn that localStorage is newer than Firestore. The defensive check is permanently blind.

---

### Finding 2 — Snapshot throttle with NO periodic replay timer (CONFIRMED)

**Throttle in `PB_FirestoreWriter.enqueue()` (line 14031):**
```javascript
if (op.type === 'saveStock' && op.pumpId && _isSnapThrottled(op.pumpId)) {
  _stats.skipped++;
  return { status: 'throttled' };  // op NOT added to _queue
}
```
`SNAP_THROTTLE_MS = 10000` — one snapshot per pump per 10 seconds maximum.

**`_cloudWrite` handling (line 12856):**
```javascript
} else if (result && result.status === 'throttled') {
  // QueueManager op stays pending
  console.log('[QUEUE ADD] ...throttled... Will retry via replayQueue.');
  // NO markConfirmed, NO markFailed — op stays in QueueManager forever
}
```

**`replayAll` is called at only two one-shot moments:**
- `onAuthStateChanged` fires after login (lines 40069, 40104) — once per session
- `_pbFinaliseRestore` completes (line 29463) — once per login

**No `setInterval` anywhere calls `replayQueue` or `replayAll`.** All four `setInterval` calls are: auth monitor (16662), phase guard monitor (18744), scroll-lock watchdog (36449), counter animation (37715). None call the sync queue.

**`PB_OfflineSync` online handler is explicitly commented out (lines 14332–14345):**
```javascript
// PHASE 5: Uncomment to activate.
// _onlineHandler = function () {
//   SyncEngine.replayQueue();   ← DISABLED
// };
```

**Impact:** If Device A saves a snapshot within 10 seconds of a previous snapshot save, the second write is throttled and not queued in `PB_FirestoreWriter`. The QueueManager op stays pending with no timer to retry it. If the user closes the tab before manually triggering another action that causes a page reload, the latest snapshot is **permanently lost from Firestore**.

---

### Finding 3 — Stale-read paths post-restore (SAFE — guarded)

`switchToPump()`, `enterManagerMode()`, `enterOwnerMode()` all call `loadCFG()`, `loadCarryForward()`, `loadSession()` — but only AFTER `_doGrantAccess()`, which runs INSIDE the `PB_RESTORE_IN_PROGRESS` window. By the time these run, `_pbFinaliseRestore` has already written Firestore-fresh data to localStorage. These reads are safe.

`DOMContentLoaded` (line 28961) calls `loadCFG()`, `loadSession()` at page parse time before login — overwritten by the restore. Safe.

---

## PART 4 — BROWSER CONSOLE COMMANDS

After deploying, log in on each device and open DevTools (F12 → Console).

### On Device A — run immediately after saving data:

```javascript
// How many ops are stuck in QueueManager?
QueueManager.pendingCount()

// How many ops are in PB_FirestoreWriter's internal queue?
PB_FirestoreWriter.getQueueDepth()

// Full write stats (check 'skipped' count — that's throttled snapshots):
PB_FirestoreWriter.getStats()

// Full localStorage vs Firestore comparison:
window.pbDataForensics()
```

**Key thing to check:** If `QueueManager.pendingCount() > 0` but `PB_FirestoreWriter.getQueueDepth().pending === 0`, then ops are stuck in QueueManager with no corresponding entry in the FW queue — that is the throttle dead-end confirmed.

### On Device B — run immediately after login:

```javascript
// Run before touching anything:
window.pbDataForensics()
```

**Also read the console output from the restore** — look for:

```
[DATA VERIFY] snapshot pid=p1 fsUpdated=... lsUpdated=...
[DATA SOURCE] Firestore — pumps/p1/data/snapshot cash=... bank=...
===== DATA AUDIT =====
```

---

## PART 5 — EXPECTED OUTPUT FORMAT

`window.pbDataForensics()` will print:

```
[FORENSICS] Starting. account=abc123 base=companies/abc123 pumps=["p1"]

===== FORENSIC REPORT =====
Pump: p1
---
LOCAL SNAPSHOT:     cash=1500  bank=200  sale=1700  _syncedAt=(absent)
FIRESTORE SNAPSHOT: cash=500   bank=100  sale=600   _syncedAt=2025-06-28T09:00:00Z
MATCH: NO ✗  ← MISMATCH
---
LOCAL SESSION:     { ... today's entries ... }
FIRESTORE SESSION: (DOC MISSING — fresh day)
MATCH: N/A
---
LOCAL CONFIG:     _syncedAt=(none)
FIRESTORE CONFIG: _syncedAt=2025-06-27T08:00:00Z
MATCH: NO ✗  ← MISMATCH
---
LOCAL HISTORY:     5 date entries in localStorage
FIRESTORE HISTORY: 3 documents in collection
MATCH: COUNT DIFFERS: local=5 firestore=3
---
QUEUE MANAGER:    pending=2 failed=0
FIRESTORE WRITER: queue=0 pending=0 dead=0
===========================
```

---

## PART 6 — THE FIVE FORENSIC QUESTIONS

Collect output from both devices and answer:

1. **Is Firestore holding the newest data?**
   - Check `FIRESTORE SNAPSHOT: cash=` on Device B's forensic output
   - Does it match what Device A shows on screen?
   - If NO → write bug confirmed

2. **Is localStorage newer than Firestore?**
   - Check `LOCAL SNAPSHOT: cash=` vs `FIRESTORE SNAPSHOT: cash=` on Device B
   - If LOCAL > FIRESTORE → write never reached Firestore from Device A
   - If LOCAL = FIRESTORE → restore bug (restore didn't apply Firestore data to memory)

3. **Which exact document/path diverges first?**
   - Look for first `MATCH: NO ✗` line
   - SNAPSHOT → `companies/{aid}/pumps/p1/data/snapshot`
   - SESSION → `companies/{aid}/pumps/p1/records/{today}`
   - CONFIG → `companies/{aid}/pumps/p1/data/config`
   - HISTORY → `companies/{aid}/pumps/p1/history/{date}`

4. **Is the bug in the WRITE flow or RESTORE flow?**
   - FIRESTORE has old value AND LOCAL on Device A has new value → **WRITE BUG**
   - FIRESTORE has new value AND Device B screen shows old value → **RESTORE BUG**
   - FIRESTORE has old value AND Device B screen matches FIRESTORE → WRITE BUG confirmed

5. **What is the single root cause?**
   - Check Device A console for: `[QUEUE ADD] saveStock throttled`
   - Check Device A: `QueueManager.pendingCount()` > 0 with `PB_FirestoreWriter.getQueueDepth().total === 0`
   - If both true: **Hypothesis D confirmed** — throttle dead-end, no periodic replay

---

## PART 7 — HYPOTHESIS RANKING

### Hypothesis D — Snapshot throttle with no replay timer
**Classification: CONFIRMED by static analysis**

Code proof:
- `SNAP_THROTTLE_MS = 10000` (line 13886)
- `enqueue()` returns `throttled` without writing to `_queue` (line 14031–14034)
- `_cloudWrite` leaves QueueManager op pending with no retry mechanism (line 12856)
- No `setInterval` anywhere drives periodic replay
- `PB_OfflineSync` online handler is commented out (lines 14332–14345)
- `replayAll` is one-shot at login only

**This is the most likely cause of the symptom.**

---

### Hypothesis C — `_syncedAt` deleted, DATA VERIFY guard is blind
**Classification: CONFIRMED by static analysis**

Code proof:
- `writeSnapshot()` writes `at` not `_syncedAt` (line 37598)
- `_pbFinaliseRestore` deletes `_syncedAt` before every `StorageService.save*()` call (lines 29231, 29275, 29310, 29340, 29355)
- `[DATA VERIFY]` reads `_lsSnapData._syncedAt` — always `undefined` → always `(none)`

**Does not directly cause staleness but blinds the defensive guard.**

---

### Hypothesis A — Write never durably reaches Firestore
**Classification: POSSIBLE (caused by Hypothesis D)**

If the throttle dead-end is active, the write path is broken. BUG-W3 (markConfirmed without Firestore confirm) has been fixed. Cannot fully confirm without live output.

---

### Hypothesis B — Restore reads wrong data from Firestore
**Classification: UNLIKELY**

`_pbFinaliseRestore` unconditionally overwrites localStorage with Firestore data when the doc exists. The restore lock prevents stale overrides. The bug would only appear here if Hypothesis A is also true (Firestore doesn't have new data).

---

## PART 8 — MOST LIKELY ROOT CAUSE

**Hypothesis D — Snapshot throttle creates a write dead-end with no recovery path**

Failure sequence:
1. Device A saves data → `writeSnapshot()` → `_cloudWrite(saveStock)`
2. `PB_FirestoreWriter.enqueue()`: was a snapshot saved in the last 10s? YES → returns `throttled`
3. Op NOT added to `PB_FirestoreWriter._queue`
4. QueueManager op stays `pending`
5. No timer exists to retry
6. Device A user closes the app
7. Firestore still has old snapshot
8. Device B logs in → `_pbFinaliseRestore` reads Firestore → restores old snapshot → shows stale data

---

## PART 9 — HOW TO SEND RESULTS BACK

After running console commands on both devices:

1. In Chrome DevTools → right-click console → "Save as..." → save full log as `.txt`
2. OR copy all output containing:
   - `===== FORENSIC REPORT =====` blocks from `pbDataForensics()`
   - Any `[QUEUE ADD] saveStock throttled` lines from Device A
   - The `===== DATA AUDIT =====` block printed at restore time
   - Values of `QueueManager.pendingCount()` and `PB_FirestoreWriter.getQueueDepth()`
   - `PB_FirestoreWriter.getStats().skipped` count from Device A

Paste the output and all 5 forensic questions can be answered definitively.

---

*This document is read-only analysis. Zero lines of application code were modified during this investigation.*
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                