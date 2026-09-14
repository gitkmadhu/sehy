<?php
const ERROR_LOG_PATH = __DIR__ . '/../logs/errors.log';
const ERROR_LOG_MAX_BYTES = 10 * 1024 * 1024; // 10MB — simple self-managed rotation, no external dependency.

/**
 * Appends one JSON line to backend/logs/errors.log — the structured format
 * a monitoring tool (e.g. Hermes Agent) tails/polls instead of relying on
 * Apache's shared, unstructured error log. Never throws: a logging failure
 * (e.g. unwritable directory) must not itself take an endpoint down.
 */
function log_error(string $level, string $message, array $context = []): void {
    // 0755 alone isn't enough on this project's XAMPP setup — Apache/PHP
    // runs as a different user (`daemon`) than the files were created
    // under, same reason backend/uploads/ ended up chmod 777 rather than
    // relying on mkdir's mode (which is also subject to the process umask).
    $dir = dirname(ERROR_LOG_PATH);
    if (!is_dir($dir)) {
        @mkdir($dir, 0777, true);
        @chmod($dir, 0777);
    }
    if (@filesize(ERROR_LOG_PATH) > ERROR_LOG_MAX_BYTES) {
        @file_put_contents(ERROR_LOG_PATH, '');
    }

    $entry = [
        'timestamp' => date('c'),
        'level' => $level,
        'message' => $message,
        'context' => $context,
    ];
    @file_put_contents(ERROR_LOG_PATH, json_encode($entry) . "\n", FILE_APPEND | LOCK_EX);
}

/**
 * Request context every log_error() call here attaches — never the
 * password hash. current_user_optional() itself hits the DB, and this is
 * called from inside the exception handler below — if the original
 * exception *was* a DB failure, that call would throw again, and an
 * exception escaping a set_exception_handler callback is fatal with no
 * output at all. Guarded so the original error still gets logged either way.
 */
function error_request_context(): array {
    $context = [
        'method' => $_SERVER['REQUEST_METHOD'] ?? null,
        'path' => $_SERVER['REQUEST_URI'] ?? null,
    ];
    try {
        $user = current_user_optional();
        if ($user !== null) {
            $context['user_id'] = $user['id'];
        }
    } catch (Throwable $e) {
        $context['user_id'] = null;
    }
    return $context;
}

/**
 * Installs global handlers so nothing uncaught leaks a raw PHP error page
 * (or vanishes silently) — every endpoint already requires bootstrap.php
 * first, so this is the one place this needs to be wired up.
 */
function register_error_handlers(): void {
    set_exception_handler(function (Throwable $e) {
        log_error('error', $e->getMessage(), array_merge(error_request_context(), [
            'exception' => get_class($e),
            'file' => $e->getFile(),
            'line' => $e->getLine(),
        ]));
        json_error('Something went wrong', 500);
    });

    set_error_handler(function (int $severity, string $message, string $file, int $line) {
        // Respects error_reporting()/@-suppression, same as PHP's default handler.
        if (!(error_reporting() & $severity)) {
            return false;
        }
        log_error('warning', $message, array_merge(error_request_context(), [
            'file' => $file,
            'line' => $line,
        ]));
        return true; // handled — don't also run PHP's built-in handler
    });

    register_shutdown_function(function () {
        $error = error_get_last();
        if ($error !== null && in_array($error['type'], [E_ERROR, E_PARSE, E_CORE_ERROR, E_COMPILE_ERROR], true)) {
            log_error('fatal', $error['message'], array_merge(error_request_context(), [
                'file' => $error['file'],
                'line' => $error['line'],
            ]));
        }
    });
}
