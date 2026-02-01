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
let targetScore = 50;
let round = 1;

const effects = { /* ίδιο mapping όπως πριν */ };

function broadcastTurn(){
  io.emit("turnUpdate", players[turnIndex].id);
}

function startNextRound(){
  let countdown = 10;

  const interval = setInterval(()=>{
    io.emit("showOverlay", `🔁 Γύρος ${round + 1}\nΞεκινάμε σε ${countdown}...`);
    countdown--;

    if(countdown < 0){
      clearInterval(interval);

      players.forEach(p => p.position = 0);
      io.emit("updatePositions", players);

      round++;
      broadcastTurn();
    }
  },1000);
}

io.on("connection", (socket) => {

  socket.on("setTargetScore", (score)=>{
    targetScore = score;
  });

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

    if (players.length === 1) broadcastTurn();
  });

  socket.on("rollDice", () => {
    const player = players[turnIndex];
    if (player.id !== socket.id) return;

    const roll = Math.floor(Math.random() * 6) + 1;

    if (player.position === 0) player.position = 1;
    else {
      player.position += roll;
      if (player.position > 100) player.position = 100;
    }

    let overlayText = `🎲 ${player.name} έφερε ${roll}`;

    const effect = effects[player.position];
    if (effect) {
      if (effect.type === "plus") {
        player.score += effect.value;
        overlayText += ` | ➕ Κερδίζει ${effect.value} πόντους`;
      }
      if (effect.type === "minus") {
        player.score -= effect.value;
        overlayText += ` | ➖ Χάνει ${effect.value} πόντους`;
      }
      if (effect.type === "give") {
        players.forEach(p => {
          if (p.id !== player.id) p.score += effect.value;
        });
        overlayText += ` | 🎁 Δίνει ${effect.value} πόντους στους άλλους`;
      }
    }

    io.emit("updatePlayers", players);
    io.emit("updatePositions", players);
    io.emit("showOverlay", overlayText);

    // ===== ΑΝ ΦΤΑΣΕΙ 100 → ΝΕΟΣ ΓΥΡΟΣ =====
    if (player.position === 100) {
      startNextRound();
      return;
    }

    // ===== ΝΙΚΗ =====
    if (player.score >= targetScore) {
      io.emit("showOverlay", `🏆 Νικητής ο ${player.name} με ${player.score} πόντους!`);
      return;
    }

    turnIndex = (turnIndex + 1) % players.length;
    broadcastTurn();
  });

});

const PORT = process.env.PORT || 3000;
server.listen(PORT);
