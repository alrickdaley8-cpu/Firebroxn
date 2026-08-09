import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { getFormation } from './formations.js';
import { Joystick } from './joystick.js';
import * as CANNON from 'cannon-es';

const isMobile = /Android|iPhone|iPad|iPod|Mobi/i.test(navigator.userAgent) || window.innerWidth <= 1300;

// Scene
const canvas = document.getElementById('canvas');
const drawCanvas = document.getElementById('drawCanvas');
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

// lights
scene.add(new THREE.AmbientLight(0x7f8bb3,0.72));
const keyLight=new THREE.DirectionalLight(0xe6eeff,2.4); keyLight.position.set(10,16,8); scene.add(keyLight);
const fillLight=new THREE.DirectionalLight(0x25304a,1.1); fillLight.position.set(-10,5,-10); scene.add(fillLight);
const rimLight=new THREE.DirectionalLight(0x00e5ff,0.6); rimLight.position.set(0,8,-12); scene.add(rimLight);

// themes
let theme='hiro';
const themes={
  hiro:{ color:0x00e5ff, emissive:0x00e5ff },
  yokai:{ color:0xff1744, emissive:0xff1744 },
  gogo:{ color:0xffe600, emissive:0xffe600 },
  wasabi:{ color:0x29ff7a, emissive:0x29ff7a },
  honey:{ color:0xff6bd6, emissive:0xff6bd6 },
  fred:{ color:0x5a7bff, emissive:0x5a7bff },
};
let accentColor = new THREE.Color(themes[theme].color);

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

// ghost
const ghostGeo=new THREE.BufferGeometry();
const ghostMat=new THREE.PointsMaterial({ color:themes[theme].color, size:0.16, transparent:true, opacity:0.22, sizeAttenuation:true, depthWrite:false });
const ghostPoints=new THREE.Points(ghostGeo, ghostMat); scene.add(ghostPoints);

// sparks
class SparkSystem{
  constructor(max=600){
    this.max=max;
    this.positions=new Float32Array(max*3);
    this.velocities=new Float32Array(max*3);
    this.lifetimes=new Float32Array(max);
    this.alive=new Uint8Array(max);
    this.count=0; this.next=0;
    this.geo=new THREE.BufferGeometry();
    this.geo.setAttribute('position', new THREE.BufferAttribute(this.positions,3));
    this.mat=new THREE.PointsMaterial({ color:0xffffff, size:0.12, transparent:true, opacity:0.9, sizeAttenuation:true, depthWrite:false, blending:THREE.AdditiveBlending });
    this.points=new THREE.Points(this.geo, this.mat);
    scene.add(this.points);
  }
  spawn(pos,n=6,color=themes[theme].color){
    this.mat.color.set(color);
    for(let i=0;i<n;i++){
      const idx=this.next;
      this.positions[idx*3]=pos.x + (Math.random()-0.5)*0.08;
      this.positions[idx*3+1]=pos.y + (Math.random()-0.5)*0.08;
      this.positions[idx*3+2]=pos.z + (Math.random()-0.5)*0.08;
      const ang=Math.random()*Math.PI*2; const sp=Math.random()*2.2+0.6;
      this.velocities[idx*3]=Math.cos(ang)*sp*0.5 + (Math.random()-0.5)*0.8;
      this.velocities[idx*3+1]=Math.random()*2.4+0.4;
      this.velocities[idx*3+2]=Math.sin(ang)*sp*0.5 + (Math.random()-0.5)*0.8;
      this.lifetimes[idx]=1.0; this.alive[idx]=1;
      this.next=(this.next+1)%this.max; if(this.count<this.max) this.count++;
    }
  }
  update(dt){
    for(let i=0;i<this.max;i++){
      if(!this.alive[i]) continue;
      this.lifetimes[i]-=dt*1.8;
      if(this.lifetimes[i]<=0){ this.alive[i]=0; continue; }
      this.velocities[i*3+1]-=dt*3.2;
      this.positions[i*3]+=this.velocities[i*3]*dt;
      this.positions[i*3+1]+=this.velocities[i*3+1]*dt;
      this.positions[i*3+2]+=this.velocities[i*3+2]*dt;
      this.velocities[i*3]*=0.98; this.velocities[i*3+2]*=0.98;
    }
    this.geo.attributes.position.needsUpdate=true;
    this.geo.computeBoundingSphere();
  }
}
const sparks=new SparkSystem();

// Physics world
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

// Physics management
const physicsBodies=new Map(); // botIdx -> body
const physicsConstraints=[]; // {a,b,constraint}
const ballBodies=[]; // {mesh, body}
let physicsEnabled=false;
let stressHeatmap=false;

function createLockedBody(botIdx, pos, isBase){
  if(physicsBodies.has(botIdx)) return physicsBodies.get(botIdx);
  const shape=new CANNON.Box(new CANNON.Vec3(0.28,0.08,0.19));
  const body=new CANNON.Body({ mass: isBase?0:0.35, shape, position:new CANNON.Vec3(pos.x,pos.y,pos.z), material:groundMat, linearDamping:0.15, angularDamping:0.35 });
  // sleep if base
  if(isBase) body.type=CANNON.Body.STATIC;
  world.addBody(body);
  physicsBodies.set(botIdx, body);
  // connect to nearby locked bodies
  for(const [otherIdx, otherBody] of physicsBodies.entries()){
    if(otherIdx===botIdx) continue;
    const otherPos=otherBody.position;
    const dist=Math.hypot(pos.x-otherPos.x, pos.y-otherPos.y, pos.z-otherPos.z);
    if(dist<1.6 && dist>0.05){
      // limit connections to 4 per body to avoid explosion
      let connCount=0;
      for(const c of physicsConstraints){ if(c.a===botIdx||c.b===botIdx) connCount++; }
      if(connCount>=4) continue;
      try{
        const constraint=new CANNON.LockConstraint(body, otherBody);
        world.addConstraint(constraint);
        physicsConstraints.push({a:botIdx,b:otherIdx,constraint, restDist:dist});
      }catch(e){
        // fallback point2point
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
function removeLockedBody(botIdx){
  const body=physicsBodies.get(botIdx);
  if(!body) return;
  // remove constraints
  for(let i=physicsConstraints.length-1;i>=0;i--){
    const c=physicsConstraints[i];
    if(c.a===botIdx||c.b===botIdx){
      try{ world.removeConstraint(c.constraint); }catch{}
      physicsConstraints.splice(i,1);
    }
  }
  try{ world.removeBody(body); }catch{}
  physicsBodies.delete(botIdx);
}
function clearAllPhysicsBodies(){
  for(const [idx, body] of physicsBodies.entries()){
    try{ world.removeBody(body); }catch{}
  }
  for(const c of physicsConstraints){
    try{ world.removeConstraint(c.constraint); }catch{}
  }
  physicsBodies.clear();
  physicsConstraints.length=0;
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
function clearBalls(){
  for(const b of ballBodies){
    scene.remove(b.mesh);
    try{ world.removeBody(b.body); }catch{}
  }
  ballBodies.length=0;
  updateBallCount();
}
function updateBallCount(){ document.getElementById('ballCount').textContent=ballBodies.length; }
function applyWind(wx,wz){
  for(const body of physicsBodies.values()){
    if(body.type!==CANNON.Body.STATIC){
      body.applyForce(new CANNON.Vec3(wx*2.5,0,wz*2.5), body.position);
    }
  }
}

// upgraded bot mesh v6 (same as before but refined)
function createMicrobotMeshV6(isLeader=false){
  const group=new THREE.Group();
  const chassisGeo=new THREE.BoxGeometry(0.58,0.16,0.42);
  const chassisMat=new THREE.MeshStandardMaterial({ color:0x0e1016, roughness:0.38, metalness:0.86 });
  const chassis=new THREE.Mesh(chassisGeo, chassisMat); group.add(chassis);
  const midGeo=new THREE.BoxGeometry(0.54,0.06,0.38);
  const midMat=new THREE.MeshStandardMaterial({ color:0x151a28, roughness:0.32, metalness:0.78 });
  const mid=new THREE.Mesh(midGeo, midMat); mid.position.y=0.09; group.add(mid);
  const topGeo=new THREE.BoxGeometry(0.50,0.045,0.34);
  const topMat=new THREE.MeshStandardMaterial({ color:0x1c2236, roughness:0.28, metalness:0.72 });
  const top=new THREE.Mesh(topGeo, topMat); top.position.y=0.145; group.add(top);
  const screwGeo=new THREE.CylinderGeometry(0.018,0.018,0.02,10);
  const screwMat=new THREE.MeshStandardMaterial({ color:0x2a314a, roughness:0.4, metalness:0.9 });
  [[-0.21,-0.14],[0.21,-0.14],[-0.21,0.14],[0.21,0.14]].forEach(([x,z])=>{ const s=new THREE.Mesh(screwGeo,screwMat); s.position.set(x,0.175,z); group.add(s); });
  const housingGeo=new THREE.CylinderGeometry(0.13,0.13,0.03,16);
  const housingMat=new THREE.MeshStandardMaterial({ color:0x0a0c13, roughness:0.5, metalness:0.6 });
  const housing=new THREE.Mesh(housingGeo, housingMat); housing.position.set(0,0.172,0); group.add(housing);
  const ledGeo=new THREE.BoxGeometry(0.11,0.018,0.11);
  const ledMat=new THREE.MeshStandardMaterial({ color:themes[theme].color, emissive:themes[theme].color, emissiveIntensity: isLeader?7:3.2 });
  const led=new THREE.Mesh(ledGeo, ledMat); led.position.set(0,0.19,0); group.add(led); group.userData.led=led;
  const ventGeo=new THREE.BoxGeometry(0.02,0.02,0.12);
  const ventMat=new THREE.MeshStandardMaterial({ color:0x0a0c13, roughness:0.6, metalness:0.4 });
  const ventL=new THREE.Mesh(ventGeo, ventMat); ventL.position.set(-0.29,0.05,0); group.add(ventL);
  const ventR=new THREE.Mesh(ventGeo, ventMat); ventR.position.set(0.29,0.05,0); group.add(ventR);
  const antGeo=new THREE.CylinderGeometry(0.008,0.008,0.09,8);
  const antMat=new THREE.MeshStandardMaterial({ color:0x2a2f45, metalness:0.7, roughness:0.4 });
  const ant=new THREE.Mesh(antGeo, antMat); ant.position.set(0,0.21,-0.16); group.add(ant);
  const antTopGeo=new THREE.SphereGeometry(0.016,8,8);
  const antTopMat=new THREE.MeshStandardMaterial({ color:themes[theme].color, emissive:themes[theme].color, emissiveIntensity:2 });
  const antTop=new THREE.Mesh(antTopGeo, antTopMat); antTop.position.set(0,0.05,0); ant.add(antTop); group.userData.antTop=antTop;
  const thrusterGeo=new THREE.CircleGeometry(0.18,16);
  const thrusterMat=new THREE.MeshBasicMaterial({ color:themes[theme].color, transparent:true, opacity:0.18, side:THREE.DoubleSide });
  const thruster=new THREE.Mesh(thrusterGeo, thrusterMat); thruster.rotation.x=-Math.PI/2; thruster.position.y=-0.09; group.add(thruster); group.userData.thruster=thruster;
  const legShoulderPositions=[new THREE.Vector3(-0.24,-0.02,0.16),new THREE.Vector3(0.24,-0.02,0.16),new THREE.Vector3(-0.24,-0.02,-0.16),new THREE.Vector3(0.24,-0.02,-0.16)];
  const legs=[];
  legShoulderPositions.forEach((sh,posIdx)=>{
    const legGroup=new THREE.Group(); legGroup.position.copy(sh); group.add(legGroup);
    const upperGeo=new THREE.CapsuleGeometry(0.038,0.14,3,8);
    const legMat=new THREE.MeshStandardMaterial({ color:0x0a0c11, roughness:0.5, metalness:0.6 });
    const upper=new THREE.Mesh(upperGeo,legMat); upper.position.set(0,-0.07,0); legGroup.add(upper);
    const kneeGeo=new THREE.SphereGeometry(0.036,8,8);
    const kneeMat=new THREE.MeshStandardMaterial({ color:0x1e263d, metalness:0.8, roughness:0.35 });
    const knee=new THREE.Mesh(kneeGeo,kneeMat); knee.position.set(0,-0.145,0); legGroup.add(knee);
    const lowerGroup=new THREE.Group(); lowerGroup.position.set(0,-0.145,0); legGroup.add(lowerGroup);
    const lowerGeo=new THREE.CapsuleGeometry(0.032,0.16,3,8);
    const lower=new THREE.Mesh(lowerGeo,legMat); lower.position.set(0,-0.08,0); lowerGroup.add(lower);
    const footGeo=new THREE.BoxGeometry(0.08,0.036,0.08);
    const footMat=new THREE.MeshStandardMaterial({ color:0x252e4a, metalness:0.88, roughness:0.32, emissive:themes[theme].color, emissiveIntensity:0.0 });
    const foot=new THREE.Mesh(footGeo,footMat); foot.position.set(0,-0.17,0); lowerGroup.add(foot);
    const tipGeo=new THREE.SphereGeometry(0.032,8,8);
    const tipMat=new THREE.MeshStandardMaterial({ color:themes[theme].color, emissive:themes[theme].color, emissiveIntensity:0.0, transparent:true, opacity:0.0 });
    const tip=new THREE.Mesh(tipGeo,tipMat); tip.position.set(0,-0.025,0); foot.add(tip);
    legs.push({ legGroup, upper, knee, lowerGroup, lower, foot, footMat, tip, tipMat });
  });
  group.userData.legs=legs; group.userData.locked=false;
  return group;
}

// Swarm V7
class MicroSwarmV7{
  constructor(count){
    this.count=count; this.bots=[]; this.velocities=[]; this.targets=[]; this.locked=[]; this.targetIndices=[];
    this.allPoints=[]; this.sortedPoints=[];
    this.ghostEnabled=true; this.sparksEnabled=true; this.smartAssign=true; this.scaffold=true; this.precisionMode=true;
    this.linksEnabled=true; this.lockGlow=true; this.orbitHold=true;
    this.precisionDist=0.16; this.buildProgress=1; this.numLayers=12; this.lockedCount=0; this.avgError=0;
    this.group=new THREE.Group(); scene.add(this.group);
    this.linkGeo=new THREE.BufferGeometry();
    this.linkMat=new THREE.LineBasicMaterial({ color:themes[theme].color, transparent:true, opacity:0.16, depthWrite:false });
    this.linkLines=new THREE.LineSegments(this.linkGeo, this.linkMat); scene.add(this.linkLines);
    this.initBots();
  }
  initBots(){
    this.bots.forEach(b=>this.group.remove(b.mesh));
    this.bots=[]; this.velocities=[]; this.targets=[]; this.locked=[]; this.targetIndices=[];
    for(let i=0;i<this.count;i++){
      const mesh=createMicrobotMeshV6(i===0);
      const r=8*Math.cbrt(Math.random()); const th=Math.random()*Math.PI*2; const ph=Math.acos(2*Math.random()-1);
      mesh.position.set(r*Math.sin(ph)*Math.cos(th), r*Math.sin(ph)*Math.sin(th)*0.6+2, r*Math.cos(ph));
      mesh.rotation.set(Math.random()*Math.PI, Math.random()*Math.PI, Math.random()*Math.PI);
      this.group.add(mesh);
      this.bots.push({ mesh, phase:Math.random()*Math.PI*2, locked:false, lockTime:0, targetIdx:i });
      this.velocities.push(new THREE.Vector3(0,0,0));
      this.targets.push(mesh.position.clone());
      this.locked.push(false);
      this.targetIndices.push(i);
    }
    this.lockedCount=0;
  }
  setCount(n){
    if(n===this.count) return;
    const old=n;
    // clean physics for removed bots if any
    if(n<this.count){
      for(let i=n;i<this.count;i++) removeLockedBody(i);
    }
    this.count=n; this.initBots();
    if(this.allPoints.length) this.setFormationPoints(this.allPoints);
  }
  setFormationPoints(points){
    this.allPoints=points.map(p=>p.clone());
    this.sortedPoints=[...this.allPoints].sort((a,b)=>a.y-b.y);
    this.updateGhost();
    this.reassignTargets();
  }
  updateGhost(){
    if(!this.ghostEnabled){ ghostPoints.visible=false; return; }
    ghostPoints.visible=true;
    const flat=new Float32Array(this.allPoints.length*3);
    for(let i=0;i<this.allPoints.length;i++){ flat[i*3]=this.allPoints[i].x; flat[i*3+1]=this.allPoints[i].y; flat[i*3+2]=this.allPoints[i].z; }
    ghostGeo.setAttribute('position', new THREE.BufferAttribute(flat,3));
    ghostGeo.computeBoundingSphere();
    ghostMat.color.set(themes[theme].color);
    ghostMat.opacity=0.20 + this.buildProgress*0.12;
  }
  reassignTargets(){
    const count=this.count;
    if(!this.sortedPoints.length) return;
    const allowedCount=this.scaffold ? Math.floor(count*this.buildProgress) : count;
    const buildingPoints=this.sortedPoints.slice(0, Math.max(1, allowedCount));
    if(this.smartAssign){
      const unassigned=new Set(Array.from({length:count},(_,i)=>i));
      const newTargets=new Array(count);
      const newIndices=new Array(count);
      for(let pi=0; pi<buildingPoints.length; pi++){
        const pt=buildingPoints[pi];
        let best=-1,bestDist=Infinity;
        for(const bi of unassigned){
          const d=this.bots[bi].mesh.position.distanceTo(pt);
          if(d<bestDist){ bestDist=d; best=bi; }
        }
        if(best!==-1){ newTargets[best]=pt.clone(); newIndices[best]=pi; unassigned.delete(best); }
      }
      const holding=this.generateHolding( count - buildingPoints.length );
      let hi=0;
      for(const bi of unassigned){ newTargets[bi]=holding[hi]?holding[hi].clone():new THREE.Vector3((Math.random()-0.5)*6,2+Math.random()*2,(Math.random()-0.5)*6); newIndices[bi]=-1; hi++; }
      for(let i=0;i<count;i++){ if(newTargets[i]) this.targets[i].copy(newTargets[i]); this.targetIndices[i]=newIndices[i]; }
    } else {
      for(let i=0;i<count;i++){
        if(i<buildingPoints.length) this.targets[i].copy(buildingPoints[i]);
        else { const h=this.generateHolding(1)[0]; this.targets[i].copy(h); }
      }
    }
  }
  generateHolding(n){
    const pts=[]; const center=transmitter.position;
    for(let i=0;i<n;i++){ const ang=(i/n)*Math.PI*2 + performance.now()*0.0003; const r=2.0 + (i%3)*0.6; const y=2 + Math.sin(i*0.7 + performance.now()*0.001)*0.8; pts.push(new THREE.Vector3(center.x + Math.cos(ang)*r, y, center.z + Math.sin(ang)*r)); }
    return pts;
  }
  unlockAll(){
    for(let i=0;i<this.count;i++){
      this.bots[i].locked=false; this.locked[i]=false; this.bots[i].mesh.userData.locked=false;
      const legs=this.bots[i].mesh.userData.legs;
      if(legs) legs.forEach(l=>{ l.footMat.emissiveIntensity=0; l.tipMat.emissiveIntensity=0; l.tipMat.opacity=0; });
      removeLockedBody(i);
    }
    this.lockedCount=0;
  }
  update(dt,time,params){
    const cohesion=params.cohesion, linkDist=params.linkDistance, transPos=params.transmitterPos, speed=params.buildSpeed||1;
    const lockDist=params.lockDist||this.precisionDist;
    const precisionMode=params.precisionMode??true;
    const positions=[];
    let totalErr=0, errC=0, lockedNow=0;

    for(let i=0;i<this.count;i++){
      const bot=this.bots[i], mesh=bot.mesh, vel=this.velocities[i], target=this.targets[i];
      const isLocked=bot.locked;
      if(isLocked) lockedNow++;

      // physics body sync if locked and physics enabled
      if(isLocked && physicsEnabled){
        const body=physicsBodies.get(i);
        if(body){
          mesh.position.copy(body.position);
          mesh.quaternion.copy(body.quaternion);
          // still count as position for links
          positions.push({pos:mesh.position.clone(), locked:true, idx:i, body});
          // leg tuck
          totalErr+=0;
          // LED
          const led=mesh.userData.led;
          if(led){ led.material.color.set(themes[theme].color); led.material.emissive.set(themes[theme].color); led.material.emissiveIntensity=3.5; }
          continue;
        }
      }

      if(!isLocked){
        const toTarget=target.clone().sub(mesh.position);
        const dist=toTarget.length();
        totalErr+=dist; errC++;
        if(dist < lockDist){
          bot.locked=true; this.locked[i]=true; bot.lockTime=time; mesh.userData.locked=true;
          vel.set(0,0,0);
          const legs=mesh.userData.legs;
          if(legs) legs.forEach(leg=>{ leg.footMat.emissiveIntensity=1.2; leg.tipMat.emissiveIntensity=2.5; leg.tipMat.opacity=0.9; });
          if(this.sparksEnabled) sparks.spawn(mesh.position,7,themes[theme].color);
          transMat.emissiveIntensity=5; setTimeout(()=> transMat.emissiveIntensity=2.8,120);
          // create physics body if physics enabled
          if(physicsEnabled){
            const isBase=target.y < -0.6; // base layer anchor
            createLockedBody(i, mesh.position, isBase);
          }
          continue;
        }
        let approach=1;
        if(precisionMode){ approach=THREE.MathUtils.clamp(dist*1.2,0.12,1); approach=Math.pow(approach,1.2); }
        else approach=Math.min(dist*0.9,1);
        toTarget.normalize().multiplyScalar(0.055 * (0.25 + cohesion*1.9) * approach * speed * Math.min(dist*1.1,3.5));
        const sep=new THREE.Vector3(); let sepC=0; const step=isMobile?3:2;
        for(let j=0;j<this.count;j+=step){
          if(i===j) continue; if(this.bots[j].locked && dist<1.5) continue;
          const other=this.bots[j].mesh.position; const d=mesh.position.distanceTo(other);
          if(d<0.68 && d>0.0001){ const diff=mesh.position.clone().sub(other).normalize().divideScalar(d); sep.add(diff); sepC++; }
        }
        if(sepC>0) sep.divideScalar(sepC).normalize().multiplyScalar(0.036 * (precisionMode?0.6:1));
        if(this.scaffold && this.lockedCount>0){
          let nearest=null, ndist=Infinity;
          for(let j=0;j<this.count;j++){ if(!this.bots[j].locked) continue; const d=mesh.position.distanceTo(this.bots[j].mesh.position); if(d<ndist && d<4){ ndist=d; nearest=this.bots[j].mesh.position; } }
          if(nearest){ const toLocked=nearest.clone().sub(mesh.position).normalize().multiplyScalar(0.008); toTarget.add(toLocked); }
        }
        vel.add(toTarget); vel.add(sep); vel.multiplyScalar(precisionMode?0.92:0.94); vel.clampLength(0,(precisionMode?0.16:0.20)*speed);
        mesh.position.add(vel.clone().multiplyScalar(dt*60));
        if(vel.length()>0.001){ const look=mesh.position.clone().add(vel); mesh.lookAt(look); }
        mesh.rotation.x+=Math.sin(time*0.001*3 + bot.phase)*0.008;
        const legs=mesh.userData.legs;
        if(legs){
          const mv=vel.length()*18; const moving=mv>0.02;
          legs.forEach((leg,li)=>{
            const tripod=(li===0||li===3)?0:Math.PI;
            const t=time*0.01*(moving? mv*2+1 :0.3)+tripod+bot.phase;
            if(moving){ const swing=Math.sin(t)*0.55; const lift=Math.max(0,Math.sin(t))*0.35; leg.legGroup.rotation.x=swing*0.6; leg.legGroup.rotation.z=(li%2===0?-0.12:0.12)+Math.sin(t*0.5)*0.08; leg.lowerGroup.rotation.x=-0.6+Math.cos(t)*0.5 - lift*0.8; }
            else { leg.legGroup.rotation.x=Math.sin(time*0.001+li)*0.08; leg.lowerGroup.rotation.x=-0.25+Math.sin(time*0.0015+li*0.7)*0.12; }
          });
          const thruster=mesh.userData.thruster;
          if(thruster) thruster.material.opacity=0.08+mv*0.35+Math.sin(time*0.01+bot.phase)*0.04;
        }
      } else {
        // locked but physics disabled => spring
        if(!physicsEnabled){
          const toTarget=target.clone().sub(mesh.position);
          const d=toTarget.length(); totalErr+=d; errC++;
          if(d>lockDist*2.2){ if(d>1.2){ bot.locked=false; this.locked[i]=false; mesh.userData.locked=false; } else mesh.position.add(toTarget.multiplyScalar(0.12)); }
          const legs=mesh.userData.legs;
          if(legs){ legs.forEach(leg=>{ leg.legGroup.rotation.x=THREE.MathUtils.lerp(leg.legGroup.rotation.x,0.15,0.08); leg.lowerGroup.rotation.x=THREE.MathUtils.lerp(leg.lowerGroup.rotation.x,-1.2,0.08); }); }
          if(this.lockGlow){
            const legs2=mesh.userData.legs;
            if(legs2){ const pulse=0.8+Math.sin(time*0.005+i)*0.4; legs2.forEach(l=>{ l.footMat.emissiveIntensity=0.6*pulse; l.tipMat.emissiveIntensity=1.5+pulse*0.8; l.tipMat.opacity=0.6+pulse*0.2; }); }
          }
        }
      }
      const led=mesh.userData.led;
      if(led){ led.material.color.set(themes[theme].color); led.material.emissive.set(themes[theme].color); const baseInt=bot.locked? (3.5+Math.sin(time*0.003+i)*0.4) : (2.2+Math.sin(time*0.005+i)*0.8); led.material.emissiveIntensity= baseInt + (mesh.position.distanceTo(transPos)<4?1.2:0); }
      const antTop=mesh.userData.antTop;
      if(antTop){ antTop.material.color.set(themes[theme].color); antTop.material.emissive.set(themes[theme].color); antTop.material.emissiveIntensity= bot.locked?2.5:1.2+Math.sin(time*0.008+i)*0.6; }
      positions.push({pos:mesh.position.clone(), locked:bot.locked, idx:i});
    }

    this.lockedCount=lockedNow; this.avgError= errC? totalErr/errC :0;

    // links with optional stress heatmap
    if(this.linksEnabled){
      const linkPos=[], linkColors=[];
      const gridSize=linkDist; const buckets=new Map();
      const keyFor=v=> `${Math.floor(v.x/gridSize)}_${Math.floor(v.y/gridSize)}_${Math.floor(v.z/gridSize)}`;
      for(let i=0;i<positions.length;i++){ const k=keyFor(positions[i].pos); if(!buckets.has(k)) buckets.set(k,[]); buckets.get(k).push(i); }
      const offsets=[]; for(let dx=-1;dx<=1;dx++) for(let dy=-1;dy<=1;dy++) for(let dz=-1;dz<=1;dz++) offsets.push([dx,dy,dz]);
      let lc=0; const maxLinks=isMobile?700:1300;
      for(let i=0;i<positions.length && lc<maxLinks;i++){
        const p=positions[i].pos; const base=keyFor(p).split('_').map(Number);
        for(const off of offsets){
          const nk=`${base[0]+off[0]}_${base[1]+off[1]}_${base[2]+off[2]}`;
          const list=buckets.get(nk); if(!list) continue;
          for(const jIdx of list){
            if(jIdx<=i) continue;
            const q=positions[jIdx].pos; const d=p.distanceTo(q.pos);
            if(d<linkDist){
              linkPos.push(p.x,p.y,p.z,q.pos.x,q.pos.y,q.pos.z);
              if(stressHeatmap && physicsEnabled){
                // find constraint rest dist
                let stress=0;
                for(const c of physicsConstraints){
                  if((c.a===positions[i].idx && c.b===positions[jIdx].idx)||(c.a===positions[jIdx].idx && c.b===positions[i].idx)){
                    const cur=d; const rest=c.restDist||linkDist;
                    stress=Math.abs(cur-rest)/rest;
                    break;
                  }
                }
                // color 0= cyan low stress, 1= red high
                const r=stress>0.3?1: stress*3;
                const g=stress>0.3? (1-stress):1;
                const b=stress>0.3?0.2:1;
                linkColors.push(r,g,b, r,g,b);
              } else {
                const bothLocked=positions[i].locked && positions[jIdx].locked;
                const col=bothLocked?0.9:0.4;
                // will be single color material, ignore vertex colors for simplicity
              }
              lc++; if(lc>=maxLinks) break;
            }
          }
          if(lc>=maxLinks) break;
        }
      }
      this.linkGeo.setAttribute('position', new THREE.Float32BufferAttribute(linkPos,3));
      if(stressHeatmap && linkColors.length){
        this.linkGeo.setAttribute('color', new THREE.Float32BufferAttribute(linkColors,3));
        this.linkMat.vertexColors=true;
      } else {
        this.linkMat.vertexColors=false;
        this.linkGeo.deleteAttribute('color');
      }
      this.linkGeo.attributes.position.needsUpdate=true; this.linkGeo.computeBoundingSphere();
      this.linkMat.color.set(themes[theme].color);
      this.linkMat.opacity= theme==='yokai' ? (isMobile?0.18:0.24) : (isMobile?0.14:0.20);
      this.linkLines.visible=true;
      return lc;
    } else { this.linkLines.visible=false; return 0; }
  }
}

// Init
let mode='orbit';
let count=isMobile?160:220;
const swarm=new MicroSwarmV7(count);
let transmitterTarget=new THREE.Vector3(0,2,0);
let raycaster=new THREE.Raycaster();
let plane=new THREE.Plane(new THREE.Vector3(0,1,0), -2);
let mouse=new THREE.Vector2();
let interactionMode='build';
let isTransmitterDragging=false;
let autoBuild=false; let buildProg=1; let lastTap=0;
let formationScale=1, formationRot=0, lockDist=0.16;
let wallHeight=2.5, wallThick=0.4;
let drawMode=false, drawPoints=[], customWallPoints=null;
let windX=0, windZ=0;

// formations list includes new functional
const formationDefs=[
  {id:'orbit', label:'ORBIT', desc:'Idle', icon:'🌀', cat:'physics'},
  {id:'tower', label:'TOWER', desc:'Vertical', icon:'🏗️', cat:'arch'},
  {id:'sphere', label:'SPHERE', desc:'Shell', icon:'🔮', cat:'physics'},
  {id:'wave', label:'WAVE', desc:'Sine', icon:'🌊', cat:'physics'},
  {id:'bridge', label:'BRIDGE', desc:'Catenary', icon:'🌉', cat:'arch'},
  {id:'functionalBridge', label:'F-BRIDGE', desc:'Load-bearing', icon:'🏗️', cat:'functional'},
  {id:'arch', label:'ARCH', desc:'Catenary arch', icon:'⛩️', cat:'functional'},
  {id:'dome', label:'DOME', desc:'Hemisphere', icon:'🏟️', cat:'functional'},
  {id:'bh6', label:'BH-6', desc:'Logo', icon:'⚡', cat:'fun'},
  {id:'vortex', label:'VORTEX', desc:'Spiral', icon:'🌪️', cat:'physics'},
  {id:'eiffel', label:'EIFFEL', desc:'Paris', icon:'🗼', cat:'arch'},
  {id:'dna', label:'DNA', desc:'Helix', icon:'🧬', cat:'organic'},
  {id:'heart', label:'HEART', desc:'Beating', icon:'❤️', cat:'organic'},
  {id:'baymax', label:'BAYMAX', desc:'Care', icon:'🤖', cat:'organic'},
  {id:'cube', label:'CUBE', desc:'Frame', icon:'🧊', cat:'physics'},
  {id:'pyramid', label:'PYRAMID', desc:'Ancient', icon:'🔺', cat:'arch'},
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
    if(def.id==='customWall' && !customWallPoints) return; // hide until drawn
    const btn=document.createElement('button');
    btn.className='mode-btn' + (def.id===mode? (theme==='yokai'?' yokai-active':' active'):'');
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

// draw path line visualization
let drawLine=null;
function updateDrawLine(){
  if(drawLine) scene.remove(drawLine);
  if(drawPoints.length<2) return;
  const geo=new THREE.BufferGeometry().setFromPoints(drawPoints);
  const mat=new THREE.LineBasicMaterial({ color:0x00e5ff, linewidth:2, transparent:true, opacity:0.85 });
  drawLine=new THREE.Line(geo, mat);
  scene.add(drawLine);
  document.getElementById('drawPtsCount').textContent=drawPoints.length;
  document.getElementById('drawPreview').textContent=`Drawn ${drawPoints.length} points, length ${(calcPathLength(drawPoints)).toFixed(1)}m — tap BUILD DRAWN WALL`;
  document.getElementById('drawPreview').classList.add('active');
}
function calcPathLength(pts){
  let len=0;
  for(let i=1;i<pts.length;i++) len+=pts[i].distanceTo(pts[i-1]);
  return len;
}
function generateWallFromPath(path, count, h, thick){
  const wallPts=[];
  if(path.length<2) return wallPts;
  const stepAlong=0.36;
  const stepUp=0.38;
  for(let i=0;i<path.length-1;i++){
    const a=path[i], b=path[i+1];
    const segLen=a.distanceTo(b);
    const steps=Math.max(1, Math.floor(segLen/stepAlong));
    for(let s=0;s<=steps;s++){
      const t=s/steps;
      const base=new THREE.Vector3().lerpVectors(a,b,t);
      // thickness lateral offset
      const dir=new THREE.Vector3().subVectors(b,a).normalize();
      const perp=new THREE.Vector3(-dir.z,0,dir.x);
      for(let ty=0; ty<= Math.floor(h/stepUp); ty++){
        const y=-2.3 + ty*stepUp + Math.random()*0.05;
        // thickness layers
        for(let tk=-Math.floor(thick/0.24); tk<=Math.floor(thick/0.24); tk++){
          if(wallPts.length>=count*1.5) break;
          const offset=perp.clone().multiplyScalar(tk*0.24 + (Math.random()-0.5)*0.08);
          wallPts.push(new THREE.Vector3(base.x + offset.x, y, base.z + offset.z));
        }
      }
    }
  }
  // sample to count
  while(wallPts.length<count){
    const base=wallPts[Math.floor(Math.random()*wallPts.length)];
    wallPts.push(base.clone().add(new THREE.Vector3((Math.random()-0.5)*0.2,(Math.random()-0.5)*0.2,(Math.random()-0.5)*0.2)));
  }
  return wallPts.slice(0,count);
}

function updateFormation(force=false){
  let raw;
  if(mode==='customWall' && customWallPoints){
    raw=customWallPoints;
  } else {
    raw=getFormation(mode, swarm.count, transmitter.position, performance.now());
  }
  const transformed=transformPoints(raw, transmitter.position, formationScale, formationRot);
  swarm.setFormationPoints(transformed);
  if(force) swarm.reassignTargets();
}

// screen to world on ground plane
function screenToWorld(x,y, useTransmitterY=false){
  const rect=canvas.getBoundingClientRect();
  mouse.x=((x - rect.left)/rect.width)*2 -1;
  mouse.y=-((y - rect.top)/rect.height)*2 +1;
  raycaster.setFromCamera(mouse, camera);
  const pt=new THREE.Vector3();
  // if draw mode, always intersect ground plane at y=-2.3
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

// pointer handling with draw mode
let isDrawing=false;
canvas.addEventListener('pointerdown', e=>{
  if(e.target.closest('.card')||e.target.closest('.hud-top')||e.target.closest('.float-controls')||e.target.closest('.joystick')) return;
  if(drawMode){
    const pt=screenToWorld(e.clientX,e.clientY,true);
    if(pt){
      if(!isDrawing){ drawPoints=[pt]; isDrawing=true; }
      else drawPoints.push(pt);
      updateDrawLine();
    }
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
    const pt=screenToWorld(e.clientX,e.clientY,true);
    if(pt && pt.distanceTo(drawPoints[drawPoints.length-1])>0.25){
      drawPoints.push(pt);
      updateDrawLine();
    }
    return;
  }
  if(isMobile){
    if(isTransmitterDragging && (e.buttons===1 || e.pointerType==='touch')) updateTransmitterScreen(e.clientX,e.clientY);
  } else {
    if(e.buttons===1 && isTransmitterDragging) updateTransmitterScreen(e.clientX,e.clientY);
    else if(!isTransmitterDragging && !drawMode && e.pointerType==='mouse') updateTransmitterScreen(e.clientX,e.clientY);
  }
});
window.addEventListener('pointerup', ()=>{
  if(drawMode && isDrawing){
    // keep drawing until toggle off, not end on pointerup? For drag drawing we want continuous; but for click-to-add we keep isDrawing true
    // isDrawing remains true until drawMode off
  }
  isTransmitterDragging=false;
  if(isMobile) controls.enabled=true;
  else controls.enabled=true;
});
canvas.addEventListener('dblclick', e=>{
  if(drawMode){
    const pt=screenToWorld(e.clientX,e.clientY,true);
    if(pt){ drawPoints.push(pt); updateDrawLine(); }
  }
});

let lastPinch=0;
canvas.addEventListener('touchstart', e=>{
  if(drawMode) return;
  if(e.touches.length===2){
    const dx=e.touches[0].clientX - e.touches[1].clientX; const dy=e.touches[0].clientY - e.touches[1].clientY;
    lastPinch=Math.hypot(dx,dy); controls.enabled=true; isTransmitterDragging=false;
  }
},{passive:true});
canvas.addEventListener('touchmove', e=>{
  if(drawMode){
    if(e.touches.length===1){
      const pt=screenToWorld(e.touches[0].clientX,e.touches[0].clientY,true);
      if(pt && drawPoints.length && pt.distanceTo(drawPoints[drawPoints.length-1])>0.25){
        drawPoints.push(pt); updateDrawLine();
        if(e.cancelable) e.preventDefault();
      }
    }
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

// float controls
const btnZoomIn=document.getElementById('btnZoomIn'), btnZoomOut=document.getElementById('btnZoomOut'), btnTransUp=document.getElementById('btnTransUp'), btnTransDown=document.getElementById('btnTransDown'), btnResetCam=document.getElementById('btnResetCam');
function zoomCam(f){ const dir=camera.position.clone().sub(controls.target).normalize(); let cur=camera.position.distanceTo(controls.target); let nd=cur*f; nd=THREE.MathUtils.clamp(nd, controls.minDistance, controls.maxDistance); camera.position.copy(controls.target.clone().add(dir.multiplyScalar(nd))); }
let zoomInt=null;
function startZoom(f){ zoomCam(f); zoomInt=setInterval(()=>zoomCam(f),32); }
function stopZoom(){ clearInterval(zoomInt); }
btnZoomIn?.addEventListener('pointerdown', ()=>startZoom(0.94)); btnZoomIn?.addEventListener('pointerup', stopZoom); btnZoomIn?.addEventListener('pointerleave', stopZoom);
btnZoomOut?.addEventListener('pointerdown', ()=>startZoom(1.06)); btnZoomOut?.addEventListener('pointerup', stopZoom); btnZoomOut?.addEventListener('pointerleave', stopZoom);
btnTransUp?.addEventListener('pointerdown', ()=>{ let iv=setInterval(()=>{ transmitterTarget.y+=0.12; transmitterTarget.y=THREE.MathUtils.clamp(transmitterTarget.y,-1,12); plane.constant=-transmitterTarget.y; },32); const stop=()=>{clearInterval(iv); window.removeEventListener('pointerup',stop);}; window.addEventListener('pointerup',stop); });
btnTransDown?.addEventListener('pointerdown', ()=>{ let iv=setInterval(()=>{ transmitterTarget.y-=0.12; transmitterTarget.y=THREE.MathUtils.clamp(transmitterTarget.y,-1,12); plane.constant=-transmitterTarget.y; },32); const stop=()=>{clearInterval(iv); window.removeEventListener('pointerup',stop);}; window.addEventListener('pointerup',stop); });
btnResetCam?.addEventListener('click', ()=>{ camera.position.set(0,isMobile?9:6.5,isMobile?18:19); controls.target.set(0,2,0); controls.update(); transmitterTarget.set(0,2,0); plane.constant=-2; });

// seg toggle including draw
const segBtns=document.querySelectorAll('.seg-btn');
const camToggleBtn=document.getElementById('btnCameraToggle');
function setInteractionMode(m){
  interactionMode=m;
  segBtns.forEach(b=>b.classList.toggle('active', b.dataset.seg===m));
  if(camToggleBtn) camToggleBtn.textContent=m==='camera'?'BUILD MODE': m==='draw'?'EXIT DRAW':'CAMERA MODE';
  if(m==='draw'){
    drawMode=true;
    document.getElementById('drawCanvas').style.display='block';
    document.getElementById('drawPreview').classList.add('active');
    controls.enabled=false;
  } else {
    if(m!=='draw' && drawMode){
      // stay in draw mode until explicit toggle? we exit
      drawMode=false;
      isDrawing=false;
      document.getElementById('drawCanvas').style.display='none';
    }
    if(m==='build') controls.enabled=true;
  }
}
segBtns.forEach(b=> b.addEventListener('click', ()=> setInteractionMode(b.dataset.seg)));
camToggleBtn?.addEventListener('click', ()=> setInteractionMode(interactionMode==='build'?'camera':'build'));

// sheet
const panelLeft=document.getElementById('panelLeft'); const menuToggle=document.getElementById('menuToggle'); const sheetHandle=document.getElementById('sheetHandle');
let sheetOpen=window.innerWidth>1350;
function setSheet(o){ sheetOpen=o; if(window.innerWidth<=1350){ panelLeft.classList.toggle('open',o); menuToggle.innerHTML=o?`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"/></svg>`:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 7h16M4 12h16M4 17h16"/></svg>`; } }
menuToggle?.addEventListener('click', ()=>setSheet(!sheetOpen)); sheetHandle?.addEventListener('click', ()=>setSheet(!sheetOpen));
let startY=0; sheetHandle?.addEventListener('touchstart', e=>{startY=e.touches[0].clientY;},{passive:true}); sheetHandle?.addEventListener('touchmove', e=>{ const dy=e.touches[0].clientY-startY; if(dy<-30)setSheet(true); if(dy>40)setSheet(false); },{passive:true});

// viewer single
function initViewer(id){
  const c=document.getElementById(id); if(!c) return;
  const r2=new THREE.WebGLRenderer({ canvas:c, alpha:true, antialias:!isMobile }); r2.setPixelRatio(Math.min(window.devicePixelRatio,1.6));
  const resize=()=>{ const w=c.clientWidth,h=c.clientHeight||220; r2.setSize(w,h,false); cam2.aspect=w/h; cam2.updateProjectionMatrix(); };
  const w=c.clientWidth,h=c.clientHeight||220; r2.setSize(w,h,false);
  const s2=new THREE.Scene(); const cam2=new THREE.PerspectiveCamera(35,w/(h||220),0.1,100); cam2.position.set(1.6,0.9,1.3);
  const ctrl2=new OrbitControls(cam2,c); ctrl2.enableDamping=true; ctrl2.autoRotate=true; ctrl2.autoRotateSpeed=1.6; ctrl2.enableZoom=false;
  s2.add(new THREE.AmbientLight(0x888caa,1.2)); const dl=new THREE.DirectionalLight(0xffffff,2); dl.position.set(2,4,2); s2.add(dl); const dl2=new THREE.DirectionalLight(themes[theme].color,1.5); dl2.position.set(-2,1,-2); s2.add(dl2);
  const bot=createMicrobotMeshV6(true); bot.scale.set(1.9,1.9,1.9); bot.position.y=-0.08; s2.add(bot);
  const floorGeo=new THREE.CircleGeometry(1.5,32); const floorMat=new THREE.MeshStandardMaterial({ color:0x0c0f18, roughness:0.2, metalness:0.8, transparent:true, opacity:0.6 }); const floor=new THREE.Mesh(floorGeo,floorMat); floor.rotation.x=-Math.PI/2; floor.position.y=-0.28; s2.add(floor);
  const grid2=new THREE.GridHelper(4,20,0x1b2133,0x121620); grid2.position.y=-0.27; s2.add(grid2);
  const anim=()=>{ requestAnimationFrame(anim); bot.rotation.y+=0.0025; const ld=bot.userData.led; if(ld){ ld.material.color.set(themes[theme].color); ld.material.emissive.set(themes[theme].color);} bot.userData.legs?.forEach((leg,li)=>{ const t=performance.now()*0.003+li; leg.legGroup.rotation.x=Math.sin(t)*0.2; leg.lowerGroup.rotation.x=-0.5+Math.sin(t+1)*0.3; }); ctrl2.update(); r2.render(s2,cam2); }; anim();
  window.addEventListener('resize', resize); new ResizeObserver(resize).observe(c.parentElement);
}
initViewer('microSingle'); initViewer('microSingleMobile');
if(isMobile) document.getElementById('mobileBlueprintCard').style.display='block';

// sliders and toggles
const countSlider=document.getElementById('count'), countVal=document.getElementById('countVal');
const cohesionSlider=document.getElementById('cohesion'), cohesionVal=document.getElementById('cohesionVal');
const linkSlider=document.getElementById('linkDist'), linkVal=document.getElementById('linkVal');
const speedSlider=document.getElementById('buildSpeed'), speedVal=document.getElementById('speedVal');
const scaleSlider=document.getElementById('scale'), scaleVal=document.getElementById('scaleVal');
const rotSlider=document.getElementById('rotation'), rotVal=document.getElementById('rotVal');
const precSlider=document.getElementById('precision'), precVal=document.getElementById('precVal');
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
precSlider.addEventListener('input', e=>{ lockDist=parseFloat(e.target.value); swarm.precisionDist=lockDist; precVal.textContent=lockDist.toFixed(2); });
gravSlider.addEventListener('input', e=>{ const g=parseFloat(e.target.value); world.gravity.set(0,g,0); gravVal.textContent=g; });
windSlider.addEventListener('input', e=>{ windX=parseFloat(e.target.value); windVal.textContent=windX.toFixed(1); document.getElementById('windDisplay').textContent=`${windX.toFixed(1)},${windZ.toFixed(1)}`; });
windZSlider.addEventListener('input', e=>{ windZ=parseFloat(e.target.value); windZVal.textContent=windZ.toFixed(1); document.getElementById('windDisplay').textContent=`${windX.toFixed(1)},${windZ.toFixed(1)}`; });
wallHSlider.addEventListener('input', e=>{ wallHeight=parseFloat(e.target.value); wallHVal.textContent=wallHeight.toFixed(1)+'m'; document.getElementById('wallHDisp').textContent=wallHeight.toFixed(1); });
wallTSlider.addEventListener('input', e=>{ wallThick=parseFloat(e.target.value); wallTVal.textContent=wallThick.toFixed(1)+'m'; });

function applyTheme(th){
  theme=th; accentColor.set(themes[th].color);
  transMat.color.set(themes[th].color); transMat.emissive.set(themes[th].color);
  ringMat1.color.set(themes[th].color); ringMat2.color.set(themes[th].color); vLineMat.color.set(themes[th].color);
  pointA.color.set(themes[th].color); ghostMat.color.set(themes[th].color); sparks.mat.color.set(themes[th].color);
  document.querySelectorAll('.color-dot').forEach(d=> d.classList.toggle('active', d.dataset.color===th));
  const status=document.getElementById('transStatus'); const label=document.getElementById('transLabel');
  if(th==='yokai'){ status.classList.add('yokai'); label.textContent=isMobile?'YOKAI • PHYS':'YOKAI • PHYSICS'; document.querySelectorAll('.mode-btn.active').forEach(b=>{b.classList.remove('active'); b.classList.add('yokai-active');}); }
  else { status.classList.remove('yokai'); label.textContent=isMobile?`${th.toUpperCase()} • PHYS`:`${th.toUpperCase()} • PHYSICS`; document.querySelectorAll('.mode-btn.yokai-active').forEach(b=>{b.classList.remove('yokai-active'); b.classList.add('active');}); }
  swarm.bots.forEach(bot=>{
    const led=bot.mesh.userData.led; if(led){ led.material.color.set(themes[th].color); led.material.emissive.set(themes[th].color); }
    const thr=bot.mesh.userData.thruster; if(thr) thr.material.color.set(themes[th].color);
    bot.mesh.userData.legs?.forEach(l=>{ l.footMat.emissive.set(themes[th].color); l.tipMat.color.set(themes[th].color); l.tipMat.emissive.set(themes[th].color); });
    const ant=bot.mesh.userData.antTop; if(ant){ ant.material.color.set(themes[th].color); ant.material.emissive.set(themes[th].color); }
  });
}
document.querySelectorAll('.color-dot').forEach(d=> d.addEventListener('click', ()=> applyTheme(d.dataset.color)));
document.getElementById('btnHiro').addEventListener('click', ()=> applyTheme('hiro'));
document.getElementById('btnYokai').addEventListener('click', ()=> applyTheme('yokai'));

// toggles
const toggleEls=document.querySelectorAll('.toggle');
const flags={ physics:false, stress:false, ghost:true, sparks:true, smart:true, scaffold:true, precisionMode:true, links:true };
toggleEls.forEach(el=>{
  el.addEventListener('click', ()=>{
    const key=el.dataset.toggle;
    flags[key]=!flags[key];
    el.classList.toggle('active', flags[key]);
    if(key==='ghost') swarm.ghostEnabled=flags[key];
    if(key==='sparks') swarm.sparksEnabled=flags[key];
    if(key==='smart') swarm.smartAssign=flags[key];
    if(key==='scaffold') swarm.scaffold=flags[key];
    if(key==='precisionMode') swarm.precisionMode=flags[key];
    if(key==='links') swarm.linksEnabled=flags[key];
    if(key==='physics'){
      physicsEnabled=flags[key];
      document.getElementById('physM').textContent=physicsEnabled?'ON':'OFF';
      if(!physicsEnabled){ clearAllPhysicsBodies(); } else {
        // create bodies for already locked bots
        for(let i=0;i<swarm.count;i++){
          if(swarm.bots[i].locked){
            const isBase=swarm.bots[i].mesh.position.y < -0.6;
            createLockedBody(i, swarm.bots[i].mesh.position, isBase);
          }
        }
      }
    }
    if(key==='stress'){ stressHeatmap=flags[key]; }
    if(key==='ghost') swarm.updateGhost();
  });
});

// buttons
const btnAuto=document.getElementById('btnAuto'), btnAssemble=document.getElementById('btnAssemble'), btnScatter=document.getElementById('btnScatter'), btnClearLocks=document.getElementById('btnClearLocks');
const btnDropBall=document.getElementById('btnDropBall'), btnClearBalls=document.getElementById('btnClearBalls'), btnCollapse=document.getElementById('btnCollapse'), btnRemoveBase=document.getElementById('btnRemoveBase');
const btnDrawMode=document.getElementById('btnDrawMode'), btnBuildWall=document.getElementById('btnBuildWall'), btnClearDraw=document.getElementById('btnClearDraw');
const progBar=document.getElementById('buildProg'), progTxt=document.getElementById('progTxt'), lockedTxt=document.getElementById('lockedTxt'), accTxt=document.getElementById('accTxt');

btnAuto.addEventListener('click', ()=>{
  autoBuild=!autoBuild; btnAuto.textContent=`AUTO BUILD: ${autoBuild?'ON':'OFF'}`; btnAuto.classList.toggle('active', autoBuild);
  if(autoBuild){ swarm.buildProgress=0.02; buildProg=0.02; }
  else swarm.buildProgress=1;
});
btnAssemble.addEventListener('click', ()=>{ swarm.buildProgress=0.02; buildProg=0.02; autoBuild=true; btnAuto.textContent='AUTO BUILD: ON'; btnAuto.classList.add('active'); });
btnScatter.addEventListener('click', ()=>{
  for(let i=0;i<swarm.count;i++) swarm.velocities[i].add(new THREE.Vector3((Math.random()-0.5)*4, Math.random()*2.5, (Math.random()-0.5)*4));
  swarm.unlockAll(); clearAllPhysicsBodies(); swarm.buildProgress=1; buildProg=1; autoBuild=false; btnAuto.textContent='AUTO BUILD: OFF'; btnAuto.classList.remove('active');
  const pts=getFormation('scatter', swarm.count, transmitter.position, performance.now());
  swarm.setFormationPoints(transformPoints(pts, transmitter.position, formationScale, formationRot));
});
btnClearLocks.addEventListener('click', ()=>{ swarm.unlockAll(); clearAllPhysicsBodies(); });

btnDropBall.addEventListener('click', ()=> spawnBall());
btnClearBalls.addEventListener('click', ()=> clearBalls());
btnCollapse.addEventListener('click', ()=>{
  // remove 25% random locked bots to cause collapse
  const lockedIndices=[];
  for(let i=0;i<swarm.count;i++) if(swarm.bots[i].locked) lockedIndices.push(i);
  for(let i=0;i<Math.floor(lockedIndices.length*0.25);i++){
    const idx=lockedIndices[Math.floor(Math.random()*lockedIndices.length)];
    swarm.bots[idx].locked=false; swarm.locked[idx]=false; swarm.bots[idx].mesh.userData.locked=false;
    removeLockedBody(idx);
    swarm.velocities[idx].add(new THREE.Vector3((Math.random()-0.5)*2, Math.random()*1.5, (Math.random()-0.5)*2));
  }
  if(navigator.vibrate) navigator.vibrate([30,20,30]);
});
btnRemoveBase.addEventListener('click', ()=>{
  for(let i=0;i<swarm.count;i++){
    if(swarm.bots[i].locked && swarm.bots[i].mesh.position.y < -0.3){
      swarm.bots[i].locked=false; swarm.locked[i]=false; removeLockedBody(i);
      swarm.velocities[i].add(new THREE.Vector3((Math.random()-0.5)*1.5, 1, (Math.random()-0.5)*1.5));
    }
  }
});

btnDrawMode.addEventListener('click', ()=>{
  drawMode=!drawMode;
  btnDrawMode.textContent=`DRAW WALL: ${drawMode?'ON':'OFF'}`;
  btnDrawMode.classList.toggle('active', drawMode);
  setInteractionMode(drawMode?'draw':'build');
  if(drawMode){
    drawPoints=[]; if(drawLine){ scene.remove(drawLine); drawLine=null; }
    document.getElementById('drawPreview').textContent='Draw mode ON — drag on ground to draw wall path';
    document.getElementById('drawPreview').classList.add('active');
  }
});
btnBuildWall.addEventListener('click', ()=>{
  if(drawPoints.length<2){ alert('Draw at least 2 points'); return; }
  customWallPoints=generateWallFromPath(drawPoints, swarm.count, wallHeight, wallThick);
  mode='customWall';
  document.getElementById('modeLabel').textContent='CUSTOM WALL';
  document.getElementById('modeLabelM').textContent='CUSTOM WALL';
  renderModes(document.querySelector('.chip.active')?.dataset.cat || 'all');
  // set formation
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

// loader
window.addEventListener('load', ()=>{
  setTimeout(()=>{
    document.getElementById('loader')?.classList.add('hidden');
    const mh=document.getElementById('mobileHint');
    if(isMobile && mh){ mh.style.display='flex'; setTimeout(()=>{ mh.style.opacity='0'; mh.style.transform='translateX(-50%) translateY(10px)'; }, 5000); setTimeout(()=> mh.style.display='none', 5500); }
  }, isMobile?1000:700);
});

// initial
updateFormation(true);

// animation loop
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

  // update formation continuously for dynamic modes
  const rawPoints=getFormation(mode, swarm.count, transmitter.position, now);
  const transformed=transformPoints(mode==='customWall' && customWallPoints ? customWallPoints : rawPoints, transmitter.position, formationScale, formationRot);
  swarm.allPoints=transformed.map(p=>p.clone());
  swarm.sortedPoints=[...swarm.allPoints].sort((a,b)=>a.y-b.y);
  swarm.updateGhost();
  if(!autoBuild && now%1000<20) swarm.reassignTargets();

  // physics step
  if(physicsEnabled){
    world.step(1/60, dt, 3);
    // apply wind
    if(Math.abs(windX)>0.01 || Math.abs(windZ)>0.01) applyWind(windX, windZ);
    // update ball meshes
    for(const b of ballBodies){
      b.mesh.position.copy(b.body.position);
      b.mesh.quaternion.copy(b.body.quaternion);
    }
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
    buildSpeed: parseFloat(document.getElementById('buildSpeed').value),
    lockDist: lockDist,
    precisionMode: flags.precisionMode
  });
  linkDisp=linkCount;

  sparks.update(dt);
  controls.update();
  renderer.render(scene,camera);

  fpsAcc+=1/dt; fpsCount++;
  if(now-lastFps>500){
    const fps=Math.round(fpsAcc/fpsCount);
    document.getElementById('fps').textContent=fps;
    const fpsM=document.getElementById('fpsM'); if(fpsM) fpsM.textContent=fps;
    document.getElementById('linkCount').textContent=linkDisp;
    document.getElementById('lockedCount').textContent=swarm.lockedCount;
    document.getElementById('totalCount').textContent=swarm.count;
    const lockedM=document.getElementById('lockedM'); if(lockedM) lockedM.textContent=`${Math.round(swarm.lockedCount/swarm.count*100)}%`;
    if(lockedTxt) lockedTxt.textContent=`${swarm.lockedCount}/${swarm.count}`;
    if(accTxt) accTxt.textContent=`${swarm.avgError.toFixed(3)}m`;
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
  if(e.key.toLowerCase()==='s'){ const a=document.createElement('a'); a.download=`microbot-v7-${mode}-${Date.now()}.png`; a.href=renderer.domElement.toDataURL('image/png'); a.click(); }
  if(e.key.toLowerCase()==='d'){ drawMode=!drawMode; btnDrawMode.textContent=`DRAW WALL: ${drawMode?'ON':'OFF'}`; btnDrawMode.classList.toggle('active', drawMode); setInteractionMode(drawMode?'draw':'build'); }
  if(e.key.toLowerCase()==='p'){ flags.physics=!flags.physics; physicsEnabled=flags.physics; document.querySelector('[data-toggle=\"physics\"]').classList.toggle('active', physicsEnabled); document.getElementById('physM').textContent=physicsEnabled?'ON':'OFF'; }
  if(e.code==='Space'){ spawnBall(); e.preventDefault(); }
});
