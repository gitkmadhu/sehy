<?php
require_once __DIR__ . '/../../lib/bootstrap.php';
require_once __DIR__ . '/../../lib/revenuecat.php';

// Called directly by RevenueCat's servers (server-to-server) — authenticated
// via the shared Authorization header set in the dashboard, not a bearer
// token, so current_user() is never called here (same pattern as Razorpay's
// webhook.php).
if (!hash_equals(REVENUECAT_WEBHOOK_AUTH_HEADER, raw_authorization_header())) {
    json_error('Invalid webhook authorization', 401);
}

$event = json_decode(file_get_contents('php://input'), true)['event'] ?? null;
if (!$event || !in_array($event['type'] ?? '', ['INITIAL_PURCHASE', 'RENEWAL'], true)) {
    json_ok(['ignored' => true]);
}

// Only act on a purchase that actually grants our mall-ad entitlement — a
// project can sell other products/entitlements later that this endpoint
// has no business fulfilling.
if (!in_array(REVENUECAT_ENTITLEMENT_ID, $event['entitlement_ids'] ?? [], true)) {
    json_ok(['ignored' => true]);
}

// app_user_id is our own users.id, set via Purchases.logIn() right after
// sign-in in the app (see lib/core/purchases/purchase_service.dart) —
// product_id is the rate_cards.plan_key (see backend/config/schema.sql's
// note on payments.plan_key for why these must match exactly).
$userId = (int) ($event['app_user_id'] ?? 0);
$planKey = $event['product_id'] ?? null;
$transactionId = $event['transaction_id'] ?? null;

if (!$userId || !$planKey || !$transactionId) {
    json_ok(['ignored' => true]);
}

$pdo = gmls_db();
$stmt = $pdo->prepare("SELECT mall_id FROM users WHERE id = ? AND role IN ('mall_manager', 'mall_staff')");
$stmt->execute([$userId]);
$mallId = $stmt->fetchColumn();

if (!$mallId) {
    json_ok(['ignored' => true]);
}

revenuecat_fulfill_mall_subscription($pdo, $userId, (int) $mallId, $planKey, $transactionId);

json_ok(['received' => true]);
