const Barricade = {
    canvas: null,
    ctx: null,
    animationId: null,
    isRunning: false,
    clickHandler: null,

    // Game State
    GRID_SIZE: 15,
    TILE_SIZE: 40,
    CORE_X: 7,
    CORE_Y: 7,
    coreHP: 100,
    money: 50,
    wave: 1,
    score: 0,
    frameCount: 0,
    walls: [],
    enemies: [],
    particles: [],

    init: function() {
        this.canvas = document.getElementById('barricade-canvas');
        this.ctx = this.canvas.getContext('2d');
        this.start();
    },

    start: function() {
        this.cleanup(); // Ensure no duplicate loops
        this.coreHP = 100;
        this.money = 50;
        this.wave = 1;
        this.score = 0;
        this.frameCount = 0;
        this.walls = [];
        this.enemies = [];
        this.particles = [];
        this.isRunning = true;
        
        document.getElementById('barricade-message').classList.add('hidden');
        this.updateUI();

        // Bind click handler
        this.clickHandler = this.handleClick.bind(this);
        this.canvas.addEventListener('mousedown', this.clickHandler);

        this.gameLoop();
    },

    cleanup: function() {
        this.isRunning = false;
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
        }
        if (this.clickHandler && this.canvas) {
            this.canvas.removeEventListener('mousedown', this.clickHandler);
        }
    },

    updateUI: function() {
        document.getElementById('b-core-hp').innerText = Math.max(0, this.coreHP);
        document.getElementById('b-money').innerText = this.money;
        document.getElementById('b-wave').innerText = this.wave;
        document.getElementById('b-score').innerText = this.score;
    },

    handleClick: function(e) {
        if (!this.isRunning) return;
        const rect = this.canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        const gridX = Math.floor(mouseX / this.TILE_SIZE);
        const gridY = Math.floor(mouseY / this.TILE_SIZE);

        // Bounds & Core check
        if (gridX < 0 || gridX >= this.GRID_SIZE || gridY < 0 || gridY >= this.GRID_SIZE) return;
        if (gridX === this.CORE_X && gridY === this.CORE_Y) return;

        // Check if clicked on an enemy (Shooting mechanic)
        const hitEnemy = this.enemies.find(en => en.x === gridX && en.y === gridY);
        if (hitEnemy) {
            hitEnemy.hp -= 10;
            this.createParticles(hitEnemy.x * this.TILE_SIZE + this.TILE_SIZE/2, hitEnemy.y * this.TILE_SIZE + this.TILE_SIZE/2, '#e94560', 5);
            if (hitEnemy.hp <= 0) {
                this.enemies = this.enemies.filter(en => en !== hitEnemy);
                this.money += 5;
                this.score += 10;
                this.updateUI();
            }
            return;
        }

        // Build Wall
        if (this.walls.some(w => w.x === gridX && w.y === gridY)) return;
        if (this.money >= 10) {
            this.money -= 10;
            this.walls.push({ x: gridX, y: gridY, hp: 50, maxHp: 50 });
            this.createParticles(gridX * this.TILE_SIZE + this.TILE_SIZE/2, gridY * this.TILE_SIZE + this.TILE_SIZE/2, '#4caf50', 8);
            this.updateUI();
        }
    },

    createParticles: function(x, y, color, count) {
        for (let i = 0; i < count; i++) {
            this.particles.push({
                x: x, y: y, color: color,
                vx: (Math.random() - 0.5) * 4,
                vy: (Math.random() - 0.5) * 4,
                life: 30
            });
        }
    },

    gameLoop: function() {
        if (!this.isRunning) return;

        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // Draw Grid
        this.ctx.strokeStyle = '#1a4a7a';
        this.ctx.lineWidth = 1;
        for (let i = 0; i <= this.GRID_SIZE; i++) {
            this.ctx.beginPath(); this.ctx.moveTo(i * this.TILE_SIZE, 0); this.ctx.lineTo(i * this.TILE_SIZE, this.canvas.height); this.ctx.stroke();
            this.ctx.beginPath(); this.ctx.moveTo(0, i * this.TILE_SIZE); this.ctx.lineTo(this.canvas.width, i * this.TILE_SIZE); this.ctx.stroke();
        }

        // Draw Core
        this.ctx.fillStyle = '#00a8ff';
        this.ctx.shadowBlur = 15; this.ctx.shadowColor = '#00a8ff';
        this.ctx.fillRect(this.CORE_X * this.TILE_SIZE + 5, this.CORE_Y * this.TILE_SIZE + 5, this.TILE_SIZE - 10, this.TILE_SIZE - 10);
        this.ctx.shadowBlur = 0;

        // Spawn Enemies
        this.frameCount++;
        let spawnRate = Math.max(40, 150 - (this.wave * 8));
        if (this.frameCount % spawnRate === 0) {
            const edge = Math.floor(Math.random() * 4);
            let ex, ey;
            if (edge === 0) { ex = Math.floor(Math.random() * this.GRID_SIZE); ey = 0; }
            else if (edge === 1) { ex = this.GRID_SIZE - 1; ey = Math.floor(Math.random() * this.GRID_SIZE); }
            else if (edge === 2) { ex = Math.floor(Math.random() * this.GRID_SIZE); ey = this.GRID_SIZE - 1; }
            else { ex = 0; ey = Math.floor(Math.random() * this.GRID_SIZE); }
            
            this.enemies.push({ x: ex, y: ey, hp: 20 + (this.wave * 5), maxHp: 20 + (this.wave * 5), damage: 10, attackCooldown: 0, moveCooldown: 0 });
        }

        // Wave progression
        if (this.frameCount % 1200 === 0) { 
            this.wave++; 
            this.updateUI(); 
        }

        // Update & Draw Walls
        this.walls.forEach(w => {
            this.ctx.fillStyle = '#8d99ae';
            this.ctx.fillRect(w.x * this.TILE_SIZE + 2, w.y * this.TILE_SIZE + 2, this.TILE_SIZE - 4, this.TILE_SIZE - 4);
            const hpPercent = w.hp / w.maxHp;
            this.ctx.fillStyle = hpPercent > 0.5 ? '#4caf50' : '#f44336';
            this.ctx.fillRect(w.x * this.TILE_SIZE + 4, w.y * this.TILE_SIZE - 6, (this.TILE_SIZE - 8) * hpPercent, 4);
        });

        // Update & Draw Enemies
        for (let i = this.enemies.length - 1; i >= 0; i--) {
            let e = this.enemies[i];
            if (e.attackCooldown > 0) e.attackCooldown--;
            if (e.moveCooldown > 0) e.moveCooldown--;

            const dx = Math.sign(this.CORE_X - e.x);
            const dy = Math.sign(this.CORE_Y - e.y);

            // Adjacent to core
            if (Math.abs(e.x - this.CORE_X) <= 1 && Math.abs(e.y - this.CORE_Y) <= 1) {
                if (e.attackCooldown <= 0) {
                    this.coreHP -= e.damage;
                    e.attackCooldown = 60;
                    this.createParticles(this.CORE_X * this.TILE_SIZE + this.TILE_SIZE/2, this.CORE_Y * this.TILE_SIZE + this.TILE_SIZE/2, '#00a8ff', 5);
                    this.updateUI();
                    if (this.coreHP <= 0) this.endGame(false);
                }
            } else {
                // Pathfinding & Combat
                let blockedX = this.walls.some(w => w.x === e.x + dx && w.y === e.y);
                let blockedY = this.walls.some(w => w.x === e.x && w.y === e.y + dy);

                if (e.moveCooldown <= 0) {
                    if (!blockedX && dx !== 0) { e.x += dx; e.moveCooldown = 30; }
                    else if (!blockedY && dy !== 0) { e.y += dy; e.moveCooldown = 30; }
                    else {
                        let target = this.walls.find(w => (w.x === e.x + dx && w.y === e.y) || (w.x === e.x && w.y === e.y + dy));
                        if (target && e.attackCooldown <= 0) {
                            target.hp -= e.damage;
                            e.attackCooldown = 60;
                            this.createParticles(target.x * this.TILE_SIZE + this.TILE_SIZE/2, target.y * this.TILE_SIZE + this.TILE_SIZE/2, '#8d99ae', 3);
                            if (target.hp <= 0) {
                                this.walls = this.walls.filter(w => w !== target);
                                this.score += 5;
                                this.updateUI();
                            }
                        }
                    }
                }
            }

            // Draw Enemy
            this.ctx.fillStyle = '#e94560';
            this.ctx.beginPath();
            this.ctx.arc(e.x * this.TILE_SIZE + this.TILE_SIZE/2, e.y * this.TILE_SIZE + this.TILE_SIZE/2, this.TILE_SIZE/3, 0, Math.PI * 2);
            this.ctx.fill();
            const eHpPercent = e.hp / e.maxHp;
            this.ctx.fillStyle = '#ff0000';
            this.ctx.fillRect(e.x * this.TILE_SIZE + 5, e.y * this.TILE_SIZE - 4, (this.TILE_SIZE - 10) * eHpPercent, 3);
        }

        // Update & Draw Particles
        for (let i = this.particles.length - 1; i >= 0; i--) {
            let p = this.particles[i];
            p.x += p.vx; p.y += p.vy; p.life--;
            this.ctx.globalAlpha = p.life / 30;
            this.ctx.fillStyle = p.color;
            this.ctx.fillRect(p.x, p.y, 4, 4);
            this.ctx.globalAlpha = 1.0;
            if (p.life <= 0) this.particles.splice(i, 1);
        }

        this.animationId = requestAnimationFrame(this.gameLoop.bind(this));
    },

    endGame: function(won) {
        this.isRunning = false;
        const msgBox = document.getElementById('barricade-message');
        msgBox.classList.remove('hidden');
        document.getElementById('b-msg-title').innerText = won ? "Victory!" : "Game Over";
        document.getElementById('b-msg-text').innerText = won ? `You survived! Final Score: ${this.score}` : `Your core was destroyed! Final Score: ${this.score}`;
    }
};
