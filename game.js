const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
const scoreElement = document.getElementById("score");
const highScoreElement = document.getElementById("highScore");
const startPanel = document.getElementById("startPanel");
const panelTitle = document.getElementById("panelTitle");
const panelText = document.getElementById("panelText");
const actionButton = document.getElementById("actionButton");

const INK = "#263626";
const GREEN = "#6c8551";
const LIGHT_GREEN = "#91a875";
const GROUND = 330;
const SCALE = 1.35;

let state = "ready";
let score = 0;
let highScore = Number(localStorage.getItem("dino-high-score") || 0);
let speed = 310;
let lastTime = 0;
let spawnTimer = 0;
let nextSpawn = 1.2;
let groundOffset = 0;
let obstacles = [];
let particles = [];
let flash = 0;

const dino = {
  x: 150,
  y: GROUND,
  width: 54 * SCALE,
  height: 64 * SCALE,
  vy: 0,
  grounded: true,
  ducking: false,
  runFrame: 0
};

highScoreElement.textContent = formatScore(highScore);

function formatScore(value) {
  return Math.floor(value).toString().padStart(5, "0");
}

function resizeCanvas() {
  const rect = canvas.getBoundingClientRect();
  canvas.width = rect.width * devicePixelRatio;
  canvas.height = rect.height * devicePixelRatio;
  ctx.setTransform(canvas.width / 960, 0, 0, canvas.height / 420, 0, 0);
}

function startGame() {
  state = "running";
  score = 0;
  speed = 310;
  spawnTimer = 0;
  nextSpawn = 1.1;
  obstacles = [];
  particles = [];
  dino.y = GROUND;
  dino.vy = 0;
  dino.grounded = true;
  dino.ducking = false;
  scoreElement.textContent = "00000";
  startPanel.classList.add("hidden");
  lastTime = performance.now();
}

function endGame() {
  state = "ended";
  flash = 1;
  if (score > highScore) {
    highScore = Math.floor(score);
    localStorage.setItem("dino-high-score", String(highScore));
    highScoreElement.textContent = formatScore(highScore);
  }
  panelTitle.textContent = "再來一次！";
  panelText.textContent = `這次跑了 ${formatScore(score)} 分`;
  actionButton.textContent = "重新開始";
  startPanel.classList.remove("hidden");
}

function jump() {
  if (state !== "running") {
    startGame();
    return;
  }
  if (dino.grounded) {
    dino.ducking = false;
    dino.vy = -780;
    dino.grounded = false;
  }
}

function spawnObstacle() {
  const roll = Math.random();
  if (roll < 0.58) {
    const height = 42 + Math.random() * 18;
    obstacles.push({ type: "cactus", x: 970, y: GROUND - height, width: 34 + Math.random() * 12, height });
  } else if (roll < 0.86) {
    obstacles.push({ type: "rock", x: 970, y: GROUND - 31, width: 48, height: 31 });
  } else {
    obstacles.push({ type: "bird", x: 970, y: GROUND - 92 - Math.random() * 45, width: 56, height: 34 });
  }
}

function update(dt) {
  if (state !== "running") return;

  score += dt * 10;
  speed = Math.min(620, 310 + score * 1.1);
  scoreElement.textContent = formatScore(score);
  groundOffset = (groundOffset + speed * dt) % 80;

  dino.vy += 2200 * dt;
  dino.y += dino.vy * dt;
  if (dino.y >= GROUND) {
    dino.y = GROUND;
    dino.vy = 0;
    dino.grounded = true;
  }
  dino.runFrame += dt * (dino.grounded ? 10 : 3);

  spawnTimer += dt;
  if (spawnTimer >= nextSpawn) {
    spawnObstacle();
    spawnTimer = 0;
    nextSpawn = Math.max(0.72, 1.25 - score / 2500) + Math.random() * 0.65;
  }

  for (const obstacle of obstacles) {
    obstacle.x -= speed * dt;
  }
  obstacles = obstacles.filter((obstacle) => obstacle.x + obstacle.width > -20);

  particles = particles.filter((particle) => particle.life > 0);
  for (const particle of particles) {
    particle.x -= particle.speed * dt;
    particle.life -= dt;
  }

  for (const obstacle of obstacles) {
    if (hitsDino(obstacle)) {
      endGame();
      break;
    }
  }
}

function hitsDino(obstacle) {
  const duckOffset = dino.ducking ? 26 : 0;
  const dinoBox = {
    x: dino.x + 10,
    y: dino.y - dino.height + duckOffset,
    width: dino.width - 20,
    height: dino.height - duckOffset - 8
  };
  const padding = obstacle.type === "bird" ? 7 : 5;
  return (
    dinoBox.x < obstacle.x + obstacle.width - padding &&
    dinoBox.x + dinoBox.width > obstacle.x + padding &&
    dinoBox.y < obstacle.y + obstacle.height - padding &&
    dinoBox.y + dinoBox.height > obstacle.y + padding
  );
}

function draw() {
  ctx.clearRect(0, 0, 960, 420);

  ctx.fillStyle = "#fffdf5";
  ctx.fillRect(0, 0, 960, 420);

  drawCloud(120, 92, 0.9);
  drawCloud(520, 68, 0.65);
  drawCloud(790, 125, 0.8);

  ctx.fillStyle = "#dfe4c9";
  ctx.beginPath();
  ctx.moveTo(0, GROUND - 20);
  ctx.quadraticCurveTo(140, GROUND - 70, 280, GROUND - 24);
  ctx.quadraticCurveTo(430, GROUND - 72, 590, GROUND - 26);
  ctx.quadraticCurveTo(760, GROUND - 75, 960, GROUND - 28);
  ctx.lineTo(960, GROUND);
  ctx.lineTo(0, GROUND);
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = "rgba(38,54,38,0.28)";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(0, GROUND);
  ctx.lineTo(960, GROUND);
  ctx.stroke();

  ctx.strokeStyle = "rgba(38,54,38,0.12)";
  ctx.lineWidth = 2;
  for (let x = -groundOffset; x < 960; x += 80) {
    ctx.beginPath();
    ctx.moveTo(x, GROUND + 16);
    ctx.lineTo(x + 24, GROUND + 16);
    ctx.stroke();
  }

  drawDino();
  for (const obstacle of obstacles) drawObstacle(obstacle);

  if (flash > 0) {
    ctx.fillStyle = `rgba(108,133,81,${flash * 0.09})`;
    ctx.fillRect(0, 0, 960, 420);
    flash = Math.max(0, flash - 0.04);
  }
}

function drawCloud(x, y, scale) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);
  ctx.fillStyle = "rgba(173,183,153,0.22)";
  ctx.beginPath();
  ctx.arc(0, 10, 15, Math.PI, 0);
  ctx.arc(18, 4, 22, Math.PI, 0);
  ctx.arc(44, 11, 14, Math.PI, 0);
  ctx.lineTo(44, 22);
  ctx.lineTo(-15, 22);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function drawDino() {
  ctx.save();
  ctx.translate(dino.x, dino.y);
  ctx.scale(SCALE, SCALE);

  const duck = dino.ducking && dino.grounded;
  if (duck) {
    ctx.translate(0, 12);
  }

  ctx.fillStyle = GREEN;
  ctx.strokeStyle = INK;
  ctx.lineWidth = 3;

  ctx.beginPath();
  ctx.moveTo(-1, -58);
  ctx.quadraticCurveTo(-8, -66, 7, -70);
  ctx.lineTo(43, -70);
  ctx.lineTo(51, -58);
  ctx.lineTo(51, -38);
  ctx.quadraticCurveTo(49, -24, 35, -18);
  ctx.lineTo(12, -18);
  ctx.lineTo(6, -3);
  ctx.lineTo(-10, -3);
  ctx.lineTo(-5, -18);
  ctx.quadraticCurveTo(-16, -26, -17, -42);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(30, -65);
  ctx.lineTo(58, -65);
  ctx.lineTo(58, -47);
  ctx.lineTo(42, -47);
  ctx.lineTo(42, -38);
  ctx.lineTo(29, -38);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = INK;
  ctx.beginPath();
  ctx.arc(48, -57, 3.2, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = GREEN;
  ctx.strokeStyle = INK;
  ctx.beginPath();
  ctx.moveTo(1, -43);
  ctx.lineTo(-16, -53);
  ctx.lineTo(-20, -43);
  ctx.lineTo(-6, -30);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(7, -21);
  ctx.lineTo(14, -21);
  ctx.lineTo(10, -3);
  ctx.lineTo(-2, -3);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(31, -21);
  ctx.lineTo(38, -21);
  ctx.lineTo(42, -3);
  ctx.lineTo(30, -3);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = INK;
  ctx.beginPath();
  ctx.arc(4, -3, 3, 0, Math.PI);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(36, -3, 3, 0, Math.PI);
  ctx.fill();

  ctx.restore();
}

function drawObstacle(obstacle) {
  ctx.save();
  ctx.translate(obstacle.x, obstacle.y);
  ctx.fillStyle = INK;
  ctx.strokeStyle = INK;
  ctx.lineWidth = 3;

  if (obstacle.type === "cactus") {
    ctx.fillStyle = GREEN;
    ctx.fillRect(obstacle.width * 0.38, 0, obstacle.width * 0.24, obstacle.height);
    ctx.strokeRect(obstacle.width * 0.38, 0, obstacle.width * 0.24, obstacle.height);
    ctx.fillRect(0, obstacle.height * 0.42, obstacle.width * 0.46, obstacle.height * 0.18);
    ctx.strokeRect(0, obstacle.height * 0.42, obstacle.width * 0.46, obstacle.height * 0.18);
    ctx.fillRect(obstacle.width * 0.54, obstacle.height * 0.26, obstacle.width * 0.46, obstacle.height * 0.18);
    ctx.strokeRect(obstacle.width * 0.54, obstacle.height * 0.26, obstacle.width * 0.46, obstacle.height * 0.18);
  } else if (obstacle.type === "rock") {
    ctx.beginPath();
    ctx.moveTo(5, obstacle.height);
    ctx.lineTo(10, 10);
    ctx.quadraticCurveTo(24, -4, 38, 9);
    ctx.lineTo(47, obstacle.height);
    ctx.closePath();
    ctx.fillStyle = "#a9af96";
    ctx.fill();
    ctx.stroke();
  } else {
    ctx.fillStyle = LIGHT_GREEN;
    ctx.beginPath();
    ctx.moveTo(4, 12);
    ctx.quadraticCurveTo(18, -2, 38, 9);
    ctx.lineTo(55, 16);
    ctx.lineTo(38, 22);
    ctx.quadraticCurveTo(24, 35, 8, 24);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(20, 22);
    ctx.quadraticCurveTo(30, 38, 42, 24);
    ctx.stroke();
  }
  ctx.restore();
}

function loop(time) {
  const dt = Math.min((time - lastTime) / 1000 || 0, 0.032);
  lastTime = time;
  update(dt);
  draw();
  requestAnimationFrame(loop);
}

window.addEventListener("keydown", (event) => {
  if (event.code === "Space" || event.code === "ArrowUp") {
    event.preventDefault();
    jump();
  }
  if (event.code === "ArrowDown") {
    event.preventDefault();
    dino.ducking = state === "running" && dino.grounded;
  }
});

window.addEventListener("keyup", (event) => {
  if (event.code === "ArrowDown") dino.ducking = false;
});

canvas.addEventListener("pointerdown", () => jump());
actionButton.addEventListener("click", (event) => {
  event.stopPropagation();
  startGame();
});

window.addEventListener("resize", resizeCanvas);
resizeCanvas();
lastTime = performance.now();
requestAnimationFrame(loop);
