const App = {
    peer: null,
    conn: null,
    currentGame: null, // Track active game for cleanup

    showView: function(viewId) {
        // 1. Cleanup any running game before switching views
        if (this.currentGame === 'tictactoe') TicTacToe.cleanup();
        if (this.currentGame === 'barricade') Barricade.cleanup();
        this.currentGame = null;

        // 2. Switch views
        document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
        document.getElementById(viewId).classList.add('active');

        // 3. Initialize game if entering a game view
        if (viewId === 'game-ttt') {
            this.currentGame = 'tictactoe';
            TicTacToe.init();
        } else if (viewId === 'game-barricade') {
            this.currentGame = 'barricade';
            Barricade.init();
        }
    },

    initPeer: function() {
        if (this.peer) return;
        this.peer = new Peer(); 
        this.peer.on('error', (err) => {
            document.getElementById('online-status').innerText = "Connection error: " + err.type;
        });
    },

    hostGame: function() {
        this.initPeer();
        const code = Math.random().toString(36).substring(2, 8).toUpperCase();
        this.peer.destroy();
        this.peer = new Peer(code);
        this.peer.on('open', (id) => {
            document.getElementById('room-code-display').innerText = id;
            document.getElementById('online-status').innerText = "Waiting for opponent to join...";
        });
        this.peer.on('connection', (c) => {
            this.conn = c;
            this.setupConnection();
            document.getElementById('online-status').innerText = "Opponent joined! You are X. Starting...";
            TicTacToe.start('online-host');
        });
    },

    joinGame: function() {
        const code = document.getElementById('join-code-input').value.toUpperCase();
        if (code.length !== 6) {
            alert("Please enter a valid 6-character code.");
            return;
        }
        this.initPeer();
        document.getElementById('online-status').innerText = "Connecting...";
        this.conn = this.peer.connect(code);
        this.setupConnection();
        this.conn.on('open', () => {
            document.getElementById('online-status').innerText = "Connected! You are O. Waiting for host...";
            TicTacToe.start('online-join');
        });
    },

    setupConnection: function() {
        this.conn.on('data', (data) => {
            if (data.type === 'move') {
                TicTacToe.makeMove(data.index, data.player, false);
            } else if (data.type === 'restart') {
                TicTacToe.resetBoard();
            }
        });
    },

    broadcastMove: function(index, player) {
        if (this.conn && this.conn.open) {
            this.conn.send({ type: 'move', index: index, player: player });
        }
    },

    broadcastRestart: function() {
        if (this.conn && this.conn.open) {
            this.conn.send({ type: 'restart' });
        }
    }
};
