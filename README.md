# Team Clean

Team Clean is a React + Vite schedule board that syncs daily updates through Firebase Firestore.

## Requirements

- Node.js 20+
- pnpm 9+

## Local Setup

1. Install dependencies:

   ```bash
   pnpm install
   ```

2. Copy environment variables template:

   ```bash
   cp .env.example .env
   ```

3. Fill in Firebase values in `.env`.

4. Start the development server:

   ```bash
   pnpm dev
   ```

## Required Environment Variables

- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_PROJECT_ID`
- `VITE_FIREBASE_STORAGE_BUCKET`
- `VITE_FIREBASE_MESSAGING_SENDER_ID`
- `VITE_FIREBASE_APP_ID`

## Important Notes

- `.env` is intentionally gitignored and should never be committed.
- Every teammate must create their own local `.env` from `.env.example`.
- If `.env` is changed, restart the Vite server. Vite only reads env vars at startup.
- For hosted builds (for example Vercel/Netlify/Firebase Hosting), set the same `VITE_FIREBASE_*` variables in the host environment settings.

## Scripts

- `pnpm dev` starts local development server.
- `pnpm build` creates a production build.
- `pnpm preview` serves the production build locally.
- `pnpm lint` runs ESLint.
