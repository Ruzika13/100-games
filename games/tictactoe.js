const TicTacToe = {
    board: Array(9).fill(null),
    currentPlayer: 'X',
    gameMode: 'local',
    isGameActive: false,
    myOnlineSymbol: 'X',
    isProcessingMove: false, // locks UI during AI turn

    // --- INIT ---
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

    // --- START ---
    start: function(mode) {
        this.gameMode = mode;
        this.isProcessingMove = false;
        document.getElementById('online-menu').classList.add('hidden');
        this.resetBoard(true);

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

    // --- ONLINE MENU ---
    showOnlineMenu: function() {
        document.getElementById('online-menu').classList.remove('hidden');
        document.getElementById('status-text').innerText = "Online Multiplayer Setup";
    },

    // --- RESET ---
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

        if (!fromRemote && this.gameMode.includes('online')) {
            App.broadcastRestart();
        }
    },

    // --- CLEANUP ---
    cleanup: function() {
        this.isGameActive = false;
        this.isProcessingMove = false;
        // Do NOT close the global connection
    },

    // --- RENDER ---
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

    // --- CLICK HANDLER ---
    handleCellClick: function(index) {
        // LOCK: prevent clicks while processing (AI or other)
        if (this.isProcessingMove) return;
        if (!this.isGameActive || this.board[index]) return;
        if (this.gameMode.includes('online') && this.currentPlayer !== this.myOnlineSymbol) return;

        // Lock immediately to block rapid clicks
        this.isProcessingMove = true;

        // Perform the move
        this.makeMove(index, this.currentPlayer, true);

        // Note: the lock is released inside makeMove when AI is triggered,
        // or if the move doesn't trigger AI, we must unlock.
        // We'll handle that inside makeMove.
    },

    // --- MAKE MOVE ---
    makeMove: function(index, player, shouldBroadcast) {
        // Extra safety: if already processing, ignore
        if (this.isProcessingMove && player === 'X') {
            // If player tries to move while processing, ignore
            return;
        }

        // Perform the move
        this.board[index] = player;
        this.renderBoard();

        if (shouldBroadcast && this.gameMode.includes('online')) {
            App.broadcastMove({ type: 'move', index: index, player: player });
        }

        // Check win
        if (this.checkWin(player)) {
            this.isGameActive = false;
            this.isProcessingMove = false;
            document.getElementById('status-text').innerText = `🎉 Player ${player} Wins!`;
            document.getElementById('status-text').style.color = 'var(--win)';
            return;
        }

        // Check draw
        if (this.board.every(cell => cell !== null)) {
            this.isGameActive = false;
            this.isProcessingMove = false;
            document.getElementById('status-text').innerText = `🤝 It's a Draw!`;
            document.getElementById('status-text').style.color = '#fbbf24';
            return;
        }

        // Switch player
        this.currentPlayer = this.currentPlayer === 'X' ? 'O' : 'X';

        // Update status
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

        // Unlock if it's not AI's turn (i.e., local 2-player or online)
        if (!this.gameMode.startsWith('ai')) {
            this.isProcessingMove = false;
        }

        // AI TURN
        if (this.gameMode.startsWith('ai') && this.currentPlayer === 'O' && this.isGameActive) {
            // Lock is already true; schedule AI move
            setTimeout(() => {
                this.makeAIMove();
            }, 500);
        } else {
            // If no AI trigger, unlock (happens when currentPlayer is X after AI move)
            if (this.gameMode.startsWith('ai') && this.currentPlayer === 'X') {
                this.isProcessingMove = false;
            }
        }
    },

    // --- AI MOVE ---
    makeAIMove: function() {
        // Safety: if game ended or not AI mode, unlock and return
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
            move = this.getBestMove();
        }

        // Unlock before calling makeMove (but makeMove will re-lock if needed)
        this.isProcessingMove = false;

        if (move !== -1) {
            this.makeMove(move, 'O', false);
        } else {
            // No move, but unlock anyway
            this.isProcessingMove = false;
        }
    },

    // --- AI helpers ---
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
