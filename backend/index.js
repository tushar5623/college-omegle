const express = require("express");
const { AccessToken } = require("livekit-server-sdk"); // LiveKit Import
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
require("dotenv").config(); // .env zaroori hai

const app = express();
app.use(cors());

// --- 1. LIVEKIT TOKEN GENERATOR (Video ke liye) ---
app.get("/getToken", async (req, res) => {
  const { roomName, participantName } = req.query;

  if (!roomName || !participantName) {
    return res.status(400).send("Missing parameters");
  }

  try {
    const at = new AccessToken(
      process.env.LIVEKIT_API_KEY,
      process.env.LIVEKIT_API_SECRET,
      {
        identity: participantName,
      }
    );

    // Permissions: Banda room join kar sake aur video bhej sake
    at.addGrant({ 
      roomJoin: true, 
      room: roomName, 
      canPublish: true, 
      canSubscribe: true 
    });

    const token = await at.toJwt();
    res.send(token);
  } catch (error) {
    console.error("Token Error:", error);
    res.status(500).send("Error generating token");
  }
});

// --- 2. SOCKET.IO SERVER (Matching ke liye) ---
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*", methods: ["GET", "POST"] },
});

let waitingQueue = [];
let socketIdToRoom = {}; 

io.on("connection", (socket) => {
  console.log(`User Connected: ${socket.id}`);

  socket.on("join-room", (email) => {
    // Agar koi wait kar raha hai, toh jodi banao
    if (waitingQueue.length > 0) {
      const partnerSocket = waitingQueue.pop();
      
      if (partnerSocket.id !== socket.id) {
        // Unique Room ID banao (Jo LiveKit room name banega)
        const roomID = `${partnerSocket.id}-${socket.id}`;
        
        socket.join(roomID);
        partnerSocket.join(roomID);
        
        socketIdToRoom[socket.id] = roomID;
        socketIdToRoom[partnerSocket.id] = roomID;

        // Dono ko batao: "Jao is Room ID par LiveKit connect kar lo"
        io.to(roomID).emit("match-found", { 
          roomID, 
          partnerID: partnerSocket.id 
        });
      }
    } else {
      // Koi nahi hai, toh queue mein wait karo
      waitingQueue.push(socket);
    }
  });

  // --- MESSAGING (Text Chat abhi bhi Socket se chalegi) ---
  socket.on("send-message", (data) => {
    socket.to(data.room).emit("receive-message", data.message);
  });

  // --- SKIP / NEXT LOGIC ---
  socket.on("skip-partner", () => {
    const roomID = socketIdToRoom[socket.id];
    if (roomID) {
      socket.to(roomID).emit("partner-left");
      socket.leave(roomID);
      delete socketIdToRoom[socket.id];
    }
    // Queue se bhi hatao
    waitingQueue = waitingQueue.filter((s) => s.id !== socket.id);
  });

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