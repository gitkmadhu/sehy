<?php
require_once __DIR__ . '/../config/razorpay.php';

/** Creates a Razorpay order via the REST API. Returns the decoded order (includes 'id'). */
function razorpay_create_order(int $amountPaise, string $currency, string $receipt): array {
    $ch = curl_init('https://api.razorpay.com/v1/orders');
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_POST => true,
        CURLOPT_USERPWD => RAZORPAY_KEY_ID . ':' . RAZORPAY_KEY_SECRET,
        CURLOPT_HTTPHEADER => ['Content-Type: application/json'],
        CURLOPT_POSTFIELDS => json_encode([
            'amount' => $amountPaise,
            'currency' => $currency,
            'receipt' => $receipt,
        ]),
    ]);
    $response = curl_exec($ch);
    $status = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $error = curl_error($ch);
    curl_close($ch);

    if ($response === false) {
        json_error("Could not reach Razorpay: {$error}", 502);
    }
    $decoded = json_decode($response, true);
    if ($status >= 300 || !isset($decoded['id'])) {
        json_error('Razorpay order creation failed: ' . ($decoded['error']['description'] ?? 'unknown error'), 502);
    }
    return $decoded;
}

/** Verifies a client-reported payment signature (order_id|payment_id signed with the key secret). */
function razorpay_verify_signature(string $orderId, string $paymentId, string $signature): bool {
    $expected = hash_hmac('sha256', "{$orderId}|{$paymentId}", RAZORPAY_KEY_SECRET);
    return hash_equals($expected, $signature);
}

/** Verifies a Razorpay webhook request signature against the raw request body. */
function razorpay_verify_webhook_signature(string $payload, string $signature): bool {
    $expected = hash_hmac('sha256', $payload, RAZORPAY_WEBHOOK_SECRET);
    return hash_equals($expected, $signature);
}

/**
 * Extends a mall's ad subscription by $days, from whichever is later: now,
 * or its current expiry (so renewing early adds on top instead of wasting
 * the remaining paid window). Used by both razorpay_fulfill_payment() (a
 * mall_manager's self-service purchase) and malls/update.php (an admin's
 * manual grant/comp), so the two paths can't drift apart in semantics.
 * Computed entirely in SQL (NOW()) since Apache's PHP timezone and MySQL's
 * do not match on this deployment — see mall_ads/create.php.
 */
function mall_extend_subscription(PDO $pdo, int $mallId, int $days): void {
    $pdo->prepare(
        'UPDATE malls SET subscription_expires_at = DATE_ADD(GREATEST(NOW(), COALESCE(subscription_expires_at, NOW())), INTERVAL ? DAY) WHERE id = ?'
    )->execute([$days, $mallId]);
}

/**
 * Applies a paid payment's benefit. Called right after a payment's status
 * transitions to 'paid' (from both verify.php and webhook.php, whichever
 * request wins that race — callers only invoke this when their own UPDATE
 * actually changed a row, so it runs exactly once per payment).
 *
 * Credit/subscription-style purposes are fulfilled immediately here.
 * 'store_listing' is a voucher instead — nothing to apply yet, since the
 * store it unlocks doesn't exist until stores/create.php spends it.
 */
function razorpay_fulfill_payment(PDO $pdo, array $payment): void {
    switch ($payment['purpose']) {
        case 'store_ad_credits':
            $pdo->prepare('UPDATE stores SET ad_credits = ad_credits + ? WHERE id = ?')
                ->execute([$payment['quantity'], $payment['target_id']]);
            break;
        case 'mall_subscription':
            $stmt = $pdo->prepare('SELECT duration_days FROM rate_cards WHERE plan_key = ?');
            $stmt->execute([$payment['plan_key']]);
            $days = (int) $stmt->fetchColumn();
            mall_extend_subscription($pdo, (int) $payment['target_id'], $days);
            break;
        case 'store_listing':
            // No-op — see docblock above.
            break;
    }
}
