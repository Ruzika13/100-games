// games/tictactoe_v2.js
// Tic-Tac-Toe V2: Disappearing Pieces
// - 4x4 board
// - Get 3 in a row to win
// - Each player can have max 4 pieces. Placing a 5th removes the oldest.

const TicTacToeV2 = {
    BOARD_SIZE: 4,
    WIN_COUNT: 3,
    MAX_PIECES: 4,

    board: [],
    moveHistory: { X: [], O: [] }, // FIFO queue per player
    currentPlayer: 'X',
    gameMode: 'local',
    isGameActive: false,
    myOnlineSymbol: 'X',

    // ---------- LIFECYCLE ----------
    init: function() {
        this.resetBoard();
    },

    start: function(mode) {
        this.gameMode = mode;
        document.getElementById('ttt-v2-online-menu')?.classList.add('hidden');
        this.resetBoard();

        let modeText = mode.replace('ai-', 'vs AI (').replace('local', 'Local 2-Player').replace('online-', 'Online (');
        if (mode.includes('ai') || mode.includes('online')) modeText += ')';
        document.getElementById('ttt-v2-status').innerText = `Mode: ${modeText} | Player X's Turn`;
        document.getElementById('ttt-v2-status').style.color = 'var(--text)';
    },

    showOnlineMenu: function() {
        document.getElementById('ttt-v2-online-menu')?.classList.remove('hidden');
        document.getElementById('ttt-v2-status').innerText = "Online Multiplayer Setup";
    },

    resetBoard: function() {
        // Clear board
        this.board = Array.from({ length: this.BOARD_SIZE }, () =>
            Array(this.BOARD_SIZE).fill(null)
        );
        this.moveHistory = { X: [], O: [] };
        this.currentPlayer = 'X';
        this.isGameActive = true;

        this.renderBoard();

        if (this.gameMode.includes('online-join')) {
            document.getElementById('ttt-v2-status').innerText = "Waiting for Host (X) to start...";
        } else {
            document.getElementById('ttt-v2-status').innerText = `Player ${this.currentPlayer}'s Turn (max ${this.MAX_PIECES} pieces)`;
        }
        App.broadcastRestart();
    },

    cleanup: function() {
        this.isGameActive = false;
        if (App.conn) App.conn.close();
    },

    // ---------- RENDER ----------
    renderBoard: function() {
        const boardEl = document.getElementById('ttt-v2-board');
        if (!boardEl) return;
        boardEl.innerHTML = '';

        for (let r = 0; r < this.BOARD_SIZE; r++) {
            for (let c = 0; c < this.BOARD_SIZE; c++) {
                const cell = document.createElement('div');
                cell.className = 'ttt-v2-cell';
                cell.dataset.row = r;
                cell.dataset.col = c;

                const val = this.board[r][c];
                if (val) {
                    cell.innerText = val;
                    cell.classList.add(val.toLowerCase());
                }

                cell.onclick = () => this.handleCellClick(r, c);
                boardEl.appendChild(cell);
            }
        }

        // Update status with piece counts
        const xCount = this.moveHistory.X.length;
        const oCount = this.moveHistory.O.length;
        document.getElementById('ttt-v2-status').innerText =
            `Player ${this.currentPlayer}'s Turn | X: ${xCount}/${this.MAX_PIECES} | O: ${oCount}/${this.MAX_PIECES}`;
    },

    // ---------- CLICK HANDLING ----------
    handleCellClick: function(row, col) {
        if (!this.isGameActive) return;
        if (this.gameMode.includes('online') && this.currentPlayer !== this.myOnlineSymbol) return;
        if (this.board[row][col] !== null) return; // cell occupied

        this.makeMove(row, col, this.currentPlayer, true);
    },

    // ---------- MOVE LOGIC (The core "disappearing" rule) ----------
    makeMove: function(row, col, player, shouldBroadcast) {
        // 1. Place the piece
        this.board[row][col] = player;

        // 2. Add to history (FIFO queue)
        this.moveHistory[player].push({ row, col });

        // 3. If player has more than MAX_PIECES, remove the oldest
        if (this.moveHistory[player].length > this.MAX_PIECES) {
            const removed = this.moveHistory[player].shift();
            this.board[removed.row][removed.col] = null;
        }

        // 4. Check win condition
        if (this.checkWin(player)) {
            this.isGameActive = false;
            document.getElementById('ttt-v2-status').innerText = `🎉 Player ${player} Wins!`;
            document.getElementById('ttt-v2-status').style.color = 'var(--win)';
            this.renderBoard();
            return;
        }

        // 5. Check draw – board full (no empty cells)
        let hasEmpty = false;
        for (let r = 0; r < this.BOARD_SIZE; r++) {
            for (let c = 0; c < this.BOARD_SIZE; c++) {
                if (this.board[r][c] === null) hasEmpty = true;
            }
        }
        if (!hasEmpty) {
            this.isGameActive = false;
            document.getElementById('ttt-v2-status').innerText = `🤝 It's a Draw!`;
            document.getElementById('ttt-v2-status').style.color = '#fbbf24';
            this.renderBoard();
            return;
        }

        // 6. Switch player
        this.currentPlayer = this.currentPlayer === 'X' ? 'O' : 'X';

        // 7. Broadcast if online
        if (shouldBroadcast && this.gameMode.includes('online')) {
            App.broadcastMove({
                type: 'move',
                row: row,
                col: col,
                player: player
            });
        }

        // 8. Re-render and update status
        this.renderBoard();

        if (this.gameMode.includes('online')) {
            document.getElementById('ttt-v2-status').innerText =
                this.currentPlayer === this.myOnlineSymbol ? "Your Turn!" : "Opponent's Turn...";
        }

        // 9. AI turn
        if (this.gameMode.startsWith('ai') && this.currentPlayer === 'O' && this.isGameActive) {
            setTimeout(() => this.makeAIMove(), 500);
        }
    },

    // ---------- WIN CHECKS (3 in a row on 4x4) ----------
    checkWin: function(player) {
        const size = this.BOARD_SIZE;
        const win = this.WIN_COUNT;

        // Horizontal
        for (let r = 0; r < size; r++) {
            for (let c = 0; c <= size - win; c++) {
                let count = 0;
                for (let i = 0; i < win; i++) {
                    if (this.board[r][c + i] === player) count++;
                }
                if (count === win) return true;
            }
        }

        // Vertical
        for (let c = 0; c < size; c++) {
            for (let r = 0; r <= size - win; r++) {
                let count = 0;
                for (let i = 0; i < win; i++) {
                    if (this.board[r + i][c] === player) count++;
                }
                if (count === win) return true;
            }
        }

        // Diagonal (top-left to bottom-right)
        for (let r = 0; r <= size - win; r++) {
            for (let c = 0; c <= size - win; c++) {
                let count = 0;
                for (let i = 0; i < win; i++) {
                    if (this.board[r + i][c + i] === player) count++;
                }
                if (count === win) return true;
            }
        }

        // Diagonal (top-right to bottom-left)
        for (let r = 0; r <= size - win; r++) {
            for (let c = win - 1; c < size; c++) {
                let count = 0;
                for (let i = 0; i < win; i++) {
                    if (this.board[r + i][c - i] === player) count++;
                }
                if (count === win) return true;
            }
        }

        return false;
    },

    // ---------- AI (Heuristic) ----------
    makeAIMove: function() {
        if (!this.isGameActive) return;

        const validMoves = this.getValidMoves();
        if (validMoves.length === 0) return;

        let move;
        if (this.gameMode === 'ai-easy') {
            move = validMoves[Math.floor(Math.random() * validMoves.length)];
        } else if (this.gameMode === 'ai-hard') {
            move = this.getSmartMove(validMoves);
        } else {
            move = this.getSmartMove(validMoves); // Can add minimax later, but FIFO makes it tricky
        }

        if (move) {
            this.makeMove(move.row, move.col, 'O', false);
        }
    },

    getValidMoves: function() {
        const moves = [];
        for (let r = 0; r < this.BOARD_SIZE; r++) {
            for (let c = 0; c < this.BOARD_SIZE; c++) {
                if (this.board[r][c] === null) moves.push({ row: r, col: c });
            }
        }
        return moves;
    },

    getSmartMove: function(validMoves) {
        // 1. Win immediately
        for (let move of validMoves) {
            const boardCopy = this.board.map(row => [...row]);
            boardCopy[move.row][move.col] = 'O';
            // We need a way to check win without mutating state – use a helper
            if (this.simulateWin(boardCopy, 'O')) return move;
        }
        // 2. Block opponent
        for (let move of validMoves) {
            const boardCopy = this.board.map(row => [...row]);
            boardCopy[move.row][move.col] = 'X';
            if (this.simulateWin(boardCopy, 'X')) return move;
        }
        // 3. Prefer center area
        const center = validMoves.filter(m => m.row >= 1 && m.row <= 2 && m.col >= 1 && m.col <= 2);
        if (center.length > 0) return center[Math.floor(Math.random() * center.length)];
        // 4. Random
        return validMoves[Math.floor(Math.random() * validMoves.length)];
    },

    simulateWin: function(board, player) {
        const size = this.BOARD_SIZE;
        const win = this.WIN_COUNT;
        // Same logic as checkWin but on a passed board
        for (let r = 0; r < size; r++) {
            for (let c = 0; c <= size - win; c++) {
                let count = 0;
                for (let i = 0; i < win; i++) if (board[r][c + i] === player) count++;
                if (count === win) return true;
            }
        }
        for (let c = 0; c < size; c++) {
            for (let r = 0; r <= size - win; r++) {
                let count = 0;
                for (let i = 0; i < win; i++) if (board[r + i][c] === player) count++;
                if (count === win) return true;
            }
        }
        for (let r = 0; r <= size - win; r++) {
            for (let c = 0; c <= size - win; c++) {
                let count = 0;
                for (let i = 0; i < win; i++) if (board[r + i][c + i] === player) count++;
                if (count === win) return true;
            }
        }
        for (let r = 0; r <= size - win; r++) {
            for (let c = win - 1; c < size; c++) {
                let count = 0;
                for (let i = 0; i < win; i++) if (board[r + i][c - i] === player) count++;
                if (count === win) return true;
            }
        }
        return false;
    }
};
