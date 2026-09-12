<?php
require_once __DIR__ . '/../config/revenuecat.php';
require_once __DIR__ . '/razorpay.php'; // for mall_extend_subscription() — provider-agnostic, reused as-is

/**
 * Confirms the subscriber holds an active REVENUECAT_ENTITLEMENT_ID
 * entitlement, directly against RevenueCat's REST API — used by
 * revenuecat_sync.php as a fast, client-triggered backstop so the app
 * doesn't have to wait on the webhook round-trip after a purchase. Returns
 * ['plan_key' => ..., 'transaction_id' => ...] for that entitlement, or
 * null if RevenueCat doesn't confirm it's active.
 *
 * The Flutter SDK's CustomerInfo doesn't expose a raw store transaction id,
 * so [purchase_date]+product identifier (both present in this REST
 * response) stands in as a stable-enough idempotency key for the sync path
 * — the webhook path gets RevenueCat's real transaction_id directly instead
 * (see revenuecat_webhook.php), so this workaround is scoped to sync only.
 */
function revenuecat_confirm_purchase(string $appUserId): ?array {
    $ch = curl_init('https://api.revenuecat.com/v1/subscribers/' . rawurlencode($appUserId));
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_HTTPHEADER => [
            'Authorization: Bearer ' . REVENUECAT_SECRET_API_KEY,
            'Content-Type: application/json',
        ],
    ]);
    $response = curl_exec($ch);
    $status = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    if ($response === false || $status >= 300) {
        return null;
    }
    $decoded = json_decode($response, true);
    $entitlement = $decoded['subscriber']['entitlements'][REVENUECAT_ENTITLEMENT_ID] ?? null;
    if ($entitlement === null) {
        return null;
    }
    $expiresAt = $entitlement['expires_date'] ?? null;
    if ($expiresAt !== null && strtotime($expiresAt) <= time()) {
        return null;
    }
    $planKey = $entitlement['product_identifier'] ?? null;
    $purchaseDate = $entitlement['purchase_date'] ?? null;
    if ($planKey === null || $purchaseDate === null) {
        return null;
    }
    return ['plan_key' => $planKey, 'transaction_id' => "{$planKey}:{$purchaseDate}"];
}

/**
 * Applies a RevenueCat mall_subscription purchase's benefit — extends the
 * mall's subscription_expires_at by that plan's duration_days, and records
 * a payments row so the transaction can't be fulfilled twice (guarded by
 * the unique index on revenuecat_transaction_id, same idempotency intent as
 * razorpay_fulfill_payment()'s status!='paid' guard). Called from both
 * revenuecat_webhook.php (the source of truth) and revenuecat_sync.php (the
 * client-triggered backstop) — whichever gets there first wins, the other
 * silently no-ops.
 */
function revenuecat_fulfill_mall_subscription(
    PDO $pdo,
    int $userId,
    int $mallId,
    string $planKey,
    string $transactionId
): bool {
    $stmt = $pdo->prepare(
        "SELECT amount, duration_days FROM rate_cards WHERE plan_key = ? AND tier = 'mall_subscription' AND is_active = 1"
    );
    $stmt->execute([$planKey]);
    $plan = $stmt->fetch();
    if (!$plan) {
        return false;
    }

    // INSERT IGNORE relies on the unique index on revenuecat_transaction_id —
    // a re-sent webhook (or a webhook racing the sync backstop) for the same
    // transaction inserts nothing the second time, so the extend below only
    // ever runs once per real purchase.
    $stmt = $pdo->prepare(
        "INSERT IGNORE INTO payments
            (user_id, purpose, provider, target_type, target_id, plan_key, amount, currency, revenuecat_transaction_id, status, fulfilled_at)
         VALUES (?, 'mall_subscription', 'revenuecat', 'mall', ?, ?, ?, 'INR', ?, 'paid', NOW())"
    );
    $stmt->execute([$userId, $mallId, $planKey, $plan['amount'], $transactionId]);

    if ($stmt->rowCount() === 0) {
        return false; // already fulfilled by an earlier webhook/sync call
    }

    mall_extend_subscription($pdo, $mallId, (int) $plan['duration_days']);
    return true;
}
