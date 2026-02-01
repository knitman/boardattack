const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.get("/qr", (req, res) => {
  const fullUrl = req.protocol + "://" + req.get("host") + "/join.html";
  const qrUrl =
    "https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=" +
    encodeURIComponent(fullUrl);
  res.redirect(qrUrl);
});

app.use(express.static("public"));

let players = [];
let takenTokens = [];
let turnIndex = 0;

function broadcastTurn() {
  io.emit("turnUpdate", players[turnIndex].id);
}

io.on("connection", (socket) => {

  socket.on("joinPlayer", (data) => {
    if (takenTokens.includes(data.token)) return;

    takenTokens.push(data.token);

    players.push({
      id: socket.id,
      name: data.name,
      token: data.token,
      score: 0,
      position: 0
    });

    io.emit("updatePlayers", players);
    io.emit("updateTokens", takenTokens);

    if (players.length === 1) {
      broadcastTurn();
    }
  });

  socket.on("rollDice", () => {
    const player = players[turnIndex];
    if (player.id !== socket.id) return;

    const roll = Math.floor(Math.random() * 6) + 1;

    if (player.position === 0) {
      player.position = 1;
    } else {
      player.position += roll;
      if (player.position > 100) player.position = 100;
    }

    io.emit("diceResult", { player: player.name, roll });
    io.emit("updatePositions", players);

    turnIndex = (turnIndex + 1) % players.length;
    broadcastTurn();
  });

});

const PORT = process.env.PORT || 3000;
server.listen(PORT);
