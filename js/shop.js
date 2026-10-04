// ===================================================================
// Loja / progressão persistente (moedas + upgrades salvos no navegador)
// ===================================================================

const SAVE_KEY = "jogoDeLuta_save_v1"

const UPGRADES = {
    health: {
        name: "Vida Máxima",
        icon: "❤",
        desc: "+20 de vida máxima por nível",
        baseCost: 30,
        costGrowth: 1.55,
        maxLevel: 5
    },
    damage: {
        name: "Dano de Ataque",
        icon: "⚔",
        desc: "+5 de dano por golpe de katana",
        baseCost: 35,
        costGrowth: 1.55,
        maxLevel: 5
    },
    speed: {
        name: "Velocidade",
        icon: "👟",
        desc: "+12% de velocidade de movimento",
        baseCost: 25,
        costGrowth: 1.5,
        maxLevel: 5
    }
}

function defaultSave() {
    return {
        coins: 0,
        levels: { health: 0, damage: 0, speed: 0 }
    }
}

function loadSave() {
    try {
        const raw = localStorage.getItem(SAVE_KEY)
        if (!raw) return defaultSave()

        const parsed = JSON.parse(raw)
        const save = defaultSave()

        if (typeof parsed.coins === "number") save.coins = parsed.coins
        if (parsed.levels) {
            for (const key of Object.keys(UPGRADES)) {
                if (typeof parsed.levels[key] === "number") {
                    save.levels[key] = parsed.levels[key]
                }
            }
        }

        return save
    } catch (e) {
        console.error("Não foi possível ler o save, usando padrão:", e)
        return defaultSave()
    }
}

function persistSave() {
    try {
        localStorage.setItem(SAVE_KEY, JSON.stringify(saveData))
    } catch (e) {
        console.error("Não foi possível salvar o progresso:", e)
    }
}

let saveData = loadSave()

function getUpgradeCost(key) {
    const upgrade = UPGRADES[key]
    const level = saveData.levels[key]
    if (level >= upgrade.maxLevel) return null
    return Math.round(upgrade.baseCost * Math.pow(upgrade.costGrowth, level))
}

function buyUpgrade(key) {
    const cost = getUpgradeCost(key)
    if (cost === null) return false
    if (saveData.coins < cost) return false

    saveData.coins -= cost
    saveData.levels[key] += 1
    persistSave()
    if (typeof scheduleProgressSync === "function") scheduleProgressSync()
    return true
}

// Chamado quando um inimigo morre (definido para ser usado por sprites.js)
function awardCoins(amount) {
    saveData.coins += amount
    persistSave()
    if (typeof scheduleProgressSync === "function") scheduleProgressSync()
}

// Aplica os upgrades comprados às estatísticas do jogador. Chamado a cada
// início/reinício de partida (em resetGame, dentro de sprites.js).
function applyUpgradesToPlayer(fighter) {
    const rpg = window.ShadowRPG ? ShadowRPG.getBonuses() : { health: 0, damage: 0, speed: 0 }
    fighter.maxHealth = 100 + saveData.levels.health * 20 + rpg.health
    fighter.health = fighter.maxHealth
    fighter.attackDamage = 15 + saveData.levels.damage * 5 + rpg.damage
    fighter.moveSpeedMultiplier = 1 + saveData.levels.speed * 0.12 + rpg.speed
}

// ---- Renderização da tela da loja (chamada em game.js) ----
function renderShop() {
    const list = document.getElementById("shop-list")
    if (!list) return

    list.innerHTML = ""

    for (const key of Object.keys(UPGRADES)) {
        const upgrade = UPGRADES[key]
        const level = saveData.levels[key]
        const cost = getUpgradeCost(key)
        const maxed = cost === null

        const item = document.createElement("div")
        item.className = "shop-item"

        const pips = Array.from({ length: upgrade.maxLevel }, (_, i) =>
            `<span class="shop-pip ${i < level ? "filled" : ""}"></span>`
        ).join("")

        item.innerHTML = `
            <div class="shop-item-icon">${upgrade.icon}</div>
            <div class="shop-item-info">
                <div class="shop-item-name">${upgrade.name} <span style="color:#8fe9ff;font-weight:normal;">Nv. ${level}/${upgrade.maxLevel}</span></div>
                <div class="shop-item-desc">${upgrade.desc}</div>
                <div class="shop-item-levels">${pips}</div>
            </div>
            <button class="shop-buy-btn" ${maxed ? "disabled" : ""} data-key="${key}">
                ${maxed ? "MÁX" : `🪙 ${cost}`}
            </button>
        `

        list.appendChild(item)
    }

    document.querySelectorAll(".shop-buy-btn").forEach(btn => {
        btn.addEventListener("click", () => {
            const key = btn.dataset.key
            if (buyUpgrade(key)) {
                renderShop()
                updateWalletDisplays()
            }
        })
    })

    updateWalletDisplays()
}

function updateWalletDisplays() {
    document.querySelectorAll(".wallet-coins").forEach(el => {
        el.textContent = saveData.coins
    })
}
