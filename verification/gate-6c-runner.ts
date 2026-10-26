import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { eq } from 'drizzle-orm';
import { db } from '../db';
import { businesses, teamMembers, users } from '../db/schema';
import { registerLocalAccount } from '../lib/local-auth';

async function main() {
  const account = await registerLocalAccount({
    email: `gate-6c-${randomUUID()}@bootpulse.invalid`,
    password: `Fictional-Test-${randomUUID()}`,
    consent: 'accepted', consentVersion: 'PICS-v1',
  });
  try {
    mkdirSync('/tmp/bootpulse-gate-6c', { recursive: true });
    let source = readFileSync('verification/audit-6-13.cjs', 'utf8');
    source = source.replace("value: 'seed_demo_user'", "value: process.env.GATE_TEST_TOKEN");
    source = source.replaceAll('verification/audit-6-13-results.json', 'verification/gate-6c-results.json');
    source = source.replace('      const result = {', `
      const responsive = [];
      for (const width of [1440, 1024, 390]) {
        await page.setViewportSize({ width, height: 1000 });
        await page.waitForTimeout(200);
        await page.evaluate(() => window.scrollTo(0, 0));
        const sizes = await page.evaluate(() => ({ view: window.innerWidth, document: document.documentElement.scrollWidth }));
        if (sizes.document > sizes.view + 1) throw new Error(route + ': page overflow at ' + width);
        if (route === '/dashboard' && !(await page.getByText('Current cash', { exact: true }).isVisible())) throw new Error('Headline figures hidden at ' + width);
        const file = '/tmp/bootpulse-gate-6c/' + (route === '/' ? 'landing' : route.slice(1)) + '-' + width + '.png';
        await page.screenshot({ path: file });
        responsive.push({ width, overflow: false, screenshot: file });
      }
      const result = { responsive,`);
    writeFileSync('/tmp/bootpulse-gate-6c/a11y.cjs', source);
    const run = spawnSync(process.execPath, ['/tmp/bootpulse-gate-6c/a11y.cjs'], {
      env: { ...process.env, GATE_TEST_TOKEN: account.token }, stdio: 'inherit', timeout: 240000,
    });
    if (run.status !== 0) process.exitCode = 1;
  } finally {
    const owned = db.select().from(teamMembers).where(eq(teamMembers.userId, account.user.id)).all();
    for (const row of owned) db.delete(businesses).where(eq(businesses.id, row.businessId)).run();
    db.delete(users).where(eq(users.id, account.user.id)).run();
  }
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
