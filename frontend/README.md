# OUTLOUD frontend

React + Vite + TypeScript client for OUTLOUD. See the repository root `README.md` for the full
architecture, setup, environment variables and current phase scope.

Quick start:

```powershell
npm install
Copy-Item .env.example .env.local
npm run dev
```

`npm run dev` and `npm run build` automatically restore the generated MediaPipe assets via
`scripts/fetch-model.mjs` and `scripts/copy-mediapipe-assets.mjs`.
