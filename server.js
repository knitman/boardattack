const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static("public"));

let players = [];
let takenTokens = [];

io.on("connection", (socket) => {

  socket.on("joinPlayer", (data) => {
    if (takenTokens.includes(data.token)) return;

    takenTokens.push(data.token);
    players.push({
      name: data.name,
      token: data.token,
      score: 0
    });

    io.emit("updatePlayers", players);
    io.emit("updateTokens", takenTokens);
  });

});

const PORT = process.env.PORT || 3000;
server.listen(PORT);
