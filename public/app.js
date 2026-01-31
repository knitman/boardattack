const socket = io();
const playersDiv=document.getElementById("players");

socket.on("updatePlayers",(players)=>{
  playersDiv.innerHTML="<h3>Παίκτες</h3>";
  players.forEach(p=>{
    const d=document.createElement("div");
    d.textContent=`${p.token} ${p.name} — ${p.score}`;
    playersDiv.appendChild(d);
  });
});
