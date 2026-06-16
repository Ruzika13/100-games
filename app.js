const App = {
    peer: null,
    conn: null,

    // Switch between Hub and Game screens
    showView: function(viewId) {
        document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
        document.getElementById(viewId).classList.add('active');
        // Clean up game state when leaving
        if (viewId === 'hub-view') {
            TicTacToe.cleanup();
        }
    },

    // --- PEERJS NETWORKING ---
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
