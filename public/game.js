// ============================================================
// Mini Mario - Node.js / HTML5 Canvas Version
// Controls: ← → Move | Space Jump | R Restart
// ============================================================

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const SCREEN_W = 800;
const SCREEN_H = 600;

// Constants
const GRAVITY = 0.6;
const JUMP_POWER = -12;
const PLAYER_SPEED = 5;
const FPS = 60;

// Colors
const COLORS = {
  WHITE:    '#FFFFFF',
  BLACK:    '#000000',
  RED:      '#FF3232',
  GREEN:    '#32C832',
  BLUE:     '#3232FF',
  YELLOW:   '#FFFF00',
  BROWN:    '#B4641E',
  SKY_BLUE: '#64B4FF',
  GRAY:     '#969696',
  ORANGE:   '#FFA500',
  SKIN:     '#FFC8B4',
  GRASS:    '#96DC78',
  DIRT:     '#8C5028',
  DIRT_TOP: '#A06E32',
};

// ---- Input State ----
const keys = {};
document.addEventListener('keydown', (e) => {
  keys[e.key] = true;
  if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) {
    e.preventDefault();
  }
});
document.addEventListener('keyup', (e) => {
  keys[e.key] = false;
});

// ---- Utility ----
function rectCollide(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x &&
         a.y < b.y + b.h && a.y + a.h > b.y;
}

// ---- Player ----
class Player {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.w = 30;
    this.h = 40;
    this.vx = 0;
    this.vy = 0;
    this.onGround = false;
    this.facing = 1;  // 1 right, -1 left
    this.alive = true;
    this.win = false;
  }

  update(platforms) {
    if (!this.alive) return;

    // Horizontal movement
    this.vx = 0;
    if (keys['ArrowLeft'] || keys['a']) {
      this.vx = -PLAYER_SPEED;
      this.facing = -1;
    }
    if (keys['ArrowRight'] || keys['d']) {
      this.vx = PLAYER_SPEED;
      this.facing = 1;
    }

    // Jump
    if ((keys[' '] || keys['ArrowUp'] || keys['w']) && this.onGround) {
      this.vy = JUMP_POWER;
      this.onGround = false;
    }

    // Gravity
    this.vy += GRAVITY;
    if (this.vy > 15) this.vy = 15;

    // Horizontal collision
    this.x += this.vx;
    for (const p of platforms) {
      if (rectCollide(this, p)) {
        if (this.vx > 0) {
          this.x = p.x - this.w;
        } else if (this.vx < 0) {
          this.x = p.x + p.w;
        }
      }
    }

    // Vertical collision
    this.y += this.vy;
    this.onGround = false;
    for (const p of platforms) {
      if (rectCollide(this, p)) {
        if (this.vy > 0) {
          this.y = p.y - this.h;
          this.onGround = true;
          this.vy = 0;
        } else if (this.vy < 0) {
          this.y = p.y + p.h;
          this.vy = 0;
        }
      }
    }

    // Bounds
    if (this.x < 0) this.x = 0;
    if (this.x + this.w > SCREEN_W) this.x = SCREEN_W - this.w;

    // Fall death
    if (this.y > SCREEN_H) {
      this.alive = false;
    }
  }

  draw() {
    if (!this.alive) return;

    const cx = this.x + this.w / 2;
    const cy = this.y;

    // Body
    ctx.fillStyle = COLORS.RED;
    ctx.fillRect(this.x, this.y, this.w, this.h);

    // Hat
    ctx.fillStyle = COLORS.RED;
    ctx.fillRect(this.x - 2, this.y - 8, 34, 10);

    // Face
    ctx.fillStyle = COLORS.SKIN;
    ctx.beginPath();
    ctx.arc(cx, this.y + 12, 10, 0, Math.PI * 2);
    ctx.fill();

    // Eye
    ctx.fillStyle = COLORS.BLACK;
    const eyeX = cx + (this.facing > 0 ? 4 : -4);
    ctx.beginPath();
    ctx.arc(eyeX, this.y + 10, 2, 0, Math.PI * 2);
    ctx.fill();

    // Mustache
    ctx.fillStyle = COLORS.BROWN;
    ctx.fillRect(cx - 2, this.y + 14, 4, 2);

    // Overalls
    ctx.fillStyle = COLORS.BLUE;
    ctx.fillRect(this.x + 4, this.y + 22, 22, 18);
  }
}

// ---- Enemy ----
class Enemy {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.w = 30;
    this.h = 30;
    this.speed = 2;
    this.alive = true;
    this.deathTimer = 0;
  }

  update(platforms) {
    if (!this.alive) {
      this.deathTimer++;
      return;
    }
    this.x += this.speed;

    // Bounce off walls
    if (this.x <= 0 || this.x + this.w >= SCREEN_W) {
      this.speed *= -1;
    }
    for (const p of platforms) {
      if (rectCollide(this, p)) {
        if (this.speed > 0) {
          this.x = p.x - this.w;
        } else {
          this.x = p.x + p.w;
        }
        this.speed *= -1;
        break;
      }
    }

    // Fall off platform
    let onPlatform = false;
    for (const p of platforms) {
      if (this.x + this.w > p.x && this.x < p.x + p.w &&
          this.y + this.h >= p.y && this.y + this.h <= p.y + 6) {
        onPlatform = true;
        break;
      }
    }
    if (!onPlatform) {
      this.speed *= -1;
    }
  }

  draw() {
    // Death animation
    if (!this.alive) {
      if (this.deathTimer < 30) {
        ctx.fillStyle = COLORS.BROWN;
        ctx.fillRect(this.x, this.y - this.deathTimer * 2, this.w, this.h);
        ctx.fillStyle = COLORS.BLACK;
        ctx.beginPath();
        ctx.arc(this.x + this.w / 2, this.y + this.h / 2 - this.deathTimer * 2, 4, 0, Math.PI * 2);
        ctx.fill();
      }
      return;
    }

    // Body (mushroom)
    ctx.fillStyle = COLORS.BROWN;
    ctx.fillRect(this.x, this.y, this.w, this.h);

    // Head dome
    ctx.fillStyle = COLORS.RED;
    ctx.beginPath();
    ctx.arc(this.x + this.w / 2, this.y + 8, 16, Math.PI, 0);
    ctx.fill();

    // White spots
    ctx.fillStyle = COLORS.WHITE;
    ctx.beginPath();
    ctx.arc(this.x + 8, this.y + 4, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(this.x + 22, this.y + 4, 4, 0, Math.PI * 2);
    ctx.fill();

    // Eyes
    ctx.fillStyle = COLORS.BLACK;
    ctx.fillRect(this.x + 8, this.y + 14, 4, 4);
    ctx.fillRect(this.x + 18, this.y + 14, 4, 4);

    // Feet
    ctx.fillStyle = COLORS.GRAY;
    ctx.fillRect(this.x + 2, this.y + this.h - 6, 10, 6);
    ctx.fillRect(this.x + 18, this.y + this.h - 6, 10, 6);
  }
}

// ---- Coin ----
class Coin {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.w = 16;
    this.h = 16;
    this.collected = false;
    this.animFrame = 0;
    this.baseY = y;
  }

  update() {
    if (this.collected) return;
    this.animFrame++;
    this.y = this.baseY + Math.sin(this.animFrame * 0.05) * 5;
  }

  draw() {
    if (this.collected) return;
    const cx = this.x + this.w / 2;
    const cy = this.y + this.h / 2;

    // Glow
    ctx.fillStyle = 'rgba(255, 215, 0, 0.3)';
    ctx.beginPath();
    ctx.arc(cx, cy, 12, 0, Math.PI * 2);
    ctx.fill();

    // Coin body
    ctx.fillStyle = COLORS.YELLOW;
    ctx.beginPath();
    ctx.arc(cx, cy, 8, 0, Math.PI * 2);
    ctx.fill();

    // Inner circle
    ctx.fillStyle = COLORS.ORANGE;
    ctx.beginPath();
    ctx.arc(cx, cy, 5, 0, Math.PI * 2);
    ctx.fill();

    // Shine
    ctx.fillStyle = COLORS.WHITE;
    ctx.beginPath();
    ctx.arc(cx - 2, cy - 2, 2, 0, Math.PI * 2);
    ctx.fill();
  }
}

// ---- Flag ----
class Flag {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.w = 16;
    this.h = 80;
  }

  get rect() {
    return { x: this.x, y: this.y, w: this.w, h: this.h };
  }

  draw() {
    // Pole
    ctx.fillStyle = COLORS.GRAY;
    ctx.fillRect(this.x + 6, this.y, 4, this.h);

    // Ball on top
    ctx.fillStyle = COLORS.YELLOW;
    ctx.beginPath();
    ctx.arc(this.x + 8, this.y, 6, 0, Math.PI * 2);
    ctx.fill();

    // Flag
    ctx.fillStyle = COLORS.GREEN;
    ctx.beginPath();
    ctx.moveTo(this.x + 10, this.y + 5);
    ctx.lineTo(this.x + 40, this.y + 18);
    ctx.lineTo(this.x + 10, this.y + 31);
    ctx.closePath();
    ctx.fill();

    // Base
    ctx.fillStyle = COLORS.DIRT;
    ctx.fillRect(this.x + 2, this.y + this.h - 8, 12, 8);
  }
}

// ---- Level Builder ----
function buildLevel() {
  const platforms = [];
  const enemies = [];
  const coins = [];

  // Ground
  for (let i = 0; i < 12; i++) {
    platforms.push({ x: i * 70, y: 540, w: 70, h: 60 });
  }

  // Floating platforms
  const floatingPlatforms = [
    { x: 120, y: 420, w: 100, h: 20 },
    { x: 280, y: 370, w: 80, h: 20 },
    { x: 400, y: 440, w: 100, h: 20 },
    { x: 550, y: 350, w: 120, h: 20 },
    { x: 380, y: 280, w: 90, h: 20 },
    { x: 200, y: 250, w: 80, h: 20 },
    { x: 620, y: 440, w: 100, h: 20 },
    { x: 100, y: 330, w: 70, h: 20 },
  ];
  platforms.push(...floatingPlatforms);

  // Staircase near flag
  for (let i = 0; i < 4; i++) {
    platforms.push({ x: 660 + i * 30, y: 540 - (i + 1) * 30, w: 30, h: (i + 1) * 30 + 60 });
  }

  // Enemies
  enemies.push(new Enemy(200, 510));
  enemies.push(new Enemy(400, 510));
  enemies.push(new Enemy(580, 410));
  enemies.push(new Enemy(300, 320));

  // Coins
  coins.push(new Coin(150, 390));
  coins.push(new Coin(200, 390));
  coins.push(new Coin(310, 340));
  coins.push(new Coin(420, 410));
  coins.push(new Coin(480, 410));
  coins.push(new Coin(580, 320));
  coins.push(new Coin(620, 320));
  coins.push(new Coin(410, 250));
  coins.push(new Coin(230, 220));
  coins.push(new Coin(260, 220));

  // Flag
  const flag = new Flag(760, 460);

  return { platforms, enemies, coins, flag };
}

// ---- Background Drawing ----
let clouds = [];
function initClouds() {
  clouds = [];
  for (let i = 0; i < 6; i++) {
    clouds.push({
      x: Math.random() * 900,
      y: 40 + Math.random() * 120,
      size: 40 + Math.random() * 60,
    });
  }
}
initClouds();

function drawClouds(offset) {
  ctx.fillStyle = COLORS.WHITE;
  for (const c of clouds) {
    const cx = ((c.x + offset) % 900) - 100;
    ctx.beginPath();
    ctx.ellipse(cx, c.y, c.size / 2, c.size * 0.3, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(cx + c.size * 0.3, c.y - 10, c.size * 0.4, c.size * 0.35, 0, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawHills() {
  const hills = [
    { x: 50, y: 480, w: 150 },
    { x: 350, y: 490, w: 120 },
    { x: 600, y: 475, w: 180 },
  ];
  ctx.fillStyle = COLORS.GRASS;
  for (const h of hills) {
    ctx.beginPath();
    ctx.ellipse(h.x + h.w / 2, h.y, h.w / 2, 35, 0, 0, Math.PI * 2);
    ctx.fill();
  }
}

// ---- Game State ----
let player, platforms, enemies, coins, flag;
let score = 0;
let cloudOffset = 0;
let gameOver = false;
let won = false;

function resetGame() {
  player = new Player(60, 480);
  const level = buildLevel();
  platforms = level.platforms;
  enemies = level.enemies;
  coins = level.coins;
  flag = level.flag;
  score = 0;
  cloudOffset = 0;
  gameOver = false;
  won = false;
}

resetGame();

// ---- Game Loop ----
function update() {
  if (gameOver || won) return;

  player.update(platforms);
  cloudOffset += 0.3;

  for (const e of enemies) {
    e.update(platforms);
  }

  // Player stomp enemies
  for (const e of enemies) {
    if (e.alive && player.alive && rectCollide(player, e)) {
      if (player.vy > 0 && (player.y + player.h) - e.y < 20) {
        e.alive = false;
        player.vy = JUMP_POWER / 1.5;
        score += 100;
      } else {
        player.alive = false;
      }
    }
  }

  // Collect coins
  for (const c of coins) {
    if (!c.collected && player.alive && rectCollide(player, c)) {
      c.collected = true;
      score += 50;
    }
  }

  // Reach flag
  if (flag && player.alive && rectCollide(player, flag.rect)) {
    won = true;
    player.win = true;
  }

  // Player death
  if (!player.alive) {
    gameOver = true;
  }

  // Coin animation
  for (const c of coins) {
    c.update();
  }
}

function draw() {
  // Sky
  ctx.fillStyle = COLORS.SKY_BLUE;
  ctx.fillRect(0, 0, SCREEN_W, SCREEN_H);

  // Background
  drawClouds(cloudOffset);
  drawHills();

  // Platforms
  for (const p of platforms) {
    ctx.fillStyle = COLORS.DIRT;
    ctx.fillRect(p.x, p.y, p.w, p.h);
    ctx.fillStyle = COLORS.DIRT_TOP;
    ctx.fillRect(p.x, p.y, p.w, 4);
  }

  // Coins
  for (const c of coins) {
    c.draw();
  }

  // Enemies
  for (const e of enemies) {
    e.draw();
  }

  // Flag
  if (flag) {
    flag.draw();
  }

  // Player
  player.draw();

  // UI - Score
  ctx.fillStyle = COLORS.BLACK;
  ctx.font = '28px Arial, sans-serif';
  ctx.fillText(`Score: ${score}`, 10, 35);

  // Game Over / Win
  ctx.textAlign = 'center';
  if (gameOver) {
    ctx.fillStyle = COLORS.RED;
    ctx.font = '48px Arial, sans-serif';
    ctx.fillText('GAME OVER', SCREEN_W / 2, 220);
    ctx.fillStyle = COLORS.BLACK;
    ctx.font = '28px Arial, sans-serif';
    ctx.fillText('Press R to Restart', SCREEN_W / 2, 280);
  }

  if (won) {
    ctx.fillStyle = COLORS.GREEN;
    ctx.font = '48px Arial, sans-serif';
    ctx.fillText('YOU WIN!', SCREEN_W / 2, 220);
    ctx.fillStyle = COLORS.BLACK;
    ctx.font = '28px Arial, sans-serif';
    ctx.fillText('Press R to Restart', SCREEN_W / 2, 280);
  }
  ctx.textAlign = 'left';

  // Controls hint
  ctx.fillStyle = COLORS.GRAY;
  ctx.font = '18px Arial, sans-serif';
  ctx.fillText('← → Move | Space Jump | R Restart', 10, SCREEN_H - 15);
}

function gameLoop() {
  if (keys['r']) {
    resetGame();
  }

  update();
  draw();
  requestAnimationFrame(gameLoop);
}

gameLoop();
