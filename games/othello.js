const Othello = {
    size: 8,               // default
    board: [],
    currentPlayer: 1,
    gameMode: 'local',
    isGameActive: false,
    myOnlineSymbol: 1,
    isProcessingMove: false,

    // ---------- SET BOARD SIZE ----------
    setBoardSize: function(newSize) {
        if (this.isGameActive) {
            if (!confirm("Changing board size will restart the game. Continue?")) return;
        }
        this.size = newSize;
        document.getElementById('o-size-display').innerText = `(${newSize}×${newSize})`;
        this.resetBoard(true);
    },

    // ---------- INIT ----------
    init: function() {
        this.board = Array(this.size).fill(null).map(() => Array(this.size).fill(0));
        this.currentPlayer = 1;
        this.isGameActive = false;
        this.isProcessingMove = false;
        this.renderBoard();
        document.getElementById('o-status-text').innerText = "Choose a mode to start";
        document.getElementById('o-status-text').style.color = 'var(--text)';
        document.getElementById('o-online-menu').classList.add('hidden');
    },

    // ---------- START ----------
    start: function(mode) {
        this.gameMode = mode;
        this.isProcessingMove = false;
        document.getElementById('o-online-menu').classList.add('hidden');
        this.resetBoard(true);

        if (mode === 'online-host') {
            this.myOnlineSymbol = 1;
            document.getElementById('o-status-text').innerText = "You are Black (Host). Waiting for opponent...";
            document.getElementById('o-status-text').style.color = 'var(--text)';
        } else if (mode === 'online-join') {
            this.myOnlineSymbol = 2;
            document.getElementById('o-status-text').innerText = "You are White (Joiner). Waiting for host to start...";
            document.getElementById('o-status-text').style.color = 'var(--text)';
        } else {
            this.myOnlineSymbol = 1;
            let modeText = mode.replace('ai-', 'vs AI (').replace('local', 'Local 2-Player') + (mode.includes('ai') ? ')' : '');
            document.getElementById('o-status-text').innerText = `Mode: ${modeText} | Black's Turn`;
            document.getElementById('o-status-text').style.color = 'var(--text)';
        }
    },

    // ---------- ONLINE MENU ----------
    showOnlineMenu: function() {
        document.getElementById('o-online-menu').classList.remove('hidden');
        document.getElementById('o-status-text').innerText = "Online Multiplayer Setup";
    },

    // ---------- RESET ----------
    resetBoard: function(fromRemote = false) {
        const size = this.size;
        this.board = Array(size).fill(null).map(() => Array(size).fill(0));
        const mid = size / 2;
        this.board[mid-1][mid-1] = 2; // white
        this.board[mid-1][mid] = 1;   // black
        this.board[mid][mid-1] = 1;
        this.board[mid][mid] = 2;

        this.currentPlayer = 1;
        this.isGameActive = true;
        this.isProcessingMove = false;
        this.renderBoard();

        if (!this.gameMode.includes('online')) {
            document.getElementById('o-status-text').innerText = "Black's Turn";
            document.getElementById('o-status-text').style.color = 'var(--text)';
        } else {
            if (this.gameMode === 'online-host' && this.myOnlineSymbol === 1) {
                document.getElementById('o-status-text').innerText = "Your Turn (Black)";
            } else if (this.gameMode === 'online-join' && this.myOnlineSymbol === 2) {
                document.getElementById('o-status-text').innerText = "Waiting for host (Black)...";
            }
        }

        setTimeout(() => this.checkSkipOrGameOver(), 100);

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
        const boardEl = document.getElementById('o-board');
        boardEl.innerHTML = '';
        const size = this.size;
        boardEl.style.gridTemplateColumns = `repeat(${size}, 1fr)`;

        for (let r = 0; r < size; r++) {
            for (let c = 0; c < size; c++) {
                const cell = document.createElement('div');
                cell.className = 'o-cell';
                const val = this.board[r][c];
                if (val === 1) cell.classList.add('black');
                else if (val === 2) cell.classList.add('white');
                cell.dataset.row = r;
                cell.dataset.col = c;
                cell.onclick = () => this.handleCellClick(r, c);
                boardEl.appendChild(cell);
            }
        }
    },

    // ---------- CLICK HANDLER ----------
    handleCellClick: function(row, col) {
        if (!this.isGameActive) return;
        if (this.isProcessingMove && this.gameMode.startsWith('ai')) return;
        if (this.gameMode.includes('online') && this.currentPlayer !== this.myOnlineSymbol) return;
        if (!this.isValidMove(row, col, this.currentPlayer, this.board)) return;

        if (this.gameMode.startsWith('ai')) {
            if (this.isProcessingMove) return;
            this.isProcessingMove = true;
        }

        this.makeMove(row, col, this.currentPlayer, true);
    },

    // ---------- MAKE MOVE ----------
    makeMove: function(row, col, player, shouldBroadcast) {
        const flips = this.getFlips(row, col, player, this.board);
        if (!flips || flips.length === 0) {
            this.releaseLock();
            return;
        }

        this.board[row][col] = player;
        flips.forEach(([r, c]) => { this.board[r][c] = player; });
        this.renderBoard();

        if (shouldBroadcast && this.gameMode.includes('online')) {
            App.broadcastMove({ type: 'move', row: row, col: col, player: player });
        }

        const opponent = player === 1 ? 2 : 1;
        const hasPlayerMoves = this.hasValidMoves(player, this.board);
        const hasOpponentMoves = this.hasValidMoves(opponent, this.board);

        if (!hasPlayerMoves && !hasOpponentMoves) {
            this.isGameActive = false;
            this.releaseLock();
            this.showGameOver();
            return;
        }

        this.currentPlayer = this.currentPlayer === 1 ? 2 : 1;
        this.updateStatus();

        if (!this.hasValidMoves(this.currentPlayer, this.board)) {
            this.currentPlayer = this.currentPlayer === 1 ? 2 : 1;
            if (!this.hasValidMoves(this.currentPlayer, this.board)) {
                this.isGameActive = false;
                this.releaseLock();
                this.showGameOver();
                return;
            }
            this.updateStatus();
        }

        if (this.gameMode.startsWith('ai') && this.currentPlayer === 2 && this.isGameActive) {
            setTimeout(() => this.makeAIMove(), 600);
        } else {
            this.releaseLock();
        }
    },

    // ---------- AI MOVE ----------
    makeAIMove: function() {
        if (!this.isGameActive || !this.gameMode.startsWith('ai')) {
            this.releaseLock();
            return;
        }

        let move;
        if (this.gameMode === 'ai-easy') {
            move = this.getRandomMove();
        } else if (this.gameMode === 'ai-hard') {
            move = this.getGreedyMove();
        } else {
            move = this.getBestMinimaxMove();
        }

        this.isProcessingMove = false;
        if (move) {
            this.makeMove(move.row, move.col, 2, false);
        } else {
            this.releaseLock();
        }
    },

    // ---------- LOCK HELPER ----------
    releaseLock: function() {
        this.isProcessingMove = false;
    },

    // ---------- STATUS UPDATE ----------
    updateStatus: function() {
        const playerName = this.currentPlayer === 1 ? "Black" : "White";
        if (!this.gameMode.includes('online')) {
            document.getElementById('o-status-text').innerText = `${playerName}'s Turn`;
            document.getElementById('o-status-text').style.color = 'var(--text)';
        } else {
            if (this.currentPlayer === this.myOnlineSymbol) {
                document.getElementById('o-status-text').innerText = "Your Turn!";
                document.getElementById('o-status-text').style.color = 'var(--text)';
            } else {
                document.getElementById('o-status-text').innerText = "Opponent's Turn...";
                document.getElementById('o-status-text').style.color = '#94a3b8';
            }
        }
    },

    // ---------- GAME OVER ----------
    showGameOver: function() {
        let blackCount = 0, whiteCount = 0;
        for (let r = 0; r < this.size; r++) {
            for (let c = 0; c < this.size; c++) {
                if (this.board[r][c] === 1) blackCount++;
                else if (this.board[r][c] === 2) whiteCount++;
            }
        }
        let msg = blackCount > whiteCount ? "🏆 Black Wins!" :
                  whiteCount > blackCount ? "🏆 White Wins!" : "🤝 It's a Draw!";
        msg += ` (Black: ${blackCount}  White: ${whiteCount})`;
        document.getElementById('o-status-text').innerText = msg;
        document.getElementById('o-status-text').style.color = blackCount > whiteCount ? '#ef4444' : 
                                                               whiteCount > blackCount ? '#eab308' : '#fbbf24';
        this.isGameActive = false;
        this.releaseLock();
    },

    // ---------- SKIP / GAME OVER CHECK ----------
    checkSkipOrGameOver: function() {
        if (!this.isGameActive) return;
        if (!this.hasValidMoves(this.currentPlayer, this.board)) {
            this.currentPlayer = this.currentPlayer === 1 ? 2 : 1;
            if (!this.hasValidMoves(this.currentPlayer, this.board)) {
                this.showGameOver();
            } else {
                this.updateStatus();
            }
        }
    },

    // ---------- MOVE VALIDITY ----------
    isValidMove: function(row, col, player, board) {
        const size = this.size;
        if (row < 0 || row >= size || col < 0 || col >= size) return false;
        if (board[row][col] !== 0) return false;
        const flips = this.getFlips(row, col, player, board);
        return flips && flips.length > 0;
    },

    getFlips: function(row, col, player, board) {
        const size = this.size;
        const directions = [[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]];
        const opponent = player === 1 ? 2 : 1;
        let flips = [];
        for (let [dx, dy] of directions) {
            let r = row + dx, c = col + dy;
            let temp = [];
            while (r >= 0 && r < size && c >= 0 && c < size && board[r][c] === opponent) {
                temp.push([r, c]);
                r += dx;
                c += dy;
            }
            if (r >= 0 && r < size && c >= 0 && c < size && board[r][c] === player) {
                flips = flips.concat(temp);
            }
        }
        return flips;
    },

    hasValidMoves: function(player, board) {
        const size = this.size;
        for (let r = 0; r < size; r++) {
            for (let c = 0; c < size; c++) {
                if (this.isValidMove(r, c, player, board)) return true;
            }
        }
        return false;
    },

    getValidMoves: function(player, board) {
        const size = this.size;
        const moves = [];
        for (let r = 0; r < size; r++) {
            for (let c = 0; c < size; c++) {
                if (this.isValidMove(r, c, player, board)) {
                    moves.push({row: r, col: c});
                }
            }
        }
        return moves;
    },

    // ---------- AI STRATEGIES ----------
    getRandomMove: function() {
        const valid = this.getValidMoves(2, this.board);
        return valid.length > 0 ? valid[Math.floor(Math.random() * valid.length)] : null;
    },

    getGreedyMove: function() {
        const valid = this.getValidMoves(2, this.board);
        if (valid.length === 0) return null;
        let best = valid[0];
        let bestScore = -Infinity;
        const size = this.size;
        for (let move of valid) {
            const flips = this.getFlips(move.row, move.col, 2, this.board);
            let score = flips.length;
            if ((move.row === 0 || move.row === size-1) && (move.col === 0 || move.col === size-1)) score += 10;
            if (move.row === 0 || move.row === size-1 || move.col === 0 || move.col === size-1) score += 3;
            if (score > bestScore) {
                bestScore = score;
                best = move;
            }
        }
        return best;
    },

    getBestMinimaxMove: function() {
        const valid = this.getValidMoves(2, this.board);
        if (valid.length === 0) return null;
        let bestMove = valid[0];
        let bestScore = -Infinity;
        const depth = this.size <= 8 ? 4 : (this.size === 10 ? 3 : 2);
        for (let move of valid) {
            const simulatedBoard = this.simulateMove(move.row, move.col, 2, this.board);
            const score = this.minimax(simulatedBoard, depth, -Infinity, Infinity, false, 1);
            if (score > bestScore) {
                bestScore = score;
                bestMove = move;
            }
        }
        return bestMove;
    },

    simulateMove: function(row, col, player, board) {
        const newBoard = board.map(row => [...row]);
        const flips = this.getFlips(row, col, player, newBoard);
        if (!flips || flips.length === 0) return newBoard;
        newBoard[row][col] = player;
        flips.forEach(([r, c]) => { newBoard[r][c] = player; });
        return newBoard;
    },

    minimax: function(board, depth, alpha, beta, isMaximizing, player) {
        const opponent = player === 1 ? 2 : 1;
        if (depth === 0) {
            return this.evaluateBoard(board, 2);
        }
        const validMoves = this.getValidMoves(isMaximizing ? 2 : 1, board);
        if (validMoves.length === 0) {
            if (this.getValidMoves(isMaximizing ? 1 : 2, board).length === 0) {
                let black=0, white=0;
                for (let r=0; r<this.size; r++) for (let c=0; c<this.size; c++) {
                    if (board[r][c]===1) black++;
                    else if (board[r][c]===2) white++;
                }
                return black > white ? 100000 : (white > black ? -100000 : 0);
            } else {
                return this.minimax(board, depth-1, alpha, beta, !isMaximizing, opponent);
            }
        }

        if (isMaximizing) {
            let maxEval = -Infinity;
            for (let move of validMoves) {
                const newBoard = this.simulateMove(move.row, move.col, 2, board);
                const evalScore = this.minimax(newBoard, depth-1, alpha, beta, false, opponent);
                maxEval = Math.max(maxEval, evalScore);
                alpha = Math.max(alpha, evalScore);
                if (beta <= alpha) break;
            }
            return maxEval;
        } else {
            let minEval = Infinity;
            for (let move of validMoves) {
                const newBoard = this.simulateMove(move.row, move.col, 1, board);
                const evalScore = this.minimax(newBoard, depth-1, alpha, beta, true, opponent);
                minEval = Math.min(minEval, evalScore);
                beta = Math.min(beta, evalScore);
                if (beta <= alpha) break;
            }
            return minEval;
        }
    },

    evaluateBoard: function(board, piece) {
        let score = 0;
        const size = this.size;
        for (let r=0; r<size; r++) {
            for (let c=0; c<size; c++) {
                if (board[r][c] === piece) {
                    score += 1;
                    if ((r===0 || r===size-1) && (c===0 || c===size-1)) score += 5;
                    else if (r===0 || r===size-1 || c===0 || c===size-1) score += 2;
                } else if (board[r][c] === (piece === 1 ? 2 : 1)) {
                    score -= 1;
                }
            }
        }
        return score;
    }
};
