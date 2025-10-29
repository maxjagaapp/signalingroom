# WebSocket Signaling Server

This project implements a WebSocket signaling server that facilitates real-time communication between clients. It is designed to manage rooms and client connections, allowing users to join and leave rooms, as well as broadcast messages.

## Table of Contents

- [Installation](#installation)
- [Usage](#usage)
- [Endpoints](#endpoints)
- [Environment Variables](#environment-variables)
- [Deployment](#deployment)

## Installation

1. Clone the repository:
   ```
   git clone <repository-url>
   cd websocket-signaling-server
   ```

2. Install the dependencies:
   ```
   npm install
   ```

3. Create a `.env` file in the root directory and configure your environment variables.

## Usage

To start the server, run the following command:
```
npm start
```

The server will start and listen for WebSocket connections.

## Endpoints

- **Health Check**: `GET /health`
  - Returns a simple health check response to verify that the server is running.

## Environment Variables

The following environment variables can be configured in the `.env` file:

- `PORT`: The port on which the server will run (default is 3000).

## Deployment

This project can be deployed on Render. The `render.yaml` file contains the necessary configuration for deployment. Make sure to set up your environment variables in the Render dashboard as needed.