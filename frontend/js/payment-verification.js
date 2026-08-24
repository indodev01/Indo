import { supabase } from './auth/supabase-config.js';

export async function verifyRazorpayPayment({ projectId, razorpayOrderId, razorpayPaymentId, razorpaySignature }) {
  if (!projectId || !razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
    throw new Error('Missing Razorpay payment verification fields');
  }
  const { data, error } = await supabase.functions.invoke('verify-razorpay-payment', {
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
