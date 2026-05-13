const SCALES = {
  chromatic:  [0,1,2,3,4,5,6,7,8,9,10,11],
  major:      [0,2,4,5,7,9,11],
  minor:      [0,2,3,5,7,8,10],
  pentatonic: [0,2,4,7,9],
  blues:      [0,3,5,6,7,10],
  dorian:     [0,2,3,5,7,9,10],
};

const NOTE_NAMES = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];

let audioCtx = null;
let oscillator = null;
let gainNode = null;
let lfoNode = null;
let lfoGain = null;
let convolver = null;
let playing = false;
let currentWave = 'sine';
let currentScale = 'major';
let portamentoMs = 80;
let attackTime = 0.1;
let reverbAmount = 0.4;
let vibratoAmount = 0.2;
let baseOctave = 3;
let currentFreq = 440;
let smoothVol = 0;

function midiToFreq(midi) {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

function freqToNoteName(freq) {
  const midi = Math.round(69 + 12 * Math.log2(freq / 440));
  const note = NOTE_NAMES[midi % 12];
  const oct = Math.floor(midi / 12) - 1;
  return note + oct;
}

function getScaleNotes() {
  const scale = SCALES[currentScale];
  const notes = [];
  for (let o = baseOctave; o <= baseOctave + 3; o++) {
    for (const interval of scale) {
      notes.push(o * 12 + interval);
    }
  }
  return notes.sort((a, b) => a - b);
}

function xToFreq(x) {
  const notes = getScaleNotes();
  const idx = Math.floor(x * (notes.length - 1));
  const clamped = Math.max(0, Math.min(notes.length - 1, idx));
  return midiToFreq(notes[clamped]);
}

function createReverb(ctx) {
  const len = ctx.sampleRate * 2.5;
  const buf = ctx.createBuffer(2, len, ctx.sampleRate);
  for (let c = 0; c < 2; c++) {
    const d = buf.getChannelData(c);
    for (let i = 0; i < len; i++) {
      d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.5);
    }
  }
  const conv = ctx.createConvolver();
  conv.buffer = buf;
  return conv;
}

function initAudio() {
  if (audioCtx) return;
  audioCtx = new (window.AudioContext || window.webkitAudioContext)();

  gainNode = audioCtx.createGain();
  gainNode.gain.value = 0;

  convolver = createReverb(audioCtx);

  const dryGain = audioCtx.createGain();
  const wetGain = audioCtx.createGain();
  dryGain.gain.value = 1 - reverbAmount;
  wetGain.gain.value = reverbAmount;

  gainNode.connect(dryGain);
  gainNode.connect(convolver);
  convolver.connect(wetGain);
  dryGain.connect(audioCtx.destination);
  wetGain.connect(audioCtx.destination);

  oscillator = audioCtx.createOscillator();
  oscillator.type = currentWave;
  oscillator.frequency.value = 440;

  lfoNode = audioCtx.createOscillator();
  lfoNode.frequency.value = 5;
  lfoGain = audioCtx.createGain();
  lfoGain.gain.value = vibratoAmount * 15;
  lfoNode.connect(lfoGain);
  lfoGain.connect(oscillator.frequency);

  oscillator.connect(gainNode);
  oscillator.start();
  lfoNode.start();
}

function togglePlay() {
  const btn = document.getElementById('start-btn');
  if (!playing) {
    initAudio();
    if (audioCtx.state === 'suspended') audioCtx.resume();
    playing = true;
    btn.textContent = 'STOP';
    btn.classList.add('active');
    document.getElementById('overlay-message').style.display = 'none';
  } else {
    playing = false;
    if (gainNode) gainNode.gain.setTargetAtTime(0, audioCtx.currentTime, 0.1);
    btn.textContent = 'START';
    btn.classList.remove('active');
    document.getElementById('overlay-message').style.display = 'block';
  }
}

function setWave(type) {
  currentWave = type;
  if (oscillator) oscillator.type = type;
  document.querySelectorAll('.wave-btn').forEach(b => b.classList.remove('active'));
  event.target.classList.add('active');
}

function setScale(val) { currentScale = val; }

function updateReverb(val) {
  reverbAmount = val / 100;
  document.getElementById('reverb-val').textContent = val + '%';
}

function updateVibrato(val) {
  vibratoAmount = val / 100;
  if (lfoGain) lfoGain.gain.value = vibratoAmount * 20;
  document.getElementById('vibrato-val').textContent = val + '%';
}

function updateAttack(val) {
  attackTime = val / 100;
  document.getElementById('attack-val').textContent = (val / 100).toFixed(2) + 's';
}

function updatePortamento(val) {
  portamentoMs = parseInt(val);
  document.getElementById('porta-val').textContent = val + 'ms';
}

function updateOctave(val) {
  baseOctave = parseInt(val);
  document.getElementById('octave-val').textContent = 'C' + val + '–C' + (parseInt(val) + 3);
}
