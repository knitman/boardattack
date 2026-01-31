const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static("public"));

let takenTokens = [];
let players = [];

io.on("connection", (socket) => {

  socket.on("joinPlayer", (data) => {
    if (takenTokens.includes(data.token)) return;

    takenTokens.push(data.token);
    players.push({ ...data, score: 0 });

    io.emit("updatePlayers", players);
    io.emit("updateTokens", takenTokens);
  });

});

server.listen(3000, () => {
  console.log("Server running on http://localhost:3000");
});
