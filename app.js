const App = {
    currentGame: null,

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

        // Hide all views
        var views = document.querySelectorAll('.view');
        for (var i = 0; i < views.length; i++) {
            views[i].classList.remove('active');
        }

        // Show target view
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
    }
};
