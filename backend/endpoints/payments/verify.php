<?php
require_once __DIR__ . '/../../lib/bootstrap.php';
require_once __DIR__ . '/../../lib/razorpay.php';

$user = current_user();
$data = body();
require_fields($data, ['razorpay_order_id', 'razorpay_payment_id', 'razorpay_signature']);

$pdo = sehy_db();
$stmt = $pdo->prepare('SELECT * FROM payments WHERE razorpay_order_id = ? AND user_id = ?');
$stmt->execute([$data['razorpay_order_id'], $user['id']]);
$payment = $stmt->fetch();

if (!$payment) {
    json_error('Payment order not found', 404);
}

// Idempotent: the webhook may have already confirmed this payment.
if ($payment['status'] === 'paid') {
    json_ok(['status' => 'paid']);
}

$valid = razorpay_verify_signature(
    $data['razorpay_order_id'],
    $data['razorpay_payment_id'],
    $data['razorpay_signature']
);

if (!$valid) {
    $pdo->prepare("UPDATE payments SET status = 'failed' WHERE id = ?")->execute([$payment['id']]);
    record_incident('payment_failed', 'critical', [
        'payment_id' => $payment['id'],
        'user_id' => $user['id'],
        'reason' => 'signature verification failed',
    ]);
    json_error('Payment verification failed', 400);
}

// Guarded by status != 'paid' so a concurrent webhook delivery can't cause
// this to fulfill (e.g. grant ad credits) twice for the same payment.
$stmt = $pdo->prepare(
    "UPDATE payments SET status = 'paid', razorpay_payment_id = ? WHERE id = ? AND status != 'paid'"
);
$stmt->execute([$data['razorpay_payment_id'], $payment['id']]);

if ($stmt->rowCount() > 0) {
    $payment['razorpay_payment_id'] = $data['razorpay_payment_id'];
    razorpay_fulfill_payment($pdo, $payment);
}

json_ok(['status' => 'paid']);
