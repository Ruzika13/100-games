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
        document.querySelectorAll('.view').forEach(function(v) {
            v.classList.remove('active');
        });

        var targetView = document.getElementById(viewId);
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

        var peerConfig = {
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

        this.peer.on('open', function(id) {
            console.log('Peer ID:', id);
        });

        this.peer.on('error', function(err) {
            console.error('Peer error:', err);
            var statusEl = App.getStatusElement();
            if (statusEl) {
                statusEl.innerHTML = '❌ Error: ' + err.type + '<br><small>Try refreshing the page</small>';
                statusEl.style.color = '#ef4444';
            }
        });

        this.peer.on('disconnected', function() {
            console.log('Peer disconnected, attempting to reconnect...');
            App.peer.reconnect();
        });
    },

    // ---------- UI HELPERS ----------
    getStatusElement: function() {
        var prefix = '';
        if (this.activeOnlineGame === 'c4') prefix = 'c4-';
        else if (this.activeOnlineGame === 'othello') prefix = 'o-';
        else if (this.activeOnlineGame === 'checkers') prefix = 'checkers-';
        else if (this.activeOnlineGame === 'gomoku') prefix = 'gomoku-';
        return document.getElementById(prefix + 'online-status');
    },

    getRoomCodeElement: function() {
        var prefix = '';
        if (this.activeOnlineGame === 'c4') prefix = 'c4-';
        else if (this.activeOnlineGame === 'othello') prefix = 'o-';
        else if (this.activeOnlineGame === 'checkers') prefix = 'checkers-';
        else if (this.activeOnlineGame === 'gomoku') prefix = 'gomoku-';
        return document.getElementById(prefix + 'room-code-display');
    },

    // ---------- HOST GAME ----------
    hostGame: function(gameType) {
        if (typeof gameType === 'undefined') gameType = 'ttt';
        this.activeOnlineGame = gameType;
        this.initPeer();

        var statusEl = this.getStatusElement();
        var codeEl = this.getRoomCodeElement();

        var code = Math.random().toString(36).substring(2, 8).toUpperCase();

        if (statusEl) {
            statusEl.innerHTML = '🔄 Creating game server...';
            statusEl.style.color = '#fbbf24';
        }

        if (this.peer && this.peer.id) {
            this.peer.destroy();
        }

        var peerConfig = {
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

        var self = this;

        this.peer.on('open', function(id) {
            console.log('Hosting as:', id);
            if (codeEl) codeEl.innerText = id;
            if (statusEl) {
                statusEl.innerHTML = '✅ <strong>Share this code with your friend!</strong><br>Waiting for opponent to join...';
                statusEl.style.color = '#22c55e';
            }
        });

        this.peer.on('connection', function(c) {
            console.log('Opponent connected!');
            self.conn = c;
            self.setupConnection(gameType);

            if (statusEl) {
                statusEl.innerHTML = '✅ <strong>Opponent joined!</strong><br>Starting game...';
                statusEl.style.color = '#22c55e';
            }

            setTimeout(function() {
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

        this.peer.on('error', function(err) {
            console.error('Host error:', err);
            if (err.type === 'unavailable-id') {
                if (statusEl) {
                    statusEl.innerHTML = '❌ Code already in use<br>Try again with a different code';
                    statusEl.style.color = '#ef4444';
                }
                setTimeout(function() { self.hostGame(gameType); }, 2000);
            } else {
                if (statusEl) {
                    statusEl.innerHTML = '❌ Connection error: ' + err.type;
                    statusEl.style.color = '#ef4444';
                }
            }
        });

        if (this.connectionTimeout) clearTimeout(this.connectionTimeout);
        this.connectionTimeout = setTimeout(function() {
            if (!self.conn && statusEl) {
                statusEl.innerHTML += '<br><small>⚠️ Taking long? Check firewall settings</small>';
            }
        }, 20000);
    },

    // ---------- JOIN GAME ----------
    joinGame: function(gameType) {
        if (typeof gameType === 'undefined') gameType = 'ttt';
        this.activeOnlineGame = gameType;

        var prefix = '';
        if (gameType === 'c4') prefix = 'c4-';
        else if (gameType === 'othello') prefix = 'o-';
        else if (gameType === 'checkers') prefix = 'checkers-';
        else if (gameType === 'gomoku') prefix = 'gomoku-';

        var codeInput = document.getElementById(prefix + 'join-code-input');
        if (!codeInput) {
            console.error('Join code input not found for prefix:', prefix);
            return;
        }
        var code = codeInput.value.toUpperCase().trim();
        var statusEl = this.getStatusElement();

        if (!code || code.length !== 6) {
            alert('Please enter a valid 6‑character code.');
            return;
        }

        if (statusEl) {
            statusEl.innerHTML = '🔄 Connecting to game...';
            statusEl.style.color = '#fbbf24';
        }

        this.initPeer();

        var self = this;

        setTimeout(function() {
            console.log('Attempting to connect to:', code);
            self.conn = self.peer.connect(code, {
                reliable: true,
                serialization: 'json'
            });

            self.setupConnection(gameType);

            self.conn.on('open', function() {
                console.log('Connected to host!');
                if (statusEl) {
                    statusEl.innerHTML = '✅ <strong>Connected!</strong><br>Waiting for host to start...';
                    statusEl.style.color = '#22c55e';
                }

                setTimeout(function() {
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

            self.conn.on('error', function(err) {
                console.error('Join error:', err);
                if (statusEl) {
                    statusEl.innerHTML = '❌ Connection failed: ' + err.type + '<br><small>Check the code and try again</small>';
                    statusEl.style.color = '#ef4444';
                }
            });

            self.conn.on('close', function() {
                console.log('Connection closed');
                if (statusEl) {
                    statusEl.innerHTML = '❌ Connection lost';
                    statusEl.style.color = '#ef4444';
                }
            });
        }, 1000);

        setTimeout(function() {
            if (!self.conn || !self.conn.open) {
                if (statusEl) {
                    statusEl.innerHTML += '<br><small>⚠️ Can\'t connect? Host may be behind firewall</small>';
                }
            }
        }, 20000);
    },

    // ---------- SET UP CONNECTION ----------
    setupConnection: function(gameType) {
        if (!this.conn) return;

        var self = this;

        this.conn.on('data', function(data) {
            console.log('Received data:', data);

            if (data.type === 'move') {
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

        this.conn.on('close', function() {
            console.log('Connection closed by peer');
            var statusEl = self.getStatusElement();
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
