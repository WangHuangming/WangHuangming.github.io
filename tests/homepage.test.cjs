const assert = require('node:assert/strict');
const { after, before, test } = require('node:test');
const { chromium } = require('playwright');

let browser;
let server;
let baseURL;

before(async () => {
  const { createPreviewServer } = await import('../tools/serve.mjs');
  server = createPreviewServer();
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  baseURL = `http://127.0.0.1:${server.address().port}`;
  browser = await chromium.launch({
    headless: true,
    ...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH
      ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH }
      : {}),
  });
});

after(async () => {
  if (browser) await browser.close();
  if (server) await new Promise((resolve) => server.close(resolve));
});

async function openPage(t, options = {}, init) {
  const context = await browser.newContext(options);
  t.after(() => context.close());
  if (init) await context.addInitScript(init);
  const page = await context.newPage();
  page.setDefaultTimeout(3500);
  await page.goto(baseURL, { waitUntil: 'domcontentloaded' });
  return page;
}

test('language selection updates the page and survives a reload', async (t) => {
  const page = await openPage(t);
  const toggle = page.locator('#language-toggle');
  assert.equal(await toggle.count(), 1, 'the page provides a language toggle');
  assert.equal(await page.locator('html').getAttribute('lang'), 'en');
  assert.equal(await toggle.textContent(), '中文');
  assert.equal(await toggle.getAttribute('aria-label'), 'Switch to Chinese');
  const englishHeading = await page.locator('h1').innerText();
  const englishTitle = await page.title();
  const englishDescription = await page.locator('meta[name="description"]').getAttribute('content');

  await toggle.click();
  assert.equal(await page.locator('html').getAttribute('lang'), 'zh-CN');
  assert.equal(await toggle.textContent(), 'EN');
  assert.equal(await toggle.getAttribute('aria-label'), '切换到英文');
  assert.match(await page.locator('h1').innerText(), /\p{Script=Han}/u);
  assert.notEqual(await page.locator('h1').innerText(), englishHeading);
  assert.match(await page.title(), /\p{Script=Han}/u);
  assert.match(await page.locator('meta[name="description"]').getAttribute('content'), /\p{Script=Han}/u);
  assert.equal(await page.evaluate(() => localStorage.getItem('portfolio-language')), 'zh');

  await page.reload();
  assert.equal(await page.locator('html').getAttribute('lang'), 'zh-CN');
  assert.equal(await toggle.textContent(), 'EN');
  await toggle.click();
  assert.equal(await page.locator('html').getAttribute('lang'), 'en');
  assert.equal(await page.locator('h1').innerText(), englishHeading);
  assert.equal(await page.title(), englishTitle);
  assert.equal(await page.locator('meta[name="description"]').getAttribute('content'), englishDescription);
  assert.equal(await page.evaluate(() => localStorage.getItem('portfolio-language')), 'en');
});

test('language switching works when browser storage is unavailable', async (t) => {
  const page = await openPage(t, {}, () => {
    Object.defineProperty(window, 'localStorage', {
      get() { throw new DOMException('Storage unavailable', 'SecurityError'); },
    });
  });
  await page.locator('#language-toggle').click();
  assert.equal(await page.locator('html').getAttribute('lang'), 'zh-CN');
  await page.locator('#language-toggle').click();
  assert.equal(await page.locator('html').getAttribute('lang'), 'en');
});

test('mobile navigation closes on Escape and returns keyboard focus', async (t) => {
  const page = await openPage(t, { viewport: { width: 375, height: 812 } });
  const menu = page.locator('#menu-toggle');
  assert.equal(await menu.getAttribute('aria-expanded'), 'false');
  assert.equal(await page.locator('#nav-links').isVisible(), false);
  await menu.click();
  assert.equal(await menu.getAttribute('aria-expanded'), 'true');
  assert.equal(await page.locator('#nav-links').isVisible(), true);
  await page.locator('#nav-links a').first().focus();
  await page.keyboard.press('Escape');
  assert.equal(await menu.getAttribute('aria-expanded'), 'false');
  assert.equal(await page.locator('#nav-links').isVisible(), false);
  assert.equal(await menu.evaluate((element) => element === document.activeElement), true);
});

test('mobile navigation closes after following a link and resets after desktop resize', async (t) => {
  const page = await openPage(t, { viewport: { width: 375, height: 812 } });
  const menu = page.locator('#menu-toggle');
  await menu.click();
  const link = page.locator('#nav-links a').first();
  const destination = await link.getAttribute('href');
  await link.click();
  assert.equal(await menu.getAttribute('aria-expanded'), 'false');
  assert.equal(new URL(page.url()).hash, destination);
  await menu.click();
  await page.setViewportSize({ width: 1024, height: 768 });
  await page.waitForFunction(() => document.querySelector('#menu-toggle').getAttribute('aria-expanded') === 'false');
  assert.equal(await page.locator('#nav-links').isVisible(), true);
  await page.setViewportSize({ width: 375, height: 812 });
  assert.equal(await page.locator('#nav-links').isVisible(), false);
});

test('both languages fit a 375-pixel mobile viewport', async (t) => {
  const page = await openPage(t, { viewport: { width: 375, height: 812 } });
  for (const language of ['en', 'zh-CN']) {
    if (language === 'zh-CN') await page.locator('#language-toggle').click();
    const dimensions = await page.evaluate(() => ({
      width: document.documentElement.clientWidth,
      content: document.documentElement.scrollWidth,
    }));
    assert.ok(dimensions.content <= dimensions.width, `${language} must not overflow horizontally: ${JSON.stringify(dimensions)}`);
  }
});

test('clipboard failure shows a manual copy instruction in the selected language', async (t) => {
  const page = await openPage(t, {}, () => {
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText: async () => { throw new DOMException('Permission denied', 'NotAllowedError'); } },
    });
  });
  const status = page.locator('#copy-status');
  await page.locator('#copy-email').click();
  await status.waitFor({ state: 'visible' });
  assert.match(await status.innerText(), /copy.*giogiolol233@gmail\.com/i);
  assert.doesNotMatch(await status.innerText(), /copied/i);
  await page.locator('#language-toggle').click();
  assert.equal(await status.textContent(), '');
  await page.locator('#copy-email').click();
  assert.match(await status.innerText(), /手动复制.*giogiolol233@gmail\.com/);
});

test('core content and navigation remain usable without JavaScript', async (t) => {
  const page = await openPage(t, { javaScriptEnabled: false, viewport: { width: 375, height: 812 } });
  assert.ok((await page.locator('h1').innerText()).length > 0);
  assert.equal(await page.locator('#nav-links').isVisible(), true);
  assert.equal(await page.locator('#menu-toggle').isVisible(), false);
  const link = page.locator('#nav-links a').first();
  const destination = await link.getAttribute('href');
  await link.click();
  assert.equal(new URL(page.url()).hash, destination);
  assert.ok(await page.locator('a[href="mailto:giogiolol233@gmail.com"]').count() > 0);
});

test('preview server returns correct asset types and rejects private or escaping paths', async () => {
  const stylesheet = await fetch(`${baseURL}/styles.css`);
  assert.equal(stylesheet.status, 200);
  assert.match(stylesheet.headers.get('content-type'), /^text\/css/);
  for (const pathname of ['/.git/config', '/..%2foutside.txt', '/..%5coutside.txt']) {
    assert.equal((await fetch(`${baseURL}${pathname}`)).status, 403, pathname);
  }
  assert.equal((await fetch(`${baseURL}/missing-asset.png`)).status, 404);
  assert.equal((await fetch(baseURL, { method: 'POST' })).status, 405);
});
