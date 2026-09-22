<?php
require_once __DIR__ . '/../../lib/bootstrap.php';
require_once __DIR__ . '/../../lib/razorpay.php';

$user = current_user();
require_role($user, ['service_owner', 'category_manager']);

$data = body();
require_fields($data, ['purpose']);

$pdo = sehy_db();

$targetType = null;
$targetId = null;
$quantity = 1;
$planKey = null;
$productName = null;
$brandName = null;

switch ($data['purpose']) {
    case 'service_listing':
        require_role($user, ['service_owner']);
        $amount = LISTING_FEE_AMOUNT;
        $currency = LISTING_FEE_CURRENCY;
        break;

    case 'category_subscription':
        require_role($user, ['category_manager']);
        if ($user['category_id'] === null) {
            json_error('Your account is not linked to a category yet. Contact the admin.', 422);
        }
        require_fields($data, ['plan_key']);
        $stmt = $pdo->prepare(
            "SELECT amount FROM rate_cards WHERE plan_key = ? AND tier = 'category_subscription' AND is_active = 1"
        );
        $stmt->execute([$data['plan_key']]);
        $amount = $stmt->fetchColumn();
        if ($amount === false) {
            json_error('Unknown or inactive subscription plan', 422);
        }
        $amount = (int) $amount;
        $currency = 'INR';
        $targetType = 'category';
        $targetId = (int) $user['category_id'];
        $planKey = $data['plan_key'];
        break;

    case 'service_ad_credits':
        require_role($user, ['service_owner']);
        require_fields($data, ['service_id']);
        $stmt = $pdo->prepare('SELECT * FROM services WHERE id = ?');
        $stmt->execute([$data['service_id']]);
        $service = $stmt->fetch();
        if (!$service || !can_manage_service($user, $service)) {
            json_error('Forbidden: you do not manage this service', 403);
        }
        $quantity = max(1, min(50, (int) ($data['quantity'] ?? 1)));
        $targetType = 'service';
        $targetId = (int) $service['id'];
        $amount = $quantity * AD_CREDIT_PRICE;
        $currency = AD_CREDIT_CURRENCY;
        // Optional tag of which product/brand campaign these credits are
        // for — see schema.sql's note on payments.product_name/brand_name.
        $productName = trim($data['product_name'] ?? '') ?: null;
        $brandName = trim($data['brand_name'] ?? '') ?: null;
        break;

    default:
        json_error('Unknown payment purpose', 422);
}

$receipt = $data['purpose'] . '_' . $user['id'] . '_' . time();
$order = razorpay_create_order($amount, $currency, $receipt);

$stmt = $pdo->prepare(
    'INSERT INTO payments (user_id, purpose, target_type, target_id, quantity, plan_key, product_name, brand_name, amount, currency, razorpay_order_id, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
);
$stmt->execute([
    $user['id'],
    $data['purpose'],
    $targetType,
    $targetId,
    $quantity,
    $planKey,
    $productName,
    $brandName,
    $amount,
    $currency,
    $order['id'],
    'created',
]);

json_ok([
    'order_id' => $order['id'],
    'amount' => $amount,
    'currency' => $currency,
    'key_id' => RAZORPAY_KEY_ID,
], 201);
