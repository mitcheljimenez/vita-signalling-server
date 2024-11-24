import express from "express";
import { createServer } from "http";
import { Server, Socket } from "socket.io";
import cors from "cors";

interface Room {
  sender?: string;
  receiver?: string;
  filesCompleted?: boolean;
}

interface RoomMap {
  [key: string]: Room;
}

const app = express();
const httpServer = createServer(app);

app.use(express.json());
app.use(cors());

const io = new Server(httpServer, {
  cors: {
    origin: process.env.ALLOWED_ORIGINS
      ? process.env.ALLOWED_ORIGINS.split(",")
      : ["http://localhost:3000", "http://localhost:3001"],
    methods: ["GET", "POST"],
    credentials: true,
  },
});

const rooms: RoomMap = {};

app.get("/", (_, res) => {
  res.status(200).send("WebRTC Signaling Server");
});

app.get("/rooms/:roomId", (req, res) => {
  const { roomId } = req.params;
  const room = rooms[roomId];

  res.status(200).json({
    hasSender: !!room?.sender,
    hasReceiver: !!room?.receiver,
  });
});

// Health check endpoint
app.get("/health", (_, res) => {
  res.status(200).json({ status: "healthy" });
});

// Socket.IO connection handling
io.on("connection", (socket: Socket) => {
  socket.on(
    "join-room",
    (
      roomId: string,
      role: "sender" | "receiver",
      callback: (success: boolean) => void
    ) => {
      if (!rooms[roomId]) {
        rooms[roomId] = { filesCompleted: false };
      }

      const room = rooms[roomId];

      if (role === "sender" && room.sender) {
        callback(false);
        return;
      }
      if (role === "receiver" && room.receiver) {
        callback(false);
        return;
      }

      if (role === "sender") {
        room.sender = socket.id;
      } else {
        room.receiver = socket.id;
        if (room.sender) {
          io.to(room.sender).emit("peer-joined");
        }
      }

      socket.join(roomId);
      callback(true);

      io.to(roomId).emit("room-update", {
        hasSender: !!room.sender,
        hasReceiver: !!room.receiver,
        filesCompleted: room.filesCompleted,
      });
    }
  );

  socket.on("files-completed", (roomId: string) => {
    const room = rooms[roomId];
    if (!room || socket.id !== room.sender) return;

    room.filesCompleted = true;
    io.to(roomId).emit("transfer-completed");

    // Schedule room cleanup after a delay
    setTimeout(() => {
      if (rooms[roomId]) {
        io.to(roomId).emit("force-disconnect");
        delete rooms[roomId];
      }
    }, 2000);
  });

  socket.on("signal", (data: { roomId: string; signal: any }) => {
    const room = rooms[data.roomId];
    if (!room) return;

    const targetId = socket.id === room.sender ? room.receiver : room.sender;
    if (targetId) {
      io.to(targetId).emit("signal", data.signal);
    }
  });

  socket.on("chunk-received", (data: { roomId: string; chunkId: number }) => {
    const room = rooms[data.roomId];
    if (!room || socket.id !== room.receiver) return;

    if (room.sender) {
      io.to(room.sender).emit("chunk-ack", data.chunkId);
    }
  });

  socket.on("leave-room", (roomId: string) => {
    const room = rooms[roomId];
    if (!room) return;

    if (socket.id === room.sender) {
      room.sender = undefined;
    } else if (socket.id === room.receiver) {
      room.receiver = undefined;
    }

    if (!room.sender && !room.receiver) {
      delete rooms[roomId];
    }
  });

  socket.on("disconnect", () => {
    for (const roomId in rooms) {
      if (!rooms.hasOwnProperty(roomId)) continue;

      const room = rooms[roomId];
      if (room.sender === socket.id) {
        room.sender = undefined;
      }
      if (room.receiver === socket.id) {
        room.receiver = undefined;
      }

      if (!room.sender && !room.receiver) {
        delete rooms[roomId];
      }
    }
  });
});

const PORT = process.env.PORT || 8081;
httpServer.listen(PORT, () => {
  console.log(`WebRTC Signaling Server running on port ${PORT}`);
});
