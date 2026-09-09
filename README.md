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
5. After a successful push to `main`, calls the Render deploy hook if it is configured.

To enable production deployment:

1. Create a managed PostgreSQL database and private S3/R2 bucket.
2. Create a Render web service from this repository using `render.yaml` or the included `Dockerfile`.
3. Add `DATABASE_URL`, `S3_*` settings, and a strong `JWT_SECRET` in Render. Set `COOKIE_SECURE=true`.
4. Create a Render deploy hook and save it as the repository secret `RENDER_DEPLOY_HOOK_URL`.
5. Protect `main` in GitHub and require the **Quality checks** workflow before merging.

The Docker image runs `prisma migrate deploy` before starting Express, so committed migrations are applied as part of each approved production release.

## API overview

| Area | Endpoints |
| --- | --- |
| Authentication | `POST /api/auth/register`, `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/me` |
| Applications | `GET/POST /api/applications`, `PUT/DELETE /api/applications/:id` |
| Resumes | `GET/POST /api/resumes`, `GET /api/resumes/:id/download`, `DELETE /api/resumes/:id` |
| Health | `GET /api/health` |

## Security notes

- Never commit `.env` files or production secrets.
- JWTs are HTTP-only and use `SameSite=Lax` cookies.
- Every application and resume query is scoped to the authenticated `userId`.
- Helmet, restrictive CORS, request-size limits, input validation, and upload constraints are enabled at the API boundary.
- Use a managed database with backups before storing real application material.
