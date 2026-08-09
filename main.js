import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { getFormation } from './formations.js';
import { Joystick } from './joystick.js';

const isMobile = /Android|iPhone|iPad|iPod|Mobi/i.test(navigator.userAgent) || window.innerWidth <= 1180;

// ---------- Scene ----------
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
controls.minDistance=isMobile?2.2:3; controls.maxDistance=46;
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

const grid=new THREE.GridHelper(140, isMobile?70:110, 0x1c233a, 0x131827); grid.position.y=-2.2; scene.add(grid);

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
const ghostMat=new THREE.PointsMaterial({ color:themes[theme].color, size:0.16, transparent:true, opacity:0.22, sizeAttenuation:true, depthWrite:false });
const ghostPoints=new THREE.Points(ghostGeo, ghostMat); scene.add(ghostPoints);

// spark particle system
class SparkSystem{
  constructor(max=600){
    this.max=max;
    this.positions=new Float32Array(max*3);
    this.velocities=new Float32Array(max*3);
    this.lifetimes=new Float32Array(max);
    this.alive=new Uint8Array(max);
    this.count=0;
    this.next=0;
    this.geo=new THREE.BufferGeometry();
    this.geo.setAttribute('position', new THREE.BufferAttribute(this.positions,3));
    // color based on theme
    this.mat=new THREE.PointsMaterial({ color:0xffffff, size:0.12, transparent:true, opacity:0.9, sizeAttenuation:true, depthWrite:false, blending:THREE.AdditiveBlending });
    this.points=new THREE.Points(this.geo, this.mat);
    scene.add(this.points);
  }
  spawn(pos, n=6, color=themes[theme].color){
    // set current particle color to theme color
    this.mat.color.set(color);
    for(let i=0;i<n;i++){
      const idx=this.next;
      this.positions[idx*3]=pos.x + (Math.random()-0.5)*0.08;
      this.positions[idx*3+1]=pos.y + (Math.random()-0.5)*0.08;
      this.positions[idx*3+2]=pos.z + (Math.random()-0.5)*0.08;
      const ang=Math.random()*Math.PI*2;
      const sp=Math.random()*2.2 + 0.6;
      this.velocities[idx*3]=Math.cos(ang)*sp*0.5 + (Math.random()-0.5)*0.8;
      this.velocities[idx*3+1]=Math.random()*2.4 + 0.4;
      this.velocities[idx*3+2]=Math.sin(ang)*sp*0.5 + (Math.random()-0.5)*0.8;
      this.lifetimes[idx]=1.0;
      this.alive[idx]=1;
      this.next=(this.next+1)%this.max;
      if(this.count<this.max) this.count++;
    }
  }
  update(dt){
    let any=false;
    for(let i=0;i<this.max;i++){
      if(!this.alive[i]) continue;
      any=true;
      this.lifetimes[i]-=dt*1.8;
      if(this.lifetimes[i]<=0){ this.alive[i]=0; continue; }
      this.velocities[i*3+1]-=dt*3.2; // gravity
      this.positions[i*3]+=this.velocities[i*3]*dt;
      this.positions[i*3+1]+=this.velocities[i*3+1]*dt;
      this.positions[i*3+2]+=this.velocities[i*3+2]*dt;
      this.velocities[i*3]*=0.98; this.velocities[i*3+2]*=0.98;
    }
    this.geo.attributes.position.needsUpdate=true;
    this.geo.computeBoundingSphere();
    this.mat.opacity=0.9;
  }
}
const sparks=new SparkSystem();

// ---------- Upgraded Bot Mesh v6 ----------
function createMicrobotMeshV6(isLeader=false, lowPoly=false){
  const group=new THREE.Group();

  // Main chassis bottom (dark)
  const chassisGeo=new THREE.BoxGeometry(0.58,0.16,0.42);
  const chassisMat=new THREE.MeshStandardMaterial({ color:0x0e1016, roughness:0.38, metalness:0.86 });
  const chassis=new THREE.Mesh(chassisGeo, chassisMat);
  chassis.castShadow=false;
  group.add(chassis);

  // middle chamfer
  const midGeo=new THREE.BoxGeometry(0.54,0.06,0.38);
  const midMat=new THREE.MeshStandardMaterial({ color:0x151a28, roughness:0.32, metalness:0.78 });
  const mid=new THREE.Mesh(midGeo, midMat); mid.position.y=0.09; group.add(mid);

  // top plate
  const topGeo=new THREE.BoxGeometry(0.50,0.045,0.34);
  const topMat=new THREE.MeshStandardMaterial({ color:0x1c2236, roughness:0.28, metalness:0.72 });
  const top=new THREE.Mesh(topGeo, topMat); top.position.y=0.145; group.add(top);

  // screws 4 corners
  const screwGeo=new THREE.CylinderGeometry(0.018,0.018,0.02,10);
  const screwMat=new THREE.MeshStandardMaterial({ color:0x2a314a, roughness:0.4, metalness:0.9 });
  [[-0.21,-0.14],[0.21,-0.14],[-0.21,0.14],[0.21,0.14]].forEach(([x,z])=>{
    const s=new THREE.Mesh(screwGeo, screwMat); s.position.set(x,0.175,z); group.add(s);
  });

  // LED housing cylinder
  const housingGeo=new THREE.CylinderGeometry(0.13,0.13,0.03,16);
  const housingMat=new THREE.MeshStandardMaterial({ color:0x0a0c13, roughness:0.5, metalness:0.6 });
  const housing=new THREE.Mesh(housingGeo, housingMat); housing.position.set(0,0.172,0); group.add(housing);

  // LED
  const ledGeo=new THREE.BoxGeometry(0.11,0.018,0.11);
  const ledMat=new THREE.MeshStandardMaterial({ color:themes[theme].color, emissive:themes[theme].color, emissiveIntensity: isLeader?7:3.2 });
  const led=new THREE.Mesh(ledGeo, ledMat); led.position.set(0,0.19,0); group.add(led);
  group.userData.led=led;

  // side vents (small emissive lines)
  const ventGeo=new THREE.BoxGeometry(0.02,0.02,0.12);
  const ventMat=new THREE.MeshStandardMaterial({ color:0x0a0c13, roughness:0.6, metalness:0.4 });
  const ventL=new THREE.Mesh(ventGeo, ventMat); ventL.position.set(-0.29,0.05,0); group.add(ventL);
  const ventR=new THREE.Mesh(ventGeo, ventMat); ventR.position.set(0.29,0.05,0); group.add(ventR);

  // antenna
  const antGeo=new THREE.CylinderGeometry(0.008,0.008,0.09,8);
  const antMat=new THREE.MeshStandardMaterial({ color:0x2a2f45, metalness:0.7, roughness:0.4 });
  const ant=new THREE.Mesh(antGeo, antMat); ant.position.set(0,0.21,-0.16); group.add(ant);
  const antTopGeo=new THREE.SphereGeometry(0.016,8,8);
  const antTopMat=new THREE.MeshStandardMaterial({ color:themes[theme].color, emissive:themes[theme].color, emissiveIntensity:2 });
  const antTop=new THREE.Mesh(antTopGeo, antTopMat); antTop.position.set(0,0.05,0); ant.add(antTop);
  group.userData.antTop=antTop;

  // bottom thruster glow disc
  const thrusterGeo=new THREE.CircleGeometry(0.18,16);
  const thrusterMat=new THREE.MeshBasicMaterial({ color:themes[theme].color, transparent:true, opacity:0.18, side:THREE.DoubleSide });
  const thruster=new THREE.Mesh(thrusterGeo, thrusterMat); thruster.rotation.x=-Math.PI/2; thruster.position.y=-0.09; group.add(thruster);
  group.userData.thruster=thruster;

  // legs - upgraded dual joint
  const legShoulderPositions=[
    new THREE.Vector3(-0.24,-0.02,0.16),
    new THREE.Vector3(0.24,-0.02,0.16),
    new THREE.Vector3(-0.24,-0.02,-0.16),
    new THREE.Vector3(0.24,-0.02,-0.16),
  ];
  const legs=[];
  legShoulderPositions.forEach((shoulderPos, idx)=>{
    const legGroup=new THREE.Group(); legGroup.position.copy(shoulderPos); group.add(legGroup);

    // upper leg
    const upperGeo=new THREE.CapsuleGeometry(0.038,0.14,3,8);
    const legMat=new THREE.MeshStandardMaterial({ color:0x0a0c11, roughness:0.5, metalness:0.6 });
    const upper=new THREE.Mesh(upperGeo, legMat); upper.position.set(0,-0.07,0); // pivot at top
    legGroup.add(upper);

    // knee joint
    const kneeGeo=new THREE.SphereGeometry(0.036,8,8);
    const kneeMat=new THREE.MeshStandardMaterial({ color:0x1e263d, metalness:0.8, roughness:0.35 });
    const knee=new THREE.Mesh(kneeGeo, kneeMat); knee.position.set(0,-0.145,0); legGroup.add(knee);

    // lower leg group pivots at knee
    const lowerGroup=new THREE.Group(); lowerGroup.position.set(0,-0.145,0); legGroup.add(lowerGroup);
    const lowerGeo=new THREE.CapsuleGeometry(0.032,0.16,3,8);
    const lower=new THREE.Mesh(lowerGeo, legMat); lower.position.set(0,-0.08,0); lowerGroup.add(lower);

    // foot magnet
    const footGeo=new THREE.BoxGeometry(0.08,0.036,0.08);
    const footMat=new THREE.MeshStandardMaterial({ color:0x252e4a, metalness:0.88, roughness:0.32, emissive:themes[theme].color, emissiveIntensity:0.0 });
    const foot=new THREE.Mesh(footGeo, footMat); foot.position.set(0,-0.17,0); lowerGroup.add(foot);

    // foot tip glow sphere when locked
    const tipGeo=new THREE.SphereGeometry(0.032,8,8);
    const tipMat=new THREE.MeshStandardMaterial({ color:themes[theme].color, emissive:themes[theme].color, emissiveIntensity:0.0, transparent:true, opacity:0.0 });
    const tip=new THREE.Mesh(tipGeo, tipMat); tip.position.set(0,-0.025,0); foot.add(tip);

    legs.push({ legGroup, upper, knee, lowerGroup, lower, foot, footMat, tip, tipMat, shoulderPos, idx });
  });
  group.userData.legs=legs;
  group.userData.locked=false;
  group.userData.lockTime=0;
  return group;
}

// ---------- Swarm v6 ----------
class MicroSwarmV6{
  constructor(count){
    this.count=count;
    this.bots=[]; this.velocities=[]; this.targets=[]; this.locked=[]; this.targetIndices=[];
    this.allPoints=[]; // full formation raw sorted
    this.sortedPoints=[]; // sorted by Y
    this.ghostEnabled=true; this.sparksEnabled=true; this.smartAssign=true; this.scaffold=true; this.precisionMode=true;
    this.linksEnabled=true; this.lockGlow=true; this.orbitHold=true;
    this.precisionDist=0.16;
    this.buildProgress=1; this.currentLayer=0; this.numLayers=12;
    this.lockedCount=0; this.avgError=0;
    this.group=new THREE.Group(); scene.add(this.group);
    this.linkGeo=new THREE.BufferGeometry();
    this.linkMat=new THREE.LineBasicMaterial({ color:themes[theme].color, transparent:true, opacity:0.16, depthWrite:false });
    this.linkLines=new THREE.LineSegments(this.linkGeo, this.linkMat); scene.add(this.linkLines);
    this.initBots();
  }
  initBots(){
    this.bots.forEach(b=>this.group.remove(b.mesh));
    this.bots=[]; this.velocities=[]; this.targets=[]; this.locked=[]; this.targetIndices=[];
    const lowPoly=isMobile && this.count>200;
    for(let i=0;i<this.count;i++){
      const mesh=createMicrobotMeshV6(i===0, lowPoly);
      const r=8*Math.cbrt(Math.random()); const th=Math.random()*Math.PI*2; const ph=Math.acos(2*Math.random()-1);
      mesh.position.set(r*Math.sin(ph)*Math.cos(th), r*Math.sin(ph)*Math.sin(th)*0.6+2, r*Math.cos(ph));
      mesh.rotation.set(Math.random()*Math.PI, Math.random()*Math.PI, Math.random()*Math.PI);
      this.group.add(mesh);
      this.bots.push({ mesh, phase: Math.random()*Math.PI*2, locked:false, lockTime:0, targetIdx:i });
      this.velocities.push(new THREE.Vector3(0,0,0));
      this.targets.push(mesh.position.clone());
      this.locked.push(false);
      this.targetIndices.push(i);
    }
    this.lockedCount=0;
  }
  setCount(n){
    if(n===this.count) return;
    this.count=n; this.initBots();
    // need to reassign after init
    if(this.allPoints.length) this.setFormationPoints(this.allPoints);
  }
  setFormationPoints(points){
    // points: array of Vector3 length >= count, already transformed (scale/rot + center)
    // store all for ghost
    this.allPoints=points.map(p=>p.clone());
    // sorted by Y ascending for building
    this.sortedPoints=[...this.allPoints].sort((a,b)=>a.y-b.y);
    // update ghost
    this.updateGhost();
    // reassign immediately
    this.reassignTargets();
  }
  updateGhost(){
    if(!this.ghostEnabled){ ghostPoints.visible=false; return; }
    ghostPoints.visible=true;
    const flat=new Float32Array(this.allPoints.length*3);
    for(let i=0;i<this.allPoints.length;i++){
      flat[i*3]=this.allPoints[i].x;
      flat[i*3+1]=this.allPoints[i].y;
      flat[i*3+2]=this.allPoints[i].z;
    }
    ghostGeo.setAttribute('position', new THREE.BufferAttribute(flat,3));
    ghostGeo.computeBoundingSphere();
    ghostMat.color.set(themes[theme].color);
    ghostMat.opacity=0.20 + this.buildProgress*0.12;
  }
  reassignTargets(){
    const count=this.count;
    if(!this.sortedPoints.length) return;
    const allowedCount = this.scaffold ? Math.floor(count * this.buildProgress) : count;
    const buildingPoints = this.sortedPoints.slice(0, Math.max(1, allowedCount));
    const remaining = count - buildingPoints.length;

    if(this.smartAssign){
      // greedy nearest
      const unassignedBots = new Set(Array.from({length:count}, (_,i)=>i));
      const newTargets = new Array(count);
      const newIndices = new Array(count);

      // assign building points first - bottom up
      for(let pi=0; pi<buildingPoints.length; pi++){
        const pt=buildingPoints[pi];
        let bestIdx=-1, bestDist=Infinity;
        for(const bi of unassignedBots){
          const dist=this.bots[bi].mesh.position.distanceTo(pt);
          if(dist<bestDist){ bestDist=dist; bestIdx=bi; }
        }
        if(bestIdx!==-1){
          newTargets[bestIdx]=pt.clone();
          newIndices[bestIdx]=pi;
          unassignedBots.delete(bestIdx);
        }
      }
      // remaining bots -> holding orbit
      const holdingPoints = this.generateHoldingPoints(remaining);
      let hi=0;
      for(const bi of unassignedBots){
        newTargets[bi]=holdingPoints[hi] ? holdingPoints[hi].clone() : new THREE.Vector3((Math.random()-0.5)*6, 2+Math.random()*2, (Math.random()-0.5)*6);
        newIndices[bi]=-1; // holding
        hi++;
      }
      for(let i=0;i<count;i++){
        if(newTargets[i]) this.targets[i].copy(newTargets[i]);
        this.targetIndices[i]=newIndices[i];
      }
    } else {
      // simple in-order
      for(let i=0;i<count;i++){
        if(i<buildingPoints.length) this.targets[i].copy(buildingPoints[i]);
        else {
          const hold=this.generateHoldingPoints(1)[0];
          this.targets[i].copy(hold);
        }
      }
    }
  }
  generateHoldingPoints(n){
    const pts=[];
    const center=transmitter.position;
    for(let i=0;i<n;i++){
      const ang=(i/n)*Math.PI*2 + performance.now()*0.0003;
      const r=2.0 + (i%3)*0.6;
      const y=2 + Math.sin(i*0.7 + performance.now()*0.001)*0.8;
      pts.push(new THREE.Vector3(center.x + Math.cos(ang)*r, y, center.z + Math.sin(ang)*r));
    }
    return pts;
  }
  unlockAll(){
    for(let i=0;i<this.count;i++){
      this.bots[i].locked=false;
      this.locked[i]=false;
      this.bots[i].mesh.userData.locked=false;
      // reset foot glow
      const legs=this.bots[i].mesh.userData.legs;
      if(legs) legs.forEach(l=>{ l.footMat.emissiveIntensity=0; l.tipMat.emissiveIntensity=0; l.tipMat.opacity=0; });
    }
    this.lockedCount=0;
  }
  update(dt, time, params){
    const cohesion=params.cohesion, linkDist=params.linkDistance, transPos=params.transmitterPos, speed=params.buildSpeed||1;
    const lockDist=params.lockDist||this.precisionDist;
    const precisionMode=params.precisionMode??true;
    const positions=[];
    let totalErr=0, errCount=0;
    let lockedNow=0;

    for(let i=0;i<this.count;i++){
      const bot=this.bots[i], mesh=bot.mesh, vel=this.velocities[i], target=this.targets[i];
      const isLocked=bot.locked;
      if(isLocked) lockedNow++;

      if(!isLocked){
        const toTarget=target.clone().sub(mesh.position);
        const dist=toTarget.length();
        totalErr+=dist; errCount++;
        // lock check
        if(dist < lockDist){
          bot.locked=true; this.locked[i]=true; bot.lockTime=time;
          vel.set(0,0,0);
          mesh.userData.locked=true;
          // leg tuck
          const legs=mesh.userData.legs;
          if(legs) legs.forEach(leg=>{
            leg.footMat.emissiveIntensity=1.2;
            leg.tipMat.emissiveIntensity=2.5;
            leg.tipMat.opacity=0.9;
          });
          // sparks
          if(this.sparksEnabled){
            sparks.spawn(mesh.position, 7, themes[theme].color);
          }
          // pulse transmitter
          transMat.emissiveIntensity=5;
          setTimeout(()=> transMat.emissiveIntensity=2.8, 120);
          continue;
        }

        // precision scaling
        let approachScale=1;
        if(precisionMode){
          // exponential slow near target
          approachScale=THREE.MathUtils.clamp(dist*1.2, 0.12, 1);
          approachScale=Math.pow(approachScale, 1.2);
        } else {
          approachScale=Math.min(dist*0.9, 1);
        }

        toTarget.normalize().multiplyScalar(0.055 * (0.25 + cohesion*1.9) * approachScale * speed * Math.min(dist*1.1, 3.5));

        // separation
        const sep=new THREE.Vector3(); let sepC=0;
        const step=isMobile?3:2;
        for(let j=0;j<this.count;j+=step){
          if(i===j) continue; if(this.bots[j].locked && dist<1.5) continue; // locked bots not repulse as much near target?
          const other=this.bots[j].mesh.position;
          const d=mesh.position.distanceTo(other);
          if(d<0.68 && d>0.0001){
            const diff=mesh.position.clone().sub(other).normalize().divideScalar(d);
            sep.add(diff); sepC++;
          }
        }
        if(sepC>0) sep.divideScalar(sepC).normalize().multiplyScalar(0.036 * (precisionMode?0.6:1));

        // attraction to nearest locked cluster for scaffolding - helps build
        if(this.scaffold && this.lockedCount>0){
          let nearestLockedDist=Infinity, nearestLockedPos=null;
          for(let j=0;j<this.count;j++){
            if(!this.bots[j].locked) continue;
            const d=mesh.position.distanceTo(this.bots[j].mesh.position);
            if(d<nearestLockedDist && d<4){ nearestLockedDist=d; nearestLockedPos=this.bots[j].mesh.position; }
          }
          if(nearestLockedPos){
            const toLocked=nearestLockedPos.clone().sub(mesh.position).normalize().multiplyScalar(0.008);
            toTarget.add(toLocked);
          }
        }

        vel.add(toTarget); vel.add(sep);
        vel.multiplyScalar(precisionMode?0.92:0.94);
        vel.clampLength(0, (precisionMode?0.16:0.20)*speed);
        mesh.position.add(vel.clone().multiplyScalar(dt*60));

        if(vel.length()>0.001){ const look=mesh.position.clone().add(vel); mesh.lookAt(look); }
        mesh.rotation.x+=Math.sin(time*0.001*3 + bot.phase)*0.008;

        // leg walk animation
        const legs=mesh.userData.legs;
        if(legs){
          const moveSpeed=vel.length()*18;
          const isMoving=moveSpeed>0.02;
          legs.forEach((leg, li)=>{
            const tripodPhase = (li%2===0)?0:Math.PI; // 0, π alternating?
            // Actually legs 0 & 3 together, 1 & 2 together -> adjust
            const gaitPhase = (li===0||li===3)?0:Math.PI;
            const t=time*0.01* (isMoving? moveSpeed*2+1 : 0.3) + gaitPhase + bot.phase;
            if(isMoving){
              const swing=Math.sin(t)*0.55;
              const lift=Math.max(0, Math.sin(t))*0.35;
              leg.legGroup.rotation.x=swing*0.6;
              leg.legGroup.rotation.z= (li%2===0? -0.12:0.12) + Math.sin(t*0.5)*0.08;
              leg.lowerGroup.rotation.x= -0.6 + Math.cos(t)*0.5 - lift*0.8;
            } else {
              // idle small sway
              leg.legGroup.rotation.x=Math.sin(time*0.001 + li)*0.08;
              leg.lowerGroup.rotation.x=-0.25 + Math.sin(time*0.0015 + li*0.7)*0.12;
            }
          });
          // thruster glow pulse with speed
          const thruster=mesh.userData.thruster;
          if(thruster){
            thruster.material.opacity=0.08 + moveSpeed*0.35 + Math.sin(time*0.01+bot.phase)*0.04;
          }
        }

      } else {
        // locked behavior - spring to target
        const toTarget=target.clone().sub(mesh.position);
        const d=toTarget.length();
        totalErr+=d; errCount++;
        if(d>lockDist*2.2){
          // if pulled far, unlock
          if(d>1.2){ bot.locked=false; this.locked[i]=false; mesh.userData.locked=false; }
          else {
            mesh.position.add(toTarget.multiplyScalar(0.12));
          }
        }
        // tuck legs when locked
        const legs=mesh.userData.legs;
        if(legs){
          legs.forEach(leg=>{
            leg.legGroup.rotation.x=THREE.MathUtils.lerp(leg.legGroup.rotation.x, 0.15, 0.08);
            leg.lowerGroup.rotation.x=THREE.MathUtils.lerp(leg.lowerGroup.rotation.x, -1.2, 0.08);
          });
        }
        // foot glow pulse when locked
        if(this.lockGlow){
          const legs2=mesh.userData.legs;
          if(legs2){
            const pulse=0.8 + Math.sin(time*0.005 + i)*0.4;
            legs2.forEach(l=>{
              l.footMat.emissiveIntensity=0.6*pulse;
              l.tipMat.emissiveIntensity=1.5 + pulse*0.8;
              l.tipMat.opacity=0.6 + pulse*0.2;
            });
          }
        }
      }

      // LED update
      const led=mesh.userData.led;
      if(led){
        led.material.color.set(themes[theme].color);
        led.material.emissive.set(themes[theme].color);
        const baseInt=bot.locked ? (3.5 + Math.sin(time*0.003 + i)*0.4) : (2.2 + Math.sin(time*0.005 + i)*0.8);
        led.material.emissiveIntensity= baseInt + (mesh.position.distanceTo(transPos)<4?1.2:0);
      }
      const antTop=mesh.userData.antTop;
      if(antTop){
        antTop.material.color.set(themes[theme].color);
        antTop.material.emissive.set(themes[theme].color);
        antTop.material.emissiveIntensity= bot.locked? 2.5 : 1.2 + Math.sin(time*0.008 + i)*0.6;
      }

      if(!isLocked || true) positions.push({ pos: mesh.position.clone(), locked: isLocked, idx:i });
    }

    this.lockedCount=lockedNow;
    this.avgError= errCount? (totalErr/errCount) : 0;

    // links
    if(this.linksEnabled){
      const linkPositions=[]; const gridSize=linkDist;
      const buckets=new Map();
      const keyFor=v=> `${Math.floor(v.x/gridSize)}_${Math.floor(v.y/gridSize)}_${Math.floor(v.z/gridSize)}`;
      for(let i=0;i<positions.length;i++){
        const k=keyFor(positions[i].pos); if(!buckets.has(k)) buckets.set(k, []); buckets.get(k).push(i);
      }
      const neigh=[[-1,-1,-1],[0,0,0]]; // we generate all 27 offsets simpler
      const offsets=[]; for(let dx=-1;dx<=1;dx++) for(let dy=-1;dy<=1;dy++) for(let dz=-1;dz<=1;dz++) offsets.push([dx,dy,dz]);
      let linkCount=0; const maxLinks=isMobile?700:1300;
      for(let i=0;i<positions.length && linkCount<maxLinks;i++){
        const p=positions[i].pos; const base=keyFor(p).split('_').map(Number);
        for(const off of offsets){
          const nk=`${base[0]+off[0]}_${base[1]+off[1]}_${base[2]+off[2]}`;
          const list=buckets.get(nk); if(!list) continue;
          for(const jIdx of list){
            if(jIdx<=i) continue;
            const q=positions[jIdx];
            const d=p.distanceTo(q.pos);
            if(d<linkDist){
              // if both locked, stronger link
              const bothLocked=positions[i].locked && q.locked;
              // add line, but maybe slight offset for visual
              linkPositions.push(p.x,p.y,p.z,q.pos.x,q.pos.y,q.pos.z);
              linkCount++; if(linkCount>=maxLinks) break;
            }
          }
          if(linkCount>=maxLinks) break;
        }
      }
      this.linkGeo.setAttribute('position', new THREE.Float32BufferAttribute(linkPositions,3));
      this.linkGeo.attributes.position.needsUpdate=true; this.linkGeo.computeBoundingSphere();
      this.linkMat.color.set(themes[theme].color);
      this.linkMat.opacity= theme==='yokai' ? (isMobile?0.18:0.24) : (isMobile?0.14:0.20);
      this.linkLines.visible=true;
      return linkCount;
    } else {
      this.linkLines.visible=false;
      return 0;
    }
  }
}

// ---------- Init Swarm ----------
let mode='orbit';
let count=isMobile?160:240;
const swarm=new MicroSwarmV6(count);
let transmitterTarget=new THREE.Vector3(0,2,0);
let raycaster=new THREE.Raycaster();
let plane=new THREE.Plane(new THREE.Vector3(0,1,0), -2);
let mouse=new THREE.Vector2();
let interactionMode='build';
let isTransmitterDragging=false;
let autoBuild=false;
let buildProg=1;
let lastTap=0;
let formationScale=1; let formationRot=0;
let smartAssign=true, scaffold=true, ghostEnabled=true, sparksEnabled=true, precisionMode=true, linksEnabled=true, lockGlow=true, orbitHold=true;
let lockDist=0.16;

// formations list
const formationDefs=[
  {id:'orbit', label:'ORBIT', desc:'Idle hold', icon:'🌀', cat:'physics'},
  {id:'tower', label:'TOWER', desc:'Vertical', icon:'🏗️', cat:'arch'},
  {id:'sphere', label:'SPHERE', desc:'Shell', icon:'🔮', cat:'physics'},
  {id:'wave', label:'WAVE', desc:'Sine', icon:'🌊', cat:'physics'},
  {id:'bridge', label:'BRIDGE', desc:'Span', icon:'🌉', cat:'arch'},
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
    btn.innerHTML=`<b><i>${def.icon}</i> ${def.label}</b><small>${def.desc}</small>`;
    btn.addEventListener('click', ()=>{
      document.querySelectorAll('.mode-btn').forEach(b=>b.classList.remove('active','yokai-active'));
      mode=def.id;
      btn.classList.add(theme==='yokai'?'yokai-active':'active');
      document.getElementById('modeLabel').textContent=mode.toUpperCase();
      document.getElementById('modeLabelM').textContent=mode.toUpperCase();
      if(mode==='scatter'){ swarm.buildProgress=1; buildProg=1; autoBuild=false; }
      else if(autoBuild){ swarm.buildProgress=0.02; buildProg=0.02; }
      // new formation points
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

// transform points by scale and rotation Y around center
function transformPoints(points, center, scale, rotY){
  const cos=Math.cos(rotY), sin=Math.sin(rotY);
  return points.map(p=>{
    const rel=new THREE.Vector3().subVectors(p, center);
    // scale
    rel.multiplyScalar(scale);
    // rotate Y
    const x=rel.x*cos - rel.z*sin;
    const z=rel.x*sin + rel.z*cos;
    rel.x=x; rel.z=z;
    return new THREE.Vector3().addVectors(center, rel);
  });
}

// update formation and ghost
function updateFormation(forceReassign=false){
  const raw=getFormation(mode, swarm.count, transmitter.position, performance.now());
  // apply scale & rot around transmitter
  const transformed=transformPoints(raw, transmitter.position, formationScale, formationRot);
  swarm.setFormationPoints(transformed);
  if(forceReassign) swarm.reassignTargets();
}

// screen to world
function screenToWorld(x,y){
  const rect=canvas.getBoundingClientRect();
  mouse.x=((x - rect.left)/rect.width)*2 -1;
  mouse.y=-((y - rect.top)/rect.height)*2 +1;
  raycaster.setFromCamera(mouse, camera);
  const pt=new THREE.Vector3();
  raycaster.ray.intersectPlane(plane, pt);
  if(!pt) return null;
  pt.x=THREE.MathUtils.clamp(pt.x,-14,14);
  pt.z=THREE.MathUtils.clamp(pt.z,-14,14);
  return pt;
}
function updateTransmitterScreen(x,y){
  const pt=screenToWorld(x,y);
  if(!pt) return;
  transmitterTarget.x=pt.x; transmitterTarget.z=pt.z;
}

// pointer handling
canvas.addEventListener('pointerdown', e=>{
  if(e.target.closest('.card')||e.target.closest('.hud-top')||e.target.closest('.float-controls')||e.target.closest('.joystick')) return;
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
  if(now-lastTap<300){
    for(let i=0;i<swarm.count;i++) swarm.velocities[i].add(new THREE.Vector3((Math.random()-0.5)*3, Math.random()*2, (Math.random()-0.5)*3));
    transMat.emissiveIntensity=6; setTimeout(()=> transMat.emissiveIntensity=2.8, 160);
    if(navigator.vibrate) navigator.vibrate([20,30,20]);
  }
  lastTap=now;
});
canvas.addEventListener('pointermove', e=>{
  if(isMobile){
    if(isTransmitterDragging && (e.buttons===1 || e.pointerType==='touch')) updateTransmitterScreen(e.clientX,e.clientY);
  } else {
    if(e.buttons===1 && isTransmitterDragging) updateTransmitterScreen(e.clientX,e.clientY);
    else if(!isTransmitterDragging && e.pointerType==='mouse') updateTransmitterScreen(e.clientX,e.clientY);
  }
});
window.addEventListener('pointerup', ()=>{ isTransmitterDragging=false; controls.enabled=true; });

let lastPinch=0;
canvas.addEventListener('touchstart', e=>{
  if(e.touches.length===2){
    const dx=e.touches[0].clientX - e.touches[1].clientX; const dy=e.touches[0].clientY - e.touches[1].clientY;
    lastPinch=Math.hypot(dx,dy); controls.enabled=true; isTransmitterDragging=false;
  }
},{passive:true});
canvas.addEventListener('touchmove', e=>{
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

// seg toggle
const segBtns=document.querySelectorAll('.seg-btn');
const camToggleBtn=document.getElementById('btnCameraToggle');
function setInteractionMode(m){ interactionMode=m; segBtns.forEach(b=>b.classList.toggle('active', b.dataset.seg===m)); if(camToggleBtn) camToggleBtn.textContent=m==='camera'?'BUILD MODE':'CAMERA MODE'; }
segBtns.forEach(b=> b.addEventListener('click', ()=> setInteractionMode(b.dataset.seg)));
camToggleBtn?.addEventListener('click', ()=> setInteractionMode(interactionMode==='build'?'camera':'build'));

// sheet
const panelLeft=document.getElementById('panelLeft'); const menuToggle=document.getElementById('menuToggle'); const sheetHandle=document.getElementById('sheetHandle');
let sheetOpen=window.innerWidth>1300;
function setSheet(o){ sheetOpen=o; if(window.innerWidth<=1300){ panelLeft.classList.toggle('open',o); menuToggle.innerHTML=o?`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"/></svg>`:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 7h16M4 12h16M4 17h16"/></svg>`; } }
menuToggle?.addEventListener('click', ()=>setSheet(!sheetOpen)); sheetHandle?.addEventListener('click', ()=>setSheet(!sheetOpen));
let startY=0; sheetHandle?.addEventListener('touchstart', e=>{startY=e.touches[0].clientY;},{passive:true}); sheetHandle?.addEventListener('touchmove', e=>{ const dy=e.touches[0].clientY-startY; if(dy<-30)setSheet(true); if(dy>40)setSheet(false); },{passive:true});

// viewer single
function initViewer(id){
  const c=document.getElementById(id); if(!c) return;
  const r2=new THREE.WebGLRenderer({ canvas:c, alpha:true, antialias:!isMobile }); r2.setPixelRatio(Math.min(window.devicePixelRatio,1.6));
  const resize=()=>{ const w=c.clientWidth,h=c.clientHeight||240; r2.setSize(w,h,false); cam2.aspect=w/h; cam2.updateProjectionMatrix(); };
  const w=c.clientWidth,h=c.clientHeight||240; r2.setSize(w,h,false);
  const s2=new THREE.Scene(); const cam2=new THREE.PerspectiveCamera(35,w/(h||240),0.1,100); cam2.position.set(1.6,0.9,1.3);
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

countSlider.value=count; countVal.textContent=count;
countSlider.addEventListener('input', e=>{ count=parseInt(e.target.value); countVal.textContent=count; document.getElementById('activeCount').textContent=count; const me=document.getElementById('activeCountM'); if(me) me.textContent=count; });
countSlider.addEventListener('change', e=>{ swarm.setCount(parseInt(e.target.value)); updateFormation(true); });
cohesionSlider.addEventListener('input', e=> cohesionVal.textContent=parseFloat(e.target.value).toFixed(2));
linkSlider.addEventListener('input', e=> linkVal.textContent=parseFloat(e.target.value).toFixed(1));
speedSlider.addEventListener('input', e=> speedVal.textContent=parseFloat(e.target.value).toFixed(1));
scaleSlider.addEventListener('input', e=>{ formationScale=parseFloat(e.target.value); scaleVal.textContent=formationScale.toFixed(2); updateFormation(true); });
rotSlider.addEventListener('input', e=>{ formationRot=parseFloat(e.target.value)*Math.PI/180; rotVal.textContent=e.target.value+'°'; updateFormation(true); });
precSlider.addEventListener('input', e=>{ lockDist=parseFloat(e.target.value); swarm.precisionDist=lockDist; precVal.textContent=lockDist.toFixed(2); });

function applyTheme(th){
  theme=th; accentColor.set(themes[th].color);
  transMat.color.set(themes[th].color); transMat.emissive.set(themes[th].color);
  ringMat1.color.set(themes[th].color); ringMat2.color.set(themes[th].color); vLineMat.color.set(themes[th].color);
  pointA.color.set(themes[th].color); ghostMat.color.set(themes[th].color); sparks.mat.color.set(themes[th].color);
  document.querySelectorAll('.color-dot').forEach(d=> d.classList.toggle('active', d.dataset.color===th));
  const status=document.getElementById('transStatus'); const label=document.getElementById('transLabel');
  if(th==='yokai'){ status.classList.add('yokai'); label.textContent=isMobile?'YOKAI • 5.8GHz':'YOKAI • PRECISION WELD'; document.querySelectorAll('.mode-btn.active').forEach(b=>{b.classList.remove('active'); b.classList.add('yokai-active');}); }
  else { status.classList.remove('yokai'); label.textContent=isMobile?`${th.toUpperCase()} • PRECISION`:`${th.toUpperCase()} • PRECISION BUILD`; document.querySelectorAll('.mode-btn.yokai-active').forEach(b=>{b.classList.remove('yokai-active'); b.classList.add('active');}); }
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
const flags={ ghost:true, sparks:true, smart:true, scaffold:true, precisionMode:true, links:true, orbitHold:false, lockGlow:true };
toggleEls.forEach(el=>{
  el.addEventListener('click', ()=>{
    const key=el.dataset.toggle;
    flags[key]=!flags[key];
    el.classList.toggle('active', flags[key]);
    // apply
    if(key==='ghost') swarm.ghostEnabled=flags[key];
    if(key==='sparks') swarm.sparksEnabled=flags[key];
    if(key==='smart') swarm.smartAssign=flags[key];
    if(key==='scaffold') swarm.scaffold=flags[key];
    if(key==='precisionMode') swarm.precisionMode=flags[key];
    if(key==='links') swarm.linksEnabled=flags[key];
    if(key==='lockGlow') swarm.lockGlow=flags[key];
    if(key==='orbitHold') swarm.orbitHold=flags[key];
    if(key==='ghost') swarm.updateGhost();
  });
});

const btnAuto=document.getElementById('btnAuto'), btnAssemble=document.getElementById('btnAssemble'), btnScatter=document.getElementById('btnScatter'), btnClearLocks=document.getElementById('btnClearLocks');
const progBar=document.getElementById('buildProg'), progTxt=document.getElementById('progTxt'), lockedTxt=document.getElementById('lockedTxt'), accTxt=document.getElementById('accTxt'), layerTxt=document.getElementById('layerTxt');

btnAuto.addEventListener('click', ()=>{
  autoBuild=!autoBuild; btnAuto.textContent=`AUTO BUILD: ${autoBuild?'ON':'OFF'}`; btnAuto.classList.toggle('active', autoBuild);
  if(autoBuild){ swarm.buildProgress=0.02; buildProg=0.02; }
  else swarm.buildProgress=1;
});
btnAssemble.addEventListener('click', ()=>{ swarm.buildProgress=0.02; buildProg=0.02; autoBuild=true; btnAuto.textContent='AUTO BUILD: ON'; btnAuto.classList.add('active'); if(navigator.vibrate) navigator.vibrate(20); });
btnScatter.addEventListener('click', ()=>{
  for(let i=0;i<swarm.count;i++) swarm.velocities[i].add(new THREE.Vector3((Math.random()-0.5)*4, Math.random()*2.5, (Math.random()-0.5)*4));
  swarm.unlockAll(); swarm.buildProgress=1; buildProg=1; autoBuild=false; btnAuto.textContent='AUTO BUILD: OFF'; btnAuto.classList.remove('active');
  const pts=getFormation('scatter', swarm.count, transmitter.position, performance.now());
  swarm.setFormationPoints(transformPoints(pts, transmitter.position, formationScale, formationRot));
});
btnClearLocks.addEventListener('click', ()=>{ swarm.unlockAll(); });

// loader
window.addEventListener('load', ()=>{
  setTimeout(()=>{
    document.getElementById('loader')?.classList.add('hidden');
    const mh=document.getElementById('mobileHint');
    if(isMobile && mh){ mh.style.display='flex'; setTimeout(()=>{ mh.style.opacity='0'; mh.style.transform='translateX(-50%) translateY(10px)'; }, 4400); setTimeout(()=> mh.style.display='none', 4900); }
  }, isMobile?900:600);
});

// initial formation
updateFormation(true);

// animation
let last=performance.now(); let fpsAcc=0,fpsCount=0,lastFps=performance.now(); let linkDisp=0;
function animate(){
  requestAnimationFrame(animate);
  const now=performance.now(); const dt=Math.min((now-last)/1000, 0.05); last=now;

  transmitter.position.lerp(transmitterTarget, 0.09);
  pointA.position.copy(transmitter.position); pointA.position.y+=0.6;
  transmitter.rotation.y+=dt*0.7; transRing.rotation.z+=dt*0.6;

  // auto build progress
  if(autoBuild){
    buildProg=Math.min(1, buildProg + dt*0.38*parseFloat(speedSlider.value));
    swarm.buildProgress=buildProg;
    if(progBar) progBar.style.width=`${buildProg*100}%`;
    if(progTxt) progTxt.textContent=`${Math.round(buildProg*100)}%`;
    // reassign every 5% progress
    if(Math.floor(buildProg*20)!==Math.floor((buildProg - dt*0.38)*20)){
      swarm.reassignTargets();
    }
    if(buildProg>=1){ autoBuild=false; btnAuto.textContent='AUTO BUILD: OFF'; btnAuto.classList.remove('active'); }
  } else {
    if(progBar) progBar.style.width='100%';
    if(progTxt) progTxt.textContent='100%';
  }

  // formation continuously updates slowly for animated modes (wave, vortex etc) - but for precision building we don't want jitter so only update ghost? We will update targets every frame from formation but with smoothing?
  // For stable building, we update formation points each frame but only for dynamic modes; for static modes like eiffel we keep same but transmitter moves
  const rawPoints=getFormation(mode, swarm.count, transmitter.position, now);
  const transformed=transformPoints(rawPoints, transmitter.position, formationScale, formationRot);
  // Only fully replace if not in scaffold auto building? Actually we need to keep sortedPoints updated for moving transmitter
  swarm.allPoints=transformed.map(p=>p.clone());
  swarm.sortedPoints=[...swarm.allPoints].sort((a,b)=>a.y-b.y);
  swarm.updateGhost();
  // if not auto building, reassign occasionally to follow transmitter
  if(!autoBuild && now%1000<16) swarm.reassignTargets();

  const linkCount=swarm.update(dt, now, {
    cohesion: parseFloat(cohesionSlider.value),
    linkDistance: parseFloat(linkSlider.value),
    transmitterPos: transmitter.position,
    buildSpeed: parseFloat(speedSlider.value),
    lockDist: lockDist,
    precisionMode: flags.precisionMode
  });
  linkDisp=linkCount;

  sparks.update(dt);
  controls.update();
  renderer.render(scene,camera);

  // telemetry
  fpsAcc+=1/dt; fpsCount++;
  if(now-lastFps>450){
    const fps=Math.round(fpsAcc/fpsCount);
    document.getElementById('fps').textContent=fps;
    const fpsM=document.getElementById('fpsM'); if(fpsM) fpsM.textContent=fps;
    document.getElementById('linkCount').textContent=linkDisp;
    document.getElementById('lockedCount').textContent=swarm.lockedCount;
    document.getElementById('totalCount').textContent=swarm.count;
    const lockedM=document.getElementById('lockedM'); if(lockedM) lockedM.textContent=`${Math.round(swarm.lockedCount/swarm.count*100)}%`;
    if(lockedTxt) lockedTxt.textContent=`${swarm.lockedCount}/${swarm.count}`;
    if(accTxt) accTxt.textContent=`${swarm.avgError.toFixed(3)}m`;
    if(layerTxt) layerTxt.textContent=`${Math.floor(swarm.buildProgress*swarm.numLayers)}/${swarm.numLayers}`;
    fpsAcc=0; fpsCount=0; lastFps=now;
  }
}
animate();

window.addEventListener('resize', ()=>{
  renderer.setSize(window.innerWidth, window.innerHeight);
  camera.aspect=window.innerWidth/window.innerHeight;
  camera.updateProjectionMatrix();
});

setTimeout(()=>{ transmitterTarget.set(isMobile?2:3,2,isMobile?2:2); }, 400);

window.addEventListener('touchmove', e=>{ if(e.target.closest('.scroll')) return; }, {passive:false});

window.addEventListener('keydown', e=>{
  if(e.key.toLowerCase()==='s'){
    const a=document.createElement('a'); a.download=`microbot-v6-${mode}-${Date.now()}.png`; a.href=renderer.domElement.toDataURL('image/png'); a.click();
  }
});
