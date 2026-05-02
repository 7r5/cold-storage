// Socket.IO setup. The engine pushes events; clients only subscribe.
function attachSockets(io) {
  io.on('connection', (socket) => {
    // Optional: log connection
    // console.log('client connected', socket.id);
    socket.emit('hello', { msg: 'connected' });
  });
}

module.exports = { attachSockets };
