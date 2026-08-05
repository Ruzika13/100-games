const Gomoku = {
    SIZE: 15,
    board: [],
    currentPlayer: 1, // 1 = Black, 2 = White
    gameMode: 'local',
    isGameActive: false,
    myOnlineSymbol: 1,
    isProcessingMove: false,

    // ---------- INIT ----------
    init: function() {
        this.board = Array(this.SIZE).fill(null).map(() => Array(this.SIZE).fill(0));
        this.currentPlayer = 1;
        this.isGameActive = false;
        this.isProcessingMove = false;
        this.renderBoard();
        document.getElementById('gomoku-status-text').innerText = "Choose a mode to start";
        document.getElementById('gomoku-status-text').style.color = 'var(--text)';
        document.getElementById('gomoku-online-menu').classList.add('hidden');
    },

    // ---------- START ----------
    start: function(mode) {
        this.gameMode = mode;
        this.isProcessingMove = false;
        document.getElementById('gomoku-online-menu').classList.add('hidden');
        this.resetBoard(true);

        if (mode === 'online-host') {
            this.myOnlineSymbol = 1; // Black
            document.getElementById('gomoku-status-text').innerText = "You are Black (Host). Waiting for opponent...";
            document.getElementById('gomoku-status-text').style.color = 'var(--text)';
        } else if (mode === 'online-join') {
            this.myOnlineSymbol = 2; // White
            document.getElementById('gomoku-status-text').innerText = "You are White (Joiner). Waiting for host to start...";
            document.getElementById('gomoku-status-text').style.color = 'var(--text)';
        } else {
            this.myOnlineSymbol = 1;
            let modeText = mode.replace('ai-', 'vs AI (').replace('local', 'Local 2-Player') + (mode.includes('ai') ? ')' : '');
            document.getElementById('gomoku-status-text').innerText = `Mode: ${modeText} | Black's Turn`;
            document.getElementById('gomoku-status-text').style.color = 'var(--text)';
        }
    },

    // ---------- ONLINE MENU ----------
    showOnlineMenu: function() {
        document.getElementById('gomoku-online-menu').classList.remove('hidden');
        document.getElementById('gomoku-status-text').innerText = "Online Multiplayer Setup";
    },

    // ---------- RESET ----------
    resetBoard: function(fromRemote = false) {
        this.board = Array(this.SIZE).fill(null).map(() => Array(this.SIZE).fill(0));
        this.currentPlayer = 1;
        this.isGameActive = true;
        this.isProcessingMove = false;
        this.renderBoard();

        if (!this.gameMode.includes('online')) {
            document.getElementById('gomoku-status-text').innerText = "Black's Turn";
            document.getElementById('gomoku-status-text').style.color = 'var(--text)';
        } else {
            if (this.gameMode === 'online-host' && this.myOnlineSymbol === 1) {
                document.getElementById('gomoku-status-text').innerText = "Your Turn (Black)";
            } else if (this.gameMode === 'online-join' && this.myOnlineSymbol === 2) {
                document.getElementById('gomoku-status-text').innerText = "Waiting for host (Black)...";
            }
        }

        if (!fromRemote && this.gameMode.includes('online')) {
            App.broadcastRestart();
        }
    },

    // ---------- CLEANUP ----------
    cleanup: function() {
        this.isGameActive = false;
        this.isProcessingMove = false;
    },

    // ---------- RENDER BOARD ----------
    renderBoard: function() {
        const boardEl = document.getElementById('gomoku-board');
        boardEl.innerHTML = '';
        boardEl.style.gridTemplateColumns = `repeat(${this.SIZE}, 1fr)`;

        for (let r = 0; r < this.SIZE; r++) {
            for (let c = 0; c < this.SIZE; c++) {
                const cell = document.createElement('div');
                cell.className = 'gomoku-cell';
                const val = this.board[r][c];
                if (val === 1) cell.classList.add('black');
                else if (val === 2) cell.classList.add('white');
                cell.dataset.row = r;
                cell.dataset.col = c;
                cell.addEventListener('click', () => this.handleCellClick(r, c));
                boardEl.appendChild(cell);
            }
        }
    },

    // ---------- CLICK HANDLER ----------
    handleCellClick: function(row, col) {
        if (this.isProcessingMove) return;
        if (!this.isGameActive) return;
        if (this.gameMode.includes('online') && this.currentPlayer !== this.myOnlineSymbol) return;
        if (this.board[row][col] !== 0) return;

        this.isProcessingMove = true;
        this.makeMove(row, col, this.currentPlayer, true);
    },

    // ---------- MAKE MOVE ----------
    makeMove: function(row, col, player, shouldBroadcast) {
        this.board[row][col] = player;
        this.renderBoard();

        if (shouldBroadcast && this.gameMode.includes('online')) {
            App.broadcastMove({ type: 'move', row: row, col: col, player: player });
        }

        if (this.checkWin(row, col, player)) {
            this.isGameActive = false;
            this.isProcessingMove = false;
            const winner = player === 1 ? "Black" : "White";
            document.getElementById('gomoku-status-text').innerText = `🏆 ${winner} Wins!`;
            document.getElementById('gomoku-status-text').style.color = 'var(--win)';
            return;
        }

        // Check draw (board full)
        let empty = false;
        for (let r = 0; r < this.SIZE; r++) {
            for (let c = 0; c < this.SIZE; c++) {
                if (this.board[r][c] === 0) empty = true;
            }
        }
        if (!empty) {
            this.isGameActive = false;
            this.isProcessingMove = false;
            document.getElementById('gomoku-status-text').innerText = `🤝 It's a Draw!`;
            document.getElementById('gomoku-status-text').style.color = '#fbbf24';
            return;
        }

        this.currentPlayer = this.currentPlayer === 1 ? 2 : 1;

        if (!this.gameMode.includes('online')) {
            document.getElementById('gomoku-status-text').innerText = this.currentPlayer === 1 ? "Black's Turn" : "White's Turn";
            document.getElementById('gomoku-status-text').style.color = 'var(--text)';
        } else {
            if (this.currentPlayer === this.myOnlineSymbol) {
                document.getElementById('gomoku-status-text').innerText = "Your Turn!";
                document.getElementById('gomoku-status-text').style.color = 'var(--text)';
            } else {
                document.getElementById('gomoku-status-text').innerText = "Opponent's Turn...";
                document.getElementById('gomoku-status-text').style.color = '#94a3b8';
            }
        }

        if (!this.gameMode.startsWith('ai')) {
            this.isProcessingMove = false;
        }

        if (this.gameMode.startsWith('ai') && this.currentPlayer === 2 && this.isGameActive) {
            setTimeout(() => {
                this.makeAIMove();
            }, 400);
        } else {
            if (this.gameMode.startsWith('ai') && this.currentPlayer === 1) {
                this.isProcessingMove = false;
            }
        }
    },

    // ---------- WIN CHECK ----------
    checkWin: function(row, col, player) {
        const directions = [[1,0],[0,1],[1,1],[1,-1]];
        for (let [dr, dc] of directions) {
            let count = 1;
            // Forward
            for (let i = 1; i < 5; i++) {
                const r = row + dr * i, c = col + dc * i;
                if (r < 0 || r >= this.SIZE || c < 0 || c >= this.SIZE) break;
                if (this.board[r][c] === player) count++;
                else break;
            }
            // Backward
            for (let i = 1; i < 5; i++) {
                const r = row - dr * i, c = col - dc * i;
                if (r < 0 || r >= this.SIZE || c < 0 || c >= this.SIZE) break;
                if (this.board[r][c] === player) count++;
                else break;
            }
            if (count >= 5) return true;
        }
        return false;
    },

    // ---------- AI ----------
    makeAIMove: function() {
        if (!this.isGameActive || !this.gameMode.startsWith('ai')) {
            this.isProcessingMove = false;
            return;
        }

        const validMoves = [];
        for (let r = 0; r < this.SIZE; r++) {
            for (let c = 0; c < this.SIZE; c++) {
                if (this.board[r][c] === 0) validMoves.push({ row: r, col: c });
            }
        }
        if (validMoves.length === 0) {
            this.isProcessingMove = false;
            return;
        }

        let move;
        if (this.gameMode === 'ai-easy') {
            // Random
            move = validMoves[Math.floor(Math.random() * validMoves.length)];
        } else if (this.gameMode === 'ai-hard') {
            // Greedy: score each move
            let bestScore = -1;
            for (let m of validMoves) {
                let score = this.evaluateMove(m.row, m.col, 2);
                if (score > bestScore) {
                    bestScore = score;
                    move = m;
                }
            }
        } else { // Extreme
            // Simple minimax (depth 2) – can be improved
            let bestScore = -Infinity;
            for (let m of validMoves) {
                const score = this.minimax(m.row, m.col, 2, 2, false);
                if (score > bestScore) {
                    bestScore = score;
                    move = m;
                }
            }
        }

        this.isProcessingMove = false;
        if (move) {
            this.makeMove(move.row, move.col, 2, false);
        } else {
            this.isProcessingMove = false;
        }
    },

    evaluateMove: function(row, col, player) {
        // Simple heuristic: count potential lines
        let score = 0;
        const directions = [[1,0],[0,1],[1,1],[1,-1]];
        for (let [dr, dc] of directions) {
            let count = 0;
            let openLeft = 0, openRight = 0;
            // Forward
            for (let i = 1; i < 5; i++) {
                const r = row + dr * i, c = col + dc * i;
                if (r < 0 || r >= this.SIZE || c < 0 || c >= this.SIZE) { openRight = 0; break; }
                if (this.board[r][c] === player) count++;
                else if (this.board[r][c] === 0) { openRight++; break; }
                else break;
            }
            // Backward
            for (let i = 1; i < 5; i++) {
                const r = row - dr * i, c = col - dc * i;
                if (r < 0 || r >= this.SIZE || c < 0 || c >= this.SIZE) { openLeft = 0; break; }
                if (this.board[r][c] === player) count++;
                else if (this.board[r][c] === 0) { openLeft++; break; }
                else break;
            }
            // Weight based on count and open ends
            if (count >= 4) score += 100000;
            else if (count === 3 && (openLeft + openRight) >= 2) score += 1000;
            else if (count === 3) score += 100;
            else if (count === 2 && (openLeft + openRight) >= 2) score += 10;
            else score += count;
        }
        return score;
    },

    minimax: function(row, col, depth, player, isMaximizing) {
        // Simple placeholder – real minimax would need full board simulation
        // For now, just use heuristic
        return this.evaluateMove(row, col, player);
    }
};
