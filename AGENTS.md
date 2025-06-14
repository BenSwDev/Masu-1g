# AGENTS

This repository contains a Next.js 15 application written in TypeScript.

## Directory Overview
- `actions/` – server-side actions for authentication, booking and notifications.
- `app/` – Next.js route handlers and pages.
- `components/` – reusable React components.
- `hooks/` – custom React hooks.
- `lib/` – utility modules (`auth/`, `db/`, `translations/`, etc.).
- `public/` – static assets.
- `docs/` – project documentation.
- `styles/` – styling and Tailwind config.
- `types/` – TypeScript types.

## Development
1. Use **Node 18+**.
2. Install packages with `npm install` (the repo uses `.npmrc` with `legacy-peer-deps=true`).
3. Start the dev server with `npm run dev`.
4. Lint the code before committing:
   ```bash
   npm run lint
   ```
   Linting is the only automated check.

## Coding Style
- TypeScript with React/Next.js.
- Two‑space indentation and double quotes. See `components/booking/guest-booking-wizard.tsx` around lines 80‑120 for an example.
- Lock files are not committed.

## Environment Variables
- The app relies on numerous environment variables for database, auth and email services.
- For local development, create a `.env.local` file.
- Production variables are managed in Vercel for the `main` branch.

## Setup Scripts
- `npm run build` – create a production build.
- `npm start` – run the built app.
- `npm run update-translations` – updates translation files (script not included in repo).

## Using Codex
- Run `npm run lint` after making changes.
- Keep commit messages concise and descriptive.
- Summarize user‑facing changes in PR descriptions.
- Edit this `AGENTS.md` if additional instructions are needed.

## Secrets and Internet Access
- Store secrets in environment variables and never commit them.
- The agent works offline by default; network access is only required for installing packages or running scripts that fetch data.
