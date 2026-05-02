// Entry point: HTTP server + Socket.IO + simulator wiring
const http = require('http');
const { Server } = require('socket.io');

const config = require('./config');
const { createApp } = require('./app');
const { attachSockets } = require('./sockets');
const engine = require('./simulator/engine');

const app = createApp();
const server = http.createServer(app);

const io = new Server(server, {
  cors: { origin: config.corsOrigins, credentials: true },
});

attachSockets(io);
engine.setIo(io);

server.listen(config.port, () => {
  console.log(`API listening on :${config.port} (${config.nodeEnv})`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  engine.shutdown();
  server.close(() => process.exit(0));
});
