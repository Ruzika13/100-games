const TicTacToe = {
    board: Array(9).fill(null),
    currentPlayer: 'X',
    gameMode: 'local',
    isGameActive: false,
    myOnlineSymbol: 'X',

    start: function(mode) {
        this.gameMode = mode;
        document.getElementById('online-menu').classList.add('hidden');
        this.resetBoard();
        
        let modeText = mode.replace('ai-', 'vs AI (').replace('local', 'Local 2-Player').replace('online-', 'Online (') + (mode.includes('ai') || mode.includes('online') ? ')' : '');
        document.getElementById('status-text').innerText = `Mode: ${modeText} | Player X's Turn`;
        document.getElementById('status-text').style.color = 'var(--text)';
    },

    showOnlineMenu: function() {
        document.getElementById('online-menu').classList.remove('hidden');
        document.getElementById('status-text').innerText = "Online Multiplayer Setup";
    },

    resetBoard: function() {
        this.board = Array(9).fill(null);
        this.currentPlayer = 'X';
        this.isGameActive = true;
        this.renderBoard();
        
        if (this.gameMode.includes('online-join')) {
            document.getElementById('status-text').innerText = "Waiting for Host (X) to start...";
        } else {
            document.getElementById('status-text').innerText = `Player ${this.currentPlayer}'s Turn`;
        }
        App.broadcastRestart();
    },

    cleanup: function() {
        this.isGameActive = false;
        if (App.conn) App.conn.close();
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
            App.broadcastMove(index, player);
        }

        if (this.checkWin(player)) {
            this.isGameActive = false;
            document.getElementById('status-text').innerText = `🎉 Player ${player} Wins!`;
            document.getElementById('status-text').style.color = 'var(--win)';
            return;
        }

        if (this.board.every(cell => cell !== null)) {
            this.isGameActive = false;
            document.getElementById('status-text').innerText = `🤝 It's a Draw!`;
            document.getElementById('status-text').style.color = '#fbbf24';
            return;
        }

        this.currentPlayer = this.currentPlayer === 'X' ? 'O' : 'X';
        
        if (!this.gameMode.includes('online')) {
            document.getElementById('status-text').innerText = `Player ${this.currentPlayer}'s Turn`;
            document.getElementById('status-text').style.color = 'var(--text)';
        } else {
            document.getElementById('status-text').innerText = this.currentPlayer === this.myOnlineSymbol ? "Your Turn!" : "Opponent's Turn...";
        }

        if (this.gameMode.startsWith('ai') && this.currentPlayer === 'O' && this.isGameActive) {
            setTimeout(() => this.makeAIMove(), 500);
        }
    },

    // --- AI LOGIC ---
    makeAIMove: function() {
        let move;
        if (this.gameMode === 'ai-easy') {
            move = this.getRandomMove();
        } else if (this.gameMode === 'ai-hard') {
            move = this.getSmartMove();
        } else {
            move = this.getBestMove(); // Minimax
        }
        
        if (move !== -1) {
            this.makeMove(move, 'O', false);
        }
    },

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
