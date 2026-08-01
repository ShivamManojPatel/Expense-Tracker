# Ledger — Expense Tracker

Full-stack expense tracker: React (Vite) frontend, Node/Express + MongoDB backend, JWT auth.

Features: dashboard with monthly summary and category breakdown, transactions with filters,
subscription tracker with a calendar showing billing days, analytics (spend by month/category/
payment method), per-category monthly budgets with over-budget warnings, CSV export, and a
responsive layout with a bottom nav on mobile.

```
expense-tracker/
├── backend/    Express API + MongoDB models
└── frontend/   React app (Vite)
```

## 1. MongoDB Atlas setup

1. Create a free cluster at https://www.mongodb.com/cloud/atlas.
2. Create a database user (username + password).
3. Under Network Access, allow access from anywhere (`0.0.0.0/0`) — or your host's IP once deployed.
4. Copy the connection string, e.g.
   `mongodb+srv://<username>:<password>@cluster0.mongodb.net/expense-tracker?retryWrites=true&w=majority`

## 2. Backend — run locally

```bash
cd backend
npm install
cp .env.example .env
# edit .env: paste your MONGO_URI, set a random JWT_SECRET, set CLIENT_URL=http://localhost:5173
npm run dev
```

The API runs on `http://localhost:5000/api`. Check `GET /api/health` returns `{ status: "ok" }`.

## 3. Frontend — run locally

```bash
cd frontend
npm install
cp .env.example .env
# edit .env: VITE_API_URL=http://localhost:5000/api
npm run dev
```

Visit `http://localhost:5173`, sign up, and start adding expenses. Sensible default categories
are created automatically for every new account.

## 4. Deploying

### Backend → Render (or Railway)

1. Push this repo to GitHub.
2. On Render: New → Web Service → connect the repo → set **Root Directory** to `backend`.
3. Build command: `npm install`. Start command: `npm start`.
4. Add environment variables: `MONGO_URI`, `JWT_SECRET`, `CLIENT_URL` (your Vercel frontend URL, added after step 5).
5. Deploy — note the resulting URL, e.g. `https://ledger-api.onrender.com`.

### Frontend → Vercel

1. On Vercel: New Project → import the repo → set **Root Directory** to `frontend`.
2. Framework preset: Vite. Build command: `npm run build`. Output directory: `dist`.
3. Add environment variable `VITE_API_URL` = `https://ledger-api.onrender.com/api` (your Render URL + `/api`).
4. Deploy. Then go back to Render and set `CLIENT_URL` to your Vercel URL (e.g. `https://ledger.vercel.app`) so CORS allows it, and redeploy the backend.

Once both are live, the app works from your phone's browser — it's fully responsive, and you can
add it to your home screen for an app-like feel (Safari/Chrome → Share/Menu → "Add to Home Screen").

## Notes

- Passwords are hashed with bcrypt; auth uses JWTs valid for 30 days, stored in `localStorage`.
- Subscriptions store a `billingDay` (1–31) which the calendar uses to mark recurring charges each month.
- Budgets are matched to expenses by category name and recalculated for the current calendar month.
- To reset a forgotten password today you'd need direct database access — there's no email/reset flow yet; that's a natural next feature to add.
