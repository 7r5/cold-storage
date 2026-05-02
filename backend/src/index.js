// Entry point: HTTP server + Socket.IO + simulator wiring
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors'); // Asegúrate de que esté instalado: npm install cors

const config = require('./config');
const { createApp } = require('./app');
const { attachSockets } = require('./sockets');
const engine = require('./simulator/engine');

const app = createApp();

// --- CONFIGURACIÓN DE CORS PARA EXPRESS ---
// Esto permite que las peticiones REST (Login) funcionen
app.use(cors({
  origin: config.corsOrigins,
  credentials: true
}));

const server = http.createServer(app);

// --- CONFIGURACIÓN DE CORS PARA SOCKET.IO ---
// Esto permite que el panel de simulación funcione en tiempo real
const io = new Server(server, {
  cors: {
    origin: config.corsOrigins,
    methods: ["GET", "POST"],
    credentials: true
  },
});

attachSockets(io);
engine.setIo(io);

server.listen(config.port, () => {
  console.log(`API listening on :${config.port} (${config.nodeEnv})`);
  console.log(`CORS allowed for: ${config.corsOrigins}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  engine.shutdown();
  server.close(() => process.exit(0));
});