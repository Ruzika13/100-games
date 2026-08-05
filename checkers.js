const Checkers = {
    SIZE: 8,
    board: [],
    currentPlayer: 1, // 1 = Black (Player 1), 2 = White (Player 2)
    gameMode: 'local',
    isGameActive: false,
    myOnlineSymbol: 1,
    isProcessingMove: false,
    selectedRow: null,
    selectedCol: null,
    validMoves: [],
    mandatoryJump: null, // { row, col } if a jump is mandatory

    // ---------- INIT ----------
    init: function() {
        this.board = [];
        this.currentPlayer = 1;
        this.isGameActive = false;
        this.isProcessingMove = false;
        this.selectedRow = null;
        this.selectedCol = null;
        this.validMoves = [];
        this.mandatoryJump = null;
        this.renderBoard();
        document.getElementById('checkers-status-text').innerText = "Choose a mode to start";
        document.getElementById('checkers-status-text').style.color = 'var(--text)';
        document.getElementById('checkers-online-menu').classList.add('hidden');
    },

    // ---------- START ----------
    start: function(mode) {
        this.gameMode = mode;
        this.isProcessingMove = false;
        document.getElementById('checkers-online-menu').classList.add('hidden');
        this.resetBoard(true);

        if (mode === 'online-host') {
            this.myOnlineSymbol = 1; // Black
            document.getElementById('checkers-status-text').innerText = "You are Black (Host). Waiting for opponent...";
            document.getElementById('checkers-status-text').style.color = 'var(--text)';
        } else if (mode === 'online-join') {
            this.myOnlineSymbol = 2; // White
            document.getElementById('checkers-status-text').innerText = "You are White (Joiner). Waiting for host to start...";
            document.getElementById('checkers-status-text').style.color = 'var(--text)';
        } else {
            this.myOnlineSymbol = 1;
            let modeText = mode.replace('ai-', 'vs AI (').replace('local', 'Local 2-Player') + (mode.includes('ai') ? ')' : '');
            document.getElementById('checkers-status-text').innerText = `Mode: ${modeText} | Black's Turn`;
            document.getElementById('checkers-status-text').style.color = 'var(--text)';
        }
    },

    // ---------- ONLINE MENU ----------
    showOnlineMenu: function() {
        document.getElementById('checkers-online-menu').classList.remove('hidden');
        document.getElementById('checkers-status-text').innerText = "Online Multiplayer Setup";
    },

    // ---------- RESET ----------
    resetBoard: function(fromRemote = false) {
        this.board = Array(this.SIZE).fill(null).map(() => Array(this.SIZE).fill(0));
        // Set up initial pieces
        for (let r = 0; r < 3; r++) {
            for (let c = 0; c < this.SIZE; c++) {
                if ((r + c) % 2 === 1) {
                    this.board[r][c] = 1; // Black (Player 1)
                }
            }
        }
        for (let r = 5; r < 8; r++) {
            for (let c = 0; c < this.SIZE; c++) {
                if ((r + c) % 2 === 1) {
                    this.board[r][c] = 2; // White (Player 2)
                }
            }
        }

        this.currentPlayer = 1;
        this.isGameActive = true;
        this.isProcessingMove = false;
        this.selectedRow = null;
        this.selectedCol = null;
        this.validMoves = [];
        this.mandatoryJump = null;
        this.renderBoard();

        if (!this.gameMode.includes('online')) {
            document.getElementById('checkers-status-text').innerText = "Black's Turn";
            document.getElementById('checkers-status-text').style.color = 'var(--text)';
        } else {
            if (this.gameMode === 'online-host' && this.myOnlineSymbol === 1) {
                document.getElementById('checkers-status-text').innerText = "Your Turn (Black)";
            } else if (this.gameMode === 'online-join' && this.myOnlineSymbol === 2) {
                document.getElementById('checkers-status-text').innerText = "Waiting for host (Black)...";
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
        const boardEl = document.getElementById('checkers-board');
        boardEl.innerHTML = '';
        boardEl.style.gridTemplateColumns = `repeat(${this.SIZE}, 1fr)`;

        for (let r = 0; r < this.SIZE; r++) {
            for (let c = 0; c < this.SIZE; c++) {
                const cell = document.createElement('div');
                cell.className = 'checkers-cell';
                const isDark = (r + c) % 2 === 1;
                if (isDark) cell.classList.add('dark');
                else cell.classList.add('light');

                const piece = this.board[r][c];
                if (piece !== 0) {
                    const pieceEl = document.createElement('div');
                    pieceEl.className = `checkers-piece ${piece === 1 ? 'black' : 'white'}`;
                    if (this.isKing(r, c)) pieceEl.classList.add('king');
                    cell.appendChild(pieceEl);
                }

                // Highlight selected piece
                if (this.selectedRow === r && this.selectedCol === c) {
                    cell.classList.add('selected');
                }
                // Highlight valid moves
                if (this.validMoves.some(m => m.row === r && m.col === c)) {
                    cell.classList.add('valid-move');
                }

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

        const piece = this.board[row][col];

        // If a mandatory jump exists, force it
        if (this.mandatoryJump) {
            const jump = this.mandatoryJump;
            // If clicking on a valid jump destination, execute it
            if (this.validMoves.some(m => m.row === row && m.col === col && m.isJump)) {
                this.executeJump(row, col);
                return;
            }
            // If clicking on the piece that must jump, re-select it
            if (this.selectedRow === jump.row && this.selectedCol === jump.col) {
                // already selected, do nothing
                return;
            }
            // If clicking on another piece that also has a jump, we could allow re-selection
            // but we'll keep it simple: must perform the mandatory jump.
            return;
        }

        // If no piece selected, and we clicked a valid piece for current player
        if (this.selectedRow === null) {
            if (piece === this.currentPlayer || (piece === this.currentPlayer + 2)) { // piece or king
                this.selectedRow = row;
                this.selectedCol = col;
                this.validMoves = this.getValidMoves(row, col);
                this.renderBoard();
            }
            return;
        }

        // If we have a selected piece and we click on a valid move destination
        if (this.validMoves.some(m => m.row === row && m.col === col)) {
            const move = this.validMoves.find(m => m.row === row && m.col === col);
            if (move.isJump) {
                this.executeJump(row, col);
            } else {
                this.executeMove(row, col);
            }
            return;
        }

        // Click on another own piece – re-select
        if (piece === this.currentPlayer || (piece === this.currentPlayer + 2)) {
            this.selectedRow = row;
            this.selectedCol = col;
            this.validMoves = this.getValidMoves(row, col);
            this.renderBoard();
            return;
        }

        // Click elsewhere – deselect
        this.selectedRow = null;
        this.selectedCol = null;
        this.validMoves = [];
        this.renderBoard();
    },

    // ---------- MOVE EXECUTION ----------
    executeMove: function(toRow, toCol) {
        const fromRow = this.selectedRow;
        const fromCol = this.selectedCol;
        const player = this.board[fromRow][fromCol];
        // Move piece
        this.board[toRow][toCol] = player;
        this.board[fromRow][fromCol] = 0;
        // King promotion
        this.promoteIfNeeded(toRow, toCol);

        // Clear selection
        this.selectedRow = null;
        this.selectedCol = null;
        this.validMoves = [];

        // Broadcast move
        if (this.gameMode.includes('online')) {
            App.broadcastMove({
                type: 'move',
                fromRow: fromRow,
                fromCol: fromCol,
                toRow: toRow,
                toCol: toCol,
                player: player
            });
        }

        this.endTurn();
    },

    executeJump: function(toRow, toCol) {
        const fromRow = this.selectedRow;
        const fromCol = this.selectedCol;
        const player = this.board[fromRow][fromCol];
        const midRow = (fromRow + toRow) / 2;
        const midCol = (fromCol + toCol) / 2;
        const captured = this.board[midRow][midCol];
        if (captured === 0) return; // should not happen

        // Move piece
        this.board[toRow][toCol] = player;
        this.board[fromRow][fromCol] = 0;
        this.board[midRow][midCol] = 0; // remove captured piece

        // King promotion
        this.promoteIfNeeded(toRow, toCol);

        // Check for further jumps (multi-jump)
        const furtherJumps = this.getValidJumps(toRow, toCol);
        if (furtherJumps.length > 0) {
            // Must continue jumping
            this.selectedRow = toRow;
            this.selectedCol = toCol;
            this.validMoves = furtherJumps;
            this.mandatoryJump = { row: toRow, col: toCol };
            this.renderBoard();
            // Broadcast move for the jump (but not end turn yet)
            if (this.gameMode.includes('online')) {
                App.broadcastMove({
                    type: 'move',
                    fromRow: fromRow,
                    fromCol: fromCol,
                    toRow: toRow,
                    toCol: toCol,
                    player: player
                });
            }
            return;
        }

        // No further jumps – end turn
        this.mandatoryJump = null;
        this.selectedRow = null;
        this.selectedCol = null;
        this.validMoves = [];
        if (this.gameMode.includes('online')) {
            App.broadcastMove({
                type: 'move',
                fromRow: fromRow,
                fromCol: fromCol,
                toRow: toRow,
                toCol: toCol,
                player: player
            });
        }
        this.endTurn();
    },

    endTurn: function() {
        this.currentPlayer = this.currentPlayer === 1 ? 2 : 1;
        this.renderBoard();

        // Check for game over (no moves)
        if (!this.hasValidMoves(this.currentPlayer)) {
            this.isGameActive = false;
            const winner = this.currentPlayer === 1 ? "White" : "Black";
            document.getElementById('checkers-status-text').innerText = `🏆 ${winner} Wins!`;
            document.getElementById('checkers-status-text').style.color = 'var(--win)';
            return;
        }

        // Update status
        if (!this.gameMode.includes('online')) {
            document.getElementById('checkers-status-text').innerText = this.currentPlayer === 1 ? "Black's Turn" : "White's Turn";
            document.getElementById('checkers-status-text').style.color = 'var(--text)';
        } else {
            if (this.currentPlayer === this.myOnlineSymbol) {
                document.getElementById('checkers-status-text').innerText = "Your Turn!";
                document.getElementById('checkers-status-text').style.color = 'var(--text)';
            } else {
                document.getElementById('checkers-status-text').innerText = "Opponent's Turn...";
                document.getElementById('checkers-status-text').style.color = '#94a3b8';
            }
        }

        // AI turn if applicable
        if (this.gameMode.startsWith('ai') && this.currentPlayer === 2 && this.isGameActive) {
            this.isProcessingMove = true;
            setTimeout(() => {
                this.makeAIMove();
            }, 600);
        } else {
            this.isProcessingMove = false;
        }
    },

    // ---------- MOVE GENERATION ----------
    isKing: function(row, col) {
        const piece = this.board[row][col];
        return piece > 2; // 3 = black king, 4 = white king
    },

    getValidMoves: function(row, col) {
        const moves = [];
        const jumps = this.getValidJumps(row, col);
        if (jumps.length > 0) {
            // If jumps exist, only jumps are allowed
            return jumps;
        }
        const piece = this.board[row][col];
        const player = piece % 2 === 1 ? 1 : 2; // odd = black (1), even = white (2) – but with kings 3,4
        const isKing = piece > 2;
        const directions = this.getDirections(player, isKing);

        for (let [dr, dc] of directions) {
            const newR = row + dr;
            const newC = col + dc;
            if (newR < 0 || newR >= this.SIZE || newC < 0 || newC >= this.SIZE) continue;
            if (this.board[newR][newC] === 0) {
                moves.push({ row: newR, col: newC, isJump: false });
            }
        }
        return moves;
    },

    getValidJumps: function(row, col) {
        const jumps = [];
        const piece = this.board[row][col];
        const player = piece % 2 === 1 ? 1 : 2;
        const isKing = piece > 2;
        const directions = this.getDirections(player, isKing);

        for (let [dr, dc] of directions) {
            const midR = row + dr;
            const midC = col + dc;
            if (midR < 0 || midR >= this.SIZE || midC < 0 || midC >= this.SIZE) continue;
            const midPiece = this.board[midR][midC];
            if (midPiece === 0) continue;
            const midPlayer = midPiece % 2 === 1 ? 1 : 2;
            if (midPlayer === player) continue; // can't jump own piece

            const landR = row + 2 * dr;
            const landC = col + 2 * dc;
            if (landR < 0 || landR >= this.SIZE || landC < 0 || landC >= this.SIZE) continue;
            if (this.board[landR][landC] === 0) {
                jumps.push({ row: landR, col: landC, isJump: true, captured: { row: midR, col: midC } });
            }
        }
        return jumps;
    },

    getDirections: function(player, isKing) {
        if (player === 1) { // Black moves down (row+)
            return isKing ? [[1,1],[1,-1],[-1,1],[-1,-1]] : [[1,1],[1,-1]];
        } else { // White moves up (row-)
            return isKing ? [[1,1],[1,-1],[-1,1],[-1,-1]] : [[-1,1],[-1,-1]];
        }
    },

    hasValidMoves: function(player) {
        for (let r = 0; r < this.SIZE; r++) {
            for (let c = 0; c < this.SIZE; c++) {
                const piece = this.board[r][c];
                if (piece === 0) continue;
                const piecePlayer = piece % 2 === 1 ? 1 : 2;
                if (piecePlayer === player) {
                    if (this.getValidMoves(r, c).length > 0) return true;
                }
            }
        }
        return false;
    },

    promoteIfNeeded: function(row, col) {
        const piece = this.board[row][col];
        if (piece === 1 && row === this.SIZE - 1) {
            this.board[row][col] = 3; // black king
        } else if (piece === 2 && row === 0) {
            this.board[row][col] = 4; // white king
        }
    },

    // ---------- AI ----------
    makeAIMove: function() {
        if (!this.isGameActive || !this.gameMode.startsWith('ai')) {
            this.isProcessingMove = false;
            return;
        }

        // Gather all valid moves for AI (player 2 = White)
        let allMoves = [];
        for (let r = 0; r < this.SIZE; r++) {
            for (let c = 0; c < this.SIZE; c++) {
                const piece = this.board[r][c];
                if (piece === 0) continue;
                const piecePlayer = piece % 2 === 1 ? 1 : 2;
                if (piecePlayer === 2) {
                    const moves = this.getValidMoves(r, c);
                    for (let m of moves) {
                        allMoves.push({
                            fromRow: r,
                            fromCol: c,
                            toRow: m.row,
                            toCol: m.col,
                            isJump: m.isJump,
                            captured: m.captured || null
                        });
                    }
                }
            }
        }

        if (allMoves.length === 0) {
            this.isProcessingMove = false;
            return;
        }

        // AI difficulty
        let chosenMove;
        if (this.gameMode === 'ai-easy') {
            // Random move
            chosenMove = allMoves[Math.floor(Math.random() * allMoves.length)];
        } else {
            // Greedy: prefer jumps, then kings, then random
            let score = -Infinity;
            for (let move of allMoves) {
                let moveScore = move.isJump ? 5 : 1;
                // Kings are good
                if (this.board[move.fromRow][move.fromCol] === 2) moveScore += 2;
                // Simulate to see if we get a king
                const targetRow = move.toRow;
                const targetCol = move.toCol;
                if (targetRow === 0 && move.isJump) moveScore += 3; // promotion via jump
                else if (targetRow === 0) moveScore += 1;
                if (moveScore > score) {
                    score = moveScore;
                    chosenMove = move;
                }
            }
            // Slight randomness in hard mode to avoid perfect play
            if (this.gameMode === 'ai-hard' && Math.random() < 0.2) {
                chosenMove = allMoves[Math.floor(Math.random() * allMoves.length)];
            }
        }

        // Execute move
        this.selectedRow = chosenMove.fromRow;
        this.selectedCol = chosenMove.fromCol;
        this.validMoves = [{ row: chosenMove.toRow, col: chosenMove.toCol, isJump: chosenMove.isJump }];
        this.isProcessingMove = false;
        if (chosenMove.isJump) {
            this.executeJump(chosenMove.toRow, chosenMove.toCol);
        } else {
            this.executeMove(chosenMove.toRow, chosenMove.toCol);
        }
        // After move, clear selection (endTurn will render)
    }
};
