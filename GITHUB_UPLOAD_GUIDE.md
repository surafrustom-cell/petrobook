# PetroBook — GitHub Upload Guide
### How to put your code on GitHub and connect it to Firebase

GitHub stores your code safely and enables automatic deployment:
every time you push an update, Firebase re-deploys the app automatically.

---

## METHOD A — UPLOAD VIA WEBSITE (Easiest — no Git knowledge needed)

### Step 1 — Create a GitHub account (if you don't have one)

1. Go to **https://github.com**
2. Click **Sign up**
3. Enter your email, create a password, choose a username
4. Verify your email address

### Step 2 — Create a new repository

1. Sign in to **https://github.com**
2. Click the **+** button in the top-right corner
3. Click **New repository**
4. Fill in the form:
   - **Repository name:** `petrobook`
   - **Description:** `PetroBook Fuel Station Management`
   - **Visibility:** Select **Private** (your financial data should not be public)
   - Leave all other options at their defaults
5. Click **Create repository**

6. Your repository is created. You'll see an empty page with setup instructions.

### Step 3 — Prepare your files for upload

Before uploading, check these files are ready:
- `index_standalone.html` — has real Firebase credentials (no `YOUR_*` placeholders)
- `.firebaserc` — has your real project ID

**Do NOT upload:**
- `admin-scripts/serviceAccount.json` — contains your private key (delete it first)
- `index_standalone.html.bak_audit` — backup file (can be deleted)
- Any file ending in `.bak`

### Step 4 — Upload files via GitHub website

1. On your empty repository page, click **"uploading an existing file"** link
   (or drag and drop files directly onto the page)

2. Open your `READY_FOR_GITHUB` folder in File Explorer / Finder

3. Select all files and folders:
   - On Windows: Ctrl+A to select all, then drag to the GitHub page
   - On Mac: Cmd+A to select all, then drag to the GitHub page

   > **Important:** GitHub's web uploader doesn't handle subfolders well.
   > You'll need to upload the `.github/workflows/` folder contents separately.
   > See the note below about folder structure.

4. In the **"Commit changes"** section at the bottom:
   - In the first text box, type: `Initial upload — PetroBook v1.1.0`
   - Leave the second box empty
   - Make sure **"Commit directly to the main branch"** is selected

5. Click **Commit changes**

> **Note on .github/workflows/ folder:**
> GitHub's web uploader may not handle nested folders (.github/workflows/).
> After uploading everything else, use the "Create new file" button to create
> `.github/workflows/firebase-hosting.yml` manually by copy-pasting its contents.

---

## METHOD B — GITHUB DESKTOP (Recommended — handles folders properly)

GitHub Desktop is a free app that makes it easy to push code without using the terminal.

### Step 1 — Install GitHub Desktop

1. Go to **https://desktop.github.com**
2. Download for your operating system
3. Install and open GitHub Desktop
4. Click **Sign in to GitHub.com** and enter your GitHub credentials

### Step 2 — Create repository in GitHub Desktop

1. In GitHub Desktop, click **File → New Repository**
2. Fill in:
   - **Name:** `petrobook`
   - **Local path:** Choose a folder on your computer (e.g. Documents)
   - Leave other settings as default
3. Click **Create repository**

### Step 3 — Copy your files into the repository folder

1. GitHub Desktop shows you the repository folder path near the top
2. Open that folder in File Explorer / Finder
3. Copy ALL files from `READY_FOR_GITHUB/` into this folder
   - Include hidden files: `.firebaserc`, `.gitignore`, `.github/` folder
   - On Windows: View → Hidden items to see files starting with `.`
   - On Mac: Cmd+Shift+. to show hidden files

### Step 4 — Commit the files

1. Return to GitHub Desktop
2. You'll see all the new files listed on the left side
3. At the bottom-left:
   - **Summary (required):** `Initial upload — PetroBook v1.1.0`
   - Leave Description empty
4. Click **Commit to main**

### Step 5 — Publish to GitHub

1. Click **Publish repository** button (top of the window)
2. Make sure **"Keep this code private"** is checked ✓
3. Click **Publish repository**
4. Your code is now on GitHub!

### Step 6 — Future updates

Whenever you change `index_standalone.html`:
1. Replace the file in the repository folder
2. GitHub Desktop will show the file as "Modified" (1 changed file)
3. Write a commit message: `Update: description of what changed`
4. Click **Commit to main**
5. Click **Push origin** (top of window)
6. Firebase automatically deploys the update within 2 minutes

---

## METHOD C — TERMINAL / COMMAND LINE (For technical users)

```bash
# Navigate to your READY_FOR_GITHUB folder
cd /path/to/READY_FOR_GITHUB

# Initialize git
git init

# Add your GitHub repository as remote (replace YOUR_USERNAME)
git remote add origin https://github.com/YOUR_USERNAME/petrobook.git

# Add all files
git add .

# Create first commit
git commit -m "Initial upload — PetroBook v1.1.0"

# Set main as the default branch
git branch -M main

# Push to GitHub
git push -u origin main
```

---

## STEP — ADD GITHUB SECRETS FOR AUTOMATIC DEPLOYMENT

For the CI/CD workflow to work (auto-deploy when you push), you need to add two secrets to GitHub.

**What is a secret?** A secret is a password or key stored safely in GitHub — it never appears in your code.

### Add the secrets:

1. Go to your GitHub repository page: `https://github.com/YOUR_USERNAME/petrobook`
2. Click **Settings** (tab at the top)
3. In the left sidebar, click **Secrets and variables** → **Actions**
4. Click **New repository secret**

**Secret 1:**
- Name: `FIREBASE_SERVICE_ACCOUNT`
- Value: Open your `serviceAccount.json` file in Notepad, select ALL text (Ctrl+A), copy it, paste here
- Click **Add secret**

**Secret 2:**
- Name: `FIREBASE_PROJECT_ID`
- Value: Your Firebase project ID (e.g. `petrobook-prod`) — just the ID, no quotes
- Click **Add secret**

You should now have 2 secrets listed.

---

## CONNECT FIREBASE HOSTING TO GITHUB (Optional — enables preview links)

This step enables Firebase to post a preview URL as a comment on every Pull Request.

1. Firebase Console → **Hosting**
2. Click **Connect to GitHub** (or look for GitHub integration settings)
3. Authorize Firebase to access your GitHub account
4. Select your `petrobook` repository
5. Follow the prompts to connect

> This step is optional. Even without it, the CI/CD workflow deploys correctly.
> You only need this if you want preview links on Pull Requests.

---

## VERIFY GITHUB CI/CD IS WORKING

After your first push to `main`:

1. Go to your repository on GitHub: `https://github.com/YOUR_USERNAME/petrobook`
2. Click the **Actions** tab
3. You should see a workflow run called "Deploy PetroBook to Firebase Hosting"
4. Click it to see the steps:
   - ✅ Checkout repository
   - ✅ Setup Node.js
   - ✅ Install Firebase CLI
   - ✅ Write service account credentials
   - ✅ Deploy Firestore rules and indexes
   - ✅ Deploy Firebase Hosting
   - ✅ Cleanup credentials

If any step shows a red ✗:
- Click the failed step to see the error message
- Most common issue: secrets not set up correctly (re-check Step "Add GitHub Secrets")

---

## FILE STRUCTURE ON GITHUB

After uploading, your repository should look like this:

```
petrobook/  (repository root)
├── index_standalone.html
├── firebase.json
├── firestore.rules
├── firestore.indexes.json
├── manifest.json
├── .firebaserc
├── .gitignore
├── CHANGELOG.md
├── DEPLOY_NOW.md
├── DEPLOYMENT.md
├── FINAL_DEPLOYMENT_CHECKLIST.md
├── FIREBASE_SETUP_GUIDE.md
├── FIREBASE_SETUP.md
├── GITHUB_SETUP.md
├── GITHUB_UPLOAD_GUIDE.md
├── README.md
├── admin-scripts/
│   ├── set-claims.js
│   ├── package.json
│   └── .gitignore
└── .github/
    └── workflows/
        └── firebase-hosting.yml
```

**Files that should NOT appear in your repository:**
- `serviceAccount.json` (anywhere)
- `*.bak` files
- `node_modules/` folders
- `.env` files

If you see any of these, delete them from GitHub immediately.
