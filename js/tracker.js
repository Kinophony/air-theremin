const video = document.getElementById('video');

let rightHand = null;
let leftHand = null;
let trailPoints = [];

function onResults(results) {
  ctx2d.clearRect(0, 0, canvas.width, canvas.height);
  rightHand = null;
  leftHand = null;

  if (!results.multiHandLandmarks || results.multiHandLandmarks.length === 0) {
    if (playing && gainNode) {
      gainNode.gain.setTargetAtTime(0, audioCtx.currentTime, 0.15);
      smoothVol = 0;
    }
    updateDisplays(null, 0);
    return;
  }

  for (let i = 0; i < results.multiHandLandmarks.length; i++) {
    const hand = results.multiHandLandmarks[i];
    const label = results.multiHandedness[i].label;
    if (label === 'Left') rightHand = hand;
    else leftHand = hand;
  }

  for (let i = 0; i < results.multiHandLandmarks.length; i++) {
    const hand = results.multiHandLandmarks[i];
    const label = results.multiHandedness[i].label;
    const color = label === 'Left' ? '#00f5c4' : '#7b5ea7';

    for (const conn of window.HAND_CONNECTIONS || []) {
      const a = hand[conn[0]], b = hand[conn[1]];
      ctx2d.beginPath();
      ctx2d.moveTo((1 - a.x) * canvas.width, a.y * canvas.height);
      ctx2d.lineTo((1 - b.x) * canvas.width, b.y * canvas.height);
      ctx2d.strokeStyle = color + '88';
      ctx2d.lineWidth = 1.5;
      ctx2d.stroke();
    }

    for (const lm of hand) {
      const x = (1 - lm.x) * canvas.width;
      const y = lm.y * canvas.height;
      ctx2d.beginPath();
      ctx2d.arc(x, y, 4, 0, Math.PI * 2);
      ctx2d.fillStyle = color;
      ctx2d.fill();
    }
  }

  if (!playing || !audioCtx) return;

  if (rightHand) {
    const indexTip = rightHand[8];
    const freq = xToFreq(1 - indexTip.x);

    trailPoints.push({ x: indexTip.x, y: indexTip.y });
    if (trailPoints.length > 30) trailPoints.shift();

    const porta = portamentoMs / 1000;
    oscillator.frequency.setTargetAtTime(freq, audioCtx.currentTime, porta * 0.3);
    currentFreq = freq;
    updateDisplays(freq, smoothVol);
  } else {
    trailPoints = [];
  }

  if (leftHand) {
    const wrist = leftHand[0];
    const vol = Math.max(0, Math.min(1, 1 - wrist.y));
    smoothVol += (vol - smoothVol) * 0.15;
    gainNode.gain.setTargetAtTime(smoothVol * 0.7, audioCtx.currentTime, attackTime * 0.3);
    document.getElementById('vol-display').textContent = Math.round(smoothVol * 100) + '%';
  } else {
    smoothVol += (0 - smoothVol) * 0.1;
    gainNode.gain.setTargetAtTime(smoothVol * 0.7, audioCtx.currentTime, 0.05);
    document.getElementById('vol-display').textContent = Math.round(smoothVol * 100) + '%';
  }
}

async function initCamera() {
  const lb = document.getElementById('loading-bar');
  const lt = document.getElementById('loading-text');

  lb.style.width = '20%';
  lt.textContent = 'INITIALIZING MEDIAPIPE...';

  const hands = new Hands({
    locateFile: f => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${f}`
  });
  hands.setOptions({
    maxNumHands: 2,
    modelComplexity: 1,
    minDetectionConfidence: 0.7,
    minTrackingConfidence: 0.6,
  });
  hands.onResults(onResults);

  lb.style.width = '50%';
  lt.textContent = 'STARTING CAMERA...';

  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } }
    });
    video.srcObject = stream;
    await video.play();

    lb.style.width = '80%';
    lt.textContent = 'LOADING HAND MODEL...';

    const camera = new Camera(video, {
      onFrame: async () => { await hands.send({ image: video }); },
      width: 1280,
      height: 720,
    });
    await camera.start();

    lb.style.width = '100%';
    lt.textContent = 'READY';
    setTimeout(() => {
      const el = document.getElementById('loading');
      el.style.transition = 'opacity 0.5s';
      el.style.opacity = '0';
      setTimeout(() => el.style.display = 'none', 500);
    }, 400);

  } catch (e) {
    lt.textContent = 'CAMERA ERROR: ' + e.message;
    lb.style.background = '#ff6b6b';
    console.error(e);
  }
}

initCamera();

const camToggleBtn = document.getElementById('cam-toggle-btn');
let showCameraImage = true;

camToggleBtn.addEventListener('click', () => {
  showCameraImage = !showCameraImage;
  video.classList.toggle('cam-off', !showCameraImage);
  camToggleBtn.textContent = showCameraImage ? '📷 OFF' : '📷 ON';
  camToggleBtn.classList.toggle('active', !showCameraImage);
});
