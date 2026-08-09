import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { getFormation } from './formations.js';
import { Joystick } from './joystick.js';

// Detect mobile
const isMobile = /Android|iPhone|iPad|iPod|Mobi/i.test(navigator.userAgent) || window.innerWidth <= 1024;
const isTouch = 'ontouchstart' in window;

// Canvas & Renderer
const canvas = document.getElementById('canvas');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: !isMobile, alpha:true, powerPreference:'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, isMobile?1.6:2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.15;

const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x08090c, isMobile?0.022:0.017);

const camera = new THREE.PerspectiveCamera(isMobile?62:55, window.innerWidth/window.innerHeight, 0.1, 100);
camera.position.set(0, isMobile?8:6, isMobile?16:18);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping=true; controls.dampingFactor=0.09;
controls.minDistance=isMobile?2.5:3; controls.maxDistance=isMobile?38:45;
controls.target.set(0,2,0);
controls.enablePan=true; controls.panSpeed=0.8;
controls.touches={ ONE: THREE.TOUCH.ROTATE, TWO: THREE.TOUCH.DOLLY_PAN };
controls.mouseButtons={ LEFT: THREE.MOUSE.ROTATE, MIDDLE: THREE.MOUSE.DOLLY, RIGHT: THREE.MOUSE.PAN };

// Lights
scene.add(new THREE.AmbientLight(0x7a85a6,0.7));
const keyLight=new THREE.DirectionalLight(0xdde6ff,2.2); keyLight.position.set(8,15,6); scene.add(keyLight);
const fillLight=new THREE.DirectionalLight(0x223044,1.2); fillLight.position.set(-8,4,-8); scene.add(fillLight);

let theme='hiro';
const themes={
  hiro:{ color:0x00e5ff, emissive:0x00e5ff },
  yokai:{ color:0xff1744, emissive:0xff1744 },
  gogo:{ color:0xffe600, emissive:0xffe600 },
  wasabi:{ color:0x29ff7a, emissive:0x29ff7a },
  honey:{ color:0xff6bd6, emissive:0xff6bd6 },
  fred:{ color:0x5a7bff, emissive:0x5a7bff },
};
let accent=new THREE.Color(themes[theme].color);

const pointA=new THREE.PointLight(themes[theme].color, isMobile?5:8, 30); pointA.position.set(0,1,0); scene.add(pointA);
const pointB=new THREE.PointLight(0x4a5fff, isMobile?2:4, 30); pointB.position.set(-6,6,-4); scene.add(pointB);

const grid=new THREE.GridHelper(120, isMobile?60:100, 0x1c2132, 0x141824); grid.position.y=-2.2; scene.add(grid);

// transmitter
const transGeo=new THREE.SphereGeometry(isMobile?0.44:0.36, isMobile?20:32, isMobile?20:32);
const transMat=new THREE.MeshStandardMaterial({ color:themes[theme].color, emissive:themes[theme].color, emissiveIntensity:2.6, roughness:0.2, metalness:0.2, transparent:true, opacity:0.92 });
const transmitter=new THREE.Mesh(transGeo, transMat); transmitter.position.set(0,2,0); scene.add(transmitter);
const ringMat1=new THREE.MeshBasicMaterial({ color:themes[theme].color, side:THREE.DoubleSide, transparent:true, opacity:0.7 });
const transRing=new THREE.Mesh(new THREE.RingGeometry(0.62,0.68, isMobile?32:64), ringMat1); transRing.rotation.x=Math.PI/2; transRing.position.y=0.02; transmitter.add(transRing);
const ringMat2=new THREE.MeshBasicMaterial({ color:themes[theme].color, side:THREE.DoubleSide, transparent:true, opacity:0.32 });
const transRing2=new THREE.Mesh(new THREE.RingGeometry(1.15,1.2, isMobile?28:64), ringMat2); transRing2.rotation.x=Math.PI/2; transRing2.position.y=-0.08; transmitter.add(transRing2);

// vertical line for height
const vLineGeo=new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0,0,0), new THREE.Vector3(0,-4,0)]);
const vLineMat=new THREE.LineDashedMaterial({ color:themes[theme].color, transparent:true, opacity:0.35, dashSize:0.2, gapSize:0.15 });
const vLine=new THREE.Line(vLineGeo, vLineMat); vLine.computeLineDistances(); vLine.position.y=0; transmitter.add(vLine);

// Microbot prefab
function createMicrobotMesh(isLeader=false, lowPoly=false){
  const group=new THREE.Group();
  const bodyGeo=new THREE.BoxGeometry(0.55,0.22,0.38);
  const bodyMat=new THREE.MeshStandardMaterial({ color:0x101216, roughness:0.35, metalness:0.8 });
  const body=new THREE.Mesh(bodyGeo,bodyMat); group.add(body);
  const topGeo=new THREE.BoxGeometry(0.48,0.06,0.31);
  const topMat=new THREE.MeshStandardMaterial({ color:0x1a1f2b, roughness:0.3, metalness:0.6 });
  const top=new THREE.Mesh(topGeo, topMat); top.position.y=0.12; group.add(top);
  const ledGeo=new THREE.BoxGeometry(0.12,0.02,0.12);
  const ledMat=new THREE.MeshStandardMaterial({ color:themes[theme].color, emissive:themes[theme].color, emissiveIntensity: isLeader?6:2.5 });
  const led=new THREE.Mesh(ledGeo,ledMat); led.position.set(0,0.16,0); group.add(led); group.userData.led=led;
  const legMat=new THREE.MeshStandardMaterial({ color:0x0a0b0f, roughness:0.5, metalness:0.5 });
  const legPositions=[[-0.22,-0.08,0.12],[0.22,-0.08,0.12],[-0.22,-0.08,-0.12],[0.22,-0.08,-0.12]];
  const legs=[];
  legPositions.forEach(p=>{
    const legGeo=new THREE.CapsuleGeometry(0.035,0.18,2,6);
    const leg=new THREE.Mesh(legGeo,legMat); leg.position.set(p[0],p[1]-0.05,p[2]); leg.rotation.z=p[0]>0?-0.4:0.4; leg.rotation.x=p[2]>0?0.2:-0.2; group.add(leg); legs.push(leg);
    const tipGeo=new THREE.SphereGeometry(0.05,6,6);
    const tipMat=new THREE.MeshStandardMaterial({ color:0x2c3447, metalness:0.9, roughness:0.3 });
    const tip=new THREE.Mesh(tipGeo,tipMat); tip.position.y=-0.12; leg.add(tip);
  });
  group.userData.legs=legs;
  return group;
}

// Swarm class
class MicroSwarm{
  constructor(count){
    this.count=count; this.bots=[]; this.targets=[]; this.velocities=[]; this.visibleCount=count;
    this.group=new THREE.Group(); scene.add(this.group);
    this.linkGeometry=new THREE.BufferGeometry();
    this.linkMaterial=new THREE.LineBasicMaterial({ color:themes[theme].color, transparent:true, opacity:isMobile?0.13:0.18, depthWrite:false });
    this.linkLines=new THREE.LineSegments(this.linkGeometry, this.linkMaterial); scene.add(this.linkLines);
    this.buildProgress=1; // 0..1 for auto build
    this.initBots();
  }
  initBots(){
    this.bots.forEach(b=>this.group.remove(b.mesh));
    this.bots=[]; this.velocities=[]; this.targets=[];
    const lowPoly=isMobile && this.count>180;
    for(let i=0;i<this.count;i++){
      const mesh=createMicrobotMesh(i===0, lowPoly);
      const r=8*Math.cbrt(Math.random()); const th=Math.random()*Math.PI*2; const ph=Math.acos(2*Math.random()-1);
      mesh.position.set(r*Math.sin(ph)*Math.cos(th), r*Math.sin(ph)*Math.sin(th)*0.6+2, r*Math.cos(ph));
      mesh.rotation.set(Math.random()*Math.PI, Math.random()*Math.PI, Math.random()*Math.PI);
      this.group.add(mesh);
      this.bots.push({ mesh, phase: Math.random()*Math.PI*2 });
      this.velocities.push(new THREE.Vector3(0,0,0));
      this.targets.push(mesh.position.clone());
    }
    this.visibleCount=this.count;
  }
  setCount(n){
    if(n===this.count) return;
    this.count=n; this.initBots();
  }
  setTargetsFromPoints(points){
    // points is array of Vector3 length >= count, assign
    for(let i=0;i<this.count;i++){
      if(i<points.length) this.targets[i].copy(points[i]);
    }
  }
  update(dt, time, params){
    const cohesion=params.cohesion, linkDist=params.linkDistance, transmitterPos=params.transmitterPos, speed=params.buildSpeed||1;
    const sepDist=0.65;
    const positions=[];
    const visible = Math.floor(this.count * this.buildProgress);
    this.visibleCount=visible;

    for(let i=0;i<this.count;i++){
      const bot=this.bots[i], mesh=bot.mesh, vel=this.velocities[i], target=this.targets[i];
      const isHidden=i>=visible;
      mesh.visible=!isHidden;
      if(isHidden) continue;

      const toTarget=target.clone().sub(mesh.position);
      const dist=toTarget.length();
      toTarget.normalize().multiplyScalar(0.05 * (0.2 + cohesion*1.8) * Math.min(dist*1.2, 4) * speed);

      // separation sampling
      const sep=new THREE.Vector3(); let sepCount=0;
      const step=isMobile?3:2;
      for(let j=0;j<this.count;j+=step){
        if(i===j) continue; if(j>=visible) continue;
        const other=this.bots[j].mesh.position;
        const d=mesh.position.distanceTo(other);
        if(d<sepDist && d>0.0001){
          const diff=mesh.position.clone().sub(other).normalize().divideScalar(d);
          sep.add(diff); sepCount++;
        }
      }
      if(sepCount>0) sep.divideScalar(sepCount).normalize().multiplyScalar(0.035);

      vel.add(toTarget); vel.add(sep);
      vel.multiplyScalar(0.94); vel.clampLength(0,0.20*speed);
      mesh.position.add(vel.clone().multiplyScalar(dt*60));

      if(vel.length()>0.001){ const look=mesh.position.clone().add(vel); mesh.lookAt(look); }
      mesh.rotation.x+=Math.sin(time*0.001*3 + bot.phase)*0.01;

      if(!isMobile){
        const legs=mesh.userData.legs;
        if(legs) legs.forEach((leg,k)=>{ leg.rotation.z=(k%2===0?-0.4:0.4)+Math.sin(time*0.004 + i*0.1 + k)*0.2; });
      }

      const led=mesh.userData.led;
      if(led){
        led.material.color.set(themes[theme].color);
        led.material.emissive.set(themes[theme].color);
        const transDist=mesh.position.distanceTo(transmitterPos);
        led.material.emissiveIntensity=1.5 + Math.sin(time*0.005 + i)*0.8 + (transDist<4?1.5:0);
      }
      positions.push(mesh.position);
    }

    // links via hash
    const linkPositions=[]; const gridSize=linkDist;
    const buckets=new Map();
    const keyFor=v=> `${Math.floor(v.x/gridSize)}_${Math.floor(v.y/gridSize)}_${Math.floor(v.z/gridSize)}`;
    const posList=positions;
    // Map from positions index to original bot? We lost mapping because hidden skipped, but for link we need positions array only.
    // For buckets we need to use positions array index
    for(let i=0;i<posList.length;i++){
      const k=keyFor(posList[i]); if(!buckets.has(k)) buckets.set(k, []); buckets.get(k).push(i);
    }
    const neighOffsets=[]; for(let dx=-1;dx<=1;dx++) for(let dy=-1;dy<=1;dy++) for(let dz=-1;dz<=1;dz++) neighOffsets.push([dx,dy,dz]);
    let linkCount=0; const maxLinks=isMobile?600:1200;
    for(let i=0;i<posList.length && linkCount<maxLinks;i++){
      const p=posList[i]; const baseKey=keyFor(p).split('_').map(Number);
      for(const off of neighOffsets){
        const nk=`${baseKey[0]+off[0]}_${baseKey[1]+off[1]}_${baseKey[2]+off[2]}`;
        const list=buckets.get(nk); if(!list) continue;
        for(const j of list){
          if(j<=i) continue;
          const d=p.distanceTo(posList[j]);
          if(d<linkDist){
            linkPositions.push(p.x,p.y,p.z,posList[j].x,posList[j].y,posList[j].z);
            linkCount++; if(linkCount>=maxLinks) break;
          }
        }
        if(linkCount>=maxLinks) break;
      }
    }
    this.linkGeometry.setAttribute('position', new THREE.Float32BufferAttribute(linkPositions,3));
    this.linkGeometry.attributes.position.needsUpdate=true;
    this.linkGeometry.computeBoundingSphere();
    this.linkMaterial.color.set(themes[theme].color);
    this.linkMaterial.opacity = theme==='yokai' ? (isMobile?0.16:0.22) : (isMobile?0.12:0.18);
    return linkCount;
  }
}

// Instantiate
let mode='orbit';
let count=isMobile?140:240;
const swarm=new MicroSwarm(count);
let transmitterTarget=new THREE.Vector3(0,2,0);
let raycaster=new THREE.Raycaster();
let plane=new THREE.Plane(new THREE.Vector3(0,1,0), -1);
let mouse=new THREE.Vector2();
let interactionMode='build'; // build or camera
let isTransmitterDragging=false;
let autoBuild=false;
let buildProg=1;
let lastTap=0;

// Formations list for UI
const formationDefs=[
  {id:'orbit', label:'ORBIT', desc:'Idle hold', icon:'🌀', cat:'physics'},
  {id:'tower', label:'TOWER', desc:'Vertical', icon:'🏗️', cat:'arch'},
  {id:'sphere', label:'SPHERE', desc:'Hollow shell', icon:'🔮', cat:'physics'},
  {id:'wave', label:'WAVE', desc:'Sine surface', icon:'🌊', cat:'physics'},
  {id:'bridge', label:'BRIDGE', desc:'Span link', icon:'🌉', cat:'arch'},
  {id:'bh6', label:'BH-6', desc:'Logo build', icon:'⚡', cat:'fun'},
  {id:'vortex', label:'VORTEX', desc:'High spiral', icon:'🌪️', cat:'physics'},
  {id:'eiffel', label:'EIFFEL', desc:'Paris tower', icon:'🗼', cat:'arch'},
  {id:'dna', label:'DNA', desc:'Double helix', icon:'🧬', cat:'organic'},
  {id:'heart', label:'HEART', desc:'Beating heart', icon:'❤️', cat:'organic'},
  {id:'baymax', label:'BAYMAX', desc:'Healthcare', icon:'🤖', cat:'organic'},
  {id:'cube', label:'CUBE', desc:'Wireframe', icon:'🧊', cat:'physics'},
  {id:'pyramid', label:'PYRAMID', desc:'Ancient', icon:'🔺', cat:'arch'},
  {id:'stairs', label:'STAIRS', desc:'Spiral stairs', icon:'🌀', cat:'arch'},
  {id:'infinity', label:'INFINITY', desc:'Figure-8', icon:'♾️', cat:'physics'},
  {id:'torus', label:'TORUS', desc:'Donut', icon:'🍩', cat:'physics'},
  {id:'dragon', label:'DRAGON', desc:'Serpent', icon:'🐉', cat:'organic'},
  {id:'shield', label:'SHIELD', desc:'Protection', icon:'🛡️', cat:'fun'},
  {id:'funnel', label:'FUNNEL', desc:'Tornado', icon:'🌪️', cat:'physics'},
  {id:'hiro', label:'HIRO', desc:'Text build', icon:'🔤', cat:'fun'},
  {id:'city', label:'CITY', desc:'Skyline', icon:'🏙️', cat:'arch'},
  {id:'hand', label:'HAND', desc:'Grab', icon:'🖐️', cat:'organic'},
  {id:'satellite', label:'DISH', desc:'Satellite', icon:'📡', cat:'arch'},
  {id:'helixRing', label:'RINGS', desc:'Helix rings', icon:'💍', cat:'physics'},
  {id:'scatter', label:'SCATTER', desc:'Chaos', icon:'💥', cat:'fun'},
];

const modesContainer=document.getElementById('modes');
function renderModes(filter='all'){
  modesContainer.innerHTML='';
  formationDefs.forEach(def=>{
    if(filter!=='all' && def.cat!==filter) return;
    const btn=document.createElement('button');
    btn.className='mode-btn' + (def.id===mode? (theme==='yokai'?' yokai-active':' active'):'');
    btn.dataset.mode=def.id;
    btn.innerHTML=`<b><i>${def.icon}</i> ${def.label}</b><small>${def.desc}</small><span class="count">${def.cat}</span>`;
    btn.addEventListener('click', ()=>{
      document.querySelectorAll('.mode-btn').forEach(b=>b.classList.remove('active','yokai-active'));
      mode=def.id;
      btn.classList.add(theme==='yokai'?'yokai-active':'active');
      document.getElementById('modeLabel').textContent=mode.toUpperCase();
      document.getElementById('modeLabelM').textContent=mode.toUpperCase();
      if(mode==='scatter') swarm.buildProgress=1;
      else if(autoBuild){ swarm.buildProgress=0.02; buildProg=0.02; }
      if(navigator.vibrate) navigator.vibrate(12);
    });
    modesContainer.appendChild(btn);
  });
}
renderModes('all');

document.querySelectorAll('.chip').forEach(chip=>{
  chip.addEventListener('click', ()=>{
    document.querySelectorAll('.chip').forEach(c=>c.classList.remove('active'));
    chip.classList.add('active');
    renderModes(chip.dataset.cat);
  });
});

// Screen to world
function screenToWorld(clientX,clientY){
  const rect=canvas.getBoundingClientRect();
  mouse.x=((clientX - rect.left)/rect.width)*2 -1;
  mouse.y=-((clientY - rect.top)/rect.height)*2 +1;
  raycaster.setFromCamera(mouse, camera);
  const pt=new THREE.Vector3();
  raycaster.ray.intersectPlane(plane, pt);
  if(!pt) return null;
  pt.x=THREE.MathUtils.clamp(pt.x, -14,14);
  pt.z=THREE.MathUtils.clamp(pt.z, -14,14);
  // y controlled separately
  return pt;
}
function updateTransmitterFromScreen(x,y, keepY=true){
  const pt=screenToWorld(x,y);
  if(!pt) return;
  transmitterTarget.x=pt.x;
  transmitterTarget.z=pt.z;
  if(!keepY){
    // allow y from ray? plane is y constant, so keep existing height otherwise
  }
}

// Desktop mouse handling + mobile half-screen logic
canvas.addEventListener('pointerdown', (e)=>{
  if(e.target.closest('.card') || e.target.closest('.hud-top') || e.target.closest('.float-controls') || e.target.closest('.joystick')) return;

  const isRightHalf = e.clientX > window.innerWidth/2;

  if(isMobile){
    if(interactionMode==='build'){
      if(!isRightHalf){
        // left half => move transmitter
        isTransmitterDragging=true;
        controls.enabled=false;
        updateTransmitterFromScreen(e.clientX, e.clientY);
      } else {
        // right half => camera
        isTransmitterDragging=false;
        controls.enabled=true;
      }
    } else {
      // camera mode: always allow camera, but left joystick also moves transmitter
      if(!isRightHalf){
        isTransmitterDragging=true;
        controls.enabled=false;
        updateTransmitterFromScreen(e.clientX, e.clientY);
      }
    }
  } else {
    // desktop: always move on left click + drag? we move on mouse move hover but also drag
    if(e.button===0){
      updateTransmitterFromScreen(e.clientX, e.clientY);
      isTransmitterDragging=true;
    }
  }

  // double tap detection for punch
  const now=Date.now();
  if(now-lastTap<300){
    for(let i=0;i<swarm.count;i++) swarm.velocities[i].add(new THREE.Vector3((Math.random()-0.5)*3, Math.random()*2, (Math.random()-0.5)*3));
    transMat.emissiveIntensity=10;
    setTimeout(()=> transMat.emissiveIntensity= theme==='yokai'?3:2.6, 160);
    if(navigator.vibrate) navigator.vibrate([20,30,20]);
  }
  lastTap=now;
});

canvas.addEventListener('pointermove', (e)=>{
  if(isMobile){
    if(isTransmitterDragging && (e.buttons===1 || e.pointerType==='touch')){
      updateTransmitterFromScreen(e.clientX, e.clientY);
    }
    // if not dragging transmitter and in build mode with left half, still allow camera on right half via controls (controls handles internally)
  } else {
    if(e.buttons===1 && isTransmitterDragging){
      updateTransmitterFromScreen(e.clientX, e.clientY);
    } else if(!isTransmitterDragging){
      // hover moves transmitter lightly on desktop
      if(e.pointerType==='mouse') updateTransmitterFromScreen(e.clientX, e.clientY);
    }
  }
});

window.addEventListener('pointerup', ()=>{
  isTransmitterDragging=false;
  if(isMobile) controls.enabled=true;
  else controls.enabled=true;
});

// Touch pinch zoom handling (custom + orbit controls)
let lastPinchDist=0;
canvas.addEventListener('touchstart', (e)=>{
  if(e.touches.length===2){
    const dx=e.touches[0].clientX - e.touches[1].clientX;
    const dy=e.touches[0].clientY - e.touches[1].clientY;
    lastPinchDist=Math.hypot(dx,dy);
    // if both touches on same half, allow camera
    controls.enabled=true;
    isTransmitterDragging=false;
  }
}, {passive:true});

canvas.addEventListener('touchmove', (e)=>{
  if(e.touches.length===2){
    const dx=e.touches[0].clientX - e.touches[1].clientX;
    const dy=e.touches[0].clientY - e.touches[1].clientY;
    const dist=Math.hypot(dx,dy);
    const delta=dist-lastPinchDist;
    // zoom factor
    const zoomFactor=1 - delta*0.005;
    // dolly camera towards target
    const dir=camera.position.clone().sub(controls.target).normalize();
    const curDist=camera.position.distanceTo(controls.target);
    let newDist=curDist*zoomFactor;
    newDist=THREE.MathUtils.clamp(newDist, controls.minDistance, controls.maxDistance);
    camera.position.copy(controls.target.clone().add(dir.multiplyScalar(newDist)));
    lastPinchDist=dist;
    // prevent default bounce
    if(e.cancelable) e.preventDefault();
  } else if(e.touches.length===1 && isMobile){
    const touch=e.touches[0];
    const isLeft=touch.clientX < window.innerWidth/2;
    if(interactionMode==='build' && isLeft && isTransmitterDragging){
      updateTransmitterFromScreen(touch.clientX, touch.clientY);
      if(e.cancelable) e.preventDefault();
    }
  }
}, {passive:false});

// Joysticks
let joyTrans, joyCam;
if(isMobile){
  const joyTransEl=document.getElementById('joyTrans');
  const joyCamEl=document.getElementById('joyCam');
  if(joyTransEl){
    joyTrans=new Joystick(joyTransEl, {
      maxRadius:42,
      onMove: (v)=>{
        // move transmitter
        const speed=0.18;
        transmitterTarget.x += v.x * speed;
        transmitterTarget.z += -v.y * speed; // invert y
        transmitterTarget.x=THREE.MathUtils.clamp(transmitterTarget.x, -14,14);
        transmitterTarget.z=THREE.MathUtils.clamp(transmitterTarget.z, -14,14);
      }
    });
  }
  if(joyCamEl){
    joyCam=new Joystick(joyCamEl, {
      maxRadius:42,
      onMove: (v)=>{
        // orbit camera
        const rotSpeed=0.06;
        // spherical
        const offset=camera.position.clone().sub(controls.target);
        const spherical=new THREE.Spherical().setFromVector3(offset);
        spherical.theta -= v.x * rotSpeed;
        spherical.phi += v.y * rotSpeed;
        spherical.phi=THREE.MathUtils.clamp(spherical.phi, 0.2, Math.PI/2 -0.05);
        const newOffset=new THREE.Vector3().setFromSpherical(spherical);
        camera.position.copy(controls.target.clone().add(newOffset));
        controls.update();
      }
    });
  }
}

// Float zoom buttons
const btnZoomIn=document.getElementById('btnZoomIn');
const btnZoomOut=document.getElementById('btnZoomOut');
const btnTransUp=document.getElementById('btnTransUp');
const btnTransDown=document.getElementById('btnTransDown');
const btnResetCam=document.getElementById('btnResetCam');

function zoomCamera(factor){
  const dir=camera.position.clone().sub(controls.target).normalize();
  let curDist=camera.position.distanceTo(controls.target);
  let newDist=curDist*factor;
  newDist=THREE.MathUtils.clamp(newDist, controls.minDistance, controls.maxDistance);
  camera.position.copy(controls.target.clone().add(dir.multiplyScalar(newDist)));
}
let zoomInterval=null;
function startZoom(factor){
  zoomCamera(factor);
  zoomInterval=setInterval(()=> zoomCamera(factor), 32);
}
function stopZoom(){ clearInterval(zoomInterval); }

btnZoomIn?.addEventListener('pointerdown', ()=> startZoom(0.94));
btnZoomIn?.addEventListener('pointerup', stopZoom);
btnZoomIn?.addEventListener('pointerleave', stopZoom);
btnZoomOut?.addEventListener('pointerdown', ()=> startZoom(1.06));
btnZoomOut?.addEventListener('pointerup', stopZoom);
btnZoomOut?.addEventListener('pointerleave', stopZoom);

btnTransUp?.addEventListener('pointerdown', ()=> {
  let intUp=setInterval(()=>{
    transmitterTarget.y+=0.12;
    transmitterTarget.y=THREE.MathUtils.clamp(transmitterTarget.y, -1, 12);
    plane.constant=-transmitterTarget.y;
  },32);
  const stop=()=>{ clearInterval(intUp); window.removeEventListener('pointerup', stop); };
  window.addEventListener('pointerup', stop);
});
btnTransDown?.addEventListener('pointerdown', ()=> {
  let intDown=setInterval(()=>{
    transmitterTarget.y-=0.12;
    transmitterTarget.y=THREE.MathUtils.clamp(transmitterTarget.y, -1,12);
    plane.constant=-transmitterTarget.y;
  },32);
  const stop=()=>{ clearInterval(intDown); window.removeEventListener('pointerup', stop); };
  window.addEventListener('pointerup', stop);
});

btnResetCam?.addEventListener('click', ()=>{
  camera.position.set(0, isMobile?8:6, isMobile?16:18);
  controls.target.set(0,2,0);
  controls.update();
  transmitterTarget.set(0,2,0);
  plane.constant=-2;
});

// Interaction mode toggle
const segButtons=document.querySelectorAll('.seg-btn');
const cameraToggleBtn=document.getElementById('btnCameraToggle');
function setInteractionMode(m){
  interactionMode=m;
  segButtons.forEach(b=> b.classList.toggle('active', b.dataset.seg===m));
  if(cameraToggleBtn) cameraToggleBtn.textContent = m==='camera' ? 'BUILD MODE' : 'CAMERA MODE';
  if(m==='camera'){
    // show right joystick more prominent, hide left? keep both
    document.getElementById('joyTrans')?.classList.remove('active');
  }
}
segButtons.forEach(b=> b.addEventListener('click', ()=> setInteractionMode(b.dataset.seg)));
cameraToggleBtn?.addEventListener('click', ()=> setInteractionMode(interactionMode==='build'?'camera':'build'));

// Bottom sheet
const panelLeft=document.getElementById('panelLeft');
const menuToggle=document.getElementById('menuToggle');
const sheetHandle=document.getElementById('sheetHandle');
let sheetOpen=window.innerWidth>1180;
function setSheet(open){
  sheetOpen=open;
  if(window.innerWidth<=1180){
    panelLeft.classList.toggle('open', open);
    menuToggle.innerHTML=open?`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"/></svg>`:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 7h16M4 12h16M4 17h16"/></svg>`;
  }
}
menuToggle?.addEventListener('click', ()=> setSheet(!sheetOpen));
sheetHandle?.addEventListener('click', ()=> setSheet(!sheetOpen));
let startY=0;
sheetHandle?.addEventListener('touchstart', e=>{ startY=e.touches[0].clientY; }, {passive:true});
sheetHandle?.addEventListener('touchmove', e=>{
  const dy=e.touches[0].clientY - startY;
  if(dy<-30) setSheet(true);
  if(dy>40) setSheet(false);
}, {passive:true});

// Single viewer
function initViewer(id){
  const c=document.getElementById(id); if(!c) return;
  const r2=new THREE.WebGLRenderer({ canvas:c, alpha:true, antialias:!isMobile });
  r2.setPixelRatio(Math.min(window.devicePixelRatio,1.6));
  const resize=()=>{
    const w=c.clientWidth, h=c.clientHeight||200;
    r2.setSize(w,h,false); cam2.aspect=w/h; cam2.updateProjectionMatrix();
  };
  const w=c.clientWidth, h=c.clientHeight||240; r2.setSize(w,h,false);
  const s2=new THREE.Scene();
  const cam2=new THREE.PerspectiveCamera(35, w/(h||240),0.1,100); cam2.position.set(1.5,0.8,1.2);
  const ctrl2=new OrbitControls(cam2,c); ctrl2.enableDamping=true; ctrl2.autoRotate=true; ctrl2.autoRotateSpeed=1.8; ctrl2.enableZoom=false;
  s2.add(new THREE.AmbientLight(0x888caa,1.2));
  const dl=new THREE.DirectionalLight(0xffffff,2); dl.position.set(2,4,2); s2.add(dl);
  const dl2=new THREE.DirectionalLight(themes[theme].color,1.5); dl2.position.set(-2,1,-2); s2.add(dl2);
  const bot=createMicrobotMesh(true); bot.scale.set(1.8,1.8,1.8); bot.position.y=-0.1; s2.add(bot);
  const floorGeo=new THREE.CircleGeometry(1.5,32); const floorMat=new THREE.MeshStandardMaterial({ color:0x0c0f18, roughness:0.2, metalness:0.8, transparent:true, opacity:0.6 });
  const floor=new THREE.Mesh(floorGeo,floorMat); floor.rotation.x=-Math.PI/2; floor.position.y=-0.28; s2.add(floor);
  const grid2=new THREE.GridHelper(4,20,0x1b2133,0x121620); grid2.position.y=-0.27; s2.add(grid2);
  const anim=()=>{ requestAnimationFrame(anim); bot.rotation.y+=0.003; const led=bot.userData.led; if(led){ led.material.color.set(themes[theme].color); led.material.emissive.set(themes[theme].color);} ctrl2.update(); r2.render(s2,cam2); };
  anim();
  window.addEventListener('resize', resize); new ResizeObserver(resize).observe(c.parentElement);
}
initViewer('microSingle'); initViewer('microSingleMobile');
if(isMobile) document.getElementById('mobileBlueprintCard').style.display='block';

// Controls
const countSlider=document.getElementById('count');
const countVal=document.getElementById('countVal');
const cohesionSlider=document.getElementById('cohesion');
const cohesionVal=document.getElementById('cohesionVal');
const linkSlider=document.getElementById('linkDist');
const linkVal=document.getElementById('linkVal');
const speedSlider=document.getElementById('buildSpeed');
const speedVal=document.getElementById('speedVal');

countSlider.value=count; countVal.textContent=count;
countSlider.addEventListener('input', e=>{ count=parseInt(e.target.value); countVal.textContent=count; document.getElementById('activeCount').textContent=count; const mEl=document.getElementById('activeCountM'); if(mEl) mEl.textContent=count; });
countSlider.addEventListener('change', e=>{ swarm.setCount(parseInt(e.target.value)); });

cohesionSlider.addEventListener('input', e=> cohesionVal.textContent=parseFloat(e.target.value).toFixed(2));
linkSlider.addEventListener('input', e=> linkVal.textContent=parseFloat(e.target.value).toFixed(1));
speedSlider.addEventListener('input', e=> speedVal.textContent=parseFloat(e.target.value).toFixed(1));

function applyTheme(th){
  theme=th;
  accent.set(themes[th].color);
  transMat.color.set(themes[th].color); transMat.emissive.set(themes[th].color);
  ringMat1.color.set(themes[th].color); ringMat2.color.set(themes[th].color); vLineMat.color.set(themes[th].color);
  pointA.color.set(themes[th].color);
  document.querySelectorAll('.color-dot').forEach(d=> d.classList.toggle('active', d.dataset.color===th));
  const status=document.getElementById('transStatus'); const label=document.getElementById('transLabel');
  if(th==='yokai'){ status.classList.add('yokai'); label.textContent=isMobile?'YOKAI • 5.8GHz':'NEURO: YOKAI • 5.8GHz OVERRIDE'; document.querySelectorAll('.mode-btn.active').forEach(b=>{b.classList.remove('active'); b.classList.add('yokai-active');}); }
  else { status.classList.remove('yokai'); label.textContent=isMobile?`${th.toUpperCase()} • LINKED`:`NEURO: ${th.toUpperCase()} • LINKED`; document.querySelectorAll('.mode-btn.yokai-active').forEach(b=>{b.classList.remove('yokai-active'); b.classList.add('active');}); }
  if(navigator.vibrate) navigator.vibrate(th==='yokai'?[20,30,20]:[10]);
}
document.querySelectorAll('.color-dot').forEach(dot=> dot.addEventListener('click', ()=> applyTheme(dot.dataset.color)));
document.getElementById('btnHiro').addEventListener('click', ()=> applyTheme('hiro'));
document.getElementById('btnYokai').addEventListener('click', ()=> applyTheme('yokai'));
window.addEventListener('keydown', e=>{ if(e.key.toLowerCase()==='b') applyTheme('hiro'); if(e.key.toLowerCase()==='r') applyTheme('yokai'); });

const btnAuto=document.getElementById('btnAuto');
const btnAssemble=document.getElementById('btnAssemble');
const btnScatter=document.getElementById('btnScatter');
const progBar=document.getElementById('buildProg');

btnAuto.addEventListener('click', ()=>{
  autoBuild=!autoBuild;
  btnAuto.textContent=`AUTO BUILD: ${autoBuild?'ON':'OFF'}`;
  btnAuto.classList.toggle('active', autoBuild);
  if(autoBuild){ swarm.buildProgress=0.02; buildProg=0.02; }
  else swarm.buildProgress=1;
});
btnAssemble.addEventListener('click', ()=>{
  swarm.buildProgress=0.02; buildProg=0.02; autoBuild=true; btnAuto.textContent='AUTO BUILD: ON'; btnAuto.classList.add('active');
  if(navigator.vibrate) navigator.vibrate(20);
});
btnScatter.addEventListener('click', ()=>{
  for(let i=0;i<swarm.count;i++) swarm.velocities[i].add(new THREE.Vector3((Math.random()-0.5)*3, Math.random()*2, (Math.random()-0.5)*3));
  swarm.setTargetsFromPoints(getFormation('scatter', swarm.count, transmitter.position, performance.now()));
});

// Loader
window.addEventListener('load', ()=>{
  setTimeout(()=>{
    document.getElementById('loader')?.classList.add('hidden');
    const mh=document.getElementById('mobileHint');
    if(isMobile && mh){
      mh.style.display='flex';
      setTimeout(()=>{ mh.style.opacity='0'; mh.style.transform='translateX(-50%) translateY(10px)'; }, 4200);
      setTimeout(()=> mh.style.display='none', 4700);
    }
  }, isMobile?800:500);
});

// Main loop
let last=performance.now(); let fpsAcc=0,fpsCount=0,lastFps=performance.now(); let linkDisp=0;
let currentFormationPoints=null;

function animate(){
  requestAnimationFrame(animate);
  const now=performance.now(); const dt=Math.min((now-last)/1000,0.05); last=now;

  // transmitter lerp
  transmitter.position.lerp(transmitterTarget, 0.085);
  pointA.position.copy(transmitter.position); pointA.position.y+=0.5;
  transmitter.rotation.y+=dt*0.8; transRing.rotation.z+=dt*0.6;
  document.getElementById('heightVal').textContent=transmitterTarget.y.toFixed(1);

  // formation targets
  const formationPoints=getFormation(mode, swarm.count, transmitter.position, now);
  // auto build progress
  if(autoBuild){
    buildProg=Math.min(1, buildProg + dt*0.35*parseFloat(speedSlider.value));
    swarm.buildProgress=buildProg;
    if(progBar) progBar.style.width=`${buildProg*100}%`;
    if(buildProg>=1){ autoBuild=false; btnAuto.textContent='AUTO BUILD: OFF'; btnAuto.classList.remove('active'); }
  } else {
    if(progBar) progBar.style.width='100%';
    swarm.buildProgress=1;
  }
  swarm.setTargetsFromPoints(formationPoints);

  const linkCount=swarm.update(dt, now, {
    cohesion: parseFloat(cohesionSlider.value),
    linkDistance: parseFloat(linkSlider.value),
    transmitterPos: transmitter.position,
    buildSpeed: parseFloat(speedSlider.value)
  });
  linkDisp=linkCount;

  controls.update();
  renderer.render(scene,camera);

  fpsAcc+=1/dt; fpsCount++;
  if(now-lastFps>500){
    const fps=Math.round(fpsAcc/fpsCount).toString();
    document.getElementById('fps').textContent=fps;
    const fpsM=document.getElementById('fpsM'); if(fpsM) fpsM.textContent=fps;
    document.getElementById('linkCount').textContent=linkDisp.toString();
    fpsAcc=0;fpsCount=0;lastFps=now;
  }
}
animate();

window.addEventListener('resize', ()=>{
  renderer.setSize(window.innerWidth, window.innerHeight);
  camera.aspect=window.innerWidth/window.innerHeight;
  camera.updateProjectionMatrix();
});

// initial
setTimeout(()=> transmitterTarget.set(isMobile?2:3,2,isMobile?2:2), 400);

// prevent bounce
window.addEventListener('touchmove', e=>{
  if(e.target.closest('.scroll')) return;
  if(e.target.closest('canvas')) { /* allow but prevent bounce */ }
}, {passive:false});

// screenshot helper (press S)
window.addEventListener('keydown', e=>{
  if(e.key.toLowerCase()==='s'){
    const a=document.createElement('a');
    a.download=`microbot-${mode}-${Date.now()}.png`;
    a.href=renderer.domElement.toDataURL('image/png');
    a.click();
  }
});
