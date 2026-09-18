# CGZSA Backend

This folder owns the server-side domain code:

- API handler implementations in `src/api`
- admin server-action implementations in `src/actions`
- Drizzle schema, seed data, and database connection in `src/db`
- auth, audit, chat, assistant, storage, email, SEO, workflow, and request helpers in `src/lib`
- generated Drizzle migrations in `drizzle`
- backend command-line helpers in `scripts`

The Next.js API route and server-action entrypoints live under
`cgzsa-frontend/src/app` for framework discovery, but their database and business
logic belongs here.

From this folder you can run:

```bash
npm run dev       # starts the Next app from ../cgzsa-frontend
npm run db:check  # verifies ../.env can connect to PostgreSQL
npm run db:migrate
npm run db:seed
```
