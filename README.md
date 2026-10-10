# Sanchal

Sanchal is a location-scoped civic works and grievance app for Greater Chennai. The frontend is built with Next.js; the API is FastAPI with SQLAlchemy and PostgreSQL (Supabase).

## Demo video

[Watch the Sanchal demo on YouTube](https://youtu.be/7J1tRZKFDrU?si=uiVDO4nRwfH7cAd3)

## Live application

[Open Sanchal](https://sanchal-app.vercel.app/)

## Requirements

- Node.js and npm
- Python 3.13 recommended
- A reachable PostgreSQL database, such as the configured Supabase project

## Configure the backend

Create `backend/.env` from the example and set your own database URL and JWT secret:

```bash
cd backend
cp .env.example .env
```

Set `DATABASE_URL` to your PostgreSQL connection string. Use a long, random value for `JWT_SECRET`; for example, generate one with `openssl rand -hex 32`. Keep `.env` private and out of version control.

The backend reads these settings:

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | PostgreSQL connection string |
| `JWT_SECRET` | Secret used to sign access tokens |
| `ALGORITHM` | JWT algorithm; defaults to `HS256` |
| `FRONTEND_ORIGINS` | Comma-separated allowed browser origins; defaults to local Next.js URLs |

Install dependencies and start the API from the `backend` directory:

```bash
python3 -m venv venv
source venv/bin/activate
python -m pip install -r requirements.txt
python -m uvicorn main:app --reload --port 8000
```

On Windows, activate the virtual environment with `venv\\Scripts\\activate` instead.

The API creates missing tables at startup and applies an additive migration to legacy `users` tables. Existing rows are retained; old records without contact or location data receive `Unspecified` / `Unassigned` values. The migration does not replace a dedicated migration tool for future production schema changes.

## Configure and start the frontend

In another terminal:

```bash
cd frontend
npm ci
npm run dev
```

Open [http://localhost:3000/auth](http://localhost:3000/auth). The frontend uses `http://localhost:8000` for the API by default. To use another API origin, set `NEXT_PUBLIC_API_BASE_URL` in `frontend/.env.local`, then restart Next.js.

## API overview

- `POST /api/signup`, `POST /api/login`, `POST /api/verify-password`
- `GET /api/me`
- `GET /api/works` and `GET /api/grievances` (JWT required; scoped to the signed-in user’s zone and block)
- `POST /api/works` and `PUT /api/works/{id}` (official JWT required)
- `POST /api/grievances` (resident JWT required)
- `GET /health`

Interactive API documentation is available at [http://localhost:8000/docs](http://localhost:8000/docs).

## Local checks

```bash
curl http://localhost:8000/health
cd frontend && npx tsc --noEmit
```

## Production deployment

The app is deployed as two services: the Next.js frontend on Vercel and the
FastAPI backend on Render. PostgreSQL remains hosted separately (for example,
on Supabase).

### Backend on Render

1. Import this repository into Render as a Blueprint; Render reads
   `render.yaml` and creates the `sanchal-api` web service.
2. Set `DATABASE_URL` to the production PostgreSQL connection string. Render
   generates `JWT_SECRET` for the service.
3. After the frontend is deployed, set `FRONTEND_ORIGINS` to its exact HTTPS
   origin (for example, `https://your-app.vercel.app`). Add any custom domain
   origins as comma-separated values, then redeploy the API.
4. Confirm the service health check succeeds at `/health`.

### Frontend on Vercel

1. Import this repository into Vercel and set the project Root Directory to
   `frontend`.
2. Add `NEXT_PUBLIC_API_BASE_URL` with the Render service's HTTPS origin,
   without a trailing slash, in the Vercel project's production environment.
3. Deploy or redeploy the frontend, then test sign-in and the dashboard.

Do not commit `backend/.env` or put database credentials or signing secrets in
Vercel's public `NEXT_PUBLIC_*` variables. If a secret was previously committed,
rotate it before using the repository for production deployment.

## Project structure

```text
backend/                 FastAPI application, SQLAlchemy models, database setup
frontend/app/auth/       Sign in and account creation
frontend/app/dashboard/  Official workspace
frontend/app/resident-dashboard/  Resident workspace
```
