<?php
// Copy this file to config.php (gitignored) and fill in real values.
// config.php is never committed — it holds a live Slack webhook URL.

// Same URL you'd curl by hand to check health.
const HEALTH_URL = 'http://localhost/gmls_api/endpoints/monitoring/health.php';

// Must match MONITORING_API_KEY in backend/config/monitoring.php.
const MONITORING_KEY = 'REPLACE_ME';

// Slack > Settings > Incoming Webhooks > Add New Webhook to Workspace.
const SLACK_WEBHOOK_URL = 'https://hooks.slack.com/services/REPLACE/ME/WITH_YOUR_WEBHOOK';
