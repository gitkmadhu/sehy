function loadRazorpayScript() {
  return new Promise((resolve, reject) => {
    if (window.Razorpay) return resolve();
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Could not load the payment gateway. Check your connection and try again.'));
    document.head.appendChild(script);
  });
}

/**
 * Opens Razorpay Checkout for one of the backend's payment purposes
 * ('store_listing', 'store_ad_credits', 'mall_subscription') and resolves
 * once the payment is verified server-side (its benefit — a credit grant, a
 * subscription extension, or an unlocked store-listing voucher — is already
 * applied by the time this resolves). Rejects if the gateway fails to load,
 * the order can't be created, the user cancels/closes the checkout modal, or
 * verification fails.
 */
async function payWithRazorpay({ purpose, storeId, quantity, plan, productName, brandName, description }) {
  await loadRazorpayScript();

  const orderPayload = { purpose };
  if (storeId != null) orderPayload.store_id = storeId;
  if (quantity != null) orderPayload.quantity = quantity;
  if (plan != null) orderPayload.plan_key = plan;
  if (productName) orderPayload.product_name = productName;
  if (brandName) orderPayload.brand_name = brandName;
  const order = await api.post('/payments/create_order.php', orderPayload);

  return new Promise((resolve, reject) => {
    const rzp = new Razorpay({
      key: order.key_id,
      amount: order.amount,
      currency: order.currency,
      name: 'GLML',
      description: description || '',
      order_id: order.order_id,
      prefill: (() => {
        const user = currentUser();
        return user ? { name: user.name, email: user.email, contact: user.phone || '' } : {};
      })(),
      theme: { color: '#4338ca' },
      handler: (response) => {
        api
          .post('/payments/verify.php', {
            razorpay_order_id: response.razorpay_order_id,
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_signature: response.razorpay_signature,
          })
          .then(() => resolve())
          .catch(reject);
      },
      modal: {
        ondismiss: () => reject(new Error('Payment cancelled')),
      },
    });
    rzp.on('payment.failed', (resp) => {
      reject(new Error(resp.error?.description || 'Payment failed'));
    });
    rzp.open();
  });
}
