<?php
require_once __DIR__ . '/../../lib/bootstrap.php';
require_once __DIR__ . '/../../lib/revenuecat.php';

// Client-triggered backstop, called right after Purchases.purchasePackage()
// returns in the app — confirms the entitlement directly with RevenueCat's
// API rather than trusting the client alone, then fulfills the same way the
// webhook would (whichever of the two gets there first wins; see
// revenuecat_fulfill_category_subscription()'s idempotency note).
$user = current_user();
require_role($user, ['category_manager', 'category_staff']);

if ($user['category_id'] === null) {
    json_error('Your account is not linked to a category yet. Contact the admin.', 422);
}

$data = body();
require_fields($data, ['plan_key']);

$confirmed = revenuecat_confirm_purchase((string) $user['id']);
if ($confirmed === null || $confirmed['plan_key'] !== $data['plan_key']) {
    json_error('RevenueCat did not confirm this purchase', 402);
}

$pdo = sehy_db();
$fulfilled = revenuecat_fulfill_category_subscription(
    $pdo,
    (int) $user['id'],
    (int) $user['category_id'],
    $confirmed['plan_key'],
    $confirmed['transaction_id']
);

json_ok(['fulfilled' => $fulfilled]);
