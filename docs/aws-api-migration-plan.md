# AWS API Migration Plan (Backend Only) — Steps & Pitfalls

Status: **superseded — kept for reference only.** After ECS Express Mode's
cost/maturity was weighed against DigitalOcean's simplicity, the final
decision went to DigitalOcean App Platform instead. See
[digitalocean-migration-plan.md](digitalocean-migration-plan.md) for the
live plan. Nothing on this AWS path was ever implemented.

## ⚠️ Correction (superseded App Runner recommendation)

This plan originally targeted **AWS App Runner**. AWS stopped accepting new
customers for App Runner on **April 30, 2026** (existing customers keep it,
moved to maintenance-only, no new features). Since this would be a new
signup, App Runner is off the table. AWS's own recommended successor is
**Amazon ECS Express Mode** — a heavily simplified ECS mode (one form
instead of 6–8 console pages, automates load-balancer/scaling/HTTPS wiring,
no separate service fee) built specifically to fill the gap App Runner
leaves. The plan below now targets ECS Express Mode instead.

**Worth flagging honestly:** ECS Express Mode is itself a very new AWS
feature (broad rollout as recent as mid-2026), and AWS just discontinued its
previous "simple container hosting" product after a few years on the
market. That's a real signal about how much to trust AWS's easy-tier
products for long-term stability, independent of technical fit — factor
that into the AWS-vs-DigitalOcean decision, not just cost/complexity.

## Decision so far

- Only `backend/` (the PHP/MySQL API) moves. `website/` stays on Hostinger —
  it doesn't need to move for this to work, since the mobile app never
  touches it, and moving it adds no redundancy benefit (static hosting is
  effectively free/zero-risk wherever it sits).
- Target: **AWS ECS Express Mode** (compute) + **RDS MySQL Multi-AZ**
  (database), not raw EC2+RDS. Same rationale as before (avoid raw EC2/VPC
  hands-on management), now via ECS Express Mode instead of App Runner.
- Cost/complexity tradeoff vs. the DigitalOcean App Platform plan (~$70–75/mo,
  no IAM/VPC learning curve, and *not* subject to this kind of AWS product
  churn) was discussed and AWS was chosen anyway for its larger-scale track
  record, accepting the higher cost and the residual learning curve
  described below.

## Steps

1. **AWS account safeguards (before creating anything else)**
   - Create a Billing Budget + alarm first. AWS's most common first-timer
     shock is a surprise bill, not a security incident.
   - Create an IAM user for daily work (never use the root account), scoped
     to App Runner/RDS/VPC permissions only, with MFA enabled.

2. **Database layer: RDS MySQL, Multi-AZ**
   - Create the RDS instance with **Multi-AZ enabled at creation** — toggling
     it on later requires a maintenance-window reboot, so it's not a free
     "add it later" option.
   - Size conservatively (small burstable instance class) to match this
     app's actual current load — resize later rather than over-provision now.
   - Put RDS in a private subnet, security group open only to App Runner's
     VPC Connector — never expose the database publicly.
   - Enable automated backups with a real retention window.
   - Migrate data via `mysqldump` from the current host into RDS. **Test the
     restore on a throwaway RDS instance first** before touching anything
     that will become production.

3. **Compute layer: ECS Express Mode** (supersedes App Runner — see
   correction note above)
   - Package the PHP backend as a container image — ECS, like App Runner,
     is container-based, so a Dockerfile is still required either way.
   - ECS Express Mode asks for just the container image plus an IAM task
     execution role and an infrastructure role — it automates the
     load-balancer/scaling/HTTPS wiring that raw ECS would otherwise expose
     as separate manual steps. Confirm at execution time whether it still
     needs an explicit VPC/security-group path to reach RDS (App Runner's
     "VPC Connector" concept may or may not carry over identically).
   - Put every secret (DB credentials, RevenueCat/Razorpay keys, the Slack
     incident webhook, the monitoring API key) into environment
     variables/Secrets Manager — never bake them into the image.
   - Health check: point it at the existing `monitoring/health.php` endpoint
     already built this session — no new work needed there.
   - Set minimum task count to **2** from day one for real redundancy, not 1.
   - No separate ECS Express Mode service fee — cost is just the underlying
     compute (Fargate) plus a shared load balancer, which can be shared
     across up to 25 services if this AWS account ever hosts more than one.

4. **DNS cutover**
   - Lower the current API hostname's DNS TTL *before* the migration window,
     so cutover (and any rollback) propagates fast.
   - Test fully against App Runner's own `*.awsapprunner.com` URL before
     touching DNS at all.
   - Only then repoint the real API hostname (custom domain association in
     App Runner, or a CNAME) — keep the hostname itself unchanged so the
     Flutter app's `api_config.dart` needs no change and no app-store release.

5. **File uploads — a real code change, not just infra config**
   - `backend/lib/upload.php` currently writes to local disk
     (`backend/uploads/`). With 2+ App Runner instances, a file saved on one
     instance doesn't exist on the other. Must move uploads to **S3** before
     running more than one instance.

6. **Cutover validation**
   - Smoke-test every endpoint post-cutover: login, offers, payments,
     `monitoring/health.php`.
   - **Update the webhook URLs configured in the Razorpay and RevenueCat
     dashboards** to point at the new host — they're independently
     configured there and won't follow the migration automatically.
   - Confirm the mobile app still works against the (unchanged) hostname.

7. **Decommission the old host only after a soak period** — keep Hostinger
   running, unbilled changes reversible, for a few days/weeks of observation
   before canceling anything.

## Pitfalls (the parts most likely to bite)

- **No billing alarm set before resource creation** → surprise bill, the
  single most common first-AWS-project complaint.
- **Multi-AZ toggled on after creation** → an unplanned reboot/downtime
  window, defeating the point. Enable it at creation.
- **ECS Express Mode + PHP means Docker**, same as App Runner did — a
  Dockerfile is something someone has to write and maintain either way.
- **Betting on a very new AWS product** — ECS Express Mode is itself recent
  (mid-2026 broad rollout), and it exists precisely because AWS discontinued
  the previous "simple container hosting" product. No guarantee this one
  has a longer shelf life; DigitalOcean App Platform doesn't carry this risk.
- **Uploads silently breaking on a second instance** — this doesn't error
  loudly; it shows up as "the banner image sometimes doesn't load," depending
  on which instance served the request. Easy to miss until a customer reports it.
- **Hardcoded secrets in the container image or repo** — a real security
  regression if this migration is done in a hurry.
- **Forgotten webhook URLs** — Razorpay/RevenueCat dashboards keep their own
  copy of the callback URL. If not updated, payments will appear to work from
  the user's side while confirmation webhooks silently fail against the dead
  old host — a dangerous, quiet failure mode specific to payment flows.
- **VPC Connector / security group misconfiguration** — App Runner needs
  explicit network permission to reach RDS. Getting this wrong is a very
  common first-time stumbling block (the app deploys fine, then can't reach
  its own database).
- **Long DNS TTL** on the current record — lower it ahead of time or cutover
  (and rollback, if needed) takes hours instead of minutes.
- **App Runner's request-based pricing gets expensive under spiky load** —
  less predictable than DigitalOcean's flat per-instance pricing; worth
  watching the bill after cutover, not just at signup.
- **No rollback plan** — keep the old host live and DNS-reversible for a
  soak period; don't cancel anything on migration day.
- **The team's own stated capacity concern** — App Runner + RDS meaningfully
  lowers ongoing maintenance versus raw EC2 (patching is largely automatic),
  but IAM hygiene, budget review, and the AWS console dashboards still need
  *someone* checking in periodically. If genuinely nobody will ever do that,
  that's a real operational risk independent of which provider is chosen.

## Still open

- Confirm current ECS Express Mode PHP/Docker support, VPC/RDS connectivity
  path, and pricing at execution time — this plan was researched via web
  search in September 2026 and service details can change (App Runner's
  own discontinuation mid-plan is a live example of exactly this risk).
- No AWS resources, code changes, or DNS changes have been made. This file
  is a plan for review, per explicit instruction not to implement yet.
