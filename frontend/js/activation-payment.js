import { createPaymentOrder, getRazorpayOptions } from './payment-client.js';
import { verifyRazorpayPayment } from './payment-verification.js';

const RAZORPAY_SCRIPT = 'https://checkout.razorpay.com/v1/checkout.js';

function loadRazorpay() {
  if (window.Razorpay) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${RAZORPAY_SCRIPT}"]`);
    if (existing) {
      existing.addEventListener('load', () => resolve(), { once: true });
      existing.addEventListener('error', () => reject(new Error('Razorpay checkout could not be loaded')), { once: true });
      return;
    }
    const script = document.createElement('script');
    script.src = RAZORPAY_SCRIPT;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Razorpay checkout could not be loaded'));
    document.head.appendChild(script);
  });
}

export async function startActivationPayment({ projectId, plan, name, email, phone, onSuccess, onFailure }) {
  if (!projectId || !plan) throw new Error('projectId and plan are required');
  await loadRazorpay();
  const order = await createPaymentOrder({ projectId, plan });
  const options = getRazorpayOptions(order, {
    name: 'Indo',
    description: `Indo ${plan} plan activation`,
    prefill: { name: name || '', email: email || '', contact: phone || '' },
    handler: async (response) => {
      try {
        const verification = await verifyRazorpayPayment({
          projectId,
          plan,
          orderId: response.razorpay_order_id,
          paymentId: response.razorpay_payment_id,
          signature: response.razorpay_signature,
        });
        onSuccess?.(verification);
      } catch (error) {
        onFailure?.(error);
      }
    },
    modal: {
      ondismiss: () => onFailure?.(new Error('Payment checkout was dismissed')),
    },
  });

  const checkout = new window.Razorpay(options);
  checkout.on('payment.failed', (event) => {
    onFailure?.(new Error(event?.error?.description || 'Payment failed'));
  });
  checkout.open();
  return order;
}

window.IndoActivationPayment = { startActivationPayment };
