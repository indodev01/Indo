import { supabase } from './auth/supabase-config.js';

const FUNCTION_SLUG = 'verify-razorpay-payment-v3';

export async function verifyRazorpayPayment({ projectId, plan, orderId, paymentId, signature }) {
  if (!projectId || !orderId || !paymentId || !signature) {
    throw new Error('Missing Razorpay payment verification fields');
  }
  const { data, error } = await supabase.functions.invoke(FUNCTION_SLUG, {
    body: {
      project_id: projectId,
      plan,
      razorpay_order_id: orderId,
      razorpay_payment_id: paymentId,
      razorpay_signature: signature,
    },
  });
  if (error) throw new Error(error.message || 'Payment verification failed');
  if (!data?.ok) throw new Error(data?.error || 'Payment verification failed');
  return data;
}
