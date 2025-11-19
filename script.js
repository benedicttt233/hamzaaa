const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// UI Elements
const scoreEl = document.getElementById('score');
const highScoreEl = document.getElementById('highScore');
const finalScoreEl = document.getElementById('finalScore');
const finalHighScoreEl = document.getElementById('finalHighScore');
const gameOverScreen = document.getElementById('game-over-screen');
const startScreen = document.getElementById('start-screen');
const startBtn = document.getElementById('start-btn');
const restartBtn = document.getElementById('restart-btn');

// Analog Stick Elements
const analogContainer = document.getElementById('analog-container');
const analogStick = document.getElementById('analog-stick');
const analogBase = document.getElementById('analog-base');

// Game State
let isGameRunning = false;
let score = 0;
let highScore = localStorage.getItem('hamzaHighScore') || 0;
let gameSpeed = 5;
let frameCount = 0;

// Input State
let inputVector = { x: 0, y: 0 };
let isDragging = false;

// Assets
const hamzaImg = new Image();
hamzaImg.src = 'hamza.jpg';

// Resize Canvas & Mobile Detection
let isMobile = false;
function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    isMobile = canvas.width < 600;
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

// Update High Score UI
highScoreEl.textContent = highScore;

// --- ENTITIES ---
class Player {
    constructor() {
        this.width = isMobile ? 40 : 50;
        this.height = isMobile ? 40 : 50;
        this.x = canvas.width / 2 - this.width / 2;
        this.y = canvas.height * 0.5;
        this.speed = isMobile ? 5 : 7;
        this.speedMultiplier = 1;
        this.color = '#00d2d3';
        this.hitCount = 0;
        this.timeSinceLastHit = 0;
    }
    update() {
        if (this.speedMultiplier < 1) this.speedMultiplier += 0.005;
        this.x += inputVector.x * this.speed * this.speedMultiplier;
        if (this.x < 0) this.x = 0;
        if (this.x + this.width > canvas.width) this.x = canvas.width - this.width;

        this.timeSinceLastHit++;
        if (this.timeSinceLastHit > 120 && this.hitCount > 0) {
            this.hitCount--;
            this.timeSinceLastHit = 0;
        }
    }
    draw() {
        ctx.fillStyle = this.color;
        ctx.shadowBlur = 15;
        ctx.shadowColor = this.color;
        ctx.fillRect(this.x, this.y, this.width, this.height);
        ctx.shadowBlur = 0;
    }
}

class Hamza {
    constructor() {
        this.width = isMobile ? 70 : 90;
        this.height = isMobile ? 70 : 90;
        this.x = canvas.width / 2 - this.width / 2;
        this.y = canvas.height + 100;
        this.targetYOffset = 120;
        this.speed = isMobile ? 3 : 4;
    }
    update(player) {
        const targetX = player.x + player.width / 2 - this.width / 2;
        const targetY = player.y + this.targetYOffset;
        this.x += (targetX - this.x) * 0.1;
        let currentTargetY = targetY;
        if (player.hitCount >= 4) {
            currentTargetY = player.y - 5;
        } else if (player.hitCount >= 3) {
            currentTargetY = player.y + 20;
        } else if (player.hitCount >= 2) {
            currentTargetY = player.y + 50;
        } else if (player.hitCount >= 1) {
            currentTargetY = player.y + 80;
        }
        const dy = currentTargetY - this.y;
        this.y += dy * 0.05;
    }
    draw() {
        ctx.save();
        ctx.beginPath();
        ctx.arc(this.x + this.width / 2, this.y + this.height / 2, this.width / 2, 0, Math.PI * 2);
        ctx.closePath();
        ctx.clip();
        try {
            ctx.drawImage(hamzaImg, this.x, this.y, this.width, this.height);
        } catch (e) {
            ctx.fillStyle = '#ff4757';
            ctx.fillRect(this.x, this.y, this.width, this.height);
        }
        ctx.restore();
        ctx.beginPath();
        ctx.arc(this.x + this.width / 2, this.y + this.height / 2, this.width / 2, 0, Math.PI * 2);
        ctx.strokeStyle = '#ff4757';
        ctx.lineWidth = 3;
        ctx.stroke();
    }
}

class Obstacle {
    constructor() {
        const scale = isMobile ? 0.8 : 1;
        const types = [
            { w: 60 * scale, h: 60 * scale, color: '#ff6b6b' },
            { w: 150 * scale, h: 30 * scale, color: '#ff4757' },
            { w: 30 * scale, h: 150 * scale, color: '#c0392b' },
            { w: 80 * scale, h: 80 * scale, color: '#e17055' }
        ];
        const type = types[Math.floor(Math.random() * types.length)];
        this.width = type.w;
        this.height = type.h;
        this.x = Math.random() * (canvas.width - this.width);
        this.y = -200;
        this.color = type.color;
        this.markedForDeletion = false;
        this.hasHitPlayer = false;
    }
    update() {
        this.y += gameSpeed;
        if (this.y > canvas.height) {
            this.markedForDeletion = true;
            score += 10;
            scoreEl.textContent = score;
        }
    }
    draw() {
        ctx.fillStyle = this.color;
        ctx.shadowBlur = 10;
        ctx.shadowColor = this.color;
        ctx.fillRect(this.x, this.y, this.width, this.height);
        ctx.shadowBlur = 0;
    }
}

class Coin {
    constructor() {
        this.radius = 15;
        this.x = Math.random() * (canvas.width - this.radius * 2);
        this.y = -200;
        this.color = '#feca57';
        this.markedForDeletion = false;
    }
    update() {
        this.y += gameSpeed;
        if (this.y > canvas.height) {
            this.markedForDeletion = true;
        }
    }
    draw() {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = this.color;
        ctx.fill();
        ctx.strokeStyle = '#ff9f43';
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.closePath();
    }
}

// --- GAME LOGIC ---
let player = new Player();
let hamza = new Hamza();
let obstacles = [];
let coins = [];

function initGame() {
    player = new Player();
    hamza = new Hamza();
    obstacles = [];
    coins = [];
    score = 0;
    gameSpeed = isMobile ? 2.5 : 3.5;
    frameCount = 0;
    scoreEl.textContent = score;
    isGameRunning = true;
    startScreen.classList.add('hidden');
    gameOverScreen.classList.add('hidden');
    animate();
}

function handleObstacles() {
    if (frameCount % 70 === 0) {
        obstacles.push(new Obstacle());
    }
    for (let i = 0; i < obstacles.length; i++) {
        obstacles[i].update();
        obstacles[i].draw();
        if (checkCollision(player, obstacles[i]) && !obstacles[i].hasHitPlayer) {
            obstacles[i].hasHitPlayer = true;
            player.hitCount++;
            player.timeSinceLastHit = 0;
            player.speedMultiplier = 0.2;
            const obstacleCenter = obstacles[i].x + obstacles[i].width / 2;
            const playerCenter = player.x + player.width / 2;
            if (playerCenter < obstacleCenter) {
                player.x -= 3;
            } else {
                player.x += 3;
            }
            if (player.x < 0) player.x = 0;
            if (player.x + player.width > canvas.width) player.x = canvas.width - player.width;
        }
    }
    obstacles = obstacles.filter(o => !o.markedForDeletion);
}

function handleCoins() {
    if (frameCount % 60 === 0) {
        coins.push(new Coin());
    }
    for (let i = 0; i < coins.length; i++) {
        coins[i].update();
        coins[i].draw();
        const dx = coins[i].x - (player.x + player.width / 2);
        const dy = coins[i].y - (player.y + player.height / 2);
        const distance = Math.sqrt(dx * dx + dy * dy);
        if (distance < coins[i].radius + player.width / 2) {
            score += 50;
            scoreEl.textContent = score;
            coins[i].markedForDeletion = true;
        }
    }
    coins = coins.filter(c => !c.markedForDeletion);
}

function checkCollision(rect1, rect2) {
    return (
        rect1.x < rect2.x + rect2.width &&
        rect1.x + rect1.width > rect2.x &&
        rect1.y < rect2.y + rect2.height &&
        rect1.y + rect1.height > rect2.y
    );
}

function gameOver() {
    isGameRunning = false;
    gameOverScreen.classList.remove('hidden');
    finalScoreEl.textContent = score;
    if (score > highScore) {
        highScore = score;
        localStorage.setItem('hamzaHighScore', highScore);
    }
    finalHighScoreEl.textContent = highScore;
    highScoreEl.textContent = highScore;
}

function animate() {
    if (!isGameRunning) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = 'rgba(255,255,255,0.05)';
    ctx.lineWidth = 2;
    const lineSpacing = canvas.width / 5;
    for (let i = 0; i < canvas.width; i += lineSpacing) {
        ctx.beginPath();
        ctx.moveTo(i, 0);
        ctx.lineTo(i, canvas.height);
        ctx.stroke();
    }
    for (let y = 0; y < canvas.height; y += 100) {
        const yPos = (y + frameCount * gameSpeed) % canvas.height;
        ctx.beginPath();
        ctx.moveTo(0, yPos);
        ctx.lineTo(canvas.width, yPos);
        ctx.stroke();
    }
    player.update();
    player.draw();
    hamza.update(player);
    hamza.draw();
    handleObstacles();
    handleCoins();
    const hamzaHitbox = {
        x: hamza.x + 15,
        y: hamza.y + 15,
        width: hamza.width - 30,
        height: hamza.height - 30
    };
    if (checkCollision(player, hamzaHitbox)) {
        gameOver();
    }
    if (frameCount % 600 === 0) {
        gameSpeed += 0.5;
    }
    frameCount++;
    requestAnimationFrame(animate);
}

// --- CONTROLS ---
function handleInputStart(e) {
    isDragging = true;
    updateInputVector(e);
}
function handleInputMove(e) {
    if (!isDragging) return;
    e.preventDefault();
    updateInputVector(e);
}
function handleInputEnd() {
    isDragging = false;
    inputVector = { x: 0, y: 0 };
    analogStick.style.transform = `translate(-50%, -50%)`;
    analogStick.style.transition = 'transform 0.1s ease-out';
}
function updateInputVector(e) {
    const rect = analogBase.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    let clientX, clientY;
    if (e.touches) {
        clientX = e.touches[0].clientX;
        clientY = e.touches[0].clientY;
    } else {
        clientX = e.clientX;
        clientY = e.clientY;
    }
    const dx = clientX - centerX;
    const dy = clientY - centerY;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const maxRadius = rect.width / 2;
    const clampedDistance = Math.min(distance, maxRadius);
    const angle = Math.atan2(dy, dx);
    const stickX = Math.cos(angle) * clampedDistance;
    const stickY = Math.sin(angle) * clampedDistance;
    analogStick.style.transition = 'none';
    analogStick.style.transform = `translate(calc(-50% + ${stickX}px), calc(-50% + ${stickY}px))`;
    inputVector = { x: stickX / maxRadius, y: stickY / maxRadius };
}

analogContainer.addEventListener('mousedown', handleInputStart);
window.addEventListener('mousemove', handleInputMove);
window.addEventListener('mouseup', handleInputEnd);
analogContainer.addEventListener('touchstart', handleInputStart);
window.addEventListener('touchmove', handleInputMove);
window.addEventListener('touchend', handleInputEnd);

startBtn.addEventListener('click', initGame);
restartBtn.addEventListener('click', initGame);
