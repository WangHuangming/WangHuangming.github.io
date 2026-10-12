import { createHash } from 'node:crypto';
import { mkdir, readFile, realpath, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = fileURLToPath(new URL('../', import.meta.url));

export async function buildSite({ root = projectRoot } = {}) {
  const sourceRoot = await realpath(root);
  const output = path.join(sourceRoot, '_site');
  const existingOutput = await realpath(output).catch((error) => {
    if (error.code === 'ENOENT') return output;
    throw error;
  });
  // Only the generated directory directly inside this source root may be cleared.
  if (existingOutput !== output || path.dirname(output) !== sourceRoot) {
    throw new Error('Refusing to replace a build output outside the source root.');
  }
  await rm(output, { recursive: true, force: true });
  await mkdir(output, { recursive: true });

  let html = (await readFile(path.join(sourceRoot, 'index.html'), 'utf8')).replace(/\r\n/g, '\n');
  const references = [...html.matchAll(/\b(src|href)="([^"]+)"/g)];
  const published = new Map();
  for (const [, attribute, reference] of references) {
    if (/^(?:[a-z][a-z\d+.-]*:|\/\/|#)/i.test(reference)) continue;
    const url = new URL(reference, 'https://site.invalid/');
    const source = path.resolve(sourceRoot, `.${decodeURIComponent(url.pathname)}`);
    const relative = path.relative(sourceRoot, source);
    if (relative.startsWith('..') || path.isAbsolute(relative)) {
      throw new Error(`Resource escapes the source root: ${reference}`);
    }
    if (!published.has(source)) {
      let content = await readFile(source);
      // Produce the same public bytes and hashes on Windows and GitHub's Linux runner.
      if (/\.(css|js|svg|html)$/i.test(source)) {
        content = Buffer.from(content.toString('utf8').replace(/\r\n/g, '\n'));
      }
      const digest = createHash('sha256').update(content).digest('hex').slice(0, 12);
      const { dir, name, ext } = path.parse(relative);
      const versioned = path.join(dir, `${name}.${digest}${ext}`);
      await mkdir(path.dirname(path.join(output, versioned)), { recursive: true });
      await writeFile(path.join(output, versioned), content);
      // Keep original public URLs available for previously cached HTML.
      await writeFile(path.join(output, relative), content);
      published.set(source, versioned.split(path.sep).join('/'));
    }
    const destination = `${published.get(source)}${url.search}${url.hash}`;
    html = html.replaceAll(`${attribute}="${reference}"`, `${attribute}="${destination}"`);
  }
  await writeFile(path.join(output, 'index.html'), html);
  return output;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const output = await buildSite();
  console.log(`Prepared versioned public assets in ${output}`);
}
