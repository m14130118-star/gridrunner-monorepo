const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 80;
const BACKEND = 'localhost:3003';
const ROOT = path.join(__dirname, 'web', 'web-landing', 'out');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.apk': 'application/vnd.android.package-archive',
};

http.createServer((req, res) => {
  // API proxy
  if (req.url.startsWith('/api/')) {
    const opts = {
      hostname: 'localhost',
      port: 3003,
      path: '/api/v1' + req.url.slice(4),
      method: req.method,
      headers: { ...req.headers, host: 'localhost:3003' },
    };
    delete opts.headers['transfer-encoding'];
    const proxy = http.request(opts, (proxyRes) => {
      // CORS headers
      proxyRes.headers['access-control-allow-origin'] = '*';
      proxyRes.headers['access-control-allow-methods'] = 'GET,POST,PUT,DELETE,OPTIONS';
      proxyRes.headers['access-control-allow-headers'] = 'Content-Type,Authorization';
      res.writeHead(proxyRes.statusCode, proxyRes.headers);
      proxyRes.pipe(res);
    });
    proxy.on('error', () => { res.writeHead(502); res.end('Bad Gateway'); });
    if (req.method === 'OPTIONS') {
      res.writeHead(204, {
        'access-control-allow-origin': '*',
        'access-control-allow-methods': 'GET,POST,PUT,DELETE,OPTIONS',
        'access-control-allow-headers': 'Content-Type,Authorization',
      });
      res.end();
      return;
    }
    req.pipe(proxy);
    return;
  }

  // Static files
  let p = req.url.split('?')[0];
  if (p === '/') p = '/index.html';
  const fp = path.join(ROOT, p);
  const ext = path.extname(fp);
  fs.readFile(fp, (err, data) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('404 Not Found');
      return;
    }
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
    res.end(data);
  });
}).listen(PORT, () => {
  console.log(`Landing: http://0.0.0.0:${PORT}`);
  console.log(`API proxy: /api/* -> http://${BACKEND}/api/v1/*`);
});
