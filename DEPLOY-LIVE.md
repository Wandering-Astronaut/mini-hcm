# Deploy Mini HCM to a live URL (step-by-step)

You need **two** hosts:

| Part | Where | URL example |
|------|--------|-------------|
| React app | **Firebase Hosting** | `https://mini-hcm-timetracking.web.app` |
| Express API | **Render** (free) | `https://mini-hcm-api.onrender.com` |

Punch in/out only works when **both** are live and connected.

---

## Part A — Backend on Render (~10 min)

### 1. Push code to GitHub

If the project is not on GitHub yet:

```bash
cd mini-hcm
git init
git add .
git commit -m "Prepare for deployment"
# Create a repo on github.com, then:
git remote add origin https://github.com/YOUR_USER/mini-hcm.git
git push -u origin main
```

### 2. Create Render web service

1. Go to [https://dashboard.render.com](https://dashboard.render.com) and sign up (free).
2. **New +** → **Web Service**.
3. Connect your GitHub repo `mini-hcm`.
4. Settings:
   - **Name:** `mini-hcm-api` (or any name — note the URL)
   - **Root Directory:** `backend`
   - **Runtime:** Node
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
   - **Instance type:** Free

### 3. Environment variables on Render

Open your service → **Environment** → add:

| Key | Value |
|-----|--------|
| `FIREBASE_SERVICE_ACCOUNT` | Open `backend/service-account.json`, copy **entire file**, paste as **one line** (minified JSON). No extra quotes. |
| `FRONTEND_URL` | `https://mini-hcm-timetracking.web.app` (use your real Hosting URL after Part B; you can update this later) |

Click **Save Changes** → Render redeploys.

### 4. Test the API

Open in browser:

`https://YOUR-SERVICE.onrender.com/api/health`

You should see: `{"status":"ok"}`

**Copy this URL** — you need it for the frontend (`VITE_API_URL`).

> Free Render apps sleep after ~15 min idle. First request may take 30–60 seconds to wake up.

---

## Part B — Firebase (rules + Hosting)

### 1. Install Firebase CLI (once)

```powershell
npm install -g firebase-tools
firebase login
```

### 2. Link project (already in `.firebaserc`)

```powershell
cd C:\Users\Joshua\Downloads\mini-hcm
firebase use mini-hcm-timetracking
```

### 3. Deploy Firestore rules and indexes

```powershell
firebase deploy --only firestore:rules
firebase deploy --only firestore:indexes
```

Wait until indexes show **Enabled** in [Firebase Console → Firestore → Indexes](https://console.firebase.google.com).

### 4. Auth: allow your live domain

1. [Firebase Console](https://console.firebase.google.com) → **Authentication** → **Settings** → **Authorized domains**.
2. Ensure these exist (add if missing):
   - `mini-hcm-timetracking.web.app`
   - `mini-hcm-timetracking.firebaseapp.com`

### 5. Production frontend env

```powershell
copy frontend\.env.local frontend\.env.production
```

Edit `frontend/.env.production` — add (use your **Render** URL from Part A):

```
VITE_API_URL=https://mini-hcm-api.onrender.com
```

No trailing slash. Keep all `VITE_FIREBASE_*` lines from `.env.local`.

### 6. Build and deploy Hosting

```powershell
cd frontend
npm run build
cd ..
firebase deploy --only hosting
```

Your app URL:

**https://mini-hcm-timetracking.web.app**

### 7. Update Render CORS (if you skipped earlier)

Render → Environment → set `FRONTEND_URL` to exactly:

`https://mini-hcm-timetracking.web.app`

Save and wait for redeploy.

---

## Part C — Admin user on production

1. Open your live URL → **Register**.
2. Firebase Console → **Firestore** → `users` → your document → set `role` to `"admin"`.
3. Sign out and sign in again → open **Admin** panel.

---

## Smoke test on live URL

1. Register / login
2. Punch in → punch out (wait for Render if cold start)
3. Dashboard KPIs update
4. History shows the row
5. Admin → edit a punch → invalid times show error → save valid times

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| Login works locally but not on live URL | Add Hosting domain under Auth → Authorized domains |
| Punch: “Cannot reach the API” | `VITE_API_URL` wrong or missing — rebuild frontend after fixing `.env.production` |
| CORS error in browser console | `FRONTEND_URL` on Render must match Hosting URL exactly (https, no trailing slash) |
| `FIREBASE_SERVICE_ACCOUNT` error on Render | Paste full JSON from service account file as one line |
| Firestore permission denied | Run `firebase deploy --only firestore:rules` |
| Slow first punch | Render free tier waking up — wait ~1 min and retry |

---

## Re-deploy after code changes

```powershell
# Frontend only
cd frontend
npm run build
cd ..
firebase deploy --only hosting

# Backend: push to GitHub — Render auto-deploys
git push
```
