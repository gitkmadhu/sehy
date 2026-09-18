<?php
// Shared secret for one-off schema-migration endpoints (backend/endpoints/
// admin/_run_*_once.php) — lets those be called without a real super_admin
// login, same reasoning/pattern as config/monitoring.php's MONITORING_API_KEY.
// Generate any long random string yourself (e.g. `openssl rand -hex 32`),
// set it as an *encrypted* environment variable in production, and use the
// same value as the Authorization header when calling a migration
// endpoint. Leaving this as REPLACE_ME means every migration endpoint
// always rejects with 401.
define('MIGRATION_API_KEY', getenv('MIGRATION_API_KEY') !== false ? getenv('MIGRATION_API_KEY') : 'REPLACE_ME');
