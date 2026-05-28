import { test, chromium } from '@playwright/test';

const BASE = 'http://localhost:3001';

test('käivita viktoriin', async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    httpCredentials: { username: process.env.TEST_USER || '', password: process.env.TEST_PASS || '' },
  });
  const page = await context.newPage();

  const allResponses: { url: string; status: number; body: string }[] = [];
  page.on('response', async (resp) => {
    try { allResponses.push({ url: resp.url(), status: resp.status(), body: (await resp.text()).slice(0, 400) }); } catch {}
  });

  // 1. Mine admin lehele
  await page.goto(`${BASE}/admin`);
  await page.waitForTimeout(1500);
  await page.screenshot({ path: '/tmp/run-1-admin.png', fullPage: true });
  console.log('\n=== Admin leht tekst ===\n' + (await page.locator('body').innerText()).slice(0, 300));

  // 2. Vajuta "Käivita" esimese viktoriini juures
  const runBtn = page.getByRole('link', { name: 'Käivita' }).first();
  const runBtnExists = await runBtn.count();
  console.log('Käivita nupp olemas:', runBtnExists > 0);

  if (runBtnExists > 0) {
    const href = await runBtn.getAttribute('href');
    console.log('Käivita href:', href);
    await runBtn.click();
    await page.waitForTimeout(3000);
    await page.screenshot({ path: '/tmp/run-2-after-click.png', fullPage: true });
    console.log('\n=== Pärast klõpsu ===');
    console.log('URL:', page.url());
    console.log('Tekst:\n' + (await page.locator('body').innerText()).slice(0, 500));
  }

  console.log('\n=== Kõik API vastused ===');
  for (const r of allResponses) {
    console.log(`HTTP ${r.status} ${r.url}\n  ${r.body}`);
  }
  await browser.close();
});
