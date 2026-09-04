# CGZSA — website and content management system

The public website of the **Clean and Green Zero Sphere Alliance**, a youth-led
non-profit registered in the Republic of Liberia, together with the content
management system its staff use to maintain it.

Built to the specification in *Website and Content Management System — Design
Review, version 1.1*.

---

## What is here

**Public website** — home, about and its six sections, five programme pages,
projects, FAQs, get-involved, contact with a working form, site-wide search,
and the legal pages. Server-rendered, statically generated where possible.

**Content management system** — sign in, dashboard, live chat queue with
transcripts, knowledge base, and the audit log. Every screen is gated by a
server-side permission check.

**Live chat with an assistant** — a widget on every public page. The assistant
answers from CGZSA's own published content, cites the pages it used, and hands
the conversation to a person rather than guessing. Staff answer from the same
dashboard they publish from. Replies reach the visitor over server-sent events.

---

## Getting started

Requirements: **Node 20 or later** and **PostgreSQL 16 or later**.

```bash
cp .env.example .env          # then fill in DATABASE_URL
npm install
npm run db:migrate            # create the 44 tables
npm run db:seed               # roles, permissions, users and CGZSA's content
npm run dev                   # http://localhost:3000
```

The seed prints the sign-in details for the administrator account. **Change that
password immediately.**

### The commands

| Command | What it does |
|---|---|
| `npm run dev` | Development server with hot reload |
| `npm run build` / `npm start` | Production build and server |
| `npm run db:generate` | Write a new SQL migration after changing the schema |
| `npm run db:migrate` | Apply pending migrations |
| `npm run db:seed` | Seed roles, permissions, users and content. Safe to re-run |
| `npm run db:index` | Rebuild the assistant's index from published content |
| `npm run typecheck` | TypeScript with no emit |

---

## How it is put together

```
src/
  app/
    (public)/        the public website
    admin/           the content management system
    api/chat/        message, escalate, and the SSE stream
    api/contact/     the contact form endpoint
  components/
    public/          header, footer, chat widget, forms
    admin/           shell, sign-in, reply box
  db/
    schema.ts        44 tables — the single source of truth
    content.ts       CGZSA's own content, taken from the source documents
    seed.ts          idempotent seeding
  lib/
    auth.ts          Argon2id, database sessions, permission checks
    audit.ts         the append-only log
    knowledge.ts     indexing and retrieval over published content
    assistant.ts     the assistant, and its refusal to invent
    chat-bus.ts      delivery of a staff reply to a waiting visitor
    ratelimit.ts     per-address limits
drizzle/             generated SQL migrations
```

### Two decisions worth knowing about

**Drizzle rather than Prisma.** The design review named Prisma. Drizzle was used
instead because it is pure TypeScript and downloads no platform binaries at
install time, which makes it work on constrained networks and in CI without
special handling. The schema, the migrations and the query safety are equivalent;
every query is parameterised.

**Server-sent events rather than WebSockets.** Vercel now serves WebSockets in
its functions, but the Next.js integration is still an experimental API, a
connection closes when the function reaches its maximum duration, and a
reconnecting client is not guaranteed to reach the same instance. The visitor's
browser opens an `EventSource` and posts its own messages over ordinary HTTP;
`EventSource` reconnects by itself, which matters more on a Liberian mobile
connection than on fibre. See `src/lib/chat-bus.ts` — swap the in-process
emitter for PostgreSQL `LISTEN`/`NOTIFY` when running more than one instance.

---

## The assistant

It reads your website and nothing else. That restriction is enforced in
`src/lib/assistant.ts`, not left to a prompt: the retrieved passages are the only
material an answer may draw on, and if nothing relevant comes back there is no
answer to give.

Two providers:

- **`stub`** (default) — composes an answer out of the retrieved passages
  themselves. No API key, no network call, and it cannot invent anything.
- **`anthropic`** — sends the retrieved passages to a hosted model as quoted
  data, with an instruction to answer only from them. Set `ASSISTANT_API_KEY`.
  If the provider fails the system falls back to the extractive answer rather
  than going silent.

Behaviour is configured in the database, not in code: confidence threshold,
maximum replies per conversation, a monthly spending cap, office hours, and the
subjects it must never discuss. See the `assistant_settings` table.

Try it from the command line:

```bash
npx tsx scripts/ask.ts "Do you install water taps in Paynesville?"
```

### What happens when it cannot answer

The question is recorded in `unanswered_questions` with a count, and appears on
the knowledge base screen. That is the loop that improves the *website*, not just
the assistant.

---

## Security

Implemented from §14 of the design review:

- **Passwords** — Argon2id at the OWASP parameter floor. Minimum twelve
  characters, checked against a list of easily guessed strings.
- **Sessions** — rows in the database, so any one can be revoked. HTTP-only,
  `SameSite=Lax`, `Secure` in production. Thirty-minute idle timeout, twelve-hour
  absolute lifetime.
- **Brute force** — every attempt recorded; five failures within fifteen minutes
  locks the account and the address. The failure message never reveals whether an
  account exists.
- **Authorisation** — `requirePermission()` re-derives permissions from the
  database on every request. The interface hides what a user cannot do; the
  server refuses it regardless.
- **Input** — every request body parsed through a Zod schema at the boundary.
  Rejected, not coerced. Rich text is sanitised against an allow-list on the way
  in and again on the way out, so content that reached the column by any other
  route is still filtered before it is rendered.
- **Client address** — read from the trusted end of `X-Forwarded-For` according
  to `TRUSTED_PROXY_COUNT`, never the leftmost value the client can write. Set
  that variable to the real number of proxies or the rate limits are decorative.
- **Forms** — honeypot field, per-address rate limit, server-side validation.
  Messages are stored first and emailed second.
- **Chat** — retrieved passages are supplied to the model as quoted data, never
  as instructions. Every chat endpoint checks that the conversation belongs to
  the visitor's cookie, so a conversation id alone reaches nothing. Rate limits
  per visitor, a block flag, an atomically counted cap on assistant replies per
  conversation, and a monthly spending cap charged from real token usage that
  switches the assistant off rather than producing a surprise invoice.
- **Personal data** — chat transcripts carry a `delete_after` date twelve months
  out. Contact messages and volunteer applications are retention-limited.
- **Audit** — logins, failures, content transitions, chat actions and settings
  changes, with actor, resource, timestamp, IP and user agent. Passwords and
  tokens are never written to it.
- **Headers** — `X-Content-Type-Options`, `X-Frame-Options: DENY`,
  `Referrer-Policy`, `Permissions-Policy` denying camera, microphone and
  geolocation. Add a Content-Security-Policy at the edge in production.

---

## Deployment

A full step-by-step manual is in `deploy/DEPLOYMENT.md`. The short version, on an
Ubuntu server with Docker installed:

```bash
cp .env.example .env         # then fill in every value it asks for
docker compose up -d --build
docker compose exec app npm run db:migrate
docker compose exec app npm run db:seed
```

The app binds to `127.0.0.1:3000` only, so it is not reachable from the internet
until a reverse proxy is in front of it. `deploy/Caddyfile` is the recommended
one — it obtains and renews the TLS certificate itself. `deploy/nginx.conf` is
there if your organisation already uses nginx; note the `/api/chat/stream`
block, without which live chat replies never arrive.

Before pointing real visitors at it:

```bash
./scripts/preflight.sh https://your-domain
```

That checks secrets, headers, exposure, canonical URLs and backups, and exits
non-zero if anything would bite you in production.

For a platform deployment (Vercel, Render, Fly.io), set the environment
variables from `.env.example`, point `DATABASE_URL` at a managed PostgreSQL
instance, and run the migration as a release step. Note that the rate limiter
and the chat message bus hold state in process memory, so run exactly one
instance until those are moved to Redis or PostgreSQL `LISTEN`/`NOTIFY`.

### Backups

Two things need backing up, and losing either is unrecoverable:

- the PostgreSQL database — all content, chat transcripts and enquiries
- the `storage` volume — every uploaded document and photograph

`scripts/backup.sh` captures both: a `pg_dump` in custom format and a tar of the
storage directory, with a manifest and checksums. The `backup` service in
`docker-compose.yml` runs it once a day.

```bash
./scripts/backup.sh                        # writes to ./backups
BACKUP_DIR=/mnt/backups ./scripts/backup.sh
```

**Set `BACKUP_REMOTE`.** Without it the archive sits on the same machine as the
thing it protects, which is not a backup — it dies with the disk, the
ransomware, or the `docker compose down -v` typed at two in the morning. Point it
at object storage (`b2:cgzsa-backups`, `s3:...`) and the script pushes each night's
archive off the machine with `rclone`.

### Restoring

```bash
createdb cgzsa_restore_test
RESTORE_URL=postgresql://.../cgzsa_restore_test ./scripts/restore.sh ./backups/<stamp>
```

The script refuses to run without an explicit `RESTORE_URL`, so a rehearsal
cannot overwrite production by accident. It verifies checksums, restores the
database and the files, and prints row counts.

**Rehearse it once a year, and write down how long it took.** That number is the
real recovery time, and a restore nobody has performed is a hope rather than a
plan. The procedure above has been exercised end to end; what has not been tested
is your off-site destination and your credentials, which is the part that
usually fails.

### Health

`GET /api/health` reports whether the application can reach the database, and is
used as the container healthcheck. It returns 503 when the database is down, so
a monitor sees the outage even though the public pages keep serving from cache.

---

## Where content comes from

Everything organisational in `src/db/content.ts` is taken verbatim from the
thirteen documents CGZSA supplied: the bylaws and code of conduct, core values,
introduction, founding rationale, mission and vision statement, organisational
structure, brochure, logo, articles of incorporation, notary certificate,
business registration certificate and revenue assessment slip.

Nothing about CGZSA is invented. Where the documents are silent the interface
says so with a marked placeholder rather than filling the gap:

- Two of the twelve core values have no written definition.
- Board seats are shown as *appointment pending*.
- Payment details on the donate page.
- Office hours.
- The impact band is labelled **Our Five-Year Targets** and shows progress
  against each, because CGZSA was founded in 2025 and has no achievement figures
  yet. One setting switches it to "Our Impact" when it does.

---

## What is built, and what is not

Every module in the design review is implemented. The list below is the honest
state of each, because "done" means different things for a screen and for a
piece of infrastructure.

**Complete and tested**

- Public site — 23 routes: home, about and its six sections, five programme
  pages, projects, news, events, publications, gallery, FAQs, get-involved,
  contact, search, and the four legal pages.
- Editorial modules — pages, news, programmes, projects, events, publications,
  FAQs and team, each with the draft → review → approved → published → archived
  workflow, and publishing held as a separate permission from editing.
- Version history on pages and articles. A save stores the previous text; a
  restore copies the current text forward first, so a restore can itself be
  undone.
- Media library — upload with magic-byte sniffing (only JPEG, PNG, WebP, AVIF
  and PDF are accepted; an SVG or an executable is refused whatever it is
  named), re-encoding through sharp to strip anything embedded in an image, and
  alternative text required before an image can be saved. Whether a file is an
  image is decided by its bytes, not by the content type the client claims.
- Users and roles — five roles, eighteen permissions, enforced server-side on
  every screen and every action. The matrix is visible on the users screen, and
  every permission on it is checked somewhere in the code — a unit test asserts
  that, because a permission that grants nothing misleads whoever reads the
  matrix.
- Two-factor authentication — enrolment and verification, RFC 6238, in
  `src/lib/totp.ts`. Codes cannot be replayed, and removing the second factor
  requires the current password and a live code. There is no organisation-wide
  policy to *require* it — an earlier draft of this file implied there was.
- Live chat — the widget, the assistant, the staff queue, transcripts, and the
  knowledge base screen. Replies reach the visitor over server-sent events, with
  each frame carrying its message id so a reconnecting browser replays whatever
  it missed while the connection was down.
- Contact and volunteer forms, the message queue, redirects, sitemap, robots,
  RSS, and the audit log.
- Tests — 72 unit tests (`npm run test`) and 58 end-to-end tests
  (`python3 tests/e2e/run.py`) covering sign-in, rate limiting, the editorial
  workflow, version restore, chat handover over SSE, and the audit trail. The
  unit suite includes a regression test for each defect found in the August 2026
  audit, named after what used to happen.
- Accessibility — all 25 public pages carry one `h1`, no heading-level skips, an
  `alt` on every image, a label on every field, and no horizontal overflow at any
  width from 320 px to 1920 px. Interactive elements meet the 44 px touch target,
  except inline links within a sentence, which WCAG 2.2 exempts. The chat widget
  is a real dialog: focus moves into it, Tab is trapped, Escape closes it and
  focus returns to the launcher.

**Deliberately not done, and why**

- **Payments.** Nothing on the donate page takes money. CGZSA has not chosen a
  provider, and inventing one would put an untested payment route on a
  registered charity's website. The page explains how to give and leaves the
  integration as a decision.
- **An email account to send from.** Sending itself is written and working
  (`src/lib/email.ts`, nodemailer): password-reset links, user invitations and
  form notifications for both the contact and volunteer forms go out as soon as
  `SMTP_URL` is set. Until it is, an invited user cannot receive their link, so
  set a temporary password for them instead — the users screen says so. Until it is, they are logged rather than
  sent, and the site carries on — a contact message is stored before it is
  emailed, so a mail outage can never lose one. CGZSA needs to supply the
  mailbox; no code changes.
- **The assistant's language model.** It ships with the extractive provider,
  which answers only by quoting indexed CGZSA content. Setting
  `ASSISTANT_PROVIDER=anthropic` and an API key switches it. The restriction to
  CGZSA's own material is enforced in code either way, not by the prompt.
- **Other languages.** The site is English only. Nothing in the schema or the
  routing is multilingual yet, so this is a real piece of work rather than a
  switch — worth scoping separately if CGZSA wants French or a local language.

**Known limitations**

- `script-src` allows `'unsafe-inline'`. The reasoning is written out in full at
  the top of `src/middleware.ts`; it is a trade against static generation, and
  reversing it is a one-line change plus dynamic rendering. Because there is no
  second line of defence if the sanitiser is wrong, `src/lib/sanitise.ts` escapes
  every `<` that is not a complete allow-listed tag, and the unit suite runs a
  corpus of bypass payloads against it.
- The rate limiter and the chat message bus hold state in process memory. They
  are correct on one instance and silently wrong on two: limits become
  per-instance, and a staff reply reaches only the visitors whose SSE connection
  landed on the same box. Move both to Redis or PostgreSQL `LISTEN`/`NOTIFY`
  before scaling out.
- Five tables are created and unused: `subscribers`, `seo_meta`,
  `project_partners`, `project_documents` and `media_albums`.
- Search and the assistant both use PostgreSQL full-text search. The
  `knowledge_passages` table already carries an `embedding` column so a move to
  pgvector needs no migration of the surrounding code.
- Content is seeded from the founding documents. Where those documents are
  silent — two of the twelve core values, and every achievement figure — the
  gap is marked in the CMS rather than filled in.
