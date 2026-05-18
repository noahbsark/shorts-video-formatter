const els = {
  fileInput: document.querySelector('#fileInput'),
  fileName: document.querySelector('#fileName'),
  formatSelect: document.querySelector('#formatSelect'),
  qualitySelect: document.querySelector('#qualitySelect'),
  fitSelect: document.querySelector('#fitSelect'),
  backgroundSelect: document.querySelector('#backgroundSelect'),
  startRange: document.querySelector('#startRange'),
  endRange: document.querySelector('#endRange'),
  startLabel: document.querySelector('#startLabel'),
  endLabel: document.querySelector('#endLabel'),
  fpsSelect: document.querySelector('#fpsSelect'),
  bitrateSelect: document.querySelector('#bitrateSelect'),
  playPreviewBtn: document.querySelector('#playPreviewBtn'),
  exportBtn: document.querySelector('#exportBtn'),
  snapshotBtn: document.querySelector('#snapshotBtn'),
  progressFill: document.querySelector('#progressFill'),
  statusText: document.querySelector('#statusText'),
  downloadLink: document.querySelector('#downloadLink'),
  canvasInfo: document.querySelector('#canvasInfo'),
  canvas: document.querySelector('#previewCanvas'),
  video: document.querySelector('#sourceVideo')
};

const ctx = els.canvas.getContext('2d', { alpha: false });
let sourceUrl = null;
let animationId = null;
let rendering = false;

const presets = {
  shorts: { ratio: 9 / 16, label: 'vertical canvas' },
  square: { ratio: 1, label: 'square canvas' },
  landscape: { ratio: 16 / 9, label: 'landscape canvas' }
};

function seconds(value) {
  return `${Number(value || 0).toFixed(1)}s`;
}

function setStatus(message, progress = null) {
  els.statusText.textContent = message;
  if (progress !== null) els.progressFill.style.width = `${Math.max(0, Math.min(100, progress))}%`;
}

function getOutputSize() {
  const base = Number(els.qualitySelect.value);
  const { ratio } = presets[els.formatSelect.value];
  if (ratio < 1) return { width: Math.round(base * ratio), height: base };
  if (ratio === 1) return { width: base, height: base };
  return { width: base, height: Math.round(base / ratio) };
}

function applyCanvasSize() {
  const { width, height } = getOutputSize();
  els.canvas.width = width;
  els.canvas.height = height;
  els.canvas.style.aspectRatio = `${width} / ${height}`;
  els.canvasInfo.textContent = `${width} × ${height} ${presets[els.formatSelect.value].label}`;
  drawFrame();
}

function drawImageFit(image, dx, dy, dw, dh, mode = 'cover') {
  const sw = image.videoWidth || image.width;
  const sh = image.videoHeight || image.height;
  if (!sw || !sh) return;
  const scale = mode === 'cover' ? Math.max(dw / sw, dh / sh) : Math.min(dw / sw, dh / sh);
  const w = sw * scale;
  const h = sh * scale;
  const x = dx + (dw - w) / 2;
  const y = dy + (dh - h) / 2;
  ctx.drawImage(image, x, y, w, h);
}

function drawBackground() {
  const bg = els.backgroundSelect.value;
  const { width, height } = els.canvas;
  if (bg === 'dark') {
    ctx.fillStyle = '#08090f';
    ctx.fillRect(0, 0, width, height);
    return;
  }
  if (bg === 'light') {
    ctx.fillStyle = '#f4f4f5';
    ctx.fillRect(0, 0, width, height);
    return;
  }
  ctx.save();
  ctx.filter = 'blur(36px) brightness(0.72) saturate(1.15)';
  drawImageFit(els.video, -80, -80, width + 160, height + 160, 'cover');
  ctx.restore();
  ctx.fillStyle = 'rgba(0,0,0,0.18)';
  ctx.fillRect(0, 0, width, height);
}

function drawFrame() {
  const { width, height } = els.canvas;
  ctx.clearRect(0, 0, width, height);
  if (!els.video.videoWidth) {
    ctx.fillStyle = '#050505';
    ctx.fillRect(0, 0, width, height);
    ctx.fillStyle = '#b9bfd6';
    ctx.font = `${Math.max(18, width * 0.035)}px system-ui`;
    ctx.textAlign = 'center';
    ctx.fillText('Choose a video to preview', width / 2, height / 2);
    return;
  }
  drawBackground();
  const fit = els.fitSelect.value;
  drawImageFit(els.video, 0, 0, width, height, fit);
}

function startPreviewLoop() {
  cancelAnimationFrame(animationId);
  const loop = () => {
    drawFrame();
    animationId = requestAnimationFrame(loop);
  };
  loop();
}

function stopPreviewLoop() {
  cancelAnimationFrame(animationId);
  animationId = null;
}

function syncRangeLabels() {
  let start = Number(els.startRange.value);
  let end = Number(els.endRange.value);
  if (end <= start) {
    end = Math.min(Number(els.startRange.max), start + 0.1);
    els.endRange.value = end;
  }
  els.startLabel.textContent = seconds(start);
  els.endLabel.textContent = seconds(end);
}

function chooseMimeType() {
  const candidates = [
    'video/mp4;codecs=h264,aac',
    'video/mp4',
    'video/webm;codecs=vp9,opus',
    'video/webm;codecs=vp8,opus',
    'video/webm'
  ];
  return candidates.find(type => window.MediaRecorder && MediaRecorder.isTypeSupported(type)) || '';
}

async function loadFile(file) {
  if (!file) return;
  if (sourceUrl) URL.revokeObjectURL(sourceUrl);
  sourceUrl = URL.createObjectURL(file);
  els.video.src = sourceUrl;
  els.video.muted = false;
  els.video.volume = 1;
  els.fileName.textContent = file.name;
  els.downloadLink.classList.add('hidden');
  setStatus('Loading video…', 0);
  await new Promise((resolve, reject) => {
    els.video.onloadedmetadata = resolve;
    els.video.onerror = () => reject(new Error('Could not load this video file.'));
  });
  const duration = Math.max(0, els.video.duration || 0);
  for (const range of [els.startRange, els.endRange]) {
    range.max = duration.toFixed(1);
    range.step = '0.1';
  }
  els.startRange.value = '0';
  els.endRange.value = duration.toFixed(1);
  syncRangeLabels();
  applyCanvasSize();
  els.playPreviewBtn.disabled = false;
  els.exportBtn.disabled = false;
  els.snapshotBtn.disabled = false;
  setStatus(`Ready. Source: ${Math.round(els.video.videoWidth)} × ${Math.round(els.video.videoHeight)}, ${seconds(duration)}.`, 0);
}

async function playPreview() {
  if (!els.video.src) return;
  els.video.currentTime = Number(els.startRange.value);
  startPreviewLoop();
  await els.video.play();
  const end = Number(els.endRange.value);
  const stopAtEnd = () => {
    if (els.video.currentTime >= end || els.video.ended) {
      els.video.pause();
      stopPreviewLoop();
      els.video.removeEventListener('timeupdate', stopAtEnd);
      drawFrame();
    }
  };
  els.video.addEventListener('timeupdate', stopAtEnd);
}

function saveThumbnail() {
  const link = document.createElement('a');
  link.download = 'short-video-thumbnail.png';
  link.href = els.canvas.toDataURL('image/png');
  link.click();
}

async function exportVideo() {
  if (rendering || !els.video.src) return;
  rendering = true;
  els.exportBtn.disabled = true;
  els.playPreviewBtn.disabled = true;
  els.downloadLink.classList.add('hidden');
  setStatus('Preparing export…', 0);

  const start = Number(els.startRange.value);
  const end = Number(els.endRange.value);
  const duration = Math.max(0.1, end - start);
  const fpsValue = els.fpsSelect.value;
  const bitrateValue = els.bitrateSelect.value;
  const fps = fpsValue === 'auto' ? null : Number(fpsValue);
  const bitrate = bitrateValue === 'auto' ? null : Number(bitrateValue);
  const mimeType = chooseMimeType();

  if (!window.MediaRecorder || !mimeType) {
    setStatus('Your browser does not support MediaRecorder video export. Try Chrome or Edge.', 0);
    rendering = false;
    els.exportBtn.disabled = false;
    els.playPreviewBtn.disabled = false;
    return;
  }

  try {
    const canvasStream = fps ? els.canvas.captureStream(fps) : els.canvas.captureStream();
    const mixedStream = new MediaStream(canvasStream.getVideoTracks());
    if (typeof els.video.captureStream === 'function') {
      const videoStream = els.video.captureStream();
      videoStream.getAudioTracks().forEach(track => mixedStream.addTrack(track));
    }

    const chunks = [];
    const recorderOptions = { mimeType };
    if (bitrate) recorderOptions.videoBitsPerSecond = bitrate;
    const recorder = new MediaRecorder(mixedStream, recorderOptions);
    recorder.ondataavailable = event => {
      if (event.data && event.data.size) chunks.push(event.data);
    };

    const done = new Promise(resolve => {
      recorder.onstop = resolve;
    });

    els.video.currentTime = start;
    await new Promise(resolve => { els.video.onseeked = resolve; });
    startPreviewLoop();
    recorder.start(1000);
    await els.video.play();

    const startedAt = performance.now();
    await new Promise(resolve => {
      const tick = () => {
        const elapsedByVideo = Math.max(0, els.video.currentTime - start);
        const elapsedByClock = (performance.now() - startedAt) / 1000;
        const progress = Math.min(100, Math.max(elapsedByVideo, elapsedByClock) / duration * 100);
        setStatus(`Exporting… ${Math.round(progress)}%`, progress);
        if (els.video.currentTime >= end || els.video.ended || elapsedByClock >= duration + 0.4) {
          resolve();
        } else {
          requestAnimationFrame(tick);
        }
      };
      tick();
    });

    els.video.pause();
    stopPreviewLoop();
    drawFrame();
    if (recorder.state !== 'inactive') recorder.stop();
    await done;

    const extension = mimeType.includes('mp4') ? 'mp4' : 'webm';
    const blob = new Blob(chunks, { type: mimeType });
    const url = URL.createObjectURL(blob);
    els.downloadLink.href = url;
    els.downloadLink.download = `formatted-short-video.${extension}`;
    els.downloadLink.textContent = `Download formatted video (${extension.toUpperCase()}, ${(blob.size / 1024 / 1024).toFixed(1)} MB)`;
    els.downloadLink.classList.remove('hidden');
    setStatus('Export complete.', 100);
  } catch (error) {
    console.error(error);
    setStatus(`Export failed: ${error.message}`, 0);
  } finally {
    rendering = false;
    els.exportBtn.disabled = false;
    els.playPreviewBtn.disabled = false;
  }
}

els.fileInput.addEventListener('change', event => loadFile(event.target.files?.[0]).catch(err => setStatus(err.message, 0)));
els.formatSelect.addEventListener('change', applyCanvasSize);
els.qualitySelect.addEventListener('change', applyCanvasSize);
els.fitSelect.addEventListener('change', drawFrame);
els.backgroundSelect.addEventListener('change', drawFrame);
els.startRange.addEventListener('input', () => { syncRangeLabels(); if (!els.video.paused) return; els.video.currentTime = Number(els.startRange.value); });
els.endRange.addEventListener('input', syncRangeLabels);
els.playPreviewBtn.addEventListener('click', playPreview);
els.exportBtn.addEventListener('click', exportVideo);
els.snapshotBtn.addEventListener('click', saveThumbnail);
els.video.addEventListener('seeked', drawFrame);
els.video.addEventListener('pause', () => { if (!rendering) stopPreviewLoop(); });
applyCanvasSize();
drawFrame();
