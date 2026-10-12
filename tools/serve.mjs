import { createServer } from 'node:http';
import { readFile, realpath, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = fileURLToPath(new URL('../', import.meta.url));
const mimeTypes = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.pdf': 'application/pdf',
};

export function createPreviewServer({ root = projectRoot } = {}) {
  const resolvedRoot = path.resolve(root);
  const isWithinRoot = (file) => file === resolvedRoot || file.startsWith(`${resolvedRoot}${path.sep}`);
  return createServer(async (request, response) => {
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      response.writeHead(405, { Allow: 'GET, HEAD' }).end('Method not allowed');
      return;
    }
    try {
      const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname).replaceAll('\\', '/');
      if (pathname.split('/').some((part) => part.startsWith('.'))) {
        response.writeHead(403).end('Forbidden');
        return;
      }
      let file = path.resolve(resolvedRoot, `.${pathname}`);
      if (!isWithinRoot(file)) {
        response.writeHead(403).end('Forbidden');
        return;
      }
      if ((await stat(file)).isDirectory()) file = path.join(file, 'index.html');
      file = await realpath(file);
      if (!isWithinRoot(file)) {
        response.writeHead(403).end('Forbidden');
        return;
      }
      const content = await readFile(file);
      response.writeHead(200, {
        'Content-Type': mimeTypes[path.extname(file).toLowerCase()] || 'application/octet-stream',
        'Cache-Control': 'no-store',
        'X-Content-Type-Options': 'nosniff',
      });
      response.end(request.method === 'HEAD' ? undefined : content);
    } catch (error) {
      const code = error instanceof URIError ? 400 : 404;
      response.writeHead(code).end(code === 400 ? 'Bad request' : 'Not found');
    }
  });
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const port = Number(process.env.PORT ?? process.argv[2] ?? 4173);
  const server = createPreviewServer();
  server.on('error', (error) => {
    console.error(`Could not start the preview server: ${error.message}`);
    process.exitCode = 1;
  });
  server.listen(port, '127.0.0.1', () => {
    console.log(`Preview: http://127.0.0.1:${server.address().port}`);
  });
}
