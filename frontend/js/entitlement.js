const TRIAL_DURATION_MS = 24 * 60 * 60 * 1000;

export function normalizeEntitlement(value) {
  const e = value && typeof value === 'object' ? value : {};
  return {
    plan: e.plan || 'trial',
    status: e.status || 'not_started',
    trialStartedAt: e.trialStartedAt || null,
    trialExpiresAt: e.trialExpiresAt || null,
    activatedAt: e.activatedAt || null
  };
}

export function entitlementState(value, now = Date.now()) {
  const e = normalizeEntitlement(value);
  if (e.status === 'activated' || e.plan === 'paid') return { ...e, status: 'activated', canUse: true, remainingMs: null };
  if (!e.trialStartedAt) return { ...e, status: 'not_started', canUse: true, remainingMs: null };
  const expires = Date.parse(e.trialExpiresAt || '') || (Date.parse(e.trialStartedAt) + TRIAL_DURATION_MS);
  const remainingMs = Math.max(0, expires - now);
  if (remainingMs <= 0) return { ...e, status: 'expired', trialExpiresAt: new Date(expires).toISOString(), canUse: false, remainingMs: 0 };
  return { ...e, status: 'trial', trialExpiresAt: new Date(expires).toISOString(), canUse: true, remainingMs };
}

export function startTrial(value, now = new Date()) {
  const e = normalizeEntitlement(value);
  if (e.status === 'activated' || e.plan === 'paid') return e;
  if (e.trialStartedAt) return entitlementState(e);
  const started = new Date(now).toISOString();
  const expires = new Date(new Date(now).getTime() + TRIAL_DURATION_MS).toISOString();
  return { ...e, plan: 'trial', status: 'trial', trialStartedAt: started, trialExpiresAt: expires };
}

export function formatRemaining(ms) {
  if (ms == null) return '';
  const totalMinutes = Math.floor(ms / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${hours}h ${minutes}m remaining`;
}
