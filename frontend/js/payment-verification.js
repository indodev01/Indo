import { supabase } from './auth/supabase-config.js';

const FUNCTION_SLUG = 'verify-razorpay-payment-v2';

export async function verifyRazorpayPayment({ projectId, razorpayOrderId, razorpayPaymentId, razorpaySignature }) {
  if (!projectId || !razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
    throw new Error('Missing Razorpay payment verification fields');
  }
  const { data, error } = await supabase.functions.invoke(FUNCTION_SLUG, {
    body: {
      project_id: projectId,
      razorpay_order_id: razorpayOrderId,
      razorpay_payment_id: razorpayPaymentId,
      razorpay_signature: razorpaySignature,
    },
  });
  if (error) throw new Error(error.message || 'Payment verification failed');
  if (!data?.ok) throw new Error(data?.error || 'Payment verification failed');
  return data;
}
