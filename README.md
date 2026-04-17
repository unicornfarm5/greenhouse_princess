# greenhouse_princess 🌷🌱🌹✨

Minimal local React + Express plant app🪩🪴


## Getting started 🪴

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

## View frontend and endpoints 🪴

After `npm run dev` is running:

- Frontend: `http://localhost:5173`
- All plants endpoint: `http://localhost:3001/api/all_plants`
- Single plant endpoint (example): `http://localhost:3001/api/id/plant-1`

## API 🪴

- `GET /api/all_plants`: returns all plants
- `GET /api/id/:id`: returns one plant by id

## Sharing mode (important) 🪴

The app now uses two add-flower modes:

- Localhost/dev (`localhost` or `127.0.0.1`): new flowers are saved through the backend API.
- Deployed demo (for example GitHub Pages): new flowers are temporary and only exist in the current tab. They disappear after page refresh.

This lets friends play with adding flowers without writing shared data.

### Optional env overrides

You can force behavior with Vite env vars:

- `VITE_TEMP_FLOWERS_MODE=true` to always use temporary mode
- `VITE_TEMP_FLOWERS_MODE=false` to always use backend-save mode
- `VITE_API_BASE_URL=http://localhost:3001/api` (or another API URL) to change backend target

## Deploy to GitHub Pages (auto) 🪴

This repository is configured for auto deploy with GitHub Actions.

### One-time setup in GitHub

1. Open repository settings.
2. Go to Pages.
3. Under Build and deployment, choose Source: GitHub Actions.

### Deploy flow

1. Push to the `main` branch.
2. GitHub Action in `.github/workflows/deploy-pages.yml` builds and deploys the frontend.
3. Site URL: `https://unicornfarm5.github.io/greenhouse_princess/`

### Notes

- GitHub Pages only hosts the frontend.
- Backend write API is not deployed there.
- Deployed site therefore uses temporary flowers mode by default.
