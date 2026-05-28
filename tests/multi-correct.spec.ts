import { test, chromium } from '@playwright/test';

const BASE = 'http://localhost:3001';

test('mitu õiget vastust QuizEditoris', async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    httpCredentials: { username: process.env.TEST_USER || '', password: process.env.TEST_PASS || '' },
  });
  const page = await context.newPage();

  await page.goto(`${BASE}/admin/quiz/new`);
  await page.waitForTimeout(800);

  await page.fill('input[placeholder="Viktoriini pealkiri"]', 'Multi-correct test');
  await page.fill('textarea', 'Millised on esmased värvid?');

  const inputs = page.locator('input[placeholder^="Vastus"]');
  await inputs.nth(0).fill('Punane');
  await inputs.nth(1).fill('Roheline');
  await inputs.nth(2).fill('Sinine');
  await inputs.nth(3).fill('Kollane');

  // Initial state: vastus 1 (Punane) on vaikimisi õige
  const toggleBtns = page.getByRole('button', { name: /Märgi õigeks|Õige vastus/ });
  const initialTexts = await toggleBtns.allInnerTexts();
  console.log('Algne seis:', initialTexts);

  // Märgi Sinine (index 2) õigeks - peaks lisama teise õige vastuse
  await toggleBtns.nth(2).click();
  await page.waitForTimeout(300);

  const afterTexts = await toggleBtns.allInnerTexts();
  console.log('Pärast Sinise märkimist:', afterTexts);

  await page.screenshot({ path: '/tmp/mc-final.png', fullPage: true });

  const correctCount = afterTexts.filter(t => t.includes('Õige vastus')).length;
  console.log(`Õigete vastuste arv: ${correctCount} (oodatav: 2)`);
  console.log(correctCount === 2 ? '✓ PASS' : '✗ FAIL');

  await browser.close();
});
