<?php
// Real-time Slack alerts for business incidents recorded via lib/incidents.php
// (payment failures, banner publish failures, failed logins, RevenueCat
// webhook failures) — separate from scripts/health_alert's webhook, which is
// polled by an external cron process instead of posted to directly from PHP.
// Slack > Settings > Incoming Webhooks > Add New Webhook to Workspace.
// Leaving this as REPLACE_ME means incidents still get recorded and are
// visible in the admin Incidents tab, but no Slack message is sent.
const SLACK_INCIDENTS_WEBHOOK_URL = 'REPLACE_ME';
