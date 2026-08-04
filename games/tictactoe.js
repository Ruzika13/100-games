const TicTacToe = {
    board: Array(9).fill(null),
    currentPlayer: 'X',
    gameMode: 'local',
    isGameActive: false,
    myOnlineSymbol: 'X',
    isProcessingMove: false, // Locks UI during AI turn

    // --- INIT: called when switching to Tic‑Tac‑Toe view ---
    init: function() {
        this.board = Array(9).fill(null);
        this.currentPlayer = 'X';
        this.isGameActive = false;
        this.isProcessingMove = false;
        this.gameMode = '';
        this.renderBoard();
        document.getElementById('status-text').innerText = "Choose a mode to start";
        document.getElementById('status-text').style.color = 'var(--text)';
        document.getElementById('online-menu').classList.add('hidden');
    },

    // --- START: begins a game with a given mode ---
    start: function(mode) {
        this.gameMode = mode;
        this.isProcessingMove = false;
        document.getElementById('online-menu').classList.add('hidden');
        this.resetBoard(true); // true = fromRemote, prevents broadcast on init

        if (mode === 'online-host') {
            this.myOnlineSymbol = 'X';
            document.getElementById('status-text').innerText = "You are X (Host). Waiting for opponent...";
            document.getElementById('status-text').style.color = 'var(--text)';
        } else if (mode === 'online-join') {
            this.myOnlineSymbol = 'O';
            document.getElementById('status-text').innerText = "You are O (Joiner). Waiting for host to start...";
            document.getElementById('status-text').style.color = 'var(--text)';
        } else {
            this.myOnlineSymbol = 'X'; // not used for non-online
            let modeText = mode.replace('ai-', 'vs AI (').replace('local', 'Local 2-Player') + (mode.includes('ai') ? ')' : '');
            document.getElementById('status-text').innerText = `Mode: ${modeText} | Player X's Turn`;
            document.getElementById('status-text').style.color = 'var(--text)';
        }
    },

    // --- ONLINE MENU: shows the online panel ---
    showOnlineMenu: function() {
        document.getElementById('online-menu').classList.remove('hidden');
        document.getElementById('status-text').innerText = "Online Multiplayer Setup";
    },

    // --- RESET: clears board, accepts `fromRemote` to prevent broadcast loop ---
    resetBoard: function(fromRemote = false) {
        this.board = Array(9).fill(null);
        this.currentPlayer = 'X';
        this.isGameActive = true;
        this.isProcessingMove = false;
        this.renderBoard();

        if (!this.gameMode.includes('online')) {
            document.getElementById('status-text').innerText = `Player ${this.currentPlayer}'s Turn`;
            document.getElementById('status-text').style.color = 'var(--text)';
        } else {
            if (this.gameMode === 'online-host' && this.myOnlineSymbol === 'X') {
                document.getElementById('status-text').innerText = "Your Turn (X)";
            } else if (this.gameMode === 'online-join' && this.myOnlineSymbol === 'O') {
                document.getElementById('status-text').innerText = "Waiting for host (X)...";
            }
        }

        // Broadcast restart only if NOT triggered by remote
        if (!fromRemote && this.gameMode.includes('online')) {
            App.broadcastRestart();
        }
    },

    // --- CLEANUP: called when switching away from this game ---
    cleanup: function() {
        this.isGameActive = false;
        this.isProcessingMove = false;
        // Do NOT close the global connection – it's managed by App
    },

    // --- RENDER: draws the board ---
    renderBoard: function() {
        const boardEl = document.getElementById('board');
        boardEl.innerHTML = '';
        this.board.forEach((cell, index) => {
            const cellEl = document.createElement('div');
            cellEl.className = `cell ${cell ? cell.toLowerCase() : ''}`;
            cellEl.innerText = cell || '';
            cellEl.onclick = () => this.handleCellClick(index);
            boardEl.appendChild(cellEl);
        });
    },

    // --- CLICK HANDLER: locks if AI is processing ---
    handleCellClick: function(index) {
        if (this.isProcessingMove) return;
        if (!this.isGameActive || this.board[index]) return;
        if (this.gameMode.includes('online') && this.currentPlayer !== this.myOnlineSymbol) return;
        this.makeMove(index, this.currentPlayer, true);
    },

    // --- MAKE MOVE: updates board, checks win/draw, broadcasts if online ---
    makeMove: function(index, player, shouldBroadcast) {
        this.board[index] = player;
        this.renderBoard();

        if (shouldBroadcast && this.gameMode.includes('online')) {
            App.broadcastMove({ type: 'move', index: index, player: player });
        }

        if (this.checkWin(player)) {
            this.isGameActive = false;
            this.isProcessingMove = false;
            document.getElementById('status-text').innerText = `🎉 Player ${player} Wins!`;
            document.getElementById('status-text').style.color = 'var(--win)';
            return;
        }

        if (this.board.every(cell => cell !== null)) {
            this.isGameActive = false;
            this.isProcessingMove = false;
            document.getElementById('status-text').innerText = `🤝 It's a Draw!`;
            document.getElementById('status-text').style.color = '#fbbf24';
            return;
        }

        this.currentPlayer = this.currentPlayer === 'X' ? 'O' : 'X';

        if (!this.gameMode.includes('online')) {
            document.getElementById('status-text').innerText = `Player ${this.currentPlayer}'s Turn`;
            document.getElementById('status-text').style.color = 'var(--text)';
        } else {
            if (this.currentPlayer === this.myOnlineSymbol) {
                document.getElementById('status-text').innerText = "Your Turn!";
                document.getElementById('status-text').style.color = 'var(--text)';
            } else {
                document.getElementById('status-text').innerText = "Opponent's Turn...";
                document.getElementById('status-text').style.color = '#94a3b8';
            }
        }

        // Trigger AI if applicable
        if (this.gameMode.startsWith('ai') && this.currentPlayer === 'O' && this.isGameActive) {
            this.isProcessingMove = true;
            setTimeout(() => {
                this.makeAIMove();
            }, 500);
        }
    },

    // --- AI MOVE: called after delay, unlocks before moving ---
    makeAIMove: function() {
        if (!this.isGameActive || !this.gameMode.startsWith('ai')) {
            this.isProcessingMove = false;
            return;
        }

        let move;
        if (this.gameMode === 'ai-easy') {
            move = this.getRandomMove();
        } else if (this.gameMode === 'ai-hard') {
            move = this.getSmartMove();
        } else {
            move = this.getBestMove(); // minimax
        }

        this.isProcessingMove = false; // unlock before move (so player can click after AI)
        if (move !== -1) {
            // Passing false to avoid re‑broadcasting and to not trigger AI again
            this.makeMove(move, 'O', false);
        }
    },

    // --- AI helpers (unchanged) ---
    getRandomMove: function() {
        const available = this.board.map((v, i) => v === null ? i : null).filter(v => v !== null);
        return available[Math.floor(Math.random() * available.length)];
    },

    getSmartMove: function() {
        for (let i = 0; i < 9; i++) {
            if (!this.board[i]) {
                this.board[i] = 'O';
                if (this.checkWin('O')) { this.board[i] = null; return i; }
                this.board[i] = null;
            }
        }
        for (let i = 0; i < 9; i++) {
            if (!this.board[i]) {
                this.board[i] = 'X';
                if (this.checkWin('X')) { this.board[i] = null; return i; }
                this.board[i] = null;
            }
        }
        return this.getRandomMove();
    },

    getBestMove: function() {
        let bestScore = -Infinity;
        let bestMove = -1;
        for (let i = 0; i < 9; i++) {
            if (!this.board[i]) {
                this.board[i] = 'O';
                let score = this.minimax(this.board, 0, false);
                this.board[i] = null;
                if (score > bestScore) {
                    bestScore = score;
                    bestMove = i;
                }
            }
        }
        return bestMove;
    },

    minimax: function(boardState, depth, isMaximizing) {
        if (this.checkWin('O')) return 10 - depth;
        if (this.checkWin('X')) return -10 + depth;
        if (boardState.every(cell => cell !== null)) return 0;

        if (isMaximizing) {
            let bestScore = -Infinity;
            for (let i = 0; i < 9; i++) {
                if (!boardState[i]) {
                    boardState[i] = 'O';
                    let score = this.minimax(boardState, depth + 1, false);
                    boardState[i] = null;
                    bestScore = Math.max(score, bestScore);
                }
            }
            return bestScore;
        } else {
            let bestScore = Infinity;
            for (let i = 0; i < 9; i++) {
                if (!boardState[i]) {
                    boardState[i] = 'X';
                    let score = this.minimax(boardState, depth + 1, true);
                    boardState[i] = null;
                    bestScore = Math.min(score, bestScore);
                }
            }
            return bestScore;
        }
    },

    // --- WIN CHECK ---
    checkWin: function(player) {
        const wins = [
            [0,1,2], [3,4,5], [6,7,8],
            [0,3,6], [1,4,7], [2,5,8],
            [0,4,8], [2,4,6]
        ];
        return wins.some(combo => combo.every(i => this.board[i] === player));
    }
};
