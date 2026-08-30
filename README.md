# greenhouse_princess 🌷🌱🌹✨

A small React + Express app for managing a personal plant garden with login, user-owned plants, and a real PostgreSQL database.

![Pixel plant mascot](client/public/plants/pixel_plant.png)

## What this project uses

- Frontend: React + Vite
- Backend: Express + Node
- Database: PostgreSQL via Supabase
- Auth: JWT-based login/signup
- No Docker
- No local database server required for normal use

## Local setup

### 1. Install dependencies

```bash
npm install
```

### 2. Create a local .env file

Create a file named `.env` in the project root:

```env
DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@db.YOUR_PROJECT_REF.supabase.co:5432/postgres
JWT_SECRET=replace-with-a-long-random-secret
NODE_ENV=development
```

Copy the database URL from Supabase's **Connect** dialog and replace only the password if needed. Password characters such as `/`, `@`, `^`, `:` and `#` is best to avoid for easyness. The project reference in `db.YOUR_PROJECT_REF.supabase.co` must match the current Supabase project exactly.

This file is local only and should not be committed.

### 3. Create the database tables in Supabase

In your Supabase dashboard, open the SQL editor and run the schema from:

```sql
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  name VARCHAR(80) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS plants (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(80) NOT NULL,
  plant_type VARCHAR(80) NOT NULL,
  watering_text VARCHAR(120) NOT NULL,
  mood VARCHAR(40) NOT NULL,
  image_url TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### 4. Start the app

Run both frontend and backend together:

```bash
npm run dev
```

Then open:

- Frontend: `http://localhost:5173`
- Backend API: `http://localhost:3001/api/health`

## API overview

These endpoints are available on the backend:

- `POST /api/auth/signup`
- `POST /api/auth/login`
- `GET /api/auth/me`
- `PATCH /api/profile`
- `GET /api/plants`
- `POST /api/plants`

## GitHub secrets and deployment

GitHub secrets are not used when you run the app locally.
They are used when you deploy to a server or a hosting environment.

Typical production variables:

```env
DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@db.YOUR_PROJECT_REF.supabase.co:5432/postgres
JWT_SECRET=replace-with-a-long-random-secret
NODE_ENV=production
```

Add them in GitHub:

- Settings → Secrets and variables → Actions → New repository secret

Example secret names:

- `DATABASE_URL`
- `JWT_SECRET`
- `NODE_ENV`

## Supabase setup summary

For this project, use:

- Connection method: Direct connection
- Type: URI
- Copy the full connection string

If your hosting is IPv4-only, enable the Supabase IPv4 add-on.

## Notes

- The app is designed for a real PostgreSQL database
- GitHub Pages is only for the frontend. The backend runs separately.
