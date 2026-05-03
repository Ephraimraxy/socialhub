import { createReadStream, existsSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, normalize, resolve } from 'node:path';

const port = Number(process.env.PORT || 3000);
const distRoot = resolve('dist');

const contentTypes = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.ico': 'image/x-icon',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.txt': 'text/plain; charset=utf-8',
  '.webp': 'image/webp',
};

function resolveAsset(urlPath) {
  const pathname = decodeURIComponent(new URL(urlPath, `http://localhost:${port}`).pathname);
  const normalized = normalize(pathname).replace(/^(\.\.[/\\])+/, '');
  const requestedPath = resolve(join(distRoot, normalized));

  if (!requestedPath.startsWith(distRoot)) {
    return null;
  }

  if (existsSync(requestedPath) && statSync(requestedPath).isFile()) {
    return requestedPath;
  }

  return join(distRoot, 'index.html');
}

const server = createServer((request, response) => {
  if (request.url === '/health') {
    response.writeHead(200, { 'content-type': 'application/json; charset=utf-8' });
    response.end(JSON.stringify({ ok: true }));
    return;
  }

  const filePath = resolveAsset(request.url || '/');

  if (!filePath || !existsSync(filePath)) {
    response.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
    response.end('Not found');
    return;
  }

  const extension = extname(filePath);
  response.writeHead(200, {
    'cache-control': extension === '.html' ? 'no-cache' : 'public, max-age=31536000, immutable',
    'content-type': contentTypes[extension] || 'application/octet-stream',
  });
  createReadStream(filePath).pipe(response);
});

server.listen(port, '0.0.0.0', () => {
  console.log(`Social AI Studio listening on ${port}`);
});
