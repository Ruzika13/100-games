const App = {
    peer: null,
    conn: null,
    currentGame: null,
    activeOnlineGame: null, // 'ttt' or 'c4'

    showView: function(viewId) {
        // 1. Cleanup any running game before switching views
        if (this.currentGame === 'tictactoe') TicTacToe.cleanup();
        if (this.currentGame === 'barricade') Barricade.cleanup();
        if (this.currentGame === 'connect4') Connect4.cleanup();
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
        } else if (viewId === 'game-c4') {
            this.currentGame = 'connect4';
            Connect4.init();
        }
    },

    initPeer: function() {
        if (this.peer) return;
        this.peer = new Peer(); 
        this.peer.on('error', (err) => {
            const statusEl = this.activeOnlineGame === 'c4' ? document.getElementById('c4-online-status') : document.getElementById('online-status');
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
            document.getElementById(`${prefix}online-status`).innerText = "Opponent joined! You are Red (1st). Starting...";
            if (gameType === 'c4') Connect4.start('online-host');
            else TicTacToe.start('online-host');
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
            document.getElementById(`${prefix}online-status`).innerText = "Connected! You are Yellow (2nd). Waiting for host...";
            if (gameType === 'c4') Connect4.start('online-join');
            else TicTacToe.start('online-join');
        });
    },

    setupConnection: function(gameType) {
        this.conn.on('data', (data) => {
            if (data.type === 'move') {
                if (gameType === 'c4') Connect4.makeMove(data.col, data.player, false);
                else TicTacToe.makeMove(data.index, data.player, false);
            } else if (data.type === 'restart') {
                if (gameType === 'c4') Connect4.resetBoard();
                else TicTacToe.resetBoard();
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
