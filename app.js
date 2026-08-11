const svgNS = 'http://www.w3.org/2000/svg';
const nodesGroup = document.getElementById('swarmNodes');
const stage = document.querySelector('.swarm-stage');
const stageState = document.getElementById('stageState');
const swarmCount = document.getElementById('swarmCount');
const deployButton = document.getElementById('deployButton');
const deployLabel = document.getElementById('deployLabel');
const scanButton = document.getElementById('scanButton');
const toast = document.getElementById('toast');
const toastText = document.getElementById('toastText');
const modalBackdrop = document.getElementById('modalBackdrop');
const modalClose = document.getElementById('modalClose');
const modalAction = document.getElementById('modalAction');
const activityList = document.getElementById('activityList');

let isDeployed = false;
let toastTimer;
let currentFormation = 'orbital';
let autopilot = true;
let scanRunning = false;
let nodeData = [];

const formationNames = {
  orbital: 'ORBITAL',
  shield: 'SHIELD',
  bridge: 'BRIDGE',
};

function makeUnit(index) {
  const group = document.createElementNS(svgNS, 'g');
  group.classList.add('swarm-unit');
  if (index % 7 === 0) group.classList.add('bright');
  if (index % 11 === 0) group.classList.add('dim');

  const polygon = document.createElementNS(svgNS, 'polygon');
  polygon.setAttribute('points', '0,-5 4,-2.5 4,2.5 0,5 -4,2.5 -4,-2.5');
  polygon.setAttribute('rx', '1');
  const dot = document.createElementNS(svgNS, 'circle');
  dot.setAttribute('cx', '0');
  dot.setAttribute('cy', '0');
  dot.setAttribute('r', index % 5 === 0 ? '1.65' : '1.15');
  const connector = document.createElementNS(svgNS, 'line');
  connector.setAttribute('x1', '-7');
  connector.setAttribute('y1', '0');
  connector.setAttribute('x2', '7');
  connector.setAttribute('y2', '0');

  group.append(polygon, connector, dot);
  nodesGroup.appendChild(group);
  return group;
}

function getOrbitalPosition(index) {
  const total = 86;
  const angle = (index / total) * Math.PI * 2 - Math.PI / 2;
  const ring = index % 4;
  const rx = [118, 151, 185, 218][ring] + Math.sin(index * 2.7) * 5;
  const ry = [82, 105, 130, 158][ring] + Math.cos(index * 1.9) * 4;
  return {
    x: 400 + Math.cos(angle) * rx,
    y: 265 + Math.sin(angle) * ry,
    rotate: (angle * 180) / Math.PI + 90,
  };
}

function getShieldPosition(index) {
  const total = 86;
  const angle = (index / total) * Math.PI * 2 - Math.PI / 2;
  const shell = index % 5;
  const rx = [145, 174, 204, 232, 255][shell];
  const ry = [93, 115, 137, 157, 174][shell];
  const offset = (shell % 2 ? 0.018 : -0.012) * index;
  return {
    x: 400 + Math.cos(angle + offset) * rx,
    y: 265 + Math.sin(angle + offset) * ry,
    rotate: (angle * 180) / Math.PI + 90,
  };
}

function getBridgePosition(index) {
  const total = 86;
  const progress = index / (total - 1);
  const x = 151 + progress * 498;
  const y = 265 - Math.sin(progress * Math.PI) * 108 + Math.sin(index * 1.7) * 5;
  return {
    x,
    y,
    rotate: Math.cos(progress * Math.PI) * 25,
  };
}

function getFormationPosition(index, formation) {
  if (formation === 'shield') return getShieldPosition(index);
  if (formation === 'bridge') return getBridgePosition(index);
  return getOrbitalPosition(index);
}

function setUnitPosition(unit, position) {
  unit.setAttribute('transform', `translate(${position.x.toFixed(2)} ${position.y.toFixed(2)}) rotate(${position.rotate.toFixed(2)})`);
}

function createSwarm() {
  for (let i = 0; i < 86; i += 1) {
    const unit = makeUnit(i);
    const position = getOrbitalPosition(i);
    nodeData.push({ unit, current: { ...position }, index: i });
    setUnitPosition(unit, position);
  }
}

function animateFormation(nextFormation) {
  if (nextFormation === currentFormation) return;
  const start = performance.now();
  const duration = 720;
  nodeData.forEach((item) => {
    item.start = { ...item.current };
    item.end = getFormationPosition(item.index, nextFormation);
  });

  function frame(now) {
    const progress = Math.min(1, (now - start) / duration);
    const eased = progress < 0.5 ? 2 * progress * progress : 1 - Math.pow(-2 * progress + 2, 2) / 2;
    nodeData.forEach((item) => {
      const next = {
        x: item.start.x + (item.end.x - item.start.x) * eased,
        y: item.start.y + (item.end.y - item.start.y) * eased,
        rotate: item.start.rotate + (item.end.rotate - item.start.rotate) * eased,
      };
      item.current = next;
      setUnitPosition(item.unit, next);
    });
    if (progress < 1) requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
  currentFormation = nextFormation;
}

function showToast(message) {
  toastText.textContent = message;
  toast.classList.add('show');
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => toast.classList.remove('show'), 3200);
}

function addActivity(icon, color, title, detail) {
  const item = document.createElement('div');
  item.className = 'activity-item';
  item.innerHTML = `<span class="activity-icon ${color}">${icon}</span><div><strong>${title}</strong><span>${detail}</span></div><time>NOW</time>`;
  activityList.prepend(item);
  while (activityList.children.length > 4) activityList.lastElementChild.remove();
}

function setDeployed(nextState) {
  isDeployed = nextState;
  stage.classList.toggle('deployed', isDeployed);
  deployLabel.textContent = isDeployed ? 'Recall swarm' : 'Deploy swarm';
  stageState.textContent = isDeployed ? 'DEPLOYED / COHERENT' : 'COHERENT STATE';
  swarmCount.textContent = isDeployed ? '128' : '128';
  deployButton.querySelector('.button-pulse').style.background = isDeployed ? '#ffb06e' : '#087d83';
  deployButton.style.borderColor = isDeployed ? 'var(--orange)' : '';
  deployButton.style.background = isDeployed ? 'linear-gradient(110deg, #ffb06e, #ffce91)' : '';
  document.getElementById('activeUnits').innerHTML = isDeployed ? '128 <em>/ 128</em>' : '128 <em>/ 128</em>';
  if (isDeployed) {
    addActivity('↗', 'cyan', 'Swarm deployed', '128 units linked to command');
    showToast('Swarm deployed — all units coherent');
  } else {
    addActivity('↘', 'violet', 'Swarm recalled', 'Units returned to standby mesh');
    showToast('Swarm recalled to standby');
  }
}

function openModal() {
  modalBackdrop.classList.add('open');
  modalBackdrop.setAttribute('aria-hidden', 'false');
  modalClose.focus();
}

function closeModal() {
  modalBackdrop.classList.remove('open');
  modalBackdrop.setAttribute('aria-hidden', 'true');
}

function runDiagnostics() {
  if (scanRunning) return;
  scanRunning = true;
  scanButton.disabled = true;
  scanButton.style.opacity = '.55';
  const original = scanButton.innerHTML;
  scanButton.innerHTML = '<span class="scan-icon">⌁</span> Scanning mesh...';
  stage.classList.add('scanning');
  showToast('Running full mesh diagnostics…');
  window.setTimeout(() => {
    scanButton.innerHTML = original;
    scanButton.disabled = false;
    scanButton.style.opacity = '';
    stage.classList.remove('scanning');
    scanRunning = false;
    addActivity('⌁', 'violet', 'Diagnostic sweep complete', 'Zero faults detected in core');
    document.getElementById('healthScore').textContent = '98.6';
    openModal();
  }, 1100);
}

function updateClock() {
  const clock = document.getElementById('clock');
  const now = new Date();
  // Keep the display in the requested early-morning hero-lab window while still ticking.
  const seconds = (6 * 60 * 60 + now.getSeconds()) % (24 * 60 * 60);
  const hrs = String(Math.floor(seconds / 3600)).padStart(2, '0');
  const mins = String(Math.floor((seconds % 3600) / 60)).padStart(2, '0');
  const secs = String(seconds % 60).padStart(2, '0');
  clock.textContent = `${hrs}:${mins}:${secs}`;
}

createSwarm();
updateClock();
window.setInterval(updateClock, 1000);

deployButton.addEventListener('click', () => setDeployed(!isDeployed));
scanButton.addEventListener('click', runDiagnostics);
modalClose.addEventListener('click', closeModal);
modalAction.addEventListener('click', closeModal);
modalBackdrop.addEventListener('click', (event) => {
  if (event.target === modalBackdrop) closeModal();
});
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') closeModal();
});

document.querySelectorAll('.formation-option').forEach((option) => {
  option.addEventListener('click', () => {
    const formation = option.dataset.formation;
    document.querySelectorAll('.formation-option').forEach((item) => item.classList.toggle('active', item === option));
    animateFormation(formation);
    stageState.textContent = `${formationNames[formation]} / COHERENT`;
    addActivity('✦', 'mint', `${formationNames[formation].charAt(0) + formationNames[formation].slice(1).toLowerCase()} formation selected`, 'Swarm vectors are recalibrating');
    showToast(`${formationNames[formation]} formation locked`);
  });
});

document.getElementById('autopilotToggle').addEventListener('click', (event) => {
  autopilot = !autopilot;
  const toggle = event.currentTarget;
  toggle.classList.toggle('active', autopilot);
  toggle.setAttribute('aria-pressed', String(autopilot));
  document.getElementById('autopilotLabel').textContent = autopilot ? 'ON' : 'OFF';
  showToast(`Auto pilot ${autopilot ? 'enabled' : 'disabled'}`);
});

document.getElementById('expandButton').addEventListener('click', (event) => {
  document.body.classList.toggle('fullscreen');
  const expanded = document.body.classList.contains('fullscreen');
  event.currentTarget.querySelector('span').textContent = expanded ? 'EXIT VIEW' : 'EXPAND VIEW';
  showToast(expanded ? 'Swarm view expanded' : 'Returned to command center');
});

document.getElementById('viewAllButton').addEventListener('click', () => {
  showToast('Event archive is up to date');
});

document.querySelector('.notification-button').addEventListener('click', () => {
  showToast('No new alerts — network nominal');
});

document.querySelectorAll('.nav-item').forEach((item) => {
  item.addEventListener('click', () => {
    document.querySelectorAll('.nav-item').forEach((nav) => nav.classList.remove('active'));
    item.classList.add('active');
  });
});

document.querySelector('.account-button').addEventListener('click', () => {
  showToast('Operator profile: Alex Mercer');
});
