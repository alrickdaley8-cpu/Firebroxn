const $ = (selector, scope = document) => scope.querySelector(selector);
const $$ = (selector, scope = document) => Array.from(scope.querySelectorAll(selector));

const appFrame = $('#appFrame');
const canvas = $('#swarmCanvas');
const ctx = canvas.getContext('2d');
const stage = $('.visual-wrap');
const toast = $('#toast');
const toastText = $('#toastText');
const diagnosticModal = $('#diagnosticModal');
const paletteBackdrop = $('#paletteBackdrop');
const paletteInput = $('#paletteInput');
const activityList = $('#activityList');

const state = {
formation: 'shield',
  mode: 'guardian',
  deployed: true,
  autopilot: true,
  paused: false,
  coherence: 98,
  paletteOpen: false,
  pointer: { x: 0, y: 0, active: false },
};

const formationConfig = {
  orbital: { label: 'ORBITAL', number: '01' },
  shield: { label: 'SHIELD', number: '02' },
  bridge: { label: 'BRIDGE', number: '03' },
  lattice: { label: 'LATTICE', number: '04' },
};

const modeConfig = {
  guardian: { directive: 'Protect the core', detail: 'Keep a defensive ring around command.', formation: 'shield', icon: '◇', color: 'cyan' },
  builder: { directive: 'Build a bridge', detail: 'Move all units as one coherent body.', formation: 'bridge', icon: '⌬', color: 'mint' },
  search: { directive: 'Map the unknown', detail: 'Fan out, listen close, and report back.', formation: 'orbital', icon: '◌', color: 'violet' },
  recall: { directive: 'Return to core', detail: 'Bring every unit home in a safe mesh.', formation: 'lattice', icon: '↶', color: 'orange' },
};

let toastTimer;
let clockSeconds = 6 * 60 * 60;
let scanRunning = false;
let canvasWidth = 1;
let canvasHeight = 1;
let canvasDpr = 1;
let animationFrame;
let lastFrame = 0;
let elapsed = 0;

const nodes = Array.from({ length: 164 }, (_, index) => ({
  index,
  angle: (index / 164) * Math.PI * 2,
  phase: Math.random() * Math.PI * 2,
  layer: index % 7,
  size: 2 + Math.random() * 1.6,
  hue: index % 8 === 0 ? 'mint' : index % 11 === 0 ? 'violet' : 'cyan',
  x: 0,
  y: 0,
  z: 0,
  rotation: 0,
}));

function showToast(message) {
  toastText.textContent = message;
  toast.classList.add('show');
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => toast.classList.remove('show'), 3200);
}

function setCanvasSize() {
  const rect = canvas.getBoundingClientRect();
  canvasWidth = Math.max(rect.width, 1);
  canvasHeight = Math.max(rect.height, 1);
  canvasDpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.floor(canvasWidth * canvasDpr);
  canvas.height = Math.floor(canvasHeight * canvasDpr);
  ctx.setTransform(canvasDpr, 0, 0, canvasDpr, 0, 0);
}

function hexPath(context, x, y, radius, rotation = 0) {
  context.beginPath();
  for (let i = 0; i < 6; i += 1) {
    const angle = rotation + (Math.PI / 3) * i - Math.PI / 6;
    const px = x + Math.cos(angle) * radius;
    const py = y + Math.sin(angle) * radius;
    if (i === 0) context.moveTo(px, py);
    else context.lineTo(px, py);
  }
  context.closePath();
}

function getNodeTarget(node, time, centerX, centerY, scale) {
  const n = node.index;
  const total = nodes.length;
  let x = centerX;
  let y = centerY;
  let z = 0;
  let rotation = node.angle;

  if (state.formation === 'orbital') {
    const layer = node.layer;
    const radiusX = (82 + layer * 17) * scale;
    const radiusY = (55 + layer * 11) * scale;
    const angle = node.angle + time * (0.08 + (layer % 3) * 0.018) * (n % 2 ? 1 : -1);
    z = Math.sin(angle + node.phase) * .85;
    x = centerX + Math.cos(angle) * radiusX + Math.sin(time * .8 + node.phase) * 2 * scale;
    y = centerY + Math.sin(angle) * radiusY;
    rotation = angle + Math.PI / 2;
  } else if (state.formation === 'shield') {
    const angle = node.angle + time * .025;
    const ring = node.layer % 3;
    const radiusX = (132 + ring * 29) * scale;
    const radiusY = (83 + ring * 21) * scale;
    z = Math.sin(angle) * .7;
    x = centerX + Math.cos(angle) * radiusX;
    y = centerY + Math.sin(angle) * radiusY;
    rotation = angle + Math.PI / 2;
  } else if (state.formation === 'bridge') {
    const progress = n / (total - 1);
    const span = Math.min(canvasWidth * .86, 480 * scale);
    x = centerX - span / 2 + progress * span;
    y = centerY - Math.sin(progress * Math.PI) * 118 * scale + Math.sin(n * 2.3 + time * .7) * 4 * scale;
    z = Math.sin(progress * Math.PI) * .6 + Math.sin(time + node.phase) * .2;
    rotation = Math.cos(progress * Math.PI) * .48;
  } else {
    const columns = 14;
    const row = Math.floor(n / columns);
    const column = n % columns;
    const gap = 26 * scale;
    x = centerX + (column - (columns - 1) / 2) * gap + (row % 2 ? gap / 2 : 0);
    y = centerY + (row - 5.5) * gap * .72;
    z = Math.sin((column + row) * .6 + time * .15);
    rotation = Math.PI / 6;
  }

  return { x, y, z, rotation };
}

function drawGlow(context, x, y, radius, color, alpha) {
  const gradient = context.createRadialGradient(x, y, 0, x, y, radius);
  gradient.addColorStop(0, `${color}${Math.round(alpha * 255).toString(16).padStart(2, '0')}`);
  gradient.addColorStop(1, `${color}00`);
  context.fillStyle = gradient;
  context.beginPath();
  context.arc(x, y, radius, 0, Math.PI * 2);
  context.fill();
}

function drawOrbit(context, centerX, centerY, radiusX, radiusY, rotation, opacity, dash) {
  context.save();
  context.translate(centerX, centerY);
  context.rotate(rotation);
  context.setLineDash(dash);
  context.strokeStyle = `rgba(92, 219, 222, ${opacity})`;
  context.lineWidth = 1;
  context.beginPath();
  context.ellipse(0, 0, radiusX, radiusY, 0, 0, Math.PI * 2);
  context.stroke();
  context.restore();
}

function drawCenterCore(context, centerX, centerY, scale, time) {
  const coreRadius = 42 * scale;
  const halo = context.createRadialGradient(centerX, centerY, 0, centerX, centerY, coreRadius * 2.7);
  halo.addColorStop(0, 'rgba(94, 240, 232, .24)');
  halo.addColorStop(.42, 'rgba(45, 156, 171, .1)');
  halo.addColorStop(1, 'rgba(45, 156, 171, 0)');
  context.fillStyle = halo;
  context.beginPath();
  context.arc(centerX, centerY, coreRadius * 2.7, 0, Math.PI * 2);
  context.fill();

  context.save();
  context.translate(centerX, centerY);
  context.rotate(time * .14);
  context.setLineDash([3 * scale, 8 * scale]);
  context.strokeStyle = 'rgba(155, 245, 216, .68)';
  context.lineWidth = 1;
  context.beginPath();
  context.arc(0, 0, coreRadius * 1.55, 0, Math.PI * 2);
  context.stroke();
  context.restore();

  context.save();
  context.translate(centerX, centerY);
  context.rotate(-time * .22);
  context.setLineDash([22 * scale, 9 * scale, 3 * scale, 10 * scale]);
  context.strokeStyle = 'rgba(180, 255, 251, .95)';
  context.lineWidth = Math.max(1, scale);
  context.beginPath();
  context.arc(0, 0, coreRadius * 1.24, 0, Math.PI * 2);
  context.stroke();
  context.restore();

  const shell = context.createRadialGradient(-coreRadius * .3, -coreRadius * .4, 1, coreRadius * .4, coreRadius * .55, coreRadius * 1.45);
  shell.addColorStop(0, '#e0ffff');
  shell.addColorStop(.16, '#8cf9f0');
  shell.addColorStop(.44, '#29aeb9');
  shell.addColorStop(1, '#0b3846');
  hexPath(context, centerX, centerY, coreRadius, Math.PI / 6);
  context.fillStyle = shell;
  context.shadowColor = 'rgba(89, 237, 231, .7)';
  context.shadowBlur = 17 * scale;
  context.fill();
  context.shadowBlur = 0;
  context.strokeStyle = 'rgba(191, 255, 249, .78)';
  context.lineWidth = Math.max(1, scale);
  context.stroke();

  hexPath(context, centerX, centerY, coreRadius * .77, Math.PI / 6);
  context.fillStyle = 'rgba(3, 31, 40, .55)';
  context.fill();
  context.strokeStyle = 'rgba(177, 255, 250, .35)';
  context.lineWidth = .8;
  context.stroke();

  context.strokeStyle = 'rgba(199, 255, 249, .82)';
  context.lineWidth = Math.max(1.3, scale * 1.6);
  context.lineCap = 'round';
  context.beginPath();
  context.moveTo(centerX - coreRadius * .32, centerY - coreRadius * .12);
  context.lineTo(centerX - coreRadius * .1, centerY - coreRadius * .12);
  context.moveTo(centerX + coreRadius * .1, centerY - coreRadius * .12);
  context.lineTo(centerX + coreRadius * .32, centerY - coreRadius * .12);
  context.moveTo(centerX - coreRadius * .25, centerY + coreRadius * .25);
  context.quadraticCurveTo(centerX, centerY + coreRadius * .48, centerX + coreRadius * .25, centerY + coreRadius * .25);
  context.stroke();

  context.fillStyle = '#efffff';
  context.shadowColor = '#efffff';
  context.shadowBlur = 8 * scale;
  context.beginPath();
  context.arc(centerX - coreRadius * .22, centerY - coreRadius * .12, Math.max(1.6, coreRadius * .06), 0, Math.PI * 2);
  context.arc(centerX + coreRadius * .22, centerY - coreRadius * .12, Math.max(1.6, coreRadius * .06), 0, Math.PI * 2);
  context.fill();
  context.shadowBlur = 0;

  context.fillStyle = 'rgba(113, 219, 221, .85)';
  context.font = `${Math.max(6, 7 * scale)}px DM Mono, monospace`;
  context.textAlign = 'center';
  context.letterSpacing = '2px';
  context.fillText('MICO CORE', centerX, centerY - coreRadius * 1.7);
}

function drawCanvas(time) {
  const width = canvasWidth;
  const height = canvasHeight;
  const centerX = width * .54 + state.pointer.x * 8;
  const centerY = height * .51 + state.pointer.y * 5;
  const scale = Math.min(width, height) / 440;
  const tick = state.paused ? elapsed : time;

  ctx.clearRect(0, 0, width, height);
  drawGlow(ctx, centerX, centerY, Math.min(width, height) * .53, '#35dce2', .12);
  drawGlow(ctx, centerX, centerY, Math.min(width, height) * .2, '#a0f7dc', .1);

  ctx.save();
  ctx.globalAlpha = .35;
  ctx.translate(centerX, centerY);
  ctx.rotate(-.18);
  ctx.setLineDash([1, 10]);
  ctx.strokeStyle = 'rgba(99, 217, 218, .45)';
  ctx.lineWidth = .7;
  ctx.beginPath();
  ctx.ellipse(0, 0, 225 * scale, 146 * scale, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
  drawOrbit(ctx, centerX, centerY, 187 * scale, 120 * scale, tick * .035, .33, [2, 9]);
  drawOrbit(ctx, centerX, centerY, 140 * scale, 88 * scale, -tick * .055, .27, [2, 7]);
  drawOrbit(ctx, centerX, centerY, 88 * scale, 57 * scale, tick * .08, .32, [1, 8]);

  ctx.save();
  ctx.strokeStyle = 'rgba(100, 218, 220, .18)';
  ctx.lineWidth = .7;
  ctx.setLineDash([2, 12]);
  ctx.beginPath();
  ctx.moveTo(26, centerY); ctx.lineTo(width - 26, centerY);
  ctx.moveTo(centerX, 18); ctx.lineTo(centerX, height - 18);
  ctx.stroke();
  ctx.restore();

  const targetNodes = nodes.map((node) => {
    const target = getNodeTarget(node, tick, centerX, centerY, scale);
    node.x += (target.x - node.x) * .085;
    node.y += (target.y - node.y) * .085;
    node.z += (target.z - node.z) * .085;
    node.rotation = target.rotation;
    return node;
  });

  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < targetNodes.length; i += 6) {
    const a = targetNodes[i];
    const b = targetNodes[(i + 1) % targetNodes.length];
    const distance = Math.hypot(a.x - b.x, a.y - b.y);
    if (distance < 80 * scale) {
      ctx.strokeStyle = `rgba(84, 228, 234, ${.1 + Math.max(0, 1 - distance / (80 * scale)) * .18})`;
      ctx.lineWidth = .55;
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
    }
    if (state.deployed && i % 12 === 0) {
      ctx.strokeStyle = `rgba(117, 237, 229, ${.06 + Math.max(0, a.z) * .08})`;
      ctx.setLineDash([2, 7]);
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(centerX, centerY);
      ctx.stroke();
      ctx.setLineDash([]);
    }
  }
  ctx.restore();

  [...targetNodes].sort((a, b) => a.z - b.z).forEach((node) => {
    const depth = .7 + (node.z + 1) * .18;
    const radius = node.size * scale * depth;
    const alpha = .42 + (node.z + 1) * .22;
    const color = node.hue === 'mint' ? `rgba(155, 245, 216, ${alpha})` : node.hue === 'violet' ? `rgba(168, 155, 255, ${alpha * .88})` : `rgba(84, 228, 234, ${alpha})`;
    ctx.save();
    ctx.translate(node.x, node.y);
    ctx.rotate(node.rotation);
    ctx.globalAlpha = state.deployed ? 1 : .36;
    hexPath(ctx, 0, 0, radius, Math.PI / 6);
    ctx.fillStyle = node.hue === 'mint' ? 'rgba(25, 102, 104, .9)' : node.hue === 'violet' ? 'rgba(49, 45, 103, .85)' : 'rgba(19, 77, 89, .9)';
    ctx.fill();
    ctx.strokeStyle = color;
    ctx.lineWidth = Math.max(.5, .65 * scale);
    ctx.stroke();
    ctx.fillStyle = node.hue === 'violet' ? '#d1cbff' : node.hue === 'mint' ? '#edfff8' : '#c9ffff';
    ctx.shadowColor = node.hue === 'violet' ? '#a89bff' : node.hue === 'mint' ? '#9bf5d8' : '#54e4ea';
    ctx.shadowBlur = Math.max(3, 5 * scale);
    ctx.beginPath();
    ctx.arc(0, 0, Math.max(.8, radius * .25), 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  });

  drawCenterCore(ctx, centerX, centerY, scale, tick);

  if (state.pointer.active) {
    const px = centerX + state.pointer.x * width * .36;
    const py = centerY + state.pointer.y * height * .34;
    ctx.save();
    ctx.strokeStyle = 'rgba(155, 245, 216, .65)';
    ctx.lineWidth = .6;
    ctx.setLineDash([2, 4]);
    ctx.beginPath();
    ctx.arc(px, py, 9, 0, Math.PI * 2);
    ctx.moveTo(px - 15, py); ctx.lineTo(px + 15, py);
    ctx.moveTo(px, py - 15); ctx.lineTo(px, py + 15);
    ctx.stroke();
    ctx.restore();
  }
}

function animate(frameTime) {
  const delta = Math.min((frameTime - lastFrame) / 1000 || 0, .05);
  lastFrame = frameTime;
  if (!state.paused) elapsed += delta;
  drawCanvas(elapsed);
  animationFrame = window.requestAnimationFrame(animate);
}

function updateRangeFill(value) {
  const percentage = ((value - 70) / 30) * 100;
  $('#coherenceSlider').style.background = `linear-gradient(90deg, var(--cyan) 0%, var(--cyan) ${percentage}%, #203541 ${percentage}%, #203541 100%)`;
}

function setFormation(formation, announce = true) {
  if (!formationConfig[formation]) return;
  state.formation = formation;
  const config = formationConfig[formation];
  $('#heroFormation').textContent = config.number;
  $('#visualMode').textContent = config.label;
  $$('.mode-button').forEach((button) => button.classList.toggle('active', button.dataset.mode === state.mode));
  if (announce) showToast(`${config.label} formation locked`);
}

function setMode(mode, announce = true) {
  const config = modeConfig[mode];
  if (!config) return;
  state.mode = mode;
  $('#directiveText').textContent = config.directive;
  $('#directiveSubtext').textContent = config.detail;
  $$('.mode-button').forEach((button) => button.classList.toggle('active', button.dataset.mode === mode));
  if (mode === 'recall') {
    setDeployment(false, false);
    setFormation(config.formation, false);
  } else {
    setFormation(config.formation, false);
    if (!state.deployed) setDeployment(true, false);
  }
  if (announce) {
    addActivity(config.icon, config.color, `${config.directive} directive`, 'MICO updated the active behavior');
    showToast(`${config.directive} — directive acknowledged`);
  }
}

function updateDeploymentUI() {
  $('#deployLabel').textContent = state.deployed ? 'Recall swarm' : 'Deploy swarm';
  $('.button-dot').style.background = state.deployed ? '#087d83' : '#9b6c41';
  $('.primary-button', $('.hero-copy')).style.borderColor = state.deployed ? 'var(--cyan)' : 'var(--orange)';
  $('.primary-button', $('.hero-copy')).style.background = state.deployed ? 'linear-gradient(110deg, var(--cyan), var(--mint))' : 'linear-gradient(110deg, #ffb477, #ffe0a9)';
  $('#swarmCount').innerHTML = state.deployed ? '128 <small>/ 128</small>' : '12 <small>/ 128</small>';
  const activeStat = $('.signal-stat:nth-child(4) strong');
  if (activeStat) activeStat.innerHTML = state.deployed ? '128<span>/128</span>' : '12<span>/128</span>';
  $('#coreLabel').textContent = state.deployed ? 'MICO CORE / ONLINE' : 'MICO CORE / STANDBY';
}

function setDeployment(deployed, announce = true) {
  state.deployed = deployed;
  updateDeploymentUI();
  if (announce) {
    if (deployed) {
      addActivity('↗', 'cyan', 'Swarm deployed', '128 units linked to command');
      showToast('Swarm deployed — all units coherent');
    } else {
      addActivity('↶', 'orange', 'Swarm recalled', 'Units returned to standby mesh');
      showToast('Swarm recalled to safe standby');
    }
  }
}

function addActivity(icon, color, title, detail) {
  const row = document.createElement('button');
  row.type = 'button';
  row.className = 'activity-row';
  const iconElement = document.createElement('span');
  iconElement.className = `activity-icon ${color}`;
  iconElement.textContent = icon;
  const copy = document.createElement('span');
  const strong = document.createElement('strong');
  strong.textContent = title;
  const small = document.createElement('small');
  small.textContent = detail;
  copy.append(strong, small);
  const time = document.createElement('time');
  time.textContent = 'NOW';
  row.append(iconElement, copy, time);
  activityList.prepend(row);
  while (activityList.children.length > 4) activityList.lastElementChild.remove();
}

function openDiagnostic() {
  diagnosticModal.classList.add('open');
  diagnosticModal.setAttribute('aria-hidden', 'false');
  document.body.classList.add('locked');
  $('#closeDiagnostic').focus();
}

function closeDiagnostic() {
  diagnosticModal.classList.remove('open');
  diagnosticModal.setAttribute('aria-hidden', 'true');
  if (!state.paletteOpen) document.body.classList.remove('locked');
}

function runDiagnostics() {
  if (scanRunning) return;
  scanRunning = true;
  const button = $('#diagnosticButton');
  const original = button.innerHTML;
  button.disabled = true;
  button.style.opacity = '.55';
  button.innerHTML = '<span>⌁</span> Scanning mesh...';
  showToast('Running full mesh diagnostics…');
  window.setTimeout(() => {
    button.disabled = false;
    button.style.opacity = '';
    button.innerHTML = original;
    scanRunning = false;
    $('#healthValue').innerHTML = '98.9<span>%</span>';
    $('#densityValue').textContent = '98.9%';
    addActivity('⌁', 'violet', 'Diagnostic sweep complete', 'Zero faults detected in core');
    openDiagnostic();
  }, 1100);
}

function openPalette() {
  state.paletteOpen = true;
  paletteBackdrop.classList.add('open');
  paletteBackdrop.setAttribute('aria-hidden', 'false');
  document.body.classList.add('locked');
  paletteInput.value = '';
  filterPalette('');
  window.setTimeout(() => paletteInput.focus(), 50);
}

function closePalette() {
  state.paletteOpen = false;
  paletteBackdrop.classList.remove('open');
  paletteBackdrop.setAttribute('aria-hidden', 'true');
  if (!diagnosticModal.classList.contains('open')) document.body.classList.remove('locked');
}

function executeCommand(command) {
  closePalette();
  if (command === 'deploy') setDeployment(true);
  if (command === 'recall') setDeployment(false);
  if (command === 'diagnostics') runDiagnostics();
  if (command === 'expand') toggleExpanded();
}

function filterPalette(query) {
  const value = query.trim().toLowerCase();
  $$('.palette-item').forEach((item) => {
    item.hidden = value && !item.textContent.toLowerCase().includes(value);
  });
}

function toggleExpanded() {
  const expanded = appFrame.classList.toggle('expanded');
  $('#expandButton span').textContent = expanded ? 'EXIT VIEW' : 'EXPAND VIEW';
  showToast(expanded ? 'Live swarm view expanded' : 'Returned to command center');
  window.setTimeout(setCanvasSize, 300);
}

function submitCommand(event) {
  event.preventDefault();
  const input = $('#commandInput');
  const query = input.value.trim().toLowerCase();
  if (!query) return input.focus();
  input.value = '';
  if (query.includes('bridge') || query.includes('build')) setMode('builder');
  else if (query.includes('protect') || query.includes('guard')) setMode('guardian');
  else if (query.includes('search') || query.includes('map') || query.includes('find')) setMode('search');
  else if (query.includes('recall') || query.includes('home') || query.includes('return')) setMode('recall');
  else if (query.includes('scan') || query.includes('diagnostic')) runDiagnostics();
  else showToast(`MICO heard “${query}” — try build, protect, search, or recall`);
}

function updateClock() {
  clockSeconds = (clockSeconds + 1) % (24 * 60 * 60);
  const hrs = String(Math.floor(clockSeconds / 3600)).padStart(2, '0');
  const mins = String(Math.floor((clockSeconds % 3600) / 60)).padStart(2, '0');
  const secs = String(clockSeconds % 60).padStart(2, '0');
  $('#clock').textContent = `${hrs}:${mins}:${secs}`;
}

function initEvents() {
  $('#deployButton').addEventListener('click', () => setDeployment(!state.deployed));
  $('#diagnosticButton').addEventListener('click', runDiagnostics);
  $('#expandButton').addEventListener('click', toggleExpanded);
  $('#commandForm').addEventListener('submit', submitCommand);

  $$('.mode-button').forEach((button) => button.addEventListener('click', () => setMode(button.dataset.mode)));
  $('#coherenceSlider').addEventListener('input', (event) => {
    const value = Number(event.target.value);
    state.coherence = value;
    $('#coherenceValue').textContent = value;
    $('#healthValue').innerHTML = `${value}.<span>6%</span>`;
    $('#densityValue').textContent = `${value}.6%`;
    updateRangeFill(value);
  });
  $('#autopilotToggle').addEventListener('click', () => {
    state.autopilot = !state.autopilot;
    $('#autopilotToggle').classList.toggle('active', state.autopilot);
    $('#autopilotToggle').setAttribute('aria-pressed', String(state.autopilot));
    $('#autopilotText').textContent = state.autopilot ? 'ON' : 'OFF';
    showToast(`Autopilot ${state.autopilot ? 'enabled' : 'disabled'}`);
  });

  $('#commandButton').addEventListener('click', openPalette);
  $('#paletteBackdrop').addEventListener('click', (event) => { if (event.target === paletteBackdrop) closePalette(); });
  $('#paletteInput').addEventListener('input', (event) => filterPalette(event.target.value));
  $$('.palette-item').forEach((item) => item.addEventListener('click', () => executeCommand(item.dataset.command)));
  $('#closeDiagnostic').addEventListener('click', closeDiagnostic);
  $('#closeDiagnosticAction').addEventListener('click', closeDiagnostic);
  diagnosticModal.addEventListener('click', (event) => { if (event.target === diagnosticModal) closeDiagnostic(); });

  $$('.nav-link').forEach((link) => link.addEventListener('click', () => {
    $$('.nav-link').forEach((nav) => nav.classList.remove('active'));
    link.classList.add('active');
    if (window.innerWidth <= 760) $('.sidebar').classList.remove('open');
  }));
  $('#mobileMenu').addEventListener('click', () => $('.sidebar').classList.toggle('open'));
  $('#labSwitcher').addEventListener('click', () => showToast('Sector A is the active Hero Lab'));
  $('#operatorButton').addEventListener('click', () => showToast('Operator profile: Alex Mercer'));
  $('#topAvatar').addEventListener('click', () => showToast('Operator profile: Alex Mercer'));
  $('#bellButton').addEventListener('click', () => showToast('No new alerts — network nominal'));
  $('#helpButton').addEventListener('click', () => showToast('Tip: press ⌘ K to open the command palette'));
  $('#deckMenu').addEventListener('click', () => showToast('Command deck settings are nominal'));
  $('#archiveButton').addEventListener('click', () => showToast('Event archive is up to date'));
  $('#topologyButton').addEventListener('click', () => showToast('Topology map is live — hover a node'));
  $$('.activity-row').forEach((row) => row.addEventListener('click', () => showToast('Event detail synced to command deck')));
  $$('.mission-row').forEach((row) => row.addEventListener('click', () => {
    $$('.mission-row').forEach((item) => item.classList.remove('selected'));
    row.classList.add('selected');
    const mission = row.dataset.mission;
    $('#directiveText').textContent = mission;
    $('#directiveSubtext').textContent = 'Mission loaded into the active directive.';
    showToast(`${mission} loaded into command deck`);
  }));

  canvas.addEventListener('pointermove', (event) => {
    const rect = canvas.getBoundingClientRect();
    state.pointer.x = (event.clientX - rect.left) / rect.width * 2 - 1;
    state.pointer.y = (event.clientY - rect.top) / rect.height * 2 - 1;
    state.pointer.active = true;
  });
  canvas.addEventListener('pointerleave', () => {
    state.pointer.x = 0;
    state.pointer.y = 0;
    state.pointer.active = false;
  });

  document.addEventListener('keydown', (event) => {
    const modifier = event.metaKey || event.ctrlKey;
    if (modifier && event.key.toLowerCase() === 'k') { event.preventDefault(); state.paletteOpen ? closePalette() : openPalette(); }
    if (event.key === 'Escape') { closePalette(); closeDiagnostic(); if (window.innerWidth <= 760) $('.sidebar').classList.remove('open'); }
    if (modifier && event.key.toLowerCase() === 'd') { event.preventDefault(); setDeployment(true); }
    if (modifier && event.key.toLowerCase() === 'r' && !event.shiftKey) { event.preventDefault(); runDiagnostics(); }
    if (modifier && event.shiftKey && event.key.toLowerCase() === 'r') { event.preventDefault(); setDeployment(false); }
  });
}

setCanvasSize();
updateRangeFill(state.coherence);
setDeployment(true, false);
initEvents();
window.addEventListener('resize', setCanvasSize);
window.setInterval(updateClock, 1000);
animationFrame = window.requestAnimationFrame(animate);
