# Session Summary — September 2026

A working record of a long session covering backend monitoring/incidents,
an admin CMS redesign, a permissions fix, and a full hosting migration to
DigitalOcean after a Hostinger outage. Written as a reference, not a
verbatim transcript — the raw transcript is far larger and contains a
real database password, so it's kept local-only, never committed.

## 1. Monitoring & error handling

- Backend had zero error handling before this session. Added
  `backend/lib/error_logging.php` (structured JSON-lines error log,
  global exception/error/shutdown handlers wired into `bootstrap.php`)
  and `backend/endpoints/monitoring/health.php` (key-authenticated status
  endpoint: db up/down, recent error counts).
- Considered "Hermes Agent" (a monitoring AI agent product) for watching
  the backend; concluded a full agent was disproportionate for this scale.
  Built `scripts/health_alert/check_health.php` instead — a plain cron
  script that polls `health.php` and posts to Slack only on a status
  *change* (not every tick), avoiding both agent complexity and alert spam.

## 2. Business incident tracking

- Added an `incidents` table + `backend/lib/incidents.php` — tracks
  payment failures, upload/banner-publish failures, new signups, failed
  logins, and RevenueCat webhook failures as structured, deduplicated
  records (repeats of the same problem collapse into one row with an
  `occurrences` counter instead of spamming).
- Added a super_admin-only **Incidents** tab in the admin CMS to work
  these: change status (open/investigating/resolved), record root cause
  and corrective action.
- Considered Zoho Desk / Chatwoot for customer support and incident
  tracking; concluded the in-house system was the better fit at this
  scale and kept it self-hosted rather than adding a SaaS dependency.

## 3. Admin CMS redesign

- Replaced the flat horizontal tab bar with a sidebar layout (grouped
  nav: City / Marketing / Engagement / Insights / Platform), a topbar
  showing the active section, and stat cards on the Overview tab (malls,
  stores, active offers, open messages) — all built from data the page
  already fetched, no new endpoints needed.
- Verified via real browser tests (Playwright + local Chrome) at desktop
  and mobile widths, as both `super_admin` and plain `admin`.

## 4. Mall permissions fix

- Plain `admin` could previously create/edit/delete malls, change a
  mall's email domain, override its subscription, and give final publish
  approval on mall profile edits — same access as `super_admin`.
- Added `is_super_admin()` and restricted those specific actions to it.
  `mall_manager`/`mall_staff` keep their existing self-service edit-their-
  own-mall flow, unaffected. Hid the now-forbidden buttons/forms from
  plain admins in the CMS instead of leaving dead controls that 403.

## 5. Mobile analytics

- The Flutter app had `firebase_core`/`firebase_messaging` listed as
  dependencies but never wired up at all (no `Firebase.initializeApp()`
  call anywhere, no config files). Added `firebase_analytics` and a
  defensive `AnalyticsService` (try/catch around init, no-ops if not
  ready) mirroring the website's `mall_view`/`store_view` GA4 events, so
  both platforms report into the same property.

## 6. The hosting migration (the bulk of this session)

**Trigger:** a Hostinger outage took the whole site down.

**Options researched and ruled out, in order:**
- **Cloudflare / AWS CloudFront** — CDN/edge layers only; don't fix a
  dead origin for a mostly-dynamic app.
- **Google Cloud (Compute Engine + Cloud SQL HA) / AWS (EC2 + RDS
  Multi-AZ)** — genuine redundancy, but ~$150–450+/mo and a real
  IAM/VPC learning curve.
- **HostGator VPS** — cheap, zero learning curve, but still a single
  server — just betting on a different vendor being more reliable.
- **Cloudways Autonomous** — ruled out outright: WordPress/WooCommerce
  only, doesn't run a custom PHP app.
- **AWS App Runner** — ruled out: AWS stopped accepting new customers
  April 30, 2026. Its successor, **ECS Express Mode**, was scoped as a
  fallback AWS path but not pursued once DigitalOcean's simplicity won out.
- **AWS Lightsail** — simplifies AWS's account/networking layer, but
  still leaves you owning ongoing VPS-style server maintenance (OS
  patching, manual instance replacement on failure) — didn't match the
  stated priority of minimal ongoing maintenance.
- **Bluehost VPS + Coolify** — real Git-based deploy workflow, but its
  "high availability" claim looked like generic datacenter-redundancy
  marketing rather than genuine automatic multi-node failover; would have
  quietly undone the redundancy requirement.

**Decision: DigitalOcean App Platform + Managed MySQL (HA).** Chosen for
lowest ongoing operational burden ("peace of mind") over lowest cost —
confirmed cost is **~$245/mo** (corrected from an initially wrong
search-sourced $75/mo estimate — the live DigitalOcean signup screen was
the only reliable source: HA MySQL is $115 primary + $115 standby, not
$30+$30). See `docs/digitalocean-migration-plan.md` for the full plan
(superseded `docs/aws-api-migration-plan.md` kept for reference).

### What was actually done (not just planned)

- Created the App Platform Web Service (source: `backend/`, PHP
  buildpack via `heroku-php-apache2`, instance count 2), plus a standalone
  General Purpose + Standby (HA) Managed MySQL database, region Bangalore
  (BLR1).
- **`backend/composer.json` + `composer.lock`** added — required for the
  buildpack to detect/build a PHP app at all (no prior Composer usage in
  this codebase).
- **Converted every backend secret/config constant from `const` to
  `define()` with a `getenv()` override** (`db.php`, `revenuecat.php`,
  `razorpay.php`, `monitoring.php`, `slack.php`, `analytics.php`,
  `google_places.php`) — `const` can't call `getenv()`, and Git-based
  deployment only ships what's committed, so the old gitignored
  `revenuecat.php` (real secret, never committed) would have been
  *missing entirely* on deploy. `revenuecat.php` is now committed
  normally with a safe `REPLACE_ME` default.
- **`db.php` rewritten** to parse DigitalOcean's auto-injected
  `DATABASE_URL` (falls back to individual `DB_*` vars, then local XAMPP
  defaults), and to require SSL for any non-local host — including
  downloading and committing DigitalOcean's cluster CA certificate
  (`backend/config/do-ca-certificate.crt`, public, safe to commit) for
  real certificate verification rather than skipping it. Also handled a
  PHP 8.5-specific constant rename (`PDO::MYSQL_ATTR_SSL_CA` /
  `_VERIFY_SERVER_CERT` → namespaced `Pdo\Mysql::` equivalents) to stop a
  deprecation warning firing on every request.
- **Data migration**: exported the local XAMPP `gmls` database
  (`mysqldump`) — this project never actually had a populated production
  database on Hostinger, so local dev *was* the real source of truth —
  and imported it into the new DigitalOcean database (all 20 tables, 35
  cities confirmed) after temporarily disabling Trusted Sources, then
  locking it back down afterward to only the App Platform app itself
  (Quick Select → Apps, not an IP address).
- Enabled Autodeploy (safe at this pre-cutover stage — no real traffic
  depends on this app yet; plan to disable it again once DNS actually
  cuts over, so production changes get a manual review gate).
- Verified end-to-end on the live deployment: `cities/list.php`,
  login (success + failure paths), and the incidents-tracking system all
  confirmed working against the new database.

### Still pending

- Set the real secret environment variables (RevenueCat, Razorpay,
  monitoring key, Slack webhook) — all still on `REPLACE_ME`/empty
  defaults on the live deployment.
- Update the Razorpay/RevenueCat dashboard webhook URLs to point at the
  new host once DNS cuts over (they keep their own independent copy of
  the callback URL — the single most dangerous quiet-failure mode,
  since it affects money).
- Move `backend/lib/upload.php` from local disk to DigitalOcean Spaces
  before actually scaling traffic across 2 instances (uploads would
  otherwise randomly 404 depending on which instance served the request).
- DNS cutover itself — and disabling Autodeploy again once that happens.
- Rotate the database password (shared in plaintext during this session
  to run the migration) as a cheap precaution.
