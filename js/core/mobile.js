// =====================================
// Mobile Touch Controls
// =====================================
//
// Fully self-contained. Injects its own CSS + DOM overlay
// on top of the existing <canvas>, and exposes a single
// global - MobileInput - that other files can read from.
//
// IMPORTANT: this file never touches `keys`, `isMouseDown`,
// or `aimAngle` in a way that fights the desktop path in
// input.js. On desktop (no touch support detected) none of
// the UI is created and MobileInput.active stays false, so
// player.js's mobile hooks become no-ops and PC gameplay is
// completely unaffected.

const MobileInput = {

    active: ("ontouchstart" in window) || navigator.maxTouchPoints > 0,

    // Normalized (-1..1) movement vector from the left stick.
    moveX: 0,
    moveY: 0

};

if (MobileInput.active)
    initMobileControls();

function initMobileControls() {

    // Canvas shouldn't try to pan/zoom/scroll under touch.
    canvas.style.touchAction = "none";

    injectMobileStyles();
    buildMobileDOM();

    const moveStick = document.getElementById("moveJoystick");
    const aimStick = document.getElementById("aimJoystick");

    setupJoystick(

        moveStick,

        (nx, ny) => {

            MobileInput.moveX = nx;
            MobileInput.moveY = ny;

        },

        () => {

            MobileInput.moveX = 0;
            MobileInput.moveY = 0;

        }

    );

    setupJoystick(

        aimStick,

        (nx, ny, magnitude) => {

            if (!player)
                return;

            // Only re-aim once the stick has actually been
            // pushed somewhere, so a light tap near dead
            // center doesn't snap the aim to a random angle.
            if (magnitude < 0.15)
                return;

            aimAngle = Math.atan2(ny, nx);

            // Deadzone before it counts as "holding attack" -
            // small nudges just aim without swinging.
            isMouseDown = magnitude > 0.35;

        },

        () => {

            isMouseDown = false;

        }

    );

    const dashBtn = document.getElementById("dashBtn");
    const bowBtn = document.getElementById("bowBtn");
    const laserBtn = document.getElementById("laserBtn");

    bindTapButton(dashBtn, () => {

        if (Game.state === "playing")
            player.dash();

    });

    bindTapButton(bowBtn, () => {

        if (Game.state === "playing")
            player.fireBow();

    });

    bindTapButton(laserBtn, () => {

        if (Game.state === "playing")
            player.fireKingsBladeLaser();

    });

    requestAnimationFrame(updateMobileUIVisibility);

}

// =====================================
// Visibility
// =====================================
//
// Controls only make sense mid-run, and the ability
// buttons only make sense once the player actually owns
// that item. Polled every frame instead of hooked into
// every place Save.equip toggles, so the shop stays
// untouched.

function updateMobileUIVisibility() {

    const root = document.getElementById("mobileControls");

    if (root)
        root.style.display = Game.state === "playing" ? "block" : "none";

    const bowBtn = document.getElementById("bowBtn");

    if (bowBtn)
        bowBtn.style.display = Save.isEquipped("bow") ? "flex" : "none";

    const laserBtn = document.getElementById("laserBtn");

    if (laserBtn)
        laserBtn.style.display = Save.isEquipped("kingsBlade") ? "flex" : "none";

    requestAnimationFrame(updateMobileUIVisibility);

}

// =====================================
// Joystick Behavior
// =====================================
//
// Each joystick tracks a single touch identifier so the
// left (move) and right (aim) sticks can be held down
// simultaneously without stealing each other's touch.

function setupJoystick(baseEl, onMove, onEnd) {

    const knob = baseEl.querySelector(".joystick-knob");
    const maxRadius = 40;

    let touchId = null;

    function start(e) {

        e.preventDefault();

        if (touchId !== null)
            return;

        const touch = e.changedTouches[0];
        touchId = touch.identifier;

        move(e);

    }

    function move(e) {

        if (touchId === null)
            return;

        let touch = null;

        for (const t of e.changedTouches) {

            if (t.identifier === touchId) {

                touch = t;
                break;

            }

        }

        if (!touch)
            return;

        e.preventDefault();

        const rect = baseEl.getBoundingClientRect();
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;

        const dx = touch.clientX - cx;
        const dy = touch.clientY - cy;

        const dist = Math.sqrt(dx * dx + dy * dy);
        const clamped = Math.min(dist, maxRadius);
        const angle = Math.atan2(dy, dx);

        const knobX = Math.cos(angle) * clamped;
        const knobY = Math.sin(angle) * clamped;

        knob.style.transform =
            `translate(calc(-50% + ${knobX}px), calc(-50% + ${knobY}px))`;

        const magnitude = clamped / maxRadius;

        const normX = magnitude > 0 ? Math.cos(angle) * magnitude : 0;
        const normY = magnitude > 0 ? Math.sin(angle) * magnitude : 0;

        onMove(normX, normY, magnitude);

    }

    function end(e) {

        let released = false;

        for (const t of e.changedTouches) {

            if (t.identifier === touchId)
                released = true;

        }

        if (!released)
            return;

        touchId = null;

        knob.style.transform = "translate(-50%, -50%)";

        onEnd();

    }

    baseEl.addEventListener("touchstart", start, { passive: false });
    baseEl.addEventListener("touchmove", move, { passive: false });
    baseEl.addEventListener("touchend", end, { passive: false });
    baseEl.addEventListener("touchcancel", end, { passive: false });

}

function bindTapButton(el, onTap) {

    el.addEventListener("touchstart", (e) => {

        e.preventDefault();
        onTap();

    }, { passive: false });

}

// =====================================
// DOM / CSS
// =====================================

function buildMobileDOM() {

    const container = document.createElement("div");
    container.id = "mobileControls";

    container.innerHTML = `
        <div class="joystick-base" id="moveJoystick">
            <div class="joystick-knob"></div>
        </div>
        <div class="joystick-base" id="aimJoystick">
            <div class="joystick-knob"></div>
        </div>
        <div class="mobile-btn" id="dashBtn">DASH</div>
        <div class="mobile-btn" id="bowBtn">BOW</div>
        <div class="mobile-btn" id="laserBtn">LASER</div>
    `;

    document.body.appendChild(container);

}

function injectMobileStyles() {

    const style = document.createElement("style");

    style.textContent = `

        #mobileControls {
            position: fixed;
            inset: 0;
            pointer-events: none;
            z-index: 1000;
            font-family: Arial, sans-serif;
            display: none;
            user-select: none;
            -webkit-user-select: none;
        }

        .joystick-base {
            position: absolute;
            width: 130px;
            height: 130px;
            border-radius: 50%;
            background: rgba(255, 255, 255, 0.08);
            border: 2px solid rgba(255, 255, 255, 0.35);
            pointer-events: auto;
            touch-action: none;
            bottom: 30px;
        }

        .joystick-knob {
            position: absolute;
            width: 56px;
            height: 56px;
            border-radius: 50%;
            background: rgba(255, 255, 255, 0.45);
            border: 2px solid rgba(255, 255, 255, 0.65);
            left: 50%;
            top: 50%;
            transform: translate(-50%, -50%);
            pointer-events: none;
        }

        #moveJoystick {
            left: 30px;
        }

        #aimJoystick {
            right: 30px;
        }

        .mobile-btn {
            position: absolute;
            width: 64px;
            height: 64px;
            border-radius: 50%;
            background: rgba(255, 255, 255, 0.15);
            border: 2px solid rgba(255, 255, 255, 0.45);
            color: white;
            font-size: 13px;
            font-weight: bold;
            display: none;
            align-items: center;
            justify-content: center;
            text-align: center;
            pointer-events: auto;
            touch-action: none;
        }

        #dashBtn {
            display: flex;
            right: 200px;
            bottom: 140px;
        }

        #bowBtn {
            right: 90px;
            bottom: 210px;
        }

        #laserBtn {
            right: 200px;
            bottom: 270px;
        }

        @media (max-width: 480px) {

            .joystick-base {
                width: 110px;
                height: 110px;
            }

            .joystick-knob {
                width: 46px;
                height: 46px;
            }

            .mobile-btn {
                width: 54px;
                height: 54px;
                font-size: 11px;
            }

        }

    `;

    document.head.appendChild(style);

}