const state = {
  text: 'متن خود را اینجا بنویسید',
  fontFamily: 'Vazirmatn',
  fontWeight: 700,
  fontSize: 96,
  color: '#df1760',
  align: 'center',
  x: 210,
  y: 240,
  scale: 1,
  rotation: 0,
  zoom: 1,
  frame: { name: 'Desktop', width: 1200, height: 700 },
  format: 'svg',
  background: 'transparent',
  backgroundColor: '#ffffff',
};

const history = [];
let historyIndex = -1;
let interaction = null;

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];

const els = {
  artboard: $('#artboard'),
  stage: $('#canvasStage'),
  textObject: $('#textObject'),
  textRender: $('#textRender'),
  textInput: $('#textInput'),
  textDialog: $('#textDialog'),
  frameDialog: $('#frameDialog'),
  frameGrid: $('#frameGrid'),
  framePill: $('#framePill'),
  textToolbar: $('#textToolbar'),
  exportPreview: $('#exportPreview'),
  optimizedSize: $('#optimizedSize'),
  objectStatus: $('#objectStatus'),
  inspector: $('#inspector'),
  downloadButton: $('#downloadButton'),
  svgSettings: $('#svgSettings'),
};

const frames = [
  { name: 'Desktop', width: 1200, height: 700 },
  { name: 'Instagram Story', width: 1080, height: 1920 },
  { name: 'Square', width: 1080, height: 1080 },
  { name: 'Landscape Video', width: 1920, height: 1080 },
  { name: 'Mobile', width: 390, height: 844 },
  { name: 'LinkedIn Post', width: 1200, height: 627 },
];

function snapshot() {
  return JSON.parse(JSON.stringify(state));
}

function commitHistory() {
  history.splice(historyIndex + 1);
  history.push(snapshot());
  historyIndex = history.length - 1;
  updateHistoryButtons();
}

function restoreHistory(index) {
  if (index < 0 || index >= history.length) return;
  Object.assign(state, JSON.parse(JSON.stringify(history[index])));
  historyIndex = index;
  render();
  updateHistoryButtons();
}

function updateHistoryButtons() {
  $('#undoButton').disabled = historyIndex <= 0;
  $('#redoButton').disabled = historyIndex >= history.length - 1;
}

function detectDirection(value) {
  const firstStrong = value.match(/[A-Za-z\u0600-\u06FF]/)?.[0];
  return firstStrong && /[\u0600-\u06FF]/.test(firstStrong) ? 'rtl' : 'ltr';
}

function fitArtboard() {
  const viewport = $('#canvasViewport').getBoundingClientRect();
  const xScale = Math.max(0.15, (viewport.width - 56) / state.frame.width);
  const yScale = Math.max(0.15, (viewport.height - 56) / state.frame.height);
  state.zoom = Math.min(1, xScale, yScale);
  renderZoom();
}

function renderZoom() {
  els.stage.style.transform = `scale(${state.zoom})`;
  $('#zoomLabel').textContent = `${Math.round(state.zoom * 100)}%`;
}

function buildSvg() {
  const escaped = state.text.replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' }[char]));
  const bg = state.background === 'transparent' ? '' : `<rect width="100%" height="100%" fill="${state.backgroundColor}"/>`;
  const anchor = state.align === 'center' ? 'middle' : state.align === 'right' ? 'end' : 'start';
  const x = state.x + (state.align === 'center' ? 390 : state.align === 'right' ? 780 : 0);
  const y = state.y + state.fontSize * 1.1;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${state.frame.width}" height="${state.frame.height}" viewBox="0 0 ${state.frame.width} ${state.frame.height}">
  ${bg}
  <g transform="rotate(${state.rotation} ${state.x + 390} ${state.y + 75}) scale(${state.scale})">
    <text x="${x}" y="${y}" direction="${detectDirection(state.text)}" text-anchor="${anchor}" font-family="${state.fontFamily}" font-size="${state.fontSize}" font-weight="${state.fontWeight}" fill="${state.color}">${escaped}</text>
  </g>
</svg>`;
}

function renderPreview() {
  const svg = buildSvg();
  els.exportPreview.textContent = svg;
  els.optimizedSize.textContent = `Estimated size: ${(new Blob([svg]).size / 1024).toFixed(2)} KB`;
  els.downloadButton.textContent = `Download ${state.format.toUpperCase()}`;
  els.svgSettings.hidden = state.format !== 'svg';
}

function render() {
  els.artboard.style.width = `${state.frame.width}px`;
  els.artboard.style.height = `${state.frame.height}px`;
  els.artboard.style.background = state.background === 'transparent' ? '#fff' : state.backgroundColor;
  els.framePill.textContent = `${state.frame.name} · ${state.frame.width} × ${state.frame.height}`;

  els.textRender.textContent = state.text;
  els.textRender.dir = detectDirection(state.text);
  els.textRender.style.fontFamily = state.fontFamily;
  els.textRender.style.fontWeight = state.fontWeight;
  els.textRender.style.fontSize = `${state.fontSize}px`;
  els.textRender.style.color = state.color;
  els.textRender.style.textAlign = state.align;

  els.textObject.style.left = `${state.x}px`;
  els.textObject.style.top = `${state.y}px`;
  els.textObject.style.transform = `rotate(${state.rotation}deg) scale(${state.scale})`;

  $('#fontFamily').value = state.fontFamily;
  $('#fontWeight').value = String(state.fontWeight);
  $('#fontSize').value = state.fontSize;
  $('#textColor').value = state.color;
  $('#backgroundColor').value = state.backgroundColor;
  $('#backgroundColor').disabled = state.background !== 'custom';
  $$('[data-align]').forEach((button) => button.classList.toggle('active', button.dataset.align === state.align));
  $$('[data-format]').forEach((button) => button.classList.toggle('active', button.dataset.format === state.format));
  $$('input[name="background"]').forEach((radio) => { radio.checked = radio.value === state.background; });

  els.objectStatus.textContent = `1 object selected · X ${Math.round(state.x)} · Y ${Math.round(state.y)} · Rotation ${Math.round(state.rotation)}° · Scale ${state.scale.toFixed(2)}`;
  renderZoom();
  renderPreview();
}

function openTextDialog() {
  els.textInput.value = state.text;
  els.textDialog.showModal();
  setTimeout(() => els.textInput.focus(), 30);
}

function pointerPosition(event) {
  const rect = els.artboard.getBoundingClientRect();
  return {
    x: (event.clientX - rect.left) / state.zoom,
    y: (event.clientY - rect.top) / state.zoom,
  };
}

function startInteraction(event) {
  const handle = event.target.dataset.handle;
  const point = pointerPosition(event);
  const rect = els.textObject.getBoundingClientRect();
  const artRect = els.artboard.getBoundingClientRect();
  const center = {
    x: ((rect.left + rect.width / 2) - artRect.left) / state.zoom,
    y: ((rect.top + rect.height / 2) - artRect.top) / state.zoom,
  };
  interaction = {
    type: handle || 'drag',
    start: point,
    initial: snapshot(),
    center,
    initialDistance: Math.hypot(point.x - center.x, point.y - center.y),
    initialAngle: Math.atan2(point.y - center.y, point.x - center.x),
  };
  event.preventDefault();
  els.textObject.setPointerCapture(event.pointerId);
}

function moveInteraction(event) {
  if (!interaction) return;
  const point = pointerPosition(event);
  if (interaction.type === 'drag') {
    state.x = interaction.initial.x + (point.x - interaction.start.x);
    state.y = interaction.initial.y + (point.y - interaction.start.y);
  } else if (interaction.type === 'rotate') {
    const angle = Math.atan2(point.y - interaction.center.y, point.x - interaction.center.x);
    state.rotation = interaction.initial.rotation + (angle - interaction.initialAngle) * 180 / Math.PI;
  } else {
    const distance = Math.hypot(point.x - interaction.center.x, point.y - interaction.center.y);
    state.scale = Math.min(4, Math.max(0.25, interaction.initial.scale * (distance / Math.max(1, interaction.initialDistance))));
  }
  render();
}

function endInteraction(event) {
  if (!interaction) return;
  interaction = null;
  try { els.textObject.releasePointerCapture(event.pointerId); } catch {}
  commitHistory();
}

async function downloadSvg() {
  const svg = buildSvg();
  const blob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
  downloadBlob(blob, 'free-font-story.svg');
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 500);
}

async function downloadRaster(format) {
  const svg = buildSvg();
  const svgBlob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(svgBlob);
  const image = new Image();
  image.onload = () => {
    const canvas = document.createElement('canvas');
    canvas.width = state.frame.width;
    canvas.height = state.frame.height;
    const context = canvas.getContext('2d');
    if (!context) return;
    if (format === 'jpeg' && state.background === 'transparent') {
      context.fillStyle = '#ffffff';
      context.fillRect(0, 0, canvas.width, canvas.height);
    }
    context.drawImage(image, 0, 0);
    canvas.toBlob((blob) => {
      if (blob) downloadBlob(blob, `free-font-story.${format === 'jpeg' ? 'jpg' : 'png'}`);
      URL.revokeObjectURL(url);
    }, format === 'jpeg' ? 'image/jpeg' : 'image/png', 0.94);
  };
  image.src = url;
}

function downloadCurrent() {
  if (state.format === 'svg') return downloadSvg();
  return downloadRaster(state.format);
}

frames.forEach((frame) => {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'frame-option';
  button.innerHTML = `<strong>${frame.name}</strong><span>${frame.width} × ${frame.height}</span>`;
  button.addEventListener('click', () => {
    state.frame = { ...frame };
    state.x = Math.max(20, (frame.width - 780) / 2);
    state.y = Math.max(20, (frame.height - 150) / 2);
    els.frameDialog.close();
    fitArtboard();
    commitHistory();
    render();
  });
  els.frameGrid.append(button);
});

els.textObject.addEventListener('pointerdown', startInteraction);
els.textObject.addEventListener('pointermove', moveInteraction);
els.textObject.addEventListener('pointerup', endInteraction);
els.textObject.addEventListener('pointercancel', endInteraction);
els.textObject.addEventListener('dblclick', openTextDialog);

$('#editTextButton').addEventListener('click', openTextDialog);
$('#applyTextButton').addEventListener('click', () => {
  state.text = els.textInput.value.trim() || 'Type something';
  commitHistory();
  render();
});

$('#fontFamily').addEventListener('change', (event) => { state.fontFamily = event.target.value; commitHistory(); render(); });
$('#fontWeight').addEventListener('change', (event) => { state.fontWeight = Number(event.target.value); commitHistory(); render(); });
$('#fontSize').addEventListener('change', (event) => { state.fontSize = Math.min(300, Math.max(12, Number(event.target.value) || 96)); commitHistory(); render(); });
$('#textColor').addEventListener('input', (event) => { state.color = event.target.value; render(); });
$('#textColor').addEventListener('change', commitHistory);
$$('[data-align]').forEach((button) => button.addEventListener('click', () => { state.align = button.dataset.align; commitHistory(); render(); }));
$$('[data-format]').forEach((button) => button.addEventListener('click', () => { state.format = button.dataset.format; render(); }));
$$('input[name="background"]').forEach((radio) => radio.addEventListener('change', () => { state.background = radio.value; commitHistory(); render(); }));
$('#backgroundColor').addEventListener('input', (event) => { state.backgroundColor = event.target.value; render(); });
$('#backgroundColor').addEventListener('change', commitHistory);

$('#frameButton').addEventListener('click', () => els.frameDialog.showModal());
$$('[data-tool="frame"]').forEach((button) => button.addEventListener('click', () => els.frameDialog.showModal()));
$('#exportButton').addEventListener('click', () => {
  if (window.matchMedia('(max-width: 1100px)').matches) els.inspector.classList.toggle('open');
  else downloadCurrent();
});
$('#downloadButton').addEventListener('click', downloadCurrent);
$('#zoomIn').addEventListener('click', () => { state.zoom = Math.min(2, state.zoom + .1); renderZoom(); });
$('#zoomOut').addEventListener('click', () => { state.zoom = Math.max(.15, state.zoom - .1); renderZoom(); });
$('#fitButton').addEventListener('click', fitArtboard);
$('#undoButton').addEventListener('click', () => restoreHistory(historyIndex - 1));
$('#redoButton').addEventListener('click', () => restoreHistory(historyIndex + 1));
$('#resetButton').addEventListener('click', () => {
  Object.assign(state, {
    text: 'متن خود را اینجا بنویسید', fontFamily: 'Vazirmatn', fontWeight: 700, fontSize: 96,
    color: '#df1760', align: 'center', x: 210, y: 240, scale: 1, rotation: 0,
    frame: { name: 'Desktop', width: 1200, height: 700 }, format: 'svg', background: 'transparent', backgroundColor: '#ffffff',
  });
  fitArtboard();
  commitHistory();
  render();
});

window.addEventListener('resize', () => { if (history.length === 0) fitArtboard(); });
window.addEventListener('keydown', (event) => {
  const modifier = event.metaKey || event.ctrlKey;
  if (modifier && event.key.toLowerCase() === 'z') {
    event.preventDefault();
    restoreHistory(historyIndex + (event.shiftKey ? 1 : -1));
  }
  if (event.key === 'Enter' && event.target === els.textObject) openTextDialog();
});

commitHistory();
requestAnimationFrame(() => { fitArtboard(); render(); });
