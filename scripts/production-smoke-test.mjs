#!/usr/bin/env node

const baseUrl = String(process.env.BASE_URL || '').replace(/\/$/, '');
if (!baseUrl) {
  console.error('BASE_URL is required, e.g. https://indodev01.github.io/Indo');
  process.exit(2);
}

const checks = [];
async function check(name, url, predicate = r => r.ok) {
  try {
    const response = await fetch(url, { redirect: 'follow' });
    const body = await response.text();
    const pass = predicate(response, body);
    checks.push({ name, pass, detail: `${response.status} ${response.statusText}` });
    return pass;
  } catch (error) {
    checks.push({ name, pass: false, detail: error?.message || String(error) });
    return false;
  }
}

await check('Frontend entry', `${baseUrl}/frontend/html/index.html`);
await check('Live app entry', `${baseUrl}/frontend/html/live-app.html`);
await check('Activation request module', `${baseUrl}/frontend/js/activation-request.js`, (r, body) => r.ok && body.includes('startActivationPayment'));
await check('APK build module', `${baseUrl}/frontend/js/apk-build.js`, (r, body) => r.ok && body.includes('start-apk-build-v4') && body.includes('icon_url') && body.includes('splash_url'));
await check('APK function reachable', `${baseUrl}/frontend/js/apk-build.js`, (r, body) => r.ok && body.includes("const BUILD_FUNCTION='start-apk-build-v4'"));

const healthBase = process.env.SUPABASE_URL;
if (healthBase) {
  await check('Payment config health endpoint', `${healthBase.replace(/\/$/, '')}/functions/v1/payment-config-health`, (r, body) => [200, 503].includes(r.status) && /ready|missing_configuration|configuration/i.test(body));
} else {
  checks.push({ name: 'Payment config health endpoint', pass: false, detail: 'SUPABASE_URL not supplied' });
}

const failed = checks.filter(c => !c.pass);
console.log('\nIndo Production Smoke Test');
console.log('==========================');
for (const c of checks) console.log(`${c.pass ? 'PASS' : 'FAIL'}  ${c.name} — ${c.detail}`);
console.log(`\n${checks.length - failed.length}/${checks.length} checks passed.`);
if (failed.length) process.exit(1);
