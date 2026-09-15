# Mubo

Mubo is a self-hosted web music player. Point it at a folder on the server and everyone who can reach the Mubo URL can browse and stream that library from a desktop or mobile browser.

## Run with Docker Compose

Requirements: Docker Engine with Docker Compose.

1. Copy `.env.example` to `.env`.
2. Set `MUSIC_PATH` in `.env` to the **absolute path on the Docker host** that contains your music.
3. Start Mubo locally with the port-publishing override:

```bash
docker compose -f docker-compose.yml -f docker-compose.local.yml up -d --build
```

Open `http://your-server:3000`. Change `MUBO_PORT` in `.env` if port 3000 is already used.

On Coolify, deploy `docker-compose.yml` directly without the local override. Coolify routes the configured domain to the container's exposed port 3000, so no host port is published.

The music directory is mounted read-only. Mubo never changes or deletes your files. New and removed songs appear on the next browser refresh after `LIBRARY_SCAN_INTERVAL_MS` (15 seconds by default), without rebuilding the image.

Compose also starts PostgreSQL, Redis, a private recommendation API and two background workers. Listening events personalize Home, Shuffle, Smart Shuffle, Autoplay and Radio from songs in your scanned library. The current app has no accounts, so all visitors share the listener configured by `RECOMMENDATION_USER_ID`. See [the recommendation system](docs/recommendation-system.md) for the architecture, seed data, tests and deployment limits. The standalone Docker CLI and local `npm run dev` paths still play music, but personalized services need Compose or an explicitly configured `RECOMMENDATION_API_URL`.

## Music folder layout

Mubo recursively scans MP3, M4A, AAC, FLAC, OGG, Opus, WAV, and WebM audio. It reads embedded title, artist, album, track number, duration, and cover-art tags. When tags are missing, it falls back to this folder layout:

```text
/srv/music/
  Artist name/
    Album name/
      01 - Song title.mp3
      02 - Another song.flac
      cover.jpg
```

When tags are missing, the filename becomes the song title, the containing directory becomes the album, and its parent becomes the artist. Numeric track prefixes are removed. Embedded artwork is preferred; you can also add `cover.jpg`, `cover.jpeg`, `cover.png`, `cover.webp`, `folder.jpg`, `folder.png`, `album.jpg`, or `album.png` beside the songs as a fallback.

## Docker CLI alternative

```bash
docker build -t mubo .
docker run -d --name mubo --restart unless-stopped -p 3000:3000 -v /srv/music:/music:ro -e MUSIC_PATH=/music mubo
```

Replace `/srv/music` with your host folder. On Windows PowerShell, a bind mount can look like `-v "D:\Music:/music:ro"`.

## Reverse proxy and public access

For internet-facing installs, place Mubo behind a reverse proxy such as Caddy, nginx, or Traefik and enable HTTPS. Mubo intentionally has no user accounts: anyone who can reach the URL can browse and play every indexed song. Restrict access at the reverse proxy or with a VPN if the library should be private.

The health endpoint is `GET /api/health`. Streaming uses byte-range responses, so browser seeking and resume work through compatible reverse proxies. Avoid proxy response buffering on the stream route if your proxy enables it globally.

## Local development

```bash
npm ci
$env:MUSIC_PATH="D:\Music"
npm run dev
```

Then open `http://localhost:3000`.

## Configuration

| Variable | Default | Purpose |
| --- | --- | --- |
| `MUSIC_PATH` | `/music` in the image | Music directory visible to the Node.js process |
| `MUBO_PORT` | `3000` | Host port used by Docker Compose |
| `LIBRARY_SCAN_INTERVAL_MS` | `15000` | In-memory library scan cache duration |
| `POSTGRES_PASSWORD` | `mubo-local-only` | Local recommendation database password; change for deployment |
| `RECOMMENDATION_API_KEY` | `local-development-key` | Private app-to-service key; change for deployment |
| `RECOMMENDATION_USER_ID` | `local-listener` | Single listener identity until accounts exist |
