// Tiny synthesized sounds for HUSHFALL (WebAudio, no audio files).
let ctx = null;

function ac() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
  }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

function blip(freqA, freqB, dur, type = 'sine', gain = 0.08, when = 0) {
  const a = ac();
  if (!a) return;
  const t0 = a.currentTime + when;
  const osc = a.createOscillator();
  const g = a.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freqA, t0);
  osc.frequency.exponentialRampToValueAtTime(Math.max(30, freqB), t0 + dur);
  g.gain.setValueAtTime(gain, t0);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(g).connect(a.destination);
  osc.start(t0);
  osc.stop(t0 + dur + 0.02);
}

export const sfx = {
  unlock() {
    // first user gesture: just warm up the context
    ac();
  },
  gem() {
    blip(1320, 1760, 0.12, 'triangle', 0.07);
    blip(1760, 2340, 0.14, 'triangle', 0.05, 0.06);
  },
  alarm() {
    blip(220, 110, 0.4, 'sawtooth', 0.1);
    blip(233, 116, 0.4, 'sawtooth', 0.08, 0.05);
  },
  clear() {
    blip(523, 523, 0.1, 'triangle', 0.07);
    blip(659, 659, 0.1, 'triangle', 0.07, 0.1);
    blip(784, 784, 0.16, 'triangle', 0.08, 0.2);
  },
  step() {
    blip(180, 120, 0.03, 'sine', 0.012);
  },
};
