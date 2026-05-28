import { test, chromium } from '@playwright/test';

const BASE = 'http://localhost:3001';

test('admin leht laadib', async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    httpCredentials: {
      username: process.env.TEST_USER || '',
      password: process.env.TEST_PASS || '',
    },
  });
  const page = await context.newPage();

  const apiResponses: { url: string; status: number; body: string }[] = [];
  page.on('response', async (resp) => {
    if (resp.url().includes('/api/')) {
      try { apiResponses.push({ url: resp.url(), status: resp.status(), body: (await resp.text()).slice(0, 300) }); } catch {}
    }
  });

  await page.goto(`${BASE}/admin`);
  await page.waitForTimeout(2500);
  await page.screenshot({ path: '/tmp/admin-page.png', fullPage: true });

  const bodyText = await page.locator('body').innerText();
  console.log('\n=== PAGE TEXT ===\n' + bodyText.slice(0, 600));
  console.log('\n=== API RESPONSES ===');
  for (const r of apiResponses) {
    console.log(`HTTP ${r.status} ${r.url}\n  ${r.body}`);
  }
  await browser.close();
});
