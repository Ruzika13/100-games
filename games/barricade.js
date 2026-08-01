const Barricade = {
    canvas: null,
    ctx: null,
    isRunning: false,
    keyHandler: null,
    clickHandler: null,
    timerInterval: null,

    // Game Constants
    GRID_SIZE: 10,
    TILE_SIZE: 50,
    
    // Game State
    player: { x: 0, y: 9 }, // Bottom-left
    ai: { x: 9, y: 0 },     // Top-right
    barricades: [],
    score: 0,
    barricadesPlaced: 0,
    timeSurvived: 0,
    isPlayerTurn: true,
    aiPath: [],

    init: function() {
        this.canvas = document.getElementById('barricade-canvas');
        this.ctx = this.canvas.getContext('2d');
        this.start();
    },

    start: function() {
        this.cleanup();
        this.player = { x: 0, y: 9 };
        this.ai = { x: 9, y: 0 };
        this.barricades = [];
        this.score = 0;
        this.barricadesPlaced = 0;
        this.timeSurvived = 0;
        this.isPlayerTurn = true;
        this.isRunning = true;
        
        document.getElementById('barricade-message').classList.add('hidden');
        this.updateUI();
        this.draw();

        // Bind event listeners
        this.keyHandler = this.handleKey.bind(this);
        this.clickHandler = this.handleClick.bind(this);
        window.addEventListener('keydown', this.keyHandler);
        this.canvas.addEventListener('mousedown', this.clickHandler);

        // Start timer
        this.timerInterval = setInterval(() => {
            if (this.isRunning && !this.isPlayerTurn) { // Only count time when AI is thinking/moving
                this.timeSurvived++;
                this.updateUI();
            }
        }, 1000);

        this.calculateAIPath();
    },

    cleanup: function() {
        this.isRunning = false;
        if (this.timerInterval) clearInterval(this.timerInterval);
        if (this.keyHandler) window.removeEventListener('keydown', this.keyHandler);
        if (this.clickHandler && this.canvas) this.canvas.removeEventListener('mousedown', this.clickHandler);
    },

    updateUI: function() {
        document.getElementById('b-score').innerText = this.score;
        document.getElementById('b-walls').innerText = this.barricadesPlaced;
        document.getElementById('b-time').innerText = this.timeSurvived;
        
        const turnEl = document.getElementById('b-turn-indicator');
        if (this.isPlayerTurn) {
            turnEl.innerText = "Your Turn";
            turnEl.style.color = '#3b82f6';
        } else {
            turnEl.innerText = "AI Thinking...";
            turnEl.style.color = '#ef4444';
        }
    },

    // --- INPUT HANDLING ---
    handleKey: function(e) {
        if (!this.isRunning || !this.isPlayerTurn) return;
        
        let dx = 0, dy = 0;
        if (e.key === 'ArrowUp') dy = -1;
        else if (e.key === 'ArrowDown') dy = 1;
        else if (e.key === 'ArrowLeft') dx = -1;
        else if (e.key === 'ArrowRight') dx = 1;
        else return;

        e.preventDefault(); // Prevent scrolling
        this.playerMove(dx, dy);
    },

    handleClick: function(e) {
        if (!this.isRunning || !this.isPlayerTurn) return;
        
        const rect = this.canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        const gridX = Math.floor(mouseX / this.TILE_SIZE);
        const gridY = Math.floor(mouseY / this.TILE_SIZE);

        if (gridX < 0 || gridX >= this.GRID_SIZE || gridY < 0 || gridY >= this.GRID_SIZE) return;
        
        // Can't place barricade on player, AI, or existing barricade
        if (gridX === this.player.x && gridY === this.player.y) return;
        if (gridX === this.ai.x && gridY === this.ai.y) return;
        if (this.barricades.some(b => b.x === gridX && b.y === gridY)) return;

        this.placeBarricade(gridX, gridY);
    },

    // --- GAME LOGIC ---
    playerMove: function(dx, dy) {
        const newX = this.player.x + dx;
        const newY = this.player.y + dy;

        // Bounds check
        if (newX < 0 || newX >= this.GRID_SIZE || newY < 0 || newY >= this.GRID_SIZE) return;
        // Barricade check
        if (this.barricades.some(b => b.x === newX && b.y === newY)) return;

        this.player.x = newX;
        this.player.y = newY;
        this.score += 10; // Points for surviving a turn
        this.endPlayerTurn();
    },

    placeBarricade: function(x, y) {
        this.barricades.push({ x, y });
        this.barricadesPlaced++;
        this.score += 50; // Points for strategic placement
        this.endPlayerTurn();
    },

    endPlayerTurn: function() {
        this.isPlayerTurn = false;
        this.updateUI();
        this.draw();
        
        // AI takes turn after a short delay for visual pacing
        setTimeout(() => this.aiTurn(), 400);
    },

    aiTurn: function() {
        if (!this.isRunning) return;

        // Check if AI is trapped (Win Condition)
        if (this.aiPath.length === 0) {
            this.endGame(true);
            return;
        }

        // Move AI along the calculated path
        const nextStep = this.aiPath[0];
        this.ai.x = nextStep.x;
        this.ai.y = nextStep.y;

        // Check if AI caught player (Lose Condition)
        if (this.ai.x === this.player.x && this.ai.y === this.player.y) {
            this.endGame(false);
            return;
        }

        // Recalculate path for next turn
        this.calculateAIPath();
        
        this.isPlayerTurn = true;
        this.updateUI();
        this.draw();
    },

    // --- A* PATHFINDING ALGORITHM ---
    calculateAIPath: function() {
        const start = { x: this.ai.x, y: this.ai.y };
        const end = { x: this.player.x, y: this.player.y };
        
        const openSet = [];
        const closedSet = new Set();
        const cameFrom = new Map();
        const gScore = new Map();
        const fScore = new Map();

        const startKey = `${start.x},${start.y}`;
        const endKey = `${end.x},${end.y}`;

        openSet.push(start);
        gScore.set(startKey, 0);
        fScore.set(startKey, this.heuristic(start, end));

        while (openSet.length > 0) {
            // Get node with lowest fScore
            openSet.sort((a, b) => fScore.get(`${a.x},${a.y}`) - fScore.get(`${b.x},${b.y}`));
            const current = openSet.shift();
            const currentKey = `${current.x},${current.y}`;

            if (currentKey === endKey) {
                this.reconstructPath(cameFrom, current);
                return;
            }

            closedSet.add(currentKey);

            const neighbors = [
                { x: current.x + 1, y: current.y },
                { x: current.x - 1, y: current.y },
                { x: current.x, y: current.y + 1 },
                { x: current.x, y: current.y - 1 }
            ];

            for (let neighbor of neighbors) {
                const nKey = `${neighbor.x},${neighbor.y}`;
                
                // Bounds check
                if (neighbor.x < 0 || neighbor.x >= this.GRID_SIZE || neighbor.y < 0 || neighbor.y >= this.GRID_SIZE) continue;
                // Obstacle check (Barricades)
                if (this.barricades.some(b => b.x === neighbor.x && b.y === neighbor.y)) continue;
                if (closedSet.has(nKey)) continue;

                const tentativeGScore = gScore.get(currentKey) + 1;

                if (!gScore.has(nKey) || tentativeGScore < gScore.get(nKey)) {
                    cameFrom.set(nKey, current);
                    gScore.set(nKey, tentativeGScore);
                    fScore.set(nKey, tentativeGScore + this.heuristic(neighbor, end));
                    
                    if (!openSet.some(n => n.x === neighbor.x && n.y === neighbor.y)) {
                        openSet.push(neighbor);
                    }
                }
            }
        }
        
        // No path found (AI is trapped)
        this.aiPath = [];
    },

    heuristic: function(a, b) {
        return Math.abs(a.x - b.x) + Math.abs(a.y - b.y); // Manhattan distance
    },

    reconstructPath: function(cameFrom, current) {
        const path = [];
        let currKey = `${current.x},${current.y}`;
        while (cameFrom.has(currKey)) {
            current = cameFrom.get(currKey);
            path.unshift({ x: current.x, y: current.y });
            currKey = `${current.x},${current.y}`;
        }
        this.aiPath = path;
    },

    // --- RENDERING ---
    draw: function() {
        const ctx = this.ctx;
        ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // Draw Grid
        ctx.strokeStyle = '#1e293b';
        ctx.lineWidth = 1;
        for (let i = 0; i <= this.GRID_SIZE; i++) {
            ctx.beginPath(); ctx.moveTo(i * this.TILE_SIZE, 0); ctx.lineTo(i * this.TILE_SIZE, this.canvas.height); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(0, i * this.TILE_SIZE); ctx.lineTo(this.canvas.width, i * this.TILE_SIZE); ctx.stroke();
        }

        // Draw AI Path (Faint red line)
        if (this.aiPath.length > 0) {
            ctx.strokeStyle = 'rgba(239, 68, 68, 0.3)';
            ctx.lineWidth = 4;
            ctx.beginPath();
            ctx.moveTo(this.ai.x * this.TILE_SIZE + this.TILE_SIZE/2, this.ai.y * this.TILE_SIZE + this.TILE_SIZE/2);
            for (let p of this.aiPath) {
                ctx.lineTo(p.x * this.TILE_SIZE + this.TILE_SIZE/2, p.y * this.TILE_SIZE + this.TILE_SIZE/2);
            }
            ctx.stroke();
        }

        // Draw Barricades
        ctx.fillStyle = '#64748b';
        this.barricades.forEach(b => {
            ctx.fillRect(b.x * this.TILE_SIZE + 4, b.y * this.TILE_SIZE + 4, this.TILE_SIZE - 8, this.TILE_SIZE - 8);
        });

        // Draw Player
        ctx.fillStyle = '#3b82f6';
        ctx.shadowBlur = 10; ctx.shadowColor = '#3b82f6';
        ctx.beginPath();
        ctx.arc(this.player.x * this.TILE_SIZE + this.TILE_SIZE/2, this.player.y * this.TILE_SIZE + this.TILE_SIZE/2, this.TILE_SIZE/3, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;

        // Draw AI
        ctx.fillStyle = '#ef4444';
        ctx.shadowBlur = 10; ctx.shadowColor = '#ef4444';
        ctx.beginPath();
        ctx.arc(this.ai.x * this.TILE_SIZE + this.TILE_SIZE/2, this.ai.y * this.TILE_SIZE + this.TILE_SIZE/2, this.TILE_SIZE/3, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
    },

    endGame: function(won) {
        this.isRunning = false;
        clearInterval(this.timerInterval);
        
        const msgBox = document.getElementById('barricade-message');
        msgBox.classList.remove('hidden');
        document.getElementById('b-msg-title').innerText = won ? "🏆 You Win!" : "💀 Game Over";
        document.getElementById('b-msg-title').style.color = won ? '#22c55e' : '#ef4444';
        document.getElementById('b-msg-text').innerText = won 
            ? `You trapped the AI! Score: ${this.score} | Time: ${this.timeSurvived}s` 
            : `The AI caught you! Score: ${this.score} | Time: ${this.timeSurvived}s`;
    }
};
