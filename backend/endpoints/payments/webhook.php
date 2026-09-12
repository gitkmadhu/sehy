<?php
require_once __DIR__ . '/../../lib/bootstrap.php';
require_once __DIR__ . '/../../lib/razorpay.php';

// Called directly by Razorpay's servers (server-to-server) — authenticated via the
// webhook signature header, not a bearer token, so current_user() is never called here.
$payload = file_get_contents('php://input');
$signature = $_SERVER['HTTP_X_RAZORPAY_SIGNATURE'] ?? '';

if (!$signature || !razorpay_verify_webhook_signature($payload, $signature)) {
    json_error('Invalid webhook signature', 401);
}

$event = json_decode($payload, true);
if (($event['event'] ?? '') !== 'payment.captured') {
    json_ok(['ignored' => true]);
}

$paymentEntity = $event['payload']['payment']['entity'] ?? null;
if (!$paymentEntity) {
    json_ok(['ignored' => true]);
}

$pdo = gmls_db();

$stmt = $pdo->prepare('SELECT * FROM payments WHERE razorpay_order_id = ?');
$stmt->execute([$paymentEntity['order_id']]);
$payment = $stmt->fetch();
if (!$payment) {
    json_ok(['ignored' => true]);
}

// Idempotent: only updates rows not already marked paid, so retried webhook
// deliveries (Razorpay resends on timeout, or a concurrent verify.php call
// from the client) don't cause duplicate fulfillment (e.g. double-granting
// ad credits).
$stmt = $pdo->prepare(
    "UPDATE payments SET status = 'paid', razorpay_payment_id = ?
     WHERE razorpay_order_id = ? AND status != 'paid'"
);
$stmt->execute([$paymentEntity['id'], $paymentEntity['order_id']]);

if ($stmt->rowCount() > 0) {
    $payment['razorpay_payment_id'] = $paymentEntity['id'];
    razorpay_fulfill_payment($pdo, $payment);
}

json_ok(['received' => true]);
