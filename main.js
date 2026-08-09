import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// ---------- Scene Setup ----------
const canvas = document.getElementById('canvas');
const renderer = new THREE.WebGLRenderer({ canvas, antialias:true, alpha:true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio,2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.1;

const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x08090c, 0.018);

const camera = new THREE.PerspectiveCamera(55, window.innerWidth/window.innerHeight, 0.1, 100);
camera.position.set(0, 6, 18);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.minDistance = 4;
controls.maxDistance = 40;
controls.target.set(0,2,0);
controls.autoRotate = false;
controls.autoRotateSpeed = 0.4;

// Lights
const ambient = new THREE.AmbientLight(0x7a85a6, 0.6);
scene.add(ambient);

const keyLight = new THREE.DirectionalLight(0xdde6ff, 2.2);
keyLight.position.set(8, 15, 6);
scene.add(keyLight);

const fillLight = new THREE.DirectionalLight(0x223044, 1.2);
fillLight.position.set(-8, 4, -8);
scene.add(fillLight);

let isYokai = false;
let accentColor = new THREE.Color(0x00e5ff);
let accentColor2 = new THREE.Color(0xff1744);

const pointA = new THREE.PointLight(0x00e5ff, 8, 30);
pointA.position.set(0,1,0);
scene.add(pointA);

const pointB = new THREE.PointLight(0x4a5fff, 4, 30);
pointB.position.set(-6,6,-4);
scene.add(pointB);

// floor grid
const grid = new THREE.GridHelper(100, 100, 0x1c2132, 0x141824);
grid.position.y = -3.5;
scene.add(grid);

// transmitter cursor sphere
const transGeo = new THREE.SphereGeometry(0.35, 32, 32);
const transMat = new THREE.MeshStandardMaterial({ color:0x00e5ff, emissive:0x00e5ff, emissiveIntensity:2.5, roughness:0.2, metalness:0.2, transparent:true, opacity:0.9 });
const transmitter = new THREE.Mesh(transGeo, transMat);
transmitter.position.set(0,2,0);
scene.add(transmitter);

const transRingGeo = new THREE.RingGeometry(0.6, 0.65, 64);
const transRingMat = new THREE.MeshBasicMaterial({ color:0x00e5ff, side:THREE.DoubleSide, transparent:true, opacity:0.7 });
const transRing = new THREE.Mesh(transRingGeo, transRingMat);
transRing.rotation.x = Math.PI/2;
transRing.position.y = 0.02;
transmitter.add(transRing);

const transRing2 = new THREE.Mesh(new THREE.RingGeometry(1.1,1.14,64), new THREE.MeshBasicMaterial({ color:0x00e5ff, side:THREE.DoubleSide, transparent:true, opacity:0.35 }));
transRing2.rotation.x = Math.PI/2;
transRing2.position.y = -0.08;
transmitter.add(transRing2);

// ---------- Microbot Prefab ----------
function createMicrobotMesh(isLeader=false){
  const group = new THREE.Group();
  
  // main chassis - rounded box approx
  const bodyGeo = new THREE.BoxGeometry(0.55, 0.22, 0.38);
  // round edges via sub? keep low poly for performance; add chamfer illusion via smaller box on top
  const bodyMat = new THREE.MeshStandardMaterial({ 
    color: 0x101216, 
    roughness: 0.35, 
    metalness: 0.8,
    emissive: 0x000000
  });
  const body = new THREE.Mesh(bodyGeo, bodyMat);
  body.castShadow = false;
  body.receiveShadow = false;
  group.add(body);

  const topPlateGeo = new THREE.BoxGeometry(0.48, 0.06, 0.31);
  const topMat = new THREE.MeshStandardMaterial({ color:0x1a1f2b, roughness:0.3, metalness:0.6 });
  const top = new THREE.Mesh(topPlateGeo, topMat);
  top.position.y = 0.12;
  group.add(top);

  // glowing core indicator
  const ledGeo = new THREE.BoxGeometry(0.12, 0.02, 0.12);
  const ledMat = new THREE.MeshStandardMaterial({ color:0x00e5ff, emissive:0x00e5ff, emissiveIntensity: isLeader ? 6 : 2.5 });
  const led = new THREE.Mesh(ledGeo, ledMat);
  led.position.set(0,0.16,0);
  group.add(led);
  group.userData.led = led;

  // legs - 4 small articulated
  const legMat = new THREE.MeshStandardMaterial({ color:0x0a0b0f, roughness:0.5, metalness:0.5 });
  const legPositions = [
    [-0.22, -0.08, 0.12],
    [0.22, -0.08, 0.12],
    [-0.22, -0.08, -0.12],
    [0.22, -0.08, -0.12],
  ];
  const legs = [];
  legPositions.forEach((p,i)=>{
    const legGeo = new THREE.CapsuleGeometry(0.035, 0.18, 4, 8);
    const leg = new THREE.Mesh(legGeo, legMat);
    leg.position.set(p[0], p[1]-0.05, p[2]);
    leg.rotation.z = p[0] >0 ? -0.4 : 0.4;
    leg.rotation.x = p[2] >0 ? 0.2 : -0.2;
    group.add(leg);
    legs.push(leg);
    // magnet tip
    const tipGeo = new THREE.SphereGeometry(0.05, 8, 8);
    const tipMat = new THREE.MeshStandardMaterial({ color:0x2c3447, metalness:0.9, roughness:0.3 });
    const tip = new THREE.Mesh(tipGeo, tipMat);
    tip.position.y = -0.12;
    leg.add(tip);
  });
  group.userData.legs = legs;

  // micro bevel highlight
  group.scale.set(1,1,1);
  group.userData.baseY = 0;

  return group;
}

// ---------- Swarm System ----------
class MicroSwarm{
  constructor(count=240){
    this.count = count;
    this.bots = [];
    this.targets = []; // Vector3 per bot
    this.velocities = [];
    this.group = new THREE.Group();
    scene.add(this.group);

    // lines for links
    this.linkGeometry = new THREE.BufferGeometry();
    this.linkMaterial = new THREE.LineBasicMaterial({ color:0x00e5ff, transparent:true, opacity:0.18 });
    this.linkLines = new THREE.LineSegments(this.linkGeometry, this.linkMaterial);
    scene.add(this.linkLines);

    this.initBots();
  }
  initBots(){
    // clear
    this.bots.forEach(b=>this.group.remove(b.mesh));
    this.bots = [];
    this.velocities = [];
    this.targets = [];

    for(let i=0;i<this.count;i++){
      const mesh = createMicrobotMesh(i===0);
      // random spawn in sphere
      const r = 8 * Math.cbrt(Math.random());
      const theta = Math.random()*Math.PI*2;
      const phi = Math.acos(2*Math.random()-1);
      mesh.position.set(
        r*Math.sin(phi)*Math.cos(theta),
        r*Math.sin(phi)*Math.sin(theta)*0.6 + 2,
        r*Math.cos(phi)
      );
      mesh.rotation.set(Math.random()*Math.PI, Math.random()*Math.PI, Math.random()*Math.PI);
      this.group.add(mesh);
      this.bots.push({ mesh, phase: Math.random()*Math.PI*2 });
      this.velocities.push(new THREE.Vector3(0,0,0));
      this.targets.push(mesh.position.clone());
    }
  }
  setCount(n){
    if(n===this.count) return;
    this.count = n;
    this.initBots();
  }
  // compute formation targets
  updateTargets(mode, time, transmitterPos){
    const targets = this.targets;
    const count = this.count;
    const t = time*0.001;

    if(mode==='orbit'){
      for(let i=0;i<count;i++){
        const iNorm = i/count;
        const angle = iNorm * Math.PI*2*3 + t*0.6;
        const radius = 2.5 + Math.sin(iNorm*12 + t)*0.6 + (i%7)*0.15;
        const y = Math.sin(iNorm*20 + t*0.8)*1.2 + 2 + Math.cos(angle*0.5)*1.0;
        const x = transmitterPos.x + Math.cos(angle)*radius*1.2;
        const z = transmitterPos.z + Math.sin(angle)*radius*1.2;
        // add vertical wave
        targets[i].set(x, y, z);
      }
    } else if(mode==='tower'){
      const perLayer = 8;
      const layers = Math.ceil(count/perLayer);
      for(let i=0;i<count;i++){
        const layer = Math.floor(i/perLayer);
        const idx = i%perLayer;
        const ang = (idx/perLayer)*Math.PI*2 + layer*0.2;
        const rad = 0.7 + (layer%3)*0.15;
        const h = layer*0.32 -2; // tower grows up
        targets[i].set(
          transmitterPos.x + Math.cos(ang)*rad,
          h+2 + Math.sin(t*2+layer*0.4)*0.05,
          transmitterPos.z + Math.sin(ang)*rad
        );
      }
    } else if(mode==='sphere'){
      const radius = 3.2;
      for(let i=0;i<count;i++){
        const phi = Math.acos(1-2*(i/count));
        const theta = Math.PI*(1+Math.sqrt(5))*i + t*0.5;
        targets[i].set(
          transmitterPos.x + radius*Math.cos(theta)*Math.sin(phi),
          2 + radius*Math.sin(theta)*Math.sin(phi),
          transmitterPos.z + radius*Math.cos(phi)
        );
      }
    } else if(mode==='wave'){
      const cols = Math.ceil(Math.sqrt(count));
      const spacing = 0.6;
      for(let i=0;i<count;i++){
        const col = i % cols;
        const row = Math.floor(i/cols);
        const x = (col - cols/2)*spacing;
        const z = (row - cols/2)*spacing;
        const y = Math.sin(x*0.8 + t*2)*0.8 + Math.cos(z*0.9 + t*1.6)*0.8 + 2;
        targets[i].set(transmitterPos.x + x, y, transmitterPos.z+z);
      }
    } else if(mode==='bridge'){
      for(let i=0;i<count;i++){
        const norm = i/count;
        const x = (norm-0.5)*14;
        const catenary = Math.cosh((x)*0.28)*0.9 - 1.5;
        const y = 4 - catenary + Math.sin(norm*20)*0.05;
        const zOffset = ((i%6)-2.5)*0.45;
        const z = transmitterPos.z*0.15 + zOffset + Math.sin(norm*10 + t)*0.08;
        targets[i].set(transmitterPos.x + x*0.9, y, z);
      }
    } else if(mode==='bh6'){
      // approximate BH6 letters using points sampling
      // We'll create two blobs for B H 6 in 3D? Simplify: distribute to form letters on XZ plane elevated
      const pts = this.getBH6Points();
      for(let i=0;i<count;i++){
        const p = pts[i % pts.length];
        targets[i].set(
          transmitterPos.x + p.x + Math.sin(t + i)*0.03,
          2.2 + p.y*0.15,
          transmitterPos.z + p.z
        );
      }
    } else if(mode==='vortex'){
      for(let i=0;i<count;i++){
        const norm = i/count;
        const spirals = 5;
        const angle = norm*spirals*Math.PI*2 + t*3;
        const radius = (1 - norm)*5 + 0.5;
        const y = norm*10 -2 + Math.sin(angle*0.5)*0.3;
        targets[i].set(
          transmitterPos.x + Math.cos(angle)*radius,
          y,
          transmitterPos.z + Math.sin(angle)*radius
        );
      }
    } else if(mode==='scatter'){
      for(let i=0;i<count;i++){
        if(Math.random()<0.02){
          targets[i].set(
            (Math.random()-0.5)*20,
            Math.random()*10-1,
            (Math.random()-0.5)*20
          );
        }
      }
    }
  }
  getBH6Points(){
    // Pregenerate BH6 shape: B, H, 6 as dot matrix
    if(this._bh6Cache) return this._bh6Cache;
    const pts=[];
    // helper line
    const addLine = (x1,z1,x2,z2, steps=12)=>{
      for(let s=0;s<steps;s++){
        const t=s/(steps-1);
        pts.push({x: x1 + (x2-x1)*t, y:0, z: z1 + (z2-z1)*t});
      }
    };
    const addCircle = (cx,cz,r, from=0, to=Math.PI*2, steps=18)=>{
      for(let i=0;i<steps;i++){
        const t = from + (to-from)*(i/(steps-1));
        pts.push({x:cx+Math.cos(t)*r, y:0, z:cz+Math.sin(t)*r});
      }
    };
    // B at -4
    addLine(-6,-1.5,-6,1.5,10); 
    addCircle(-5.2,0.75,0.75, -Math.PI/2, Math.PI/2, 12);
    addCircle(-5.2,-0.75,0.75, -Math.PI/2, Math.PI/2, 12);
    // H at 0
    addLine(-1,-1.5,-1,1.5,10);
    addLine(1,-1.5,1,1.5,10);
    addLine(-1,0,1,0,8);
    // 6 at 4.5
    addCircle(4.5,-0.3,1.0,0,Math.PI*2,20);
    addLine(4.5,0.7,5.5,1.5,8);
    addLine(3.5,1.5,5.5,1.5,10);

    this._bh6Cache = pts;
    return pts;
  }
  update(dt, time, params){
    const cohesion = params.cohesion;
    const linkDist = params.linkDistance;
    const transmitterPos = params.transmitterPos;
    // separation
    const sepDist = 0.65;

    const positions = [];
    const links = [];

    for(let i=0;i<this.count;i++){
      const bot = this.bots[i];
      const mesh = bot.mesh;
      const vel = this.velocities[i];
      const target = this.targets[i];

      // steering to target
      const toTarget = target.clone().sub(mesh.position);
      const dist = toTarget.length();
      toTarget.normalize().multiplyScalar(0.05 * (0.2 + cohesion*1.8) * Math.min(dist*1.2, 3));

      // separation
      const sep = new THREE.Vector3();
      let sepCount=0;
      for(let j=0;j<this.count;j++){
        if(i===j) continue;
        const other = this.bots[j].mesh.position;
        const d = mesh.position.distanceTo(other);
        if(d<sepDist && d>0.0001){
          const diff = mesh.position.clone().sub(other).normalize().divideScalar(d);
          sep.add(diff);
          sepCount++;
        }
      }
      if(sepCount>0){
        sep.divideScalar(sepCount).normalize().multiplyScalar(0.035);
      }

      // add transmitter repulsion/attraction subtle
      const toTrans = transmitterPos.clone().sub(mesh.position);
      const transDist = toTrans.length();

      // combine
      vel.add(toTarget);
      vel.add(sep);
      vel.multiplyScalar(0.94); // damping
      vel.clampLength(0, 0.18);

      mesh.position.add(vel.clone().multiplyScalar(dt*60));

      // rotation: face velocity + wobble
      if(vel.length()>0.001){
        const look = mesh.position.clone().add(vel);
        mesh.lookAt(look);
      }
      mesh.rotation.x += Math.sin(time*0.001*3 + bot.phase)*0.01;
      // leg animation
      const legs = mesh.userData.legs;
      if(legs){
        legs.forEach((leg,k)=>{
          leg.rotation.z = (k%2===0?-0.4:0.4) + Math.sin(time*0.004 + i*0.1 + k)*0.2;
        });
      }

      // led color based on isYokai
      const led = mesh.userData.led;
      if(led){
        led.material.color.set(isYokai ? 0xff1744 : 0x00e5ff);
        led.material.emissive.set(isYokai ? 0xff1744 : 0x00e5ff);
        led.material.emissiveIntensity = 1.5 + Math.sin(time*0.005 + i)*0.8 + (transDist<4 ? 1.5 :0);
      }

      positions.push(mesh.position);

      // for links: brute force but limited to ~300 bots O(n^2) is heavy; use spatial hashing approx: just check nearby in array sampled?
      // Optimize by only checking next 20 bots for demo - not fully accurate but visual.
    }

    // Build link lines with spatial bucket - simple grid hash
    const linkPositions = [];
    const gridSize = linkDist;
    const buckets = new Map();
    const keyFor = (v)=> `${Math.floor(v.x/gridSize)}_${Math.floor(v.y/gridSize)}_${Math.floor(v.z/gridSize)}`;
    for(let i=0;i<positions.length;i++){
      const k = keyFor(positions[i]);
      if(!buckets.has(k)) buckets.set(k, []);
      buckets.get(k).push(i);
    }
    const neighOffsets = [];
    for(let dx=-1;dx<=1;dx++) for(let dy=-1;dy<=1;dy++) for(let dz=-1;dz<=1;dz++) neighOffsets.push([dx,dy,dz]);

    let linkCount=0;
    for(let i=0;i<positions.length;i++){
      const p = positions[i];
      const baseKey = keyFor(p).split('_').map(Number);
      for(const off of neighOffsets){
        const nk = `${baseKey[0]+off[0]}_${baseKey[1]+off[1]}_${baseKey[2]+off[2]}`;
        const list = buckets.get(nk);
        if(!list) continue;
        for(const j of list){
          if(j<=i) continue;
          const d = p.distanceTo(positions[j]);
          if(d < linkDist){
            linkPositions.push(p.x, p.y, p.z, positions[j].x, positions[j].y, positions[j].z);
            linkCount++;
            if(linkCount>1200) break;
          }
        }
        if(linkCount>1200) break;
      }
      if(linkCount>1200) break;
    }

    this.linkGeometry.setAttribute('position', new THREE.Float32BufferAttribute(linkPositions, 3));
    this.linkGeometry.attributes.position.needsUpdate = true;
    this.linkGeometry.computeBoundingSphere();
    this.linkMaterial.color.set(isYokai ? 0xff1744 : 0x00e5ff);
    this.linkMaterial.opacity = isYokai ? 0.22 : 0.18;

    return linkCount;
  }
}

// ---------- Instantiate Swarm ----------
let mode = 'orbit';
let count = 240;
const swarm = new MicroSwarm(count);

let mouse = new THREE.Vector2(0,0);
let transmitterTarget = new THREE.Vector3(0,2,0);
let raycaster = new THREE.Raycaster();
let plane = new THREE.Plane(new THREE.Vector3(0,1,0), -1);
let pointerDown = false;

function updateTransmitterFromMouse(event){
  const rect = canvas.getBoundingClientRect();
  mouse.x = ((event.clientX - rect.left)/rect.width)*2 -1;
  mouse.y = -((event.clientY - rect.top)/rect.height)*2 +1;
  raycaster.setFromCamera(mouse, camera);
  const intersectPoint = new THREE.Vector3();
  raycaster.ray.intersectPlane(plane, intersectPoint);
  // clamp
  intersectPoint.x = THREE.MathUtils.clamp(intersectPoint.x, -10, 10);
  intersectPoint.z = THREE.MathUtils.clamp(intersectPoint.z, -10, 10);
  intersectPoint.y = 2 + Math.sin(performance.now()*0.001)*0.2;
  transmitterTarget.copy(intersectPoint);
}

canvas.addEventListener('pointermove', (e)=>{
  if(e.buttons===1 || pointerDown) updateTransmitterFromMouse(e);
});
canvas.addEventListener('pointerdown', (e)=>{
  pointerDown=true;
  updateTransmitterFromMouse(e);
  
});
canvas.addEventListener('pointerup', ()=> pointerDown=false);

canvas.addEventListener('dblclick', ()=>{
  // punch
  for(let i=0;i<swarm.count;i++){
    swarm.velocities[i].add(new THREE.Vector3((Math.random()-0.5)*2, Math.random()*1.5, (Math.random()-0.5)*2));
  }
  // flash
  transMat.emissiveIntensity = 10;
  setTimeout(()=> transMat.emissiveIntensity = isYokai ? 3 : 2.5, 160);
});

// ---------- Single Microbot Viewer ----------
function initSingleViewer(){
  const c = document.getElementById('microSingle');
  if(!c) return;
  const renderer2 = new THREE.WebGLRenderer({ canvas:c, alpha:true, antialias:true });
  renderer2.setPixelRatio(Math.min(window.devicePixelRatio,2));
  const w = c.clientWidth, h = c.clientHeight;
  renderer2.setSize(w,h,false);
  const scene2 = new THREE.Scene();
  const cam2 = new THREE.PerspectiveCamera(35, w/h, 0.1, 100);
  cam2.position.set(1.5,0.8,1.2);
  const ctrl2 = new OrbitControls(cam2, c);
  ctrl2.enableDamping = true;
  ctrl2.autoRotate = true;
  ctrl2.autoRotateSpeed = 1.8;
  ctrl2.enableZoom = false;

  scene2.add(new THREE.AmbientLight(0x888caa, 1.2));
  const dl = new THREE.DirectionalLight(0xffffff,2);
  dl.position.set(2,4,2);
  scene2.add(dl);
  const dl2 = new THREE.DirectionalLight(0x00e5ff,1.5);
  dl2.position.set(-2,1,-2);
  scene2.add(dl2);

  const bot = createMicrobotMesh(true);
  bot.scale.set(1.8,1.8,1.8);
  bot.position.y = -0.1;
  scene2.add(bot);

  // ground reflection
  const floorGeo = new THREE.CircleGeometry(1.5,64);
  const floorMat = new THREE.MeshStandardMaterial({ color:0x0c0f18, roughness:0.2, metalness:0.8, transparent:true, opacity:0.6 });
  const floor = new THREE.Mesh(floorGeo, floorMat);
  floor.rotation.x = -Math.PI/2;
  floor.position.y = -0.28;
  scene2.add(floor);

  const grid2 = new THREE.GridHelper(4, 20, 0x1b2133, 0x121620);
  grid2.position.y = -0.27;
  scene2.add(grid2);

  const animate2 = (t)=>{
    requestAnimationFrame(animate2);
    bot.rotation.y += 0.003;
    const led = bot.userData.led;
    if(led){
      led.material.color.set(isYokai ? 0xff1744 : 0x00e5ff);
      led.material.emissive.set(isYokai ? 0xff1744 : 0x00e5ff);
    }
    ctrl2.update();
    renderer2.render(scene2,cam2);
  };
  animate2();

  window.addEventListener('resize', ()=>{
    const w2 = c.clientWidth, h2=c.clientHeight;
    renderer2.setSize(w2,h2,false);
    cam2.aspect = w2/h2;
    cam2.updateProjectionMatrix();
  });
}
initSingleViewer();

// ---------- Controls UI ----------
const modeButtons = document.querySelectorAll('.mode-btn');
modeButtons.forEach(btn=>{
  btn.addEventListener('click', ()=>{
    modeButtons.forEach(b=>b.classList.remove('active','yokai-active'));
    const m = btn.dataset.mode;
    mode = m;
    if(m==='scatter'){
      swarm.updateTargets('scatter', performance.now(), transmitterTarget);
    }
    if(isYokai){
      btn.classList.add('yokai-active');
    } else {
      btn.classList.add('active');
    }
  });
});

const countSlider = document.getElementById('count');
const countVal = document.getElementById('countVal');
const cohesionSlider = document.getElementById('cohesion');
const cohesionVal = document.getElementById('cohesionVal');
const linkSlider = document.getElementById('linkDist');
const linkVal = document.getElementById('linkVal');

countSlider.addEventListener('input', (e)=>{
  count = parseInt(e.target.value);
  countVal.textContent = count;
  document.getElementById('activeCount').textContent = count;
  swarm.setCount(count);
});
cohesionSlider.addEventListener('input', (e)=>{
  cohesionVal.textContent = parseFloat(e.target.value).toFixed(2);
});
linkSlider.addEventListener('input', (e)=>{
  linkVal.textContent = parseFloat(e.target.value).toFixed(1);
});

function setYokai(y){
  isYokai = y;
  const status = document.getElementById('transStatus');
  const label = document.getElementById('transLabel');
  if(y){
    status.classList.add('yokai');
    label.textContent = 'NEURO-TRANSMITTER: YOKAI • 5.8GHz OVERRIDE';
    transMat.color.set(0xff1744);
    transMat.emissive.set(0xff1744);
    transRingMat.color.set(0xff1744);
    pointA.color.set(0xff1744);
    accentColor.set(0xff1744);
    modeButtons.forEach(b=>{
      if(b.classList.contains('active')){
        b.classList.remove('active');
        b.classList.add('yokai-active');
      }
    });
  } else {
    status.classList.remove('yokai');
    label.textContent = 'NEURO-TRANSMITTER: HIRO • 2.4GHz LINKED';
    transMat.color.set(0x00e5ff);
    transMat.emissive.set(0x00e5ff);
    transRingMat.color.set(0x00e5ff);
    pointA.color.set(0x00e5ff);
    accentColor.set(0x00e5ff);
    modeButtons.forEach(b=>{
      if(b.classList.contains('yokai-active')){
        b.classList.remove('yokai-active');
        b.classList.add('active');
      }
    });
  }
}

document.getElementById('btnHiro').addEventListener('click', ()=> setYokai(false));
document.getElementById('btnYokai').addEventListener('click', ()=> setYokai(true));
window.addEventListener('keydown', (e)=>{
  if(e.key.toLowerCase()==='b') setYokai(false);
  if(e.key.toLowerCase()==='r') setYokai(true);
});

// ---------- Animation Loop ----------
let last = performance.now();
let fpsAcc=0, fpsCount=0, lastFpsTime=performance.now();
let linkCountDisplay = 0;

function animate(){
  requestAnimationFrame(animate);
  const now = performance.now();
  const dt = Math.min((now-last)/1000, 0.05);
  last = now;

  // smooth transmitter
  transmitter.position.lerp(transmitterTarget, 0.08);
  pointA.position.copy(transmitter.position);
  pointA.position.y += 0.5;

  transmitter.rotation.y += dt*0.8;
  transRing.rotation.z += dt*0.6;

  swarm.updateTargets(mode, now, transmitter.position);

  const linkCount = swarm.update(dt, now, {
    cohesion: parseFloat(cohesionSlider.value),
    linkDistance: parseFloat(linkSlider.value),
    transmitterPos: transmitter.position
  });
  linkCountDisplay = linkCount;

  controls.update();
  renderer.render(scene,camera);

  // fps
  fpsAcc += 1/dt;
  fpsCount++;
  if(now - lastFpsTime > 500){
    document.getElementById('fps').textContent = Math.round(fpsAcc/fpsCount).toString();
    document.getElementById('linkCount').textContent = linkCountDisplay.toString();
    fpsAcc=0;fpsCount=0;lastFpsTime=now;
  }
}
animate();

window.addEventListener('resize', ()=>{
  renderer.setSize(window.innerWidth, window.innerHeight);
  camera.aspect = window.innerWidth/window.innerHeight;
  camera.updateProjectionMatrix();
});

// initial hint pulse
setTimeout(()=>{
  transmitterTarget.set(3,2,2);
}, 400);
