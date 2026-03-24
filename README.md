# Team Clean

Team Clean is a mobile-friendly schedule board built with React + Vite + Firebase Firestore that helps cleaning teams coordinate daily assignments in real time.

It replaces handwritten rotation sheets with a live shared schedule that automatically adjusts when staff are absent and ensures required roles are always covered.

## Overview

Cleaning teams often rely on rotating assignment boards that break down when:
- someone calls in sick
- float roles shift between buildings
- multiple people update the board at once
- schedules must be shared across phones

Team Clean solves this by providing a real-time shared weekly board that dynamically adjusts assignments based on who is present at each point of the shift.

## Features

- 📅 Weekly rotating job assignments
- 👥 “Who’s in today” tracking that can be adjusted mid-shift
- 🔄 Automatic reassignment when staff are absent
- 📱 Mobile-first interface for on-site use
- ⚡ Real-time sync across devices via Firestore
- 🎯 Required roles always remain covered
- 🧩 Flexible float positions based on staffing levels
- 📊 Visual schedule grid (Mon–Fri layout)

## Tech Stack

- React
- TypeScript
- Vite
- Firebase Firestore (real-time sync)
- Tailwind CSS

## How It Works
Each day:
1. The lead marks who is present
2. The schedule auto-adjusts assignments
3. Required positions remain filled
4. Float roles shift depending on staffing levels
5. Updates sync instantly across devices

This removes manual rescheduling and prevents assignment conflicts.

Drag N Drop is in place when team members decide to switch tasks for the whole shift or per building.

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
