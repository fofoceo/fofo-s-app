// Tiny local server: run `node serve.js`, then open http://localhost:5173
const http = require('http');
const fs = require('fs');
const path = require('path');

const root = __dirname;
const types = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.json': 'application/json', '.svg': 'image/svg+xml' };

http.createServer((req, res) => {
  const url = decodeURIComponent(req.url.split('?')[0]);
  const file = path.join(root, url === '/' ? 'index.html' : url);
  if (!file.startsWith(root)) { res.writeHead(403); return res.end(); }
  fs.readFile(file, (err, data) => {
    if (err) { res.writeHead(404); return res.end('Not found'); }
    res.writeHead(200, { 'Content-Type': (types[path.extname(file)] || 'text/plain') + '; charset=utf-8' });
    res.end(data);
  });
}).listen(5173, '0.0.0.0', () => {
  console.log('Fofo is running at http://localhost:5173');
  // Also show the address other devices on the same Wi-Fi can use
  for (const list of Object.values(require('os').networkInterfaces()))
    for (const a of list) if (a.family === 'IPv4' && !a.internal) console.log(`On your network:  http://${a.address}:5173`);
});
