# Mini HCM — Time Tracking System

A lightweight Human Capital Management (HCM) app for employee attendance: punch in/out, automatic hour calculations (regular, overtime, night differential, late, undertime), daily summaries, dashboards, history, and an admin panel. Built with **React**, **Node.js/Express**, and **Firebase** (free tier).

## Quick start (local)

```bash
cd mini-hcm
npm install
# configure frontend/.env.local and backend/service-account.json (see Setup)
npm run dev
```

Open http://localhost:3000 — punch in/out requires **both** servers (see terminal for `[api]` on `:5000` and `[web]` on `:3000`).

### Go live (reviewers / production URL)

**Step-by-step:** see **[DEPLOY-LIVE.md](./DEPLOY-LIVE.md)** — Firebase Hosting (frontend) + Render (free API).

Quick outline: deploy backend → set `VITE_API_URL` in `frontend/.env.production` → `npm run deploy:hosting` → add Auth authorized domains → promote admin in Firestore.

---

## Activity requirements compliance

| Requirement | Status | Implementation |
|-------------|--------|----------------|
| Firebase Auth (email/password) | ✅ | `AuthContext.jsx`, Login/Register pages |
| User profile in Firestore (name, email, role, timezone) | ✅ | `users/{uid}` on register |
| `schedule: { start, end }` on each user | ✅ | Register page + used in metrics |
| Punch In / Punch Out UI | ✅ | `PunchClock.jsx` |
| Attendance in Firestore with timestamp + user ID | ✅ | `attendance` collection (`uid`, `punchIn`, `punchOut`, …) |
| Regular, OT, ND (22:00–06:00), late, undertime | ✅ | `backend/src/utils/timeCompute.js` (server) |
| Daily totals in `dailySummary` | ✅ | `backend/src/utils/dailySummary.js` on punch-out & admin edit |
| Dashboard with KPIs + breakdown | ✅ | `DashboardPage.jsx`, `MetricCard`, weekly chart |
| History table with all metrics | ✅ | `HistoryPage.jsx` |
| Admin: view/edit punches | ✅ | `AdminPage.jsx` daily records tab |
| Admin: daily reports (all metrics) | ✅ | Daily records table |
| Admin: weekly reports (all metrics) | ✅ | Weekly report tab |
| React + Node/Express + Firebase | ✅ | See tech stack below |
| Server-side computation (Express or Functions) | ✅ | Punch in/out and admin edits call **Express**; server computes metrics and writes via **Firebase Admin SDK** |

**Architecture:** React handles auth UI and **read-only** Firestore listeners. All attendance writes and metric calculation go through `POST /api/attendance/*` and `PUT /api/reports/attendance/:id`. Firestore rules block direct client writes to `attendance` and `dailySummary`.

---

## Tech stack

| Layer | Technology |
|-------|------------|
| Frontend | React 18, Vite, Tailwind CSS, Recharts |
| Backend | Node.js, Express (ES modules) |
| Auth | Firebase Authentication |
| Database | Cloud Firestore |
| Hosting | Firebase Hosting (`firebase.json`) |

---

## Features

- **Registration & login** — Email/password, timezone, shift schedule (15-minute time picker)
- **Punch in / punch out** — Via Express API; live clock; server-side metrics
- **Automatic metrics** — Regular, OT, ND, late, undertime, total
- **Daily summary** — Aggregated per day in `dailySummary`
- **Dashboard** — KPI cards, weekly bar chart, daily breakdown (refreshes after punch-out)
- **History** — This week, 7 / 14 / 30 days
- **Admin panel** — Edit punches, daily records, weekly per-employee totals

---

## Project structure

```
mini-hcm/
├── frontend/
│   ├── .env.example          # Template → copy to .env.local
│   ├── public/logo.svg
│   ├── index.html
│   ├── vite.config.js        # Port 3000, /api → backend proxy
│   └── src/
│       ├── App.jsx
│       ├── components/
│       │   ├── dashboard/    # PunchClock, MetricCard, WeeklyChart
│       │   └── shared/       # AppShell, ScheduleTimePicker
│       ├── context/AuthContext.jsx
│       ├── hooks/useAttendance.js
│       ├── lib/
│       │   ├── firebase.js
│       │   └── api.js          # Authenticated fetch to Express
│       ├── pages/            # Login, Register, Dashboard, History, Admin
│       ├── styles/globals.css
│       └── utils/
│           ├── timeCompute.js
│           └── timezone.js
├── backend/
│   ├── .env.example          # Template → copy to .env
│   ├── service-account.json  # Gitignored — from Firebase Console
│   └── src/
│       ├── index.js
│       ├── firebase-admin.js
│       ├── middleware/auth.js
│       ├── routes/attendance.js, reports.js
│       └── utils/
│           ├── timeCompute.js
│           ├── dailySummary.js
│           └── punchTimes.js
├── firebase.json             # Hosting + Firestore rules/indexes
├── firestore.rules
├── firestore.indexes.json
├── package.json              # Root workspace: npm run dev
└── README.md
```

---

## Computation logic

| Metric | Rule |
|--------|------|
| **Regular** | Work within scheduled shift window |
| **Overtime** | Work after scheduled end |
| **Night diff (ND)** | Minutes between **22:00** and **06:00** |
| **Late** | `max(0, punchIn − scheduleStart)` |
| **Undertime** | `max(0, scheduleEnd − punchOut)` only if you worked during the scheduled window and left before shift end (not for punches entirely before/after shift) |

Overnight shifts: if `scheduleEnd ≤ scheduleStart`, end time is treated as the next calendar day.

---

## Prerequisites

- Node.js 18+
- Firebase project (Spark/free tier)
- Firebase CLI (`npm install -g firebase-tools`)

---

## Setup

### 1. Firebase project

1. Create a project at [Firebase Console](https://console.firebase.google.com).
2. Enable **Authentication → Email/Password**.
3. Create **Firestore** (production mode is fine).
4. Add a **Web app** and copy config values.
5. **Service accounts** → Generate private key → save as `backend/service-account.json`.

### 2. Environment variables

Templates are committed; secrets stay local:

```bash
cp frontend/.env.example frontend/.env.local
cp backend/.env.example backend/.env
```

Fill `frontend/.env.local` with your Firebase web config. Set `backend/.env` (`PORT`, `FRONTEND_URL`). Never commit `.env.local`, `.env`, or `service-account.json`.

### 3. Install dependencies

From the **project root** (`mini-hcm/`):

```bash
npm install
```

This installs `concurrently` and workspace packages. Required before `npm run dev`.

### 4. Deploy Firestore rules and indexes

Required before queries work in production:

```bash
firebase login
firebase use <your-project-id>

firebase deploy --only firestore:rules
firebase deploy --only firestore:indexes
```

### 5. Run locally

**Important:** Run from the **project root** (`mini-hcm/`), not from `frontend/`:

```bash
cd mini-hcm
npm run dev
```

This starts **both** the API (`:5000`) and the React app (`:3000`). Punch in/out will fail with a proxy/500 error if only the frontend is running.

| Service | URL |
|---------|-----|
| Frontend | http://localhost:3000 |
| Backend API | http://localhost:5000 |
| Health | http://localhost:5000/api/health |

You should see **`[api] HCM API running on :5000`** and **`[web] VITE ... localhost:3000`** in the same terminal.

**Do not** run `npm run dev` inside `frontend/` only — that starts Vite without the API and punch will fail.

| Script (from root) | What it runs |
|--------------------|--------------|
| `npm run dev` | Backend + frontend (use this) |
| `npm run dev:backend` | API only (`:5000`) |
| `npm run dev:frontend` | Vite only (`:3000`) — not enough for punch |

### 6. Create an admin user

1. Register in the app.
2. Firestore → `users` → your document → set `role` to `"admin"`.
3. Sign out and back in.

---

## Firestore schema

### `users/{uid}`

```json
{
  "uid": "abc123",
  "name": "Jane Doe",
  "email": "jane@company.com",
  "role": "employee",
  "timezone": "Asia/Manila",
  "schedule": { "start": "09:00", "end": "18:00" },
  "createdAt": "<Timestamp>"
}
```

### `attendance/{autoId}`

```json
{
  "uid": "abc123",
  "userName": "Jane Doe",
  "email": "jane@company.com",
  "date": "<Timestamp>",
  "punchIn": "<Timestamp>",
  "punchOut": "<Timestamp | null>",
  "dateLabel": "2026-06-01",
  "schedule": { "start": "09:00", "end": "18:00" },
  "status": "in | out",
  "metrics": { "regular": 8, "overtime": 1.5, "nd": 0, "late": 0.25, "undertime": 0, "total": 9.5 }
}
```

### `dailySummary/{uid_yyyy-MM-dd}`

```json
{
  "uid": "abc123",
  "userName": "Jane Doe",
  "dateLabel": "2026-06-01",
  "regular": 8, "overtime": 1.5, "nd": 0, "late": 0.25, "undertime": 0, "total": 9.5
}
```

---

## API routes (backend)

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/health` | Health check |
| `GET` | `/api/attendance` | User attendance (Bearer token) |
| `POST` | `/api/attendance/punch-in` | Punch in |
| `POST` | `/api/attendance/punch-out` | Punch out |
| `GET` | `/api/reports/daily` | Admin daily report |
| `GET` | `/api/reports/weekly` | Admin weekly report |
| `PUT` | `/api/reports/attendance/:id` | Admin edit attendance |

Punch and admin edit routes are used by the React app. History/dashboard still **read** from Firestore (real-time or queries).

---

## Deployment checklist

Use this before submitting or going live:

- [ ] `frontend/.env.local` filled (production Firebase config if deploying)
- [ ] `backend/.env` + `service-account.json` on the host (**required** for punch in/out)
- [ ] `firebase deploy --only firestore:rules`
- [ ] `firebase deploy --only firestore:indexes` (wait until indexes finish building)
- [ ] `cd frontend && npm run build`
- [ ] `firebase deploy --only hosting` (from repo root; `firebase.json` points to `frontend/dist`)
- [ ] Promote at least one `admin` user in Firestore
- [ ] Backend running (or deployed) with `service-account.json`
- [ ] `VITE_API_URL` set in production build if API is on another host
- [ ] Smoke test: register → punch in/out → dashboard KPIs → history → admin edit

### Frontend (Firebase Hosting)

```bash
cd frontend && npm run build && cd ..
firebase deploy --only hosting
```

### Backend (Render / Railway / similar)

1. Deploy `backend/` with start command `node src/index.js`.
2. Set `PORT`, `FRONTEND_URL` (your hosted React URL).
3. Provide `service-account.json` as a secret file or env-based credentials.

---

## Architecture notes

```
Browser                         Express (Admin SDK)              Firestore
───────                         ─────────────────              ─────────
Login/Register ──► Firebase Auth
Punch In/Out   ──► POST /api/attendance/* ──► compute + write ──► attendance, dailySummary
Admin edit     ──► PUT /api/reports/attendance/:id
Dashboard      ◄── onSnapshot / getDocs (read only) ◄────────────────────────
```

## Troubleshooting

### `'concurrently' is not recognized`

You ran `npm run dev` before installing root dependencies. From **`mini-hcm/`** (project root):

```bash
npm install
npm run dev
```

### Punch in fails — `ECONNREFUSED` or proxy / 500 error

The backend is not running. Common causes:

1. **`npm run dev` was run inside `frontend/`** — only Vite starts. Use the **project root** instead.
2. **`[api]` crashed** — check the terminal for a red error under `[api]`.

Verify the API: open http://localhost:5000/api/health — expect `{"status":"ok"}`.

### `[api] Error: listen EADDRINUSE :::5000`

Port **5000** is already used (often a leftover backend from an earlier run).

**Windows (PowerShell):**

```powershell
Get-NetTCPConnection -LocalPort 5000 -ErrorAction SilentlyContinue |
  ForEach-Object { Stop-Process -Id $_.OwningProcess -Force }
```

Then run `npm run dev` again from the project root.

### Punch in fails — `409 Already punched in`

You already have an open attendance record for today. Punch out first, or check Firestore `attendance` for duplicate rows.

### Dashboard does not update after punch-out

Wait ~1.5s (app refetches `dailySummary` after the server write). If it still looks stale, refresh the page.

### Attendance shows on the wrong weekday (e.g. Monday but you punched Tuesday)

**Work days use your profile timezone** (`users.timezone` from registration), not necessarily your PC clock. Example: punch at 12:10 AM Tuesday in Manila while profile is `America/Los_Angeles` → still **Monday** in US time → summary lands on **Mon**.

Fix: set your timezone in Firestore to where you work (e.g. `Asia/Manila`), or accept US calendar days if that is your payroll timezone. Dashboard week rows now use the same timezone as punch `dateLabel`.

### Metrics look wrong (huge undertime, wrong day on chart)

Older records may have been saved with a previous formula. **Punch out again on a new day** or use **Admin → edit → save** to recompute. A 2-minute punch at 12:05 AM before a 9:00–17:00 shift should show ~**0h 2m** total/ND and **0h undertime**, not ~17h undertime.

---

## Known limitations

- **Backend required for punches:** `npm run dev` from the **root** must show both `[api]` and `[web]`.
- **Production:** Set `VITE_API_URL` to your deployed API (see `frontend/.env.example`). Firebase Hosting does not proxy `/api` by default.
- **Timezone:** `dateLabel` uses profile timezone; punch timestamps use server time at request.
- **Firestore rules:** Deploy with `firebase deploy --only firestore:rules` — clients cannot write `attendance` / `dailySummary` directly.

---

## License

MIT
