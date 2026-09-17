<?php
// Shared secret required in the "Authorization" header of
// monitoring/health.php — generate any long random string yourself (e.g.
// `openssl rand -hex 32`), set it as an environment variable in production,
// and give the same value to whatever external monitoring tool polls that
// endpoint. Leaving this as REPLACE_ME means health.php always rejects with 401.
define('MONITORING_API_KEY', getenv('MONITORING_API_KEY') !== false ? getenv('MONITORING_API_KEY') : 'REPLACE_ME');
