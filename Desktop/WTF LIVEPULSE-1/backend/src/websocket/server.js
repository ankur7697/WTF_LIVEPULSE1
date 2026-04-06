const WebSocket = require('ws');

function createWebSocketHub(server) {
  const wss = new WebSocket.Server({ server, path: '/ws' });
  const clients = new Set();

  wss.on('connection', (socket) => {
    clients.add(socket);

    socket.send(JSON.stringify({
      type: 'CONNECTED',
      timestamp: new Date().toISOString(),
    }));

    socket.on('close', () => {
      clients.delete(socket);
    });
  });

  function broadcast(event) {
    const payload = JSON.stringify(event);

    clients.forEach((socket) => {
      if (socket.readyState === WebSocket.OPEN) {
        socket.send(payload);
      }
    });
  }

  function close() {
    wss.close();
    clients.clear();
  }

  return {
    broadcast,
    close,
    clientCount: () => clients.size,
    server: wss,
  };
}

function createNoopHub() {
  return {
    broadcast() {},
    close() {},
    clientCount: () => 0,
  };
}

module.exports = {
  createNoopHub,
  createWebSocketHub,
};

