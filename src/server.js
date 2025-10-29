const express = require("express");
const http = require("http");
const WebSocket = require("ws");
const {
  joinRoom,
  leaveRoom,
  broadcastMessage,
  getRoomInfo,
  handleDisconnection,
} = require("./utils/websocket");

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

const rooms = {};

app.get("/health", (req, res) => {
  res.status(200).send("OK");
});

wss.on("connection", (ws) => {
  console.log("New WebSocket connection established");

  ws.on("message", (message) => {
    try {
      const data = JSON.parse(message);
      console.log("Received message:", data.type, data.room || "no room");

      switch (data.type) {
        case "join":
          joinRoom(ws, data.room, rooms);
          break;
        case "leave":
          leaveRoom(ws, data.room, rooms);
          break;
        case "message":
          broadcastMessage(data.room, data.message, rooms);
          break;
        case "offer":
          handleWebRTCSignaling(ws, data, rooms, "offer");
          break;
        case "answer":
          handleWebRTCSignaling(ws, data, rooms, "answer");
          break;
        case "candidate":
          handleWebRTCSignaling(ws, data, rooms, "candidate");
          break;
        default:
          console.log("Unknown message type:", data.type);
          break;
      }
    } catch (error) {
      console.error("Error parsing message:", error);
      ws.send(
        JSON.stringify({
          type: "error",
          message: "Invalid message format",
        })
      );
    }
  });

  ws.on("close", () => {
    console.log("WebSocket connection closed");
    handleDisconnection(ws, rooms);
  });

  ws.on("error", (error) => {
    console.error("WebSocket error:", error);
  });
});

/**
 * Handle WebRTC signaling messages (offer, answer, candidate)
 * @param {WebSocket} ws - The sender's WebSocket connection
 * @param {Object} data - The signaling data
 * @param {Object} rooms - The rooms object
 * @param {string} messageType - The type of signaling message
 */
function handleWebRTCSignaling(ws, data, rooms, messageType) {
  const { room, targetPeer, ...signalData } = data;

  if (!room || !rooms[room]) {
    ws.send(
      JSON.stringify({
        type: "error",
        message: "Room not found or not joined",
      })
    );
    return;
  }

  // If targetPeer is specified, send only to that peer
  if (targetPeer) {
    const targetClient = Array.from(rooms[room]).find(
      (client) => client.peerId === targetPeer
    );
    if (targetClient && targetClient.readyState === targetClient.OPEN) {
      targetClient.send(
        JSON.stringify({
          type: messageType,
          room: room,
          fromPeer: ws.peerId,
          ...signalData,
        })
      );
      console.log(
        `Sent ${messageType} from ${ws.peerId} to ${targetPeer} in room ${room}`
      );
    } else {
      ws.send(
        JSON.stringify({
          type: "error",
          message: "Target peer not found or disconnected",
        })
      );
    }
  } else {
    // Broadcast to all other peers in the room
    const signalMessage = JSON.stringify({
      type: messageType,
      room: room,
      fromPeer: ws.peerId,
      ...signalData,
    });

    rooms[room].forEach((client) => {
      if (client !== ws && client.readyState === client.OPEN) {
        client.send(signalMessage);
      }
    });

    console.log(
      `Broadcasted ${messageType} from ${
        ws.peerId || "unknown"
      } to room ${room}`
    );
  }
}

const PORT = process.env.PORT || 3001;

server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
