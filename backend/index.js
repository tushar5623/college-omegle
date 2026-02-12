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
let socketIdToRoom = {}; // Kaun kis room mein hai, track karne ke liye

io.on("connection", (socket) => {
  console.log(`User Connected: ${socket.id}`);

  socket.on("join-room", (email) => {
    // Agar koi wait kar raha hai, toh usse jodo
    if (waitingQueue.length > 0) {
      const partnerSocket = waitingQueue.pop();
      if (partnerSocket.id !== socket.id) {
        const roomID = `${partnerSocket.id}-${socket.id}`;
        
        socket.join(roomID);
        partnerSocket.join(roomID);
        
        socketIdToRoom[socket.id] = roomID;
        socketIdToRoom[partnerSocket.id] = roomID;

        io.to(roomID).emit("match-found", { roomID, partnerID: partnerSocket.id });
      }
    } else {
      // Koi nahi hai, toh queue mein wait karo
      waitingQueue.push(socket);
    }
  });

  socket.on("send-message", (data) => {
    socket.to(data.room).emit("receive-message", data.message);
  });

  socket.on("signal", (data) => {
    socket.to(data.room).emit("signal", { signal: data.signal });
  });

  // --- NEW: SKIP PARTNER LOGIC ---
  socket.on("skip-partner", () => {
    const roomID = socketIdToRoom[socket.id];
    
    // 1. Agar room tha, toh partner ko batao ki main bhaag gaya
    if (roomID) {
      socket.to(roomID).emit("partner-left");
      socket.leave(roomID);
      delete socketIdToRoom[socket.id];
    }
    
    // 2. Queue se bhi hata do agar wahan tha
    waitingQueue = waitingQueue.filter(s => s.id !== socket.id);
  });

  // --- DISCONNECT HANDLING ---
  socket.on("disconnect", () => {
    const roomID = socketIdToRoom[socket.id];
    if (roomID) {
      socket.to(roomID).emit("partner-left");
      delete socketIdToRoom[socket.id];
    }
    waitingQueue = waitingQueue.filter((s) => s.id !== socket.id);
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));