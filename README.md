<<<<<<< HEAD
# HCM — Time Tracking System

A lightweight Human Capital Management system for tracking employee attendance, computing worked hours, overtime, night differential, lateness, and undertime — built with React, Node.js/Express, and Firebase.

---

## Tech Stack

| Layer      | Technology                         |
|------------|------------------------------------|
| Frontend   | React 18 + Vite + Tailwind CSS     |
| Backend    | Node.js + Express (ESM)            |
| Auth       | Firebase Authentication            |
| Database   | Cloud Firestore                    |
| Hosting    | Firebase Hosting (frontend), Render/Railway (backend) |

---

## Features

- **Registration & Login** — Firebase Auth (email/password) with per-user schedule configuration
- **Punch In / Punch Out** — One-click time recording with live elapsed timer
- **Automatic Computation** — Regular hours, Overtime (OT), Night Differential (ND), Late, Undertime
- **Dashboard** — KPI cards, weekly bar chart, daily breakdown table
- **History** — Filterable attendance log (this week, 7/14/30 days)
- **Admin Panel** — View/edit all employee punches, daily records, weekly report with per-employee totals

---

## Project Structure

```
mini-hcm/
├── frontend/               # React + Vite app
│   ├── src/
│   │   ├── components/
│   │   │   ├── dashboard/  # PunchClock, MetricCard, WeeklyChart
│   │   │   └── shared/     # AppShell (layout + sidebar)
│   │   ├── context/        # AuthContext (Firebase Auth state)
│   │   ├── hooks/          # useAttendance (punch logic)
│   │   ├── lib/            # Firebase client init
│   │   ├── pages/          # Login, Register, Dashboard, History, Admin
│   │   ├── styles/         # Global CSS + Tailwind config
│   │   └── utils/          # timeCompute.js (OT/ND/Late calculations)
│   └── .env.example
├── backend/                # Express API
│   ├── src/
│   │   ├── middleware/     # verifyToken, requireAdmin
│   │   ├── routes/         # attendance.js, reports.js
│   │   └── utils/          # timeCompute.js (mirrors frontend logic)
│   └── .env.example
├── firestore.rules         # Firestore security rules
├── firestore.indexes.json  # Required composite indexes
└── README.md
```

---

## Computation Logic

All metrics are computed in `src/utils/timeCompute.js` (both frontend and backend):

| Metric           | Formula |
|------------------|---------|
| **Regular**      | Time worked within the scheduled shift window |
| **Overtime (OT)**| Time worked beyond the scheduled shift end |
| **Night Diff (ND)** | Minutes worked between 22:00 and 06:00 |
| **Late**         | `max(0, punchIn − scheduleStart)` |
| **Undertime**    | `max(0, scheduleEnd − punchOut)` if punched out early |

> Overnight shifts are supported — if `scheduleEnd ≤ scheduleStart`, it is treated as ending the next calendar day.

---

## Setup Guide

### Prerequisites

- Node.js 18+
- Firebase account (free tier is sufficient)
- Git

---

### Step 1 — Firebase Project Setup

1. Go to [console.firebase.google.com](https://console.firebase.google.com) and create a new project.

2. **Enable Authentication:**
   - Go to **Authentication → Sign-in method**
   - Enable **Email/Password**

3. **Enable Firestore:**
   - Go to **Firestore Database → Create database**
   - Start in **production mode** (you'll apply the rules in Step 4)

4. **Get your web app config:**
   - Go to **Project Settings → Your apps → Add app → Web**
   - Copy the `firebaseConfig` object values

5. **Get a service account key (for the backend):**
   - Go to **Project Settings → Service accounts**
   - Click **Generate new private key** → download the JSON file
   - Save it as `backend/service-account.json`

---

### Step 2 — Environment Variables

**Frontend** — create `frontend/.env.local`:
```env
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
```

**Backend** — create `backend/.env`:
```env
PORT=5000
FRONTEND_URL=http://localhost:3000
```

---

### Step 3 — Install Dependencies

```bash
# From the root directory
npm install
cd frontend && npm install
cd ../backend && npm install
```

---

### Step 4 — Deploy Firestore Rules & Indexes

Install Firebase CLI if you haven't:
```bash
npm install -g firebase-tools
firebase login
firebase init firestore   # select your project
```

Then deploy:
```bash
firebase deploy --only firestore:rules
firebase deploy --only firestore:indexes
```

---

### Step 5 — Run Locally

```bash
# From root — runs both frontend and backend concurrently
npm run dev
```

- Frontend: http://localhost:3000
- Backend API: http://localhost:5000

---

### Step 6 — Create an Admin Account

After registering your first account, promote it to admin directly in Firestore:

1. Go to Firestore → `users` collection
2. Find your user document
3. Change the `role` field from `"employee"` to `"admin"`

The Admin Panel will now be visible in the sidebar after next login.

---

## Firestore Data Schema

### `users/{uid}`
```json
{
  "uid": "abc123",
  "name": "Joshua Adrian",
  "email": "joshua@company.com",
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
  "userName": "Joshua Adrian",
  "email": "joshua@company.com",
  "date": "<Timestamp>",
  "punchIn": "<Timestamp>",
  "punchOut": "<Timestamp | null>",
  "dateLabel": "2026-06-01",
  "schedule": { "start": "09:00", "end": "18:00" },
  "status": "in | out",
  "metrics": {
    "regular": 8.0,
    "overtime": 1.5,
    "nd": 0.0,
    "late": 0.25,
    "undertime": 0.0,
    "total": 9.5
  }
}
```

### `dailySummary/{uid_yyyy-MM-dd}`
```json
{
  "uid": "abc123",
  "userName": "Joshua Adrian",
  "dateLabel": "2026-06-01",
  "regular": 8.0,
  "overtime": 1.5,
  "nd": 0.0,
  "late": 0.25,
  "undertime": 0.0,
  "total": 9.5
}
```

---

## Deployment

### Frontend (Firebase Hosting)
```bash
cd frontend
npm run build
firebase deploy --only hosting
```

### Backend (Render / Railway)
1. Push the `backend/` folder to a separate Git repo (or use a monorepo)
2. Connect to [render.com](https://render.com) or [railway.app](https://railway.app)
3. Set the environment variables in the dashboard
4. Upload `service-account.json` as a secret file
5. Set start command: `node src/index.js`

---

## Development Log

| Day | Work Done |
|-----|-----------|
| **Day 1** | Requirements analysis, system design, data schema planning, computation logic design |
| **Day 2** | Project scaffolding, Firebase project setup, folder structure, initial Git repo |
| **Day 3** | Firebase Auth integration, registration/login flow, AuthContext, routing and guards |
| **Day 4** | Punch In/Out logic, `timeCompute.js` (OT, ND, Late, Undertime), Firestore attendance writes, daily summary aggregation |
| **Day 5** | Dashboard KPIs + chart, History page, Admin panel (daily records + weekly report + edit punches), UI polish, README, security rules |

---

## License

MIT
=======
# mini-hcm-time-tracker
>>>>>>> 0c6a1f36ff0f125b49ff92f5b1107594a6d5792f
