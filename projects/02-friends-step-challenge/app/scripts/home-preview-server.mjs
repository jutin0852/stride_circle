import { createServer } from 'node:http';
const metro = process.env.HOME_METRO_URL ?? 'http://localhost:8085';
const html = `<!doctype html><html><head><meta name="viewport" content="width=device-width, initial-scale=1"><title>Stride Circle Home — design preview</title><style>html,body,#home-preview,#home-preview>div{height:100%;margin:0;min-height:0}body{overflow:hidden}*{box-sizing:border-box}</style></head><body><div id="home-preview"></div><script src="/scripts/home-preview.bundle?platform=web&dev=true&hot=false&lazy=false"></script></body></html>`;
createServer(async (request, response) => {
  if (new URL(request.url, 'http://localhost').pathname === '/') { response.writeHead(200, { 'Content-Type': 'text/html' }); response.end(html); return; }
  try {
    const upstream = await fetch(new URL(request.url, metro));
    response.writeHead(upstream.status, Object.fromEntries([...upstream.headers].filter(([key]) => !['content-encoding', 'content-length', 'transfer-encoding'].includes(key))));
    response.end(Buffer.from(await upstream.arrayBuffer()));
  } catch { response.writeHead(502); response.end('Start Metro on port 8085 first.'); }
}).listen(8091, '127.0.0.1', () => console.log('Home design fixture: http://127.0.0.1:8091 (sample data, no Firebase writes)'));
