const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);

// Allow cross-origin (important if you serve frontend elsewhere too)
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Serve static files (index.html, etc.)
app.use(express.static(__dirname));

const sessions = {}; // PIN -> host socket.id

io.on("connection", (socket) => {
  console.log("🔗 User connected:", socket.id);

  socket.on("createSession", (pin) => {
    sessions[pin] = socket.id;
    socket.emit("sessionCreated", pin);
    console.log("📌 Session created with PIN:", pin);
  });

  socket.on("joinSession", (pin) => {
    const host = sessions[pin];
    if (host) {
      console.log(`👥 Peer ${socket.id} joined PIN ${pin}`);
      io.to(host).emit("peerJoined", socket.id);
      socket.emit("peerFound", host);
    } else {
      socket.emit("errorMsg", "❌ Invalid PIN or session not found");
    }
  });

  socket.on("signal", ({ to, data }) => {
    io.to(to).emit("signal", { from: socket.id, data });
  });

  socket.on("disconnect", () => {
    console.log("❌ User disconnected:", socket.id);
    for (const pin in sessions) {
      if (sessions[pin] === socket.id) {
        delete sessions[pin];
        console.log("🗑️ Session closed:", pin);
      }
    }
  });
});

// Render provides PORT via env
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
