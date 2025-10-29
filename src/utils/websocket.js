// WebSocket utility functions for managing rooms and connections

/**
 * Add a WebSocket connection to a room
 * @param {WebSocket} ws - The WebSocket connection
 * @param {string} roomId - The room identifier
 * @param {Object} rooms - The rooms object containing all active rooms
 */
function joinRoom(ws, roomId, rooms) {
  if (!rooms[roomId]) {
    rooms[roomId] = new Set();
  }

  // Generate a unique peer ID if not already set
  if (!ws.peerId) {
    ws.peerId = generatePeerId();
  }

  // Add the new client to the room
  rooms[roomId].add(ws);
  ws.roomId = roomId;

  const peerCount = rooms[roomId].size;
  const roles = Array.from(rooms[roomId]).map(
    (client) => client.peerId || "unknown"
  );

  console.log(
    `Client ${ws.peerId} joined room: ${roomId}. Total peers: ${peerCount}`
  );

  // Notify the joining client about successful join and current peer count
  ws.send(
    JSON.stringify({
      type: "joined",
      room: roomId,
      count: peerCount,
      roles: roles,
      peerId: ws.peerId,
      message: `Successfully joined room ${roomId}`,
      status: peerCount === 1 ? "waiting_for_peers" : "peers_available",
    })
  );

  // Notify all other peers in the room about the new peer
  const peerJoinedMessage = JSON.stringify({
    type: "peer-joined",
    room: roomId,
    count: peerCount,
    roles: roles,
    newPeerId: ws.peerId,
    message: "A new peer has joined the room",
  });

  rooms[roomId].forEach((client) => {
    if (client !== ws && client.readyState === client.OPEN) {
      client.send(peerJoinedMessage);
    }
  });

  // If this is the first peer, send waiting status
  if (peerCount === 1) {
    console.log(
      `Peer ${ws.peerId} in room ${roomId} is waiting for other peers to join`
    );
  }
}

/**
 * Generate a unique peer ID
 * @returns {string} A unique peer identifier
 */
function generatePeerId() {
  return (
    "peer_" +
    Math.random().toString(36).substr(2, 9) +
    "_" +
    Date.now().toString(36)
  );
}

/**
 * Remove a WebSocket connection from a room
 * @param {WebSocket} ws - The WebSocket connection
 * @param {string} roomId - The room identifier
 * @param {Object} rooms - The rooms object containing all active rooms
 */
function leaveRoom(ws, roomId, rooms) {
  if (rooms[roomId]) {
    rooms[roomId].delete(ws);

    const remainingPeers = rooms[roomId].size;
    const roles = Array.from(rooms[roomId]).map(
      (client) => client.peerId || "unknown"
    );

    console.log(
      `Client ${ws.peerId} left room: ${roomId}. Remaining peers: ${remainingPeers}`
    );

    // Notify remaining peers about the departure
    if (remainingPeers > 0) {
      const peerLeftMessage = JSON.stringify({
        type: "peer-left",
        room: roomId,
        count: remainingPeers,
        roles: roles,
        leftPeerId: ws.peerId,
        message: "A peer has left the room",
        status: remainingPeers === 1 ? "waiting_for_peers" : "peers_available",
      });

      rooms[roomId].forEach((client) => {
        if (client.readyState === client.OPEN) {
          client.send(peerLeftMessage);
        }
      });
    }

    // Clean up empty rooms
    if (remainingPeers === 0) {
      delete rooms[roomId];
      console.log(`Room ${roomId} is now empty and has been cleaned up`);
    }
  }

  const leftPeerId = ws.peerId;
  delete ws.roomId;
  delete ws.peerId;

  // Notify the leaving client
  if (ws.readyState === ws.OPEN) {
    ws.send(
      JSON.stringify({
        type: "left",
        room: roomId,
        peerId: leftPeerId,
        message: `Successfully left room ${roomId}`,
      })
    );
  }
}

/**
 * Broadcast a message to all clients in a specific room
 * @param {string} roomId - The room identifier
 * @param {string} message - The message to broadcast
 * @param {Object} rooms - The rooms object containing all active rooms
 */
function broadcastMessage(roomId, message, rooms) {
  if (!rooms[roomId]) {
    console.log(`Room ${roomId} does not exist`);
    return;
  }

  const messageData = JSON.stringify({
    type: "broadcast",
    room: roomId,
    message: message,
    timestamp: new Date().toISOString(),
  });

  // Send message to all clients in the room
  rooms[roomId].forEach((client) => {
    if (client.readyState === client.OPEN) {
      client.send(messageData);
    }
  });

  console.log(`Broadcasted message to room ${roomId}: ${message}`);
}

/**
 * Get room information including peer count
 * @param {string} roomId - The room identifier
 * @param {Object} rooms - The rooms object containing all active rooms
 * @returns {Object} Room information
 */
function getRoomInfo(roomId, rooms) {
  if (!rooms[roomId]) {
    return {
      exists: false,
      peerCount: 0,
      status: "room_not_found",
    };
  }

  const peerCount = rooms[roomId].size;
  return {
    exists: true,
    peerCount: peerCount,
    status:
      peerCount === 0
        ? "empty"
        : peerCount === 1
        ? "waiting_for_peers"
        : "peers_available",
  };
}

/**
 * Handle client disconnection and clean up room membership
 * @param {WebSocket} ws - The WebSocket connection that disconnected
 * @param {Object} rooms - The rooms object containing all active rooms
 */
function handleDisconnection(ws, rooms) {
  if (ws.roomId && rooms[ws.roomId]) {
    rooms[ws.roomId].delete(ws);

    const remainingPeers = rooms[ws.roomId].size;
    const roles = Array.from(rooms[ws.roomId]).map(
      (client) => client.peerId || "unknown"
    );

    console.log(
      `Client ${ws.peerId} disconnected from room: ${ws.roomId}. Remaining peers: ${remainingPeers}`
    );

    // Notify remaining peers about the disconnection
    if (remainingPeers > 0) {
      const peerDisconnectedMessage = JSON.stringify({
        type: "peer-left",
        room: ws.roomId,
        count: remainingPeers,
        roles: roles,
        leftPeerId: ws.peerId,
        message: "A peer has disconnected",
        status: remainingPeers === 1 ? "waiting_for_peers" : "peers_available",
      });

      rooms[ws.roomId].forEach((client) => {
        if (client.readyState === client.OPEN) {
          client.send(peerDisconnectedMessage);
        }
      });
    }

    // Clean up empty rooms
    if (remainingPeers === 0) {
      delete rooms[ws.roomId];
      console.log(`Room ${ws.roomId} is now empty and has been cleaned up`);
    }
  }
}

module.exports = {
  joinRoom,
  leaveRoom,
  broadcastMessage,
  getRoomInfo,
  handleDisconnection,
};
