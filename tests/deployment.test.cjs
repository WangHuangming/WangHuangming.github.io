const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');

const temporaryPrefix = 'codex-my-page-deployment-';
const projectRoot = path.resolve(__dirname, '..');

async function removeFixture(directory) {
  const [resolved, temporaryRoot] = await Promise.all([
    fs.realpath(directory), fs.realpath(os.tmpdir()),
  ]);
  assert.equal(path.dirname(resolved), temporaryRoot, 'cleanup stays directly inside the temporary directory');
  assert.match(path.basename(resolved), /^codex-my-page-deployment-[A-Za-z0-9]+$/);
  await fs.rm(resolved, { recursive: true, force: true });
}

function resourceReferences(html) {
  return [...html.matchAll(/\b(?:src|href)="([^"]+)"/g)]
    .map((match) => match[1])
    .filter((reference) => !/^(?:[a-z][a-z\d+.-]*:|\/\/|#)/i.test(reference));
}

function outputFile(output, reference) {
  const pathname = decodeURIComponent(new URL(reference, 'http://fixture.test/').pathname);
  const resolved = path.resolve(output, `.${pathname}`);
  assert.ok(resolved.startsWith(`${output}${path.sep}`), 'resource remains inside the production output');
  return resolved;
}

test('production builds change only changed asset URLs and exclude development files', async () => {
  const { buildSite } = await import('../tools/build.mjs');
  const root = await fs.mkdtemp(path.join(os.tmpdir(), temporaryPrefix));
  try {
    const publicFiles = {
      'styles.css': 'body { background: #f7f6f0; }',
      'script.js': 'document.documentElement.dataset.ready = "yes";',
      'images/diagram.svg': '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><circle cx="5" cy="5" r="3"/></svg>',
      'assets/resume.pdf': '%PDF-1.4\nfixture resume\n%%EOF',
    };
    const developmentFiles = ['README.md', 'AGENTS.md', 'package.json', 'tests/private.test.cjs', 'tools/private.mjs', '.git/config'];
    for (const [file, content] of Object.entries(publicFiles)) {
      await fs.mkdir(path.dirname(path.join(root, file)), { recursive: true });
      await fs.writeFile(path.join(root, file), content);
    }
    for (const file of developmentFiles) {
      await fs.mkdir(path.dirname(path.join(root, file)), { recursive: true });
      await fs.writeFile(path.join(root, file), 'development-only fixture');
    }
    await fs.writeFile(path.join(root, 'index.html'), `<!doctype html><html><head>
      <link rel="stylesheet" href="styles.css"><script src="script.js" defer></script>
      </head><body><img src="images/diagram.svg" alt="Diagram">
      <a href="assets/resume.pdf">Resume</a><a href="#work">Work</a>
      <a href="https://example.com/">External</a><section id="work"></section></body></html>`);

    let firstReferences;
    for (let version = 0; version < 2; version += 1) {
      if (version === 1) {
        publicFiles['styles.css'] = 'body { background: #e8edda; }';
        await fs.writeFile(path.join(root, 'styles.css'), publicFiles['styles.css']);
      }
      const output = await buildSite({ root });
      assert.equal(output, path.join(root, '_site'));
      const html = await fs.readFile(path.join(output, 'index.html'), 'utf8');
      const references = resourceReferences(html);
      assert.equal(references.length, 4);
      for (const [index, [source, content]] of Object.entries(publicFiles).entries()) {
        assert.notEqual(references[index], source, `${source} has a versioned address`);
        assert.equal(new URL(references[index], 'http://fixture.test/').search, '', 'version is part of the filename, not a query string');
        assert.equal(await fs.readFile(outputFile(output, references[index]), 'utf8'), content);
      }
      for (const file of developmentFiles) {
        await assert.rejects(fs.access(path.join(output, file)), { code: 'ENOENT' });
      }
      if (version === 0) firstReferences = references;
      else {
        assert.notEqual(references[0], firstReferences[0], 'changed CSS gets a new URL');
        assert.deepEqual(references.slice(1), firstReferences.slice(1), 'unchanged JS, image, and PDF keep their URLs');
      }
    }
  } finally {
    await removeFixture(root);
  }
});

test('production page works when unversioned CSS and JS URLs return stale content', async () => {
  const { buildSite } = await import('../tools/build.mjs');
  const { createPreviewServer } = await import('../tools/serve.mjs');
  const { chromium } = require('playwright');
  const root = await fs.mkdtemp(path.join(os.tmpdir(), temporaryPrefix));
  let browser;
  let server;
  try {
    for (const file of ['index.html', 'styles.css', 'script.js', 'images', 'assets']) {
      await fs.cp(path.join(projectRoot, file), path.join(root, file), { recursive: true });
    }
    const output = await buildSite({ root });
    server = createPreviewServer({ root: output });
    await new Promise((resolve, reject) => {
      server.once('error', reject);
      server.listen(0, '127.0.0.1', resolve);
    });
    browser = await chromium.launch({
      headless: true,
      ...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH
        ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH }
        : {}),
    });
    const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
    page.setDefaultTimeout(5000);
    await page.route('**/styles.css', (route) => route.fulfill({
      contentType: 'text/css',
      body: 'body { background: #080c18 !important; } .ambient-art { position: static !important; }',
    }));
    await page.route('**/script.js', (route) => route.fulfill({
      contentType: 'application/javascript', body: '/* stale script without language switching */',
    }));
    const failures = [];
    page.on('pageerror', (error) => failures.push(error.message));
    page.on('response', (response) => {
      if (response.status() >= 400) failures.push(`${response.status()} ${response.url()}`);
    });
    await page.goto(`http://127.0.0.1:${server.address().port}/`, { waitUntil: 'networkidle' });
    assert.equal(await page.locator('body').evaluate((element) => getComputedStyle(element).backgroundColor), 'rgb(244, 248, 242)');
    assert.equal(await page.locator('.ambient-art').first().evaluate((element) => getComputedStyle(element).position), 'absolute');
    assert.equal(await page.locator('html').getAttribute('lang'), 'en');
    await page.locator('#language-toggle').click();
    assert.equal(await page.locator('html').getAttribute('lang'), 'zh-CN');
    assert.match(await page.locator('h1').innerText(), /\p{Script=Han}/u);
    await page.locator('#language-toggle').click();
    assert.equal(await page.locator('html').getAttribute('lang'), 'en');
    assert.deepEqual(failures, [], 'production resources load without errors');
  } finally {
    if (browser) await browser.close();
    if (server?.listening) await new Promise((resolve) => server.close(resolve));
    await removeFixture(root);
  }
});
