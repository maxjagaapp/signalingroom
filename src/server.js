const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const { joinRoom, leaveRoom, broadcastMessage } = require('./utils/websocket');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

const rooms = {};

app.get('/health', (req, res) => {
    res.status(200).send('OK');
});

wss.on('connection', (ws) => {
    ws.on('message', (message) => {
        const data = JSON.parse(message);

        switch (data.type) {
            case 'join':
                joinRoom(ws, data.room, rooms);
                break;
            case 'leave':
                leaveRoom(ws, data.room, rooms);
                break;
            case 'message':
                broadcastMessage(data.room, data.message, rooms);
                break;
            default:
                break;
        }
    });

    ws.on('close', () => {
        // Handle disconnection logic if needed
    });
});

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});