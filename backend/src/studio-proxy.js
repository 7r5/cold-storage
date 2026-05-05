// Proxy reverse para Prisma Studio en Render.
// Prisma Studio solo escucha en 127.0.0.1; este script lo expone en 0.0.0.0:$PORT.
const http = require('http');
const net = require('net');
const { spawn } = require('child_process');

const STUDIO_PORT = 5555;
const PORT = parseInt(process.env.PORT || '10000', 10);

// Arranca Prisma Studio en localhost
const studio = spawn(
  'npx',
  [
    'prisma', 'studio',
    '--browser', 'none',
    '--port', String(STUDIO_PORT),
    '--schema', './prisma/schema.prisma',
  ],
  {
    stdio: 'inherit',
    env: { ...process.env, PRISMA_SCHEMA_DISABLE_ADVISORY_LOCK: '1' },
  },
);
studio.on('error', (err) => { console.error('Studio spawn error:', err); process.exit(1); });
studio.on('exit', (code) => { console.error(`Studio exited with code ${code}`); process.exit(code ?? 1); });

// Espera hasta que Studio abra el puerto
function waitForPort(port, retries = 30, delay = 1000) {
  return new Promise((resolve, reject) => {
    function attempt(n) {
      const sock = net.createConnection(port, '127.0.0.1');
      sock.once('connect', () => { sock.destroy(); resolve(); });
      sock.once('error', () => {
        sock.destroy();
        if (n <= 0) return reject(new Error(`Puerto ${port} no disponible tras ${retries} intentos`));
        setTimeout(() => attempt(n - 1), delay);
      });
    }
    attempt(retries);
  });
}

function proxyRequest(req, res) {
  const opts = {
    hostname: '127.0.0.1',
    port: STUDIO_PORT,
    path: req.url,
    method: req.method,
    headers: req.headers,
  };
  const pReq = http.request(opts, (pRes) => {
    res.writeHead(pRes.statusCode, pRes.headers);
    pRes.pipe(res, { end: true });
  });
  pReq.on('error', (err) => {
    console.error('Proxy HTTP error:', err.message);
    if (!res.headersSent) res.writeHead(502);
    res.end('Bad Gateway');
  });
  req.pipe(pReq, { end: true });
}

waitForPort(STUDIO_PORT)
  .then(() => {
    const server = http.createServer(proxyRequest);

    // Proxy WebSocket (Prisma Studio lo usa para actualizaciones en vivo)
    server.on('upgrade', (req, socket, head) => {
      const opts = {
        hostname: '127.0.0.1',
        port: STUDIO_PORT,
        path: req.url,
        method: 'GET',
        headers: req.headers,
      };
      const pReq = http.request(opts);
      pReq.on('upgrade', (pRes, pSocket) => {
        const headerLines = Object.entries(pRes.headers)
          .map(([k, v]) => `${k}: ${v}`)
          .join('\r\n');
        socket.write(`HTTP/1.1 101 Switching Protocols\r\n${headerLines}\r\n\r\n`);
        pSocket.pipe(socket, { end: true });
        socket.pipe(pSocket, { end: true });
      });
      pReq.on('error', () => socket.destroy());
      pReq.end();
    });

    server.listen(PORT, '0.0.0.0', () => {
      console.log(`studio-proxy escuchando en 0.0.0.0:${PORT} → localhost:${STUDIO_PORT}`);
    });
  })
  .catch((err) => {
    console.error(err.message);
    process.exit(1);
  });
