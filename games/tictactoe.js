const TicTacToe = {
    board: Array(9).fill(null),
    currentPlayer: 'X',
    gameMode: 'local',
    isGameActive: false,
    myOnlineSymbol: 'X',
    isProcessingMove: false, // NEW: locks UI during AI move

    start: function(mode) {
        this.gameMode = mode;
        this.isProcessingMove = false; // reset flag
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
            this.myOnlineSymbol = 'X';
            let modeText = mode.replace('ai-', 'vs AI (').replace('local', 'Local 2-Player') + (mode.includes('ai') ? ')' : '');
            document.getElementById('status-text').innerText = `Mode: ${modeText} | Player X's Turn`;
            document.getElementById('status-text').style.color = 'var(--text)';
        }
    },

    showOnlineMenu: function() {
        document.getElementById('online-menu').classList.remove('hidden');
        document.getElementById('status-text').innerText = "Online Multiplayer Setup";
    },

    resetBoard: function(fromRemote = false) {
        this.board = Array(9).fill(null);
        this.currentPlayer = 'X';
        this.isGameActive = true;
        this.isProcessingMove = false; // reset lock
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

        if (!fromRemote && this.gameMode.includes('online')) {
            App.broadcastRestart();
        }
    },

    cleanup: function() {
        this.isGameActive = false;
        this.isProcessingMove = false;
        // Do NOT close global connection
    },

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

    handleCellClick: function(index) {
        // LOCK: prevent clicks while AI is thinking
        if (this.isProcessingMove) return;
        if (!this.isGameActive || this.board[index]) return;

        if (this.gameMode.includes('online') && this.currentPlayer !== this.myOnlineSymbol) {
            return;
        }

        this.makeMove(index, this.currentPlayer, true);
    },

    makeMove: function(index, player, shouldBroadcast) {
        this.board[index] = player;
        this.renderBoard();

        if (shouldBroadcast && this.gameMode.includes('online')) {
            App.broadcastMove({ type: 'move', index: index, player: player });
        }

        if (this.checkWin(player)) {
            this.isGameActive = false;
            this.isProcessingMove = false; // unlock just in case
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

        // ----- AI TURN -----
        if (this.gameMode.startsWith('ai') && this.currentPlayer === 'O' && this.isGameActive) {
            // LOCK the board
            this.isProcessingMove = true;
            setTimeout(() => {
                this.makeAIMove();
            }, 500);
        }
    },

    makeAIMove: function() {
        // Ensure we're still in a valid state
        if (!this.isGameActive || this.gameMode !== 'ai-easy' && this.gameMode !== 'ai-hard' && this.gameMode !== 'ai-extreme') {
            this.isProcessingMove = false;
            return;
        }

        let move;
        if (this.gameMode === 'ai-easy') {
            move = this.getRandomMove();
        } else if (this.gameMode === 'ai-hard') {
            move = this.getSmartMove();
        } else {
            move = this.getBestMove(); // Minimax
        }

        // Unlock before making the move (so subsequent clicks work)
        this.isProcessingMove = false;

        if (move !== -1) {
            // Make the move – this will handle win/draw and turn updates
            // but we must NOT re‑trigger the AI again (so pass shouldBroadcast = false)
            // and we need to avoid re‑locking.
            // The makeMove function will see that it's AI turn again if we don't guard,
            // but we already set currentPlayer to 'O', so after this move, currentPlayer becomes 'X',
            // so no recursive AI call.
            this.makeMove(move, 'O', false);
        } else {
            // No legal move? Should not happen, but unlock anyway.
            this.isProcessingMove = false;
        }
    },

    // --- AI helper functions (unchanged) ---
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

    checkWin: function(player) {
        const wins = [
            [0,1,2], [3,4,5], [6,7,8],
            [0,3,6], [1,4,7], [2,5,8],
            [0,4,8], [2,4,6]
        ];
        return wins.some(combo => combo.every(i => this.board[i] === player));
    }
};
