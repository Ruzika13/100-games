const Connect4 = {
    ROWS: 6,
    COLS: 7,
    board: [],
    currentPlayer: 1, // 1 = Red, 2 = Yellow
    gameMode: 'local',
    isGameActive: false,
    myOnlineSymbol: 1,
    winningCells: [],
    isProcessingMove: false, // Locks UI during AI turn

    // --- INIT (called by App when switching to this view) ---
    init: function() {
        this.board = Array(this.ROWS).fill(null).map(() => Array(this.COLS).fill(0));
        this.currentPlayer = 1;
        this.isGameActive = false;
        this.isProcessingMove = false;
        this.winningCells = [];
        this.renderBoard();
        document.getElementById('c4-status-text').innerText = "Choose a mode to start";
        document.getElementById('c4-status-text').style.color = 'var(--text)';
        document.getElementById('c4-online-menu').classList.add('hidden');
    },

    // --- START ---
    start: function(mode) {
        this.gameMode = mode;
        this.isProcessingMove = false;
        document.getElementById('c4-online-menu').classList.add('hidden');
        this.resetBoard(true); // true = fromRemote, prevent broadcast on init

        if (mode === 'online-host') {
            this.myOnlineSymbol = 1; // Red
            document.getElementById('c4-status-text').innerText = "You are Red (Host). Waiting for opponent...";
            document.getElementById('c4-status-text').style.color = 'var(--text)';
        } else if (mode === 'online-join') {
            this.myOnlineSymbol = 2; // Yellow
            document.getElementById('c4-status-text').innerText = "You are Yellow (Joiner). Waiting for host to start...";
            document.getElementById('c4-status-text').style.color = 'var(--text)';
        } else {
            this.myOnlineSymbol = 1; // not used
            let modeText = mode.replace('ai-', 'vs AI (').replace('local', 'Local 2-Player') + (mode.includes('ai') ? ')' : '');
            document.getElementById('c4-status-text').innerText = `Mode: ${modeText} | Red's Turn`;
            document.getElementById('c4-status-text').style.color = 'var(--text)';
        }
    },

    // --- ONLINE MENU ---
    showOnlineMenu: function() {
        document.getElementById('c4-online-menu').classList.remove('hidden');
        document.getElementById('c4-status-text').innerText = "Online Multiplayer Setup";
    },

    // --- RESET ---
    resetBoard: function(fromRemote = false) {
        this.board = Array(this.ROWS).fill(null).map(() => Array(this.COLS).fill(0));
        this.currentPlayer = 1;
        this.isGameActive = true;
        this.isProcessingMove = false;
        this.winningCells = [];
        this.renderBoard();

        if (!this.gameMode.includes('online')) {
            document.getElementById('c4-status-text').innerText = "Red's Turn";
            document.getElementById('c4-status-text').style.color = 'var(--text)';
        } else {
            if (this.gameMode === 'online-host' && this.myOnlineSymbol === 1) {
                document.getElementById('c4-status-text').innerText = "Your Turn (Red)";
            } else if (this.gameMode === 'online-join' && this.myOnlineSymbol === 2) {
                document.getElementById('c4-status-text').innerText = "Waiting for host (Red)...";
            }
        }

        // Broadcast restart only if NOT triggered by remote
        if (!fromRemote && this.gameMode.includes('online')) {
            App.broadcastRestart();
        }
    },

    // --- CLEANUP (called when switching away) ---
    cleanup: function() {
        this.isGameActive = false;
        this.isProcessingMove = false;
        // Do NOT close the global connection – it's managed by App
    },

    // --- RENDER BOARD ---
    renderBoard: function() {
        const boardEl = document.getElementById('c4-board');
        boardEl.innerHTML = '';
        for (let r = 0; r < this.ROWS; r++) {
            for (let c = 0; c < this.COLS; c++) {
                const cell = document.createElement('div');
                cell.className = 'c4-cell';
                if (this.board[r][c] === 1) cell.classList.add('red');
                if (this.board[r][c] === 2) cell.classList.add('yellow');
                if (this.winningCells.some(wc => wc.r === r && wc.c === c)) {
                    cell.classList.add('win');
                }
                cell.onclick = () => this.handleColumnClick(c);
                boardEl.appendChild(cell);
            }
        }
    },

    // --- COLUMN CLICK HANDLER ---
    handleColumnClick: function(col) {
        // LOCK: prevent clicks while processing (AI or other)
        if (this.isProcessingMove) return;
        if (!this.isGameActive) return;
        if (this.gameMode.includes('online') && this.currentPlayer !== this.myOnlineSymbol) return;
        if (this.board[0][col] !== 0) return; // column full

        // Lock immediately to block rapid clicks
        this.isProcessingMove = true;

        // Perform the move
        this.makeMove(col, this.currentPlayer, true);

        // Note: the lock is released inside makeMove when AI is triggered,
        // or if the move doesn't trigger AI, we unlock.
        // We'll handle that inside makeMove.
    },

    // --- MAKE MOVE ---
    makeMove: function(col, player, shouldBroadcast) {
        // Extra safety: if already processing, ignore
        if (this.isProcessingMove && player === 1) { // player 1 is human; player 2 is AI
            return;
        }

        // Find lowest empty row
        let row = this.ROWS - 1;
        while (row >= 0 && this.board[row][col] !== 0) {
            row--;
        }
        if (row < 0) {
            // Column full – should not happen if guard checks are in place
            this.isProcessingMove = false;
            return;
        }

        this.board[row][col] = player;
        this.renderBoard();

        if (shouldBroadcast && this.gameMode.includes('online')) {
            App.broadcastMove({ type: 'move', col: col, player: player });
        }

        // Check win
        const winInfo = this.checkWin(this.board, player);
        if (winInfo) {
            this.isGameActive = false;
            this.isProcessingMove = false;
            this.winningCells = winInfo;
            this.renderBoard();
            const winnerName = player === 1 ? "Red" : "Yellow";
            document.getElementById('c4-status-text').innerText = `🎉 ${winnerName} Wins!`;
            document.getElementById('c4-status-text').style.color = player === 1 ? '#ef4444' : '#eab308';
            return;
        }

        // Check draw
        if (this.board[0].every(cell => cell !== 0)) {
            this.isGameActive = false;
            this.isProcessingMove = false;
            document.getElementById('c4-status-text').innerText = `🤝 It's a Draw!`;
            document.getElementById('c4-status-text').style.color = '#fbbf24';
            return;
        }

        // Switch player
        this.currentPlayer = this.currentPlayer === 1 ? 2 : 1;

        // Update status
        if (!this.gameMode.includes('online')) {
            document.getElementById('c4-status-text').innerText = this.currentPlayer === 1 ? "Red's Turn" : "Yellow's Turn";
            document.getElementById('c4-status-text').style.color = 'var(--text)';
        } else {
            if (this.currentPlayer === this.myOnlineSymbol) {
                document.getElementById('c4-status-text').innerText = "Your Turn!";
                document.getElementById('c4-status-text').style.color = 'var(--text)';
            } else {
                document.getElementById('c4-status-text').innerText = "Opponent's Turn...";
                document.getElementById('c4-status-text').style.color = '#94a3b8';
            }
        }

        // Unlock if it's not AI's turn (i.e., local 2-player or online)
        if (!this.gameMode.startsWith('ai')) {
            this.isProcessingMove = false;
        }

        // AI TURN
        if (this.gameMode.startsWith('ai') && this.currentPlayer === 2 && this.isGameActive) {
            // Lock is already true; schedule AI move
            setTimeout(() => {
                this.makeAIMove();
            }, 600);
        } else {
            // If no AI trigger, unlock (happens when currentPlayer is 1 after AI move)
            if (this.gameMode.startsWith('ai') && this.currentPlayer === 1) {
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

        let col;
        if (this.gameMode === 'ai-easy') {
            col = this.getRandomValidCol();
        } else if (this.gameMode === 'ai-hard') {
            col = this.getSmartCol();
        } else {
            col = this.getBestMinimaxCol();
        }

        // Unlock before calling makeMove (but makeMove will re-lock if needed)
        this.isProcessingMove = false;

        if (col !== -1) {
            this.makeMove(col, 2, false);
        } else {
            // No valid column? Unlock anyway.
            this.isProcessingMove = false;
        }
    },

    // --- HELPER FUNCTIONS (unchanged logic, but kept consistent) ---

    getValidCols: function(board) {
        const cols = [];
        for (let c = 0; c < this.COLS; c++) {
            if (board[0][c] === 0) cols.push(c);
        }
        return cols;
    },

    getRandomValidCol: function() {
        const valid = this.getValidCols(this.board);
        return valid.length > 0 ? valid[Math.floor(Math.random() * valid.length)] : -1;
    },

    getSmartCol: function() {
        const valid = this.getValidCols(this.board);
        // 1. Check for winning move
        for (let c of valid) {
            const tempBoard = this.board.map(row => [...row]);
            this.dropPiece(tempBoard, c, 2);
            if (this.checkWin(tempBoard, 2)) return c;
        }
        // 2. Block opponent winning move
        for (let c of valid) {
            const tempBoard = this.board.map(row => [...row]);
            this.dropPiece(tempBoard, c, 1);
            if (this.checkWin(tempBoard, 1)) return c;
        }
        // 3. Prefer center, else random
        if (valid.includes(3)) return 3;
        return valid.length > 0 ? valid[Math.floor(Math.random() * valid.length)] : -1;
    },

    dropPiece: function(board, col, piece) {
        for (let r = this.ROWS - 1; r >= 0; r--) {
            if (board[r][col] === 0) {
                board[r][col] = piece;
                return r;
            }
        }
        return -1;
    },

    checkWin: function(board, piece) {
        // Horizontal
        for (let r = 0; r < this.ROWS; r++) {
            for (let c = 0; c < this.COLS - 3; c++) {
                if (board[r][c] === piece && board[r][c+1] === piece && board[r][c+2] === piece && board[r][c+3] === piece) {
                    return [{r,c}, {r,c:c+1}, {r,c:c+2}, {r,c:c+3}];
                }
            }
        }
        // Vertical
        for (let r = 0; r < this.ROWS - 3; r++) {
            for (let c = 0; c < this.COLS; c++) {
                if (board[r][c] === piece && board[r+1][c] === piece && board[r+2][c] === piece && board[r+3][c] === piece) {
                    return [{r,c}, {r:r+1,c}, {r:r+2,c}, {r:r+3,c}];
                }
            }
        }
        // Diagonal /
        for (let r = 3; r < this.ROWS; r++) {
            for (let c = 0; c < this.COLS - 3; c++) {
                if (board[r][c] === piece && board[r-1][c+1] === piece && board[r-2][c+2] === piece && board[r-3][c+3] === piece) {
                    return [{r,c}, {r:r-1,c:c+1}, {r:r-2,c:c+2}, {r:r-3,c:c+3}];
                }
            }
        }
        // Diagonal \
        for (let r = 0; r < this.ROWS - 3; r++) {
            for (let c = 0; c < this.COLS - 3; c++) {
                if (board[r][c] === piece && board[r+1][c+1] === piece && board[r+2][c+2] === piece && board[r+3][c+3] === piece) {
                    return [{r,c}, {r:r+1,c:c+1}, {r:r+2,c:c+2}, {r:r+3,c:c+3}];
                }
            }
        }
        return null;
    },

    // --- MINIMAX WITH ALPHA-BETA (Depth 4) ---
    getBestMinimaxCol: function() {
        const tempBoard = this.board.map(row => [...row]);
        const valid = this.getValidCols(tempBoard);
        if (valid.length === 0) return -1;
        const [col] = this.minimax(tempBoard, 4, -Infinity, Infinity, true);
        return col !== -1 ? col : valid[0];
    },

    minimax: function(board, depth, alpha, beta, isMaximizing) {
        const validCols = this.getValidCols(board);
        const isTerminal = this.checkWin(board, 1) || this.checkWin(board, 2) || validCols.length === 0;

        if (depth === 0 || isTerminal) {
            if (isTerminal) {
                if (this.checkWin(board, 2)) return [-1, 1000000];
                if (this.checkWin(board, 1)) return [-1, -1000000];
                return [-1, 0];
            } else {
                return [-1, this.evaluateBoard(board, 2)];
            }
        }

        if (isMaximizing) {
            let maxEval = -Infinity;
            let bestCol = validCols[Math.floor(Math.random() * validCols.length)];
            // Order columns: center first for better pruning
            validCols.sort((a, b) => Math.abs(a - 3) - Math.abs(b - 3));

            for (let col of validCols) {
                const tempBoard = board.map(row => [...row]);
                this.dropPiece(tempBoard, col, 2);
                const [, evalScore] = this.minimax(tempBoard, depth - 1, alpha, beta, false);
                if (evalScore > maxEval) {
                    maxEval = evalScore;
                    bestCol = col;
                }
                alpha = Math.max(alpha, evalScore);
                if (beta <= alpha) break;
            }
            return [bestCol, maxEval];
        } else {
            let minEval = Infinity;
            let bestCol = validCols[Math.floor(Math.random() * validCols.length)];
            validCols.sort((a, b) => Math.abs(a - 3) - Math.abs(b - 3));

            for (let col of validCols) {
                const tempBoard = board.map(row => [...row]);
                this.dropPiece(tempBoard, col, 1);
                const [, evalScore] = this.minimax(tempBoard, depth - 1, alpha, beta, true);
                if (evalScore < minEval) {
                    minEval = evalScore;
                    bestCol = col;
                }
                beta = Math.min(beta, evalScore);
                if (beta <= alpha) break;
            }
            return [bestCol, minEval];
        }
    },

    evaluateBoard: function(board, piece) {
        let score = 0;
        // Center column preference
        const centerArray = [];
        for (let r = 0; r < this.ROWS; r++) centerArray.push(board[r][3]);
        const centerCount = centerArray.filter(x => x === piece).length;
        score += centerCount * 3;

        // Additional basic heuristics could be added, but keep it simple.
        return score;
    }
};
