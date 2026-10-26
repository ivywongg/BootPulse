const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { randomUUID } = require('node:crypto');
const Database = require('better-sqlite3');
const { chromium } = require('/tmp/bootpulse-a11y-tools/node_modules/playwright-core');
const base = process.env.BOOTPULSE_TEST_URL || 'http://127.0.0.1:3100';
const db = new Database('data/bootpulse.db');
db.pragma('foreign_keys = ON');
const emails = [0, 1].map(i => `security-${i}-${randomUUID()}@bootpulse.invalid`);
const password = `Fictional-Test-${randomUUID()}`;
const output = { task: '6.14', checks: [], passed: false, fixtureCleanup: false };
const check = (name, details = {}) => { output.checks.push({ name, passed: true, ...details }); console.log(`PASS: ${name}`); };
const userFor = email => db.prepare('SELECT u.* FROM users u JOIN local_credentials c ON c.user_id=u.id WHERE c.email=?').get(email);
const businessFor = id => db.prepare("SELECT b.* FROM businesses b JOIN team_members t ON t.business_id=b.id WHERE t.user_id=? AND t.role='owner'").get(id);
const planFor = id => db.prepare('SELECT * FROM subscriptions WHERE user_id=?').get(id);
const originalUsers = db.prepare('SELECT * FROM users ORDER BY id').all();
let browser;
async function http(url, cookie = '', options = {}) {
  return fetch(base + url, { redirect: 'manual', ...options, headers: { ...(cookie ? { Cookie: cookie } : {}), ...options.headers } });
}
async function actionClick(page, button) {
  const response = page.waitForResponse(r => r.request().method() === 'POST' && new URL(r.url()).origin === base, { timeout: 10000 });
  await button.click();
  await response;
}
async function signup(context, email, negative = false) {
  const page = await context.newPage();
  page.setDefaultTimeout(15000);
  await page.goto(base + '/sign-up');
  assert(await page.getByRole('heading', { name: 'Personal Information Collection Statement' }).isVisible());
  assert.equal(await page.locator('input[name=email]').count(), 0);
  await page.locator('#consent').check();
  await page.locator('input[name=email]').fill(email);
  await page.locator('input[name=password]').fill(password);
  const button = page.getByRole('button', { name: 'Create account', exact: true });
  if (negative) {
    await page.locator('input[name=consentVersion]').evaluate(e => e.value = 'unapproved');
    await actionClick(page, button);
    assert.equal(userFor(email), undefined);
    assert(await page.locator('form [role=alert]').isVisible());
    await page.locator('input[name=consentVersion]').evaluate(e => e.value = 'PICS-v1');
    await page.locator('input[name=consent][type=hidden]').evaluate(e => e.disabled = true);
    await page.locator('input[name=email]').fill(email);
    await page.locator('input[name=password]').fill(password);
    await actionClick(page, button);
    assert.equal(userFor(email), undefined);
    await page.locator('input[name=consent][type=hidden]').evaluate(e => e.disabled = false);
    check('PICS shown first; missing or unapproved server consent rejected');
  }
  await page.locator('input[name=email]').fill(email);
  await page.locator('input[name=password]').fill(password);
  await Promise.all([page.waitForURL('**/dashboard'), button.click()]);
  const user = userFor(email);
  assert(user && user.consent_version === 'PICS-v1' && Number.isFinite(user.privacy_consent_at) && user.privacy_consent_at > 0);
  const session = (await context.cookies()).find(c => c.name === 'bp_session');
  assert(session && /^[a-f0-9]{64}$/.test(session.value) && session.httpOnly && session.sameSite === 'Lax');
  return { page, context, user, business: businessFor(user.id), cookie: `bp_session=${session.value}` };
}
function sourceScan() {
  const patterns = [/sk_(?:live|test)_[A-Za-z0-9]{20,}/, /sk-(?:proj-)?[A-Za-z0-9_-]{32,}/, /gh[pousr]_[A-Za-z0-9]{30,}/, /AKIA[A-Z0-9]{16}/, /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/];
  const files = [];
  function walk(dir) { for (const e of fs.readdirSync(dir, { withFileTypes: true })) { const f = path.join(dir, e.name); if (e.isDirectory()) walk(f); else if (/\.(?:ts|tsx|js|json|css)$/.test(f)) files.push(f); } }
  for (const dir of ['app', 'lib', 'db', 'components']) walk(dir);
  files.push('.env.example', '.gitignore', 'middleware.ts');
  const matches = files.filter(f => patterns.some(p => p.test(fs.readFileSync(f, 'utf8'))));
  assert(matches.length === 0, 'Potential source secret pattern found; values were not printed.');
  output.sourceScan = { files: files.length, matches: [], gitIndexAvailable: fs.existsSync('.git') };
  check('Source scan found no hardcoded-secret patterns');
}
(async () => {
  try {
    assert.equal((await http('/api/export?type=revenue')).status, 401);
    assert.equal((await http('/api/export?type=revenue', 'bp_session=seed_demo_user; bp_consent=PICS-v1')).status, 401);
    assert.equal((await http('/api/export?type=revenue', `bp_session=${'f'.repeat(64)}`)).status, 401);
    check('Missing, raw-identifier and unknown opaque sessions rejected');
    browser = await chromium.launch({ executablePath: '/usr/bin/chromium', headless: true, args: ['--no-sandbox', '--disable-dev-shm-usage'] });
    const a = await signup(await browser.newContext(), emails[0]);
    const b = await signup(await browser.newContext(), emails[1]);
    check('Real signup persists consent and issues an HttpOnly opaque session');
    for (const route of ['/dashboard', '/cash-flow', '/scenarios']) {
      const res = await http(route, a.cookie); assert.equal(res.status, 200);
      const html = await res.text();
      assert((html.match(/It does not provide financial, accounting, tax or investment advice\./g) || []).length >= 2);
    }
    check('Required pages contain both footer and page-local disclaimers');
    assert.equal((await http('/api/export?type=revenue', a.cookie + '; bp_consent=unapproved')).status, 200);
    assert.equal(userFor(emails[0]).consent_version, 'PICS-v1');
    db.prepare('UPDATE users SET consent_version=? WHERE id=?').run('unapproved', a.user.id);
    try { assert.equal((await http('/api/export?type=revenue', a.cookie)).status, 401); }
    finally { db.prepare('UPDATE users SET consent_version=? WHERE id=?').run('PICS-v1', a.user.id); }
    check('Consent is verified from the stored signup record, not client cookies');
    for (const query of ['type=revenue&businessId=bad', 'type=revenue&type=expenses', 'type=revenue&unexpected=x']) {
      assert.equal((await http('/api/export?' + query, a.cookie)).status, 400);
    }
    assert.equal((await http(`/api/export?type=revenue&businessId=${b.business.id}`, a.cookie)).status, 404);
    check('Malformed export queries and another user’s business are rejected');
    const unchangedPlan = JSON.stringify(planFor(a.user.id));
    for (const headers of [{ Origin: 'https://unrelated.invalid' }, {}, { Origin: base, 'Sec-Fetch-Site': 'cross-site' }]) {
      assert.equal((await http('/api/checkout', a.cookie, { method: 'POST', headers })).status, 403);
    }
    assert.equal((await http('/api/checkout', a.cookie, { method: 'POST', headers: { Origin: base }, body: JSON.stringify({ userId: b.user.id, plan: 'adviser' }) })).status, 400);
    assert.equal(JSON.stringify(planFor(a.user.id)), unchangedPlan);
    check('Checkout rejects cross-origin, missing-origin and caller-selected identity payloads');
    await a.page.goto(base + '/revenue');
    const form = a.page.locator('form').filter({ has: a.page.getByRole('heading', { name: 'Add an item' }) });
    await form.getByLabel('Name', { exact: true }).fill('Fictional security test item');
    await form.getByLabel('Amount', { exact: true }).fill('10.00');
    await form.getByLabel('Start month', { exact: true }).fill('2026-10-01');
    const captured = a.page.waitForRequest(r => r.method() === 'POST' && new URL(r.url()).pathname === '/revenue');
    await actionClick(a.page, form.getByRole('button', { name: 'Add revenue item', exact: true }));
    const request = await captured;
    assert(db.prepare('SELECT id FROM revenue_items WHERE business_id=? AND name=?').get(a.business.id, 'Fictional security test item'));
    const body = request.postData(); assert(body && body.includes(a.business.id));
    const headers = { Origin: base, 'Content-Type': request.headers()['content-type'], 'Next-Action': request.headers()['next-action'] };
    const beforeOther = JSON.stringify(db.prepare('SELECT * FROM revenue_items WHERE business_id=? ORDER BY id').all(b.business.id));
    await http('/revenue', a.cookie, { method: 'POST', headers, body: body.replaceAll(a.business.id, b.business.id) });
    assert.equal(JSON.stringify(db.prepare('SELECT * FROM revenue_items WHERE business_id=? ORDER BY id').all(b.business.id)), beforeOther);
    check('Authenticated item creation works; replay against another user cannot write');
    assert.equal((await http('/api/checkout', a.cookie, { method: 'POST', headers: { Origin: base } })).status, 303);
    const upgraded = JSON.stringify(planFor(a.user.id));
    assert.equal(planFor(a.user.id).plan, 'founder'); assert.equal(planFor(b.user.id).plan, 'free');
    assert.equal((await http('/api/checkout', a.cookie, { method: 'POST', headers: { Origin: base } })).status, 303);
    assert.equal(JSON.stringify(planFor(a.user.id)), upgraded);
    check('Same-origin demo upgrade is current-user-only and repeat-safe');
    await a.page.goto(base + '/dashboard');
    const oldCookie = a.cookie;
    await Promise.all([a.page.waitForURL('**/login'), a.page.getByRole('button', { name: 'Sign out', exact: true }).click()]);
    assert.equal((await http('/api/export?type=revenue', oldCookie)).status, 401);
    await a.page.locator('input[name=email]').fill(emails[0]);
    await a.page.locator('input[name=password]').fill('Wrong-Fictional-Password');
    await actionClick(a.page, a.page.getByRole('button', { name: 'Sign in', exact: true }));
    await a.page.locator('form [role=alert]').waitFor();
    assert(await a.page.locator('form [role=alert]').isVisible());
    assert(!(await a.context.cookies()).some(c => c.name === 'bp_session'));
    await a.page.locator('input[name=email]').fill(emails[0]);
    await a.page.locator('input[name=password]').fill(password);
    await Promise.all([a.page.waitForURL('**/dashboard'), a.page.getByRole('button', { name: 'Sign in', exact: true }).click()]);
    const newSession = (await a.context.cookies()).find(c => c.name === 'bp_session');
    assert(newSession && `bp_session=${newSession.value}` !== oldCookie);
    a.cookie = `bp_session=${newSession.value}`;
    check('Logout revokes replay; wrong password fails; correct login rotates the session');
    await a.page.goto(base + '/settings');
    await a.page.getByText('Start account deletion', { exact: true }).click();
    await a.page.locator('input[name=confirmation]').check();
    await Promise.all([a.page.waitForURL('**/sign-up'), a.page.getByRole('button', { name: 'Delete account and data', exact: true }).click()]);
    assert(!userFor(emails[0]));
    for (const table of ['local_credentials', 'local_sessions', 'subscriptions', 'team_members']) {
      assert.equal(db.prepare(`SELECT count(*) n FROM ${table} WHERE user_id=?`).get(a.user.id).n, 0);
    }
    assert.equal((await http('/api/export?type=revenue', a.cookie)).status, 401);
    assert(userFor(emails[1]));
    check('Confirmed local account deletion erases credentials/sessions/data without deleting the other account');
    sourceScan();
    output.passed = true;
  } catch (error) {
    output.error = error.message;
    console.error('Security smoke test failed:', error.message);
    process.exitCode = 1;
  } finally {
    for (const email of emails) {
      const user = userFor(email);
      if (!user) continue;
      const owned = db.prepare("SELECT business_id FROM team_members WHERE user_id=? AND role='owner'").all(user.id);
      for (const row of owned) db.prepare('DELETE FROM businesses WHERE id=?').run(row.business_id);
      db.prepare('DELETE FROM users WHERE id=?').run(user.id);
    }
    output.fixtureCleanup = emails.every(email => !userFor(email));
    output.originalUsersPreserved = JSON.stringify(db.prepare('SELECT * FROM users ORDER BY id').all()) === JSON.stringify(originalUsers);
    if (!output.fixtureCleanup || !output.originalUsersPreserved) { output.passed = false; process.exitCode = 1; }
    fs.writeFileSync('verification/audit-6-14-results.json', JSON.stringify(output, null, 2) + '\n');
    if (browser) await browser.close();
    db.close();
  }
})();
