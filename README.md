# greenhouse_princess

Minimal local React + Express plant app.


## Getting started

1. Install dependencies:

```bash
npm install
```

2. Start server and client in parallel:

```bash
npm run dev
```

3. Open the app:

- `http://localhost:5173`

## Where to view frontend and endpoints

After `npm run dev` is running:

- Frontend: `http://localhost:5173`
- All plants endpoint: `http://localhost:3001/api/all_plants`
- Single plant endpoint (example): `http://localhost:3001/api/id/plant-1`

## API

- `GET /api/all_plants`: returns all plants
- `GET /api/id/:id`: returns one plant by id