# Trackify

Trackify is a full-stack job-application tracker. It gives each user a private board to manage applications, application progress, notes, follow-ups, and the resume used for each role.

## Stack

```text
React + Vite + Tailwind CSS
             │
        REST API / HTTPS
             │
Node.js + Express + TypeScript
JWT cookies · Zod · bcrypt
             │
         Prisma ORM
             │
 PostgreSQL (Docker locally)
             │
 S3-compatible object storage
 (Cloudflare R2, Amazon S3, or MinIO)
```

The React build is served by Express in production. This makes the frontend and API same-origin, which keeps secure authentication cookies simple and avoids unnecessary cross-origin configuration.

## New in v2

- **Columns no longer resize each other.** The board is a flex lane of fixed-height columns that scroll their own cards, so adding an application to Screening leaves every other column exactly where it was. Previously the board was a CSS grid, and grid rows stretch every column to the height of the tallest one.
- **Auto-fill from a job link.** Paste a posting URL and `POST /api/applications/parse-link` reads the page server-side, preferring the `JobPosting` JSON-LD that Greenhouse, Lever, Ashby, Workday, Indeed and LinkedIn publish, then falling back to OpenGraph tags and URL patterns. Company, role, location, source, salary range, posting date and description fill in. Only blank fields are filled, so nothing you typed is overwritten.
- **Saved hiring processes per company.** Record how an employer recruits once — the rounds, their type, how long each usually takes, what to expect — and every application at that company shows it. From Screening onward the process leads the detail drawer under the heading "How <company> recruits". Mark the round you are on and it appears on the board card. Six starting patterns are included, from a big tech loop to a service company drive.
- **CSV import and export.** Bring applications in from another tracker (up to 500 rows per import, with per-row error reporting) and download everything, archived rows included.
- **Archive.** Closed applications can be archived instead of deleted. They leave the working board and the metrics but keep their history, and the board has an Archived filter to bring them back into view.

### Link reading and safety

`parse-link` will not fetch private addresses. It resolves the hostname, rejects loopback, link-local, private, carrier-grade NAT and unique-local ranges, re-checks after every redirect, caps the response at 2 MB, times out after 9 seconds, and allows 12 lookups per user per minute. Sites that block automated reading, such as LinkedIn and Indeed, return a clear "paste the details manually" message rather than an error.

## Included in v1

- Email/password registration, login, logout, and protected routes.
- Secure HTTP-only JWT session cookies and bcrypt password hashes.
- Job board with Saved, Applied, Screening, Interview, Offer, and closed states.
- Drag applications between active board columns, or change status in the details drawer.
- Add, edit, search, filter, sort, and delete applications.
- Track company, role, status, application date, job link, location, source, salary range, follow-up date, and notes.
- Automatically maintained status history and first-response timing.
- Dashboard metrics for active applications, response rate, median reply time, and overdue follow-ups.
- Private resume library, resume attachment, and authorized download routes.
- PostgreSQL migrations, unit tests, Playwright end-to-end test, Docker configuration, and GitHub Actions CI/CD.

## Project layout

```text
client/                 React, Vite, Tailwind UI
server/src/services/    Job-link reader, SSRF guard, CSV reader/writer
server/                 Express API, Prisma models, storage adapter
server/prisma/          PostgreSQL schema and migrations
e2e/                    Playwright browser flow
.github/workflows/      CI and gated Render deployment
docker-compose.yml      Local PostgreSQL database
Dockerfile              Production build and server image
```

## Run locally

### Prerequisites

- Node.js 20.14 or later
- Docker Desktop, for local PostgreSQL

1. Create local environment settings:

   ```powershell
   Copy-Item .env.example .env
   ```

   On macOS/Linux use `cp .env.example .env`.

2. Start PostgreSQL:

   ```bash
   docker compose up -d postgres
   ```

3. Install packages and create the database schema:

   ```bash
   npm ci
   npm run prisma:generate
   npx prisma migrate deploy --schema server/prisma/schema.prisma
   ```

4. Start client and API together:

   ```bash
   npm run dev
   ```

   Open `http://localhost:5173`. The API runs on `http://localhost:4000` and Vite proxies `/api` during development.

Without S3 credentials, resume files are saved only in the local `uploads/` folder for development. Production uploads deliberately fail until object storage is configured.

## Object storage configuration

For Cloudflare R2, Amazon S3, or another S3-compatible provider, set these deployment environment variables:

```text
S3_ENDPOINT=https://<account-id>.r2.cloudflarestorage.com
S3_REGION=auto
S3_BUCKET=trackify-resumes
S3_ACCESS_KEY_ID=<access-key>
S3_SECRET_ACCESS_KEY=<secret-key>
```

The server stores only an opaque object key in PostgreSQL. It uploads files privately and issues a short-lived signed URL only after the authenticated owner requests a download. The API accepts PDF, DOC, and DOCX files up to 5 MB.

## Quality checks

```bash
npm run lint          # ESLint
npm run typecheck     # strict TypeScript checks
npm run test          # Vitest unit/API tests
npm run build         # Prisma generation plus production client/server build
npm run test:e2e      # Playwright browser test (requires PostgreSQL)
```

## CI/CD and deployment

`.github/workflows/ci.yml` runs on every pull request and every push to `main`:

1. Starts PostgreSQL 16.
2. Installs locked dependencies.
3. Generates Prisma Client and applies migrations.
4. Runs linting, type checks, unit tests, production build, and Playwright.
5. After a successful push to `main`, deploys to whichever provider is configured.

The `deploy` job targets whichever provider you have configured. Each step is
skipped when its secret is missing, so a fork with no secrets still passes CI.

### Deploy to Railway (simplest)

Railway builds `Dockerfile` using `railway.json` and needs no GitHub secret.

1. Railway dashboard: **New Project -> Deploy from GitHub repo**, pick this repository.
2. Add a **PostgreSQL** database to the project. Railway injects `DATABASE_URL` for you.
3. In the service's **Variables**, set `NODE_ENV=production`, `COOKIE_SECURE=true`,
   `JWT_SECRET` (32+ random characters), `CLIENT_ORIGIN=https://<your-app>.up.railway.app`,
   and the five `S3_*` values. Railway injects `PORT` itself.
4. In **Settings -> Deploys**, turn on **Wait for CI** so a push only deploys after
   the Quality checks workflow passes.

### Deploy to Fly.io

Fly builds the same Dockerfile using `fly.toml`.

1. `fly launch --no-deploy` (this reuses the committed `fly.toml`; pick your own app name).
2. `fly postgres create` and `fly postgres attach <db-name>`, which sets `DATABASE_URL`.
3. `fly secrets set JWT_SECRET=... COOKIE_SECURE=true CLIENT_ORIGIN=https://<app>.fly.dev S3_ENDPOINT=... S3_BUCKET=... S3_REGION=auto S3_ACCESS_KEY_ID=... S3_SECRET_ACCESS_KEY=...`
4. `fly tokens create deploy`, then save the token in GitHub as the repository
   secret `FLY_API_TOKEN`. Pushes to `main` then deploy after CI passes.

`fly.toml` scales to zero by default, so the first request after an idle period
waits for a machine to start. Set `min_machines_running = 1` to avoid that.

### Deploy to Render

1. Create a managed PostgreSQL database and a private S3/R2 bucket.
2. Create a Render service from this repository using `render.yaml` or the `Dockerfile`.
3. Set `DATABASE_URL`, `CLIENT_ORIGIN`, the `S3_*` values, and `COOKIE_SECURE=true`.
   `JWT_SECRET` is generated by Render.
4. Create a Render deploy hook and save it as the repository secret `RENDER_DEPLOY_HOOK_URL`.

### In every case

Protect `main` in GitHub and require the **Quality checks** workflow before merging.

Resume uploads return `503` until `S3_*` is configured. This is deliberate: container
filesystems are wiped on each deploy, so there is nowhere safe to put them otherwise.

The Docker image runs `prisma migrate deploy` before starting Express, so committed migrations are applied as part of each approved production release.

## API overview

| Area | Endpoints |
| --- | --- |
| Authentication | `POST /api/auth/register`, `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/me` |
| Applications | `GET/POST /api/applications`, `PUT/DELETE /api/applications/:id`, `POST /api/applications/:id/archive` |
| Job links | `POST /api/applications/parse-link` |
| Import/export | `POST /api/applications/import`, `GET /api/applications/export.csv` |
| Hiring processes | `GET/POST /api/processes`, `PUT/DELETE /api/processes/:id` |
| Resumes | `GET/POST /api/resumes`, `GET /api/resumes/:id/download`, `DELETE /api/resumes/:id` |
| Health | `GET /api/health` |

## Security notes

- Never commit `.env` files or production secrets.
- JWTs are HTTP-only and use `SameSite=Lax` cookies.
- Every application and resume query is scoped to the authenticated `userId`.
- Helmet, restrictive CORS, request-size limits, input validation, and upload constraints are enabled at the API boundary.
- Use a managed database with backups before storing real application material.
