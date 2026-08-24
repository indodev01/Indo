import { createPaymentOrder, getRazorpayOptions } from './payment-client.js';
import { verifyRazorpayPayment } from './payment-verification.js';

function ensureRazorpayLoaded() {
  if (window.Razorpay) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Could not load Razorpay Checkout'));
    document.head.appendChild(script);
  });
}

export async function startRazorpayCheckout({ projectId, plan, name, email, contact, onSuccess, onFailure }) {
  const order = await createPaymentOrder({ projectId, plan });
  await ensureRazorpayLoaded();

  const options = getRazorpayOptions(order, {
    name: 'Indo',
    description: `Indo ${order.plan} plan`,
    prefill: { name: name || '', email: email || '', contact: contact || '' },
    handler: async response => {
      try {
        const verified = await verifyRazorpayPayment({
          projectId,
          plan,
          orderId: response.razorpay_order_id,
          paymentId: response.razorpay_payment_id,
          signature: response.razorpay_signature,
        });
        onSuccess?.(verified);
      } catch (error) {
        onFailure?.(error);
      }
    },
    modal: { ondismiss: () => onFailure?.(new Error('Payment checkout was closed')) },
  });

  const checkout = new window.Razorpay(options);
  checkout.on('payment.failed', event => onFailure?.(new Error(event?.error?.description || 'Payment failed')));
  checkout.open();
  return order;
}
