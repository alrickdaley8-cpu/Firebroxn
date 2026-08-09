import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { getFormation } from './formations.js';
import { Joystick } from './joystick.js';
import * as CANNON from 'cannon-es';

const isMobile = /Android|iPhone|iPad|iPod|Mobi/i.test(navigator.userAgent) || window.innerWidth <= 1300;

const canvas = document.getElementById('canvas');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: !isMobile, alpha:true, powerPreference:'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, isMobile?1.6:2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.18;

const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x07080d, isMobile?0.020:0.015);

const camera = new THREE.PerspectiveCamera(isMobile?64:56, window.innerWidth/window.innerHeight, 0.1, 120);
camera.position.set(0, isMobile?9:6.5, isMobile?18:19);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping=true; controls.dampingFactor=0.09;
controls.minDistance=isMobile?2.2:3; controls.maxDistance=52;
controls.target.set(0,2,0); controls.enablePan=true; controls.panSpeed=0.85;
controls.touches={ ONE: THREE.TOUCH.ROTATE, TWO: THREE.TOUCH.DOLLY_PAN };

scene.add(new THREE.AmbientLight(0x7f8bb3,0.72));
const keyLight=new THREE.DirectionalLight(0xe6eeff,2.4); keyLight.position.set(10,16,8); scene.add(keyLight);
const fillLight=new THREE.DirectionalLight(0x25304a,1.1); fillLight.position.set(-10,5,-10); scene.add(fillLight);

let theme='hiro';
const themes={
  hiro:{ color:0x00e5ff, emissive:0x00e5ff },
  yokai:{ color:0xff1744, emissive:0xff1744 },
  gogo:{ color:0xffe600, emissive:0xffe600 },
  wasabi:{ color:0x29ff7a, emissive:0x29ff7a },
  honey:{ color:0xff6bd6, emissive:0xff6bd6 },
  fred:{ color:0x5a7bff, emissive:0x5a7bff },
};

const pointA=new THREE.PointLight(themes[theme].color, isMobile?6:9, 32); pointA.position.set(0,2,0); scene.add(pointA);
const pointB=new THREE.PointLight(0x4a5fff, isMobile?2.5:4.5, 32); pointB.position.set(-7,7,-5); scene.add(pointB);

const grid=new THREE.GridHelper(140, isMobile?70:110, 0x1c233a, 0x131827); grid.position.y=-2.3; scene.add(grid);

// transmitter
const transGeo=new THREE.SphereGeometry(isMobile?0.46:0.38, isMobile?22:32, isMobile?22:32);
const transMat=new THREE.MeshStandardMaterial({ color:themes[theme].color, emissive:themes[theme].color, emissiveIntensity:2.8, roughness:0.2, metalness:0.25, transparent:true, opacity:0.94 });
const transmitter=new THREE.Mesh(transGeo, transMat); transmitter.position.set(0,2,0); scene.add(transmitter);
const ringMat1=new THREE.MeshBasicMaterial({ color:themes[theme].color, side:THREE.DoubleSide, transparent:true, opacity:0.72 });
const transRing=new THREE.Mesh(new THREE.RingGeometry(0.66,0.72, isMobile?32:64), ringMat1); transRing.rotation.x=Math.PI/2; transRing.position.y=0.02; transmitter.add(transRing);
const ringMat2=new THREE.MeshBasicMaterial({ color:themes[theme].color, side:THREE.DoubleSide, transparent:true, opacity:0.32 });
const transRing2=new THREE.Mesh(new THREE.RingGeometry(1.22,1.28, isMobile?28:64), ringMat2); transRing2.rotation.x=Math.PI/2; transRing2.position.y=-0.08; transmitter.add(transRing2);
const vLineGeo=new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0,0,0), new THREE.Vector3(0,-5,0)]);
const vLineMat=new THREE.LineDashedMaterial({ color:themes[theme].color, transparent:true, opacity:0.38, dashSize:0.22, gapSize:0.14 });
const vLine=new THREE.Line(vLineGeo, vLineMat); vLine.computeLineDistances(); transmitter.add(vLine);

// ghost blueprint
const ghostGeo=new THREE.BufferGeometry();
const ghostMat=new THREE.PointsMaterial({ color:themes[theme].color, size:0.18, transparent:true, opacity:0.20, sizeAttenuation:true, depthWrite:false });
const ghostPoints=new THREE.Points(ghostGeo, ghostMat); scene.add(ghostPoints);

// physics
const world=new CANNON.World({ gravity:new CANNON.Vec3(0,-9.81,0) });
world.broadphase=new CANNON.NaiveBroadphase();
world.solver.iterations=12;
world.defaultContactMaterial.friction=0.65;
world.defaultContactMaterial.restitution=0.15;
const groundMat=new CANNON.Material('ground');
const groundShape=new CANNON.Plane();
const groundBody=new CANNON.Body({ mass:0, shape:groundShape, material:groundMat });
groundBody.quaternion.setFromEuler(-Math.PI/2,0,0);
groundBody.position.set(0,-2.35,0);
world.addBody(groundBody);

const physicsBodies=new Map();
const physicsConstraints=[];
const ballBodies=[];
let physicsEnabled=false;
let stressHeatmap=false;

function createPhysicsBody(botIdx, pos, isBase){
  if(physicsBodies.has(botIdx)) return physicsBodies.get(botIdx);
  const shape=new CANNON.Box(new CANNON.Vec3(0.30,0.10,0.20));
  const body=new CANNON.Body({ mass: isBase?0:0.42, shape, position:new CANNON.Vec3(pos.x,pos.y,pos.z), material:groundMat, linearDamping:0.15, angularDamping:0.35 });
  if(isBase) body.type=CANNON.Body.STATIC;
  world.addBody(body);
  physicsBodies.set(botIdx, body);
  for(const [otherIdx, otherBody] of physicsBodies.entries()){
    if(otherIdx===botIdx) continue;
    const otherPos=otherBody.position;
    const dist=Math.hypot(pos.x-otherPos.x, pos.y-otherPos.y, pos.z-otherPos.z);
    if(dist<1.7 && dist>0.05){
      let conn=0; for(const c of physicsConstraints){ if(c.a===botIdx||c.b===botIdx) conn++; } if(conn>=4) continue;
      try{
        const constraint=new CANNON.LockConstraint(body, otherBody);
        world.addConstraint(constraint);
        physicsConstraints.push({a:botIdx,b:otherIdx,constraint, restDist:dist});
      }catch{
        try{
          const p2p=new CANNON.PointToPointConstraint(body, new CANNON.Vec3(0,0,0), otherBody, new CANNON.Vec3(0,0,0));
          world.addConstraint(p2p);
          physicsConstraints.push({a:botIdx,b:otherIdx,constraint:p2p, restDist:dist});
        }catch{}
      }
    }
  }
  return body;
}
function removePhysicsBody(botIdx){
  const body=physicsBodies.get(botIdx);
  if(!body) return;
  for(let i=physicsConstraints.length-1;i>=0;i--){ const c=physicsConstraints[i]; if(c.a===botIdx||c.b===botIdx){ try{ world.removeConstraint(c.constraint);}catch{} physicsConstraints.splice(i,1);} }
  try{ world.removeBody(body);}catch{} physicsBodies.delete(botIdx);
}
function clearAllPhysics(){
  for(const [idx, b] of physicsBodies.entries()){ try{ world.removeBody(b);}catch{} }
  for(const c of physicsConstraints){ try{ world.removeConstraint(c.constraint);}catch{} }
  physicsBodies.clear(); physicsConstraints.length=0;
}
function spawnBall(){
  const radius=0.38;
  const meshGeo=new THREE.SphereGeometry(radius,20,20);
  const meshMat=new THREE.MeshStandardMaterial({ color:0xff3d57, roughness:0.35, metalness:0.2, emissive:0x44000f, emissiveIntensity:0.3 });
  const mesh=new THREE.Mesh(meshGeo, meshMat);
  mesh.position.set(transmitter.position.x + (Math.random()-0.5)*0.6, transmitter.position.y+8 + Math.random()*0.8, transmitter.position.z + (Math.random()-0.5)*0.6);
  scene.add(mesh);
  const shape=new CANNON.Sphere(radius);
  const body=new CANNON.Body({ mass:4.5, shape, position:new CANNON.Vec3(mesh.position.x,mesh.position.y,mesh.position.z), linearDamping:0.08, angularDamping:0.08 });
  world.addBody(body);
  ballBodies.push({mesh, body});
  updateBallCount();
  if(navigator.vibrate) navigator.vibrate(25);
}
function clearBalls(){ for(const b of ballBodies){ scene.remove(b.mesh); try{ world.removeBody(b.body);}catch{} } ballBodies.length=0; updateBallCount(); }
function updateBallCount(){ const el=document.getElementById('ballCount'); if(el) el.textContent=ballBodies.length; }
function applyWind(wx,wz){ for(const body of physicsBodies.values()){ if(body.type!==CANNON.Body.STATIC) body.applyForce(new CANNON.Vec3(wx*2.5,0,wz*2.5), body.position); } }

// ----- CLASSIC MESH FROM V1/V4 -----
function createMicrobotMeshClassic(isLeader=false){
  const group=new THREE.Group();
  // body - brighter for mobile visibility
  const bodyGeo=new THREE.BoxGeometry(0.62, 0.24, 0.44);
  const bodyMat=new THREE.MeshStandardMaterial({ color:0x171b29, roughness:0.30, metalness:0.88, emissive:0x06080f, emissiveIntensity:0.15 });
  const body=new THREE.Mesh(bodyGeo, bodyMat);
  group.add(body);

  const topPlateGeo=new THREE.BoxGeometry(0.55, 0.07, 0.38);
  const topMat=new THREE.MeshStandardMaterial({ color:0x222942, roughness:0.25, metalness:0.75 });
  const top=new THREE.Mesh(topPlateGeo, topMat); top.position.y=0.14; group.add(top);

  // LED big and bright - classic
  const ledGeo=new THREE.BoxGeometry(0.18, 0.03, 0.18);
  const ledMat=new THREE.MeshStandardMaterial({ color:themes[theme].color, emissive:themes[theme].color, emissiveIntensity: isLeader?7:4.2 });
  const led=new THREE.Mesh(ledGeo, ledMat); led.position.set(0,0.19,0); group.add(led);
  group.userData.led=led;

  // bottom glow for visibility
  const glowGeo=new THREE.CircleGeometry(0.22,14);
  const glowMat=new THREE.MeshBasicMaterial({ color:themes[theme].color, transparent:true, opacity:0.22, side:THREE.DoubleSide });
  const glow=new THREE.Mesh(glowGeo, glowMat); glow.rotation.x=-Math.PI/2; glow.position.y=-0.125; group.add(glow);
  group.userData.thruster=glow;

  // legs - classic 4 legs
  const legMat=new THREE.MeshStandardMaterial({ color:0x0c0f19, roughness:0.45, metalness:0.65 });
  const legPositions=[[-0.24, -0.08, 0.16],[0.24, -0.08, 0.16],[-0.24, -0.08, -0.16],[0.24, -0.08, -0.16]];
  const legs=[];
  legPositions.forEach((p,i)=>{
    const legGroup=new THREE.Group(); legGroup.position.set(p[0], p[1], p[2]); group.add(legGroup);
    const legGeo=new THREE.CapsuleGeometry(0.045, 0.22, 4, 10);
    const leg=new THREE.Mesh(legGeo, legMat); leg.position.set(0,-0.11,0); leg.rotation.z= p[0]>0 ? -0.35:0.35; leg.rotation.x= p[2]>0 ? 0.18:-0.18;
    legGroup.add(leg);
    const tipGeo=new THREE.SphereGeometry(0.07,10,10);
    const tipMat=new THREE.MeshStandardMaterial({ color:0x2a344f, metalness:0.92, roughness:0.25, emissive:themes[theme].color, emissiveIntensity:0.25 });
    const tip=new THREE.Mesh(tipGeo, tipMat); tip.position.set(0,-0.16,0); leg.add(tip);
    legs.push({ legGroup, leg, tip, tipMat });
  });
  group.userData.legs=legs;
  return group;
}

// Swarm without locking
class MicroSwarmClassic{
  constructor(count){
    this.count=count; this.bots=[]; this.velocities=[]; this.targets=[]; this.allPoints=[]; this.sortedPoints=[];
    this.ghostEnabled=true; this.smartAssign=true; this.scaffold=true;
    this.linksEnabled=true;
    this.buildProgress=1; this.lockedCount=0; this.avgError=0;
    this.group=new THREE.Group(); scene.add(this.group);
    this.linkGeo=new THREE.BufferGeometry();
    this.linkMat=new THREE.LineBasicMaterial({ color:themes[theme].color, transparent:true, opacity:0.22, depthWrite:false });
    this.linkLines=new THREE.LineSegments(this.linkGeo, this.linkMat); scene.add(this.linkLines);
    this.initBots();
  }
  initBots(){
    this.bots.forEach(b=>this.group.remove(b.mesh));
    this.bots=[]; this.velocities=[]; this.targets=[];
    for(let i=0;i<this.count;i++){
      const mesh=createMicrobotMeshClassic(i===0);
      const r=8*Math.cbrt(Math.random()); const th=Math.random()*Math.PI*2; const ph=Math.acos(2*Math.random()-1);
      mesh.position.set(r*Math.sin(ph)*Math.cos(th), r*Math.sin(ph)*Math.sin(th)*0.6+2, r*Math.cos(ph));
      mesh.rotation.set(Math.random()*Math.PI, Math.random()*Math.PI, Math.random()*Math.PI);
      this.group.add(mesh);
      this.bots.push({ mesh, phase:Math.random()*Math.PI*2 });
      this.velocities.push(new THREE.Vector3(0,0,0));
      this.targets.push(mesh.position.clone());
    }
  }
  setCount(n){ if(n===this.count) return; if(n<this.count){ for(let i=n;i<this.count;i++) removePhysicsBody(i); } this.count=n; this.initBots(); if(this.allPoints.length) this.setFormationPoints(this.allPoints); }
  setFormationPoints(points){
    this.allPoints=points.map(p=>p.clone());
    this.sortedPoints=[...this.allPoints].sort((a,b)=>a.y-b.y);
    this.updateGhost(); this.reassignTargets();
  }
  updateGhost(){
    if(!this.ghostEnabled){ ghostPoints.visible=false; return; }
    ghostPoints.visible=true;
    const flat=new Float32Array(this.allPoints.length*3);
    for(let i=0;i<this.allPoints.length;i++){ flat[i*3]=this.allPoints[i].x; flat[i*3+1]=this.allPoints[i].y; flat[i*3+2]=this.allPoints[i].z; }
    ghostGeo.setAttribute('position', new THREE.BufferAttribute(flat,3)); ghostGeo.computeBoundingSphere(); ghostMat.color.set(themes[theme].color); ghostMat.opacity=0.18 + this.buildProgress*0.12;
  }
  reassignTargets(){
    const count=this.count;
    if(!this.sortedPoints.length) return;
    const allowedCount=this.scaffold ? Math.floor(count*this.buildProgress) : count;
    const buildingPoints=this.sortedPoints.slice(0, Math.max(1, allowedCount));
    if(this.smartAssign){
      const unassigned=new Set(Array.from({length:count},(_,i)=>i));
      const newTargets=new Array(count);
      for(let pi=0; pi<buildingPoints.length; pi++){
        const pt=buildingPoints[pi];
        let best=-1,bestDist=Infinity;
        for(const bi of unassigned){ const d=this.bots[bi].mesh.position.distanceTo(pt); if(d<bestDist){ bestDist=d; best=bi; } }
        if(best!==-1){ newTargets[best]=pt.clone(); unassigned.delete(best); }
      }
      const holding=this.generateHolding(count - buildingPoints.length);
      let hi=0; for(const bi of unassigned){ newTargets[bi]=holding[hi]?holding[hi].clone():new THREE.Vector3((Math.random()-0.5)*6,2+Math.random()*2,(Math.random()-0.5)*6); hi++; }
      for(let i=0;i<count;i++) if(newTargets[i]) this.targets[i].copy(newTargets[i]);
    } else {
      for(let i=0;i<count;i++){ if(i<buildingPoints.length) this.targets[i].copy(buildingPoints[i]); else { const h=this.generateHolding(1)[0]; this.targets[i].copy(h); } }
    }
  }
  generateHolding(n){ const pts=[]; const center=transmitter.position; for(let i=0;i<n;i++){ const ang=(i/n)*Math.PI*2 + performance.now()*0.0003; const r=2.0 + (i%3)*0.6; const y=2 + Math.sin(i*0.7 + performance.now()*0.001)*0.8; pts.push(new THREE.Vector3(center.x + Math.cos(ang)*r, y, center.z + Math.sin(ang)*r)); } return pts; }
  update(dt,time,params){
    const cohesion=params.cohesion, linkDist=params.linkDistance, transPos=params.transmitterPos, speed=params.buildSpeed||1;
    const positions=[]; let totalErr=0;
    for(let i=0;i<this.count;i++){
      const bot=this.bots[i], mesh=bot.mesh, vel=this.velocities[i], target=this.targets[i];
      const toTarget=target.clone().sub(mesh.position);
      const dist=toTarget.length(); totalErr+=dist;
      // physics sync if enabled and close
      if(physicsEnabled && physicsBodies.has(i)){
        const body=physicsBodies.get(i);
        mesh.position.copy(body.position);
        mesh.quaternion.copy(body.quaternion);
        positions.push(mesh.position.clone());
        continue;
      }
      // create physics body if close and physics enabled
      if(physicsEnabled && dist<0.55){
        const isBase=target.y < -0.6;
        createPhysicsBody(i, mesh.position, isBase);
      }
      toTarget.normalize().multiplyScalar(0.07 * (0.3 + cohesion*1.8) * Math.min(dist*1.2, 3.5) * speed);
      const sep=new THREE.Vector3(); let sepC=0; const step=isMobile?3:2;
      for(let j=0;j<this.count;j+=step){
        if(i===j) continue;
        const other=this.bots[j].mesh.position; const d=mesh.position.distanceTo(other);
        if(d<0.72 && d>0.0001){ const diff=mesh.position.clone().sub(other).normalize().divideScalar(d); sep.add(diff); sepC++; }
      }
      if(sepC>0) sep.divideScalar(sepC).normalize().multiplyScalar(0.038);
      vel.add(toTarget); vel.add(sep); vel.multiplyScalar(0.93); vel.clampLength(0,0.22*speed);
      mesh.position.add(vel.clone().multiplyScalar(dt*60));
      if(vel.length()>0.001){ const look=mesh.position.clone().add(vel); mesh.lookAt(look); }
      mesh.rotation.x+=Math.sin(time*0.001*3 + bot.phase)*0.01;
      // leg animation classic walk
      const legs=mesh.userData.legs;
      if(legs){
        const mv=vel.length()*16; const moving=mv>0.02;
        legs.forEach((leg,li)=>{
          const tripod=(li===0||li===3)?0:Math.PI;
          const t=time*0.012*(moving? mv*2+1 :0.4)+tripod+bot.phase;
          if(moving){ leg.legGroup.rotation.x=Math.sin(t)*0.45; }
          else { leg.legGroup.rotation.x=Math.sin(time*0.001+li)*0.12; }
        });
        const thruster=mesh.userData.thruster;
        if(thruster) thruster.material.opacity=0.18 + mv*0.35 + Math.sin(time*0.01+bot.phase)*0.05;
      }
      const led=mesh.userData.led;
      if(led){ led.material.color.set(themes[theme].color); led.material.emissive.set(themes[theme].color); led.material.emissiveIntensity= 3.8 + Math.sin(time*0.005 + i)*0.9 + (mesh.position.distanceTo(transPos)<4?1.4:0); }
      positions.push(mesh.position.clone());
    }
    this.avgError=(totalErr/this.count);

    // links
    if(this.linksEnabled){
      const linkPos=[]; const gridSize=linkDist;
      const buckets=new Map(); const keyFor=v=> `${Math.floor(v.x/gridSize)}_${Math.floor(v.y/gridSize)}_${Math.floor(v.z/gridSize)}`;
      for(let i=0;i<positions.length;i++){ const k=keyFor(positions[i]); if(!buckets.has(k)) buckets.set(k,[]); buckets.get(k).push(i); }
      const offsets=[]; for(let dx=-1;dx<=1;dx++) for(let dy=-1;dy<=1;dy++) for(let dz=-1;dz<=1;dz++) offsets.push([dx,dy,dz]);
      let lc=0; const maxLinks=isMobile?700:1300;
      for(let i=0;i<positions.length && lc<maxLinks;i++){
        const p=positions[i]; const base=keyFor(p).split('_').map(Number);
        for(const off of offsets){
          const nk=`${base[0]+off[0]}_${base[1]+off[1]}_${base[2]+off[2]}`;
          const list=buckets.get(nk); if(!list) continue;
          for(const jIdx of list){
            if(jIdx<=i) continue; const q=positions[jIdx]; const d=p.distanceTo(q);
            if(d<linkDist){ linkPos.push(p.x,p.y,p.z,q.x,q.y,q.z); lc++; if(lc>=maxLinks) break; }
          }
          if(lc>=maxLinks) break;
        }
      }
      this.linkGeo.setAttribute('position', new THREE.Float32BufferAttribute(linkPos,3)); this.linkGeo.attributes.position.needsUpdate=true; this.linkGeo.computeBoundingSphere();
      this.linkMat.color.set(themes[theme].color); this.linkMat.opacity=0.22;
      this.linkLines.visible=true;
      return lc;
    } else { this.linkLines.visible=false; return 0; }
  }
}

// init
let mode='orbit';
let count=isMobile?140:200;
const swarm=new MicroSwarmClassic(count);
let transmitterTarget=new THREE.Vector3(0,2,0);
let raycaster=new THREE.Raycaster();
let plane=new THREE.Plane(new THREE.Vector3(0,1,0), -2);
let mouse=new THREE.Vector2();
let interactionMode='build';
let isTransmitterDragging=false;
let autoBuild=false; let buildProg=1; let lastTap=0;
let formationScale=1, formationRot=0;
let wallHeight=2.5, wallThick=0.4;
let drawMode=false, drawPoints=[], customWallPoints=null;
let windX=0, windZ=0;

const formationDefs=[
  {id:'orbit', label:'ORBIT', desc:'Idle', icon:'🌀', cat:'physics'},
  {id:'tower', label:'TOWER', desc:'Vertical', icon:'🏗️', cat:'arch'},
  {id:'sphere', label:'SPHERE', desc:'Shell', icon:'🔮', cat:'physics'},
  {id:'wave', label:'WAVE', desc:'Sine', icon:'🌊', cat:'physics'},
  {id:'bridge', label:'BRIDGE', desc:'Catenary', icon:'🌉', cat:'arch'},
  {id:'functionalBridge', label:'F-BRIDGE', desc:'Load test', icon:'🏗️', cat:'functional'},
  {id:'arch', label:'ARCH', desc:'Arch', icon:'⛩️', cat:'functional'},
  {id:'dome', label:'DOME', desc:'Dome', icon:'🏟️', cat:'functional'},
  {id:'bh6', label:'BH-6', desc:'Logo', icon:'⚡', cat:'fun'},
  {id:'vortex', label:'VORTEX', desc:'Spiral', icon:'🌪️', cat:'physics'},
  {id:'eiffel', label:'EIFFEL', desc:'Paris', icon:'🗼', cat:'arch'},
  {id:'dna', label:'DNA', desc:'Helix', icon:'🧬', cat:'organic'},
  {id:'heart', label:'HEART', desc:'Beat', icon:'❤️', cat:'organic'},
  {id:'baymax', label:'BAYMAX', desc:'Care', icon:'🤖', cat:'organic'},
  {id:'cube', label:'CUBE', desc:'Frame', icon:'🧊', cat:'physics'},
  {id:'pyramid', label:'PYRAMID', desc:'Pyramid', icon:'🔺', cat:'arch'},
  {id:'stairs', label:'STAIRS', desc:'Spiral', icon:'🌀', cat:'arch'},
  {id:'infinity', label:'INFINITY', desc:'8', icon:'♾️', cat:'physics'},
  {id:'torus', label:'TORUS', desc:'Donut', icon:'🍩', cat:'physics'},
  {id:'dragon', label:'DRAGON', desc:'Serpent', icon:'🐉', cat:'organic'},
  {id:'shield', label:'SHIELD', desc:'Wall', icon:'🛡️', cat:'fun'},
  {id:'funnel', label:'FUNNEL', desc:'Tornado', icon:'🌪️', cat:'physics'},
  {id:'hiro', label:'HIRO', desc:'Text', icon:'🔤', cat:'fun'},
  {id:'city', label:'CITY', desc:'Skyline', icon:'🏙️', cat:'arch'},
  {id:'hand', label:'HAND', desc:'Grab', icon:'🖐️', cat:'organic'},
  {id:'satellite', label:'DISH', desc:'Sat', icon:'📡', cat:'arch'},
  {id:'helixRing', label:'RINGS', desc:'Rings', icon:'💍', cat:'physics'},
  {id:'customWall', label:'CUSTOM', desc:'Drawn wall', icon:'✏️', cat:'functional'},
  {id:'scatter', label:'SCATTER', desc:'Chaos', icon:'💥', cat:'fun'},
];
const modesContainer=document.getElementById('modes');
function renderModes(filter='all'){
  modesContainer.innerHTML='';
  formationDefs.forEach(def=>{
    if(filter!=='all' && def.cat!==filter) return;
    if(def.id==='customWall' && !customWallPoints) return;
    const btn=document.createElement('button');
    btn.className='mode-btn' + (def.id===mode? ' active':'');
    btn.dataset.mode=def.id;
    btn.innerHTML=`<b><i>${def.icon}</i> ${def.label}</b><small>${def.desc}</small>`;
    btn.addEventListener('click', ()=>{
      document.querySelectorAll('.mode-btn').forEach(b=>b.classList.remove('active','yokai-active'));
      mode=def.id;
      btn.classList.add(theme==='yokai'?'yokai-active':'active');
      document.getElementById('modeLabel').textContent=mode.toUpperCase();
      document.getElementById('modeLabelM').textContent=mode.toUpperCase();
      if(mode==='scatter'){ swarm.buildProgress=1; buildProg=1; autoBuild=false; }
      else if(autoBuild){ swarm.buildProgress=0.02; buildProg=0.02; }
      updateFormation(true);
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

function transformPoints(points, center, scale, rotY){
  const cos=Math.cos(rotY), sin=Math.sin(rotY);
  return points.map(p=>{
    const rel=new THREE.Vector3().subVectors(p, center);
    rel.multiplyScalar(scale);
    const x=rel.x*cos - rel.z*sin;
    const z=rel.x*sin + rel.z*cos;
    rel.x=x; rel.z=z;
    return new THREE.Vector3().addVectors(center, rel);
  });
}

let drawLine=null;
function updateDrawLine(){
  if(drawLine) scene.remove(drawLine);
  if(drawPoints.length<2) return;
  const geo=new THREE.BufferGeometry().setFromPoints(drawPoints);
  const mat=new THREE.LineBasicMaterial({ color:0x00e5ff, transparent:true, opacity:0.85 });
  drawLine=new THREE.Line(geo, mat);
  scene.add(drawLine);
  document.getElementById('drawPtsCount').textContent=drawPoints.length;
  const len=calcPathLength(drawPoints);
  document.getElementById('drawPreview').textContent=`Drawn ${drawPoints.length} pts, ${len.toFixed(1)}m — BUILD DRAWN WALL`;
  document.getElementById('drawPreview').classList.add('active');
}
function calcPathLength(pts){ let l=0; for(let i=1;i<pts.length;i++) l+=pts[i].distanceTo(pts[i-1]); return l; }
function generateWallFromPath(path,count,h,thick){
  const wallPts=[];
  if(path.length<2) return wallPts;
  const stepAlong=0.36, stepUp=0.38;
  for(let i=0;i<path.length-1;i++){
    const a=path[i], b=path[i+1];
    const segLen=a.distanceTo(b);
    const steps=Math.max(1, Math.floor(segLen/stepAlong));
    for(let s=0;s<=steps;s++){
      const t=s/steps;
      const base=new THREE.Vector3().lerpVectors(a,b,t);
      const dir=new THREE.Vector3().subVectors(b,a).normalize();
      const perp=new THREE.Vector3(-dir.z,0,dir.x);
      for(let ty=0; ty<= Math.floor(h/stepUp); ty++){
        const y=-2.3 + ty*stepUp + Math.random()*0.05;
        for(let tk=-Math.floor(thick/0.24); tk<=Math.floor(thick/0.24); tk++){
          if(wallPts.length>=count*1.5) break;
          const offset=perp.clone().multiplyScalar(tk*0.24 + (Math.random()-0.5)*0.08);
          wallPts.push(new THREE.Vector3(base.x + offset.x, y, base.z + offset.z));
        }
      }
    }
  }
  while(wallPts.length<count){
    const base=wallPts[Math.floor(Math.random()*wallPts.length)];
    wallPts.push(base.clone().add(new THREE.Vector3((Math.random()-0.5)*0.2,(Math.random()-0.5)*0.2,(Math.random()-0.5)*0.2)));
  }
  return wallPts.slice(0,count);
}
function updateFormation(force=false){
  let raw;
  if(mode==='customWall' && customWallPoints) raw=customWallPoints;
  else raw=getFormation(mode, swarm.count, transmitter.position, performance.now());
  const transformed=transformPoints(raw, transmitter.position, formationScale, formationRot);
  swarm.setFormationPoints(transformed);
  if(force) swarm.reassignTargets();
}
function screenToWorld(x,y){
  const rect=canvas.getBoundingClientRect();
  mouse.x=((x - rect.left)/rect.width)*2 -1;
  mouse.y=-((y - rect.top)/rect.height)*2 +1;
  raycaster.setFromCamera(mouse, camera);
  const pt=new THREE.Vector3();
  const drawPlane=new THREE.Plane(new THREE.Vector3(0,1,0), 2.3);
  const targetPlane= drawMode ? drawPlane : plane;
  raycaster.ray.intersectPlane(targetPlane, pt);
  if(!pt) return null;
  pt.x=THREE.MathUtils.clamp(pt.x,-18,18);
  pt.z=THREE.MathUtils.clamp(pt.z,-18,18);
  return pt;
}
function updateTransmitterScreen(x,y){
  const pt=screenToWorld(x,y);
  if(!pt) return;
  transmitterTarget.x=pt.x; transmitterTarget.z=pt.z;
}
let isDrawing=false;
canvas.addEventListener('pointerdown', e=>{
  if(e.target.closest('.card')||e.target.closest('.hud-top')||e.target.closest('.float-controls')||e.target.closest('.joystick')) return;
  if(drawMode){
    const pt=screenToWorld(e.clientX,e.clientY);
    if(pt){ if(!isDrawing){ drawPoints=[pt]; isDrawing=true; } else drawPoints.push(pt); updateDrawLine(); }
    return;
  }
  const isRight=e.clientX > window.innerWidth/2;
  if(isMobile){
    if(interactionMode==='build'){
      if(!isRight){ isTransmitterDragging=true; controls.enabled=false; updateTransmitterScreen(e.clientX,e.clientY); }
      else { isTransmitterDragging=false; controls.enabled=true; }
    } else {
      if(!isRight){ isTransmitterDragging=true; controls.enabled=false; updateTransmitterScreen(e.clientX,e.clientY); }
    }
  } else {
    if(e.button===0){ updateTransmitterScreen(e.clientX,e.clientY); isTransmitterDragging=true; }
  }
  const now=Date.now();
  if(now-lastTap<300 && !drawMode){
    for(let i=0;i<swarm.count;i++) swarm.velocities[i].add(new THREE.Vector3((Math.random()-0.5)*3, Math.random()*2, (Math.random()-0.5)*3));
    transMat.emissiveIntensity=6; setTimeout(()=> transMat.emissiveIntensity=2.8,160);
  }
  lastTap=now;
});
canvas.addEventListener('pointermove', e=>{
  if(drawMode && isDrawing){
    const pt=screenToWorld(e.clientX,e.clientY);
    if(pt && pt.distanceTo(drawPoints[drawPoints.length-1])>0.25){ drawPoints.push(pt); updateDrawLine(); }
    return;
  }
  if(isMobile){
    if(isTransmitterDragging && (e.buttons===1 || e.pointerType==='touch')) updateTransmitterScreen(e.clientX,e.clientY);
  } else {
    if(e.buttons===1 && isTransmitterDragging) updateTransmitterScreen(e.clientX,e.clientY);
    else if(!isTransmitterDragging && !drawMode && e.pointerType==='mouse') updateTransmitterScreen(e.clientX,e.clientY);
  }
});
window.addEventListener('pointerup', ()=>{ isTransmitterDragging=false; controls.enabled=true; });
let lastPinch=0;
canvas.addEventListener('touchstart', e=>{
  if(drawMode) return;
  if(e.touches.length===2){
    const dx=e.touches[0].clientX - e.touches[1].clientX; const dy=e.touches[0].clientY - e.touches[1].clientY;
    lastPinch=Math.hypot(dx,dy); controls.enabled=true; isTransmitterDragging=false;
  }
},{passive:true});
canvas.addEventListener('touchmove', e=>{
  if(drawMode && e.touches.length===1){
    const pt=screenToWorld(e.touches[0].clientX,e.touches[0].clientY);
    if(pt && drawPoints.length && pt.distanceTo(drawPoints[drawPoints.length-1])>0.25){ drawPoints.push(pt); updateDrawLine(); if(e.cancelable) e.preventDefault(); }
    return;
  }
  if(e.touches.length===2){
    const dx=e.touches[0].clientX - e.touches[1].clientX; const dy=e.touches[0].clientY - e.touches[1].clientY;
    const dist=Math.hypot(dx,dy); const delta=dist-lastPinch;
    const factor=1 - delta*0.005;
    const dir=camera.position.clone().sub(controls.target).normalize();
    let curDist=camera.position.distanceTo(controls.target);
    let nd=curDist*factor; nd=THREE.MathUtils.clamp(nd, controls.minDistance, controls.maxDistance);
    camera.position.copy(controls.target.clone().add(dir.multiplyScalar(nd)));
    lastPinch=dist; if(e.cancelable) e.preventDefault();
  } else if(e.touches.length===1 && isMobile && isTransmitterDragging){
    const t=e.touches[0]; updateTransmitterScreen(t.clientX,t.clientY); if(e.cancelable) e.preventDefault();
  }
},{passive:false});

// joysticks
let joyTrans, joyCam;
if(isMobile){
  const joyTransEl=document.getElementById('joyTrans');
  const joyCamEl=document.getElementById('joyCam');
  if(joyTransEl) joyTrans=new Joystick(joyTransEl, { maxRadius:42, onMove:v=>{ const sp=0.18; transmitterTarget.x+=v.x*sp; transmitterTarget.z+=-v.y*sp; transmitterTarget.x=THREE.MathUtils.clamp(transmitterTarget.x,-14,14); transmitterTarget.z=THREE.MathUtils.clamp(transmitterTarget.z,-14,14);} });
  if(joyCamEl) joyCam=new Joystick(joyCamEl, { maxRadius:42, onMove:v=>{ const rs=0.06; const off=camera.position.clone().sub(controls.target); const sph=new THREE.Spherical().setFromVector3(off); sph.theta-=v.x*rs; sph.phi+=v.y*rs; sph.phi=THREE.MathUtils.clamp(sph.phi,0.2,Math.PI/2-0.05); camera.position.copy(controls.target.clone().add(new THREE.Vector3().setFromSpherical(sph))); controls.update(); } });
}

const btnZoomIn=document.getElementById('btnZoomIn'), btnZoomOut=document.getElementById('btnZoomOut'), btnTransUp=document.getElementById('btnTransUp'), btnTransDown=document.getElementById('btnTransDown'), btnResetCam=document.getElementById('btnResetCam');
function zoomCam(f){ const dir=camera.position.clone().sub(controls.target).normalize(); let cur=camera.position.distanceTo(controls.target); let nd=cur*f; nd=THREE.MathUtils.clamp(nd, controls.minDistance, controls.maxDistance); camera.position.copy(controls.target.clone().add(dir.multiplyScalar(nd))); }
let zoomInt=null; function startZoom(f){ zoomCam(f); zoomInt=setInterval(()=>zoomCam(f),32); } function stopZoom(){ clearInterval(zoomInt); }
btnZoomIn?.addEventListener('pointerdown', ()=>startZoom(0.94)); btnZoomIn?.addEventListener('pointerup', stopZoom); btnZoomIn?.addEventListener('pointerleave', stopZoom);
btnZoomOut?.addEventListener('pointerdown', ()=>startZoom(1.06)); btnZoomOut?.addEventListener('pointerup', stopZoom); btnZoomOut?.addEventListener('pointerleave', stopZoom);
btnTransUp?.addEventListener('pointerdown', ()=>{ let iv=setInterval(()=>{ transmitterTarget.y+=0.12; transmitterTarget.y=THREE.MathUtils.clamp(transmitterTarget.y,-1,12); plane.constant=-transmitterTarget.y; },32); const stop=()=>{clearInterval(iv); window.removeEventListener('pointerup',stop);}; window.addEventListener('pointerup',stop); });
btnTransDown?.addEventListener('pointerdown', ()=>{ let iv=setInterval(()=>{ transmitterTarget.y-=0.12; transmitterTarget.y=THREE.MathUtils.clamp(transmitterTarget.y,-1,12); plane.constant=-transmitterTarget.y; },32); const stop=()=>{clearInterval(iv); window.removeEventListener('pointerup',stop);}; window.addEventListener('pointerup',stop); });
btnResetCam?.addEventListener('click', ()=>{ camera.position.set(0,isMobile?9:6.5,isMobile?18:19); controls.target.set(0,2,0); controls.update(); transmitterTarget.set(0,2,0); plane.constant=-2; });

const segBtns=document.querySelectorAll('.seg-btn');
const camToggleBtn=document.getElementById('btnCameraToggle');
function setInteractionMode(m){
  interactionMode=m;
  segBtns.forEach(b=>b.classList.toggle('active', b.dataset.seg===m));
  if(camToggleBtn) camToggleBtn.textContent=m==='camera'?'BUILD MODE': m==='draw'?'EXIT DRAW':'CAMERA MODE';
  if(m==='draw'){ drawMode=true; document.getElementById('drawCanvas').style.display='block'; document.getElementById('drawPreview').classList.add('active'); controls.enabled=false; }
  else { if(m!=='draw' && drawMode){ drawMode=false; isDrawing=false; document.getElementById('drawCanvas').style.display='none'; } if(m==='build') controls.enabled=true; }
}
segBtns.forEach(b=> b.addEventListener('click', ()=> setInteractionMode(b.dataset.seg)));
camToggleBtn?.addEventListener('click', ()=> setInteractionMode(interactionMode==='build'?'camera':'build'));

const panelLeft=document.getElementById('panelLeft'); const menuToggle=document.getElementById('menuToggle'); const sheetHandle=document.getElementById('sheetHandle');
let sheetOpen=window.innerWidth>1350;
function setSheet(o){ sheetOpen=o; if(window.innerWidth<=1350){ panelLeft.classList.toggle('open',o); menuToggle.innerHTML=o?`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"/></svg>`:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 7h16M4 12h16M4 17h16"/></svg>`; } }
menuToggle?.addEventListener('click', ()=>setSheet(!sheetOpen)); sheetHandle?.addEventListener('click', ()=>setSheet(!sheetOpen));
let startY=0; sheetHandle?.addEventListener('touchstart', e=>{startY=e.touches[0].clientY;},{passive:true}); sheetHandle?.addEventListener('touchmove', e=>{ const dy=e.touches[0].clientY-startY; if(dy<-30)setSheet(true); if(dy>40)setSheet(false); },{passive:true});

function initViewer(id){
  const c=document.getElementById(id); if(!c) return;
  const r2=new THREE.WebGLRenderer({ canvas:c, alpha:true, antialias:!isMobile }); r2.setPixelRatio(Math.min(window.devicePixelRatio,1.6));
  const resize=()=>{ const w=c.clientWidth,h=c.clientHeight||220; r2.setSize(w,h,false); cam2.aspect=w/h; cam2.updateProjectionMatrix(); };
  const w=c.clientWidth,h=c.clientHeight||220; r2.setSize(w,h,false);
  const s2=new THREE.Scene(); const cam2=new THREE.PerspectiveCamera(35,w/(h||220),0.1,100); cam2.position.set(1.6,0.9,1.3);
  const ctrl2=new OrbitControls(cam2,c); ctrl2.enableDamping=true; ctrl2.autoRotate=true; ctrl2.autoRotateSpeed=1.6; ctrl2.enableZoom=false;
  s2.add(new THREE.AmbientLight(0x888caa,1.2)); const dl=new THREE.DirectionalLight(0xffffff,2); dl.position.set(2,4,2); s2.add(dl); const dl2=new THREE.DirectionalLight(themes[theme].color,1.5); dl2.position.set(-2,1,-2); s2.add(dl2);
  const bot=createMicrobotMeshClassic(true); bot.scale.set(2.0,2.0,2.0); bot.position.y=-0.08; s2.add(bot);
  const floorGeo=new THREE.CircleGeometry(1.5,32); const floorMat=new THREE.MeshStandardMaterial({ color:0x0c0f18, roughness:0.2, metalness:0.8, transparent:true, opacity:0.6 }); const floor=new THREE.Mesh(floorGeo,floorMat); floor.rotation.x=-Math.PI/2; floor.position.y=-0.28; s2.add(floor);
  const grid2=new THREE.GridHelper(4,20,0x1b2133,0x121620); grid2.position.y=-0.27; s2.add(grid2);
  const anim=()=>{ requestAnimationFrame(anim); bot.rotation.y+=0.0025; const ld=bot.userData.led; if(ld){ ld.material.color.set(themes[theme].color); ld.material.emissive.set(themes[theme].color);} bot.userData.legs?.forEach((leg,li)=>{ const t=performance.now()*0.003+li; leg.legGroup.rotation.x=Math.sin(t)*0.2; }); ctrl2.update(); r2.render(s2,cam2); }; anim();
  window.addEventListener('resize', resize); new ResizeObserver(resize).observe(c.parentElement);
}
initViewer('microSingle'); initViewer('microSingleMobile');
if(isMobile) document.getElementById('mobileBlueprintCard').style.display='block';

const countSlider=document.getElementById('count'), countVal=document.getElementById('countVal');
const cohesionSlider=document.getElementById('cohesion'), cohesionVal=document.getElementById('cohesionVal');
const linkSlider=document.getElementById('linkDist'), linkVal=document.getElementById('linkVal');
const speedSlider=document.getElementById('buildSpeed'), speedVal=document.getElementById('speedVal');
const scaleSlider=document.getElementById('scale'), scaleVal=document.getElementById('scaleVal');
const rotSlider=document.getElementById('rotation'), rotVal=document.getElementById('rotVal');
const gravSlider=document.getElementById('gravity'), gravVal=document.getElementById('gravVal');
const windSlider=document.getElementById('wind'), windVal=document.getElementById('windVal');
const windZSlider=document.getElementById('windZ'), windZVal=document.getElementById('windZVal');
const wallHSlider=document.getElementById('wallHeight'), wallHVal=document.getElementById('wallHVal');
const wallTSlider=document.getElementById('wallThick'), wallTVal=document.getElementById('wallTVal');

countSlider.value=count; countVal.textContent=count;
countSlider.addEventListener('input', e=>{ count=parseInt(e.target.value); countVal.textContent=count; document.getElementById('activeCount').textContent=count; const me=document.getElementById('activeCountM'); if(me) me.textContent=count; });
countSlider.addEventListener('change', e=>{ swarm.setCount(parseInt(e.target.value)); updateFormation(true); });
cohesionSlider.addEventListener('input', e=> cohesionVal.textContent=parseFloat(e.target.value).toFixed(2));
linkSlider.addEventListener('input', e=> linkVal.textContent=parseFloat(e.target.value).toFixed(1));
speedSlider.addEventListener('input', e=> speedVal.textContent=parseFloat(e.target.value).toFixed(1));
scaleSlider.addEventListener('input', e=>{ formationScale=parseFloat(e.target.value); scaleVal.textContent=formationScale.toFixed(2); updateFormation(true); });
rotSlider.addEventListener('input', e=>{ formationRot=parseFloat(e.target.value)*Math.PI/180; rotVal.textContent=e.target.value+'°'; updateFormation(true); });
gravSlider.addEventListener('input', e=>{ const g=parseFloat(e.target.value); world.gravity.set(0,g,0); gravVal.textContent=g; });
windSlider.addEventListener('input', e=>{ windX=parseFloat(e.target.value); windVal.textContent=windX.toFixed(1); document.getElementById('windDisplay').textContent=`${windX.toFixed(1)},${windZ.toFixed(1)}`; });
windZSlider.addEventListener('input', e=>{ windZ=parseFloat(e.target.value); windZVal.textContent=windZ.toFixed(1); document.getElementById('windDisplay').textContent=`${windX.toFixed(1)},${windZ.toFixed(1)}`; });
wallHSlider.addEventListener('input', e=>{ wallHeight=parseFloat(e.target.value); wallHVal.textContent=wallHeight.toFixed(1)+'m'; document.getElementById('wallHDisp').textContent=wallHeight.toFixed(1); });
wallTSlider.addEventListener('input', e=>{ wallThick=parseFloat(e.target.value); wallTVal.textContent=wallThick.toFixed(1)+'m'; });

function applyTheme(th){
  theme=th; accentColor.set(themes[th].color);
  transMat.color.set(themes[th].color); transMat.emissive.set(themes[th].color);
  ringMat1.color.set(themes[th].color); ringMat2.color.set(themes[th].color); vLineMat.color.set(themes[th].color);
  pointA.color.set(themes[th].color); ghostMat.color.set(themes[th].color);
  document.querySelectorAll('.color-dot').forEach(d=> d.classList.toggle('active', d.dataset.color===th));
  const status=document.getElementById('transStatus'); const label=document.getElementById('transLabel');
  if(th==='yokai'){ status.classList.add('yokai'); label.textContent=isMobile?'YOKAI • PHYS':'YOKAI • PHYSICS'; document.querySelectorAll('.mode-btn.active').forEach(b=>{b.classList.remove('active'); b.classList.add('yokai-active');}); }
  else { status.classList.remove('yokai'); label.textContent=isMobile?`${th.toUpperCase()} • PHYS`:`${th.toUpperCase()} • PHYSICS`; document.querySelectorAll('.mode-btn.yokai-active').forEach(b=>{b.classList.remove('yokai-active'); b.classList.add('active');}); }
  swarm.bots.forEach(bot=>{
    const led=bot.mesh.userData.led; if(led){ led.material.color.set(themes[th].color); led.material.emissive.set(themes[th].color); }
    const thr=bot.mesh.userData.thruster; if(thr) thr.material.color.set(themes[th].color);
    bot.mesh.userData.legs?.forEach(l=>{ l.tipMat.emissive.set(themes[th].color); l.tipMat.color.set(themes[th].color); l.tipMat.emissive.set(themes[th].color); });
  });
}
document.querySelectorAll('.color-dot').forEach(d=> d.addEventListener('click', ()=> applyTheme(d.dataset.color)));
document.getElementById('btnHiro').addEventListener('click', ()=> applyTheme('hiro'));
document.getElementById('btnYokai').addEventListener('click', ()=> applyTheme('yokai'));

const toggleEls=document.querySelectorAll('.toggle');
const flags={ physics:false, stress:false, ghost:true, smart:true, scaffold:true, links:true };
toggleEls.forEach(el=>{
  el.addEventListener('click', ()=>{
    const key=el.dataset.toggle;
    flags[key]=!flags[key];
    el.classList.toggle('active', flags[key]);
    if(key==='ghost') swarm.ghostEnabled=flags[key];
    if(key==='smart') swarm.smartAssign=flags[key];
    if(key==='scaffold') swarm.scaffold=flags[key];
    if(key==='links') swarm.linksEnabled=flags[key];
    if(key==='physics'){
      physicsEnabled=flags[key];
      document.getElementById('physM').textContent=physicsEnabled?'ON':'OFF';
      if(!physicsEnabled){ clearAllPhysics(); } else {
        for(let i=0;i<swarm.count;i++){
          if(swarm.bots[i].mesh.position.distanceTo(swarm.targets[i])<0.6){
            const isBase=swarm.bots[i].mesh.position.y < -0.6;
            createPhysicsBody(i, swarm.bots[i].mesh.position, isBase);
          }
        }
      }
    }
    if(key==='stress'){ stressHeatmap=flags[key]; }
    if(key==='ghost') swarm.updateGhost();
  });
});

const btnAuto=document.getElementById('btnAuto'), btnAssemble=document.getElementById('btnAssemble'), btnScatter=document.getElementById('btnScatter');
const btnDropBall=document.getElementById('btnDropBall'), btnClearBalls=document.getElementById('btnClearBalls'), btnCollapse=document.getElementById('btnCollapse'), btnRemoveBase=document.getElementById('btnRemoveBase');
const btnDrawMode=document.getElementById('btnDrawMode'), btnBuildWall=document.getElementById('btnBuildWall'), btnClearDraw=document.getElementById('btnClearDraw');
const progBar=document.getElementById('buildProg'), progTxt=document.getElementById('progTxt');

btnAuto.addEventListener('click', ()=>{
  autoBuild=!autoBuild; btnAuto.textContent=`AUTO BUILD: ${autoBuild?'ON':'OFF'}`; btnAuto.classList.toggle('active', autoBuild);
  if(autoBuild){ swarm.buildProgress=0.02; buildProg=0.02; } else swarm.buildProgress=1;
});
btnAssemble.addEventListener('click', ()=>{ swarm.buildProgress=0.02; buildProg=0.02; autoBuild=true; btnAuto.textContent='AUTO BUILD: ON'; btnAuto.classList.add('active'); });
btnScatter.addEventListener('click', ()=>{
  for(let i=0;i<swarm.count;i++) swarm.velocities[i].add(new THREE.Vector3((Math.random()-0.5)*4, Math.random()*2.5, (Math.random()-0.5)*4));
  clearAllPhysics(); swarm.buildProgress=1; buildProg=1; autoBuild=false; btnAuto.textContent='AUTO BUILD: OFF'; btnAuto.classList.remove('active');
  const pts=getFormation('scatter', swarm.count, transmitter.position, performance.now());
  swarm.setFormationPoints(transformPoints(pts, transmitter.position, formationScale, formationRot));
});
btnDropBall.addEventListener('click', ()=> spawnBall());
btnClearBalls.addEventListener('click', ()=> clearBalls());
btnCollapse.addEventListener('click', ()=>{
  // remove 25% random physics bodies to cause collapse
  const bodies=Array.from(physicsBodies.keys());
  for(let i=0;i<Math.floor(bodies.length*0.25);i++){
    const idx=bodies[Math.floor(Math.random()*bodies.length)];
    removePhysicsBody(idx);
    swarm.velocities[idx].add(new THREE.Vector3((Math.random()-0.5)*2, Math.random()*1.5, (Math.random()-0.5)*2));
  }
  if(navigator.vibrate) navigator.vibrate([30,20,30]);
});
btnRemoveBase.addEventListener('click', ()=>{
  for(let i=0;i<swarm.count;i++){
    if(physicsBodies.has(i)){
      const body=physicsBodies.get(i);
      if(body.position.y < -0.3){
        removePhysicsBody(i);
        swarm.velocities[i].add(new THREE.Vector3((Math.random()-0.5)*1.5, 1, (Math.random()-0.5)*1.5));
      }
    }
  }
});
btnDrawMode.addEventListener('click', ()=>{
  drawMode=!drawMode;
  btnDrawMode.textContent=`DRAW WALL: ${drawMode?'ON':'OFF'}`;
  btnDrawMode.classList.toggle('active', drawMode);
  setInteractionMode(drawMode?'draw':'build');
  if(drawMode){ drawPoints=[]; if(drawLine){ scene.remove(drawLine); drawLine=null; } document.getElementById('drawPreview').textContent='Draw mode ON — drag on ground to draw wall path'; document.getElementById('drawPreview').classList.add('active'); }
});
btnBuildWall.addEventListener('click', ()=>{
  if(drawPoints.length<2){ alert('Draw at least 2 points'); return; }
  customWallPoints=generateWallFromPath(drawPoints, swarm.count, wallHeight, wallThick);
  mode='customWall';
  document.getElementById('modeLabel').textContent='CUSTOM WALL';
  document.getElementById('modeLabelM').textContent='CUSTOM WALL';
  renderModes(document.querySelector('.chip.active')?.dataset.cat || 'all');
  const transformed=transformPoints(customWallPoints, new THREE.Vector3(0,0,0), formationScale, formationRot);
  swarm.setFormationPoints(transformed);
  swarm.buildProgress=0.02; buildProg=0.02; autoBuild=true; btnAuto.textContent='AUTO BUILD: ON'; btnAuto.classList.add('active');
  drawMode=false; setInteractionMode('build'); btnDrawMode.textContent='DRAW WALL: OFF'; btnDrawMode.classList.remove('active');
  document.getElementById('drawCanvas').style.display='none';
  if(navigator.vibrate) navigator.vibrate(20);
});
btnClearDraw.addEventListener('click', ()=>{
  drawPoints=[]; customWallPoints=null;
  if(drawLine){ scene.remove(drawLine); drawLine=null; }
  document.getElementById('drawPreview').textContent='Cleared — draw new path';
  document.getElementById('drawPreview').classList.remove('active');
  document.getElementById('drawPtsCount').textContent='0';
  if(mode==='customWall'){ mode='orbit'; updateFormation(true); }
  renderModes(document.querySelector('.chip.active')?.dataset.cat || 'all');
});

window.addEventListener('load', ()=>{
  setTimeout(()=>{
    document.getElementById('loader')?.classList.add('hidden');
    const mh=document.getElementById('mobileHint');
    if(isMobile && mh){ mh.style.display='flex'; setTimeout(()=>{ mh.style.opacity='0'; mh.style.transform='translateX(-50%) translateY(10px)'; }, 5000); setTimeout(()=> mh.style.display='none', 5500); }
  }, isMobile?1000:700);
});

updateFormation(true);

let last=performance.now(); let fpsAcc=0,fpsCount=0,lastFps=performance.now(); let linkDisp=0;
function animate(){
  requestAnimationFrame(animate);
  const now=performance.now(); const dt=Math.min((now-last)/1000,0.05); last=now;

  transmitter.position.lerp(transmitterTarget, 0.09);
  pointA.position.copy(transmitter.position); pointA.position.y+=0.6;
  transmitter.rotation.y+=dt*0.7; transRing.rotation.z+=dt*0.6;

  if(autoBuild){
    buildProg=Math.min(1, buildProg + dt*0.38*parseFloat(document.getElementById('buildSpeed').value));
    swarm.buildProgress=buildProg;
    if(progBar) progBar.style.width=`${buildProg*100}%`;
    if(progTxt) progTxt.textContent=`${Math.round(buildProg*100)}%`;
    if(Math.floor(buildProg*20)!==Math.floor((buildProg - dt*0.38)*20)) swarm.reassignTargets();
    if(buildProg>=1){ autoBuild=false; btnAuto.textContent='AUTO BUILD: OFF'; btnAuto.classList.remove('active'); }
  } else {
    if(progBar) progBar.style.width='100%';
    if(progTxt) progTxt.textContent='100%';
  }

  const rawPoints=getFormation(mode, swarm.count, transmitter.position, now);
  const transformed=transformPoints(mode==='customWall' && customWallPoints ? customWallPoints : rawPoints, transmitter.position, formationScale, formationRot);
  swarm.allPoints=transformed.map(p=>p.clone());
  swarm.sortedPoints=[...swarm.allPoints].sort((a,b)=>a.y-b.y);
  swarm.updateGhost();
  if(!autoBuild && now%1000<20) swarm.reassignTargets();

  if(physicsEnabled){
    world.step(1/60, dt, 3);
    if(Math.abs(windX)>0.01 || Math.abs(windZ)>0.01) applyWind(windX, windZ);
    for(const b of ballBodies){ b.mesh.position.copy(b.body.position); b.mesh.quaternion.copy(b.body.quaternion); }
    document.getElementById('physCount').textContent=physicsBodies.size;
    document.getElementById('physTxt').textContent=physicsBodies.size;
  } else {
    document.getElementById('physCount').textContent='0';
    document.getElementById('physTxt').textContent='0';
  }

  const linkCount=swarm.update(dt, now, {
    cohesion: parseFloat(document.getElementById('cohesion').value),
    linkDistance: parseFloat(document.getElementById('linkDist').value),
    transmitterPos: transmitter.position,
    buildSpeed: parseFloat(document.getElementById('buildSpeed').value)
  });
  linkDisp=linkCount;

  controls.update();
  renderer.render(scene,camera);

  fpsAcc+=1/dt; fpsCount++;
  if(now-lastFps>500){
    const fps=Math.round(fpsAcc/fpsCount);
    document.getElementById('fps').textContent=fps;
    const fpsM=document.getElementById('fpsM'); if(fpsM) fpsM.textContent=fps;
    document.getElementById('linkCount').textContent=linkDisp;
    document.getElementById('activeCount').textContent=swarm.count;
    document.getElementById('totalCount').textContent=swarm.count;
    fpsAcc=0;fpsCount=0;lastFps=now;
  }
}
animate();

window.addEventListener('resize', ()=>{
  renderer.setSize(window.innerWidth, window.innerHeight);
  camera.aspect=window.innerWidth/window.innerHeight;
  camera.updateProjectionMatrix();
});

setTimeout(()=>{ transmitterTarget.set(isMobile?2:3,2,isMobile?2:2); }, 400);

window.addEventListener('keydown', e=>{
  if(e.key.toLowerCase()==='s'){ const a=document.createElement('a'); a.download=`microbot-v7-classic-${mode}-${Date.now()}.png`; a.href=renderer.domElement.toDataURL('image/png'); a.click(); }
  if(e.key.toLowerCase()==='d'){ drawMode=!drawMode; btnDrawMode.textContent=`DRAW WALL: ${drawMode?'ON':'OFF'}`; btnDrawMode.classList.toggle('active', drawMode); setInteractionMode(drawMode?'draw':'build'); }
  if(e.key.toLowerCase()==='p'){ const t=document.querySelector('[data-toggle=\"physics\"]'); if(t) t.click(); }
  if(e.code==='Space'){ spawnBall(); e.preventDefault(); }
});
