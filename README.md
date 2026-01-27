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

## Docker

Containerized development:

```bash
cp .env.docker.example .env.docker
docker compose -f docker-compose.dev.yml up --build
```

This starts the app plus the ingestion worker. To send a digest on demand:

```bash
docker compose -f docker-compose.dev.yml --profile digest run --rm digest
```

Initialize the database (first run or after schema changes):

```bash
docker compose -f docker-compose.dev.yml run --rm app pnpm db:push
docker compose -f docker-compose.dev.yml run --rm app pnpm db:seed
```

Production container:

```bash
cp .env.docker.example .env.docker
docker compose up --build -d
docker compose run --rm app pnpm db:push
docker compose run --rm app pnpm db:seed
```

The production stack starts the app plus the ingestion worker. For a one-off digest run:

```bash
docker compose --profile digest run --rm digest
```

Data is stored in the `tech-pulse-data` volume. Edit `.env.docker` to adjust secrets and API keys.

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
- `OPENAI_API_KEY` + `ENABLE_AI_AUDIO=true` (optional `OPENAI_TTS_MODEL`, `OPENAI_TTS_VOICE`)
- `EMAIL_SMTP_*` and `EMAIL_FROM`
- `TELEGRAM_BOT_TOKEN`

## Local TTS (XTTS-v2)

Run offline text-to-speech with the bundled Coqui XTTS service.

- Place speaker samples at `tts/voices/en.wav` and `tts/voices/zh.wav` (10-30 seconds, clean audio).
- Set `ENABLE_AI_AUDIO=true`, `AUDIO_PROVIDER=coqui`, and confirm `TTS_BASE_URL=http://tts:5002`.
- Optional tuning: `TTS_MODEL_NAME`, `TTS_USE_CUDA`, `TTS_REQUEST_TIMEOUT_MS`.
- For GPU acceleration, install NVIDIA Container Toolkit on the host and keep `TTS_USE_CUDA=true`.
- Apple Silicon devs: set `TTS_PLATFORM=linux/amd64` (default) to pull the x86_64 Coqui image; Jetson should override with a compatible image via `TTS_IMAGE`.

### Jetson build (ARM64)

Build a Jetson-compatible TTS image locally and point `TTS_IMAGE` at it:

```bash
docker build -f tts/Dockerfile.jetson -t tech-pulse-tts:jetson \
  --build-arg BASE_IMAGE=nvcr.io/nvidia/l4t-pytorch:r36.2.0-pth2.1-py3 tts
```

Then set `TTS_IMAGE=tech-pulse-tts:jetson` and `TTS_PLATFORM=linux/arm64`.
- Dev: `docker compose -f docker-compose.dev.yml --profile tts up`
- Prod: `docker compose up` (includes `tts` by default).

## Deploy notes

- For Vercel, switch Prisma to Postgres and set `DATABASE_URL`.
- Run `pnpm db:migrate` for a migration-based workflow.
