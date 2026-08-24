import { supabase } from './auth/supabase-config.js';

const FUNCTION_SLUG = 'create-payment-order-v2';
const HEALTH_FUNCTION_SLUG = 'payment-config-health';

async function assertPaymentConfiguration() {
  const { data, error } = await supabase.functions.invoke(HEALTH_FUNCTION_SLUG, {
    method: 'GET',
  });
  if (error) {
    throw new Error('Payment service is unavailable right now. Please try again later.');
  }
  if (!data?.configured) {
    throw new Error('Payments are temporarily unavailable because Razorpay is not fully configured.');
  }
  if (data.mode !== 'ready') {
    throw new Error('Payment environment is not ready. Please try again later.');
  }
}

export async function createPaymentOrder({ projectId, plan }) {
  if (!projectId || !plan) throw new Error('projectId and plan are required');
  await assertPaymentConfiguration();
  const { data, error } = await supabase.functions.invoke(FUNCTION_SLUG, {
    body: { project_id: projectId, plan },
  });
  if (error) throw new Error(error.message || 'Could not create payment order');
  if (!data?.order_id) throw new Error(data?.error || 'Payment order was not created');
  if (data.mode !== 'test' && data.mode !== 'live') throw new Error('Payment environment is not configured correctly');
  return data;
}

export function getRazorpayOptions(order, overrides = {}) {
  if (!order?.order_id || !order?.key_id) throw new Error('Invalid payment order');
  return {
    key: order.key_id,
    order_id: order.order_id,
    amount: order.amount,
    currency: order.currency || 'INR',
    name: overrides.name || 'Indo',
    description: overrides.description || `Indo ${order.plan} plan`,
    notes: {
      project_id: order.project_id,
      plan: order.plan,
    },
    ...overrides,
  };
}
