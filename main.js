import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// ---------- Detect Mobile ----------
const isMobile = /Android|iPhone|iPad|iPod|Mobi/i.test(navigator.userAgent) || window.innerWidth <= 1024;
const isTouch = 'ontouchstart' in window;

// ---------- Scene Setup ----------
const canvas = document.getElementById('canvas');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: !isMobile, alpha:true, powerPreference: isMobile ? 'high-performance' : 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, isMobile ? 1.6 : 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.1;

const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x08090c, isMobile ? 0.022 : 0.018);

const camera = new THREE.PerspectiveCamera(isMobile ? 60 : 55, window.innerWidth/window.innerHeight, 0.1, 100);
camera.position.set(0, isMobile ? 8 : 6, isMobile ? 16 : 18);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.minDistance = isMobile ? 3 : 4;
controls.maxDistance = isMobile ? 30 : 40;
controls.target.set(0,2,0);
controls.enablePan = false;
controls.touches = {
  ONE: THREE.TOUCH.ROTATE,
  TWO: THREE.TOUCH.DOLLY_ROTATE
};
// Prevent orbit when touching UI
let controlsEnabled = true;

// Lights
scene.add(new THREE.AmbientLight(0x7a85a6, 0.6));
const keyLight = new THREE.DirectionalLight(0xdde6ff, 2.2);
keyLight.position.set(8, 15, 6);
scene.add(keyLight);
const fillLight = new THREE.DirectionalLight(0x223044, 1.2);
fillLight.position.set(-8, 4, -8);
scene.add(fillLight);

let isYokai = false;
let accentColor = new THREE.Color(0x00e5ff);

const pointA = new THREE.PointLight(0x00e5ff, isMobile ? 5 : 8, 30);
pointA.position.set(0,1,0);
scene.add(pointA);

const pointB = new THREE.PointLight(0x4a5fff, isMobile ? 2 : 4, 30);
pointB.position.set(-6,6,-4);
scene.add(pointB);

const grid = new THREE.GridHelper(100, isMobile ? 60 : 100, 0x1c2132, 0x141824);
grid.position.y = -3.5;
scene.add(grid);

// transmitter
const transGeo = new THREE.SphereGeometry(isMobile ? 0.42 : 0.35, isMobile ? 20 : 32, isMobile ? 20 : 32);
const transMat = new THREE.MeshStandardMaterial({ color:0x00e5ff, emissive:0x00e5ff, emissiveIntensity:2.5, roughness:0.2, metalness:0.2, transparent:true, opacity:0.9 });
const transmitter = new THREE.Mesh(transGeo, transMat);
transmitter.position.set(0,2,0);
scene.add(transmitter);

const transRingGeo = new THREE.RingGeometry(0.6, 0.65, isMobile ? 32 : 64);
const transRingMat = new THREE.MeshBasicMaterial({ color:0x00e5ff, side:THREE.DoubleSide, transparent:true, opacity:0.7 });
const transRing = new THREE.Mesh(transRingGeo, transRingMat);
transRing.rotation.x = Math.PI/2;
transRing.position.y = 0.02;
transmitter.add(transRing);

const transRing2 = new THREE.Mesh(new THREE.RingGeometry(1.1,1.14, isMobile ? 24 : 64), new THREE.MeshBasicMaterial({ color:0x00e5ff, side:THREE.DoubleSide, transparent:true, opacity:0.35 }));
transRing2.rotation.x = Math.PI/2;
transRing2.position.y = -0.08;
transmitter.add(transRing2);

// ---------- Microbot Prefab ----------
function createMicrobotMesh(isLeader=false, lowPoly=false){
  const group = new THREE.Group();
  const detail = lowPoly ? 1 : 2;

  const bodyGeo = new THREE.BoxGeometry(0.55, 0.22, 0.38);
  const bodyMat = new THREE.MeshStandardMaterial({ color: 0x101216, roughness: 0.35, metalness: 0.8 });
  const body = new THREE.Mesh(bodyGeo, bodyMat);
  group.add(body);

  const topPlateGeo = new THREE.BoxGeometry(0.48, 0.06, 0.31);
  const topMat = new THREE.MeshStandardMaterial({ color:0x1a1f2b, roughness:0.3, metalness:0.6 });
  const top = new THREE.Mesh(topPlateGeo, topMat);
  top.position.y = 0.12;
  group.add(top);

  const ledGeo = new THREE.BoxGeometry(0.12, 0.02, 0.12);
  const ledMat = new THREE.MeshStandardMaterial({ color:0x00e5ff, emissive:0x00e5ff, emissiveIntensity: isLeader ? 6 : 2.5 });
  const led = new THREE.Mesh(ledGeo, ledMat);
  led.position.set(0,0.16,0);
  group.add(led);
  group.userData.led = led;

  const legMat = new THREE.MeshStandardMaterial({ color:0x0a0b0f, roughness:0.5, metalness:0.5 });
  const legPositions = [[-0.22, -0.08, 0.12],[0.22, -0.08, 0.12],[-0.22, -0.08, -0.12],[0.22, -0.08, -0.12]];
  const legs=[];
  legPositions.forEach((p,i)=>{
    const legGeo = new THREE.CapsuleGeometry(0.035, 0.18, 2, 6);
    const leg = new THREE.Mesh(legGeo, legMat);
    leg.position.set(p[0], p[1]-0.05, p[2]);
    leg.rotation.z = p[0] >0 ? -0.4 : 0.4;
    leg.rotation.x = p[2] >0 ? 0.2 : -0.2;
    group.add(leg);
    legs.push(leg);
    const tipGeo = new THREE.SphereGeometry(0.05, 6, 6);
    const tipMat = new THREE.MeshStandardMaterial({ color:0x2c3447, metalness:0.9, roughness:0.3 });
    const tip = new THREE.Mesh(tipGeo, tipMat);
    tip.position.y = -0.12;
    leg.add(tip);
  });
  group.userData.legs = legs;
  return group;
}

// ---------- Swarm ----------
class MicroSwarm{
  constructor(count=240){
    this.count = count;
    this.bots = [];
    this.targets = [];
    this.velocities = [];
    this.group = new THREE.Group();
    scene.add(this.group);

    this.linkGeometry = new THREE.BufferGeometry();
    this.linkMaterial = new THREE.LineBasicMaterial({ color:0x00e5ff, transparent:true, opacity: isMobile ? 0.14 : 0.18, depthWrite:false });
    this.linkLines = new THREE.LineSegments(this.linkGeometry, this.linkMaterial);
    scene.add(this.linkLines);
    this.initBots();
  }
  initBots(){
    this.bots.forEach(b=>this.group.remove(b.mesh));
    this.bots=[]; this.velocities=[]; this.targets=[];
    const lowPoly = isMobile && this.count > 180;
    for(let i=0;i<this.count;i++){
      const mesh = createMicrobotMesh(i===0, lowPoly);
      const r = 8 * Math.cbrt(Math.random());
      const theta = Math.random()*Math.PI*2;
      const phi = Math.acos(2*Math.random()-1);
      mesh.position.set(r*Math.sin(phi)*Math.cos(theta), r*Math.sin(phi)*Math.sin(theta)*0.6 + 2, r*Math.cos(phi));
      mesh.rotation.set(Math.random()*Math.PI, Math.random()*Math.PI, Math.random()*Math.PI);
      this.group.add(mesh);
      this.bots.push({ mesh, phase: Math.random()*Math.PI*2 });
      this.velocities.push(new THREE.Vector3(0,0,0));
      this.targets.push(mesh.position.clone());
    }
  }
  setCount(n){
    if(n===this.count) return;
    this.count=n;
    this.initBots();
  }
  updateTargets(mode, time, transmitterPos){
    const targets=this.targets, count=this.count, t=time*0.001;
    if(mode==='orbit'){
      for(let i=0;i<count;i++){
        const iNorm=i/count;
        const angle=iNorm*Math.PI*2*3 + t*0.6;
        const radius=2.5 + Math.sin(iNorm*12 + t)*0.6 + (i%7)*0.15;
        const y=Math.sin(iNorm*20 + t*0.8)*1.2 + 2 + Math.cos(angle*0.5)*1.0;
        targets[i].set(transmitterPos.x + Math.cos(angle)*radius*1.2, y, transmitterPos.z + Math.sin(angle)*radius*1.2);
      }
    } else if(mode==='tower'){
      const perLayer= isMobile ? 6 : 8;
      for(let i=0;i<count;i++){
        const layer=Math.floor(i/perLayer);
        const idx=i%perLayer;
        const ang=(idx/perLayer)*Math.PI*2 + layer*0.2;
        const rad=0.7 + (layer%3)*0.15;
        const h=layer*0.32 -2;
        targets[i].set(transmitterPos.x + Math.cos(ang)*rad, h+2 + Math.sin(t*2+layer*0.4)*0.05, transmitterPos.z + Math.sin(ang)*rad);
      }
    } else if(mode==='sphere'){
      const radius=3.2;
      for(let i=0;i<count;i++){
        const phi=Math.acos(1-2*(i/count));
        const theta=Math.PI*(1+Math.sqrt(5))*i + t*0.5;
        targets[i].set(transmitterPos.x + radius*Math.cos(theta)*Math.sin(phi), 2 + radius*Math.sin(theta)*Math.sin(phi), transmitterPos.z + radius*Math.cos(phi));
      }
    } else if(mode==='wave'){
      const cols=Math.ceil(Math.sqrt(count));
      const spacing=0.6;
      for(let i=0;i<count;i++){
        const col=i%cols, row=Math.floor(i/cols);
        const x=(col - cols/2)*spacing;
        const z=(row - cols/2)*spacing;
        const y=Math.sin(x*0.8 + t*2)*0.8 + Math.cos(z*0.9 + t*1.6)*0.8 + 2;
        targets[i].set(transmitterPos.x + x, y, transmitterPos.z+z);
      }
    } else if(mode==='bridge'){
      for(let i=0;i<count;i++){
        const norm=i/count;
        const x=(norm-0.5)*14;
        const catenary=Math.cosh(x*0.28)*0.9 - 1.5;
        const y=4 - catenary + Math.sin(norm*20)*0.05;
        const zOffset=((i%6)-2.5)*0.45;
        targets[i].set(transmitterPos.x + x*0.9, y, transmitterPos.z*0.15 + zOffset + Math.sin(norm*10 + t)*0.08);
      }
    } else if(mode==='bh6'){
      const pts=this.getBH6Points();
      for(let i=0;i<count;i++){
        const p=pts[i % pts.length];
        targets[i].set(transmitterPos.x + p.x + Math.sin(t + i)*0.03, 2.2 + p.y*0.15, transmitterPos.z + p.z);
      }
    } else if(mode==='vortex'){
      for(let i=0;i<count;i++){
        const norm=i/count;
        const angle=norm*5*Math.PI*2 + t*3;
        const radius=(1 - norm)*5 + 0.5;
        const y=norm*10 -2 + Math.sin(angle*0.5)*0.3;
        targets[i].set(transmitterPos.x + Math.cos(angle)*radius, y, transmitterPos.z + Math.sin(angle)*radius);
      }
    } else if(mode==='scatter'){
      for(let i=0;i<count;i++){
        if(Math.random()<0.02){
          targets[i].set((Math.random()-0.5)*20, Math.random()*10-1, (Math.random()-0.5)*20);
        }
      }
    }
  }
  getBH6Points(){
    if(this._bh6Cache) return this._bh6Cache;
    const pts=[];
    const addLine=(x1,z1,x2,z2, steps=12)=>{ for(let s=0;s<steps;s++){ const t=s/(steps-1); pts.push({x: x1 + (x2-x1)*t, y:0, z: z1 + (z2-z1)*t}); } };
    const addCircle=(cx,cz,r, from=0, to=Math.PI*2, steps=18)=>{ for(let i=0;i<steps;i++){ const t=from + (to-from)*(i/(steps-1)); pts.push({x:cx+Math.cos(t)*r, y:0, z:cz+Math.sin(t)*r}); } };
    addLine(-6,-1.5,-6,1.5,10); addCircle(-5.2,0.75,0.75, -Math.PI/2, Math.PI/2, 12); addCircle(-5.2,-0.75,0.75, -Math.PI/2, Math.PI/2, 12);
    addLine(-1,-1.5,-1,1.5,10); addLine(1,-1.5,1,1.5,10); addLine(-1,0,1,0,8);
    addCircle(4.5,-0.3,1.0,0,Math.PI*2,20); addLine(4.5,0.7,5.5,1.5,8); addLine(3.5,1.5,5.5,1.5,10);
    this._bh6Cache=pts; return pts;
  }
  update(dt, time, params){
    const cohesion=params.cohesion, linkDist=params.linkDistance, transmitterPos=params.transmitterPos;
    const sepDist=0.65;
    const positions=[];
    for(let i=0;i<this.count;i++){
      const bot=this.bots[i], mesh=bot.mesh, vel=this.velocities[i], target=this.targets[i];
      const toTarget=target.clone().sub(mesh.position);
      const dist=toTarget.length();
      toTarget.normalize().multiplyScalar(0.05 * (0.2 + cohesion*1.8) * Math.min(dist*1.2, 3));

      // separation - optimized: sample every 2nd for mobile, every 1 for desktop but limited
      const sep=new THREE.Vector3(); let sepCount=0;
      const step = isMobile ? 3 : 2;
      for(let j=0;j<this.count;j+=step){
        if(i===j) continue;
        const other=this.bots[j].mesh.position;
        const d=mesh.position.distanceTo(other);
        if(d<sepDist && d>0.0001){
          const diff=mesh.position.clone().sub(other).normalize().divideScalar(d);
          sep.add(diff); sepCount++;
        }
      }
      if(sepCount>0){ sep.divideScalar(sepCount).normalize().multiplyScalar(0.035); }

      vel.add(toTarget); vel.add(sep);
      vel.multiplyScalar(0.94);
      vel.clampLength(0, 0.18);
      mesh.position.add(vel.clone().multiplyScalar(dt*60));

      if(vel.length()>0.001){ const look=mesh.position.clone().add(vel); mesh.lookAt(look); }
      mesh.rotation.x += Math.sin(time*0.001*3 + bot.phase)*0.01;

      if(!isMobile){
        const legs=mesh.userData.legs;
        if(legs) legs.forEach((leg,k)=>{ leg.rotation.z = (k%2===0?-0.4:0.4) + Math.sin(time*0.004 + i*0.1 + k)*0.2; });
      }

      const led=mesh.userData.led;
      if(led){
        led.material.color.set(isYokai ? 0xff1744 : 0x00e5ff);
        led.material.emissive.set(isYokai ? 0xff1744 : 0x00e5ff);
        const transDist=mesh.position.distanceTo(transmitterPos);
        led.material.emissiveIntensity = 1.5 + Math.sin(time*0.005 + i)*0.8 + (transDist<4 ? 1.5 :0);
      }
      positions.push(mesh.position);
    }

    // Links - grid hashing
    const linkPositions=[]; const gridSize=linkDist;
    const buckets=new Map();
    const keyFor=(v)=> `${Math.floor(v.x/gridSize)}_${Math.floor(v.y/gridSize)}_${Math.floor(v.z/gridSize)}`;
    for(let i=0;i<positions.length;i++){
      const k=keyFor(positions[i]); if(!buckets.has(k)) buckets.set(k, []); buckets.get(k).push(i);
    }
    const neighOffsets=[]; for(let dx=-1;dx<=1;dx++) for(let dy=-1;dy<=1;dy++) for(let dz=-1;dz<=1;dz++) neighOffsets.push([dx,dy,dz]);
    let linkCount=0; const maxLinks = isMobile ? 600 : 1200;
    for(let i=0;i<positions.length && linkCount<maxLinks;i++){
      const p=positions[i]; const baseKey=keyFor(p).split('_').map(Number);
      for(const off of neighOffsets){
        const nk=`${baseKey[0]+off[0]}_${baseKey[1]+off[1]}_${baseKey[2]+off[2]}`;
        const list=buckets.get(nk); if(!list) continue;
        for(const j of list){
          if(j<=i) continue;
          const d=p.distanceTo(positions[j]);
          if(d < linkDist){
            linkPositions.push(p.x, p.y, p.z, positions[j].x, positions[j].y, positions[j].z);
            linkCount++; if(linkCount>=maxLinks) break;
          }
        }
        if(linkCount>=maxLinks) break;
      }
    }
    this.linkGeometry.setAttribute('position', new THREE.Float32BufferAttribute(linkPositions, 3));
    this.linkGeometry.attributes.position.needsUpdate=true;
    this.linkGeometry.computeBoundingSphere();
    this.linkMaterial.color.set(isYokai ? 0xff1744 : 0x00e5ff);
    this.linkMaterial.opacity = isYokai ? (isMobile?0.16:0.22) : (isMobile?0.12:0.18);
    return linkCount;
  }
}

// ---------- Instantiate ---
let mode='orbit';
let count = isMobile ? 140 : 240;
const swarm = new MicroSwarm(count);

let mouse=new THREE.Vector2(0,0);
let transmitterTarget=new THREE.Vector3(0,2,0);
let raycaster=new THREE.Raycaster();
let plane=new THREE.Plane(new THREE.Vector3(0,1,0), -1);
let pointerDown=false;
let lastTap=0;

function screenToWorld(clientX, clientY){
  const rect=canvas.getBoundingClientRect();
  mouse.x=((clientX - rect.left)/rect.width)*2 -1;
  mouse.y=-((clientY - rect.top)/rect.height)*2 +1;
  raycaster.setFromCamera(mouse, camera);
  const intersectPoint=new THREE.Vector3();
  raycaster.ray.intersectPlane(plane, intersectPoint);
  if(!intersectPoint) return null;
  intersectPoint.x=THREE.MathUtils.clamp(intersectPoint.x, -12,12);
  intersectPoint.z=THREE.MathUtils.clamp(intersectPoint.z, -12,12);
  intersectPoint.y=2 + Math.sin(performance.now()*0.001)*0.2;
  return intersectPoint;
}

function updateTransmitter(clientX, clientY){
  const pt=screenToWorld(clientX, clientY);
  if(pt) transmitterTarget.copy(pt);
}

// Desktop mouse
canvas.addEventListener('pointermove', (e)=>{
  if(e.pointerType==='mouse' && e.buttons===1) updateTransmitter(e.clientX, e.clientY);
  else if(e.pointerType==='mouse' && !isMobile) {
    // hover transmitter follow
    if(!pointerDown && controlsEnabled) updateTransmitter(e.clientX, e.clientY);
  }
});
canvas.addEventListener('pointerdown', (e)=>{
  if(e.target.closest('.card') || e.target.closest('.hud-top') || e.target.closest('.perf-badge')) return;
  pointerDown=true;
  // disable orbit if directly moving transmitter on mobile
  if(isMobile){
    controls.enabled=false;
    updateTransmitter(e.clientX, e.clientY);
  } else {
    if(e.button===0) updateTransmitter(e.clientX, e.clientY);
  }
  const now=Date.now();
  if(now-lastTap<300){
    // double tap punch
    for(let i=0;i<swarm.count;i++){
      swarm.velocities[i].add(new THREE.Vector3((Math.random()-0.5)*3, Math.random()*2, (Math.random()-0.5)*3));
    }
    transMat.emissiveIntensity=10;
    setTimeout(()=> transMat.emissiveIntensity = isYokai ? 3 : 2.5, 160);
  }
  lastTap=now;
});
window.addEventListener('pointerup', ()=>{
  pointerDown=false;
  if(isMobile) controls.enabled=true;
});

// Touch area for mobile
const touchArea=document.getElementById('touchArea');
if(touchArea){
  touchArea.addEventListener('touchstart', (e)=>{
    if(e.target.closest('.panel-left') || e.target.closest('.hud-top')) return;
    const t=e.touches[0];
    if(t){
      controls.enabled=false;
      updateTransmitter(t.clientX, t.clientY);
    }
  }, {passive:true});
  touchArea.addEventListener('touchmove', (e)=>{
    const t=e.touches[0];
    if(t && !controls.enabled){
      e.preventDefault();
      updateTransmitter(t.clientX, t.clientY);
    }
  }, {passive:false});
  touchArea.addEventListener('touchend', ()=>{
    controls.enabled=true;
  });
}

canvas.addEventListener('dblclick', ()=>{
  for(let i=0;i<swarm.count;i++){ swarm.velocities[i].add(new THREE.Vector3((Math.random()-0.5)*2, Math.random()*1.5, (Math.random()-0.5)*2)); }
  transMat.emissiveIntensity=10;
  setTimeout(()=> transMat.emissiveIntensity = isYokai ? 3 : 2.5, 160);
});

// ---------- Bottom Sheet ----------
const panelLeft=document.getElementById('panelLeft');
const menuToggle=document.getElementById('menuToggle');
const sheetHandle=document.getElementById('sheetHandle');
let sheetOpen = window.innerWidth > 1024; // open by default desktop

function setSheet(open){
  sheetOpen=open;
  if(window.innerWidth <= 1024){
    panelLeft.classList.toggle('open', open);
    menuToggle.innerHTML = open ? `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"/></svg>` 
                               : `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 7h16M4 12h16M4 17h16"/></svg>`;
  }
}
menuToggle?.addEventListener('click', ()=> setSheet(!sheetOpen));
sheetHandle?.addEventListener('click', ()=> setSheet(!sheetOpen));
// swipe handle drag
let startY=0, startTrans=0;
sheetHandle?.addEventListener('touchstart', (e)=>{ startY=e.touches[0].clientY; }, {passive:true});
sheetHandle?.addEventListener('touchmove', (e)=>{
  const dy=e.touches[0].clientY - startY;
  if(dy < -30) setSheet(true);
  if(dy > 40) setSheet(false);
}, {passive:true});

// ---------- Single Viewer ----------
function initViewer(id, mobile=false){
  const c=document.getElementById(id);
  if(!c) return;
  const renderer2=new THREE.WebGLRenderer({ canvas:c, alpha:true, antialias:!isMobile });
  renderer2.setPixelRatio(Math.min(window.devicePixelRatio, 1.6));
  const resize=()=>{
    const w=c.clientWidth, h=c.clientHeight || 200;
    renderer2.setSize(w,h,false);
    cam2.aspect=w/h; cam2.updateProjectionMatrix();
  };
  const w=c.clientWidth, h=c.clientHeight || 260;
  renderer2.setSize(w,h,false);
  const scene2=new THREE.Scene();
  const cam2=new THREE.PerspectiveCamera(35, w/(h||260), 0.1, 100);
  cam2.position.set(1.5,0.8,1.2);
  const ctrl2=new OrbitControls(cam2, c);
  ctrl2.enableDamping=true; ctrl2.autoRotate=true; ctrl2.autoRotateSpeed=1.8; ctrl2.enableZoom=false;
  scene2.add(new THREE.AmbientLight(0x888caa, 1.2));
  const dl=new THREE.DirectionalLight(0xffffff,2); dl.position.set(2,4,2); scene2.add(dl);
  const dl2=new THREE.DirectionalLight(0x00e5ff,1.5); dl2.position.set(-2,1,-2); scene2.add(dl2);
  const bot=createMicrobotMesh(true, mobile); bot.scale.set(mobile?1.4:1.8, mobile?1.4:1.8, mobile?1.4:1.8); bot.position.y=-0.1; scene2.add(bot);
  const floorGeo=new THREE.CircleGeometry(1.5,32); const floorMat=new THREE.MeshStandardMaterial({ color:0x0c0f18, roughness:0.2, metalness:0.8, transparent:true, opacity:0.6 });
  const floor=new THREE.Mesh(floorGeo,floorMat); floor.rotation.x=-Math.PI/2; floor.position.y=-0.28; scene2.add(floor);
  const grid2=new THREE.GridHelper(4, 20, 0x1b2133, 0x121620); grid2.position.y=-0.27; scene2.add(grid2);
  const animate2=()=>{ requestAnimationFrame(animate2); bot.rotation.y+=0.003; const led=bot.userData.led; if(led){ led.material.color.set(isYokai ? 0xff1744 : 0x00e5ff); led.material.emissive.set(isYokai ? 0xff1744 : 0x00e5ff);} ctrl2.update(); renderer2.render(scene2,cam2); };
  animate2();
  window.addEventListener('resize', resize);
  new ResizeObserver(resize).observe(c.parentElement);
}
initViewer('microSingle', false);
initViewer('microSingleMobile', true);
if(isMobile){
  const mCard=document.getElementById('mobileBlueprintCard');
  if(mCard) mCard.style.display='block';
}

// ---------- UI Controls ---
const modeButtons=document.querySelectorAll('.mode-btn');
modeButtons.forEach(btn=>{
  btn.addEventListener('click', ()=>{
    document.querySelectorAll('.mode-btn').forEach(b=>b.classList.remove('active','yokai-active'));
    mode=btn.dataset.mode;
    const label=document.getElementById('modeLabel'); if(label) label.textContent=mode.toUpperCase();
    if(isYokai) btn.classList.add('yokai-active'); else btn.classList.add('active');
    if(mode==='scatter') swarm.updateTargets('scatter', performance.now(), transmitterTarget);
    // haptic
    if(navigator.vibrate) navigator.vibrate(12);
    // close sheet a bit on mobile after selection? keep open
  });
});

const countSlider=document.getElementById('count');
const countVal=document.getElementById('countVal');
const cohesionSlider=document.getElementById('cohesion');
const cohesionVal=document.getElementById('cohesionVal');
const linkSlider=document.getElementById('linkDist');
const linkVal=document.getElementById('linkVal');

countSlider.addEventListener('input', (e)=>{
  count=parseInt(e.target.value); countVal.textContent=count;
  document.getElementById('activeCount').textContent=count;
  const mEl=document.getElementById('activeCountM'); if(mEl) mEl.textContent=count;
});
countSlider.addEventListener('change', (e)=>{
  swarm.setCount(parseInt(e.target.value));
});

cohesionSlider.addEventListener('input', (e)=>{ cohesionVal.textContent=parseFloat(e.target.value).toFixed(2); });
linkSlider.addEventListener('input', (e)=>{ linkVal.textContent=parseFloat(e.target.value).toFixed(1); });

function setYokai(y){
  isYokai=y;
  const status=document.getElementById('transStatus');
  const label=document.getElementById('transLabel');
  if(y){
    status.classList.add('yokai'); label.textContent=isMobile ? 'YOKAI • 5.8GHz' : 'NEURO-TRANSMITTER: YOKAI • 5.8GHz OVERRIDE';
    transMat.color.set(0xff1744); transMat.emissive.set(0xff1744); transRingMat.color.set(0xff1744);
    pointA.color.set(0xff1744);
    modeButtons.forEach(b=>{ if(b.classList.contains('active')){ b.classList.remove('active'); b.classList.add('yokai-active'); }});
  } else {
    status.classList.remove('yokai'); label.textContent=isMobile ? 'HIRO • 2.4GHz' : 'NEURO-TRANSMITTER: HIRO • 2.4GHz LINKED';
    transMat.color.set(0x00e5ff); transMat.emissive.set(0x00e5ff); transRingMat.color.set(0x00e5ff);
    pointA.color.set(0x00e5ff);
    modeButtons.forEach(b=>{ if(b.classList.contains('yokai-active')){ b.classList.remove('yokai-active'); b.classList.add('active'); }});
  }
  if(navigator.vibrate) navigator.vibrate(y?[20,30,20]:[10]);
}
document.getElementById('btnHiro').addEventListener('click', ()=> setYokai(false));
document.getElementById('btnYokai').addEventListener('click', ()=> setYokai(true));
window.addEventListener('keydown', (e)=>{ if(e.key.toLowerCase()==='b') setYokai(false); if(e.key.toLowerCase()==='r') setYokai(true); });

// ---------- Loader + Mobile Hint ----------
window.addEventListener('load', ()=>{
  setTimeout(()=>{
    document.getElementById('loader')?.classList.add('hidden');
    const mh=document.getElementById('mobileHint');
    if(isMobile && mh){
      mh.style.display='flex';
      setTimeout(()=> mh.classList.add('hide'), 3800);
      setTimeout(()=> mh.style.display='none', 4300);
    }
  }, isMobile ? 700 : 400);
});

// ---------- Animation Loop ----------
let last=performance.now(); let fpsAcc=0, fpsCount=0, lastFpsTime=performance.now(); let linkCountDisplay=0;
function animate(){
  requestAnimationFrame(animate);
  const now=performance.now(); const dt=Math.min((now-last)/1000, 0.05); last=now;

  transmitter.position.lerp(transmitterTarget, 0.08);
  pointA.position.copy(transmitter.position); pointA.position.y+=0.5;
  transmitter.rotation.y+=dt*0.8; transRing.rotation.z+=dt*0.6;

  swarm.updateTargets(mode, now, transmitter.position);
  const linkCount=swarm.update(dt, now, {
    cohesion: parseFloat(cohesionSlider.value),
    linkDistance: parseFloat(linkSlider.value),
    transmitterPos: transmitter.position
  });
  linkCountDisplay=linkCount;

  controls.update();
  renderer.render(scene,camera);

  fpsAcc+=1/dt; fpsCount++;
  if(now - lastFpsTime > 500){
    const fps=Math.round(fpsAcc/fpsCount).toString();
    document.getElementById('fps').textContent=fps;
    const fpsM=document.getElementById('fpsM'); if(fpsM) fpsM.textContent=fps;
    document.getElementById('linkCount').textContent=linkCountDisplay.toString();
    fpsAcc=0; fpsCount=0; lastFpsTime=now;
  }
}
animate();

window.addEventListener('resize', ()=>{
  renderer.setSize(window.innerWidth, window.innerHeight);
  camera.aspect=window.innerWidth/window.innerHeight;
  camera.updateProjectionMatrix();
  // adjust count max for mobile rotary orientation change?
});

// Initial positions
setTimeout(()=>{ transmitterTarget.set(isMobile?2:3,2,isMobile?2:2); }, 400);

// PWA install prompt suppress safe
window.addEventListener('touchmove', (e)=>{
  // allow scrolling inside panel, prevent elsewhere bounce
  if(e.target.closest('.sheet-scroll')) return;
  if(e.target.closest('canvas')) { e.preventDefault(); }
}, {passive:false});
