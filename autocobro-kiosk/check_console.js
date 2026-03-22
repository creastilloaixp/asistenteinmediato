import { chromium } from 'playwright';
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', err => console.error('PAGE ERROR:', err));
  page.on('requestfailed', request => console.error('REQ FAILED:', request.url(), request.failure()?.errorText || 'Unknown failure'));
  await page.goto('http://localhost:5174/');
  await new Promise(r => setTimeout(r, 3000));
  await browser.close();
})();
