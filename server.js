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

// ===== EFFECTS =====
const effects = {
  3:{type:"plus",value:5},8:{type:"plus",value:8},12:{type:"plus",value:5},
  17:{type:"plus",value:10},21:{type:"plus",value:8},26:{type:"plus",value:10},
  29:{type:"plus",value:12},34:{type:"plus",value:8},38:{type:"plus",value:12},
  42:{type:"plus",value:10},47:{type:"plus",value:12},52:{type:"plus",value:10},
  57:{type:"plus",value:15},61:{type:"plus",value:12},66:{type:"plus",value:10},
  69:{type:"plus",value:15},73:{type:"plus",value:12},78:{type:"plus",value:10},
  82:{type:"plus",value:15},86:{type:"plus",value:12},90:{type:"plus",value:10},
  93:{type:"plus",value:15},96:{type:"plus",value:12},98:{type:"plus",value:10},
  100:{type:"plus",value:15},

  6:{type:"minus",value:5},11:{type:"minus",value:8},15:{type:"minus",value:5},
  19:{type:"minus",value:10},24:{type:"minus",value:8},28:{type:"minus",value:12},
  33:{type:"minus",value:10},37:{type:"minus",value:8},41:{type:"minus",value:12},
  46:{type:"minus",value:10},51:{type:"minus",value:15},56:{type:"minus",value:12},
  60:{type:"minus",value:10},64:{type:"minus",value:15},68:{type:"minus",value:12},
  72:{type:"minus",value:10},77:{type:"minus",value:15},83:{type:"minus",value:12},
  88:{type:"minus",value:10},95:{type:"minus",value:15},

  9:{type:"give",value:5},14:{type:"give",value:8},23:{type:"give",value:10},
  31:{type:"give",value:8},36:{type:"give",value:12},44:{type:"give",value:10},
  49:{type:"give",value:12},54:{type:"give",value:10},59:{type:"give",value:15},
  67:{type:"give",value:12},71:{type:"give",value:10},79:{type:"give",value:15},
  85:{type:"give",value:12},92:{type:"give",value:15},99:{type:"give",value:10},
};

function broadcastTurn(){
  if(players.length>0)
    io.emit("turnUpdate", players[turnIndex].id);
}

// ===== NEXT ROUND WITH COUNTDOWN =====
function startNextRound(){
  let countdown = 10;

  const interval = setInterval(()=>{
    io.emit("showOverlay", `🔁 Γύρος ${round + 1}\nΞεκινάμε σε ${countdown}`);
    countdown--;

    if(countdown < 0){
      clearInterval(interval);

      players.forEach(p => p.position = 0);
      io.emit("updatePositions", players);

      round++;
      setTimeout(broadcastTurn, 500);
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
        overlayText += ` | ➕ Κερδίζει ${effect.value}`;
      }
      if (effect.type === "minus") {
        player.score -= effect.value;
        overlayText += ` | ➖ Χάνει ${effect.value}`;
      }
      if (effect.type === "give") {
        players.forEach(p => {
          if (p.id !== player.id) p.score += effect.value;
        });
        overlayText += ` | 🎁 Δίνει ${effect.value} στους άλλους`;
      }
    }

    io.emit("updatePlayers", players);
    io.emit("updatePositions", players);
    io.emit("showOverlay", overlayText);

    // ===== REACHED 100 → NEXT ROUND =====
    if (player.position === 100) {
      setTimeout(startNextRound, 3000);
      return;
    }

    // ===== WIN BY SCORE =====
    if (player.score >= targetScore) {
      setTimeout(()=>{
        io.emit("showOverlay", `🏆 Νικητής ο ${player.name} με ${player.score} πόντους!`);
      },3000);
      return;
    }

    turnIndex = (turnIndex + 1) % players.length;

    // wait overlay 3s before next turn
    setTimeout(broadcastTurn, 3000);
  });

});

const PORT = process.env.PORT || 3000;
server.listen(PORT);
