<?php
require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/response.php';

const TOKEN_TTL_DAYS = 30;

function issue_token(int $userId): string {
    $pdo = gmls_db();
    $token = bin2hex(random_bytes(32));
    $expiresAt = (new DateTime("+" . TOKEN_TTL_DAYS . " days"))->format('Y-m-d H:i:s');

    $stmt = $pdo->prepare(
        'INSERT INTO auth_tokens (user_id, token, expires_at) VALUES (?, ?, ?)'
    );
    $stmt->execute([$userId, $token, $expiresAt]);

    return $token;
}

function bearer_token(): ?string {
    $header = $_SERVER['HTTP_AUTHORIZATION'] ?? '';
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

    $pdo = gmls_db();
    $stmt = $pdo->prepare(
        'SELECT u.* FROM auth_tokens t
         JOIN users u ON u.id = t.user_id
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

/** Halts the request with 403 unless the current user has one of the given roles. */
function require_role(array $user, array $roles): void {
    if (!in_array($user['role'], $roles, true)) {
        json_error('Forbidden: insufficient role', 403);
    }
}
