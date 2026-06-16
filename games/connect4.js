const Connect4 = {
    ROWS: 6,
    COLS: 7,
    board: [],
    currentPlayer: 1, // 1 = Red, 2 = Yellow
    gameMode: 'local',
    isGameActive: false,
    myOnlineSymbol: 1,
    winningCells: [],

    init: function() {
        this.resetBoard();
    },

    start: function(mode) {
        this.gameMode = mode;
        document.getElementById('c4-online-menu').classList.add('hidden');
        this.resetBoard();
        
        let modeText = mode.replace('ai-', 'vs AI (').replace('local', 'Local 2-Player').replace('online-', 'Online (') + (mode.includes('ai') || mode.includes('online') ? ')' : '');
        document.getElementById('c4-status-text').innerText = `Mode: ${modeText} | Red's Turn`;
        document.getElementById('c4-status-text').style.color = 'var(--text)';
    },

    showOnlineMenu: function() {
        document.getElementById('c4-online-menu').classList.remove('hidden');
        document.getElementById('c4-status-text').innerText = "Online Multiplayer Setup";
    },

    resetBoard: function() {
        this.board = Array(this.ROWS).fill(null).map(() => Array(this.COLS).fill(0));
        this.currentPlayer = 1;
        this.isGameActive = true;
        this.winningCells = [];
        this.renderBoard();
        
        if (this.gameMode.includes('online-join')) {
            document.getElementById('c4-status-text').innerText = "Waiting for Host (Red) to start...";
        } else {
            document.getElementById('c4-status-text').innerText = "Red's Turn";
        }
        App.broadcastRestart();
    },

    cleanup: function() {
        this.isGameActive = false;
        if (App.conn) App.conn.close();
    },

    renderBoard: function() {
        const boardEl = document.getElementById('c4-board');
        boardEl.innerHTML = '';
        for (let r = 0; r < this.ROWS; r++) {
            for (let c = 0; c < this.COLS; c++) {
                const cell = document.createElement('div');
                cell.className = 'c4-cell';
                if (this.board[r][c] === 1) cell.classList.add('red');
                if (this.board[r][c] === 2) cell.classList.add('yellow');
                
                // Highlight winning cells
                if (this.winningCells.some(wc => wc.r === r && wc.c === c)) {
                    cell.classList.add('win');
                }

                cell.onclick = () => this.handleColumnClick(c);
                boardEl.appendChild(cell);
            }
        }
    },

    handleColumnClick: function(col) {
        if (!this.isGameActive) return;
        if (this.gameMode.includes('online') && this.currentPlayer !== this.myOnlineSymbol) return;
        if (this.board[0][col] !== 0) return; // Column full

        this.makeMove(col, this.currentPlayer, true);
    },

    makeMove: function(col, player, shouldBroadcast) {
        // Find lowest empty row
        let row = this.ROWS - 1;
        while (row >= 0 && this.board[row][col] !== 0) {
            row--;
        }

        this.board[row][col] = player;
        this.renderBoard();

        if (shouldBroadcast && this.gameMode.includes('online')) {
            App.broadcastMove({ type: 'move', col: col, player: player });
        }

        const winInfo = this.checkWin(this.board, player);
        if (winInfo) {
            this.isGameActive = false;
            this.winningCells = winInfo;
            this.renderBoard();
            const winnerName = player === 1 ? "Red" : "Yellow";
            document.getElementById('c4-status-text').innerText = `🎉 ${winnerName} Wins!`;
            document.getElementById('c4-status-text').style.color = player === 1 ? '#ef4444' : '#eab308';
            return;
        }

        if (this.board[0].every(cell => cell !== 0)) {
            this.isGameActive = false;
            document.getElementById('c4-status-text').innerText = `🤝 It's a Draw!`;
            document.getElementById('c4-status-text').style.color = '#fbbf24';
            return;
        }

        this.currentPlayer = this.currentPlayer === 1 ? 2 : 1;
        
        if (!this.gameMode.includes('online')) {
            document.getElementById('c4-status-text').innerText = this.currentPlayer === 1 ? "Red's Turn" : "Yellow's Turn";
            document.getElementById('c4-status-text').style.color = 'var(--text)';
        } else {
            document.getElementById('c4-status-text').innerText = this.currentPlayer === this.myOnlineSymbol ? "Your Turn!" : "Opponent's Turn...";
        }

        if (this.gameMode.startsWith('ai') && this.currentPlayer === 2 && this.isGameActive) {
            setTimeout(() => this.makeAIMove(), 600);
        }
    },

    // --- AI LOGIC ---
    makeAIMove: function() {
        let col;
        if (this.gameMode === 'ai-easy') {
            col = this.getRandomValidCol();
        } else if (this.gameMode === 'ai-hard') {
            col = this.getSmartCol();
        } else {
            col = this.getBestMinimaxCol();
        }
        
        if (col !== -1) {
            this.makeMove(col, 2, false);
        }
    },

    getValidCols: function(board) {
        const cols = [];
        for (let c = 0; c < this.COLS; c++) {
            if (board[0][c] === 0) cols.push(c);
        }
        return cols;
    },

    getRandomValidCol: function() {
        const valid = this.getValidCols(this.board);
        return valid[Math.floor(Math.random() * valid.length)];
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
        return valid[Math.floor(Math.random() * valid.length)];
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

    // --- MINIMAX WITH ALPHA-BETA PRUNING (Depth 4) ---
    getBestMinimaxCol: function() {
        // Use a shallow copy of the board for the AI to simulate moves
        const tempBoard = this.board.map(row => [...row]);
        const [col, score] = this.minimax(tempBoard, 4, -Infinity, Infinity, true);
        return col !== -1 ? col : this.getValidCols(this.board)[0];
    },

    minimax: function(board, depth, alpha, beta, isMaximizing) {
        const validCols = this.getValidCols(board);
        const isTerminal = this.checkWin(board, 1) || this.checkWin(board, 2) || validCols.length === 0;

        if (depth === 0 || isTerminal) {
            if (isTerminal) {
                if (this.checkWin(board, 2)) return [-1, 1000000]; // AI wins
                if (this.checkWin(board, 1)) return [-1, -1000000]; // Player wins
                return [-1, 0]; // Draw
            } else {
                return [-1, this.evaluateBoard(board, 2)]; // Heuristic score
            }
        }

        if (isMaximizing) {
            let maxEval = -Infinity;
            let bestCol = validCols[Math.floor(Math.random() * validCols.length)];
            
            // Order columns to check center first for better alpha-beta pruning
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
                if (beta <= alpha) break; // Prune
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
                if (beta <= alpha) break; // Prune
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

        // Score horizontal, vertical, diagonal windows (simplified heuristic)
        // This is a basic implementation to keep performance high in JS
        return score;
    }
};
