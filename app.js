const STORAGE_KEY = 'free-font-story:project:v1';

let uidCounter = 0;
function uid() {
  uidCounter += 1;
  return `layer-${Date.now().toString(36)}-${uidCounter}`;
}

function createTextLayer(overrides = {}) {
  return {
    id: uid(),
    type: 'text',
    name: 'Text layer',
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
    visible: true,
    ...overrides,
  };
}

function defaultState() {
  const layer = createTextLayer({ name: 'Text 1' });
  return {
    layers: [layer],
    selectedLayerId: layer.id,
    frame: { name: 'Desktop', width: 1200, height: 700 },
    zoom: 1,
    format: 'svg',
    background: { type: 'transparent', color: '#ffffff', image: null, fit: 'cover' },
  };
}

const state = loadFromStorage() || defaultState();

const history = [];
let historyIndex = -1;
let interaction = null;
let saveTimer = null;

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];

const els = {
  artboard: $('#artboard'),
  stage: $('#canvasStage'),
  layersRoot: $('#layersRoot'),
  bgImageLayer: $('#bgImageLayer'),
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
  layersList: $('#layersList'),
  addLayerButton: $('#addLayerButton'),
  backgroundColor: $('#backgroundColor'),
  bgImageControls: $('#bgImageControls'),
  bgImageInput: $('#bgImageInput'),
  bgImagePreview: $('#bgImagePreview'),
  bgImagePreviewImg: $('#bgImagePreviewImg'),
  removeBgImageButton: $('#removeBgImageButton'),
  bgFit: $('#bgFit'),
  saveStatus: $('#saveStatus'),
};

const layerElements = new Map();

const frames = [
  { name: 'Desktop', width: 1200, height: 700 },
  { name: 'Instagram Story', width: 1080, height: 1920 },
  { name: 'Square', width: 1080, height: 1080 },
  { name: 'Landscape Video', width: 1920, height: 1080 },
  { name: 'Mobile', width: 390, height: 844 },
  { name: 'LinkedIn Post', width: 1200, height: 627 },
];

function escapeMarkup(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' }[char]));
}

function snapshot() {
  return JSON.parse(JSON.stringify(state));
}

function loadFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || !Array.isArray(parsed.layers)) return null;
    return parsed;
  } catch {
    return null;
  }
}

function saveToStorage() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    setSaveStatus(`Saved locally · ${new Date().toLocaleTimeString()}`);
  } catch {
    setSaveStatus('Local save failed (storage full)');
  }
}

function scheduleSave() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(saveToStorage, 300);
}

function setSaveStatus(text) {
  if (els.saveStatus) els.saveStatus.textContent = text;
}

function commitHistory() {
  history.splice(historyIndex + 1);
  history.push(snapshot());
  historyIndex = history.length - 1;
  updateHistoryButtons();
  scheduleSave();
}

function restoreHistory(index) {
  if (index < 0 || index >= history.length) return;
  Object.assign(state, JSON.parse(JSON.stringify(history[index])));
  historyIndex = index;
  render();
  updateHistoryButtons();
  scheduleSave();
}

function updateHistoryButtons() {
  $('#undoButton').disabled = historyIndex <= 0;
  $('#redoButton').disabled = historyIndex >= history.length - 1;
}

function detectDirection(value) {
  const firstStrong = value.match(/[A-Za-z؀-ۿ]/)?.[0];
  return firstStrong && /[؀-ۿ]/.test(firstStrong) ? 'rtl' : 'ltr';
}

function getLayer(id) {
  return state.layers.find((layer) => layer.id === id) || null;
}

function getSelectedLayer() {
  return state.selectedLayerId ? getLayer(state.selectedLayerId) : null;
}

function selectLayer(id) {
  if (state.selectedLayerId === id) return;
  state.selectedLayerId = id;
  render();
}

function withSelectedLayer(mutate, { commit = true } = {}) {
  const layer = getSelectedLayer();
  if (!layer) return;
  mutate(layer);
  if (commit) commitHistory();
  render();
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

function buildBackgroundMarkup() {
  const bg = state.background;
  if (bg.type === 'color') return `<rect width="100%" height="100%" fill="${bg.color}"/>`;
  if (bg.type === 'image' && bg.image) {
    const preserveAspectRatio = bg.fit === 'contain' ? 'xMidYMid meet' : bg.fit === 'stretch' ? 'none' : 'xMidYMid slice';
    return `<image href="${bg.image}" x="0" y="0" width="${state.frame.width}" height="${state.frame.height}" preserveAspectRatio="${preserveAspectRatio}"/>`;
  }
  return '';
}

function layerToSvg(layer) {
  const escaped = escapeMarkup(layer.text);
  const anchor = layer.align === 'center' ? 'middle' : layer.align === 'right' ? 'end' : 'start';
  const x = layer.x + (layer.align === 'center' ? 390 : layer.align === 'right' ? 780 : 0);
  const y = layer.y + layer.fontSize * 1.1;
  return `<g transform="rotate(${layer.rotation} ${layer.x + 390} ${layer.y + 75}) scale(${layer.scale})">
    <text x="${x}" y="${y}" direction="${detectDirection(layer.text)}" text-anchor="${anchor}" font-family="${layer.fontFamily}" font-size="${layer.fontSize}" font-weight="${layer.fontWeight}" fill="${layer.color}">${escaped}</text>
  </g>`;
}

function buildSvg() {
  const bgMarkup = buildBackgroundMarkup();
  const layersMarkup = state.layers.filter((layer) => layer.visible).map(layerToSvg).join('\n  ');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${state.frame.width}" height="${state.frame.height}" viewBox="0 0 ${state.frame.width} ${state.frame.height}">
  ${bgMarkup}
  ${layersMarkup}
</svg>`;
}

function renderPreview() {
  const svg = buildSvg();
  els.exportPreview.textContent = svg;
  els.optimizedSize.textContent = `Estimated size: ${(new Blob([svg]).size / 1024).toFixed(2)} KB`;
  els.downloadButton.textContent = `Download ${state.format.toUpperCase()}`;
  els.svgSettings.hidden = state.format !== 'svg';
}

function renderBackground() {
  const bg = state.background;
  els.artboard.dataset.bg = bg.type;
  els.artboard.style.background = bg.type === 'color' ? bg.color : '';

  els.bgImageLayer.style.backgroundImage = bg.type === 'image' && bg.image ? `url("${bg.image}")` : 'none';
  els.bgImageLayer.style.backgroundSize = bg.fit === 'stretch' ? '100% 100%' : bg.fit;

  $$('#bgTypeSwitch [data-bg]').forEach((button) => button.classList.toggle('active', button.dataset.bg === bg.type));
  els.backgroundColor.value = bg.color;
  els.backgroundColor.disabled = bg.type !== 'color';
  els.bgImageControls.hidden = bg.type !== 'image';
  els.bgFit.value = bg.fit;
  els.bgImagePreview.hidden = !bg.image;
  if (bg.image) els.bgImagePreviewImg.src = bg.image;
}

function ensureLayerElements() {
  const ids = new Set(state.layers.map((layer) => layer.id));

  for (const [id, entry] of layerElements) {
    if (!ids.has(id)) {
      entry.root.remove();
      layerElements.delete(id);
    }
  }

  state.layers.forEach((layer) => {
    if (layerElements.has(layer.id)) return;
    const root = document.createElement('div');
    root.className = 'text-object';
    root.dataset.layerId = layer.id;
    root.tabIndex = 0;
    root.setAttribute('aria-label', 'Editable text layer');
    root.innerHTML = `
      <div class="selection-box">
        <span class="handle nw" data-handle="nw"></span>
        <span class="handle ne" data-handle="ne"></span>
        <span class="handle sw" data-handle="sw"></span>
        <span class="handle se" data-handle="se"></span>
        <span class="rotate-handle" data-handle="rotate">↻</span>
      </div>
      <div class="text-render"></div>`;
    const textRender = root.querySelector('.text-render');

    root.addEventListener('pointerdown', (event) => startInteraction(event, layer.id));
    root.addEventListener('pointermove', moveInteraction);
    root.addEventListener('pointerup', endInteraction);
    root.addEventListener('pointercancel', endInteraction);
    root.addEventListener('dblclick', () => {
      selectLayer(layer.id);
      openTextDialog();
    });

    layerElements.set(layer.id, { root, textRender });
  });

  state.layers.forEach((layer) => {
    els.layersRoot.append(layerElements.get(layer.id).root);
  });
}

function renderLayers() {
  ensureLayerElements();

  state.layers.forEach((layer) => {
    const { root, textRender } = layerElements.get(layer.id);
    root.classList.toggle('selected', layer.id === state.selectedLayerId);
    root.style.display = layer.visible ? '' : 'none';
    root.style.left = `${layer.x}px`;
    root.style.top = `${layer.y}px`;
    root.style.transform = `rotate(${layer.rotation}deg) scale(${layer.scale})`;

    textRender.textContent = layer.text;
    textRender.dir = detectDirection(layer.text);
    textRender.style.fontFamily = layer.fontFamily;
    textRender.style.fontWeight = layer.fontWeight;
    textRender.style.fontSize = `${layer.fontSize}px`;
    textRender.style.color = layer.color;
    textRender.style.textAlign = layer.align;
  });
}

function renderLayersPanel() {
  els.layersList.innerHTML = '';
  if (state.layers.length === 0) {
    const empty = document.createElement('p');
    empty.className = 'empty-hint';
    empty.textContent = 'No layers yet. Add a text layer to get started.';
    els.layersList.append(empty);
    return;
  }

  [...state.layers].reverse().forEach((layer) => {
    const row = document.createElement('div');
    row.className = `layer-row${layer.id === state.selectedLayerId ? ' active' : ''}`;
    row.innerHTML = `
      <button class="layer-visibility" data-action="toggle" title="${layer.visible ? 'Hide layer' : 'Show layer'}">${layer.visible ? '◉' : '○'}</button>
      <span class="layer-info">
        <span class="layer-name">${escapeMarkup(layer.name || 'Text layer')}</span>
        <span class="layer-preview">${escapeMarkup(layer.text.slice(0, 28))}</span>
      </span>
      <span class="layer-actions">
        <button data-action="forward" title="Bring forward">↑</button>
        <button data-action="backward" title="Send backward">↓</button>
        <button data-action="duplicate" title="Duplicate">⧉</button>
        <button data-action="delete" title="Delete">🗑</button>
      </span>`;
    row.addEventListener('click', (event) => {
      const action = event.target.closest('[data-action]')?.dataset.action;
      if (!action) {
        selectLayer(layer.id);
        return;
      }
      event.stopPropagation();
      handleLayerAction(layer.id, action);
    });
    els.layersList.append(row);
  });
}

function handleLayerAction(id, action) {
  const index = state.layers.findIndex((layer) => layer.id === id);
  if (index === -1) return;

  if (action === 'toggle') {
    state.layers[index].visible = !state.layers[index].visible;
  } else if (action === 'forward' && index < state.layers.length - 1) {
    [state.layers[index], state.layers[index + 1]] = [state.layers[index + 1], state.layers[index]];
  } else if (action === 'backward' && index > 0) {
    [state.layers[index], state.layers[index - 1]] = [state.layers[index - 1], state.layers[index]];
  } else if (action === 'duplicate') {
    const source = state.layers[index];
    const copy = { ...source, id: uid(), name: `${source.name} copy`, x: source.x + 24, y: source.y + 24 };
    state.layers.splice(index + 1, 0, copy);
    state.selectedLayerId = copy.id;
  } else if (action === 'delete') {
    state.layers.splice(index, 1);
    if (state.selectedLayerId === id) {
      state.selectedLayerId = state.layers.length ? state.layers[Math.max(0, index - 1)].id : null;
    }
  } else {
    return;
  }

  commitHistory();
  render();
}

function renderToolbar() {
  const layer = getSelectedLayer();
  els.textToolbar.style.visibility = layer ? 'visible' : 'hidden';
  if (!layer) return;
  $('#fontFamily').value = layer.fontFamily;
  $('#fontWeight').value = String(layer.fontWeight);
  $('#fontSize').value = layer.fontSize;
  $('#textColor').value = layer.color;
  $$('[data-align]').forEach((button) => button.classList.toggle('active', button.dataset.align === layer.align));
}

function renderStatus() {
  const layer = getSelectedLayer();
  const count = `${state.layers.length} layer${state.layers.length === 1 ? '' : 's'}`;
  els.objectStatus.textContent = layer
    ? `${count} · Selected "${layer.name}" · X ${Math.round(layer.x)} · Y ${Math.round(layer.y)} · Rotation ${Math.round(layer.rotation)}° · Scale ${layer.scale.toFixed(2)}`
    : `${count} · No layer selected`;
}

function render() {
  els.artboard.style.width = `${state.frame.width}px`;
  els.artboard.style.height = `${state.frame.height}px`;
  els.framePill.textContent = `${state.frame.name} · ${state.frame.width} × ${state.frame.height}`;

  renderBackground();
  renderLayers();
  renderLayersPanel();
  renderToolbar();
  renderStatus();
  $$('[data-format]').forEach((button) => button.classList.toggle('active', button.dataset.format === state.format));

  renderZoom();
  renderPreview();
}

function openTextDialog() {
  const layer = getSelectedLayer();
  if (!layer) return;
  els.textInput.value = layer.text;
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

function startInteraction(event, layerId) {
  const layer = getLayer(layerId);
  if (!layer) return;
  if (state.selectedLayerId !== layerId) {
    state.selectedLayerId = layerId;
    render();
  }

  const handle = event.target.dataset.handle;
  const point = pointerPosition(event);
  const rootEl = layerElements.get(layerId).root;
  const rect = rootEl.getBoundingClientRect();
  const artRect = els.artboard.getBoundingClientRect();
  const center = {
    x: ((rect.left + rect.width / 2) - artRect.left) / state.zoom,
    y: ((rect.top + rect.height / 2) - artRect.top) / state.zoom,
  };
  interaction = {
    layerId,
    type: handle || 'drag',
    start: point,
    initial: { ...layer },
    center,
    initialDistance: Math.hypot(point.x - center.x, point.y - center.y),
    initialAngle: Math.atan2(point.y - center.y, point.x - center.x),
  };
  event.preventDefault();
  rootEl.setPointerCapture(event.pointerId);
}

function moveInteraction(event) {
  if (!interaction) return;
  const layer = getLayer(interaction.layerId);
  if (!layer) return;
  const point = pointerPosition(event);
  if (interaction.type === 'drag') {
    layer.x = interaction.initial.x + (point.x - interaction.start.x);
    layer.y = interaction.initial.y + (point.y - interaction.start.y);
  } else if (interaction.type === 'rotate') {
    const angle = Math.atan2(point.y - interaction.center.y, point.x - interaction.center.x);
    layer.rotation = interaction.initial.rotation + (angle - interaction.initialAngle) * 180 / Math.PI;
  } else {
    const distance = Math.hypot(point.x - interaction.center.x, point.y - interaction.center.y);
    layer.scale = Math.min(4, Math.max(0.25, interaction.initial.scale * (distance / Math.max(1, interaction.initialDistance))));
  }
  render();
}

function endInteraction(event) {
  if (!interaction) return;
  const layerId = interaction.layerId;
  interaction = null;
  const entry = layerElements.get(layerId);
  if (entry) {
    try { entry.root.releasePointerCapture(event.pointerId); } catch {}
  }
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
    if (format === 'jpeg' && state.background.type === 'transparent') {
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

function switchTab(tab) {
  $$('#inspectorTabs button').forEach((button) => button.classList.toggle('active', button.dataset.tab === tab));
  $$('.tab-panel').forEach((panel) => { panel.hidden = panel.dataset.tabPanel !== tab; });
}

function readBackgroundImageFile(file) {
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    state.background.image = reader.result;
    state.background.type = 'image';
    commitHistory();
    render();
  };
  reader.readAsDataURL(file);
}

function newDocument() {
  if (!window.confirm('Start a new document? This clears the current project (including the saved local copy).')) return;
  Object.assign(state, defaultState());
  layerElements.forEach((entry) => entry.root.remove());
  layerElements.clear();
  history.splice(0);
  historyIndex = -1;
  fitArtboard();
  commitHistory();
  render();
}

frames.forEach((frame) => {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'frame-option';
  button.innerHTML = `<strong>${frame.name}</strong><span>${frame.width} × ${frame.height}</span>`;
  button.addEventListener('click', () => {
    state.frame = { ...frame };
    els.frameDialog.close();
    fitArtboard();
    commitHistory();
    render();
  });
  els.frameGrid.append(button);
});

$('#editTextButton').addEventListener('click', openTextDialog);
$('#applyTextButton').addEventListener('click', () => {
  withSelectedLayer((layer) => { layer.text = els.textInput.value.trim() || 'Type something'; });
});

$('#fontFamily').addEventListener('change', (event) => withSelectedLayer((layer) => { layer.fontFamily = event.target.value; }));
$('#fontWeight').addEventListener('change', (event) => withSelectedLayer((layer) => { layer.fontWeight = Number(event.target.value); }));
$('#fontSize').addEventListener('change', (event) => withSelectedLayer((layer) => { layer.fontSize = Math.min(300, Math.max(12, Number(event.target.value) || 96)); }));
$('#textColor').addEventListener('input', (event) => withSelectedLayer((layer) => { layer.color = event.target.value; }, { commit: false }));
$('#textColor').addEventListener('change', () => { if (getSelectedLayer()) commitHistory(); });
$$('[data-align]').forEach((button) => button.addEventListener('click', () => withSelectedLayer((layer) => { layer.align = button.dataset.align; })));
$$('[data-format]').forEach((button) => button.addEventListener('click', () => { state.format = button.dataset.format; render(); }));

$('#addLayerButton').addEventListener('click', () => {
  const offset = state.layers.length * 20;
  const layer = createTextLayer({ name: `Text ${state.layers.length + 1}`, x: 40 + offset, y: 40 + offset });
  state.layers.push(layer);
  state.selectedLayerId = layer.id;
  commitHistory();
  render();
});

$$('#bgTypeSwitch [data-bg]').forEach((button) => button.addEventListener('click', () => {
  state.background.type = button.dataset.bg;
  commitHistory();
  render();
}));
els.backgroundColor.addEventListener('input', (event) => { state.background.color = event.target.value; render(); });
els.backgroundColor.addEventListener('change', () => commitHistory());
els.bgImageInput.addEventListener('change', (event) => readBackgroundImageFile(event.target.files?.[0]));
els.removeBgImageButton.addEventListener('click', () => {
  state.background.image = null;
  if (state.background.type === 'image') state.background.type = 'transparent';
  els.bgImageInput.value = '';
  commitHistory();
  render();
});
els.bgFit.addEventListener('change', (event) => { state.background.fit = event.target.value; commitHistory(); render(); });

$('#frameButton').addEventListener('click', () => els.frameDialog.showModal());
$$('#inspectorTabs button').forEach((button) => button.addEventListener('click', () => switchTab(button.dataset.tab)));
$$('.rail-button[data-tool]').forEach((button) => {
  button.addEventListener('click', () => {
    $$('.rail-button[data-tool]').forEach((b) => b.classList.toggle('active', b === button));
    const tool = button.dataset.tool;
    if (tool === 'frame') { els.frameDialog.showModal(); return; }
    if (tool === 'layers') switchTab('layers');
    if (tool === 'background') switchTab('background');
    if ((tool === 'layers' || tool === 'background') && window.matchMedia('(max-width: 1100px)').matches) {
      els.inspector.classList.add('open');
    }
  });
});

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
$('#resetButton').addEventListener('click', newDocument);

window.addEventListener('resize', () => { if (history.length <= 1) fitArtboard(); });
window.addEventListener('keydown', (event) => {
  const modifier = event.metaKey || event.ctrlKey;
  if (modifier && event.key.toLowerCase() === 'z') {
    event.preventDefault();
    restoreHistory(historyIndex + (event.shiftKey ? 1 : -1));
    return;
  }
  const activeLayerRoot = layerElements.get(state.selectedLayerId)?.root;
  if (event.key === 'Enter' && document.activeElement === activeLayerRoot) openTextDialog();
  if ((event.key === 'Delete' || event.key === 'Backspace') && document.activeElement === activeLayerRoot && state.selectedLayerId) {
    event.preventDefault();
    handleLayerAction(state.selectedLayerId, 'delete');
  }
});

commitHistory();
requestAnimationFrame(() => { fitArtboard(); render(); });
