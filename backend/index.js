// backend/index.js
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*", methods: ["GET", "POST"] },
});

let waitingQueue = [];

io.on("connection", (socket) => {
  console.log(`User Connected: ${socket.id}`);

  socket.on("join-room", (email) => {
    if (waitingQueue.length > 0) {
      const partnerSocket = waitingQueue.pop();
      if (partnerSocket.id !== socket.id) {
        const roomID = `${partnerSocket.id}-${socket.id}`;
        socket.join(roomID);
        partnerSocket.join(roomID);
        io.to(roomID).emit("match-found", { roomID, partnerID: partnerSocket.id });
      }
    } else {
      waitingQueue.push(socket);
    }
  });

  // --- NEW: Chat Message Logic ---
  socket.on("send-message", (data) => {
    // Message ko room mein dusre bande ko bhejo
    socket.to(data.room).emit("receive-message", data.message);
  });

  socket.on("signal", (data) => {
    socket.to(data.room).emit("signal", { signal: data.signal });
  });

  socket.on("disconnect", () => {
    waitingQueue = waitingQueue.filter((s) => s.id !== socket.id);
  });
});

server.listen(5000, () => {
  console.log("SERVER RUNNING... Chat Enabled 💬");
});