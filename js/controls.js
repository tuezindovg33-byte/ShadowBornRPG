const keys = {
    a: {
        pressed: false
    },
    d: {
        pressed: false
    },
    w: {
        pressed: false,
        hold: false
    },
    space: {
        pressed: false,
        hold: false
    },

}

window.addEventListener("keydown", e => {
    let key = e.key

    switch(key) {
        case "ArrowLeft":
        case "a":
            keys.a.pressed = true
            player.lastKeyPressed = key
            break
        case "ArrowRight":
        case "d":
            keys.d.pressed = true
            player.lastKeyPressed = key
            break
        case "ArrowUp":
        case "w":
            keys.w.pressed = true
            break
        case "z":
        case " ":
            keys.space.pressed = true
            break
        case "Escape":
            togglePause()
            break
    }
})

window.addEventListener("keyup", e => {
    let key = e.key

    switch(key) {
        case "ArrowLeft":
        case "a":
            keys.a.pressed = false
            break
        case "ArrowRight":
        case "d":
            keys.d.pressed = false
            break
        case "ArrowUp":
        case "w":
            keys.w.pressed = false
            keys.w.hold = false
            break
        case "z":
        case " ":
            keys.space.pressed = false
            keys.space.hold = false
            break
    }
})

function resetKeys() {
    keys.a.pressed = false
    keys.d.pressed = false
    keys.w.pressed = false
    keys.w.hold = false
    keys.space.pressed = false
    keys.space.hold = false
}

// ===================================================================
// Controles touch (celular/tablet) — alimentam o mesmo objeto `keys`
// usado pelo teclado, então handleControls() não precisa saber a
// diferença entre um toque na tela e uma tecla apertada.
// ===================================================================
function bindTouchButton(id, onPress, onRelease) {
    const el = document.getElementById(id)
    if (!el) return

    const start = e => {
        e.preventDefault()
        onPress()
    }
    const end = e => {
        e.preventDefault()
        onRelease()
    }

    el.addEventListener('touchstart', start, { passive: false })
    el.addEventListener('touchend', end, { passive: false })
    el.addEventListener('touchcancel', end, { passive: false })

    // Também funciona com mouse, útil pra testar em desktop/emulador
    el.addEventListener('mousedown', start)
    el.addEventListener('mouseup', end)
    el.addEventListener('mouseleave', end)
}

function setupTouchControls() {
    bindTouchButton('touch-left',
        () => { keys.a.pressed = true; player.lastKeyPressed = 'a' },
        () => { keys.a.pressed = false }
    )
    bindTouchButton('touch-right',
        () => { keys.d.pressed = true; player.lastKeyPressed = 'd' },
        () => { keys.d.pressed = false }
    )
    bindTouchButton('touch-jump',
        () => { keys.w.pressed = true },
        () => { keys.w.pressed = false; keys.w.hold = false }
    )
    bindTouchButton('touch-attack',
        () => { keys.space.pressed = true },
        () => { keys.space.pressed = false; keys.space.hold = false }
    )
}

// Detecta dispositivo touch para mostrar os controles na tela
document.addEventListener('DOMContentLoaded', () => {
    if ('ontouchstart' in window || navigator.maxTouchPoints > 0) {
        document.body.classList.add('touch-device')
    }
    setupTouchControls()
})

function handleControls() {
    player.setSprite("idle")

    if (!player.onGround) player.setSprite("jumping")
    if (player.isAttacking) player.setSprite("attacking")

    movement()
    attacks()

    function movement() {
        player.velocity.x = 0
        if (player.isAttacking) return

        if (keys.a.pressed && ["a", "ArrowLeft"].includes(player.lastKeyPressed)) {
            player.velocity.x = -1.2 * 3.4 * player.moveSpeedMultiplier
            player.facing = "left"

            if (!player.onGround) return

            player.setSprite("running")
        }

        if (keys.d.pressed && ["d", "ArrowRight"].includes(player.lastKeyPressed)) {
            player.velocity.x = 1.2 * 3.4 * player.moveSpeedMultiplier
            player.facing = "right"

            if (!player.onGround) return

            player.setSprite("running")
        }

        if (keys.w.pressed && !keys.w.hold) {
            player.jump()
            keys.w.hold = true
            player.setSprite("jumping")
        }
    }

    function attacks() {
        if (keys.space.pressed && !keys.space.hold) {
            player.attack()
            keys.space.hold = true
        } 
    }
}