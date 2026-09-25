<?php
require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/response.php';

const TOKEN_TTL_DAYS = 30;

function issue_token(int $userId): string {
    $pdo = sehy_db();
    $token = bin2hex(random_bytes(32));
    $expiresAt = (new DateTime("+" . TOKEN_TTL_DAYS . " days"))->format('Y-m-d H:i:s');

    $stmt = $pdo->prepare(
        'INSERT INTO auth_tokens (user_id, token, expires_at) VALUES (?, ?, ?)'
    );
    $stmt->execute([$userId, $token, $expiresAt]);

    return $token;
}

/**
 * Raw "Authorization" header value, however the caller sent it (a bare
 * shared secret, "Bearer <token>", etc.) — used both by bearer_token()
 * below and by webhook endpoints (e.g. revenuecat_webhook.php) that compare
 * it directly rather than extracting a bearer token from it.
 */
function raw_authorization_header(): string {
    // Apache/mod_php commonly drops the Authorization header from $_SERVER;
    // apache_request_headers() still sees it, so fall back to that.
    $header = $_SERVER['HTTP_AUTHORIZATION'] ?? $_SERVER['REDIRECT_HTTP_AUTHORIZATION'] ?? '';
    if (!$header && function_exists('apache_request_headers')) {
        // apache_request_headers() preserves whatever casing the client sent
        // (e.g. Dart's http client sends "authorization", curl sends
        // "Authorization"), so look it up case-insensitively.
        foreach (apache_request_headers() as $name => $value) {
            if (strcasecmp($name, 'Authorization') === 0) {
                $header = $value;
                break;
            }
        }
    }
    return $header;
}

function bearer_token(): ?string {
    $header = raw_authorization_header();
    if (preg_match('/Bearer\s+(\S+)/', $header, $matches)) {
        return $matches[1];
    }
    return null;
}

/** Returns the authenticated user row, or halts the request with 401. */
function current_user(): array {
    $token = bearer_token();
    if (!$token) {
        json_error('Missing Authorization bearer token', 401);
    }

    $pdo = sehy_db();
    $stmt = $pdo->prepare(
        'SELECT u.*, m.name AS category_name, s.name AS service_name FROM auth_tokens t
         JOIN users u ON u.id = t.user_id
         LEFT JOIN categories m ON m.id = u.category_id
         LEFT JOIN services s ON s.id = u.service_id
         WHERE t.token = ? AND t.expires_at > NOW()'
    );
    $stmt->execute([$token]);
    $user = $stmt->fetch();

    if (!$user) {
        json_error('Invalid or expired token', 401);
    }
    unset($user['password_hash']);
    return $user;
}

/**
 * Like current_user(), but returns null instead of halting when there's no
 * (or an invalid) token — for endpoints that are public but behave
 * differently for a signed-in admin, e.g. categories/list.php.
 */
function current_user_optional(): ?array {
    $token = bearer_token();
    if (!$token) {
        return null;
    }

    $pdo = sehy_db();
    $stmt = $pdo->prepare(
        'SELECT u.*, m.name AS category_name, s.name AS service_name FROM auth_tokens t
         JOIN users u ON u.id = t.user_id
         LEFT JOIN categories m ON m.id = u.category_id
         LEFT JOIN services s ON s.id = u.service_id
         WHERE t.token = ? AND t.expires_at > NOW()'
    );
    $stmt->execute([$token]);
    $user = $stmt->fetch();
    if (!$user) {
        return null;
    }
    unset($user['password_hash']);
    return $user;
}

/**
 * Halts the request with 403 unless the current user has one of the given
 * roles. super_admin is a blanket exception: it passes any check that
 * allows 'admin', on top of whatever else the list allows — so super_admin
 * never needs to be listed alongside 'admin' at each call site.
 */
function require_role(array $user, array $roles): void {
    if ($user['role'] === 'super_admin' && in_array('admin', $roles, true)) {
        return;
    }
    if (!in_array($user['role'], $roles, true)) {
        json_error('Forbidden: insufficient role', 403);
    }
}

/**
 * True for both 'admin' and 'super_admin'. Use this instead of comparing
 * $user['role'] === 'admin' directly wherever the check isn't already going
 * through require_role() (e.g. current_user_optional()-based public/admin
 * dual-behavior endpoints, or inline authorization checks).
 */
function is_admin(?array $user): bool {
    return $user !== null && in_array($user['role'], ['admin', 'super_admin'], true);
}

/**
 * True only for 'super_admin' — plain 'admin' does not count. Category
 * create/update/delete are restricted to super_admin (see endpoints/categories/*
 * and admin/review_category.php); use this instead of is_admin() at those call
 * sites so a plain admin isn't treated as privileged there.
 */
function is_super_admin(?array $user): bool {
    return $user !== null && $user['role'] === 'super_admin';
}

/** Whether the user may create/edit offers or edit service details for the given service. */
function can_manage_service(array $user, array $service): bool {
    if (is_admin($user)) {
        return true;
    }
    if ($user['role'] === 'service_owner') {
        return (int) $service['owner_id'] === (int) $user['id'];
    }
    if ($user['role'] === 'category_manager') {
        return $user['category_id'] !== null && (int) $service['category_id'] === (int) $user['category_id'];
    }
    if ($user['role'] === 'service_staff') {
        // Callers pass either a service row (its own id under 'id') or an
        // offer row (the service it belongs to under 'service_id') — prefer
        // 'service_id' when present since 'id' would then be the offer's own id.
        $serviceId = $service['service_id'] ?? $service['id'];
        return $user['service_id'] !== null && (int) $serviceId === (int) $user['service_id'];
    }
    return false;
}

/** Whether the user may edit the given unit's profile (admins, or the unit's own manager/staff). */
function can_manage_unit(array $user, array $unit): bool {
    if (is_admin($user)) {
        return true;
    }
    if (in_array($user['role'], ['unit_manager', 'unit_staff'], true)) {
        return $user['unit_id'] !== null && (int) $unit['id'] === (int) $user['unit_id'];
    }
    return false;
}
