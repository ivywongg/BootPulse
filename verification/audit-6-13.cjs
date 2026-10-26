// Test-only dependencies: npm install --prefix /tmp/bootpulse-a11y-tools playwright-core axe-core
// Run: node verification/audit-6-13.cjs
const { chromium } = require('/tmp/bootpulse-a11y-tools/node_modules/playwright-core');
const axePath = require.resolve('/tmp/bootpulse-a11y-tools/node_modules/axe-core/axe.min.js');
const fs = require('node:fs');
const baseURL = process.env.AUDIT_BASE_URL || 'http://127.0.0.1:3100';
const routes = ['/', '/dashboard', '/revenue', '/expenses', '/cash-flow', '/scenarios', '/milestones', '/decisions', '/settings', '/pricing', '/login', '/sign-up'];

(async () => {
  const browser = await chromium.launch({ executablePath: '/usr/bin/chromium', headless: true, args: ['--no-sandbox'] });
  const results = [];
  try {
    for (const route of routes) {
      const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
      await context.addCookies([
        { name: 'bp_session', value: 'seed_demo_user', url: baseURL },
        { name: 'bp_consent', value: 'PICS-v1', url: baseURL },
      ]);
      const page = await context.newPage();
      const response = await page.goto(baseURL + route, { waitUntil: 'networkidle' });
      await page.addStyleTag({ content: 'nextjs-portal { display: none !important; }' });
      const interactions = [];
      if (route === '/sign-up') {
        await page.locator('#consent').focus();
        await page.keyboard.press('Space');
        await page.locator('input[name="email"]').waitFor();
        interactions.push('Consent checkbox enabled account form using Space');
      }
      if (route === '/settings') {
        await page.locator('summary').focus();
        await page.keyboard.press('Enter');
        if (!(await page.locator('details').evaluate(el => el.open))) throw new Error('Deletion disclosure does not open with Enter');
        interactions.push('Deletion disclosure opened with Enter; no deletion submitted');
      }
      if (route === '/dashboard') {
        const toggle = page.getByRole('button', { name: 'How is this calculated?' }).first();
        await toggle.focus();
        await page.keyboard.press('Enter');
        if (await toggle.getAttribute('aria-expanded') !== 'true') throw new Error('KPI formula cannot be opened using Enter');
        interactions.push('KPI formula toggle opened using Enter');
      }
      const controls = await page.evaluate(() => {
        const visible = el => !!(el.getClientRects().length && getComputedStyle(el).visibility !== 'hidden');
        return [...document.querySelectorAll('a[href],button,input:not([type="hidden"]),select,textarea,summary')]
          .filter(el => visible(el) && !el.disabled && !el.closest('nextjs-portal'))
          .map((el, index) => {
            el.dataset.auditControl = String(index);
            const r = el.getBoundingClientRect();
            const label = el.labels?.length ? [...el.labels].map(l => l.innerText.trim()).join(' ') : el.getAttribute('aria-label') || '';
            return { index, tag: el.tagName, text: (el.innerText || label || el.name || '').slice(0, 70), width: r.width, height: r.height, labeled: !el.matches('input,select,textarea') || !!label };
          });
      });
      const targets = controls.filter(c => c.width < 23.9 || c.height < 23.9);
      const unlabeled = controls.filter(c => !c.labeled);
      const visited = new Set();
      const focusFailures = [];
      await page.evaluate(() => { document.activeElement?.blur(); window.scrollTo(0, 0); });
      for (let i = 0; i < controls.length * 5 + 10 && visited.size < controls.length; i++) {
        await page.keyboard.press('Tab');
        const active = await page.evaluate(() => {
          const el = document.activeElement;
          if (!el?.hasAttribute('data-audit-control')) return null;
          const s = getComputedStyle(el);
          return { index: Number(el.dataset.auditControl), outlineWidth: s.outlineWidth, outlineStyle: s.outlineStyle, offset: s.outlineOffset, color: s.outlineColor, focusVisible: el.matches(':focus-visible'), nativeDateFocus: el.matches('input[type="date"]:focus-within,input[type="month"]:focus-within') };
        });
        if (active) {
          visited.add(active.index);
          if (active.outlineWidth !== '2px' || active.outlineStyle !== 'solid' || parseFloat(active.offset) < 2 || (!active.focusVisible && !active.nativeDateFocus)) focusFailures.push(active);
        }
      }
      const unreachable = controls.filter(c => !visited.has(c.index));
      await page.addScriptTag({ path: axePath });
      const axe = await page.evaluate(async () => {
        const result = await window.axe.run({ exclude: [['nextjs-portal']] }, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'] } });
        return { violations: result.violations.map(v => ({ id: v.id, impact: v.impact, description: v.description, nodes: v.nodes.map(n => ({ target: n.target, summary: n.failureSummary })) })), manualReview: result.incomplete.map(v => ({ id: v.id, count: v.nodes.length })) };
      });
      const hoverFailures = [];
      const textButtons = await page.locator('button:not([disabled])').all();
      for (const button of textButtons) {
        if (!(await button.isVisible())) continue;
        await button.hover();
        const color = await button.evaluate(el => {
          const s = getComputedStyle(el);
          const canvas = document.createElement('canvas');
          canvas.width = canvas.height = 1;
          const ctx = canvas.getContext('2d');
          const rgb = value => { ctx.clearRect(0, 0, 1, 1); ctx.fillStyle = value; ctx.fillRect(0, 0, 1, 1); return [...ctx.getImageData(0, 0, 1, 1).data]; };
          let background = s.backgroundColor;
          let ancestor = el;
          while (rgb(background)[3] < 255 && ancestor.parentElement) { ancestor = ancestor.parentElement; background = getComputedStyle(ancestor).backgroundColor; }
          const luminance = color => {
            const [r, g, b] = rgb(color).slice(0, 3).map(c => { c /= 255; return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; });
            return 0.2126 * r + 0.7152 * g + 0.0722 * b;
          };
          const foregroundLuminance = luminance(s.color), backgroundLuminance = luminance(background);
          const ratio = (Math.max(foregroundLuminance, backgroundLuminance) + 0.05) / (Math.min(foregroundLuminance, backgroundLuminance) + 0.05);
          return { text: el.innerText, foreground: s.color, background, ratio };
        });
        if (color.ratio < 4.5) hoverFailures.push(color);
      }
      // Only deliberately invalid values are submitted; no data may be changed.
      if (['/milestones', '/decisions', '/settings', '/scenarios'].includes(route)) {
        let field;
        if (route === '/settings') field = page.locator('input[name="cashBalance"]').first();
        else if (route === '/scenarios') field = page.locator('input[name="revenueLossPct"]').first();
        else field = page.locator('input[name="title"]').first();
        await field.fill(route === '/settings' ? 'not-money' : route === '/scenarios' ? '101' : ' '.repeat(3));
        const form = field.locator('xpath=ancestor::form');
        if (route === '/milestones') await form.locator('input[type="date"]').fill('2026-01-01');
        if (route === '/decisions') {
          await form.locator('input[type="date"]').fill('2026-01-01');
          await form.locator('textarea[name="expectedImpact"]').fill('Invalid input verification only');
        }
        await form.getByRole('button', { name: /Save|Add/ }).first().focus();
        await page.keyboard.press('Enter');
        await form.locator('[role="alert"]').waitFor({ timeout: 15000 });
        interactions.push('Invalid server submission produces visible text alert and preserves entered value');
        if (!(await field.inputValue())) throw new Error('Failed submission unexpectedly cleared form values');
      }
      const chartTables = await page.locator('table').count();
      const result = {
        route, httpStatus: response.status(), controlCount: controls.length, keyboardVisited: visited.size,
        targetFailures: targets, missingLabels: unlabeled, focusFailures, unreachable, axe, hoverFailures, interactions, chartTables,
      };
      result.pass = result.httpStatus === 200 && !targets.length && !unlabeled.length && !focusFailures.length && !unreachable.length && !axe.violations.length && !hoverFailures.length;
      results.push(result);
      console.log(`${route}: ${result.pass ? 'PASS' : 'FAIL'} (${visited.size}/${controls.length} keyboard targets, ${axe.violations.length} axe violations)`);
      await context.close();
    }
  } finally {
    await browser.close();
    fs.writeFileSync('verification/audit-6-13-results.json', JSON.stringify({ baseURL, viewport: '1440x1000', results }, null, 2) + '\n');
  }
  if (results.length !== routes.length || results.some(r => !r.pass)) process.exitCode = 1;
})().catch(error => { console.error(error); process.exitCode = 1; });
