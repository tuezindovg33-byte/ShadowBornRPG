const gravity = 0.2

const floorHeight = 96

// Largura do "mundo" atual — muda de acordo com a fase escolhida
// (ver ASSET/fase em admin.js). Valor inicial é só um placeholder.
let worldWidth = 1024 * 6

// Fase atualmente carregada (ver admin.js: getAllPhases/getPhaseById)
let currentPhase = null
let phaseCompleted = false

// Central de caminhos de imagem: mude aqui se algum arquivo mudar de lugar
const ASSET_PATHS = {
    background: "./assets/background/placeholder.png",
    object: "./assets/objects/square.svg",
    playerIdle: "./assets/player/idle.png",
    playerRunning: "./assets/player/running.png",
    playerJumping: "./assets/player/jumping.png",
    playerAttacking: "./assets/player/attacking.png",
    slash: "./assets/player/slash.png"
}

// Cache de imagens: cada caminho é carregado uma única vez e reaproveitado
// por todos os sprites que usam a mesma imagem.
const IMAGE_CACHE = {}

function getImage(src) {
    let img = IMAGE_CACHE[src]
    if (!img) {
        img = new Image()
        img.src = src
        IMAGE_CACHE[src] = img
    }
    return img
}

// Efeitos visuais ativos (ex: o corte da katana), atualizados/desenhados a cada frame
let activeEffects = []

// Inimigos vivos no mapa
let enemies = []

// Checa sobreposição entre dois retângulos {x, y, width, height}
function rectsOverlap(a, b) {
    return a.x < b.x + b.width &&
        a.x + a.width > b.x &&
        a.y < b.y + b.height &&
        a.y + a.height > b.y
}

// Carrega todas as imagens do jogo ANTES de liberar o botão "Iniciar Jogo".
function preloadImages() {
    const sources = Object.values(ASSET_PATHS)

    // NPCs (padrão + criados no admin) e fundos de todas as fases
    if (typeof getAllNpcTypes === "function") {
        getAllNpcTypes().forEach(type => sources.push(getNpcSpriteSrc(type)))
    }
    if (typeof getAllPhases === "function") {
        getAllPhases().forEach(phase => {
            if (phase.bgType === "image" && phase.bgValue) sources.push(phase.bgValue)
        })
    }

    const promises = sources.map(src => new Promise(resolve => {
        const img = getImage(src)
        if (img.complete) {
            resolve()
            return
        }
        img.addEventListener('load', () => resolve(), { once: true })
        img.addEventListener('error', () => {
            console.error("Falha ao carregar imagem:", src)
            resolve() // não trava o jogo por causa de uma imagem quebrada
        }, { once: true })
    }))

    return Promise.all(promises)
}

class Sprite {
    constructor({ position, velocity, source, scale, offset, sprites }) {
        this.position = position
        this.velocity = velocity

        this.scale = scale || 1

        const src = source || ASSET_PATHS.object
        this.image = getImage(src)
        this.width = this.image.width * this.scale
        this.height = this.image.height * this.scale

        // Se a imagem ainda não carregou (ex: instância criada antes do
        // pré-carregamento terminar), corrige width/height assim que carregar.
        if (!this.image.complete) {
            this.image.addEventListener('load', () => {
                this.width = this.image.width * this.scale
                this.height = this.image.height * this.scale
            }, { once: true })
        }

        this.offset = offset || {
            x: 0,
            y: 0
        }

        this.sprites = sprites || {
            idle: {
                src: src,
                totalSpriteFrames: 1,
                framesPerSpriteFrame: 1
            }
        }

        this.currentSprite = this.sprites.idle

        this.currentSpriteFrame = 0
        this.elapsedTime = 0
        this.totalSpriteFrames = this.sprites.idle.totalSpriteFrames
        this.framesPerSpriteFrame = this.sprites.idle.framesPerSpriteFrame
    }

    setSprite(sprite) {
        this.currentSprite = this.sprites[sprite]

        if (!this.currentSprite) {
            this.currentSprite = this.sprites.idle
        }
    }

    loadSprite() {
        const newSrc = this.currentSprite.src
        const newImage = getImage(newSrc)

        // Só troca (e corrige a posição) quando a imagem realmente muda
        if (newImage !== this.image) {
            const previousHeight = this.height
            this.image = newImage

            const applyDimensions = () => {
                this.width = this.image.width * this.scale
                this.height = this.image.height * this.scale
                // Corrige a posição para os "pés" continuarem no mesmo lugar
                // ao trocar entre sprites com alturas diferentes
                this.position.y += previousHeight - this.height
            }

            if (this.image.complete) {
                applyDimensions()
            } else {
                this.image.addEventListener('load', applyDimensions, { once: true })
            }
        }

        this.totalSpriteFrames = this.currentSprite.totalSpriteFrames
        this.framesPerSpriteFrame = this.currentSprite.framesPerSpriteFrame
    }

    draw() {
        if (!this.image.complete || this.image.naturalWidth === 0) return

        ctx.imageSmoothingEnabled = false;

        // Determine the x-scale based on the facing direction
        const xScale = this.facing === "left" ? -1 : 1;

        ctx.save();
        ctx.translate(this.position.x + this.offset.x, this.position.y + this.offset.y);
        ctx.scale(xScale, 1); // Flip the image horizontally if facing left

        ctx.drawImage(
            this.image,
            this.currentSpriteFrame * this.image.width / this.totalSpriteFrames,
            0,
            this.image.width / this.totalSpriteFrames,
            this.image.height,
            0,
            0,
            this.width / this.totalSpriteFrames * xScale, // Adjust the width with x-scale
            this.height
        );

        ctx.restore();
    }

    animate() {
        this.elapsedTime += 1

        if (this.elapsedTime >= this.framesPerSpriteFrame) {
            this.currentSpriteFrame += 1

            if (this.currentSpriteFrame >= this.totalSpriteFrames) {
                this.currentSpriteFrame = 0
            }

            this.elapsedTime = 0
        }

    }

    update() {
        this.draw()
        this.animate()
    }
}

// Efeito visual do corte da katana (usa assets/player/slash.png, 5 quadros)
class SlashEffect extends Sprite {
    constructor({ position, facing, scale }) {
        super({
            position,
            velocity: { x: 0, y: 0 },
            scale: scale || 3,
            source: ASSET_PATHS.slash,
            sprites: {
                idle: {
                    src: ASSET_PATHS.slash,
                    totalSpriteFrames: 5,
                    framesPerSpriteFrame: 3
                }
            }
        })

        this.facing = facing
        this.markedForRemoval = false
    }

    animate() {
        // Detecta quando o último quadro terminou de ser exibido,
        // para remover o efeito assim que a animação acabar (sem repetir em loop)
        const isLastFrame = this.currentSpriteFrame === this.totalSpriteFrames - 1
        const aboutToWrap = this.elapsedTime + 1 >= this.framesPerSpriteFrame

        super.animate()

        if (isLastFrame && aboutToWrap) {
            this.markedForRemoval = true
        }
    }
}

function spawnSlashEffect(fighter) {
    const facing = fighter.facing === "left" ? "left" : "right"

    // fighter.width é a largura da spritesheet inteira (todos os quadros
    // somados) — precisamos da largura de UM quadro para posicionar o corte
    // corretamente na frente do personagem.
    const frameWidth = fighter.width / fighter.totalSpriteFrames
    const forwardOffset = facing === "left" ? -(frameWidth * 0.55) : frameWidth * 0.55

    const slash = new SlashEffect({
        position: {
            x: fighter.position.x + forwardOffset,
            y: fighter.position.y + fighter.height * 0.32
        },
        facing
    })

    activeEffects.push(slash)
}

// Área que realmente causa dano durante um golpe (fica ativa por pouco tempo)
function getAttackHitbox(fighter) {
    const frameWidth = fighter.width / fighter.totalSpriteFrames
    const width = 90
    const height = 80

    const x = fighter.facing === "left"
        ? fighter.position.x - width + frameWidth * 0.4
        : fighter.position.x + frameWidth * 0.4

    const y = fighter.position.y + fighter.height * 0.12

    return { x, y, width, height }
}

// NPC inimigo: anda de um lado para o outro, tem vida, e pode ser morto pelo jogador.
// `type` vem de admin.js (getNpcTypeById) — padrão ou criado no editor de pixel art.
class Enemy extends Sprite {
    constructor({ position, patrolRange, type }) {
        super({
            position,
            velocity: { x: 0, y: 0 },
            scale: type.scale || 1.8,
            source: getNpcSpriteSrc(type)
        })

        this.type = type
        this.name = type.name
        this.isBoss = !!type.isBoss

        this.maxHealth = type.health || 30
        this.health = this.maxHealth
        this.contactDamage = type.damage || 8

        this.baseX = position.x
        this.patrolRange = patrolRange || (this.isBoss ? 70 : 90)
        this.speed = type.speed || 0.6
        this.direction = Math.random() < 0.5 ? -1 : 1
        this.facing = this.direction === 1 ? "right" : "left"

        this.isDead = false
        this.deathTimer = 0
        this.markedForRemoval = false

        this.contactCooldown = 0
        this.bobTime = Math.random() * 100
    }

    getBounds() {
        return {
            x: this.position.x,
            y: this.position.y,
            width: this.width,
            height: this.height
        }
    }

    takeDamage(amount) {
        if (this.isDead) return
        this.health -= amount
        if (this.health <= 0) {
            this.health = 0
            this.isDead = true
            this.deathTimer = 30

            const base = this.isBoss ? 60 : 8
            const coinReward = base + Math.floor(Math.random() * 6)
            if (typeof awardCoins === "function") awardCoins(coinReward)
            if (window.ShadowV9 && typeof window.ShadowV9.rollDrops === "function") window.ShadowV9.rollDrops(this.type)
            if (window.ShadowRPG && typeof window.ShadowRPG.onEnemyDefeated === "function") window.ShadowRPG.onEnemyDefeated(this)
        }
    }

    patrol() {
        this.position.x += this.speed * this.direction

        if (this.position.x > this.baseX + this.patrolRange) this.direction = -1
        if (this.position.x < this.baseX - this.patrolRange) this.direction = 1

        this.facing = this.direction === 1 ? "right" : "left"

        // Pequeno "flutuar" para dar vida ao placeholder
        this.bobTime += 1
        this.offset.y = Math.sin(this.bobTime * 0.08) * 4
    }

    draw() {
        if (this.isDead) {
            ctx.save()
            ctx.globalAlpha = Math.max(this.deathTimer / 30, 0)
            super.draw()
            ctx.restore()
            return
        }

        super.draw()

        // Barrinha de vida (e nome, se for chefão) acima do inimigo
        const barWidth = this.isBoss ? 70 : 44
        const barX = this.position.x + this.width / 2 - barWidth / 2
        const barY = this.position.y - (this.isBoss ? 22 : 14)

        if (this.isBoss) {
            ctx.fillStyle = "#ffd873"
            ctx.font = "bold 13px 'Trebuchet MS', sans-serif"
            ctx.textAlign = "center"
            ctx.fillText(this.name, this.position.x + this.width / 2, barY - 6)
        }

        ctx.fillStyle = "rgba(0, 0, 0, 0.55)"
        ctx.fillRect(barX, barY, barWidth, 6)

        ctx.fillStyle = this.isBoss ? "#ffb84d" : "#e74c3c"
        ctx.fillRect(barX, barY, barWidth * (this.health / this.maxHealth), 6)
    }

    update() {
        if (this.isDead) {
            this.deathTimer -= 1
            this.draw()
            if (this.deathTimer <= 0) this.markedForRemoval = true
            return
        }

        if (this.contactCooldown > 0) this.contactCooldown -= 1

        this.patrol()
        this.draw()
        this.animate()
    }
}

function spawnEnemyOfType(typeId, x, snapshot = null) {
    // Primeiro tenta o cadastro atual da planilha; se não existir, usa o snapshot
    // que foi salvo junto com a fase. Isso evita fases quebradas.
    const type = getNpcTypeById(typeId) || snapshot
    if (!type) return null

    const height = 64 * (type.scale || 1.8)
    const groundY = canvas.height - height - floorHeight

    return new Enemy({ position: { x, y: groundY }, type })
}

function spawnEnemies() {
    enemies = []

    if (!currentPhase) return

    currentPhase.spawns.forEach(spawn => {
        const enemy = spawnEnemyOfType(spawn.typeId, spawn.x, spawn.npcSnapshot || null)
        if (enemy) enemies.push(enemy)
    })

    if (currentPhase.bossTypeId) {
        const boss = spawnEnemyOfType(currentPhase.bossTypeId, currentPhase.bossX || (currentPhase.worldWidth - 500), currentPhase.bossSnapshot || null)
        if (boss) enemies.push(boss)
    }
}

class Fighter extends Sprite {
    constructor({
        position,
        velocity,
        attackBox,
        sprites,
        scale
    }) {
        super({
            position,
            velocity,
            scale,
            sprites
        })

        this.velocity = velocity

        this.attackBox = attackBox || {
            position: {
                x: this.position.x,
                y: this.position.y,
            },
            width: 125,
            height: 50
        }

        this.isAttacking
        this.attackCooldown = 500
        this.onAttackCooldown

        this.lastKeyPressed
        this.onGround

        // Combate
        this.health = 100
        this.maxHealth = 100
        this.attackDamage = 15
        this.moveSpeedMultiplier = 1
        this.invulnerable = false
        this.activeHitbox = null
        this.hitboxActiveUntil = 0
        this.hitEnemies = new Set()
    }

    gravity() {
        if (this.position.y + this.height >= canvas.height - floorHeight) {
            this.onGround = true
        } else {
            this.onGround = false
        }

        if (this.position.y + this.height > canvas.height - floorHeight) {
            this.position.y = canvas.height - this.height - floorHeight
            this.velocity.y = 0
        } else {
            if (!this.onGround) this.velocity.y += gravity
        }

        this.position.x += this.velocity.x
        this.position.y += this.velocity.y

        // Impede o jogador de sair dos limites do mapa
        const frameWidth = this.width / this.totalSpriteFrames
        this.position.x = Math.max(0, Math.min(this.position.x, worldWidth - frameWidth))

        this.attackBox.position.x = this.position.x
        this.attackBox.position.y = this.position.y
    }

    update() {
        this.gravity()
        this.loadSprite()
        //this.loadAttackBox()
        this.draw()
        this.animate()
    }

    attack() {
        if (this.onAttackCooldown) return

        this.isAttacking = true
        this.onAttackCooldown = true

        this.setSprite("attacking")
        this.loadSprite() // atualiza width/height imediatamente para o corte nascer no lugar certo
        spawnSlashEffect(this)

        this.activeHitbox = getAttackHitbox(this)
        this.hitboxActiveUntil = performance.now() + 200
        this.hitEnemies = new Set()

        setTimeout(() => {
            this.isAttacking = false
        }, 400)

        setTimeout(() => {
            this.onAttackCooldown = false
        }, this.attackCooldown)
    }

    takeDamage(amount) {
        if (this.invulnerable) return

        this.health = Math.max(0, this.health - amount)
        this.invulnerable = true

        setTimeout(() => {
            this.invulnerable = false
        }, 800)

        if (this.health <= 0 && typeof onPlayerDeath === "function") {
            onPlayerDeath()
        }
    }

    draw() {
        // Pisca enquanto estiver invulnerável (logo após tomar dano)
        if (this.invulnerable && Math.floor(performance.now() / 100) % 2 === 0) {
            ctx.save()
            ctx.globalAlpha = 0.4
            super.draw()
            ctx.restore()
            return
        }

        super.draw()
    }

    jump() {
        if (!this.onGround) return
        this.velocity.y = -8.5
    }

}

const player = new Fighter({
    position: {
        x: 100,
        y: 0
    },
    velocity: {
        x: 0,
        y: 10
    },
    scale: 4,
    sprites: {
        idle: {
            src: ASSET_PATHS.playerIdle,
            totalSpriteFrames: 11,
            framesPerSpriteFrame: 18
        },
        running: {
            src: ASSET_PATHS.playerRunning,
            totalSpriteFrames: 10,
            framesPerSpriteFrame: 8
        },
        jumping: {
            src: ASSET_PATHS.playerJumping,
            totalSpriteFrames: 4,
            framesPerSpriteFrame: 8
        },
        attacking: {
            src: ASSET_PATHS.playerAttacking,
            totalSpriteFrames: 7,
            framesPerSpriteFrame: 8
        }
    }
})

/* const player2 = new Fighter({
    position: {
        x: 500,
        y: 20
    },
    velocity: {
        x: 0,
        y: 0
    },
    dimensions: {
        width: 50,
        height: 200
    }
}) */

let kills = 0

function resetGame() {
    if (!currentPhase) currentPhase = getAllPhases()[0]
    worldWidth = currentPhase.worldWidth
    phaseCompleted = false

    player.position = { x: 100, y: 0 }
    player.velocity = { x: 0, y: 10 }
    player.facing = "right"
    player.isAttacking = false
    player.onAttackCooldown = false
    player.invulnerable = false
    player.activeHitbox = null
    player.hitEnemies = new Set()

    if (typeof applyUpgradesToPlayer === "function") {
        applyUpgradesToPlayer(player)
    } else {
        player.health = player.maxHealth
    }

    activeEffects = []
    kills = 0
    spawnEnemies()
    camera.x = 0
}
