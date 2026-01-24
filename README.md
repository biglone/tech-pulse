# TechPulse

TechPulse is a global tech signal radar. It aggregates RSS + community feeds, deduplicates noise, tags by topic, and keeps a hot-ranked feed with favorites and notifications.

## Features

- RSS/Medium/Substack feeds + Hacker News + Reddit ingestion
- X (Twitter) + YouTube ingestion when API keys are configured
- Tag extraction, deduplication, and hot ranking
- Search + filters + favorites
- Multi-user auth with per-user subscriptions
- Email + Telegram digest (manual trigger)

## Tech stack

- Next.js (App Router) + Tailwind CSS
- Prisma + SQLite (local) — swap to Postgres for Vercel
- NextAuth (credentials)

## Setup

```bash
pnpm install
cp .env.example .env
pnpm db:push
pnpm db:seed
pnpm ingest
pnpm dev
```

Open `http://localhost:3000`.

## Useful commands

```bash
pnpm worker   # run scheduled ingestion
pnpm ingest   # one-off ingest
pnpm digest   # send notification digest to email/Telegram
pnpm db:studio
```

## API keys

Edit `.env` to enable additional sources and AI summaries:

- `X_BEARER_TOKEN`
- `YOUTUBE_API_KEY`
- `OPENAI_API_KEY` + `ENABLE_AI_SUMMARY=true`
- `EMAIL_SMTP_*` and `EMAIL_FROM`
- `TELEGRAM_BOT_TOKEN`

## Deploy notes

- For Vercel, switch Prisma to Postgres and set `DATABASE_URL`.
- Run `pnpm db:migrate` for a migration-based workflow.
