<?php
// Real-time Slack alerts for business incidents recorded via lib/incidents.php
// (payment failures, banner publish failures, failed logins, RevenueCat
// webhook failures) — separate from scripts/health_alert's webhook, which is
// polled by an external cron process instead of posted to directly from PHP.
// Slack > Settings > Incoming Webhooks > Add New Webhook to Workspace, then
// set SLACK_INCIDENTS_WEBHOOK_URL as an environment variable in production.
// Leaving this as REPLACE_ME means incidents still get recorded and are
// visible in the admin Incidents tab, but no Slack message is sent.
define('SLACK_INCIDENTS_WEBHOOK_URL', getenv('SLACK_INCIDENTS_WEBHOOK_URL') !== false ? getenv('SLACK_INCIDENTS_WEBHOOK_URL') : 'REPLACE_ME');
