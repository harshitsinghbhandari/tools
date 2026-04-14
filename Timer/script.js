const PRESETS = [300, 1500, 3600, 7200, 9000];
let totalSeconds = 300;
let remaining = 300;
let running = false;
let interval = null;
let doneFlag = false;
let pipWindow = null;

const display = document.getElementById('display');
const progress = document.getElementById('progress');
const statusLabel = document.getElementById('statusLabel');
const toggleBtn = document.getElementById('toggleBtn');
const toggleBtnLabel = document.getElementById('toggleBtnLabel');
const presetBtns = document.querySelectorAll('.preset');
const timerContainer = document.getElementById('timerContainer');
const pipOverlay = document.getElementById('pip-overlay');
const pipBtn = document.getElementById('popoutBtn');
const alarmSound = document.getElementById('alarmSound');

function fmt(s) {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
    return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
}

function updateDisplay() {
    display.textContent = fmt(remaining);
    const ratio = totalSeconds > 0 ? remaining / totalSeconds : 0;
    progress.style.transform = `scaleX(${ratio})`;
}

function setToggleState(state) {
    // state: 'ready' | 'running' | 'paused' | 'done'
    toggleBtn.className = 'btn';
    const dot = toggleBtn.querySelector('.dot');

    if (state === 'running') {
        toggleBtn.classList.add('btn-pause');
        dot.className = 'dot dot-run';
        toggleBtnLabel.textContent = 'Pause';
        statusLabel.textContent = 'running';
    } else if (state === 'paused') {
        toggleBtn.classList.add('btn-start');
        dot.className = 'dot';
        toggleBtnLabel.textContent = 'Resume';
        statusLabel.textContent = 'paused';
    } else if (state === 'done') {
        toggleBtn.classList.add('btn-reset');
        dot.className = 'dot';
        toggleBtn.style.pointerEvents = 'none';
        toggleBtnLabel.textContent = 'Done';
        statusLabel.textContent = 'done';
    } else {
        toggleBtn.classList.add('btn-start');
        dot.className = 'dot';
        toggleBtnLabel.textContent = 'Start';
        toggleBtn.style.pointerEvents = '';
        statusLabel.textContent = 'ready';
    }
}

function toggle() {
    if (doneFlag) return;
    if (running) {
        clearInterval(interval);
        running = false;
        setToggleState('paused');
    } else {
        running = true;
        setToggleState('running');
        interval = setInterval(tick, 1000);
    }
}

function tick() {
    if (remaining <= 0) {
        finish();
        return;
    }
    remaining--;
    updateDisplay();
    if (remaining <= 0) finish();
}

function finish() {
    clearInterval(interval);
    running = false;
    doneFlag = true;
    remaining = 0;
    updateDisplay();
    display.classList.add('done');
    setToggleState('done');
    alarmSound.play().catch(console.error);
    if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
}

function reset() {
    clearInterval(interval);
    running = false;
    doneFlag = false;
    remaining = totalSeconds;
    display.classList.remove('done');
    toggleBtn.style.pointerEvents = '';
    updateDisplay();
    setToggleState('ready');
}

function selectPreset(idx) {
    if (running) {
        clearInterval(interval);
        running = false;
    }
    doneFlag = false;
    totalSeconds = PRESETS[idx];
    remaining = totalSeconds;
    display.classList.remove('done');
    toggleBtn.style.pointerEvents = '';
    presetBtns.forEach((b, i) => b.classList.toggle('active', i === idx));
    updateDisplay();
    setToggleState('ready');
}

function toggleFocus() {
    document.body.classList.toggle('focus-mode');

    if (document.body.classList.contains('focus-mode')) {
        if (document.documentElement.requestFullscreen) {
            document.documentElement.requestFullscreen().catch(() => { });
        }
    } else {
        if (document.exitFullscreen && document.fullscreenElement) {
            document.exitFullscreen().catch(() => { });
        }
    }
}

async function togglePiP() {
    if (pipWindow) {
        pipWindow.close();
        return;
    }

    if (!('documentPictureInPicture' in window)) {
        alert('Document Picture-in-Picture is not supported in this browser. Try Chrome 116+');
        return;
    }

    try {
        // Open the PiP window
        pipWindow = await window.documentPictureInPicture.requestWindow({
            width: 320,
            height: 320,
        });

        // Copy styles
        [...document.styleSheets].forEach((styleSheet) => {
            try {
                const cssRules = [...styleSheet.cssRules].map((rule) => rule.cssText).join('');
                const style = document.createElement('style');
                style.textContent = cssRules;
                pipWindow.document.head.appendChild(style);
            } catch (e) {
                const link = document.createElement('link');
                if (styleSheet.href) {
                    link.rel = 'stylesheet';
                    link.type = styleSheet.type;
                    link.media = styleSheet.media;
                    link.href = styleSheet.href;
                    pipWindow.document.head.appendChild(link);
                }
            }
        });

        // Add extra PiP specific styles to handle resizing better
        const pipStyle = document.createElement('style');
        pipStyle.textContent = `
      body { padding: 0 !important; display: flex !important; align-items: center; justify-content: center; background: #000; }
      .timer-wrap { width: 100%; height: 100%; padding: 20px; }
      .timer { font-size: clamp(40px, 20vw, 120px); }
    `;
        pipWindow.document.head.appendChild(pipStyle);

        // Move timer container to PiP window
        pipWindow.document.body.append(timerContainer);
        pipOverlay.style.display = 'flex';
        pipBtn.style.color = 'var(--accent)';

        // Handle PiP window close
        pipWindow.addEventListener('pagehide', (event) => {
            pipWindow = null;
            document.getElementById('pip-container').append(timerContainer);
            pipOverlay.style.display = 'none';
            pipBtn.style.color = '';
        });

    } catch (err) {
        console.error('Failed to enter PiP:', err);
    }
}

// Tap display to exit focus mode
timerContainer.addEventListener('click', (e) => {
    if (document.body.classList.contains('focus-mode')) {
        toggleFocus();
    }
});

display.addEventListener('click', (e) => {
    if (running || doneFlag || document.body.classList.contains('focus-mode')) return;
    e.stopPropagation();
    display.contentEditable = true;
    display.focus();
    const range = document.createRange();
    range.selectNodeContents(display);
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);
});

display.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
        e.preventDefault();
        display.blur();
    }
});

display.addEventListener('blur', () => {
    display.contentEditable = false;
    const input = display.textContent.trim();
    const parts = input.split(':').map(Number);
    let seconds = 0;
    let valid = true;

    if (parts.some(isNaN)) {
        valid = false;
    } else if (parts.length === 1) {
        seconds = parts[0] * 60; // e.g. "5" -> 5 minutes
    } else if (parts.length === 2) {
        seconds = parts[0] * 60 + parts[1]; // e.g. "5:30" -> 5m 30s
    } else if (parts.length === 3) {
        seconds = parts[0] * 3600 + parts[1] * 60 + parts[2]; // e.g. "1:0:0" -> 1 hour
    } else {
        valid = false;
    }

    if (valid && seconds > 0) {
        totalSeconds = seconds;
        remaining = totalSeconds;
        presetBtns.forEach(b => b.classList.remove('active'));
    }

    updateDisplay();
});

presetBtns.forEach((btn, i) => {
    btn.addEventListener('click', () => selectPreset(i));
});

updateDisplay();
setToggleState('ready');
