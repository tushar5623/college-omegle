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
let socketIdToRoom = {}; // Track kaun kis room mein hai

io.on("connection", (socket) => {
  console.log(`User Connected: ${socket.id}`);

  socket.on("join-room", (email) => {
    if (waitingQueue.length > 0) {
      const partnerSocket = waitingQueue.pop();
      if (partnerSocket.id !== socket.id) {
        const roomID = `${partnerSocket.id}-${socket.id}`;
        
        socket.join(roomID);
        partnerSocket.join(roomID);
        
        // Save Room ID
        socketIdToRoom[socket.id] = roomID;
        socketIdToRoom[partnerSocket.id] = roomID;

        io.to(roomID).emit("match-found", { roomID, partnerID: partnerSocket.id });
      }
    } else {
      waitingQueue.push(socket);
    }
  });

  socket.on("send-message", (data) => {
    socket.to(data.room).emit("receive-message", data.message);
  });

  socket.on("signal", (data) => {
    socket.to(data.room).emit("signal", { signal: data.signal });
  });
  socket.on("skip-partner", () => {
    // 1. Current Room ID dhundo
    const roomID = socketIdToRoom[socket.id];
    if (roomID) {
      // 2. Partner ko batao ki main chala gaya
      socket.to(roomID).emit("partner-left");
      
      // 3. Room se niklo
      socket.leave(roomID);
      delete socketIdToRoom[socket.id];
    }
});
  // --- DISCONNECT HANDLING (Call Cut Fix) ---
  socket.on("disconnect", () => {
    // 1. Queue se hatao agar wait kar raha tha
    waitingQueue = waitingQueue.filter((s) => s.id !== socket.id);
    
    // 2. Agar Room mein tha, toh Partner ko batao
    const roomID = socketIdToRoom[socket.id];
    if (roomID) {
      socket.to(roomID).emit("partner-left"); // Notification bhejo
      delete socketIdToRoom[socket.id];       // Cleanup
    }
  });
});

server.listen(5000, () => {
  console.log("SERVER RUNNING... 🚀");
});