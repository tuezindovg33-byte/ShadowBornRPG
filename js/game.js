const canvas = document.querySelector('canvas');
const ctx = canvas.getContext('2d');

const canvasWidth = 1024
const canvasHeight = 576

canvas.width = canvasWidth
canvas.height = canvasHeight

const desiredFPS = 120; // The desired frames per second
const frameTime = 1000 / desiredFPS; // The time per frame in milliseconds

let prevTime = performance.now();
let lag = 0;

// Câmera: segue o jogador horizontalmente conforme ele anda pelo mapa
let camera = { x: 0 };

function updateCamera() {
    // "Zona morta": a câmera só se move quando o jogador sai dessa faixa central,
    // como na maioria dos jogos de plataforma/luta 2D
    const deadZoneLeft = canvasWidth * 0.35;
    const deadZoneRight = canvasWidth * 0.55;
    const playerScreenX = player.position.x - camera.x;

    if (playerScreenX > deadZoneRight) {
        camera.x += playerScreenX - deadZoneRight;
    } else if (playerScreenX < deadZoneLeft) {
        camera.x += playerScreenX - deadZoneLeft;
    }

    // Não deixa a câmera sair dos limites do mapa
    camera.x = Math.max(0, Math.min(camera.x, worldWidth - canvasWidth));
}

// Desenha o fundo da fase atual: imagem repetida em ladrilhos (com espelhamento
// alternado pra disfarçar a repetição) ou um gradiente de cor liso.
function drawBackgroundTiles() {
    if (!currentPhase) return;

    if (currentPhase.bgType === "gradient" && currentPhase.bgColors) {
        const gradient = ctx.createLinearGradient(camera.x, 0, camera.x, canvasHeight);
        gradient.addColorStop(0, currentPhase.bgColors.top);
        gradient.addColorStop(1, currentPhase.bgColors.bottom);
        ctx.fillStyle = gradient;
        ctx.fillRect(camera.x, 0, canvasWidth, canvasHeight);
        return;
    }

    const bgImage = getImage(currentPhase.bgValue || ASSET_PATHS.background);
    if (!bgImage.complete || bgImage.naturalWidth === 0) return;

    const bgWidth = canvasWidth;
    const firstTile = Math.floor(camera.x / bgWidth);
    const lastTile = Math.floor((camera.x + canvasWidth) / bgWidth);

    for (let i = firstTile; i <= lastTile; i++) {
        const worldX = i * bgWidth;
        const flip = i % 2 !== 0;

        ctx.save();
        if (flip) {
            ctx.translate(worldX + bgWidth, 0);
            ctx.scale(-1, 1);
            ctx.drawImage(bgImage, 0, 0, bgWidth, canvasHeight);
        } else {
            ctx.drawImage(bgImage, worldX, 0, bgWidth, canvasHeight);
        }
        ctx.restore();
    }
}

// Estados possíveis: "loading" -> "title" -> "playing" <-> "paused" / "gameover"
// (mais "howto" e "shop", que são sobreposições acessíveis de vários lugares)
let gameState = "loading";
let previousScreen = "title"; // pra onde "Voltar" leva ao sair da loja/como-jogar

const hud = document.getElementById('hud');
const hpBarFill = document.getElementById('hp-bar-fill');
const killCountEl = document.getElementById('kill-count');
const hudPauseBtn = document.getElementById('hud-pause-btn');

const titleScreen = document.getElementById('title-screen');
const titleButtons = document.getElementById('title-buttons');
const loadingText = document.getElementById('loading-text');
const startBtn = document.getElementById('start-btn');
const shopBtnMenu = document.getElementById('shop-btn-menu');
const howToBtn = document.getElementById('how-to-btn');

const howtoScreen = document.getElementById('howto-screen');
const howtoBackBtn = document.getElementById('howto-back-btn');

const shopScreen = document.getElementById('shop-screen');
const shopBackBtn = document.getElementById('shop-back-btn');
const shopBtnPause = document.getElementById('shop-btn-pause');
const shopBtnGameover = document.getElementById('shop-btn-gameover');

const pauseScreen = document.getElementById('pause-screen');
const resumeBtn = document.getElementById('resume-btn');
const restartBtn = document.getElementById('restart-btn');
const menuBtn = document.getElementById('menu-btn');

const gameoverScreen = document.getElementById('gameover-screen');
const gameoverStats = document.getElementById('gameover-stats');
const retryBtn = document.getElementById('retry-btn');
const gameoverMenuBtn = document.getElementById('gameover-menu-btn');

const phaseSelectScreen = document.getElementById('phase-select-screen');
const phaseSelectBackBtn = document.getElementById('phase-select-back-btn');
const phasesBtnMenu = document.getElementById('phases-btn-menu');

const phaseCompleteScreen = document.getElementById('phasecomplete-screen');
const phaseCompleteStats = document.getElementById('phasecomplete-stats');
const nextPhaseBtn = document.getElementById('next-phase-btn');
const phaseCompletePhasesBtn = document.getElementById('phasecomplete-phases-btn');
const phaseCompleteMenuBtn = document.getElementById('phasecomplete-menu-btn');

const adminScreen = document.getElementById('admin-screen');
const adminBtnMenu = document.getElementById('admin-btn-menu');
const adminBackBtn = document.getElementById('admin-back-btn');

const loginScreen = document.getElementById('login-screen');
const registerScreen = document.getElementById('register-screen');
const profileScreen = document.getElementById('profile-screen');
const accountBtnMenu = document.getElementById('account-btn-menu');

const rotateHint = document.getElementById('rotate-hint');
const mobileControls = document.getElementById('mobile-controls');

function syncMobileControlsVisibility() {
    mobileControls.classList.toggle('force-hidden', gameState !== "playing");
}

function hideAllScreens() {
    titleScreen.classList.add('hidden');
    howtoScreen.classList.add('hidden');
    shopScreen.classList.add('hidden');
    pauseScreen.classList.add('hidden');
    gameoverScreen.classList.add('hidden');
    phaseSelectScreen.classList.add('hidden');
    phaseCompleteScreen.classList.add('hidden');
    adminScreen.classList.add('hidden');
    loginScreen.classList.add('hidden');
    registerScreen.classList.add('hidden');
    profileScreen.classList.add('hidden');
    document.getElementById('character-screen')?.classList.add('hidden');
    document.getElementById('quests-screen')?.classList.add('hidden');
    ['skills-screen','npcs-screen','bosses-screen','ranking-screen','system-screen','inventory-screen','loading-screen'].forEach(id => document.getElementById(id)?.classList.add('hidden'));
    hud.classList.add('hidden');
}

function showTitle() {
    gameState = "title";
    hideAllScreens();
    titleScreen.classList.remove('hidden');
    if (typeof updateWalletDisplays === "function") updateWalletDisplays();
}

function showHowTo() {
    previousScreen = gameState === "paused" ? "paused" : "title";
    gameState = "howto";
    hideAllScreens();
    howtoScreen.classList.remove('hidden');
}

function showShop() {
    previousScreen = (gameState === "paused" || gameState === "gameover") ? gameState : "title";
    gameState = "shop";
    hideAllScreens();
    if (typeof renderShop === "function") renderShop();
    shopScreen.classList.remove('hidden');
}

function showPhaseSelect() {
    gameState = "phaseselect";
    hideAllScreens();
    phaseSelectScreen.classList.remove('hidden');

    const el = document.getElementById('phase-select-list');
    if (el) el.innerHTML = '<p class="admin-empty-note">Carregando fases...</p>';

    refreshPhasesFromServer().then(renderPhaseSelect);
}

function renderPhaseSelect() {
    const el = document.getElementById('phase-select-list');
    if (!el) return;
    el.innerHTML = '';

    getAllPhases().forEach(phase => {
        const card = document.createElement('div');
        card.className = 'phase-card';
        card.innerHTML = `
            <strong>${phase.name}</strong>
            <span>${phase.spawns.length} inimigo(s)${phase.bossTypeId ? ' · 👑 chefão' : ''}${phase.builtin ? '' : ' · personalizada'}</span>
            <button class="btn btn-primary phase-play-btn">▶ Jogar</button>
        `;
        card.querySelector('.phase-play-btn').addEventListener('click', () => beginPhase(phase.id));
        el.appendChild(card);
    });
}

function showAdmin() {
    gameState = "admin";
    hideAllScreens();
    if (typeof buildPixelPalette === "function") buildPixelPalette();
    if (typeof buildPixelGridDom === "function") buildPixelGridDom();
    if (typeof resetPhaseDraft === "function") resetPhaseDraft();
    adminScreen.classList.remove('hidden');
    showAdminTab('phases');

    if (typeof refreshAdminContentFromServer === "function") {
        refreshAdminContentFromServer().then(() => {
            if (typeof refreshAdminSelects === "function") refreshAdminSelects();
            if (typeof renderAdminPhaseList === "function") renderAdminPhaseList();
            if (typeof renderAdminNpcList === "function") renderAdminNpcList();
        });
    }
}

function showAdminTab(tab) {
    document.getElementById('admin-phases-tab').classList.toggle('hidden', tab !== 'phases');
    document.getElementById('admin-npcs-tab').classList.toggle('hidden', tab !== 'npcs');
    document.getElementById('admin-users-tab').classList.toggle('hidden', tab !== 'users');
    document.getElementById('admin-tab-phases').classList.toggle('active', tab === 'phases');
    document.getElementById('admin-tab-npcs').classList.toggle('active', tab === 'npcs');
    document.getElementById('admin-tab-users').classList.toggle('active', tab === 'users');
    if (tab === 'users' && typeof renderAdminUsersList === "function") renderAdminUsersList();
}

function showLogin() {
    gameState = "login";
    hideAllScreens();
    document.getElementById('login-error').textContent = '';
    loginScreen.classList.remove('hidden');
}

function showRegister() {
    gameState = "register";
    hideAllScreens();
    document.getElementById('register-error').textContent = '';
    registerScreen.classList.remove('hidden');
}

function showProfile() {
    if (!currentUser) {
        showLogin();
        return;
    }
    gameState = "profile";
    hideAllScreens();
    if (typeof renderProfile === "function") renderProfile();
    profileScreen.classList.remove('hidden');
}

function backFromOverlay() {
    hideAllScreens();

    if (previousScreen === "paused") {
        gameState = "paused";
        hud.classList.remove('hidden');
        pauseScreen.classList.remove('hidden');
    } else if (previousScreen === "gameover") {
        gameState = "gameover";
        gameoverScreen.classList.remove('hidden');
    } else {
        showTitle();
    }
}

async function beginPhase(phaseId) {
    currentPhase = getPhaseById(phaseId) || getAllPhases()[0];
    gameState = "loading";
    hideAllScreens();
    const loading = document.getElementById("loading-screen");
    const fill = document.getElementById("v9-loadfill");
    const pct = document.getElementById("v9-loadpct");
    const text = document.getElementById("v9-loading-text");
    loading?.classList.remove("hidden");
    const steps = [[15,"Carregando fase..."],[38,"Invocando inimigos..."],[62,"Preparando cenário..."],[84,"Sincronizando inventário..."],[100,"Entrando nas sombras..."]];
    for (const [n,msg] of steps) {
        if(fill) fill.style.width=n+"%"; if(pct) pct.textContent=n+"%"; if(text) text.textContent=msg;
        await new Promise(r=>setTimeout(r,120));
    }
    loading?.classList.add("hidden");
    startGame();
}

function startGame() {
    if (!currentPhase) currentPhase = getAllPhases()[0];
    resetGame();
    resetKeys();
    prevTime = performance.now();
    lag = 0;
    gameState = "playing";
    hideAllScreens();
    hud.classList.remove('hidden');
    updateHud();
    checkOrientation();
}

function togglePause() {
    if (gameState === "playing") {
        gameState = "paused";
        pauseScreen.classList.remove('hidden');
    } else if (gameState === "paused") {
        prevTime = performance.now();
        lag = 0;
        gameState = "playing";
        pauseScreen.classList.add('hidden');
    }
}

// Chamado pelo player.takeDamage() em sprites.js quando a vida chega a 0
function onPlayerDeath() {
    if (gameState !== "playing") return;
    gameState = "gameover";
    hud.classList.add('hidden');
    gameoverStats.textContent = `Inimigos abatidos: ${kills}`;
    gameoverScreen.classList.remove('hidden');
    if (typeof updateWalletDisplays === "function") updateWalletDisplays();
}

function updateHud() {
    const pct = Math.max(0, player.health / player.maxHealth) * 100;
    hpBarFill.style.width = pct + "%";
    killCountEl.textContent = kills;
    if (typeof updateWalletDisplays === "function") updateWalletDisplays();
}

// Sugere girar o aparelho quando é um celular em modo retrato
function checkOrientation() {
    const isTouch = document.body.classList.contains('touch-device');
    const isPortrait = window.innerHeight > window.innerWidth;
    const small = window.innerWidth < 820;

    if (isTouch && isPortrait && small && gameState === "playing") {
        rotateHint.classList.remove('hidden');
    } else {
        rotateHint.classList.add('hidden');
    }
}

window.addEventListener('resize', checkOrientation);
window.addEventListener('orientationchange', checkOrientation);

startBtn.addEventListener('click', () => beginPhase(getAllPhases()[0].id));
shopBtnMenu.addEventListener('click', showShop);
howToBtn.addEventListener('click', showHowTo);
howtoBackBtn.addEventListener('click', backFromOverlay);
shopBackBtn.addEventListener('click', backFromOverlay);
shopBtnPause.addEventListener('click', showShop);
shopBtnGameover.addEventListener('click', showShop);
resumeBtn.addEventListener('click', togglePause);
restartBtn.addEventListener('click', () => beginPhase(currentPhase ? currentPhase.id : getAllPhases()[0].id));
menuBtn.addEventListener('click', showTitle);
retryBtn.addEventListener('click', () => beginPhase(currentPhase ? currentPhase.id : getAllPhases()[0].id));
gameoverMenuBtn.addEventListener('click', showTitle);
hudPauseBtn.addEventListener('click', togglePause);

const characterBtnMenu = document.getElementById('character-btn-menu');
const questsBtnMenu = document.getElementById('quests-btn-menu');
characterBtnMenu.addEventListener('click', () => ShadowRPG.showCharacter());
questsBtnMenu.addEventListener('click', () => ShadowRPG.showQuests());
document.getElementById('character-back-btn').addEventListener('click', showTitle);
document.getElementById('quests-back-btn').addEventListener('click', showTitle);

phasesBtnMenu.addEventListener('click', showPhaseSelect);
phaseSelectBackBtn.addEventListener('click', showTitle);
nextPhaseBtn.addEventListener('click', () => beginPhase(nextPhaseBtn.dataset.nextId));
phaseCompletePhasesBtn.addEventListener('click', showPhaseSelect);
phaseCompleteMenuBtn.addEventListener('click', showTitle);

adminBtnMenu.addEventListener('click', showAdmin);
adminBackBtn.addEventListener('click', showTitle);
document.getElementById('admin-tab-phases').addEventListener('click', () => showAdminTab('phases'));
document.getElementById('admin-tab-npcs').addEventListener('click', () => showAdminTab('npcs'));
document.getElementById('admin-tab-users').addEventListener('click', () => showAdminTab('users'));
document.getElementById('admin-add-spawn').addEventListener('click', () => addSpawnToPhaseDraft());
document.getElementById('admin-save-phase').addEventListener('click', () => saveNewPhase());
document.getElementById('admin-save-npc').addEventListener('click', () => saveNewNpc());
document.getElementById('pixel-clear').addEventListener('click', () => resetPixelEditor());
document.getElementById('admin-refresh-users').addEventListener('click', () => renderAdminUsersList());

document.querySelectorAll('input[name="bgType"]').forEach(radio => {
    radio.addEventListener('change', () => {
        const isImage = document.querySelector('input[name="bgType"]:checked').value === "image";
        document.getElementById('admin-phase-bg-url').classList.toggle('hidden', !isImage);
        document.getElementById('admin-phase-gradient-controls').classList.toggle('hidden', isImage);
    });
});

document.getElementById('admin-phase-has-boss').addEventListener('change', e => {
    document.getElementById('admin-phase-boss-type').classList.toggle('hidden', !e.target.checked);
});

// ---- Conta (login / cadastro / perfil) ----
accountBtnMenu.addEventListener('click', () => {
    if (currentUser) showProfile();
    else showLogin();
});
document.getElementById('login-submit-btn').addEventListener('click', () => doLogin());
document.getElementById('go-to-register-btn').addEventListener('click', showRegister);
document.getElementById('login-back-btn').addEventListener('click', showTitle);

document.getElementById('register-submit-btn').addEventListener('click', () => doRegister());
document.getElementById('go-to-login-btn').addEventListener('click', showLogin);
document.getElementById('register-back-btn').addEventListener('click', showTitle);

document.getElementById('profile-back-btn').addEventListener('click', showTitle);
document.getElementById('logout-btn').addEventListener('click', () => doLogout());

// Enter para confirmar nos formulários
document.getElementById('login-password').addEventListener('keydown', e => { if (e.key === 'Enter') doLogin(); });
document.getElementById('register-password').addEventListener('keydown', e => { if (e.key === 'Enter') doRegister(); });

function animate() {
    const currentTime = performance.now();
    const elapsed = currentTime - prevTime;
    prevTime = currentTime;

    window.requestAnimationFrame(animate);

    syncMobileControlsVisibility();

    if (gameState !== "playing") return;

    lag += elapsed;
    // Evita que uma pausa/perda de foco do navegador force o jogo a
    // "simular" dezenas de frames de uma vez (isso podia fazer animações
    // rápidas, como o corte da katana, pularem direto pro final).
    if (lag > 250) lag = 250;

    handleControls();

    while (lag >= frameTime) {
        ctx.fillStyle = "black";
        ctx.fillRect(0, 0, canvasWidth, canvasHeight);

        updateCamera();

        ctx.save();
        ctx.translate(-camera.x, 0);

        drawBackgroundTiles();
        player.update();
        //player2.update();

        for (let i = enemies.length - 1; i >= 0; i--) {
            const enemy = enemies[i];
            enemy.update();
            if (enemy.markedForRemoval) enemies.splice(i, 1);
        }

        for (let i = activeEffects.length - 1; i >= 0; i--) {
            const effect = activeEffects[i];
            effect.update();
            if (effect.markedForRemoval) activeEffects.splice(i, 1);
        }

        ctx.restore();

        resolveCombat();
        checkPhaseCompletion();

        lag -= frameTime;
    }
}

// Checa o golpe do jogador contra os inimigos, e o contato dos inimigos contra o jogador
function resolveCombat() {
    const now = performance.now();

    const playerAttacking = player.activeHitbox && now < player.hitboxActiveUntil;

    const playerBounds = {
        x: player.position.x,
        y: player.position.y,
        width: player.width / player.totalSpriteFrames,
        height: player.height
    };

    for (const enemy of enemies) {
        if (enemy.isDead) continue;

        // Golpe do jogador acerta o inimigo
        if (playerAttacking && !player.hitEnemies.has(enemy)) {
            if (rectsOverlap(player.activeHitbox, enemy.getBounds())) {
                enemy.takeDamage(player.attackDamage);
                player.hitEnemies.add(enemy);

                if (enemy.isDead) {
                    kills += 1;
                    if (window.ShadowRPG) ShadowRPG.onEnemyDefeated(enemy);
                    updateHud();
                }
            }
        }

        // Contato do inimigo machuca o jogador
        if (enemy.contactCooldown <= 0 && rectsOverlap(enemy.getBounds(), playerBounds)) {
            player.takeDamage(enemy.contactDamage);
            enemy.contactCooldown = 60; // ~0.5s a 120fps
            updateHud();
        }
    }
}

// Checa se a fase foi concluída: chefão derrotado (se houver) ou chegou ao fim do mapa
function checkPhaseCompletion() {
    if (gameState !== "playing" || phaseCompleted || !currentPhase) return;

    if (currentPhase.bossTypeId) {
        const bossPresent = enemies.some(e => e.type && e.type.id === currentPhase.bossTypeId);
        if (!bossPresent) triggerPhaseComplete();
    } else if (player.position.x >= worldWidth - 130) {
        triggerPhaseComplete();
    }
}

function triggerPhaseComplete() {
    phaseCompleted = true;
    if (window.ShadowRPG) ShadowRPG.onPhaseComplete(currentPhase, kills);
    gameState = "phasecomplete";
    hud.classList.add('hidden');

    const bonus = 30 + kills * 4;
    if (typeof awardCoins === "function") awardCoins(bonus);

    phaseCompleteStats.textContent = `Inimigos abatidos: ${kills} · +${bonus} moedas de bônus`;
    phaseCompleteScreen.classList.remove('hidden');

    const phases = getAllPhases();
    const idx = phases.findIndex(p => p.id === currentPhase.id);
    const next = phases[idx + 1];
    if (next) {
        nextPhaseBtn.classList.remove('hidden');
        nextPhaseBtn.dataset.nextId = next.id;
    } else {
        nextPhaseBtn.classList.add('hidden');
    }

    if (typeof updateWalletDisplays === "function") updateWalletDisplays();
}

// Busca as fases/NPCs criados pelos admins (planilha) e só depois pré-carrega
// as imagens — assim os fundos de fases customizadas já entram no preload.
async function bootstrapGame() {
    if (typeof refreshAdminContentFromServer === "function") {
        await refreshAdminContentFromServer();
    }

    await preloadImages();

    loadingText.classList.add('hidden');
    titleButtons.classList.remove('hidden');
    if (typeof syncAccountUI === "function") syncAccountUI();

    if (currentUser && typeof applyServerProfileToLocalState === "function") {
        // Já tinha sessão salva no aparelho — busca o perfil mais atual do servidor
        const res = await apiCall("obterPerfil", { userID: currentUser.id });
        if (res.sucesso) {
            currentUser = res.dados;
            persistSession();
            applyServerProfileToLocalState(res.dados);
        }
    }

    showTitle();
}

bootstrapGame();

animate(); // Start the animation loop (só desenha de fato quando gameState === "playing")
