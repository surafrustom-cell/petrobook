# PetroBook — Firebase Setup Guide
### For someone who has never used Firebase before

This guide walks you through every single click inside Firebase Console.
Each step has a screenshot description so you know exactly what to look for.
Estimated time: 15–20 minutes.

---

## WHAT IS FIREBASE?

Firebase is Google's platform for hosting websites and storing data in the cloud.
PetroBook uses three parts of Firebase:

| Part | What it does |
|------|-------------|
| **Firebase Hosting** | Puts your app on the internet at a web address |
| **Firestore Database** | Stores your station data in Google's cloud |
| **Authentication** | Handles secure login for your staff |

Everything is free up to very high usage limits (thousands of daily users).
You need a Google account (Gmail) to use Firebase.

---

## STEP 1 — GO TO FIREBASE

1. Open your web browser (Chrome recommended)
2. Go to: **https://console.firebase.google.com**
3. If asked to sign in — use your Gmail / Google account
4. You will see the Firebase Console homepage

> If this is your first time, you'll see a welcome screen with a big blue
> "Create a project" button. If you've used Firebase before, you'll see your
> previous projects listed.

---

## STEP 2 — CREATE A NEW PROJECT

1. Click the **"Add project"** card (or the **"Create a project"** button)

2. **Step 1 of 3 — Project name**
   - In the text box, type: `petrobook-prod`
   - Below the name you'll see your **Project ID** auto-generated
     (e.g. `petrobook-prod-a1b2c` — Firebase adds random letters if the name is taken)
   - **Write down your Project ID** — you will need it later
   - Click **Continue**

3. **Step 2 of 3 — Google Analytics**
   - You'll see a toggle for "Enable Google Analytics for this project"
   - Click the toggle to **turn it OFF** (it turns grey)
   - This keeps things simple — analytics is not needed for PetroBook
   - Click **Create project**

4. **Step 3 — Creating...**
   - Firebase creates your project (takes about 30 seconds)
   - A spinning animation appears
   - When it says "Your new project is ready" — click **Continue**

> You are now on your project's homepage inside Firebase Console.
> The left sidebar shows menu items: Build, Release & Monitor, etc.

---

## STEP 3 — SET UP THE DATABASE (FIRESTORE)

1. In the left sidebar, click **Build**
2. A submenu expands — click **Firestore Database**
3. You see a page that says "Cloud Firestore" with a blue **Create database** button
4. Click **Create database**

5. **Security rules dialog appears:**
   - You'll see two options: "Start in production mode" and "Start in test mode"
   - Select **"Start in production mode"**
   - This is correct — PetroBook has its own security rules that get deployed separately
   - Click **Next**

6. **Location selection:**
   - You see a dropdown that says "Cloud Firestore location"
   - Click the dropdown
   - Scroll down and select: **`asia-south1`** (this is Mumbai — closest server for the Middle East/South Asia)
   - Click **Enable**

7. Wait about 30–60 seconds while Firebase creates the database
8. You'll see the Firestore Data page — it will be empty (that's correct)

> Your database is ready. Data will appear here after you run the migration.

---

## STEP 4 — SET UP AUTHENTICATION

1. In the left sidebar, click **Build** → **Authentication**
2. You see a page that says "Authentication" with a **Get started** button
3. Click **Get started**

4. You'll see a list of "Sign-in providers" — things like Google, Email/Password, Phone, etc.
5. Click on **Email/Password** (first item in the list)

6. A panel slides out:
   - You'll see **"Email/Password"** with a toggle on the right
   - Click the toggle to **turn it ON** (it turns blue/green)
   - Leave the "Email link (passwordless sign-in)" toggle OFF
   - Click **Save**

7. You'll return to the provider list
8. **Email/Password** should now show **"Enabled"** with a green dot

> Authentication is ready. You can now create user accounts for your staff.

---

## STEP 5 — REGISTER YOUR WEB APP (GET CREDENTIALS)

Firebase needs to know your app exists before it gives you connection details.

1. Click the **⚙️ gear icon** next to "Project Overview" in the top-left of the sidebar
2. Click **Project settings**
3. Scroll down until you see a section called **"Your apps"**
4. In that section, click the **`</>`** button (it looks like code — it's the Web icon)

5. **Register app form appears:**
   - In the "App nickname" field, type: `petrobook-web`
   - Leave the "Also set up Firebase Hosting" checkbox **unchecked** (we do this separately)
   - Click **Register app**

6. **The important part — your credentials appear:**

   You'll see a block of code that looks like this:
   ```javascript
   const firebaseConfig = {
     apiKey: "AIzaSyABCDEFGHIJKLMNOPQRSTUVWXYZ123456",
     authDomain: "petrobook-prod.firebaseapp.com",
     projectId: "petrobook-prod",
     storageBucket: "petrobook-prod.appspot.com",
     messagingSenderId: "123456789012",
     appId: "1:123456789012:web:abcdef1234567890abcd"
   };
   ```

7. **Copy each value** (the parts inside the quote marks):
   - `apiKey` → copy the long string starting with "AIzaSy..."
   - `authDomain` → copy "yourproject.firebaseapp.com"
   - `projectId` → copy "yourproject" (or whatever your project ID is)
   - `storageBucket` → copy "yourproject.appspot.com"
   - `messagingSenderId` → copy the number (12 digits)
   - `appId` → copy the long string starting with "1:..."

   > **Keep this browser tab open** — you'll need these values in the next step.

8. Click **Continue to console** (you don't need to follow the Firebase SDK setup steps shown)

---

## STEP 6 — PASTE CREDENTIALS INTO THE APP FILE

Now you'll put your real Firebase credentials into `index_standalone.html`.

1. Open **File Explorer** (Windows) or **Finder** (Mac)
2. Navigate to your `READY_FOR_GITHUB` folder
3. Right-click on `index_standalone.html`
4. Choose **Open with** → **Notepad** (Windows) or **TextEdit** (Mac)
   - On Mac with TextEdit: if it opens in rich text mode, go to Format → Make Plain Text

5. Press **Ctrl+F** (Windows) or **Cmd+F** (Mac) to open the Find bar
6. Type `YOUR_API_KEY` and press Enter
7. You'll jump to this section:

   ```javascript
   var FIREBASE_CONFIG = {
     apiKey:            'YOUR_API_KEY',
     authDomain:        'YOUR_PROJECT_ID.firebaseapp.com',
     projectId:         'YOUR_PROJECT_ID',
     storageBucket:     'YOUR_PROJECT_ID.appspot.com',
     messagingSenderId: 'YOUR_SENDER_ID',
     appId:             'YOUR_APP_ID',
   };
   ```

8. Replace each placeholder **including the quote marks** with your real value:
   - `'YOUR_API_KEY'` → `'AIzaSyABCDEFGHIJKLMNOPQRSTUVWXYZ123456'`
   - `'YOUR_PROJECT_ID.firebaseapp.com'` → `'petrobook-prod.firebaseapp.com'`
   - `'YOUR_PROJECT_ID'` → `'petrobook-prod'`
   - `'YOUR_PROJECT_ID.appspot.com'` → `'petrobook-prod.appspot.com'`
   - `'YOUR_SENDER_ID'` → `'123456789012'`
   - `'YOUR_APP_ID'` → `'1:123456789012:web:abcdef1234567890abcd'`

   After editing, it should look like:
   ```javascript
   var FIREBASE_CONFIG = {
     apiKey:            'AIzaSyABCDEFGHIJKLMNOPQRSTUVWXYZ123456',
     authDomain:        'petrobook-prod.firebaseapp.com',
     projectId:         'petrobook-prod',
     storageBucket:     'petrobook-prod.appspot.com',
     messagingSenderId: '123456789012',
     appId:             '1:123456789012:web:abcdef1234567890abcd',
   };
   ```

9. Save the file: **Ctrl+S** (Windows) or **Cmd+S** (Mac)

10. **Verify**: Press Ctrl+F again, search for `YOUR_API_KEY` — should find **zero results**

---

## STEP 7 — EDIT .FIREBASERC

1. In the `READY_FOR_GITHUB` folder, find the file named `.firebaserc`
   - On Windows: you may need to enable "Show hidden files" in File Explorer (View → Hidden items)
   - On Mac: hidden files start with a dot — press Cmd+Shift+. to show them
2. Open `.firebaserc` with Notepad / TextEdit
3. You'll see:
   ```json
   {
     "projects": {
       "default": "YOUR_PROJECT_ID"
     }
   }
   ```
4. Replace `YOUR_PROJECT_ID` with your real project ID (e.g. `petrobook-prod`)
5. Save the file

---

## STEP 8 — ENABLE FIREBASE HOSTING

1. Back in Firefox Console, in the left sidebar click **Build** → **Hosting**
2. Click **Get started**
3. You'll see a setup wizard — you don't need to follow it (the Firebase CLI handles this)
4. Just click **Next** → **Next** → **Continue to console**
5. Hosting is now enabled for your project

---

## STEP 9 — ENABLE PITR BACKUP (STRONGLY RECOMMENDED)

This gives you 7-day recovery for your financial data.

1. Firebase Console → **Firestore Database**
2. Click the **Backups** tab (near the top of the page)
3. If you see a **"Configure PITR"** button, click it and enable it
4. If the tab is not visible yet, wait 5 minutes after creating the database and refresh

---

## STEP 10 — CREATE YOUR STAFF USERS

Add users who will log in to PetroBook.

1. Firebase Console → **Authentication → Users**
2. Click **Add user**
3. Enter the email and password for the first user (the main owner/super_owner)
4. Click **Add user**
5. The user appears in the table — **copy their UID** (click the copy icon next to the UID column)

Repeat for each staff member who needs app access.

> You will set each user's role (super_owner / owner / manager) in the next step
> using the `set-claims.js` script.

---

## WHAT TO DO IF SOMETHING LOOKS DIFFERENT

Firebase updates its interface regularly. If something looks different from this guide:

| If you see... | Look for... |
|---------------|-------------|
| "Spark plan" or upgrade prompts | Stay on Spark — it's free and sufficient |
| A different menu layout | The same items should be under "Build" |
| "Security rules" tab in Firestore | That's the online rules editor — ignore it (we deploy via CLI) |
| A "Blaze plan" requirement | Required only for Cloud Functions — PetroBook doesn't use them |
| "Firebase Studio" instead of "Firebase Console" | Same thing — Firebase renamed their UI |

---

## SUMMARY — WHAT YOU NOW HAVE

After completing this guide:

| What | Status |
|------|--------|
| Firebase project | ✅ Created |
| Firestore database | ✅ Enabled (Production mode, asia-south1) |
| Authentication | ✅ Email/Password enabled |
| Web app registered | ✅ Done |
| Credentials in index_standalone.html | ✅ Done |
| .firebaserc updated | ✅ Done |
| Staff users created | ✅ Done |

**Next step:** Follow `DEPLOY_NOW.md` — it contains the exact terminal commands to push everything live.
