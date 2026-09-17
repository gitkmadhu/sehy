# DigitalOcean API Migration Plan (Backend Only) — Final Decision

Status: **planning only, nothing implemented yet.** This is the decided
path — see [aws-api-migration-plan.md](aws-api-migration-plan.md) for the
superseded AWS research that led here.

## Why this, over everything else considered

Triggered by a Hostinger outage. Explored, in order: Cloudflare/CloudFront
(edge caching only — don't fix a dead origin), Google Cloud (Compute
Engine + Cloud SQL HA — real redundancy, ~$150–450+/mo, real IAM/VPC
learning curve), AWS EC2+RDS Multi-AZ (same story, similar cost/curve),
HostGator VPS (cheap, zero learning curve, but doesn't fix the underlying
single-point-of-failure — just bets on a more reliable vendor), Cloudways
Autonomous (ruled out — WordPress/WooCommerce only, doesn't run a custom
PHP app), AWS App Runner (ruled out — AWS stopped accepting new customers
April 30, 2026), AWS Lightsail (simplifies AWS's account/networking layer,
but still leaves you owning ongoing VPS-style server maintenance, which
didn't match the stated priority).

**Decided: DigitalOcean App Platform + Managed MySQL (HA).** Explicitly
chosen for lowest ongoing operational/maintenance burden ("peace of mind")
over lowest cost — the platform (not a human) handles OS patching, instance
health, and replacement automatically, unlike Lightsail/EC2/Hostinger.

## Scope

Only `backend/` (the PHP/MySQL API) moves. `website/` stays on Hostinger —
the mobile app never touches it, and the website's own dynamic features
call the same API, so they're fixed by this migration too without the
static site needing to move.

## Final configuration & cost

Verified against DigitalOcean's live signup screen on 2026-09-16 — this
corrected an earlier, wrong search-sourced estimate ($60/mo), so trust this
table over any other cost figure discussed earlier in this project's history.

| Component | Plan | Cost |
|---|---|---|
| Website (unchanged) | stays on Hostinger | — |
| Backend PHP API | App Platform → Web Service, smallest shared-CPU instance, **instance count = 2** | ~$10/mo |
| Database | Managed MySQL, **General Purpose (Dedicated CPU)** tier + **Add-on Standby node** for HA — the Basic/Shared-CPU tier has no HA option at any price | **$115 + $115 = $230/mo** |
| File uploads | Spaces Object Storage, base tier | ~$5/mo |
| **Total** | | **~$245/mo** |

## Steps

1. **DigitalOcean account setup**
   - Create the account, set a billing alert.
   - Create the Managed MySQL database first: General Purpose tier, add the
     standby node for HA **at creation** — confirm whether this platform
     also requires HA to be chosen upfront vs. added later without downtime
     (unlike AWS RDS, where enabling Multi-AZ after creation forces a
     reboot) before assuming it's risk-free to add later.

2. **Data migration**
   - `mysqldump` the current Hostinger database.
   - Restore into a throwaway/staging DO database first, verify integrity,
     before touching anything that will become production.

3. **File uploads — required code change before running 2 instances**
   - `backend/lib/upload.php` currently writes to local disk
     (`backend/uploads/`). With 2 Web Service instances, a file saved on one
     instance won't exist on the other. Must switch to **Spaces** (S3-compatible)
     before scaling past 1 instance, or uploaded images will randomly 404
     depending on which instance served the request.
   - This is the one non-trivial application code change this migration
     requires — everything else is hosting configuration.

4. **App Platform setup**
   - Create the App Platform app with the Web Service component pointed at
     `backend/`, instance count = 2.
   - Wire in environment variables for: DB connection string, RevenueCat key,
     Razorpay key, the Slack incident webhook (`backend/config/slack.php`),
     the monitoring API key (`backend/config/monitoring.php`), Spaces
     credentials. Never commit these — same secret-handling standard already
     used for `backend/config/revenuecat.php` in this repo.
   - Health check: point it at the existing `monitoring/health.php` endpoint
     already built this session.

5. **DNS cutover**
   - Lower the current API hostname's DNS TTL before the migration window.
   - Test fully against App Platform's own generated URL before touching DNS.
   - Keep the public hostname unchanged when cutting over, so the Flutter
     app's `api_config.dart` needs no change and no app-store release.

6. **Cutover validation**
   - Smoke-test every endpoint: login, offers, payments, `monitoring/health.php`.
   - **Update the webhook URLs in the Razorpay and RevenueCat dashboards** —
     they keep their own independent copy of the callback URL and won't
     follow the migration automatically. Missing this makes payments look
     fine to the customer while confirmation webhooks silently fail.

7. **Soak period before decommissioning Hostinger**
   - Keep the old host running and billed for a few days/weeks of
     observation. Don't cancel anything on migration day.

## Pitfalls

- **The $230/mo HA cost is easy to underestimate from generic web pricing** —
  confirmed by direct experience this session: a search-sourced $60/mo
  figure was wrong; the live signup screen was the only reliable source.
  Always re-verify against the actual current signup flow before committing
  budget, not against a blog post.
- **Uploads silently breaking on the second instance** if `upload.php` isn't
  updated first — shows up as "the image sometimes doesn't load," not a
  loud error.
- **Forgotten webhook URLs** in Razorpay/RevenueCat dashboards — the
  single most dangerous quiet-failure mode, since it affects money.
- **No rollback plan** — keep Hostinger live and DNS-reversible through the
  soak period.
- **Confirm whether HA can be added to an existing (non-HA) database later
  without downtime**, or only at creation — this determines whether it's
  safe to start cheaper and upgrade, or whether HA must be chosen upfront.

## Still open before execution

- No DigitalOcean resources, code changes, or DNS changes have been made.
  This file is a plan for review.
- Confirm current App Platform PHP runtime/buildpack details and Spaces SDK
  usage in `upload.php` at execution time.
