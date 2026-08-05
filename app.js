const App = {
    peer: null,
    conn: null,
    currentGame: null,
    activeOnlineGame: null,
    connectionTimeout: null,

    // ---------- VIEW SWITCHING ----------
    showView: function(viewId) {
        console.log('Switching to view:', viewId);

        // Cleanup previous game
        try {
            if (this.currentGame === 'tictactoe' && typeof TicTacToe !== 'undefined') {
                TicTacToe.cleanup();
            }
            if (this.currentGame === 'connect4' && typeof Connect4 !== 'undefined') {
                Connect4.cleanup();
            }
            if (this.currentGame === 'othello' && typeof Othello !== 'undefined') {
                Othello.cleanup();
            }
            if (this.currentGame === 'checkers' && typeof Checkers !== 'undefined') {
                Checkers.cleanup();
            }
            if (this.currentGame === 'gomoku' && typeof Gomoku !== 'undefined') {
                Gomoku.cleanup();
            }
        } catch (e) {
            console.error('Cleanup error:', e);
        }

        this.currentGame = null;
        document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));

        const targetView = document.getElementById(viewId);
        if (targetView) {
            targetView.classList.add('active');
        }

        // Initialize new game
        try {
            if (viewId === 'game-ttt') {
                this.currentGame = 'tictactoe';
                if (typeof TicTacToe !== 'undefined') TicTacToe.init();
            } else if (viewId === 'game-c4') {
                this.currentGame = 'connect4';
                if (typeof Connect4 !== 'undefined') Connect4.init();
            } else if (viewId === 'game-othello') {
                this.currentGame = 'othello';
                if (typeof Othello !== 'undefined') Othello.init();
            } else if (viewId === 'game-checkers') {
                this.currentGame = 'checkers';
                if (typeof Checkers !== 'undefined') Checkers.init();
            } else if (viewId === 'game-gomoku') {
                this.currentGame = 'gomoku';
                if (typeof Gomoku !== 'undefined') Gomoku.init();
            }
        } catch (e) {
            console.error('Game init error:', e);
        }
    },

    // ---------- PEERJS INIT (with TURN servers) ----------
    initPeer: function() {
        if (this.peer) return;

        const peerConfig = {
            debug: 2,
            config: {
                iceServers: [
                    { urls: 'stun:stun.l.google.com:19302' },
                    { urls: 'stun:stun1.l.google.com:19302' },
                    { urls: 'stun:stun2.l.google.com:19302' },
                    {
                        urls: 'turn:openrelay.metered.ca:80',
                        username: 'openrelayproject',
                        credential: 'openrelayproject'
                    },
                    {
                        urls: 'turn:openrelay.metered.ca:443',
                        username: 'openrelayproject',
                        credential: 'openrelayproject'
                    }
                ]
            }
        };

        this.peer = new Peer(null, peerConfig);

        this.peer.on('open', (id) => {
            console.log('Peer ID:', id);
        });

        this.peer.on('error', (err) => {
            console.error('Peer error:', err);
            const statusEl = this.getStatusElement();
            if (statusEl) {
                statusEl.innerHTML = `❌ Error: ${err.type}<br><small>Try refreshing the page</small>`;
                statusEl.style.color = '#ef4444';
            }
        });

        this.peer.on('disconnected', () => {
            console.log('Peer disconnected, attempting to reconnect...');
            this.peer.reconnect();
        });
    },

    // ---------- UI HELPERS ----------
    getStatusElement: function() {
        const prefix = this.activeOnlineGame === 'c4' ? 'c4-' :
                       this.activeOnlineGame === 'othello' ? 'o-' :
                       this.activeOnlineGame === 'checkers' ? 'checkers-' :
                       this.activeOnlineGame === 'gomoku' ? 'gomoku-' : '';
        return document.getElementById(`${prefix}online-status`);
    },

    getRoomCodeElement: function() {
        const prefix = this.activeOnlineGame === 'c4' ? 'c4-' :
                       this.activeOnlineGame === 'othello' ? 'o-' :
                       this.activeOnlineGame === 'checkers' ? 'checkers-' :
                       this.activeOnlineGame === 'gomoku' ? 'gomoku-' : '';
        return document.getElementById(`${prefix}room-code-display`);
    },

    // ---------- HOST GAME ----------
    hostGame: function(gameType = 'ttt') {
        this.activeOnlineGame = gameType;
        this.initPeer();

        const statusEl = this.getStatusElement();
        const codeEl = this.getRoomCodeElement();

        // Generate a 6‑character room code
        const code = Math.random().toString(36).substring(2, 8).toUpperCase();

        if (statusEl) {
            statusEl.innerHTML = '🔄 Creating game server...';
            statusEl.style.color = '#fbbf24';
        }

        // Destroy old peer if any
        if (this.peer && this.peer.id) {
            this.peer.destroy();
        }

        const peerConfig = {
            debug: 2,
            config: {
                iceServers: [
                    { urls: 'stun:stun.l.google.com:19302' },
                    { urls: 'stun:stun1.l.google.com:19302' },
                    {
                        urls: 'turn:openrelay.metered.ca:80',
                        username: 'openrelayproject',
                        credential: 'openrelayproject'
                    },
                    {
                        urls: 'turn:openrelay.metered.ca:443',
                        username: 'openrelayproject',
                        credential: 'openrelayproject'
                    }
                ]
            }
        };

        this.peer = new Peer(code, peerConfig);

        this.peer.on('open', (id) => {
            console.log('Hosting as:', id);
            if (codeEl) codeEl.innerText = id;
            if (statusEl) {
                statusEl.innerHTML = '✅ <strong>Share this code with your friend!</strong><br>Waiting for opponent to join...';
                statusEl.style.color = '#22c55e';
            }
        });

        this.peer.on('connection', (c) => {
            console.log('Opponent connected!');
            this.conn = c;
            this.setupConnection(gameType);

            if (statusEl) {
                statusEl.innerHTML = '✅ <strong>Opponent joined!</strong><br>Starting game...';
                statusEl.style.color = '#22c55e';
            }

            // Start the appropriate game after a short delay
            setTimeout(() => {
                if (gameType === 'c4') {
                    if (typeof Connect4 !== 'undefined') Connect4.start('online-host');
                } else if (gameType === 'othello') {
                    if (typeof Othello !== 'undefined') Othello.start('online-host');
                } else if (gameType === 'checkers') {
                    if (typeof Checkers !== 'undefined') Checkers.start('online-host');
                } else if (gameType === 'gomoku') {
                    if (typeof Gomoku !== 'undefined') Gomoku.start('online-host');
                } else {
                    if (typeof TicTacToe !== 'undefined') TicTacToe.start('online-host');
                }
            }, 500);
        });

        this.peer.on('error', (err) => {
            console.error('Host error:', err);
            if (err.type === 'unavailable-id') {
                if (statusEl) {
                    statusEl.innerHTML = '❌ Code already in use<br>Try again with a different code';
                    statusEl.style.color = '#ef4444';
                }
                // Auto‑retry with a new code
                setTimeout(() => this.hostGame(gameType), 2000);
            } else {
                if (statusEl) {
                    statusEl.innerHTML = `❌ Connection error: ${err.type}`;
                    statusEl.style.color = '#ef4444';
                }
            }
        });

        // Connection timeout (20s)
        if (this.connectionTimeout) clearTimeout(this.connectionTimeout);
        this.connectionTimeout = setTimeout(() => {
            if (!this.conn && statusEl) {
                statusEl.innerHTML += '<br><small>⚠️ Taking long? Check firewall settings</small>';
            }
        }, 20000);
    },

    // ---------- JOIN GAME ----------
    joinGame: function(gameType = 'ttt') {
        this.activeOnlineGame = gameType;

        // Determine the correct prefix for element IDs
        const prefix = gameType === 'c4' ? 'c4-' :
                       gameType === 'othello' ? 'o-' :
                       gameType === 'checkers' ? 'checkers-' :
                       gameType === 'gomoku' ? 'gomoku-' : '';

        const codeInput = document.getElementById(`${prefix}join-code-input`);
        if (!codeInput) {
            console.error('Join code input not found for prefix:', prefix);
            return;
        }
        const code = codeInput.value.toUpperCase().trim();
        const statusEl = this.getStatusElement();

        if (!code || code.length !== 6) {
            alert("Please enter a valid 6‑character code.");
            return;
        }

        if (statusEl) {
            statusEl.innerHTML = '🔄 Connecting to game...';
            statusEl.style.color = '#fbbf24';
        }

        this.initPeer();

        // Give peer time to initialize
        setTimeout(() => {
            console.log('Attempting to connect to:', code);
            this.conn = this.peer.connect(code, {
                reliable: true,
                serialization: 'json'
            });

            this.setupConnection(gameType);

            this.conn.on('open', () => {
                console.log('Connected to host!');
                if (statusEl) {
                    statusEl.innerHTML = '✅ <strong>Connected!</strong><br>Waiting for host to start...';
                    statusEl.style.color = '#22c55e';
                }

                // Start the game once the host starts it
                setTimeout(() => {
                    if (gameType === 'c4') {
                        if (typeof Connect4 !== 'undefined') Connect4.start('online-join');
                    } else if (gameType === 'othello') {
                        if (typeof Othello !== 'undefined') Othello.start('online-join');
                    } else if (gameType === 'checkers') {
                        if (typeof Checkers !== 'undefined') Checkers.start('online-join');
                    } else if (gameType === 'gomoku') {
                        if (typeof Gomoku !== 'undefined') Gomoku.start('online-join');
                    } else {
                        if (typeof TicTacToe !== 'undefined') TicTacToe.start('online-join');
                    }
                }, 500);
            });

            this.conn.on('error', (err) => {
                console.error('Join error:', err);
                if (statusEl) {
                    statusEl.innerHTML = `❌ Connection failed: ${err.type}<br><small>Check the code and try again</small>`;
                    statusEl.style.color = '#ef4444';
                }
            });

            this.conn.on('close', () => {
                console.log('Connection closed');
                if (statusEl) {
                    statusEl.innerHTML = '❌ Connection lost';
                    statusEl.style.color = '#ef4444';
                }
            });
        }, 1000);

        // Timeout warning (20s)
        setTimeout(() => {
            if (!this.conn || !this.conn.open) {
                if (statusEl) {
                    statusEl.innerHTML += '<br><small>⚠️ Can\'t connect? Host may be behind firewall</small>';
                }
            }
        }, 20000);
    },

    // ---------- SET UP CONNECTION ----------
    setupConnection: function(gameType) {
        if (!this.conn) return;

        this.conn.on('data', (data) => {
            console.log('Received data:', data);

            if (data.type === 'move') {
                // Route the move to the correct game
                if (gameType === 'c4') {
                    if (typeof Connect4 !== 'undefined') {
                        Connect4.makeMove(data.col, data.player, false);
                    }
                } else if (gameType === 'othello') {
                    if (typeof Othello !== 'undefined') {
                        Othello.makeMove(data.row, data.col, data.player, false);
                    }
                } else if (gameType === 'checkers') {
                    if (typeof Checkers !== 'undefined') {
                        // Checkers: set selection and execute
                        Checkers.selectedRow = data.fromRow;
                        Checkers.selectedCol = data.fromCol;
                        Checkers.validMoves = [{ row: data.toRow, col: data.toCol, isJump: data.isJump || false }];
                        if (data.isJump) {
                            Checkers.executeJump(data.toRow, data.toCol);
                        } else {
                            Checkers.executeMove(data.toRow, data.toCol);
                        }
                    }
                } else if (gameType === 'gomoku') {
                    if (typeof Gomoku !== 'undefined') {
                        Gomoku.makeMove(data.row, data.col, data.player, false);
                    }
                } else {
                    if (typeof TicTacToe !== 'undefined') {
                        TicTacToe.makeMove(data.index, data.player, false);
                    }
                }
            } else if (data.type === 'restart') {
                // Reset the board on the remote side
                if (gameType === 'c4') {
                    if (typeof Connect4 !== 'undefined') Connect4.resetBoard(true);
                } else if (gameType === 'othello') {
                    if (typeof Othello !== 'undefined') Othello.resetBoard(true);
                } else if (gameType === 'checkers') {
                    if (typeof Checkers !== 'undefined') Checkers.resetBoard(true);
                } else if (gameType === 'gomoku') {
                    if (typeof Gomoku !== 'undefined') Gomoku.resetBoard(true);
                } else {
                    if (typeof TicTacToe !== 'undefined') TicTacToe.resetBoard(true);
                }
            }
        });

        this.conn.on('close', () => {
            console.log('Connection closed by peer');
            const statusEl = this.getStatusElement();
            if (statusEl) {
                statusEl.innerHTML = '❌ Opponent disconnected';
                statusEl.style.color = '#ef4444';
            }
        });
    },

    // ---------- BROADCAST HELPERS ----------
    broadcastMove: function(payload) {
        if (this.conn && this.conn.open) {
            this.conn.send(payload);
        } else {
            console.warn('Cannot send move: connection not open');
        }
    },

    broadcastRestart: function() {
        if (this.conn && this.conn.open) {
            this.conn.send({ type: 'restart' });
        }
    }
};
