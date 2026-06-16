const App = {
    peer: null,
    conn: null,
    currentGame: null,
    activeOnlineGame: null,

    showView: function(viewId) {
        console.log('Switching to view:', viewId);
        
        // 1. Cleanup any running game before switching views
        try {
            if (this.currentGame === 'tictactoe' && typeof TicTacToe !== 'undefined') {
                TicTacToe.cleanup();
            }
            if (this.currentGame === 'barricade' && typeof Barricade !== 'undefined') {
                Barricade.cleanup();
            }
            if (this.currentGame === 'connect4' && typeof Connect4 !== 'undefined') {
                Connect4.cleanup();
            }
        } catch (e) {
            console.error('Cleanup error:', e);
        }
        
        this.currentGame = null;

        // 2. Switch views
        document.querySelectorAll('.view').forEach(v => {
            v.classList.remove('active');
        });
        
        const targetView = document.getElementById(viewId);
        if (targetView) {
            targetView.classList.add('active');
            console.log('View switched successfully');
        } else {
            console.error('View not found:', viewId);
            return;
        }

        // 3. Initialize game if entering a game view
        try {
            if (viewId === 'game-ttt') {
                this.currentGame = 'tictactoe';
                if (typeof TicTacToe !== 'undefined') {
                    TicTacToe.init();
                } else {
                    console.error('TicTacToe not loaded');
                }
            } else if (viewId === 'game-barricade') {
                this.currentGame = 'barricade';
                if (typeof Barricade !== 'undefined') {
                    Barricade.init();
                } else {
                    console.error('Barricade not loaded');
                }
            } else if (viewId === 'game-c4') {
                this.currentGame = 'connect4';
                if (typeof Connect4 !== 'undefined') {
                    Connect4.init();
                } else {
                    console.error('Connect4 not loaded');
                }
            }
        } catch (e) {
            console.error('Game initialization error:', e);
        }
    },

    initPeer: function() {
        if (this.peer) return;
        this.peer = new Peer(); 
        this.peer.on('error', (err) => {
            const statusEl = this.activeOnlineGame === 'c4' ? 
                document.getElementById('c4-online-status') : 
                document.getElementById('online-status');
            if(statusEl) statusEl.innerText = "Connection error: " + err.type;
        });
    },

    hostGame: function(gameType = 'ttt') {
        this.activeOnlineGame = gameType;
        this.initPeer();
        const code = Math.random().toString(36).substring(2, 8).toUpperCase();
        this.peer.destroy();
        this.peer = new Peer(code);
        
        const prefix = gameType === 'c4' ? 'c4-' : '';
        this.peer.on('open', (id) => {
            document.getElementById(`${prefix}room-code-display`).innerText = id;
            document.getElementById(`${prefix}online-status`).innerText = "Waiting for opponent to join...";
        });
        this.peer.on('connection', (c) => {
            this.conn = c;
            this.setupConnection(gameType);
            document.getElementById(`${prefix}online-status`).innerText = "Opponent joined! You are " + 
                (gameType === 'c4' ? "Red (1st)" : "X (1st)") + ". Starting...";
            if (gameType === 'c4') {
                if (typeof Connect4 !== 'undefined') Connect4.start('online-host');
            } else {
                if (typeof TicTacToe !== 'undefined') TicTacToe.start('online-host');
            }
        });
    },

    joinGame: function(gameType = 'ttt') {
        this.activeOnlineGame = gameType;
        const prefix = gameType === 'c4' ? 'c4-' : '';
        const code = document.getElementById(`${prefix}join-code-input`).value.toUpperCase();
        if (code.length !== 6) {
            alert("Please enter a valid 6-character code.");
            return;
        }
        this.initPeer();
        document.getElementById(`${prefix}online-status`).innerText = "Connecting...";
        this.conn = this.peer.connect(code);
        this.setupConnection(gameType);
        this.conn.on('open', () => {
            document.getElementById(`${prefix}online-status`).innerText = "Connected! You are " + 
                (gameType === 'c4' ? "Yellow (2nd)" : "O (2nd)") + ". Waiting for host...";
            if (gameType === 'c4') {
                if (typeof Connect4 !== 'undefined') Connect4.start('online-join');
            } else {
                if (typeof TicTacToe !== 'undefined') TicTacToe.start('online-join');
            }
        });
    },

    setupConnection: function(gameType) {
        this.conn.on('data', (data) => {
            if (data.type === 'move') {
                if (gameType === 'c4') {
                    if (typeof Connect4 !== 'undefined') Connect4.makeMove(data.col, data.player, false);
                } else {
                    if (typeof TicTacToe !== 'undefined') TicTacToe.makeMove(data.index, data.player, false);
                }
            } else if (data.type === 'restart') {
                if (gameType === 'c4') {
                    if (typeof Connect4 !== 'undefined') Connect4.resetBoard();
                } else {
                    if (typeof TicTacToe !== 'undefined') TicTacToe.resetBoard();
                }
            }
        });
    },

    broadcastMove: function(payload) {
        if (this.conn && this.conn.open) {
            this.conn.send(payload);
        }
    },

    broadcastRestart: function() {
        if (this.conn && this.conn.open) {
            this.conn.send({ type: 'restart' });
        }
    }
};
