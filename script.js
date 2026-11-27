let gameState = {
  coins: 0,
  totalClicks: 0,
  baseClickPower: 1,
  multiplier: 1,
  coinsPerSecond: 0,
  tierIndex: 0,
  combo: 1,
  selectedSkinColor: null,
  playerName: "",
  rebirthCount: 0
};

let lastClickTime = 0;
let comboTimer = null;
let lastActivityTime = Date.now();
let afkCheckInterval = null;

const API_KEY = "$2a$10$/E0Hg9H1j77Tf/ew.CKFju9aGdyrlFvdL7PrACuJ2TaM2Z8rwGlee";
const BIN_ID = "6b08acbd3957a11c53b53765";
const API_URL = `https://api.jsonbin.io/v3/b/${BIN_ID}`;

const pokeballImgUrl = "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/poke-ball.png";

const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
function playSound(type) {
  if (audioCtx.state === 'suspended') audioCtx.resume();
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.connect(gain);
  gain.connect(audioCtx.destination);

  if (type === 'click') {
    osc.frequency.setValueAtTime(300, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(600, audioCtx.currentTime + 0.05);
    gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.05);
    osc.start(); osc.stop(audioCtx.currentTime + 0.05);
  } else if (type === 'crit') {
    osc.frequency.setValueAtTime(500, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(1200, audioCtx.currentTime + 0.15);
    gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.15);
    osc.start(); osc.stop(audioCtx.currentTime + 0.15);
  } else if (type === 'golden') {
    osc.frequency.setValueAtTime(800, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(1600, audioCtx.currentTime + 0.25);
    gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.25);
    osc.start(); osc.stop(audioCtx.currentTime + 0.25);
  }
}

const pokeballs = [
  { name: "Pokeball Clássica", badge: "Comum", color: "#ef4444", req: 0, rebirthReq: 0 },
  { name: "Great Ball", badge: "Incomum", color: "#3b82f6", req: 200, rebirthReq: 0 },
  { name: "Ultra Ball", badge: "Rara", color: "#eab308", req: 2000, rebirthReq: 0 },
  { name: "Master Ball", badge: "Lendária", color: "#a855f7", req: 15000, rebirthReq: 0 },
  { name: "Safari Ball", badge: "Épica", color: "#22c55e", req: 80000, rebirthReq: 0 }
];

const skins = [
  { name: "Vermelha Padrão", color: "#ef4444" },
  { name: "Azul Neon", color: "#06b6d4" },
  { name: "Rosa Amor", color: "#ec4899" },
  { name: "Sombria", color: "#334155" },
  { name: "Verde Esmeralda", color: "#10b981" },
  { name: "Dourada Reluzente", color: "#f59e0b" }
];

const defaultUpgrades = [
  { id: "click1", name: "Clique Duplo", isDoubleBall: true, desc: "+1 por Clique Base", cost: 15, cpc: 1, cps: 0, count: 0, mult: 1.4, rebirthReq: 0 },
  { id: "auto1", name: "Pikachu Ajudante", icon: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/25.png", desc: "+1 por Segundo", cost: 50, cpc: 0, cps: 1, count: 0, mult: 1.35, rebirthReq: 0 },
  { id: "click2", name: "Luva de Captura", icon: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/power-bracer.png", desc: "+5 por Clique Base", cost: 150, cpc: 5, cps: 0, count: 0, mult: 1.5, rebirthReq: 0 },
  { id: "auto2", name: "Centro Pokémon", icon: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/max-potion.png", desc: "+8 por Segundo", cost: 400, cpc: 0, cps: 8, count: 0, mult: 1.4, rebirthReq: 0 },
  { id: "click3", name: "Arremesso Perfeito", icon: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/scope-lens.png", desc: "+25 por Clique Base", cost: 1200, cpc: 25, cps: 0, count: 0, mult: 1.6, rebirthReq: 0 },
  { id: "auto3", name: "Charizard de Elite", icon: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/6.png", desc: "+40 por Segundo", cost: 3000, cpc: 0, cps: 40, count: 0, mult: 1.5, rebirthReq: 0 },
  { id: "click4", name: "Mewtwo Telepático", icon: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/150.png", desc: "+100 por Clique Base", cost: 10000, cpc: 100, cps: 0, count: 0, mult: 1.65, rebirthReq: 0 },
  { id: "auto4", name: "Fábrica Silph Co.", icon: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/up-grade.png", desc: "+250 por Segundo", cost: 35000, cpc: 0, cps: 250, count: 0, mult: 1.55, rebirthReq: 0 },
  { id: "auto5", name: "Rayquaza Lendário", icon: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/384.png", desc: "+1,200 por Segundo", cost: 150000, cpc: 0, cps: 1200, count: 0, mult: 1.6, rebirthReq: 0 },
  { id: "rb_up1", name: "Orbe Adamante (Dialga)", icon: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/adamant-orb.png", desc: "+500 por Clique Base", cost: 400000, cpc: 500, cps: 0, count: 0, mult: 1.7, rebirthReq: 1 },
  { id: "rb_up2", name: "Orbe Lustroso (Palkia)", icon: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/lustrous-orb.png", desc: "+2.500 por Clique Base", cost: 2000000, cpc: 2500, cps: 0, count: 0, mult: 1.75, rebirthReq: 2 },
  { id: "rb_up3", name: "Orbe Griseous (Giratina)", icon: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/griseous-orb.png", desc: "+10.000 por Clique Base", cost: 8000000, cpc: 10000, cps: 0, count: 0, mult: 1.8, rebirthReq: 3 },
  { id: "rb_up4", name: "Flauta Celestial (Arceus)", icon: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/azure-flute.png", desc: "+25.000 por Clique Base", cost: 35000000, cpc: 25000, cps: 0, count: 0, mult: 1.85, rebirthReq: 4 },
  { id: "rb_up5", name: "DNA Sincro (Kyurem)", icon: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/dna-splicers.png", desc: "+50.000 por Clique Base", cost: 150000000, cpc: 50000, cps: 0, count: 0, mult: 1.9, rebirthReq: 5 }
];

const defaultMultipliers = [
  { id: "m_great", name: "Super Ball Boost", icon: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/great-ball.png", desc: "Multiplica cliques por 2x", cost: 500, factor: 2, bought: false, rebirthReq: 0 },
  { id: "m_ultra", name: "Ultra Ball Boost", icon: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/ultra-ball.png", desc: "Multiplica cliques por 2x (Total 4x)", cost: 3500, factor: 2, bought: false, rebirthReq: 0 },
  { id: "m_master", name: "Master Ball Boost", icon: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/master-ball.png", desc: "Multiplica cliques por 2x (Total 8x)", cost: 25000, factor: 2, bought: false, rebirthReq: 0 },
  { id: "m_safari", name: "Safari Ball Boost", icon: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/safari-ball.png", desc: "Multiplica cliques por 2x (Total 16x)", cost: 150000, factor: 2, bought: false, rebirthReq: 0 },
  { id: "m_gold", name: "Master Gold Boost", icon: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/luxury-ball.png", desc: "Multiplica cliques por 3x (Total 48x)", cost: 1000000, factor: 3, bought: false, rebirthReq: 0 },
  { id: "m_premier", name: "Premier Ball (Especial)", icon: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/premier-ball.png", desc: "Multiplica cliques por 2x", cost: 400000, factor: 2, bought: false, rebirthReq: 1 },
  { id: "m_cherish", name: "Cherish Ball", icon: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/cherish-ball.png", desc: "Multiplica cliques por 2.5x", cost: 2000000, factor: 2.5, bought: false, rebirthReq: 1 },
  { id: "m_park", name: "Park Ball", icon: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/park-ball.png", desc: "Multiplica cliques por 3x", cost: 8000000, factor: 3, bought: false, rebirthReq: 2 },
  { id: "m_dive", name: "Dive Ball (Abissal)", icon: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/dive-ball.png", desc: "Multiplica cliques por 3.5x", cost: 25000000, factor: 3.5, bought: false, rebirthReq: 2 },
  { id: "m_dream", name: "Dream Ball", icon: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/dream-ball.png", desc: "Multiplica cliques por 4x", cost: 100000000, factor: 4, bought: false, rebirthReq: 3 },
  { id: "m_dusk", name: "Dusk Ball (Sombria)", icon: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/dusk-ball.png", desc: "Multiplica cliques por 4.5x", cost: 350000000, factor: 4.5, bought: false, rebirthReq: 3 },
  { id: "m_beast", name: "Beast Ball", icon: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/beast-ball.png", desc: "Multiplica cliques por 5x", cost: 1000000000, factor: 5, bought: false, rebirthReq: 4 },
  { id: "m_heal", name: "Heal Ball (Curativa)", icon: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/heal-ball.png", desc: "Multiplica cliques por 6x", cost: 3000000000, factor: 6, bought: false, rebirthReq: 4 },
  { id: "m_prism", name: "Prism Ball", icon: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/master-ball.png", desc: "Multiplica cliques por 8x", cost: 10000000000, factor: 8, bought: false, rebirthReq: 5 },
  { id: "m_gs", name: "GS Ball (Lendária Mítica)", icon: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/luxury-ball.png", desc: "Multiplica cliques por 10x", cost: 50000000000, factor: 10, bought: false, rebirthReq: 5 }
];

let upgrades = JSON.parse(JSON.stringify(defaultUpgrades));
let multiplierUpgrades = JSON.parse(JSON.stringify(defaultMultipliers));

const gameContainer = document.getElementById("game-container");
const mainMenu = document.getElementById("main-menu");
const pokeballBtn = document.getElementById("pokeball-btn");
const pokeballTopBg = document.getElementById("pokeball-top-bg");
const lblCoins = document.getElementById("lbl-coins");
const lblCpc = document.getElementById("lbl-cpc");
const lblCps = document.getElementById("lbl-cps");
const lblBadge = document.getElementById("lbl-badge");
const lblBallName = document.getElementById("lbl-ball-name");
const upgradesContainer = document.getElementById("upgrades-container");
const multipliersContainer = document.getElementById("multipliers-container");
const skinsContainer = document.getElementById("skins-container");
const rebirthBtn = document.getElementById("rebirth-btn");
const rebirthCostLbl = document.getElementById("rebirth-cost-lbl");
const welcomeSubtitle = document.getElementById("welcome-subtitle");

function getRebirthCost() {
  const costs = [5000000, 25000000, 100000000, 500000000, 2000000000];
  return costs[gameState.rebirthCount] || 2000000000;
}

function showCustomMessage(icon, title, text, showCancel = true, onYesCallback = null) {
  document.getElementById("confirm-icon").innerText = icon;
  document.getElementById("confirm-title").innerText = title;
  document.getElementById("confirm-text").innerText = text;
  
  const yesBtn = document.getElementById("confirm-yes-btn");
  const noBtn = document.getElementById("confirm-no-btn");

  if (showCancel) {
    yesBtn.style.display = "block";
    yesBtn.innerText = "Sim";
    noBtn.style.display = "block";
    noBtn.onclick = () => {
      closeCustomConfirm();
      if (onYesCallback) onYesCallback();
    };
  } else {
    yesBtn.style.display = "block";
    yesBtn.innerText = "Ok";
    noBtn.style.display = "none";
    yesBtn.onclick = () => {
      closeCustomConfirm();
      if (onYesCallback) onYesCallback();
    };
  }

  document.getElementById("custom-confirm-modal").classList.remove("hidden");
}

function closeCustomConfirm() {
  document.getElementById("custom-confirm-modal").classList.add("hidden");
}

function startNewGame() {
  if (!gameState.playerName) {
    openNameTagModal(true);
    return;
  }
  
  gameState.coins = 0;
  gameState.totalClicks = 0;
  gameState.baseClickPower = 1;
  gameState.multiplier = 1;
  gameState.coinsPerSecond = 0;
  gameState.tierIndex = 0;
  gameState.combo = 1;
  gameState.selectedSkinColor = null;
  gameState.rebirthCount = 0;

  upgrades = JSON.parse(JSON.stringify(defaultUpgrades));
  multiplierUpgrades = JSON.parse(JSON.stringify(defaultMultipliers));

  const initialBall = pokeballs[0];
  lblBadge.innerText = initialBall.badge;
  lblBadge.style.background = initialBall.color;
  lblBallName.innerText = initialBall.name;
  pokeballTopBg.style.background = initialBall.color;

  renderUpgrades();
  renderMultipliers();
  renderSkins();
  checkRebirthAvailable();
  updateUI();

  mainMenu.classList.add("hidden");
  gameContainer.classList.remove("hidden");
  startAfkTimer();
}

function promptSaveScore() {
  showCustomMessage(
    "💾",
    "Salvar Pontuação",
    "Tem certeza? Sua pontuação será salva e você retornará ao menu principal.",
    true,
    () => {
      saveScoreAndGame();
    }
  );
}

async function saveScoreAndGame() {
  let scores = JSON.parse(localStorage.getItem("pokeLeaderboard") || "[]");

  try {
    const res = await fetch(`${API_URL}/latest`, {
      headers: { "X-Master-Key": API_KEY }
    });
    if (res.ok) {
      const data = await res.json();
      if (data.record && data.record.scores) {
        scores = data.record.scores;
      }
    }
  } catch (e) {}

  let existingIndex = scores.findIndex(s => s.name.toLowerCase() === gameState.playerName.toLowerCase());
  if (existingIndex >= 0) {
    if (gameState.totalClicks > scores[existingIndex].clicks) {
      scores[existingIndex].clicks = gameState.totalClicks;
    }
  } else {
    scores.push({ name: gameState.playerName, clicks: gameState.totalClicks });
  }

  scores.sort((a, b) => b.clicks - a.clicks);
  localStorage.setItem("pokeLeaderboard", JSON.stringify(scores));

  try {
    await fetch(API_URL, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "X-Master-Key": API_KEY
      },
      body: JSON.stringify({ scores: scores.slice(0, 30) })
    });
  } catch (e) {}

  showCustomMessage(
    "✅",
    "Sucesso!",
    "Pontuação salva com sucesso! Retornando ao menu...",
    false,
    () => {
      gameContainer.classList.add("hidden");
      mainMenu.classList.remove("hidden");
    }
  );
}

async function openLeaderboard() {
  const list = document.getElementById("leaderboard-list");
  list.innerHTML = `<div style="text-align: center; color: #94a3b8; padding: 15px; font-size: 0.85rem;">Carregando placar...</div>`;
  document.getElementById("leaderboard-modal").classList.remove("hidden");

  let scores = JSON.parse(localStorage.getItem("pokeLeaderboard") || "[]");

  try {
    const res = await fetch(`${API_URL}/latest`, {
      headers: { "X-Master-Key": API_KEY }
    });
    if (res.ok) {
      const data = await res.json();
      if (data.record && data.record.scores) {
        scores = data.record.scores;
        localStorage.setItem("pokeLeaderboard", JSON.stringify(scores));
      }
    }
  } catch (e) {}

  list.innerHTML = "";
  if (scores.length === 0) {
    list.innerHTML = `<div style="text-align: center; color: #94a3b8; padding: 15px; font-size: 0.85rem;">Nenhuma pontuação salva ainda.</div>`;
  } else {
    scores.forEach((p, idx) => {
      let item = document.createElement("div");
      item.className = "leaderboard-item";
      item.innerHTML = `<span>#${idx+1} <b>${escapeHTML(p.name)}</b></span> <span style="color:#ffcb05;">${p.clicks.toLocaleString()} cliques</span>`;
      list.appendChild(item);
    });
  }
}

function closeLeaderboard() {
  document.getElementById("leaderboard-modal").classList.add("hidden");
}

let isForcedNameTag = false;

function openNameTagModal(forced = false) {
  isForcedNameTag = forced;
  const savedName = localStorage.getItem("poke_nametag") || gameState.playerName;
  document.getElementById("nametag-input").value = savedName;
  document.getElementById("password-input").value = "";
  document.getElementById("password-container").style.display = "none";
  document.getElementById("nametag-error-msg").innerText = "";
  
  const titleEl = document.getElementById("nametag-title");
  const cancelBtn = document.getElementById("nametag-cancel-btn");

  if (forced) {
    titleEl.innerText = "Escolha sua Nametag";
    cancelBtn.style.display = "none";
  } else {
    titleEl.innerText = "Mudar Nametag";
    cancelBtn.style.display = "block";
  }

  document.getElementById("nametag-modal").classList.remove("hidden");
}

function closeNameTagModal() {
  if (isForcedNameTag && !gameState.playerName) return;
  document.getElementById("nametag-modal").classList.add("hidden");
}

async function handleNameTagStep() {
  let val = document.getElementById("nametag-input").value.trim();
  let passInput = document.getElementById("password-input");
  let passContainer = document.getElementById("password-container");
  let errorMsg = document.getElementById("nametag-error-msg");

  if (!val) {
    errorMsg.style.color = "#ef4444";
    errorMsg.innerText = "Por favor, digite uma nametag!";
    return;
  }

  if (passContainer.style.display === "none") {
    let passwordsMap = JSON.parse(localStorage.getItem("poke_passwords_map") || "{}");
    let globalScores = [];
    
    try {
      const res = await fetch(`${API_URL}/latest`, {
        headers: { "X-Master-Key": API_KEY }
      });
      if (res.ok) {
        const data = await res.json();
        if (data.record && data.record.scores) {
          globalScores = data.record.scores;
        }
      }
    } catch (e) {}

    let nameExists = globalScores.some(s => s.name.toLowerCase() === val.toLowerCase()) || passwordsMap[val.toLowerCase()];
    let mySavedName = localStorage.getItem("poke_nametag");

    passContainer.style.display = "block";
    errorMsg.style.color = "#ffcb05";

    if (nameExists && mySavedName !== val) {
      errorMsg.innerText = "Coloque sua senha";
    } else {
      errorMsg.innerText = "Crie uma senha";
    }
    return;
  } else {
    let passwordVal = passInput.value.trim();
    if (!passwordVal) {
      errorMsg.style.color = "#ef4444";
      errorMsg.innerText = "Por favor, insira a senha!";
      return;
    }

    let passwordsMap = JSON.parse(localStorage.getItem("poke_passwords_map") || "{}");
    let globalScores = [];
    try {
      const res = await fetch(`${API_URL}/latest`, {
        headers: { "X-Master-Key": API_KEY }
      });
      if (res.ok) {
        const data = await res.json();
        if (data.record && data.record.scores) {
          globalScores = data.record.scores;
        }
      }
    } catch (e) {}

    let nameExists = globalScores.some(s => s.name.toLowerCase() === val.toLowerCase()) || passwordsMap[val.toLowerCase()];
    let mySavedName = localStorage.getItem("poke_nametag");

    if (nameExists && mySavedName !== val) {
      if (passwordsMap[val.toLowerCase()] && passwordsMap[val.toLowerCase()] !== passwordVal) {
        errorMsg.style.color = "#ef4444";
        errorMsg.innerText = "Senha incorreta!";
        return;
      }
    }

    passwordsMap[val.toLowerCase()] = passwordVal;
    localStorage.setItem("poke_passwords_map", JSON.stringify(passwordsMap));

    gameState.playerName = val;
    localStorage.setItem("poke_nametag", val);
    welcomeSubtitle.innerText = `Treinador(a): ${gameState.playerName}`;
    document.getElementById("nametag-modal").classList.add("hidden");
    isForcedNameTag = false;
  }
}

function startAfkTimer() {
  if (afkCheckInterval) clearInterval(afkCheckInterval);
  afkCheckInterval = setInterval(() => {
    if (Date.now() - lastActivityTime > 1200000) {
      document.getElementById("afk-screen").classList.remove("hidden");
    }
  }, 10000);
}

function resumeGame() {
  lastActivityTime = Date.now();
  document.getElementById("afk-screen").classList.add("hidden");
}

function checkRebirthAvailable() {
  if (gameState.rebirthCount < 5) {
    const cost = getRebirthCost();
    rebirthCostLbl.innerText = cost >= 1000000 ? (cost / 1000000) + 'M' : (cost / 1000) + 'k';
    if (gameState.coins >= cost) {
      rebirthBtn.style.display = "block";
    } else {
      rebirthBtn.style.display = "none";
    }
  } else {
    rebirthBtn.style.display = "none";
  }
}

function promptRebirth() {
  const cost = getRebirthCost();
  if (gameState.coins >= cost && gameState.rebirthCount < 5) {
    showCustomMessage(
      "✨",
      "Rebirth Disponível",
      "Tem certeza? Essa mudança irá fazer você perder todo seu progresso mas desbloqueara upgrades e pokebolas novas e aumentara seu multiplicador",
      true,
      () => {
        executeRebirth();
      }
    );
  }
}

function executeRebirth() {
  gameState.rebirthCount++;
  gameState.coins = 0;
  gameState.baseClickPower = 1;
  gameState.multiplier = 1;
  gameState.coinsPerSecond = 0;
  
  upgrades = JSON.parse(JSON.stringify(defaultUpgrades));
  multiplierUpgrades = JSON.parse(JSON.stringify(defaultMultipliers));

  gameState.tierIndex = 0;
  gameState.selectedSkinColor = null;
  
  checkEvolution();
  renderUpgrades();
  renderMultipliers();
  checkRebirthAvailable();
  updateUI();
}

function switchTab(tabName) {
  document.getElementById("tab-upgrades").classList.add("hidden");
  document.getElementById("tab-multipliers").classList.add("hidden");
  document.getElementById("tab-skins").classList.add("hidden");
  
  document.getElementById("tab-upgrades-btn").classList.remove("active");
  document.getElementById("tab-multipliers-btn").classList.remove("active");
  document.getElementById("tab-skins-btn").classList.remove("active");

  document.getElementById(`tab-${tabName}`).classList.remove("hidden");
  document.getElementById(`tab-${tabName}-btn`).classList.add("active");
}

function getTotalClickPower() {
  return Math.floor(gameState.baseClickPower * gameState.multiplier * gameState.combo);
}

pokeballBtn.addEventListener("click", (e) => {
  lastActivityTime = Date.now();
  gameState.totalClicks++;

  const now = Date.now();
  if (now - lastClickTime < 300) {
    gameState.combo = Math.min(3.0, parseFloat((gameState.combo + 0.1).toFixed(1)));
  }
  lastClickTime = now;

  clearTimeout(comboTimer);
  comboTimer = setTimeout(() => {
    gameState.combo = 1.0;
    updateUI();
  }, 1000);

  const isCrit = Math.random() < 0.10;
  let power = getTotalClickPower();
  if (isCrit) {
    power *= 5;
    playSound('crit');
  } else {
    playSound('click');
  }

  gameState.coins += power;
  createFloatingText(e, power, isCrit);
  checkEvolution();
  checkRebirthAvailable();
  updateUI();
});

function createFloatingText(event, power, isCrit = false) {
  const rect = pokeballBtn.getBoundingClientRect();
  const x = event.clientX - rect.left;
  const y = event.clientY - rect.top;

  const floatEl = document.createElement("div");
  floatEl.className = `float-text ${isCrit ? 'crit' : ''}`;
  floatEl.innerHTML = `<span class="mario-coin" style="width:12px; height:16px;"></span>+${power}${isCrit ? ' CRIT!' : ''}`;
  floatEl.style.left = `${x}px`;
  floatEl.style.top = `${y}px`;

  const angle = Math.random() * Math.PI * 2;
  const distance = 70 + Math.random() * 50;

  floatEl.style.setProperty("--dx", `${Math.cos(angle) * distance}px`);
  floatEl.style.setProperty("--dy", `${Math.sin(angle) * distance}px`);

  pokeballBtn.appendChild(floatEl);
  setTimeout(() => floatEl.remove(), 800);
}

function spawnGoldenBall() {
  const golden = document.createElement("div");
  golden.className = "golden-ball";
  golden.style.top = `${Math.random() * 70 + 15}%`;
  golden.style.left = `${Math.random() * 70 + 15}%`;

  golden.addEventListener("click", () => {
    lastActivityTime = Date.now();
    const reward = Math.max(50, Math.floor(getTotalClickPower() * 20));
    gameState.coins += reward;
    playSound('golden');
    golden.remove();
    checkRebirthAvailable();
    updateUI();
  });

  gameContainer.appendChild(golden);
  setTimeout(() => golden.remove(), 5000);
}

setInterval(() => {
  if (Math.random() < 0.3) spawnGoldenBall();
}, 45000);

function checkEvolution() {
  if (!gameState.selectedSkinColor) {
    let highestValidIndex = gameState.tierIndex;
    for (let i = 0; i < pokeballs.length; i++) {
      let pb = pokeballs[i];
      if (gameState.coins >= pb.req && gameState.rebirthCount >= pb.rebirthReq) {
        highestValidIndex = i;
      }
    }
    if (highestValidIndex !== gameState.tierIndex) {
      gameState.tierIndex = highestValidIndex;
      const current = pokeballs[gameState.tierIndex];
      lblBadge.innerText = current.badge;
      lblBadge.style.background = current.color;
      lblBallName.innerText = current.name;
      pokeballTopBg.style.background = current.color;
    }
  }
}

function applySkin(color) {
  gameState.selectedSkinColor = color;
  pokeballTopBg.style.background = color;
}

function buyUpgrade(index) {
  lastActivityTime = Date.now();
  const upg = upgrades[index];
  if (gameState.coins >= upg.cost) {
    gameState.coins -= upg.cost;
    upg.count++;
    gameState.baseClickPower += upg.cpc;
    gameState.coinsPerSecond += upg.cps;
    upg.cost = Math.floor(upg.cost * upg.mult);

    renderUpgrades();
    checkEvolution();
    checkRebirthAvailable();
    updateUI();
  }
}

function buyMultiplier(index) {
  lastActivityTime = Date.now();
  const upg = multiplierUpgrades[index];
  if (!upg.bought && gameState.coins >= upg.cost) {
    gameState.coins -= upg.cost;
    upg.bought = true;
    gameState.multiplier *= upg.factor;

    renderMultipliers();
    checkEvolution();
    checkRebirthAvailable();
    updateUI();
  }
}

function renderUpgrades() {
  upgradesContainer.innerHTML = "";
  upgrades.forEach((upg, idx) => {
    if (upg.rebirthReq && gameState.rebirthCount < upg.rebirthReq) return;

    const card = document.createElement("div");
    card.className = "upgrade-card";

    let iconHTML = `<img src="${upg.icon}" class="upgrade-icon-img">`;
    if (upg.isDoubleBall) {
      iconHTML = `
        <div class="double-pokeball-icon">
          <img src="${pokeballImgUrl}" class="bg-ball">
          <img src="${pokeballImgUrl}" class="fg-ball">
        </div>`;
    }

    card.innerHTML = `
      <div class="upgrade-info">
        ${iconHTML}
        <div class="upgrade-details">
          <span class="upgrade-name">${upg.name} (${upg.count})</span>
          <span class="upgrade-desc">${upg.desc}</span>
        </div>
      </div>
      <button class="buy-btn" id="btn-upg-${idx}" onclick="buyUpgrade(${idx})">
        <span class="mario-coin" style="width:10px; height:14px;"></span>
        ${upg.cost.toLocaleString()}
      </button>`;
    
    upgradesContainer.appendChild(card);
  });
}

function renderMultipliers() {
  multipliersContainer.innerHTML = "";
  multiplierUpgrades.forEach((upg, idx) => {
    if (upg.rebirthReq && gameState.rebirthCount < upg.rebirthReq) return;

    const card = document.createElement("div");
    card.className = "upgrade-card";
    card.innerHTML = `
      <div class="upgrade-info">
        <img src="${upg.icon}" class="upgrade-icon-img">
        <div class="upgrade-details">
          <span class="upgrade-name">${upg.name}</span>
          <span class="upgrade-desc">${upg.desc}</span>
        </div>
      </div>
      <button class="buy-btn" id="btn-mult-${idx}" onclick="buyMultiplier(${idx})">
        ${upg.bought ? 'COMPRADO' : `<span class="mario-coin" style="width:10px; height:14px;"></span> ${upg.cost.toLocaleString()}`}
      </button>`;
    
    multipliersContainer.appendChild(card);
  });
}

function renderSkins() {
  skinsContainer.innerHTML = "";
  skins.forEach((sk) => {
    const card = document.createElement("div");
    card.className = "upgrade-card";
    card.innerHTML = `
      <div class="upgrade-info">
        <div style="width:28px; height:28px; border-radius:50%; background:${sk.color}; border:2px solid #fff;"></div>
        <div class="upgrade-details">
          <span class="upgrade-name">${sk.name}</span>
        </div>
      </div>
      <button class="buy-btn" onclick="applySkin('${sk.color}')">Equipar</button>`;
    
    skinsContainer.appendChild(card);
  });
}

function updateUI() {
  lblCoins.innerText = Math.floor(gameState.coins).toLocaleString();
  lblCpc.innerText = `+${getTotalClickPower()}`;
  lblCps.innerText = `${gameState.coinsPerSecond}/s`;

  upgrades.forEach((upg, idx) => {
    const btn = document.getElementById(`btn-upg-${idx}`);
    if (btn) btn.disabled = gameState.coins < upg.cost;
  });

  multiplierUpgrades.forEach((upg, idx) => {
    const btn = document.getElementById(`btn-mult-${idx}`);
    if (btn) btn.disabled = upg.bought || gameState.coins < upg.cost;
  });
}

function escapeHTML(str) {
  return str.replace(/[&<>'"]/g, tag => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
  }[tag]));
}

setInterval(() => {
  if (gameState.coinsPerSecond > 0) {
    gameState.coins += gameState.coinsPerSecond / 10;
    checkEvolution();
    checkRebirthAvailable();
    updateUI();
  }
}, 100);

renderUpgrades();
renderMultipliers();
renderSkins();
updateUI();

const savedNametag = localStorage.getItem("poke_nametag");
if (savedNametag) {
  gameState.playerName = savedNametag;
  welcomeSubtitle.innerText = `Treinador(a): ${gameState.playerName}`;
} else {
  openNameTagModal(true);
}
