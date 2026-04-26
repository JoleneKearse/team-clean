# Team Clean

Team Clean is a mobile-friendly schedule app built with React + Vite + Firebase Firestore that helps the Aamjiwnaang First Nation cleaning team coordinate daily assignments in real time.

It eliminates the need for team members to recall the details of how to fairly and effectively reassign staff when I member is out.  This was a drawn out process where a number of things needed to be considered, including:
- how many staff are present at each stage of the shift
- which buildings need how many cleaners, dependent on how many there are
- where staff should mop
- ensuring necessary jobs are always completed. 

This live shared schedule automatically adjusts when staff are absent and ensures required roles are always covered.

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

<p align="center">
   <img src="https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/react/react-original.svg" width="40" />
   <img src="https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/typescript/typescript-original.svg" width="40" />
   <img src="https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/vitejs/vitejs-original.svg" width="40" />
   <img src="https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/tailwindcss/tailwindcss-original.svg" width="40" />
   <img src="https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/firebase/firebase-original.svg" width="40" />
</p>



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
