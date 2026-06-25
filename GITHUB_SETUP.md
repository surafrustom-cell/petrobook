# PetroBook — GitHub Setup Guide

---

## Step 1 — Create GitHub Account (if needed)

1. Go to **https://github.com**
2. Click **Sign up**
3. Use your email address
4. Choose a username (example: `suraf-petrobook`)
5. Complete verification → **Create account**

---

## Step 2 — Create the Repository

1. Click the **+** icon (top right) → **New repository**
2. Repository name: `petrobook`
3. Select **Private** *(your financial data app — keep it private)*
4. Do **NOT** check "Add a README" — the package includes one
5. Click **Create repository**
6. Copy the repository URL shown (example: `https://github.com/yourusername/petrobook`)

---

## Step 3 — Install Git (if needed)

### Windows
Download from: **https://git-scm.com/download/win**
Install with default settings.

### Mac
Git is usually pre-installed. Open Terminal and type:
```bash
git --version
```
If not installed, it will prompt you to install it.

---

## Step 4 — Upload PetroBook Files

Open **Terminal** (Mac) or **Command Prompt** (Windows).

Navigate to the folder where you extracted `petrobook-prod-deployment.zip`:

```bash
cd /path/to/petrobook-prod-deployment
```

Run these commands one at a time:

```bash
# 1. Initialise git in the folder
git init

# 2. Add the remote repository
git remote add origin https://github.com/YOUR_USERNAME/petrobook.git

# 3. Stage all files
git add .

# 4. Create the first commit
git commit -m "PetroBook v1.0 — Firebase production deployment"

# 5. Push to GitHub
git branch -M main
git push -u origin main
```

When prompted, enter your GitHub **username** and **personal access token** (not your password).

### How to get a Personal Access Token

1. GitHub → click your profile photo → **Settings**
2. Scroll to bottom → **Developer settings**
3. **Personal access tokens → Tokens (classic)**
4. **Generate new token (classic)**
5. Name: `petrobook-deploy`
6. Expiration: 90 days
7. Scopes: check **repo**
8. Click **Generate token**
9. Copy the token (starts with `ghp_`) — you won't see it again

---

## Step 5 — Branch Strategy

```
main          ← Production only. Firebase deploys from here.
develop       ← Testing and development.
feature/xxx   ← Individual feature work.
```

Create the develop branch:
```bash
git checkout -b develop
git push -u origin develop
```

**Rule:** Never push untested changes directly to `main`.

---

## Step 6 — Protect the main branch (recommended)

1. GitHub → your repository → **Settings → Branches**
2. Click **Add branch protection rule**
3. Branch name pattern: `main`
4. Check **Require a pull request before merging**
5. Click **Create**

This prevents accidental overwrites of production code.

---

## Step 7 — Future Updates

When you make changes to `index_standalone.html`:

```bash
git checkout develop
# make changes...
git add index_standalone.html
git commit -m "Description of change"
git push

# When ready for production:
git checkout main
git merge develop
git push
firebase deploy --only hosting
```

---

## Security Note

The `.gitignore` file in this package excludes:
- `*.PRE_*.html` backup files
- `node_modules/`
- `service-account*.json`
- `.env` files

If your Firebase credentials (`apiKey` etc.) are inside `index_standalone.html`, make sure your repository is set to **Private**.
