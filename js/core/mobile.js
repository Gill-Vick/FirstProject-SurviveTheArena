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

    ensureViewportMeta();
    watchOrientationResize();

    injectMobileStyles();
    buildMobileDOM();
    initOrientationLock();

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
// Viewport / Resize
// =====================================
//
// The "page zooms in after rotating" symptom is almost
// always a missing or loose <meta viewport> tag - without
// one pinned to the device's actual width, mobile browsers
// recompute their zoom level relative to the *old* viewport
// once the page reflows into its new (landscape) dimensions.
// This creates/overwrites that tag so the CSS viewport always
// matches the device 1:1 and pinch-zoom can't creep in,
// regardless of orientation.

function ensureViewportMeta() {

    let meta = document.querySelector('meta[name="viewport"]');

    if (!meta) {

        meta = document.createElement("meta");
        meta.name = "viewport";
        document.head.appendChild(meta);

    }

    meta.content =
        "width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover";

}

// The existing window "resize" listener (in main.js) syncs
// canvas.width/height to window.innerWidth/innerHeight, but
// on many mobile browsers that fires a beat too early during
// a rotation - while the address bar / browser chrome is
// still animating away - so the canvas can grab a stale,
// pre-rotation size. Resync a moment later once things have
// settled, on top of whatever main.js already does.

function watchOrientationResize() {

    function resync() {

        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;

    }

    window.addEventListener("orientationchange", () => {

        setTimeout(resync, 300);

    });

}


//
// True programmatic orientation LOCKING is unreliable on the
// open web - it generally only works inside an installed
// PWA or a fullscreen context, and iOS Safari doesn't expose
// the Screen Orientation lock API at all. So this does two
// things:
//
//   1. Best-effort: try screen.orientation.lock("landscape")
//      after a user gesture. Wrapped so a failure/rejection
//      (the common case) is silently ignored.
//
//   2. Guaranteed: a full-screen "rotate your device" overlay
//      that shows up automatically (pure CSS, no JS polling
//      needed) any time the device is actually in portrait,
//      and hides itself the instant it's rotated to landscape.
//      This is the part that actually guarantees the game is
//      only played in landscape, regardless of what the lock
//      API does.

function initOrientationLock() {

    function tryLock() {

        if (

            screen.orientation &&
            typeof screen.orientation.lock === "function"

        ) {

            screen.orientation.lock("landscape").catch(() => {});

        }

    }

    tryLock();

    // Locking usually requires a user gesture - retry on the
    // first touch, once, in case the initial attempt above
    // was rejected for that reason.
    document.addEventListener("touchstart", tryLock, { once: true });

    buildRotateOverlay();

}

function buildRotateOverlay() {

    const overlay = document.createElement("div");
    overlay.id = "rotateOverlay";

    overlay.innerHTML = `
        <div class="rotate-icon">⤾</div>
        <div class="rotate-title">Rotate your device</div>
        <div class="rotate-subtitle">This game plays best in landscape</div>
    `;

    document.body.appendChild(overlay);

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

        #rotateOverlay {
            position: fixed;
            inset: 0;
            background: #0b0b0b;
            color: white;
            z-index: 3000;
            display: none;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            text-align: center;
            padding: 20px;
            pointer-events: auto;
        }

        /* Pure CSS - shows/hides itself automatically as the
           device is rotated, no JS polling needed. */
        @media (orientation: portrait) {

            #rotateOverlay {
                display: flex;
            }

        }

        #rotateOverlay .rotate-icon {
            font-size: 56px;
            margin-bottom: 16px;
            animation: rotateHint 1.6s ease-in-out infinite;
        }

        #rotateOverlay .rotate-title {
            font-size: 18px;
            font-weight: bold;
        }

        #rotateOverlay .rotate-subtitle {
            font-size: 14px;
            opacity: 0.7;
            margin-top: 6px;
        }

        @keyframes rotateHint {
            0%, 100% { transform: rotate(0deg); }
            50% { transform: rotate(90deg); }
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