// games/checkers.js – clean, no arrow functions
const Checkers = {
    SIZE: 8,
    board: [],
    currentPlayer: 1, // 1 = Black, 2 = White
    gameMode: 'local',
    isGameActive: false,
    isProcessingMove: false,
    selectedRow: null,
    selectedCol: null,
    validMoves: [],
    mandatoryJump: null,

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
        var statusEl = document.getElementById('checkers-status-text');
        if (statusEl) {
            statusEl.innerText = 'Choose a mode to start';
            statusEl.style.color = 'var(--text)';
        }
        var menuEl = document.getElementById('checkers-online-menu');
        if (menuEl) menuEl.classList.add('hidden');
    },

    start: function(mode) {
        this.gameMode = mode;
        this.isProcessingMove = false;
        var menuEl = document.getElementById('checkers-online-menu');
        if (menuEl) menuEl.classList.add('hidden');
        this.resetBoard();
        var statusEl = document.getElementById('checkers-status-text');
        if (statusEl) {
            var modeText = mode.replace('ai-', 'vs AI (').replace('local', 'Local 2-Player');
            if (mode.includes('ai')) modeText += ')';
            statusEl.innerText = 'Mode: ' + modeText + ' | Black\'s Turn';
            statusEl.style.color = 'var(--text)';
        }
    },

    resetBoard: function() {
        this.board = [];
        for (var r = 0; r < this.SIZE; r++) {
            this.board[r] = [];
            for (var c = 0; c < this.SIZE; c++) {
                this.board[r][c] = 0;
            }
        }
        for (r = 0; r < 3; r++) {
            for (c = 0; c < this.SIZE; c++) {
                if ((r + c) % 2 === 1) {
                    this.board[r][c] = 1;
                }
            }
        }
        for (r = 5; r < 8; r++) {
            for (c = 0; c < this.SIZE; c++) {
                if ((r + c) % 2 === 1) {
                    this.board[r][c] = 2;
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
        var statusEl = document.getElementById('checkers-status-text');
        if (statusEl) {
            statusEl.innerText = 'Black\'s Turn';
            statusEl.style.color = 'var(--text)';
        }
    },

    cleanup: function() {
        this.isGameActive = false;
        this.isProcessingMove = false;
    },

    renderBoard: function() {
        var boardEl = document.getElementById('checkers-board');
        if (!boardEl) return;
        boardEl.innerHTML = '';
        boardEl.style.gridTemplateColumns = 'repeat(' + this.SIZE + ', 1fr)';

        for (var r = 0; r < this.SIZE; r++) {
            for (var c = 0; c < this.SIZE; c++) {
                var cell = document.createElement('div');
                cell.className = 'checkers-cell';
                if ((r + c) % 2 === 1) {
                    cell.classList.add('dark');
                } else {
                    cell.classList.add('light');
                }
                var piece = this.board[r][c];
                if (piece !== 0) {
                    var pieceEl = document.createElement('div');
                    pieceEl.className = 'checkers-piece';
                    if (piece === 1) pieceEl.classList.add('black');
                    else if (piece === 2) pieceEl.classList.add('white');
                    if (this.isKing(r, c)) pieceEl.classList.add('king');
                    cell.appendChild(pieceEl);
                }
                if (this.selectedRow === r && this.selectedCol === c) {
                    cell.classList.add('selected');
                }
                if (this.validMoves.some(function(m) { return m.row === r && m.col === c; })) {
                    cell.classList.add('valid-move');
                }
                cell.dataset.row = r;
                cell.dataset.col = c;
                cell.addEventListener('click', (function(row, col) {
                    return function() {
                        Checkers.handleCellClick(row, col);
                    };
                })(r, c));
                boardEl.appendChild(cell);
            }
        }
    },

    handleCellClick: function(row, col) {
        if (this.isProcessingMove || !this.isGameActive) return;
        if (this.gameMode.includes('online')) return; // skip online for now

        var piece = this.board[row][col];

        if (this.mandatoryJump) {
            if (this.validMoves.some(function(m) { return m.row === row && m.col === col && m.isJump; })) {
                this.executeJump(row, col);
                return;
            }
            return;
        }

        if (this.selectedRow === null) {
            if (this.isOwnPiece(row, col)) {
                this.selectedRow = row;
                this.selectedCol = col;
                this.validMoves = this.getValidMoves(row, col);
                this.renderBoard();
            }
            return;
        }

        if (this.validMoves.some(function(m) { return m.row === row && m.col === col; })) {
            var move = this.validMoves.find(function(m) { return m.row === row && m.col === col; });
            if (move.isJump) {
                this.executeJump(row, col);
            } else {
                this.executeMove(row, col);
            }
            return;
        }

        if (this.isOwnPiece(row, col)) {
            this.selectedRow = row;
            this.selectedCol = col;
            this.validMoves = this.getValidMoves(row, col);
            this.renderBoard();
            return;
        }

        this.selectedRow = null;
        this.selectedCol = null;
        this.validMoves = [];
        this.renderBoard();
    },

    isOwnPiece: function(row, col) {
        var piece = this.board[row][col];
        if (piece === 0) return false;
        var player = (piece % 2 === 1) ? 1 : 2;
        return player === this.currentPlayer;
    },

    isKing: function(row, col) {
        var piece = this.board[row][col];
        return piece > 2;
    },

    getValidMoves: function(row, col) {
        var moves = [];
        var jumps = this.getValidJumps(row, col);
        if (jumps.length > 0) return jumps;
        var piece = this.board[row][col];
        var player = (piece % 2 === 1) ? 1 : 2;
        var isKing = piece > 2;
        var directions = this.getDirections(player, isKing);
        for (var d = 0; d < directions.length; d++) {
            var dr = directions[d][0];
            var dc = directions[d][1];
            var newR = row + dr;
            var newC = col + dc;
            if (newR < 0 || newR >= this.SIZE || newC < 0 || newC >= this.SIZE) continue;
            if (this.board[newR][newC] === 0) {
                moves.push({ row: newR, col: newC, isJump: false });
            }
        }
        return moves;
    },

    getValidJumps: function(row, col) {
        var jumps = [];
        var piece = this.board[row][col];
        var player = (piece % 2 === 1) ? 1 : 2;
        var isKing = piece > 2;
        var directions = this.getDirections(player, isKing);
        for (var d = 0; d < directions.length; d++) {
            var dr = directions[d][0];
            var dc = directions[d][1];
            var midR = row + dr;
            var midC = col + dc;
            if (midR < 0 || midR >= this.SIZE || midC < 0 || midC >= this.SIZE) continue;
            var midPiece = this.board[midR][midC];
            if (midPiece === 0) continue;
            var midPlayer = (midPiece % 2 === 1) ? 1 : 2;
            if (midPlayer === player) continue;
            var landR = row + 2 * dr;
            var landC = col + 2 * dc;
            if (landR < 0 || landR >= this.SIZE || landC < 0 || landC >= this.SIZE) continue;
            if (this.board[landR][landC] === 0) {
                jumps.push({ row: landR, col: landC, isJump: true, captured: { row: midR, col: midC } });
            }
        }
        return jumps;
    },

    getDirections: function(player, isKing) {
        if (player === 1) {
            return isKing ? [[1,1],[1,-1],[-1,1],[-1,-1]] : [[1,1],[1,-1]];
        } else {
            return isKing ? [[1,1],[1,-1],[-1,1],[-1,-1]] : [[-1,1],[-1,-1]];
        }
    },

    executeMove: function(toRow, toCol) {
        var fromRow = this.selectedRow;
        var fromCol = this.selectedCol;
        var player = this.board[fromRow][fromCol];
        this.board[toRow][toCol] = player;
        this.board[fromRow][fromCol] = 0;
        this.promoteIfNeeded(toRow, toCol);
        this.selectedRow = null;
        this.selectedCol = null;
        this.validMoves = [];
        this.mandatoryJump = null;
        this.endTurn();
    },

    executeJump: function(toRow, toCol) {
        var fromRow = this.selectedRow;
        var fromCol = this.selectedCol;
        var player = this.board[fromRow][fromCol];
        var midRow = (fromRow + toRow) / 2;
        var midCol = (fromCol + toCol) / 2;
        this.board[toRow][toCol] = player;
        this.board[fromRow][fromCol] = 0;
        this.board[midRow][midCol] = 0;
        this.promoteIfNeeded(toRow, toCol);

        var furtherJumps = this.getValidJumps(toRow, toCol);
        if (furtherJumps.length > 0) {
            this.selectedRow = toRow;
            this.selectedCol = toCol;
            this.validMoves = furtherJumps;
            this.mandatoryJump = { row: toRow, col: toCol };
            this.renderBoard();
            var statusEl = document.getElementById('checkers-status-text');
            if (statusEl) {
                statusEl.innerText = 'Continue jumping!';
                statusEl.style.color = '#fbbf24';
            }
            return;
        }

        this.mandatoryJump = null;
        this.selectedRow = null;
        this.selectedCol = null;
        this.validMoves = [];
        this.endTurn();
    },

    endTurn: function() {
        if (!this.hasValidMoves(this.currentPlayer)) {
            this.isGameActive = false;
            var winner = (this.currentPlayer === 1) ? 'White' : 'Black';
            var statusEl = document.getElementById('checkers-status-text');
            if (statusEl) {
                statusEl.innerText = '🏆 ' + winner + ' Wins!';
                statusEl.style.color = 'var(--win)';
            }
            return;
        }

        this.currentPlayer = (this.currentPlayer === 1) ? 2 : 1;
        this.renderBoard();

        var statusEl = document.getElementById('checkers-status-text');
        if (statusEl) {
            statusEl.innerText = (this.currentPlayer === 1) ? 'Black\'s Turn' : 'White\'s Turn';
            statusEl.style.color = 'var(--text)';
        }

        if (this.gameMode.startsWith('ai') && this.currentPlayer === 2 && this.isGameActive) {
            this.isProcessingMove = true;
            var self = this;
            setTimeout(function() {
                self.makeAIMove();
            }, 500);
        } else {
            this.isProcessingMove = false;
        }
    },

    hasValidMoves: function(player) {
        for (var r = 0; r < this.SIZE; r++) {
            for (var c = 0; c < this.SIZE; c++) {
                var piece = this.board[r][c];
                if (piece === 0) continue;
                var piecePlayer = (piece % 2 === 1) ? 1 : 2;
                if (piecePlayer === player && this.getValidMoves(r, c).length > 0) {
                    return true;
                }
            }
        }
        return false;
    },

    promoteIfNeeded: function(row, col) {
        var piece = this.board[row][col];
        if (piece === 1 && row === this.SIZE - 1) {
            this.board[row][col] = 3; // black king
        } else if (piece === 2 && row === 0) {
            this.board[row][col] = 4; // white king
        }
    },

    makeAIMove: function() {
        if (!this.isGameActive || !this.gameMode.startsWith('ai')) {
            this.isProcessingMove = false;
            return;
        }

        var candidates = [];
        for (var r = 0; r < this.SIZE; r++) {
            for (var c = 0; c < this.SIZE; c++) {
                var piece = this.board[r][c];
                if (piece === 0) continue;
                var piecePlayer = (piece % 2 === 1) ? 1 : 2;
                if (piecePlayer === 2) {
                    var moves = this.getValidMoves(r, c);
                    for (var m = 0; m < moves.length; m++) {
                        candidates.push({
                            fromRow: r,
                            fromCol: c,
                            toRow: moves[m].row,
                            toCol: moves[m].col,
                            isJump: moves[m].isJump,
                            captured: moves[m].captured || null
                        });
                    }
                }
            }
        }

        if (candidates.length === 0) {
            this.isProcessingMove = false;
            return;
        }

        var chosen;
        if (this.gameMode === 'ai-easy') {
            chosen = candidates[Math.floor(Math.random() * candidates.length)];
        } else {
            var bestScore = -1;
            for (var i = 0; i < candidates.length; i++) {
                var move = candidates[i];
                var score = move.isJump ? 10 : 1;
                if (this.board[move.fromRow][move.fromCol] === 2) score += 2;
                if (move.toRow === 0) score += 5;
                if (score > bestScore) {
                    bestScore = score;
                    chosen = move;
                }
            }
            if (this.gameMode === 'ai-hard' && Math.random() < 0.2) {
                chosen = candidates[Math.floor(Math.random() * candidates.length)];
            }
        }

        this.selectedRow = chosen.fromRow;
        this.selectedCol = chosen.fromCol;
        this.validMoves = [{ row: chosen.toRow, col: chosen.toCol, isJump: chosen.isJump }];
        this.isProcessingMove = false;

        if (chosen.isJump) {
            this.executeJump(chosen.toRow, chosen.toCol);
        } else {
            this.executeMove(chosen.toRow, chosen.toCol);
        }
    }
};
