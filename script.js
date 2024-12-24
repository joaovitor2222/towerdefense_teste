// Seleciona o canvas e o contexto
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

// Variáveis globais
let enemies = [];
let towers = [];
let bullets = [];
let wave = 0;
let money = 400;
let lives = 10; // Número inicial de vidas
let bossHpIncrement = 0.1; // Incremento de 10% na vida do chefe por onda
let gameWon = false; // Variável de controle para verificar vitória



let freezeUses = 5; // Power-up de Congelamento pode ser usado 3 vezes
let poisonUses = 3; // Power-up de Envenenamento pode ser usado 3 vezes
let hypnoUses = 5; // Power-up de Hipnose pode ser usado 3 vezes

const waypoints = [
  { x: 50, y: 50 },
  { x: 750, y: 50 },
  { x: 750, y: 450 },
  { x: 50, y: 450 },
];

const mobileShopButton = document.getElementById("mobileShopButton");
const towerShop = document.getElementById("towershop");

const moneyDisplay = document.getElementById("moneyDisplay");
const freezeButton = document.getElementById("freezeButton");
const poisonButton = document.getElementById("poisonButton");
const hypnoButton = document.getElementById("hypnoButton");


// Alterna a visibilidade da loja ao clicar no botão
mobileShopButton.addEventListener("click", () => {
  if (towerShop.classList.contains("visible")) {
      towerShop.classList.remove("visible"); // Oculta a loja
  } else {
      towerShop.classList.add("visible"); // Mostra a loja
  }
});

// Configura rolagem automática ao abrir a loja (opcional)
mobileShopButton.addEventListener("click", () => {
  if (towerShop.classList.contains("visible")) {
      towerShop.scrollTop = 0; // Rola para o topo ao abrir
  }
});


// Atualiza a exibição do dinheiro
function updateMoneyDisplay() {
  moneyDisplay.textContent = `Moedas: ${money}`;
}

// Atualiza o botão do power-up
function updatePowerUpButton(button, usesLeft) {
  if (usesLeft <= 0) {
    button.style.backgroundColor = "gray";
    button.disabled = true;
  }
}

function updateLivesDisplay() {
  const livesDisplay = document.getElementById("livesDisplay");
  livesDisplay.textContent = `Vidas: ${lives}`;
}


// Função para desenhar o caminho
function drawPath() {
  ctx.beginPath();
  ctx.moveTo(waypoints[0].x, waypoints[0].y);
  for (let i = 1; i < waypoints.length; i++) {
    ctx.lineTo(waypoints[i].x, waypoints[i].y);
  }
  ctx.strokeStyle = "black";
  ctx.lineWidth = 5;
  ctx.stroke();
}

class Bullet {
  constructor(x, y, target, damage) {
      this.x = x;
      this.y = y;
      this.target = target;
      this.damage = damage;
      this.speed = 5;
  }

  move() {
      if (!this.target || typeof this.target.takeDamage !== "function" || this.target.hp <= 0) {
          return true; // Remove o projétil se o alvo for inválido ou destruído
      }

      const dx = this.target.x - this.x;
      const dy = this.target.y - this.y;
      const distance = Math.hypot(dx, dy);

      if (distance < 5) {
          this.target.takeDamage(this.damage); // Aplica dano ao inimigo
          return true; // Remove o projétil
      } else {
          this.x += (dx / distance) * this.speed;
          this.y += (dy / distance) * this.speed;
          return false;
      }
  }

  draw() {
      ctx.fillStyle = "black";
      ctx.beginPath();
      ctx.arc(this.x, this.y, 5, 0, Math.PI * 2);
      ctx.fill();
  }
}





class Enemy {
  constructor(hp, speed, color, moneyDrop, isBoss = false) {
      this.x = waypoints[0].x;
      this.y = waypoints[0].y;
      this.hp = hp;
      this.maxHp = hp;
      this.speed = speed;
      this.color = color;
      this.moneyDrop = moneyDrop;
      this.isBoss = isBoss;
      this.currentWaypoint = 1;
      this.isFrozen = false;
      this.isHypnotized = false;
      this.poisonTime = 0;
      this.radius = 15; // Hitbox circular
  }

  move() {
    if (this.isFrozen) return;

    const target = this.isHypnotized
        ? waypoints[this.currentWaypoint - 1] || waypoints[0]
        : waypoints[this.currentWaypoint];

    const dx = target.x - this.x;
    const dy = target.y - this.y;
    const distance = Math.hypot(dx, dy);

    if (distance < 2) {
        if (this.isHypnotized) {
            this.currentWaypoint--;
        } else {
            this.currentWaypoint++;
        }

        if (this.currentWaypoint < 0 || this.currentWaypoint >= waypoints.length) {
            this.hp = 0;

            if (!this.isHypnotized) { // Apenas inimigos não hipnotizados reduzem vidas
                lives--;
                updateLivesDisplay();

                if (lives <= 0) {
                    alert("Você perdeu todas as vidas! Fim de jogo!");
                    location.reload();
                }
            }
        }
    } else {
        this.x += (dx / distance) * this.speed;
        this.y += (dy / distance) * this.speed;
    }

    if (this.poisonTime > 0) {
        this.hp -= 50 / 6;
        this.poisonTime--;
    }
  }


  takeDamage(amount) {
    this.hp -= amount;
    if (this.hp <= 0) {
        this.hp = 0;
        money += this.moneyDrop;
        updateMoneyDisplay();
        if (this.isBoss) {
            lives++;
            updateLivesDisplay();
        }
    }
  }


  draw() {
      ctx.fillStyle = this.color;
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = "red";
      ctx.fillRect(this.x - 10, this.y - 15, 20, 5);
      ctx.fillStyle = "green";
      ctx.fillRect(this.x - 10, this.y - 15, (this.hp / this.maxHp) * 20, 5);
  }
}



class Tower {
  constructor(x, y, damage, fireRate, range, color, area = false, areaRadius = 0, isBuffer = false) {
      this.x = x;
      this.y = y;
      this.damage = damage;
      this.baseDamage = damage; // Armazena o dano original para resetar após o buff
      this.fireRate = fireRate;
      this.range = range;
      this.color = color;
      this.area = area;
      this.areaRadius = areaRadius;
      this.cooldown = 0;
      this.isBuffer = isBuffer; // Define se a torre é uma torre de buff
      this.buffArea = 100; // Raio do efeito de buff
  }

  shoot() {
      if (this.cooldown > 0) {
          this.cooldown--;
          return;
      }

      for (let enemy of enemies) {
          const distance = Math.hypot(this.x - enemy.x, this.y - enemy.y);
          if (distance < this.range) {
              if (this.area) {
                  // Torre de dano em área
                  for (let target of enemies) {
                      const areaDistance = Math.hypot(this.x - target.x, this.y - target.y);
                      if (areaDistance < this.areaRadius) {
                          target.takeDamage(this.damage);
                      }
                  }
              } else {
                  // Torre com projéteis
                  bullets.push(new Bullet(this.x, this.y, enemy, this.damage));
              }
              this.cooldown = this.fireRate;
              break;
          }
      }
  }

  applyBuff() {
      if (this.isBuffer) {
          towers.forEach((tower) => {
              const distance = Math.hypot(this.x - tower.x, this.y - tower.y);
              if (tower !== this && distance <= this.buffArea) {
                  tower.damage = tower.baseDamage * 1.2; // Aumenta o dano em 20%
              } else {
                  tower.damage = tower.baseDamage; // Reseta o dano caso esteja fora do alcance
              }
          });
      }
  }

  draw() {
    // Desenha o corpo da torre
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.arc(this.x, this.y, 15, 0, Math.PI * 2);
    ctx.fill();

    // Se a torre for de buff, desenha o círculo laranja ao redor
    if (this.isBuffer) {
        ctx.fillStyle = "rgba(255, 165, 0, 0.6)"; // Cor laranja transparente
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.buffArea, 0, Math.PI * 2);
        ctx.fill();
    }
  }

}



// Função de power-up de Envenenamento
function poisonEnemies() {
  if (poisonUses > 0 && money >= 330) {
    money -= 330; // Desconta o custo
    updateMoneyDisplay();

    enemies.forEach((enemy) => {
      if (!enemy.isHypnotized) {
        // Apenas inimigos não hipnotizados são afetados
        if (enemy.hp <= 300) {
          enemy.hp = 0; // Morte instantânea para inimigos com HP <= 300
        } else {
          enemy.poisonTime = 6; // Aplica veneno por 6 segundos
        }
      }
    });

    poisonUses--;
    updatePowerUpButton(poisonButton, poisonUses);
  } else if (money < 330) {
    alert("Dinheiro insuficiente para usar o power-up de Envenenamento!");
  }
}

// Função de power-up de Hipnose
function hypnotizeEnemies() {
  if (hypnoUses > 0 && money >= 200) {
    money -= 200; // Desconta o custo
    updateMoneyDisplay();

    enemies.forEach((enemy) => {
      if (!enemy.isBoss) {
        // Não hipnotiza chefes
        enemy.isHypnotized = true; // Marca o inimigo como hipnotizado
        enemy.color = "purple"; // Muda a cor para indicar hipnose

        // Inimigos hipnotizados atacam aliados e se destroem ao colidir
        enemy.attackAllies = true;

        // Define o comportamento para inimigos hipnotizados
        setTimeout(() => {
          enemy.isHypnotized = false; // Remove a hipnose
          enemy.color = "red"; // Volta à cor original
          enemy.attackAllies = false; // Para de atacar aliados
        }, 10000); // Hipnose dura 10 segundos
      }
    });

    hypnoUses--; // Reduz o número de usos restantes
    updatePowerUpButton(hypnoButton, hypnoUses);
  } else if (money < 200) {
    alert("Dinheiro insuficiente para usar o power-up de Hipnose!");
  }
}

function checkCollisions() {
  // Percorre todos os inimigos
  for (let i = 0; i < enemies.length; i++) {
      const enemy1 = enemies[i]; // Declara corretamente o primeiro inimigo

      if (enemy1.isHypnotized) { // Apenas inimigos hipnotizados verificam colisão
          for (let j = 0; j < enemies.length; j++) {
              if (i !== j) { // Evita colisão consigo mesmo
                  const enemy2 = enemies[j]; // Segundo inimigo
                  const distance = Math.hypot(enemy1.x - enemy2.x, enemy1.y - enemy2.y);

                  if (distance < enemy1.radius + enemy2.radius) {
                      if (!enemy2.isHypnotized) {
                          // Causa dano ao inimigo não hipnotizado
                          enemy2.takeDamage(3000);

                          // Inimigo hipnotizado se destrói após a colisão
                          enemy1.hp = 0;
                          console.log(
                              `Inimigo hipnotizado (${enemy1.color}) causou dano de 3000 no inimigo (${enemy2.color}).`
                          );
                          break; // Sai do loop após a colisão
                      }
                  }
              }
          }
      }
  }

  // Remove inimigos com HP <= 0
  enemies = enemies.filter(enemy => enemy.hp > 0);
}











// Vincula a função ao botão de hipnose
hypnoButton.addEventListener("click", hypnotizeEnemies);

// Atualiza o botão do power-up
function updatePowerUpButton(button, usesLeft) {
  if (usesLeft <= 0) {
    button.style.backgroundColor = "gray";
    button.disabled = true;
  }
}

// Função de power-up de Congelamento
function freezeEnemies() {
    if (freezeUses > 0 && money >= 150) {
        money -= 150;
        updateMoneyDisplay();

        enemies.forEach((enemy) => {
            if (!enemy.isHypnotized) {
                enemy.isFrozen = true;
                setTimeout(() => {
                    enemy.isFrozen = false;
                    enemy.speed *= 0.5;
                    setTimeout(() => {
                        enemy.speed *= 2;
                    }, 6000);
                }, 10000);
            }
        });

        freezeUses--;
        updatePowerUpButton(freezeButton, freezeUses);
    } else if (money < 150) {
        alert("Dinheiro insuficiente para usar o power-up de Congelamento!");
    }
}


function spawnWave() {
  wave++;
  for (let i = 0; i < 10 + wave; i++) {
      enemies.push(new Enemy(150, 1.5, "red", 40)); // Inimigo comum
  }

  if (wave % 10 === 0) {
      for (let i = 0; i < 3; i++) {
          enemies.push(new Enemy(400, 1.5, "orange", 100)); // Inimigo laranja
      }
  }

  if (wave % 15 === 0) {
      let bossHp = 2000 * (1 + bossHpIncrement * Math.floor(wave / 15));
      enemies.push(new Enemy(bossHp, 0.5, "darkgreen", 500, true)); // Chefe
  }
}





function gameLoop() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawPath();

  checkCollisions();

  enemies = enemies.filter(enemy => enemy.hp > 0);
  for (let enemy of enemies) {
      enemy.move();
      enemy.draw();
  }

  towers.forEach((tower) => {
      tower.applyBuff(); // Aplica o buff da torre laranja
      tower.shoot();
      tower.draw();
  });

  bullets = bullets.filter(bullet => {
      if (bullet.move()) return false;
      bullet.draw();
      return true;
  });

  checkWinCondition();

  requestAnimationFrame(gameLoop);
}



function checkWinCondition() {
  if (money >= 10000 && !gameWon) {
      gameWon = true; // Marca como vencido
      const choice = confirm("Parabéns! Você venceu o jogo! Deseja continuar no modo infinito?");
      if (!choice) {
          location.reload(); // Reinicia o jogo
      }
    }
  }


function isTooClose(newX, newY, enemies, minDistance) {
  for (let enemy of enemies) {
      const distance = Math.hypot(newX - enemy.x, newY - enemy.y);
      if (distance < minDistance) {
          return true; // Está muito perto de outro inimigo
      }
  }
  return false; // Distância suficiente
}



// Vincula botões de power-ups
freezeButton.addEventListener("click", freezeEnemies);
poisonButton.addEventListener("click", poisonEnemies);
hypnoButton.addEventListener("click", hypnotizeEnemies);

document.querySelectorAll(".tower").forEach((button) => {
  button.addEventListener("click", () => {
      const type = button.getAttribute("data-type");
      const price = parseInt(button.getAttribute("data-price"));

      if (money >= price) {
          money -= price;
          updateMoneyDisplay();

          const x = Math.random() * (canvas.width - 30) + 15; // Evita bordas
          const y = Math.random() * (canvas.height - 30) + 15;

          let newTower;
          if (type === "blue") {
              newTower = new Tower(x, y, 80, 60, 100, "blue");
          } else if (type === "orange") {
            newTower = new Tower(x, y, 400, 180, 150, "orange", false, 0, true); // A torre laranja é uma torre de buff
          } else if (type === "sniper") {
              newTower = new Tower(x, y, 300, 120, Infinity, "darkgreen", false, 10);
          } else if (type === "area") {
              newTower = new Tower(x, y, 1000, 240, 150, "darkblue", true, 50); // Ajuste do fireRate para 4 segundos
          } else if (type === "machinegun") {
              newTower = new Tower(x, y, 125, 12, 90, "darkred"); // Torre metralhadora
          }

          if (newTower) {
              towers.push(newTower);
          } else {
              console.error("Erro: tipo de torre inválido", type);
          }
      } else {
          alert("Dinheiro insuficiente para comprar esta torre!");
      }
  });
});


document.addEventListener("DOMContentLoaded", () => {
  const mobileShopButton = document.getElementById("mobileShopButton");
  const towerShop = document.getElementById("towershop");
  const powerUpShop = document.getElementById("powerUpShop");

  // Verifica o tamanho da tela no carregamento
  const isMobile = window.innerWidth <= 768;

  // Esconde as lojas inicialmente no mobile
  if (isMobile) {
      towerShop.classList.add("hidden");
      powerUpShop.classList.add("hidden");
  }

  // Alterna a visibilidade das lojas ao clicar no botão
  mobileShopButton.addEventListener("click", () => {
      const areShopsHidden =
          towerShop.classList.contains("hidden") &&
          powerUpShop.classList.contains("hidden");

      if (areShopsHidden) {
          towerShop.classList.remove("hidden");
          towerShop.classList.add("visible");
          powerUpShop.classList.remove("hidden");
          powerUpShop.classList.add("visible");
      } else {
          towerShop.classList.add("hidden");
          towerShop.classList.remove("visible");
          powerUpShop.classList.add("hidden");
          powerUpShop.classList.remove("visible");
      }
  });
});





// Inicia o jogo
setInterval(spawnWave, 10000); // Chama a função spawnWave a cada 10 segundos
gameLoop(); // Inicia o loop do jogo
