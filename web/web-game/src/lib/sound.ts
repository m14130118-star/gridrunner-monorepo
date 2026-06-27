let ctx: AudioContext | null = null;
let _muted = false;

export function setMuted(v: boolean) { _muted = v; }
export function isMuted() { return _muted; }

function getCtx(): AudioContext {
  if (!ctx) ctx = new AudioContext();
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

function playTone(freq: number, duration: number, type: OscillatorType = 'sine', volume = 0.08) {
  if (_muted) return;
  try {
    const c = getCtx();
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, c.currentTime);
    gain.gain.setValueAtTime(volume, c.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + duration);
    osc.connect(gain);
    gain.connect(c.destination);
    osc.start(c.currentTime);
    osc.stop(c.currentTime + duration);
  } catch {}
}

export function playClick() {
  playTone(800, 0.06, 'square', 0.04);
}

export function playSuccess() {
  playTone(523, 0.1, 'sine', 0.06);
  setTimeout(() => playTone(659, 0.1, 'sine', 0.06), 100);
  setTimeout(() => playTone(784, 0.15, 'sine', 0.06), 200);
}

export function playError() {
  playTone(200, 0.2, 'sawtooth', 0.05);
  setTimeout(() => playTone(150, 0.3, 'sawtooth', 0.05), 150);
}

export function playToggle() {
  playTone(600, 0.05, 'sine', 0.03);
  setTimeout(() => playTone(900, 0.05, 'sine', 0.03), 50);
}

export function playTripStart() {
  [440, 554, 659, 880].forEach((f, i) => {
    setTimeout(() => playTone(f, 0.12, 'sine', 0.06), i * 120);
  });
}

export function playCheckpoint() {
  playTone(660, 0.08, 'triangle', 0.05);
  setTimeout(() => playTone(880, 0.15, 'triangle', 0.05), 80);
}

// Auto-wire: plays click on .btn or [data-sound] elements
export function initSounds() {
  if (typeof document === 'undefined') return;
  document.addEventListener('click', (e) => {
    let el = (e.target as HTMLElement)?.closest('[data-sound], .btn, .theme-btn, .lang-btn, .mode-switch') as HTMLElement | null;
    if (!el) return;
    // Ignore clicks on links (navigation)
    if (el.tagName === 'A' && el.getAttribute('href')) return;
    const sound = el.getAttribute('data-sound');
    if (sound === 'success') playSuccess();
    else if (sound === 'error') playError();
    else if (sound === 'toggle') playToggle();
    else if (sound === 'trip-start') playTripStart();
    else if (sound === 'checkpoint') playCheckpoint();
    else if (sound === 'none') return;
    else playClick();
  });
}
