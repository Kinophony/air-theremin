const canvas = document.getElementById('canvas');
const ctx2d = canvas.getContext('2d');
const vizCanvas = document.getElementById('viz-canvas');
const vizCtx = vizCanvas.getContext('2d');

let frameCount = 0;
let waveHistory = [];

function resizeCanvases() {
  const container = document.getElementById('camera-container');
  canvas.width = container.clientWidth;
  canvas.height = container.clientHeight;
  vizCanvas.width = container.clientWidth;
  vizCanvas.height = container.clientHeight;
}
window.addEventListener('resize', resizeCanvases);
resizeCanvases();

function drawViz() {
  vizCtx.clearRect(0, 0, vizCanvas.width, vizCanvas.height);
  frameCount++;

  if (!playing) return;

  const w = vizCanvas.width;
  const h = vizCanvas.height;
  const vol = smoothVol;

  if (vol > 0.02) {
    const pulse = 0.5 + 0.5 * Math.sin(frameCount * 0.1);
    const r = 60 + vol * 180 + pulse * 20;
    let cx = w * 0.5, cy = h * 0.5;

    if (rightHand) {
      const wrist = rightHand[0];
      cx = (1 - wrist.x) * w;
      cy = wrist.y * h;
    }

    const grad = vizCtx.createRadialGradient(cx, cy, 0, cx, cy, r);
    grad.addColorStop(0, `rgba(0,245,196,${vol * 0.25})`);
    grad.addColorStop(0.4, `rgba(0,245,196,${vol * 0.1})`);
    grad.addColorStop(1, 'rgba(0,245,196,0)');
    vizCtx.beginPath();
    vizCtx.arc(cx, cy, r, 0, Math.PI * 2);
    vizCtx.fillStyle = grad;
    vizCtx.fill();

    const wavePoints = 80;
    waveHistory.push(vol);
    if (waveHistory.length > wavePoints) waveHistory.shift();

    vizCtx.beginPath();
    vizCtx.strokeStyle = `rgba(0,245,196,${0.4 + vol * 0.5})`;
    vizCtx.lineWidth = 1.5;
    for (let i = 0; i < waveHistory.length; i++) {
      const x = (i / wavePoints) * w;
      const amplitude = waveHistory[i] * 60;
      const y = h / 2 + amplitude * Math.sin(i * 0.3 + frameCount * 0.05);
      i === 0 ? vizCtx.moveTo(x, y) : vizCtx.lineTo(x, y);
    }
    vizCtx.stroke();
  } else {
    waveHistory = [];
  }

  if (trailPoints.length > 1) {
    for (let i = 1; i < trailPoints.length; i++) {
      const t = i / trailPoints.length;
      const p = trailPoints[i];
      const pp = trailPoints[i - 1];
      vizCtx.beginPath();
      vizCtx.moveTo((1 - pp.x) * w, pp.y * h);
      vizCtx.lineTo((1 - p.x) * w, p.y * h);
      vizCtx.strokeStyle = `rgba(123,94,167,${t * 0.5})`;
      vizCtx.lineWidth = 2;
      vizCtx.stroke();
    }
  }
}

setInterval(drawViz, 16);

function updateDisplays(freq, vol) {
  if (freq) {
    document.getElementById('freq-display').textContent = Math.round(freq) + ' Hz';
    const note = freqToNoteName(freq);
    document.getElementById('note-display-header').textContent = note;
    const nd = document.getElementById('note-display');
    nd.textContent = note;
    nd.style.opacity = vol > 0.05 ? '0.85' : '0';
  } else {
    document.getElementById('freq-display').textContent = '-- Hz';
    document.getElementById('note-display-header').textContent = '--';
    document.getElementById('note-display').style.opacity = '0';
  }
}
