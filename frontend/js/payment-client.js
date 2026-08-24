import { supabase } from './auth/supabase-config.js';

const FUNCTION_SLUG = 'create-payment-order';

export async function createPaymentOrder({ projectId, plan }) {
  if (!projectId || !plan) throw new Error('projectId and plan are required');
  const { data, error } = await supabase.functions.invoke(FUNCTION_SLUG, {
    body: { project_id: projectId, plan },
  });
  if (error) throw new Error(error.message || 'Could not create payment order');
  if (!data?.order_id) throw new Error(data?.error || 'Payment order was not created');
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
