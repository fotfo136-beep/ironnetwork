# ⚒️ IRONnetWORK — Deploy Online (Free)

## Option 1: Render.com (Recommended — Easiest)

### Step 1: Get the code on GitHub
1. Go to **https://github.com** → Sign up or log in
2. Click **"New Repository"** (the green button or the + icon)
3. Name it: `ironnetwork`
4. Keep it **Public**
5. Click **"Create repository"**
6. Upload ALL the files from the `ironnetwork/` folder:
   - Click **"uploading an existing file"** link
   - Drag in: `server.js`, `package.json`, `README.md`
   - Create a folder `public/` and upload `public/index.html` and `public/manifest.json`
   - Also create an empty folder `public/uploads/` (add a dummy `.gitkeep` file inside)
   - Click **"Commit changes"**

### Step 2: Deploy on Render
1. Go to **https://render.com** → Sign up with GitHub
2. Click **"New +"** → **"Web Service"**
3. Connect your GitHub repo (`ironnetwork`)
4. Settings:
   - **Name:** `ironnetwork`
   - **Runtime:** `Node`
   - **Build Command:** `npm install`
   - **Start Command:** `node server.js`
   - **Plan:** `Free`
5. Click **"Deploy Web Service"**
6. Wait 2-3 minutes → You'll get a URL like: `https://ironnetwork.onrender.com`

### 🎉 Done! Your app is LIVE at that URL!

---

## Option 2: Railway.app (Also free)

1. Go to **https://railway.app** → Sign up with GitHub
2. Click **"New Project"** → **"Deploy from GitHub Repo"**
3. Select your `ironnetwork` repo
4. Railway auto-detects Node.js and deploys
5. Go to **Settings** → **Networking** → **Generate Domain**
6. Your app is live at `https://ironnetwork.up.railway.app`

---

## Option 3: Glitch.com (Instant — No GitHub needed)

1. Go to **https://glitch.com**
2. Click **"New Project"** → **"hello-express"**
3. Delete all existing files
4. Upload `server.js`, `package.json`
5. Create `public/` folder, upload `index.html` and `manifest.json`
6. Create `public/uploads/` folder
7. It auto-deploys! Click **"Preview"** → **"In a new window"**
8. Your app is live at `https://your-project-name.glitch.me`

---

## Important Notes

- **Free tiers** may sleep after 15 min of inactivity (first load takes ~30 sec to wake up)
- **Database:** SQLite file is stored on the server. On free tiers, it resets on redeploy. For production, upgrade to PostgreSQL.
- **File uploads:** Work on Render/Railway. On Glitch, storage is limited.
- **Custom domain:** All platforms support adding your own domain (ironnetwork.app, etc.)

## After Deploying — Share It!

Send this link to construction workers to test:
```
https://your-app-url.onrender.com
```

They can:
1. Open it on their phone browser
2. Sign up with phone + password
3. Pick their trade
4. Start dropping posts and connecting with crew

No app store needed. Works on any phone. 📱
