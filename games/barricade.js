// games/barricade.js
const Barricade = {
    // ---------- CONSTANTS ----------
    GRID_SIZE: 12,          // 12x12 grid
    CELL_SIZE: 50,          // 600/12 = 50
    NUM_PAWNS: 5,
    MAX_BARRICADES: 3,

    // ---------- PATH DEFINITION (row, col) ----------
    // A winding path from bottom-left to top-center
    path: [
        // Bottom-left start area
        { r: 11, c: 1 }, { r: 10, c: 1 }, { r: 9, c: 1 },
        { r: 8, c: 1 }, { r: 7, c: 1 }, { r: 6, c: 1 },
        { r: 5, c: 1 }, { r: 4, c: 1 }, { r: 3, c: 1 },
        { r: 2, c: 1 }, { r: 1, c: 1 }, { r: 0, c: 1 },
        // Move right along top
        { r: 0, c: 2 }, { r: 0, c: 3 }, { r: 0, c: 4 },
        { r: 0, c: 5 }, { r: 0, c: 6 }, { r: 0, c: 7 },
        { r: 0, c: 8 }, { r: 0, c: 9 }, { r: 0, c: 10 },
        // Move down right side
        { r: 1, c: 10 }, { r: 2, c: 10 }, { r: 3, c: 10 },
        { r: 4, c: 10 }, { r: 5, c: 10 }, { r: 6, c: 10 },
        // Move left
        { r: 6, c: 9 }, { r: 6, c: 8 }, { r: 6, c: 7 },
        { r: 6, c: 6 }, { r: 6, c: 5 },
        // Move up to finish
        { r: 5, c: 5 }, { r: 4, c: 5 }, { r: 3, c: 5 },
        { r: 2, c: 5 }, { r: 1, c: 5 }, { r: 0, c: 5 } // FINISH
    ],

    // ---------- STATE ----------
    players: [
        { pawns: [], barricadesLeft: 3, barricades: [] }, // Player 1 (Blue)
        { pawns: [], barricadesLeft: 3, barricades: [] }  // Player 2 (Green)
    ],
    currentPlayer: 0,
    diceValue: 0,
    hasRolled: false,
    selectedPawn: -1,          // index of pawn selected to move
    isGameActive: false,
    barricadesOnPath: [],      // array of path indices where barricades are placed
    winMessage: null,

    canvas: null,
    ctx: null,
    clickHandler: null,

    // ---------- LIFECYCLE ----------
    init: function() {
        console.log('Barricade init');
        this.canvas = document.getElementById('barricade-canvas');
        if (!this.canvas) return;
        this.ctx = this.canvas.getContext('2d');
        this.setupUI();
        this.start();
    },

    start: function() {
        console.log('Barricade start');
        // Reset game state
        this.players[0].pawns = Array(this.NUM_PAWNS).fill(0);
        this.players[0].barricadesLeft = this.MAX_BARRICADES;
        this.players[0].barricades = [];
        this.players[1].pawns = Array(this.NUM_PAWNS).fill(0);
        this.players[1].barricadesLeft = this.MAX_BARRICADES;
        this.players[1].barricades = [];
        this.barricadesOnPath = [];
        this.currentPlayer = 0;
        this.diceValue = 0;
        this.hasRolled = false;
        this.selectedPawn = -1;
        this.isGameActive = true;
        this.winMessage = null;

        // Hide overlay message
        document.getElementById('barricade-message').classList.add('hidden');

        // Update HUD
        this.updateHUD();

        // Render the board
        this.render();

        // Set up click handler if not already
        if (this.clickHandler) {
            this.canvas.removeEventListener('click', this.clickHandler);
        }
        this.clickHandler = this.handleClick.bind(this);
        this.canvas.addEventListener('click', this.clickHandler);

        // Reset instructions (since it's not tower defense)
        document.querySelector('#game-barricade .instructions').innerHTML = `
            <strong>How to Play:</strong> 
            Roll the dice, then click one of your pawns to move it. 
            Or click an empty path cell to place a barricade (${this.MAX_BARRICADES} each). 
            Block your opponent and reach the finish first!
        `;
    },

    cleanup: function() {
        console.log('Barricade cleanup');
        this.isGameActive = false;
        if (this.clickHandler) {
            this.canvas.removeEventListener('click', this.clickHandler);
            this.clickHandler = null;
        }
        if (App.conn) App.conn.close();
    },

    // ---------- UI SETUP ----------
    setupUI: function() {
        // Repurpose the HUD elements for the board game
        const hpEl = document.getElementById('b-core-hp');
        const moneyEl = document.getElementById('b-money');
        const waveEl = document.getElementById('b-wave');
        const scoreEl = document.getElementById('b-score');

        // Add a "Roll Dice" button if not already present
        let rollBtn = document.getElementById('b-roll-btn');
        if (!rollBtn) {
            const hud = document.querySelector('.barricade-hud');
            if (hud) {
                const div = document.createElement('div');
                div.className = 'hud-item';
                div.innerHTML = `<button class="btn" id="b-roll-btn" onclick="Barricade.rollDice()">🎲 Roll Dice</button>`;
                hud.appendChild(div);
            }
        }

        // Update labels
        if (hpEl) hpEl.parentElement.innerHTML = `👤 Turn: <span id="b-core-hp">Player 1</span>`;
        if (moneyEl) moneyEl.parentElement.innerHTML = `🎲 Dice: <span id="b-money">0</span>`;
        if (waveEl) waveEl.parentElement.innerHTML = `🧱 Barricades: <span id="b-wave">3</span>`;
        if (scoreEl) scoreEl.parentElement.innerHTML = `🏁 Pawns Home: <span id="b-score">0</span>`;
    },

    // ---------- RENDER ----------
    render: function() {
        const ctx = this.ctx;
        const size = this.CELL_SIZE;
        const grid = this.GRID_SIZE;

        ctx.clearRect(0, 0, 600, 600);

        // Draw grid background
        for (let r = 0; r < grid; r++) {
            for (let c = 0; c < grid; c++) {
                ctx.fillStyle = '#1a2a4a';
                ctx.fillRect(c * size, r * size, size, size);
                ctx.strokeStyle = '#2a3a5a';
                ctx.lineWidth = 0.5;
                ctx.strokeRect(c * size, r * size, size, size);
            }
        }

        // Draw path cells
        this.path.forEach((cell, idx) => {
            const x = cell.c * size;
            const y = cell.r * size;
            ctx.fillStyle = '#2a5a7a';
            ctx.fillRect(x, y, size, size);
            ctx.strokeStyle = '#4a8aba';
            ctx.lineWidth = 2;
            ctx.strokeRect(x, y, size, size);

            // Mark finish
            if (idx === this.path.length - 1) {
                ctx.fillStyle = 'rgba(255, 215, 0, 0.3)';
                ctx.fillRect(x, y, size, size);
                ctx.fillStyle = '#ffd700';
                ctx.font = 'bold 20px sans-serif';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText('🏆', x + size/2, y + size/2);
            }

            // Draw barricades on path
            if (this.barricadesOnPath.includes(idx)) {
                ctx.fillStyle = '#ef4444';
                ctx.fillRect(x + 5, y + 5, size - 10, size - 10);
                ctx.fillStyle = '#ffffff';
                ctx.font = 'bold 16px sans-serif';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText('🧱', x + size/2, y + size/2);
            }
        });

        // Draw pawns
        const colors = ['#3b82f6', '#22c55e'];
        const labels = ['P1', 'P2'];
        this.players.forEach((player, pIdx) => {
            const pawnsOnCell = {};
            player.pawns.forEach((pos, pawnIdx) => {
                if (pos >= this.path.length) return;
                const key = pos;
                if (!pawnsOnCell[key]) pawnsOnCell[key] = [];
                pawnsOnCell[key].push(pawnIdx);
            });

            for (const [posStr, pawnIndices] of Object.entries(pawnsOnCell)) {
                const pos = parseInt(posStr);
                const cell = this.path[pos];
                if (!cell) continue;
                const x = cell.c * size;
                const y = cell.r * size;
                const count = pawnIndices.length;
                const color = colors[pIdx];

                pawnIndices.forEach((pawnIdx, idx) => {
                    const offsetX = (idx - (count - 1) / 2) * 12;
                    const offsetY = (pIdx === 0 ? -1 : 1) * 8;
                    const cx = x + size/2 + offsetX;
                    const cy = y + size/2 + offsetY;

                    ctx.beginPath();
                    ctx.arc(cx, cy, 12, 0, 2 * Math.PI);
                    ctx.fillStyle = color;
                    ctx.fill();
                    ctx.strokeStyle = '#ffffff';
                    ctx.lineWidth = 2;
                    ctx.stroke();

                    // Pawn number
                    ctx.fillStyle = '#ffffff';
                    ctx.font = 'bold 10px sans-serif';
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.fillText(pawnIdx + 1, cx, cy);
                });
            }
        });

        // Highlight current player's turn
        ctx.fillStyle = 'rgba(255,255,255,0.1)';
        const p = this.currentPlayer;
        const label = p === 0 ? '🔵 Player 1' : '🟢 Player 2';
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 14px sans-serif';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        ctx.fillText(`Turn: ${label}`, 10, 10);

        // Show dice value if rolled
        if (this.hasRolled && this.diceValue > 0) {
            ctx.fillStyle = '#fbbf24';
            ctx.font = 'bold 24px sans-serif';
            ctx.textAlign = 'right';
            ctx.textBaseline = 'top';
            ctx.fillText(`🎲 ${this.diceValue}`, 590, 10);
        }

        // Show selected pawn highlight
        if (this.selectedPawn !== -1) {
            const pIdx = this.currentPlayer;
            const pos = this.players[pIdx].pawns[this.selectedPawn];
            if (pos < this.path.length) {
                const cell = this.path[pos];
                const x = cell.c * size;
                const y = cell.r * size;
                ctx.strokeStyle = '#fbbf24';
                ctx.lineWidth = 4;
                ctx.strokeRect(x + 2, y + 2, size - 4, size - 4);
            }
        }
    },

    // ---------- CLICK HANDLING ----------
    handleClick: function(e) {
        if (!this.isGameActive) return;

        const rect = this.canvas.getBoundingClientRect();
        const scaleX = this.canvas.width / rect.width;
        const scaleY = this.canvas.height / rect.height;

        const mouseX = (e.clientX - rect.left) * scaleX;
        const mouseY = (e.clientY - rect.top) * scaleY;

        const col = Math.floor(mouseX / this.CELL_SIZE);
        const row = Math.floor(mouseY / this.CELL_SIZE);

        // Find which path cell was clicked (if any)
        let clickedPathIndex = -1;
        for (let i = 0; i < this.path.length; i++) {
            if (this.path[i].r === row && this.path[i].c === col) {
                clickedPathIndex = i;
                break;
            }
        }
        if (clickedPathIndex === -1) return;

        const player = this.players[this.currentPlayer];

        // If dice has been rolled, clicking a pawn moves it
        if (this.hasRolled && this.diceValue > 0) {
            // Check if any of current player's pawns are on this cell
            let pawnIdx = -1;
            for (let i = 0; i < player.pawns.length; i++) {
                if (player.pawns[i] === clickedPathIndex) {
                    pawnIdx = i;
                    break;
                }
            }
            if (pawnIdx !== -1) {
                this.movePawn(pawnIdx);
                return;
            } else {
                // Clicked on empty path cell -> place barricade if available
                if (player.barricadesLeft > 0 && !this.barricadesOnPath.includes(clickedPathIndex)) {
                    // Check if any pawn is on this cell
                    let occupied = false;
                    for (let p = 0; p < this.players.length; p++) {
                        if (this.players[p].pawns.includes(clickedPathIndex)) {
                            occupied = true;
                            break;
                        }
                    }
                    if (!occupied) {
                        this.placeBarricade(clickedPathIndex);
                        return;
                    }
                }
                // Clicked on a cell with opponent's pawn or barricade -> do nothing
                return;
            }
        }

        // If dice not rolled, clicking on a pawn selects it? 
        // Actually we want to select after rolling. We'll just ignore clicks before roll.
        // Show message to roll first.
        this.showStatus('Roll the dice first!', '#fbbf24');
    },

    // ---------- DICE ----------
    rollDice: function() {
        if (!this.isGameActive) return;
        if (this.hasRolled) {
            this.showStatus('You already rolled! Click a pawn to move.', '#fbbf24');
            return;
        }

        this.diceValue = Math.floor(Math.random() * 6) + 1;
        this.hasRolled = true;
        this.selectedPawn = -1;
        this.updateHUD();
        this.render();
        this.showStatus(`Rolled ${this.diceValue}! Click a pawn to move it.`, '#22c55e');

        // Check if any pawn can move (if all pawns are at finish or cannot move due to barricades)
        const player = this.players[this.currentPlayer];
        let canMove = false;
        for (let i = 0; i < player.pawns.length; i++) {
            if (this.canMovePawn(i)) {
                canMove = true;
                break;
            }
        }
        if (!canMove) {
            this.showStatus('No pawn can move! Turn passes.', '#ef4444');
            setTimeout(() => this.endTurn(), 1000);
        }
    },

    // ---------- MOVE LOGIC ----------
    canMovePawn: function(pawnIdx) {
        const player = this.players[this.currentPlayer];
        const pos = player.pawns[pawnIdx];
        const target = pos + this.diceValue;
        if (target >= this.path.length) return false; // Can't overshoot finish
        // Check if path to target is blocked by barricades
        for (let i = pos + 1; i <= target; i++) {
            if (this.barricadesOnPath.includes(i)) {
                // Can't pass a barricade, but can land on it
                if (i === target) return true; // Can capture it
                return false;
            }
        }
        return true;
    },

    movePawn: function(pawnIdx) {
        if (!this.isGameActive) return;
        if (!this.hasRolled || this.diceValue === 0) {
            this.showStatus('Roll the dice first!', '#fbbf24');
            return;
        }

        const player = this.players[this.currentPlayer];
        const pos = player.pawns[pawnIdx];
        const target = pos + this.diceValue;

        if (target >= this.path.length) {
            this.showStatus('Can\'t overshoot the finish!', '#ef4444');
            return;
        }

        // Check for barricades in the way
        for (let i = pos + 1; i <= target; i++) {
            if (this.barricadesOnPath.includes(i)) {
                if (i === target) {
                    // Land on barricade -> capture it
                    this.barricadesOnPath = this.barricadesOnPath.filter(idx => idx !== i);
                    this.showStatus('Barricade captured!', '#22c55e');
                } else {
                    this.showStatus('Path blocked by a barricade!', '#ef4444');
                    return;
                }
            }
        }

        // Move the pawn
        player.pawns[pawnIdx] = target;

        // Check if landing on opponent's pawn -> send it home
        const opponentIdx = 1 - this.currentPlayer;
        const opponent = this.players[opponentIdx];
        for (let i = 0; i < opponent.pawns.length; i++) {
            if (opponent.pawns[i] === target) {
                opponent.pawns[i] = 0;
                this.showStatus('Opponent pawn sent home!', '#fbbf24');
                break;
            }
        }

        // Check win
        if (target === this.path.length - 1) {
            this.isGameActive = false;
            const winner = this.currentPlayer === 0 ? 'Player 1 (Blue)' : 'Player 2 (Green)';
            this.showStatus(`🏆 ${winner} wins the game! 🏆`, '#ffd700');
            document.getElementById('b-msg-title').innerText = '🏆 Game Over';
            document.getElementById('b-msg-text').innerText = `${winner} wins!`;
            document.getElementById('barricade-message').classList.remove('hidden');
            this.render();
            return;
        }

        // End turn
        this.endTurn();
    },

    // ---------- BARRICADE PLACEMENT ----------
    placeBarricade: function(pathIndex) {
        if (!this.isGameActive) return;
        const player = this.players[this.currentPlayer];
        if (player.barricadesLeft <= 0) {
            this.showStatus('No barricades left!', '#ef4444');
            return;
        }
        if (this.barricadesOnPath.includes(pathIndex)) {
            this.showStatus('Barricade already there!', '#ef4444');
            return;
        }
        // Check if any pawn is on that cell
        for (let p = 0; p < this.players.length; p++) {
            if (this.players[p].pawns.includes(pathIndex)) {
                this.showStatus('Can\'t place on a pawn!', '#ef4444');
                return;
            }
        }

        this.barricadesOnPath.push(pathIndex);
        player.barricadesLeft--;
        this.updateHUD();
        this.render();
        this.showStatus('Barricade placed!', '#22c55e');

        // End turn after placing
        this.endTurn();
    },

    // ---------- TURN MANAGEMENT ----------
    endTurn: function() {
        this.hasRolled = false;
        this.diceValue = 0;
        this.selectedPawn = -1;
        // Switch player
        this.currentPlayer = 1 - this.currentPlayer;
        this.updateHUD();
        this.render();
        this.showStatus(`Player ${this.currentPlayer === 0 ? '1 (Blue)' : '2 (Green)'}'s turn`, '#ffffff');
    },

    // ---------- UI HELPERS ----------
    showStatus: function(msg, color = '#ffffff') {
        const el = document.getElementById('b-wave');
        if (el) {
            el.style.color = color || '#ffffff';
            el.innerText = msg;
        }
    },

    updateHUD: function() {
        const p = this.currentPlayer;
        const player = this.players[p];
        const opponent = this.players[1 - p];

        document.getElementById('b-core-hp').innerText = p === 0 ? '🔵 Player 1' : '🟢 Player 2';
        document.getElementById('b-money').innerText = this.hasRolled ? this.diceValue : '─';
        document.getElementById('b-wave').innerText = player.barricadesLeft;
        // Count pawns at finish
        let home = 0;
        const finish = this.path.length - 1;
        for (let i = 0; i < player.pawns.length; i++) {
            if (player.pawns[i] === finish) home++;
        }
        document.getElementById('b-score').innerText = home;

        // Update roll button text
        const rollBtn = document.getElementById('b-roll-btn');
        if (rollBtn) {
            rollBtn.innerText = this.hasRolled ? '🎲 Rolled!' : '🎲 Roll Dice';
            rollBtn.disabled = this.hasRolled || !this.isGameActive;
        }
    },

    // ---------- RESET (called from App) ----------
    resetBoard: function() {
        this.start();
    }
};
