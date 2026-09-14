<?php
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/response.php';
require_once __DIR__ . '/auth.php';
require_once __DIR__ . '/error_logging.php';

// Every endpoint requires this file first, so this is the one place to hook
// a global handler — nothing uncaught should ever leak a raw PHP error page
// or vanish unlogged. See lib/error_logging.php / endpoints/monitoring/health.php.
register_error_handlers();
