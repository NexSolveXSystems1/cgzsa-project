# Deploying the CGZSA website

A single Ubuntu server running Docker, with Caddy in front for TLS. About 90
minutes end to end, most of it waiting for DNS.

Every command here was run against the actual code. Where a step depends on
something only you have — a domain, a mailbox, a backup bucket — that is called
out rather than glossed over.

---

## Before you start

You need:

| | |
|---|---|
| A server | Ubuntu 22.04 or 24.04, 2 GB RAM minimum, 4 GB comfortable. 20 GB disk. |
| A domain | Pointed at the server's IP before step 5, because the TLS certificate is issued against it. |
| An SMTP mailbox | Host, port, username, password. Without it nobody is told a contact message arrived, and invited users cannot receive their link. |
| Object storage for backups | Backblaze B2, Cloudflare R2, or any S3-compatible service. This is not optional — see step 8. |

Set the DNS record now, before anything else, so it has propagated by the time
you need it:

```
A    cgzsa.org        →  <your server IP>
A    www.cgzsa.org    →  <your server IP>
```

---

## 1. Harden the server

SSH in as root, then:

```bash
# Keep the system patched without having to remember
apt update && apt upgrade -y
apt install -y unattended-upgrades
dpkg-reconfigure -plow unattended-upgrades

# A non-root user to run the application
adduser --disabled-password --gecos "" cgzsa
usermod -aG sudo cgzsa
mkdir -p /home/cgzsa/.ssh
cp ~/.ssh/authorized_keys /home/cgzsa/.ssh/
chown -R cgzsa:cgzsa /home/cgzsa/.ssh
chmod 700 /home/cgzsa/.ssh && chmod 600 /home/cgzsa/.ssh/authorized_keys
```

Lock down SSH — password login is how servers get taken:

```bash
sed -i 's/^#*PermitRootLogin.*/PermitRootLogin no/' /etc/ssh/sshd_config
sed -i 's/^#*PasswordAuthentication.*/PasswordAuthentication no/' /etc/ssh/sshd_config
systemctl reload ssh
```

> **Open a second SSH session as `cgzsa` and confirm it works before closing
> this one.** If the key is wrong you have just locked yourself out, and the only
> way back is your provider's console.

Firewall — only SSH and web:

```bash
ufw allow OpenSSH
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable
ufw status
```

PostgreSQL's port is deliberately absent. The database runs inside Docker and is
reachable only by the application container.

---

## 2. Install Docker

```bash
curl -fsSL https://get.docker.com | sh
usermod -aG docker cgzsa
```

Log out and back in as `cgzsa` for the group to take effect, then check:

```bash
docker run --rm hello-world
```

---

## 3. Put the code on the server

As the `cgzsa` user:

```bash
cd ~
tar -xzf CGZSA_Website_Source_FIXED.tar.gz
cd cgzsa-web
```

---

## 4. Configure

```bash
cp .env.example .env
```

Generate the secrets rather than inventing them:

```bash
echo "POSTGRES_PASSWORD=$(openssl rand -hex 32)"
echo "CRON_SECRET=$(openssl rand -hex 32)"
echo "SEED_ADMIN_PASSWORD=$(openssl rand -base64 24)"
```

Edit `.env`. The values that matter:

```bash
DATABASE_URL="postgresql://cgzsa:<POSTGRES_PASSWORD>@db:5432/cgzsa"
APP_URL="https://cgzsa.org"

POSTGRES_PASSWORD="<generated above>"
CRON_SECRET="<generated above>"
SEED_ADMIN_PASSWORD="<generated above>"

SMTP_URL="smtp://user:password@smtp.yourprovider.com:587"
SMTP_FROM="CGZSA website <no-reply@cgzsa.org>"

# One reverse proxy (Caddy) sits in front of the app.
TRUSTED_PROXY_COUNT="1"

BACKUP_REMOTE="b2:cgzsa-backups"     # set in step 8
```

Note `@db:5432` in `DATABASE_URL`, not `localhost` — `db` is the service name on
the Docker network.

### TRUSTED_PROXY_COUNT is the one to get right

It tells the application how far into `X-Forwarded-For` to look for the real
visitor. Too high and a visitor can forge their own address and skip every rate
limit; too low and everyone shares one bucket.

| Your setup | Value |
|---|---|
| Caddy or nginx on this server, nothing else | `1` |
| Cloudflare (or any CDN) in front of that | `2` — better still, also set `CLIENT_IP_HEADER="cf-connecting-ip"` |
| Nothing in front at all | `0` |

Then lock the file down — it holds every secret you just generated:

```bash
chmod 600 .env
```

---

## 5. Start it

```bash
docker compose up -d --build
```

Compose refuses to start if `POSTGRES_PASSWORD` or `CRON_SECRET` are unset —
that is deliberate, so a deployment cannot quietly run on defaults.

Create the schema and the content:

```bash
docker compose exec app npm run db:migrate    # 40 tables
docker compose exec app npm run db:seed       # roles, permissions, users, content
```

The seed prints the administrator's sign-in details. Check it is alive:

```bash
curl -s http://127.0.0.1:3000/api/health
# {"ok":true,"db":"up","ms":18}
```

That only answers on loopback. The app is not reachable from the internet yet,
which is correct — the proxy comes next.

---

## 6. TLS and the reverse proxy

```bash
sudo apt install -y debian-keyring debian-archive-keyring apt-transport-https curl
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' \
  | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' \
  | sudo tee /etc/apt/sources.list.d/caddy-stable.list
sudo apt update && sudo apt install -y caddy

sudo cp deploy/Caddyfile /etc/caddy/Caddyfile
sudo nano /etc/caddy/Caddyfile        # replace cgzsa.org and the admin email
sudo caddy validate --config /etc/caddy/Caddyfile
sudo systemctl reload caddy
```

Caddy obtains the certificate on the first request, so DNS must already resolve
to this server. Give it a few seconds, then:

```bash
curl -sI https://cgzsa.org | head -3
```

If it fails, `sudo journalctl -u caddy -n 50` almost always says why — usually
DNS not yet propagated, or port 80 blocked.

Using nginx instead? `deploy/nginx.conf` is provided. Pay attention to the
`/api/chat/stream` block: without `proxy_buffering off` a staff chat reply is
held in a buffer and never reaches the visitor, and the connection just sits
there looking fine.

---

## 7. Schedule the maintenance job

Nothing calls `/api/cron` by itself. It publishes scheduled articles, deletes
data past its retention date, and purges removed media files.

```bash
crontab -e
```

```cron
# CGZSA maintenance, hourly
17 * * * * curl -fsS -m 60 -H "authorization: Bearer YOUR_CRON_SECRET" http://127.0.0.1:3000/api/cron >> /home/cgzsa/cron.log 2>&1
```

Minute 17 rather than 0 so it does not pile up with everything else on the
machine. Test it now rather than discovering it at midnight:

```bash
curl -s -H "authorization: Bearer YOUR_CRON_SECRET" http://127.0.0.1:3000/api/cron
```

Expect `{"ok":true,...}`. HTTP 207 means the job ran but a step failed, and names
which one.

---

## 8. Backups — do not skip this

Everything else on this page can be redone in an afternoon. Data cannot.

```bash
sudo apt install -y rclone
rclone config          # add your B2 / R2 / S3 remote, call it "b2"
rclone lsd b2:         # must list your buckets
```

Add to `.env`:

```bash
BACKUP_REMOTE="b2:cgzsa-backups"
```

Restart so the backup container picks it up, then run one by hand:

```bash
docker compose up -d
docker compose exec backup bash /scripts/backup.sh
```

The warning about backups living on the same machine should be gone. Confirm the
archive actually landed off-site:

```bash
rclone ls b2:cgzsa-backups
```

### Then rehearse the restore

A backup nobody has restored is a hope, not a plan.

```bash
docker compose exec db createdb -U cgzsa cgzsa_restore_test

RESTORE_URL="postgresql://cgzsa:<POSTGRES_PASSWORD>@db:5432/cgzsa_restore_test" \
  docker compose exec -T backup bash /scripts/restore.sh /backups/<timestamp>
```

It prints row counts at the end. **Time the whole thing and write the number
down** — that is your recovery time. Put a calendar reminder to repeat it yearly.

The restore script refuses to run without an explicit `RESTORE_URL`, so a
rehearsal cannot overwrite production by accident.

---

## 9. Pre-flight

```bash
./scripts/preflight.sh https://cgzsa.org
```

It checks secrets, headers, exposure, canonical URLs and backups, and exits
non-zero if anything is wrong. Expect something like:

```
  21 passed, 1 warnings, 0 failures
  Ready.
```

Fix every failure before going further. Each one is something that will cause a
problem in production, not a style preference.

---

## 10. First sign-in

Open `https://cgzsa.org/admin` and sign in with the seeded administrator.

Then, immediately:

1. **Change the administrator password** on the account screen. The seeded one
   was printed to a terminal and may be in your scrollback.
2. **Turn on two-factor authentication** for the administrator account.
3. **Set real passwords** for the other seeded accounts, or suspend the ones you
   are not using. They exist with the same seeded password.
4. **Check site settings** — address, phone numbers, contact recipient — under
   Settings. The contact recipient is where enquiry notifications go.
5. **Send a test contact message** from the public form and confirm the email
   arrives. This is the single most common thing to be quietly broken.

---

## 11. Monitoring

Point any uptime service at:

```
https://cgzsa.org/api/health
```

It returns 503 when the database is unreachable, so you hear about a database
problem even though the public pages keep serving from cache. Alert on
non-200.

Logs:

```bash
docker compose logs -f app        # JSON, one object per line
docker compose logs -f backup     # nightly backups
sudo journalctl -u caddy -f       # TLS and proxy
```

---

## Routine operations

**Deploying an update**

```bash
cd ~/cgzsa-web
./scripts/backup.sh                    # always, before a schema change
tar -xzf new-release.tar.gz --strip-components=1
docker compose up -d --build
docker compose exec app npm run db:migrate
./scripts/preflight.sh https://cgzsa.org
```

**Rolling back.** Redeploy the previous archive and, if a migration ran, restore
the backup you took before it. This is why the backup comes first.

**Restarting**

```bash
docker compose restart app       # app only
docker compose down && docker compose up -d   # everything
```

Data lives in named Docker volumes and survives both. `docker compose down -v`
destroys them — that flag is the one to be careful with.

---

## When something is wrong

| Symptom | Look here |
|---|---|
| 502 from the browser | App container is down: `docker compose ps`, `docker compose logs app` |
| Certificate errors | `sudo journalctl -u caddy -n 50`; usually DNS or port 80 |
| Contact form silent | `SMTP_URL` unset or wrong: `docker compose logs app \| grep '"scope":"email"'` |
| Chat replies never arrive | Proxy buffering the SSE stream — check the `/api/chat/stream` block |
| Everyone rate-limited at once | `TRUSTED_PROXY_COUNT` too low, so all visitors share one bucket |
| Rate limits do nothing | `TRUSTED_PROXY_COUNT` too high, so forged addresses are trusted |
| Scheduled posts not publishing | Cron not running: `grep cron /home/cgzsa/cron.log` |
| Disk filling | `docker system prune -a`, and check `BACKUP_KEEP` |

---

## Known limits

Worth knowing before they surprise you:

- **Run exactly one instance.** The rate limiter and the chat message bus hold
  state in process memory. On two instances, limits become per-instance and a
  staff chat reply reaches only the visitors connected to the same container.
  Moving both to PostgreSQL `LISTEN`/`NOTIFY` is the fix when you need to scale.
- **`script-src` allows `'unsafe-inline'`**, a deliberate trade for static
  generation, reasoned out at the top of `src/middleware.ts`.
- **Uploads live on a Docker volume**, not object storage. It is backed up by
  `scripts/backup.sh`; there is no S3 driver.
- **English only.** Nothing in the schema or routing is multilingual.
