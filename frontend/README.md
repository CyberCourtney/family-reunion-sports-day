# Frontend

React + TypeScript + Vite, no router (see [the engineering log](../docs/ENGINEERING-LOG.md) for why),
TanStack Query, Tailwind CSS, direct-fetch Cognito auth (no Amplify).
See the top-level [README.md](../README.md) for the full project writeup.

## Local development

```bash
npm install
npm run dev
```

Needs a `.env.local` (git-ignored) with:

```
VITE_API_BASE_URL=...
VITE_COGNITO_USER_POOL_CLIENT_ID=...
VITE_COGNITO_REGION=...
VITE_TOURNAMENT_NAME=...
VITE_TOURNAMENT_TAGLINE=...
VITE_TOURNAMENT_START=...
VITE_TOURNAMENT_END=...
```

`.env.production` (committed — none of these values are secret; the
Cognito client ID and API URL are public by design, and this app only
ever runs one environment, so there's nothing to template per-deploy)
holds the real values used by the CI build.

While logged out of production, `?phase=before|active|complete` on the
URL previews each tournament lifecycle state — but only in `npm run dev`
(`import.meta.env.DEV`), never in a production build.

## Build

```bash
npm run build   # outputs to dist/
npm run preview # serve the production build locally
```

CI (`.github/workflows/deploy.yml`) runs this on every push to `main`
that touches `frontend/**`, then syncs `dist/` to the S3 site bucket and
invalidates CloudFront.
