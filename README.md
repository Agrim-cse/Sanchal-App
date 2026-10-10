# Sanchal

Sanchal is a location-scoped civic works and grievance app for Greater Chennai. The frontend is built with Next.js; the API is FastAPI with SQLAlchemy and PostgreSQL (Supabase).

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

## Project structure

```text
backend/                 FastAPI application, SQLAlchemy models, database setup
frontend/app/auth/       Sign in and account creation
frontend/app/dashboard/  Official workspace
frontend/app/resident-dashboard/  Resident workspace
```
