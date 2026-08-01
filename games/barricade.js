<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Barricade vs AI</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      text-align: center;
      background: #222;
      color: #fff;
    }
    #gameBoard {
      display: grid;
      grid-template-columns: repeat(10, 40px);
      grid-template-rows: repeat(10, 40px);
      gap: 2px;
      margin: 20px auto;
    }
    .cell {
      width: 40px;
      height: 40px;
      background: #444;
      display: flex;
      justify-content: center;
      align-items: center;
    }
    .player { background: #4caf50; }
    .ai { background: #f44336; }
    .barricade { background: #888; }
    #status {
      margin-top: 15px;
      font-size: 18px;
    }
  </style>
</head>
<body>
  <h1>Barricade vs AI</h1>
  <div id="gameBoard"></div>
  <p id="status"></p>

  <script>
    const board = document.getElementById("gameBoard");
    const status = document.getElementById("status");
    const size = 10;

    let player = {x:0, y:0};
    let ai = {x:9, y:9};
    let barricades = [];
    let gameOver = false;

    function drawBoard() {
      board.innerHTML = "";
      for (let y=0; y<size; y++) {
        for (let x=0; x<size; x++) {
          const cell = document.createElement("div");
          cell.classList.add("cell");
          if (x===player.x && y===player.y) cell.classList.add("player");
          if (x===ai.x && y===ai.y) cell.classList.add("ai");
          if (barricades.some(b=>b.x===x && b.y===y)) cell.classList.add("barricade");
          cell.addEventListener("click", ()=>placeBarricade(x,y));
          board.appendChild(cell);
        }
      }
    }

    function placeBarricade(x,y) {
      if (gameOver) return;
      if ((x===player.x && y===player.y) || (x===ai.x && y===ai.y)) return;
      if (barricades.some(b=>b.x===x && b.y===y)) return;
      barricades.push({x,y});
      aiMove();
      checkGameOver();
      drawBoard();
    }

    function aiMove() {
      // Simple greedy AI: move closer to player
      let dx = player.x - ai.x;
      let dy = player.y - ai.y;
      let newX = ai.x + Math.sign(dx);
      let newY = ai.y + Math.sign(dy);

      if (!isBlocked(newX, ai.y)) ai.x = newX;
      else if (!isBlocked(ai.x, newY)) ai.y = newY;
    }

    function isBlocked(x,y) {
      return barricades.some(b=>b.x===x && b.y===y);
    }

    function checkGameOver() {
      if (ai.x===player.x && ai.y===player.y) {
        status.textContent = "Game Over! AI caught you.";
        gameOver = true;
      }
    }

    document.addEventListener("keydown", e=>{
      if (gameOver) return;
      let newX = player.x;
      let newY = player.y;
      if (e.key==="ArrowUp") newY--;
      if (e.key==="ArrowDown") newY++;
      if (e.key==="ArrowLeft") newX--;
      if (e.key==="ArrowRight") newX++;
      if (newX>=0 && newX<size && newY>=0 && newY<size && !isBlocked(newX,newY)) {
        player.x = newX;
        player.y = newY;
        aiMove();
        checkGameOver();
        drawBoard();
      }
    });

    drawBoard();
  </script>
</body>
</html>
