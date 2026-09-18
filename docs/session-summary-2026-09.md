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

## 7. Cities/Malls data import

- Imported a large India cities/malls table provided as an image, then as
  exact pasted text after an initial attempt risked fabricating plausible-
  sounding mall names for unclear rows — caught and flagged before running
  anything, then redone faithfully once the user pasted exact text.
- Reconciled several rounds of Mumbai-region mall lists (Thane / Mumbai /
  Navi Mumbai splits, and Chandigarh / Mohali / Zirakpur) using location
  hints in the source text, confidence-labeling the less-certain rows.
- Added three high-confidence gap-fill malls the user approved (Garuda
  Mall, Chennai Citi Centre, Forum Mall Elgin Road).

## 8. Admin CMS navigation/UX overhaul

- Renamed Overview → Dashboard; consolidated a Review tab; regrouped the
  sidebar nav (City / Marketing / Engagement / Insights / Platform).
- Dashboard gained a cascading City → Mall → Store picker with search-
  filterable dropdowns and click-through to the actual mall/store page.
- Split the old single Banners tab into App Banners / Mall Banners / City
  Banners / All Banners; added an Activity Log tab (audit trail via
  `log_admin_action()`, already wired into every admin-privileged mutation
  this session added).
- Mall Banners was widened from super_admin-only to plain `admin` too
  (initially built super_admin-only, corrected after the user clarified);
  city/mall creation/deletion and subscription management stayed
  super_admin-only.

## 9. Owner Chat + FAQ bot

- Built a WhatsApp-*styled* (not real WhatsApp API — that needs the
  user's own Meta Business verification, ruled disproportionate) chat UI
  in the admin CMS, reusing the existing `user_notifications` table
  (`type='admin_message'`/`'owner_message'`) rather than new
  infrastructure. Admin picks an owner, sees the full thread, sends a
  message; became bidirectional after the FAQ bot's fallback path was
  wired to let owners message admin back the same way.
- Added a static, keyword-matched FAQ bot (no external AI provider/cost)
  reachable from the mall-manager/store-owner mobile app screens —
  unmatched questions offer to forward the question to admin via the same
  channel above.
- Discovered and fixed a real gap while building this: `store_owner`
  accounts were silently blocked from the mobile app entirely (a leftover
  "manage via the website" restriction); lifted it and gave them a proper
  notifications home screen (mirroring the existing mall_manager one).
  Owners can swipe to delete an admin reply (not a pending task item —
  those stay, since deleting one wouldn't resolve the underlying work).

## 10. Store/Mall KYC

**Phase 1 (shipped):** GSTIN now goes through the real published
check-digit algorithm (verified against a real GSTIN before trusting it);
PAN gets format-only validation (no public checksum digit exists for
PAN). Store owners must also upload a mall-store allocation-proof
document (image or PDF — new `save_document_upload()` helper alongside
the image-only `save_upload()`). Store creation also picked up: mandatory
contact email + mandatory store image (previously optional), plus
suggested profile fields (tagline, opening hours, floor/unit). GSTIN/PAN
were later relaxed from "both required" to "at least one required" —
many small businesses below the GST threshold only hold a PAN.
Admin review queue surfaces all of this inline for manual eyeballing;
none of it auto-approves/auto-rejects anything.

**Phase 2 (in progress):** integrating real paid GST/PAN registry
verification via Eko Platform Services (self-serve signup, sandbox
available immediately, ~₹0.72/GST call + ~₹1.20/PAN call, one account
covers both). Design mirrors this codebase's own existing pattern for
`admin/refresh_ratings.php` (the also-paid Google Places lookup) — runs
admin-triggered on demand from the review queue, never automatically at
submission time, so a slow/down third party can't block a real
submission and admin controls spend. **Still needs:** the user's own Eko
account + API keys (can't be created on their behalf), and — importantly
— a real sandbox call to confirm the exact PAN response shape before
trusting it (the documented "PAN Lite" endpoint expects an individual's
name+DOB match, which doesn't fit a business/company PAN; building
against the plainer "Fetch PAN Details" endpoint instead, but its exact
response fields are unconfirmed from docs alone).

## 11. Google Maps location picker

- Added a search-and-drag-a-pin location picker to store creation,
  feeding the existing (previously always-empty) `latitude`/`longitude`
  columns. Gated on a `GOOGLE_MAPS_BROWSER_KEY` config value, same
  graceful-hide-until-configured pattern as GA4's measurement ID.
- Hit a real compatibility issue once given a real key: the classic
  `google.maps.places.Autocomplete` widget has been closed to new API
  keys since March 2025. Migrated to its replacement,
  `PlaceAutocompleteElement`, and verified end-to-end with a real address
  search → pin placement → form submit → correct lat/long in the
  database.
- The API key's HTTP-referrer restriction is currently `localhost/*`
  only — needs updating once the website has a real public domain.

## 12. Google Analytics 4 — actually connected

- GA4 was previously fully coded (platform/mall/store reports, role-
  scoped correctly for Super Admin/Mall Manager/Store Owner already) but
  never actually connected — no measurement ID, no property ID, no
  service account. Walked through creating the GA4 property/web stream
  (GA4 rejects `localhost` as a stream URL; used the DigitalOcean app
  domain as a placeholder) and wired the real measurement ID into both
  local and production — confirmed real page-view events now actually
  reach Google (inspected the live network request).
- Found and fixed a real bug while doing this: the mall/store report
  filter used the bare parameter name (`mall_id`) instead of GA4 Data
  API's required `customEvent:mall_id` convention for event-scoped custom
  dimensions — would have silently returned empty data forever.
- Added city-wise reporting as a third dimension alongside the existing
  mall/store ones (new event parameter on both the website and the
  Flutter app's screen-view tracking, a new `city_report.php`, a City
  picker in the Super Admin drill-down) — verified real GA4 collect
  requests carry the new parameter correctly.
- Mobile app-side analytics (Firebase Analytics) is also already fully
  coded to feed the same property, but Firebase itself isn't set up for
  the app yet — separate pending task.

## 13. Slack incident alerts — activated

- The Slack integration (`lib/incidents.php`) was already fully coded;
  only `SLACK_INCIDENTS_WEBHOOK_URL` was still a placeholder. Walked
  through creating a Slack app + Incoming Webhook (confirmed: works on
  Slack's free plan, no Pro needed), set the real webhook, and verified
  with a real end-to-end test — a deliberate failed login against
  production produced a real message in the Slack channel.

## 14. Reusable migration mechanism

- Direct access to the production database is blocked at the network
  level (DigitalOcean's Trusted Sources) — confirmed again this session
  by testing a real, valid raw database credential set the user shared;
  the connection hung rather than refused, consistent with the earlier
  finding. Real DB credentials shared in chat should be rotated in the DO
  dashboard as a precaution, same as the earlier one.
- Rather than needing the user to dig up a super_admin app login every
  time a one-off migration is needed, added `MIGRATION_API_KEY` — a
  shared-secret gate on temporary migration endpoints, mirroring the
  existing `MONITORING_API_KEY` pattern exactly. This stays in place
  permanently (unlike the one-off migration endpoints themselves, which
  get deleted after use) so future schema migrations don't need this
  same back-and-forth again.

## 15. Registration/login page UX

- Removed Shopper from the website's registration role list (shoppers
  use the Flutter app; this form is only ever for the business roles).
- Converted the "I am a" role picker from a dropdown to radio buttons,
  arranged in a 2-column grid (Mall Manager/Mall Staff in one column,
  Store Manager/Store Staff in the other) — caught and fixed a real CSS
  bug the swap exposed (a global input-width rule was stretching each
  radio button into a full-width block).
- Added a City → Mall cascading, search-as-you-type picker to
  registration (previously a single flat mall dropdown), extended to
  Store Manager too (optional there — not every store is in a mall).
- Simplified the sign-in page copy ("Welcome back" → "Welcome", dropped
  the shopper-oriented subtitle, replaced the sign-up link's wording a
  few times ending on "Add Store/Mall - **Sign Up**" with just "Sign Up"
  underlined).

## Still pending (as of this writing)

- Eko GST/PAN paid verification — needs the user's Eko account/keys and
  a real sandbox test before trusting the PAN response shape.
- Firebase setup for the mobile app (push notifications, analytics, and
  phone-OTP for registration) — code is ready, Firebase project/app
  registration + Blaze plan still needed from the user.
- A "mall/store manager creates staff accounts directly" feature was
  proposed (to replace/supplement staff self-registration) — explicitly
  put on hold by the user mid-discussion, not started.
- The website itself (`website/`) is still not deployed anywhere public —
  only the backend API is live on DigitalOcean. Everything web-side this
  session was verified against local XAMPP.
- Google Maps API key's referrer restriction needs widening beyond
  `localhost/*` once/if the website gets a real public domain.
- Same DNS-cutover and Autodeploy-disable items from section 6 remain
  open.
