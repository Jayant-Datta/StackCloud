import http from "node:http";
import { WebSocketServer, WebSocket } from "ws";
import * as Y from "yjs";
import * as syncProtocol from "y-protocols/sync";
import * as awarenessProtocol from "y-protocols/awareness";
import * as encoding from "lib0/encoding";
import * as decoding from "lib0/decoding";

const PORT = parseInt(process.env.COLLAB_PORT || "1234", 10);
const HOST = process.env.COLLAB_HOST || "0.0.0.0";

const MESSAGE_SYNC = 0;
const MESSAGE_AWARENESS = 1;

class CollabRoom {
  constructor(name) {
    this.name = name;
    this.doc = new Y.Doc();
    this.awareness = new awarenessProtocol.Awareness(this.doc);
    this.conns = new Map(); // ws => Set<number> of clientIDs
    this.lastActive = Date.now();

    // Broadcast document CRDT updates to all clients in this room except origin
    this.doc.on("update", (update, origin) => {
      this.lastActive = Date.now();
      const encoder = encoding.createEncoder();
      encoding.writeVarUint(encoder, MESSAGE_SYNC);
      syncProtocol.writeUpdate(encoder, update);
      const message = encoding.toUint8Array(encoder);

      for (const [conn] of this.conns) {
        if (conn !== origin && conn.readyState === WebSocket.OPEN) {
          conn.send(message);
        }
      }
    });

    // Broadcast Awareness presence & cursor updates
    this.awareness.on("update", ({ added, updated, removed }, origin) => {
      this.lastActive = Date.now();
      const changedClients = added.concat(updated, removed);
      const encoder = encoding.createEncoder();
      encoding.writeVarUint(encoder, MESSAGE_AWARENESS);
      encoding.writeVarUint8Array(
        encoder,
        awarenessProtocol.encodeAwarenessUpdate(this.awareness, changedClients)
      );
      const buff = encoding.toUint8Array(encoder);

      for (const [conn] of this.conns) {
        if (conn !== origin && conn.readyState === WebSocket.OPEN) {
          conn.send(buff);
        }
      }
    });
  }

  getText(field = "monaco") {
    return this.doc.getText(field);
  }
}

const rooms = new Map();

function getRoom(name) {
  let room = rooms.get(name);
  if (!room) {
    room = new CollabRoom(name);
    rooms.set(name, room);
    console.log(`[CollabServer] Room created: ${name} (active rooms: ${rooms.size})`);
  }
  return room;
}

// HTTP Server for health, inspect, and document initialization
const server = http.createServer(async (req, res) => {
  // CORS headers
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);

  if (url.pathname === "/health" || url.pathname === "/status") {
    const roomSummaries = Array.from(rooms.entries()).map(([name, room]) => ({
      name,
      connections: room.conns.size,
      textLength: room.getText("monaco").length,
      activeUsers: Array.from(room.awareness.getStates().values()).map((s) => s.user?.name || "Unknown"),
    }));

    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(
      JSON.stringify({
        status: "ok",
        uptimeSeconds: Math.round(process.uptime()),
        roomsCount: rooms.size,
        rooms: roomSummaries,
      })
    );
    return;
  }

  // GET /api/doc/:roomName - get current text in room
  if (req.method === "GET" && url.pathname.startsWith("/api/doc/")) {
    const roomName = decodeURIComponent(url.pathname.replace("/api/doc/", ""));
    const room = rooms.get(roomName);
    if (!room) {
      res.writeHead(404, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Room not found in memory" }));
      return;
    }

    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(
      JSON.stringify({
        room: roomName,
        text: room.getText("monaco").toString(),
        length: room.getText("monaco").length,
        connections: room.conns.size,
      })
    );
    return;
  }

  // POST /api/doc/:roomName - initialize or seed document text if empty
  if (req.method === "POST" && url.pathname.startsWith("/api/doc/")) {
    const roomName = decodeURIComponent(url.pathname.replace("/api/doc/", ""));
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
    });
    req.on("end", () => {
      try {
        const payload = JSON.parse(body || "{}");
        const room = getRoom(roomName);
        const ytext = room.getText("monaco");

        if (typeof payload.initialText === "string" && ytext.length === 0) {
          ytext.insert(0, payload.initialText);
          console.log(`[CollabServer] Initialized room ${roomName} with ${payload.initialText.length} characters.`);
        }

        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(
          JSON.stringify({
            success: true,
            length: ytext.length,
          })
        );
      } catch (err) {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Invalid JSON payload" }));
      }
    });
    return;
  }

  res.writeHead(200, { "Content-Type": "text/plain" });
  res.end("Lumina Collaboration WebSocket Server is running.\n");
});

// WebSocket Server
const wss = new WebSocketServer({ server });

wss.on("connection", (conn, req) => {
  const parsedUrl = new URL(req.url, `http://${req.headers.host || "localhost"}`);
  let roomName = parsedUrl.pathname.replace(/^\//, "") || parsedUrl.searchParams.get("room") || "default";
  roomName = decodeURIComponent(roomName);

  const room = getRoom(roomName);
  room.conns.set(conn, new Set());

  // Connection heartbeat
  conn.isAlive = true;
  conn.on("pong", () => {
    conn.isAlive = true;
  });

  // Step 1: Send initial Yjs sync step 1
  const encoder = encoding.createEncoder();
  encoding.writeVarUint(encoder, MESSAGE_SYNC);
  syncProtocol.writeSyncStep1(encoder, room.doc);
  conn.send(encoding.toUint8Array(encoder));

  // Step 2: Send current awareness state
  const awarenessStates = room.awareness.getStates();
  if (awarenessStates.size > 0) {
    const awEncoder = encoding.createEncoder();
    encoding.writeVarUint(awEncoder, MESSAGE_AWARENESS);
    encoding.writeVarUint8Array(
      awEncoder,
      awarenessProtocol.encodeAwarenessUpdate(
        room.awareness,
        Array.from(awarenessStates.keys())
      )
    );
    conn.send(encoding.toUint8Array(awEncoder));
  }

  conn.on("message", (message) => {
    try {
      const decoder = decoding.createDecoder(new Uint8Array(message));
      const messageType = decoding.readVarUint(decoder);

      if (messageType === MESSAGE_SYNC) {
        const replyEncoder = encoding.createEncoder();
        encoding.writeVarUint(replyEncoder, MESSAGE_SYNC);
        syncProtocol.readSyncMessage(decoder, replyEncoder, room.doc, conn);
        if (encoding.length(replyEncoder) > 1) {
          conn.send(encoding.toUint8Array(replyEncoder));
        }
      } else if (messageType === MESSAGE_AWARENESS) {
        awarenessProtocol.applyAwarenessUpdate(
          room.awareness,
          decoding.readVarUint8Array(decoder),
          conn
        );
      }
    } catch (err) {
      console.error(`[CollabServer] Message error in room ${roomName}:`, err);
    }
  });

  conn.on("close", () => {
    const controlledIds = room.conns.get(conn);
    if (controlledIds && controlledIds.size > 0) {
      awarenessProtocol.removeAwarenessStates(
        room.awareness,
        Array.from(controlledIds),
        null
      );
    }
    room.conns.delete(conn);

    if (room.conns.size === 0) {
      console.log(`[CollabServer] Room ${roomName} now has 0 active connections.`);
    }
  });

  conn.on("error", (err) => {
    console.warn(`[CollabServer] Socket error in room ${roomName}:`, err.message);
  });
});

// Periodic ping to keep all connections healthy
const pingInterval = setInterval(() => {
  wss.clients.forEach((conn) => {
    if (conn.isAlive === false) {
      return conn.terminate();
    }
    conn.isAlive = false;
    conn.ping();
  });
}, 30000);

wss.on("close", () => {
  clearInterval(pingInterval);
});

server.listen(PORT, HOST, () => {
  console.log(`\n======================================================`);
  console.log(`  🚀 Lumina Real-time Collaboration Server Active`);
  console.log(`  📡 WebSocket & HTTP listening on http://${HOST}:${PORT}`);
  console.log(`  👥 Yjs CRDT + Telepresence Awareness enabled`);
  console.log(`======================================================\n`);
});

process.on("SIGINT", () => {
  console.log("\n[CollabServer] Shutting down collaboration server...");
  server.close(() => process.exit(0));
});

