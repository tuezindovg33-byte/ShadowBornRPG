// ===================================================================
// Sistema de Admin: fases (mapas) e NPCs criados pelos admins, salvos
// direto na planilha (Google Sheets) via backend — assim TODO jogador
// vê as mesmas fases/NPCs, criados ou removidos por quem é admin.
// ===================================================================

const PIXEL_GRID_SIZE = 16
const PIXEL_CELL = 4 // px por célula na imagem final (16*4 = 64x64, igual aos NPCs padrão)

// ---- Sprites dos NPCs padrão (prontos, sempre disponíveis) ----
function svgWrap(inner) {
    const size = PIXEL_GRID_SIZE * PIXEL_CELL
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 64 64">${inner}</svg>`
}

const BUILTIN_SVGS = {
    shadow: svgWrap(`
        <ellipse cx="32" cy="42" rx="24" ry="18" fill="#4a1530"/>
        <path d="M9 40 Q11 14 32 12 Q53 14 55 40" fill="#7a2647"/>
        <ellipse cx="32" cy="42" rx="24" ry="18" fill="none" stroke="#1f0510" stroke-width="3"/>
        <path d="M9 40 Q11 14 32 12 Q53 14 55 40" fill="none" stroke="#1f0510" stroke-width="3"/>
        <circle cx="22" cy="36" r="6" fill="#ffe9a8"/>
        <circle cx="42" cy="36" r="6" fill="#ffe9a8"/>
        <circle cx="22" cy="36" r="3" fill="#1a0508"/>
        <circle cx="42" cy="36" r="3" fill="#1a0508"/>
        <path d="M14 54 Q32 62 50 54" stroke="#1f0510" stroke-width="3" fill="none"/>
    `),
    fast: svgWrap(`
        <path d="M8 46 Q16 18 32 14 Q48 18 56 46 Q32 58 8 46Z" fill="#245c3a"/>
        <path d="M8 46 Q16 18 32 14 Q48 18 56 46 Q32 58 8 46Z" fill="none" stroke="#0e2b1c" stroke-width="3"/>
        <path d="M14 20 L20 6 M50 20 L44 6 M32 12 L32 2" stroke="#0e2b1c" stroke-width="3" fill="none" stroke-linecap="round"/>
        <circle cx="24" cy="38" r="5" fill="#d7ffb3"/>
        <circle cx="40" cy="38" r="5" fill="#d7ffb3"/>
        <circle cx="24" cy="38" r="2.4" fill="#0e2b1c"/>
        <circle cx="40" cy="38" r="2.4" fill="#0e2b1c"/>
    `),
    tank: svgWrap(`
        <rect x="8" y="20" width="48" height="34" rx="10" fill="#4a3a2a"/>
        <rect x="8" y="20" width="48" height="34" rx="10" fill="none" stroke="#1c150c" stroke-width="3"/>
        <rect x="12" y="10" width="10" height="14" rx="2" fill="#6b5638"/>
        <rect x="42" y="10" width="10" height="14" rx="2" fill="#6b5638"/>
        <circle cx="24" cy="36" r="5.5" fill="#ffcf7a"/>
        <circle cx="40" cy="36" r="5.5" fill="#ffcf7a"/>
        <circle cx="24" cy="36" r="2.6" fill="#1c150c"/>
        <circle cx="40" cy="36" r="2.6" fill="#1c150c"/>
        <path d="M18 48 Q32 54 46 48" stroke="#1c150c" stroke-width="3" fill="none"/>
    `),
    boss: svgWrap(`
        <path d="M10 24 L18 8 L26 20 L32 6 L38 20 L46 8 L54 24 Z" fill="#ffb84d" stroke="#5c1010" stroke-width="2"/>
        <ellipse cx="32" cy="42" rx="26" ry="20" fill="#5c1010"/>
        <ellipse cx="32" cy="42" rx="26" ry="20" fill="none" stroke="#1f0505" stroke-width="3"/>
        <circle cx="22" cy="38" r="7" fill="#ffe9a8"/>
        <circle cx="42" cy="38" r="7" fill="#ffe9a8"/>
        <circle cx="22" cy="38" r="3.4" fill="#1f0505"/>
        <circle cx="42" cy="38" r="3.4" fill="#1f0505"/>
        <path d="M14 54 Q32 46 50 54" stroke="#1f0505" stroke-width="3" fill="none"/>
    `)
}

const BUILTIN_NPC_TYPES = [
    { id: "builtin_shadow", name: "Sombra", isBoss: false, health: 30, damage: 8, speed: 0.6, scale: 1.8, builtin: true, svg: BUILTIN_SVGS.shadow },
    { id: "builtin_fast", name: "Sombra Veloz", isBoss: false, health: 18, damage: 6, speed: 1.5, scale: 1.5, builtin: true, svg: BUILTIN_SVGS.fast },
    { id: "builtin_tank", name: "Sombra Pesada", isBoss: false, health: 65, damage: 12, speed: 0.35, scale: 2.2, builtin: true, svg: BUILTIN_SVGS.tank },
    { id: "builtin_boss", name: "Guardião das Sombras", isBoss: true, health: 220, damage: 18, speed: 0.5, scale: 3.2, builtin: true, svg: BUILTIN_SVGS.boss }
]

const BUILTIN_PHASES = [
    {
        id: "phase_forest",
        name: "Floresta Sombria",
        builtin: true,
        bgType: "image",
        bgValue: "./assets/background/placeholder.png",
        worldWidth: 1024 * 6,
        spawns: [
            { typeId: "builtin_shadow", x: 700 },
            { typeId: "builtin_shadow", x: 1450 },
            { typeId: "builtin_fast", x: 2300 },
            { typeId: "builtin_tank", x: 3100 },
            { typeId: "builtin_shadow", x: 3900 }
        ],
        bossTypeId: "builtin_boss",
        bossX: 1024 * 6 - 500
    }
]

function defaultAdminSave() {
    return { phases: [], npcTypes: [], bossTypes: [] }
}

// Conteúdo criado pelos admins, buscado da planilha (compartilhado com
// todo mundo). Fica em cache aqui depois do primeiro carregamento.
let adminData = defaultAdminSave()

// Converte o registro cru da planilha ({id, nome, config}) no formato
// que o resto do jogo já espera (mesmo shape que era usado no localStorage)
function normalizePhaseFromServer(row) {
    const config = row.config || {}
    return Object.assign({ id: row.id, name: row.nome, builtin: false }, config)
}

function normalizeNpcFromServer(row) {
    const config = row.config || {}
    return Object.assign({ id: row.id, name: row.nome, builtin: false }, config)
}

async function refreshPhasesFromServer() {
    if (typeof apiCall !== "function") return
    const res = await apiCall("listarFases", {})
    if (res.sucesso && Array.isArray(res.dados)) {
        adminData.phases = res.dados.map(normalizePhaseFromServer)
    }
}

async function refreshNpcsFromServer() {
    if (typeof apiCall !== "function") return
    const res = await apiCall("listarNpcs", {})
    if (res.sucesso && Array.isArray(res.dados)) {
        adminData.npcTypes = res.dados.map(normalizeNpcFromServer)
    }
}
async function refreshBossesFromServer() {
    if (typeof apiCall !== "function") return
    const res = await apiCall("listarBosses", {})
    if (res.sucesso && Array.isArray(res.dados)) {
        adminData.bossTypes = res.dados.map(normalizeNpcFromServer).map(x => Object.assign(x,{isBoss:true}))
    }
}

// Chamado no carregamento do jogo (antes de mostrar o menu) e sempre que
// a Loja/Admin/Seleção de Fase precisar do conteúdo mais atual.
async function refreshAdminContentFromServer() {
    try {
        await Promise.all([refreshPhasesFromServer(), refreshNpcsFromServer(), refreshBossesFromServer()])
    } catch (e) {
        console.error("Não foi possível buscar fases/NPCs do servidor:", e)
    }
}

function getAllNpcTypes() {
    return BUILTIN_NPC_TYPES.concat(adminData.npcTypes, adminData.bossTypes || [])
}

function getNpcTypeById(id) {
    return getAllNpcTypes().find(t => t.id === id) || null
}

function getAllPhases() {
    return BUILTIN_PHASES.concat(adminData.phases)
}

function getPhaseById(id) {
    return getAllPhases().find(p => p.id === id) || null
}

// Gera a imagem (SVG data-URI) de um NPC, seja padrão ou pixel art customizado
function getNpcSpriteSrc(npcType) {
    if (npcType.pixels) return generatePixelArtSvg(npcType.pixels)
    return "data:image/svg+xml;utf8," + encodeURIComponent(npcType.svg)
}

function generatePixelArtSvg(grid) {
    let rects = ""
    for (let y = 0; y < PIXEL_GRID_SIZE; y++) {
        for (let x = 0; x < PIXEL_GRID_SIZE; x++) {
            const color = grid[y] && grid[y][x]
            if (color) {
                rects += `<rect x="${x * PIXEL_CELL}" y="${y * PIXEL_CELL}" width="${PIXEL_CELL}" height="${PIXEL_CELL}" fill="${color}"/>`
            }
        }
    }
    const svg = svgWrap(rects)
    return "data:image/svg+xml;utf8," + encodeURIComponent(svg)
}

function createEmptyPixelGrid() {
    return Array.from({ length: PIXEL_GRID_SIZE }, () => Array(PIXEL_GRID_SIZE).fill(null))
}

// ===================================================================
// Editor de pixel art
// ===================================================================

let pixelGrid = createEmptyPixelGrid()
let paintColor = "#ff5b5b"
let isErasing = false
let isMouseDown = false

const PALETTE_COLORS = [
    "#ffffff", "#c9c9c9", "#5a5a5a", "#1a1a1a",
    "#ff5b5b", "#ff9d4d", "#ffe14d", "#7bd45f",
    "#4dd0e1", "#4d7cff", "#a35bff", "#ff5bb0",
    "#8a5a2c", "#4a2c1a", "#ffd9a0", "#2c1a3a"
]

function buildPixelPalette() {
    const el = document.getElementById("pixel-palette")
    if (!el) return
    el.innerHTML = ""

    PALETTE_COLORS.forEach(color => {
        const swatch = document.createElement("button")
        swatch.type = "button"
        swatch.className = "pixel-swatch"
        swatch.style.background = color
        swatch.addEventListener("click", () => {
            paintColor = color
            isErasing = false
            highlightActiveSwatch(swatch)
        })
        el.appendChild(swatch)
    })

    const customInput = document.createElement("input")
    customInput.type = "color"
    customInput.className = "pixel-swatch-custom"
    customInput.value = paintColor
    customInput.addEventListener("input", () => {
        paintColor = customInput.value
        isErasing = false
        highlightActiveSwatch(null)
    })
    el.appendChild(customInput)

    const eraser = document.createElement("button")
    eraser.type = "button"
    eraser.className = "pixel-swatch pixel-eraser"
    eraser.textContent = "🧹"
    eraser.addEventListener("click", () => {
        isErasing = true
        highlightActiveSwatch(eraser)
    })
    el.appendChild(eraser)
}

function highlightActiveSwatch(activeEl) {
    document.querySelectorAll(".pixel-swatch").forEach(s => s.classList.remove("active"))
    if (activeEl) activeEl.classList.add("active")
}

function buildPixelGridDom() {
    const el = document.getElementById("pixel-grid")
    if (!el) return
    el.innerHTML = ""
    el.style.gridTemplateColumns = `repeat(${PIXEL_GRID_SIZE}, 1fr)`
    el.style.gridTemplateRows = `repeat(${PIXEL_GRID_SIZE}, 1fr)`

    for (let y = 0; y < PIXEL_GRID_SIZE; y++) {
        for (let x = 0; x < PIXEL_GRID_SIZE; x++) {
            const cell = document.createElement("div")
            cell.className = "pixel-cell"
            cell.dataset.x = x
            cell.dataset.y = y

            const paint = () => {
                pixelGrid[y][x] = isErasing ? null : paintColor
                cell.style.background = pixelGrid[y][x] || "transparent"
            }

            cell.addEventListener("mousedown", e => { e.preventDefault(); isMouseDown = true; paint() })
            cell.addEventListener("mouseenter", () => { if (isMouseDown) paint() })
            cell.addEventListener("touchstart", e => { e.preventDefault(); paint() }, { passive: false })
            cell.addEventListener("touchmove", e => {
                e.preventDefault()
                const touch = e.touches[0]
                const target = document.elementFromPoint(touch.clientX, touch.clientY)
                if (target && target.classList.contains("pixel-cell")) {
                    const tx = Number(target.dataset.x)
                    const ty = Number(target.dataset.y)
                    pixelGrid[ty][tx] = isErasing ? null : paintColor
                    target.style.background = pixelGrid[ty][tx] || "transparent"
                }
            }, { passive: false })

            el.appendChild(cell)
        }
    }
}

document.addEventListener("mouseup", () => { isMouseDown = false })

function resetPixelEditor() {
    pixelGrid = createEmptyPixelGrid()
    buildPixelGridDom()
}

// ===================================================================
// Painel de Admin — NPCs
// ===================================================================

function renderNpcTypeOptions(selectEl, includeBoss) {
    if (!selectEl) return
    selectEl.innerHTML = ""
    getAllNpcTypes()
        .filter(t => includeBoss || !t.isBoss)
        .forEach(t => {
            const opt = document.createElement("option")
            opt.value = t.id
            opt.textContent = t.isBoss ? `👑 ${t.name}` : t.name
            selectEl.appendChild(opt)
        })
}

function renderAdminNpcList() {
    const el = document.getElementById("admin-npc-list")
    if (!el) return
    el.innerHTML = ""

    getAllNpcTypes().forEach(type => {
        const row = document.createElement("div")
        row.className = "admin-list-item"
        row.innerHTML = `
            <img class="admin-list-thumb" src="${getNpcSpriteSrc(type)}" alt="">
            <div class="admin-list-info">
                <strong>${type.isBoss ? "👑 " : ""}${type.name}</strong>
                <span>❤ ${type.health} · ⚔ ${type.damage} · 👟 ${type.speed}</span>
            </div>
            ${type.builtin ? '<span class="admin-tag">padrão</span>' : `<button class="btn btn-ghost admin-delete-btn" data-id="${type.id}">🗑</button>`}
        `
        el.appendChild(row)
    })

    el.querySelectorAll(".admin-delete-btn").forEach(btn => {
        btn.addEventListener("click", async () => {
            if (!currentUser) return
            btn.disabled = true
            const npc = getNpcTypeById(btn.dataset.id)
            const action = npc && npc.isBoss ? "removerBoss" : "removerNpc"
            const res = await apiCall(action, { adminID: currentUser.id, id: btn.dataset.id })
            if (!res.sucesso) alert(res.mensagem)
            await refreshNpcsFromServer()
            renderAdminNpcList()
            if (typeof refreshAdminSelects === "function") refreshAdminSelects()
        })
    })
}

function parseAdminDrops(text) {
    return String(text || "").split(/\n+/).map(line => line.trim()).filter(Boolean).map(line => {
        const p=line.split(",").map(x=>x.trim());
        return { itemId:p[0], chance:Math.max(0,Math.min(100,Number(p[1])||0)), min:Math.max(1,Number(p[2])||1), max:Math.max(1,Number(p[3])||Number(p[2])||1) };
    }).filter(x=>x.itemId);
}

async function saveNewNpc() {
    if (!currentUser || currentUser.role !== "admin") {
        alert("Você precisa estar logado como admin pra salvar um NPC.")
        return
    }

    const name = document.getElementById("admin-npc-name").value.trim()
    if (!name) {
        alert("Dá um nome pro NPC primeiro!")
        return
    }

    const hasAnyPixel = pixelGrid.some(row => row.some(cell => cell))
    if (!hasAnyPixel) {
        alert("Desenha alguma coisa no grid de pixel art antes de salvar!")
        return
    }

    const config = {
        isBoss: document.getElementById("admin-npc-isboss").checked,
        health: Number(document.getElementById("admin-npc-health").value) || 30,
        damage: Number(document.getElementById("admin-npc-damage").value) || 8,
        speed: Number(document.getElementById("admin-npc-speed").value) || 0.6,
        scale: Number(document.getElementById("admin-npc-scale").value) || 1.8,
        pixels: pixelGrid.map(row => row.slice()),
        drops: parseAdminDrops(document.getElementById("admin-npc-drops")?.value || "")
    }

    const saveBtn = document.getElementById("admin-save-npc")
    saveBtn.disabled = true
    saveBtn.textContent = "Salvando..."

    // NPC comum vai para NpcTypes; Boss vai para a aba Bosses.
    const action = config.isBoss ? "salvarBoss" : "salvarNpc"
    const res = await apiCall(action, { adminID: currentUser.id, nome: name, config })

    saveBtn.disabled = false
    saveBtn.textContent = "💾 Salvar NPC"

    if (!res.sucesso) {
        alert("Erro ao salvar: " + res.mensagem)
        return
    }

    document.getElementById("admin-npc-name").value = ""
    document.getElementById("admin-npc-isboss").checked = false
    if (document.getElementById("admin-npc-drops")) document.getElementById("admin-npc-drops").value = ""
    resetPixelEditor()

    await refreshNpcsFromServer()
    renderAdminNpcList()
    if (typeof refreshAdminSelects === "function") refreshAdminSelects()
    const destino = config.isBoss ? "Bosses" : "NpcTypes"
    const savedId = res.dados && res.dados.id ? res.dados.id : "(ID não retornado)"
    alert(`${config.isBoss ? "Boss" : "NPC"} "${name}" salvo na aba ${destino}!\nID: ${savedId}`)
}

// ===================================================================
// Painel de Admin — Fases
// ===================================================================

let phaseSpawnsBeingEdited = []

function addSpawnToPhaseDraft() {
    const select = document.getElementById("admin-spawn-type")
    if (!select || !select.value) return
    const type = getNpcTypeById(select.value)
    if (!type) return

    const nextX = 500 + phaseSpawnsBeingEdited.length * 700
    phaseSpawnsBeingEdited.push({ typeId: type.id, x: nextX })
    renderPhaseSpawnsDraft()
}

function renderPhaseSpawnsDraft() {
    const el = document.getElementById("admin-phase-spawns")
    if (!el) return
    el.innerHTML = ""

    if (phaseSpawnsBeingEdited.length === 0) {
        el.innerHTML = '<p class="admin-empty-note">Nenhum inimigo adicionado ainda.</p>'
        return
    }

    phaseSpawnsBeingEdited.forEach((spawn, i) => {
        const type = getNpcTypeById(spawn.typeId)
        const row = document.createElement("div")
        row.className = "admin-spawn-row"
        row.innerHTML = `
            <span>${type ? type.name : "?"}</span>
            <span class="admin-spawn-x">posição ${spawn.x}</span>
            <button class="btn btn-ghost admin-remove-spawn" data-i="${i}">✕</button>
        `
        el.appendChild(row)
    })

    el.querySelectorAll(".admin-remove-spawn").forEach(btn => {
        btn.addEventListener("click", () => {
            phaseSpawnsBeingEdited.splice(Number(btn.dataset.i), 1)
            renderPhaseSpawnsDraft()
        })
    })
}

function resetPhaseDraft() {
    phaseSpawnsBeingEdited = []
    renderPhaseSpawnsDraft()
    document.getElementById("admin-phase-name").value = ""
    document.getElementById("admin-phase-width").value = 6
    document.getElementById("admin-phase-has-boss").checked = false
    document.getElementById("admin-phase-bg-url").value = ""
    const imageRadio = document.querySelector('input[name="bgType"][value="image"]')
    if (imageRadio) imageRadio.checked = true
}

function renderAdminPhaseList() {
    const el = document.getElementById("admin-phase-list")
    if (!el) return
    el.innerHTML = ""

    getAllPhases().forEach(phase => {
        const row = document.createElement("div")
        row.className = "admin-list-item"
        row.innerHTML = `
            <div class="admin-list-info">
                <strong>${phase.name}</strong>
                <span>${phase.spawns.length} inimigo(s)${phase.bossTypeId ? " · com chefão" : ""}</span>
            </div>
            ${phase.builtin ? '<span class="admin-tag">padrão</span>' : `<button class="btn btn-ghost admin-delete-btn" data-id="${phase.id}">🗑</button>`}
        `
        el.appendChild(row)
    })

    el.querySelectorAll(".admin-delete-btn").forEach(btn => {
        btn.addEventListener("click", async () => {
            if (!currentUser) return
            btn.disabled = true
            const res = await apiCall("removerFase", { adminID: currentUser.id, id: btn.dataset.id })
            if (!res.sucesso) alert(res.mensagem)
            await refreshPhasesFromServer()
            renderAdminPhaseList()
            if (typeof renderPhaseSelect === "function") renderPhaseSelect()
        })
    })
}

async function saveNewPhase() {
    if (!currentUser || currentUser.role !== "admin") {
        alert("Você precisa estar logado como admin pra salvar uma fase.")
        return
    }

    const name = document.getElementById("admin-phase-name").value.trim()
    if (!name) {
        alert("Dá um nome pra fase primeiro!")
        return
    }
    if (phaseSpawnsBeingEdited.length === 0) {
        alert("Adiciona pelo menos um inimigo na fase!")
        return
    }

    const bgType = document.querySelector('input[name="bgType"]:checked').value
    const widthScreens = Math.max(2, Math.min(12, Number(document.getElementById("admin-phase-width").value) || 6))
    const hasBoss = document.getElementById("admin-phase-has-boss").checked
    const bossSelect = document.getElementById("admin-phase-boss-type")

    // Além dos IDs, salva um snapshot completo dos NPCs/Boss usados na fase.
    // Assim a fase continua íntegra mesmo se um tipo for alterado/removido depois.
    const spawnSnapshots = phaseSpawnsBeingEdited.map(s => {
        const type = getNpcTypeById(s.typeId)
        return { ...s, npcSnapshot: type ? JSON.parse(JSON.stringify(type)) : null }
    })
    const bossType = hasBoss ? getNpcTypeById(bossSelect.value) : null

    const config = {
        schemaVersion: 2,
        bgType,
        worldWidth: 1024 * widthScreens,
        spawns: spawnSnapshots,
        bossTypeId: hasBoss ? bossSelect.value : null,
        bossX: hasBoss ? (1024 * widthScreens - 500) : null,
        bossSnapshot: bossType ? JSON.parse(JSON.stringify(bossType)) : null
    }

    if (bgType === "gradient") {
        config.bgColors = {
            top: document.getElementById("admin-phase-color-top").value,
            bottom: document.getElementById("admin-phase-color-bottom").value
        }
    } else {
        const url = document.getElementById("admin-phase-bg-url").value.trim()
        config.bgValue = url || "./assets/background/placeholder.png"
    }

    const saveBtn = document.getElementById("admin-save-phase")
    saveBtn.disabled = true
    saveBtn.textContent = "Salvando..."

    const res = await apiCall("salvarFase", { adminID: currentUser.id, nome: name, config })

    saveBtn.disabled = false
    saveBtn.textContent = "💾 Salvar Fase"

    if (!res.sucesso) {
        alert("Erro ao salvar: " + res.mensagem)
        return
    }

    resetPhaseDraft()
    await refreshPhasesFromServer()
    renderAdminPhaseList()
    if (typeof renderPhaseSelect === "function") renderPhaseSelect()
    const savedId = res.dados && res.dados.id ? res.dados.id : "(ID não retornado)"
    alert(`Fase "${name}" salva na aba Fases!\nID: ${savedId}\nNPCs/Boss personalizados usados pela fase ficam persistidos nas abas próprias.`)
}

function refreshAdminSelects() {
    renderNpcTypeOptions(document.getElementById("admin-spawn-type"), false)
    renderNpcTypeOptions(document.getElementById("admin-phase-boss-type"), true)
}

// API pública para módulos de interface
window.refreshAdminContentFromServer = refreshAdminContentFromServer;
window.getAllNpcTypes = getAllNpcTypes;
window.getNpcTypeById = getNpcTypeById;
