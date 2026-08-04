const TicTacToe = {
    board: Array(9).fill(null),
    currentPlayer: 'X',
    gameMode: 'local',
    isGameActive: false,
    myOnlineSymbol: 'X',
    isProcessingMove: false,

    init: function() {
        console.log('TicTacToe.init() called');
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

    start: function(mode) {
        console.log('TicTacToe.start() called with mode:', mode);
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
            let modeText = mode.replace('ai-', 'vs AI (').replace('local', 'Local 2-Player');
            if (mode.includes('ai')) modeText += ')';
            document.getElementById('status-text').innerText = `Mode: ${modeText} | Player X's Turn`;
            document.getElementById('status-text').style.color = 'var(--text)';
        }
    },

    showOnlineMenu: function() {
        document.getElementById('online-menu').classList.remove('hidden');
        document.getElementById('status-text').innerText = "Online Multiplayer Setup";
    },

    resetBoard: function(fromRemote = false) {
        console.log('resetBoard called, fromRemote:', fromRemote, 'gameMode:', this.gameMode);
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

    cleanup: function() {
        console.log('TicTacToe.cleanup() called');
        this.isGameActive = false;
        this.isProcessingMove = false;
    },

    renderBoard: function() {
        console.log('renderBoard called, isGameActive:', this.isGameActive);
        const boardEl = document.getElementById('board');
        if (!boardEl) {
            console.error('Board element not found!');
            return;
        }
        boardEl.innerHTML = '';
        this.board.forEach((cell, index) => {
            const cellEl = document.createElement('div');
            cellEl.className = `cell ${cell ? cell.toLowerCase() : ''}`;
            cellEl.innerText = cell || '';
            cellEl.onclick = () => this.handleCellClick(index);
            boardEl.appendChild(cellEl);
        });
        console.log('Board rendered, number of cells:', boardEl.children.length);
    },

    handleCellClick: function(index) {
        console.log('Cell clicked:', index, 'isGameActive:', this.isGameActive, 'board[index]:', this.board[index]);
        if (this.isProcessingMove) {
            console.log('Blocked by isProcessingMove');
            return;
        }
        if (!this.isGameActive || this.board[index]) {
            console.log('Game not active or cell occupied');
            return;
        }
        if (this.gameMode.includes('online') && this.currentPlayer !== this.myOnlineSymbol) {
            console.log('Not your turn in online mode');
            return;
        }

        this.isProcessingMove = true;
        this.makeMove(index, this.currentPlayer, true);
    },

    makeMove: function(index, player, shouldBroadcast) {
        console.log('makeMove called', index, player, shouldBroadcast);
        if (this.isProcessingMove && player === 'X') {
            this.isProcessingMove = false;
            return;
        }

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

        if (!this.gameMode.startsWith('ai')) {
            this.isProcessingMove = false;
        }

        if (this.gameMode.startsWith('ai') && this.currentPlayer === 'O' && this.isGameActive) {
            setTimeout(() => {
                this.makeAIMove();
            }, 500);
        } else {
            if (this.gameMode.startsWith('ai') && this.currentPlayer === 'X') {
                this.isProcessingMove = false;
            }
        }
    },

    makeAIMove: function() {
        console.log('makeAIMove called');
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

        this.isProcessingMove = false;

        if (move !== -1) {
            this.makeMove(move, 'O', false);
        } else {
            this.isProcessingMove = false;
        }
    },

    getRandomMove: function() {
        const available = this.board.map((v, i) => v === null ? i : null).filter(v => v !== null);
        return available.length > 0 ? available[Math.floor(Math.random() * available.length)] : -1;
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
