# Railway + Netlify deployment

This project is ready for GitHub-based deployment, but it is important to keep
the current architecture clear:

- `cgzsa-frontend` is the Next.js app that renders the public site and admin UI.
- `cgzsa-backend` contains the database schema, migrations, server actions,
  shared backend libraries and API implementations used by the Next.js app.
- PostgreSQL migrations live in `cgzsa-backend/drizzle`.
- The schema/client/seed/index code lives in `cgzsa-backend/src/db`.

The app is not yet a fully separate REST API plus static frontend. The safe
first production setup is:

1. GitHub stores the repository.
2. Netlify deploys the Next.js app.
3. Railway provides PostgreSQL.

Railway can also run the full Docker app instead of Netlify. A true split where
Netlify is only static frontend and Railway is the only backend API is a later
architecture change.

## Required versions

Use Node.js 22. The repo includes:

- `.nvmrc`
- `package.json` engines
- `netlify.toml` `NODE_VERSION=22`

## Netlify app

Create a Netlify site from GitHub with the project root set to this repository.

Build settings:

```txt
Build command: npm run build
Publish directory: cgzsa-frontend/.next
```

These are already set in `netlify.toml`.

Set these environment variables in Netlify:

```txt
DATABASE_URL=<Railway DATABASE_PUBLIC_URL, not the private DATABASE_URL>
APP_URL=https://your-domain.example
CRON_SECRET=<generated secret>
SEED_ADMIN_PASSWORD=<generated password for the first production seed>
SMTP_URL=<mailbox URL>
SMTP_FROM=CGZSA website <no-reply@your-domain.example>
STORAGE_DRIVER=s3
S3_ENDPOINT=<object storage endpoint>
S3_REGION=auto
S3_BUCKET=<bucket>
S3_ACCESS_KEY=<access key>
S3_SECRET_KEY=<secret key>
TRUSTED_PROXY_COUNT=1
```

Do not use local upload storage on Netlify. Serverless filesystems are not
persistent, so production uploads must use S3-compatible storage such as
Cloudflare R2, AWS S3, Supabase Storage or DigitalOcean Spaces.

## Railway PostgreSQL

Create a Railway project, then add PostgreSQL.

If the app runs on Netlify, Netlify cannot use Railway's private database URL.
Open the PostgreSQL service settings, enable Public Access / TCP Proxy, then use
the generated `DATABASE_PUBLIC_URL` as Netlify's `DATABASE_URL`.

If the app runs on Railway in the same project, use Railway's private
`DATABASE_URL` instead.

## Migrations and seed

Before the first public launch, run:

```powershell
npm run db:migrate
npm run db:seed
```

For a remote Railway database from your machine, set `DATABASE_URL` to Railway's
public connection string for that command session, then run the same commands.

Do not keep reseeding production casually. The seed is idempotent for content and
roles, but the first production seed creates the initial admin accounts and role
matrix. Set `SEED_ADMIN_PASSWORD` before that first seed; the script will not
print a configured production password back to the logs. After first sign-in,
change passwords and enable 2FA.

## Optional Railway full-app service

If you choose to run the full Next.js app on Railway instead of Netlify:

1. Railway will detect the root `Dockerfile`.
2. Add PostgreSQL in the same Railway project.
3. Set the app service `DATABASE_URL` to the private Railway database URL.
4. Make sure Railway exposes `DATABASE_URL` and `APP_URL` during the Docker
   build. The Dockerfile declares them as build args because `next build` may
   read CMS/database content while generating routes.
5. Set the app service pre-deploy command in Railway to:

```txt
npm run db:migrate
```

6. Set the health check path to:

```txt
/api/health
```

The Docker start command respects Railway's `PORT` variable through
`cgzsa-backend/scripts/server.mjs`.

## Cookie notice

The current site uses essential cookies for staff sessions and live chat visitor
identity. It does not use advertising cookies or marketing trackers. A cookie
notice is still useful because it tells visitors what is stored and why, and it
links to the editable Cookie Policy page.

If tracking, analytics or embedded marketing tools are added later, the consent
model must become stricter: visitors must be able to reject non-essential
cookies before those tools run.
