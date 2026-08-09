import * as THREE from 'three';

// Utility: lerp vectors
const lerpV3 = (a,b,t)=> new THREE.Vector3(
  a.x + (b.x-a.x)*t,
  a.y + (b.y-a.y)*t,
  a.z + (b.z-a.z)*t
);

// Generate N points along line a->b
function linePoints(a,b,n, jitter=0){
  const out=[];
  for(let i=0;i<n;i++){
    const t=i/(n-1||1);
    const p=lerpV3(a,b,t);
    if(jitter){ p.x+=(Math.random()-0.5)*jitter; p.y+=(Math.random()-0.5)*jitter; p.z+=(Math.random()-0.5)*jitter; }
    out.push(p);
  }
  return out;
}

export const Formations = {
  orbit: (count, center, t)=>{
    const pts=[];
    for(let i=0;i<count;i++){
      const iNorm=i/count;
      const angle=iNorm*Math.PI*2*3 + t*0.6;
      const radius=2.5 + Math.sin(iNorm*12 + t*0.001)*0.6 + (i%7)*0.15;
      const y=Math.sin(iNorm*20 + t*0.0008)*1.2 + 2 + Math.cos(angle*0.5)*1.0;
      pts.push(new THREE.Vector3(
        center.x + Math.cos(angle)*radius*1.2,
        y,
        center.z + Math.sin(angle)*radius*1.2
      ));
    }
    return pts;
  },
  tower: (count, center, t)=>{
    const pts=[]; const perLayer=8;
    for(let i=0;i<count;i++){
      const layer=Math.floor(i/perLayer);
      const idx=i%perLayer;
      const ang=(idx/perLayer)*Math.PI*2 + layer*0.2;
      const rad=0.7 + (layer%3)*0.15;
      const h=layer*0.32 -2;
      pts.push(new THREE.Vector3(
        center.x + Math.cos(ang)*rad,
        h+2 + Math.sin(t*0.002+layer*0.4)*0.05,
        center.z + Math.sin(ang)*rad
      ));
    }
    return pts;
  },
  sphere: (count, center, t)=>{
    const pts=[]; const R=3.2;
    for(let i=0;i<count;i++){
      const phi=Math.acos(1-2*(i/count));
      const theta=Math.PI*(1+Math.sqrt(5))*i + t*0.0005;
      pts.push(new THREE.Vector3(
        center.x + R*Math.cos(theta)*Math.sin(phi),
        2 + R*Math.sin(theta)*Math.sin(phi),
        center.z + R*Math.cos(phi)
      ));
    }
    return pts;
  },
  wave: (count, center, t)=>{
    const pts=[]; const cols=Math.ceil(Math.sqrt(count)); const spacing=0.6;
    for(let i=0;i<count;i++){
      const col=i%cols; const row=Math.floor(i/cols);
      const x=(col - cols/2)*spacing;
      const z=(row - cols/2)*spacing;
      const y=Math.sin(x*0.8 + t*0.002)*0.8 + Math.cos(z*0.9 + t*0.0016)*0.8 + 2;
      pts.push(new THREE.Vector3(center.x+x, y, center.z+z));
    }
    return pts;
  },
  bridge: (count, center, t)=>{
    const pts=[];
    for(let i=0;i<count;i++){
      const norm=i/count; const x=(norm-0.5)*14;
      const catenary=Math.cosh(x*0.28)*0.9 -1.5;
      const y=4 - catenary + Math.sin(norm*20)*0.05;
      const zOffset=((i%6)-2.5)*0.45;
      pts.push(new THREE.Vector3(center.x + x*0.9, y, center.z*0.15 + zOffset + Math.sin(norm*10 + t*0.001)*0.08));
    }
    return pts;
  },
  vortex: (count, center, t)=>{
    const pts=[];
    for(let i=0;i<count;i++){
      const norm=i/count; const angle=norm*5*Math.PI*2 + t*0.003;
      const radius=(1-norm)*5 +0.5;
      const y=norm*10 -2 + Math.sin(angle*0.5)*0.3;
      pts.push(new THREE.Vector3(center.x + Math.cos(angle)*radius, y, center.z + Math.sin(angle)*radius));
    }
    return pts;
  },
  // ---- NEW MASSIVE FORMATIONS ----
  eiffel: (count, center, t)=>{
    const pts=[];
    const H=11; // height
    const baseCorners = [
      new THREE.Vector3(-3, -2, -3),
      new THREE.Vector3(3, -2, -3),
      new THREE.Vector3(3, -2, 3),
      new THREE.Vector3(-3, -2, 3),
    ];
    const p1Corners = [
      new THREE.Vector3(-2.0, 1, -2.0),
      new THREE.Vector3(2.0, 1, -2.0),
      new THREE.Vector3(2.0, 1, 2.0),
      new THREE.Vector3(-2.0, 1, 2.0),
    ];
    const p2Corners = [
      new THREE.Vector3(-1.2, 4.5, -1.2),
      new THREE.Vector3(1.2, 4.5, -1.2),
      new THREE.Vector3(1.2, 4.5, 1.2),
      new THREE.Vector3(-1.2, 4.5, 1.2),
    ];
    const topCorners = [
      new THREE.Vector3(-0.45, 8.2, -0.45),
      new THREE.Vector3(0.45, 8.2, -0.45),
      new THREE.Vector3(0.45, 8.2, 0.45),
      new THREE.Vector3(-0.45, 8.2, 0.45),
    ];
    const apex = new THREE.Vector3(0, 11.5, 0);
    const apexMid = new THREE.Vector3(0, 9.5, 0);

    // helper to push sampled lines
    const addSegment = (a,b,n)=>{
      for(let i=0;i<n;i++){
        const tt=i/(n-1||1);
        // curved interpolation - ease in
        const tEasy = Math.pow(tt, 0.85);
        const p = lerpV3(a,b,tEasy);
        // add slight inward curve for legs
        const curve = Math.sin(tt*Math.PI)*0.15;
        // push towards center slightly in middle
        const toCenter = new THREE.Vector3(0,p.y,0).sub(p).multiplyScalar(curve*0.3);
        p.add(toCenter);
        p.add(new THREE.Vector3((Math.random()-0.5)*0.08,(Math.random()-0.5)*0.08,(Math.random()-0.5)*0.08));
        pts.push(p);
        if(pts.length>=count*1.2) return;
      }
    };

    // 4 legs base->p1, p1->p2, p2->top, top->apex
    const legs = 4;
    const perLeg = Math.floor(count*0.6 / (legs*4));
    for(let leg=0;leg<legs;leg++){
      addSegment(baseCorners[leg], p1Corners[leg], perLeg);
      addSegment(p1Corners[leg], p2Corners[leg], perLeg);
      addSegment(p2Corners[leg], topCorners[leg], perLeg);
      addSegment(topCorners[leg], leg%2===0? apexMid : apex, Math.floor(perLeg*0.6));
    }
    // platforms
    const plat1 = Math.floor(count*0.08);
    for(let i=0;i<plat1;i++){
      const edge = Math.floor(Math.random()*4);
      const a=p1Corners[edge], b=p1Corners[(edge+1)%4];
      pts.push(lerpV3(a,b, Math.random()));
    }
    const plat2 = Math.floor(count*0.06);
    for(let i=0;i<plat2;i++){
      const edge = Math.floor(Math.random()*4);
      const a=p2Corners[edge], b=p2Corners[(edge+1)%4];
      pts.push(lerpV3(a,b, Math.random()));
    }
    const plat3 = Math.floor(count*0.04);
    for(let i=0;i<plat3;i++){
      const edge = Math.floor(Math.random()*4);
      const a=topCorners[edge], b=topCorners[(edge+1)%4];
      pts.push(lerpV3(a,b, Math.random()));
    }
    // X bracing between legs at low levels
    for(let i=0;i<count*0.18;i++){
      const y = -1.5 + Math.random()*5.5;
      // interpolate radius at y
      let t;
      if(y<1) t = (y+2)/3;
      else t = 0.33 + (y-1)/8;
      t = Math.min(Math.max(t,0),1);
      const r = THREE.MathUtils.lerp(3.2, 0.8, Math.pow(t,0.9));
      const ang = Math.random()*Math.PI*2;
      const radVar = r*(0.85+Math.random()*0.3);
      pts.push(new THREE.Vector3(Math.cos(ang)*radVar, y+ (Math.random()-0.5)*0.3, Math.sin(ang)*radVar));
    }
    // trim / pad
    while(pts.length<count){
      const a = pts[Math.floor(Math.random()*pts.length)];
      pts.push(a.clone().add(new THREE.Vector3((Math.random()-0.5)*0.2,(Math.random()-0.5)*0.2,(Math.random()-0.5)*0.2)));
    }
    // center
    return pts.slice(0,count).map(p=> new THREE.Vector3(p.x+center.x, p.y, p.z+center.z*0.2));
  },

  dna: (count, center, t)=>{
    const pts=[];
    const turns=3, height=10, radius=1.8, perTurn= count/2;
    for(let i=0;i<count;i++){
      const strand = i%2;
      const idx = Math.floor(i/2);
      const norm = idx/(count/2);
      const angle = norm * turns * Math.PI*2 + t*0.0015 + strand*Math.PI;
      const y = norm*height -2 + Math.sin(norm*10)*0.05;
      const r = radius + Math.sin(y*2 + t*0.001)*0.12;
      pts.push(new THREE.Vector3(center.x + Math.cos(angle)*r, y, center.z + Math.sin(angle)*r));
      // occasional rung
      if(i%7===0 && idx+1<count/2){
        const midAngle = angle + Math.PI/2;
        // rung point between strands - just add extra? we reuse existing count so skip
      }
    }
    // add rungs as extra lerp between strands for visual linking (we will rely on link lines)
    return pts;
  },

  heart: (count, center, t)=>{
    const pts=[];
    const scale=0.18;
    const beat = 1 + Math.sin(t*0.004)*0.12;
    for(let i=0;i<count;i++){
      // 2D heart then extrude
      const theta = Math.random()*Math.PI*2;
      // inside heart using rejection sampling for volume
      // parametric heart surface
      const u = (Math.random()*2-1);
      const v = Math.random();
      // classic heart formula
      const tt = Math.random()*Math.PI*2;
      const x = 16*Math.pow(Math.sin(tt),3);
      const y = 13*Math.cos(tt) -5*Math.cos(2*tt) -2*Math.cos(3*tt) -Math.cos(4*tt);
      // randomize depth
      const z = (Math.random()-0.5)*6;
      // taper z with heart shape
      const taper = Math.max(0, 1 - Math.abs(y-2)/16);
      pts.push(new THREE.Vector3(center.x + x*scale*beat, 2.5 + y*scale*beat, center.z + z*scale*0.6*taper));
    }
    return pts;
  },

  baymax: (count, center, t)=>{
    const pts=[];
    // Baymax head = big circle with two eyes line
    // head outline
    for(let i=0;i<count;i++){
      const r = Math.random();
      if(r<0.55){
        // head circle perimeter + fill
        const ang = Math.random()*Math.PI*2;
        const rad = (r<0.35 ? (0.2+Math.random()*2.6) : 2.8) * (0.9+Math.random()*0.2);
        // squash vertically
        const x = Math.cos(ang)*rad*1.1;
        const y = 3 + Math.sin(ang)*rad*0.95;
        const z = (Math.random()-0.5)*0.4 * (3 - rad*0.3);
        if(Math.hypot(x,y-3)<2.9 || rad>2.5) pts.push(new THREE.Vector3(center.x + x, y, center.z + z));
        else i--;
      } else if(r<0.75){
        // eyes line
        const x = (Math.random()-0.5)*4.2;
        const y = 3.1 + (Math.random()-0.5)*0.25;
        const z = 1.2 + Math.random()*0.15;
        pts.push(new THREE.Vector3(center.x + x, y, center.z + z));
      } else {
        // body hint below
        const x = (Math.random()-0.5)*2;
        const y = 0 + Math.random()*1.5;
        const z = (Math.random()-0.5)*0.6;
        pts.push(new THREE.Vector3(center.x + x, y, center.z + z));
      }
    }
    return pts.slice(0,count);
  },

  cube: (count, center, t)=>{
    const pts=[]; const s=2.2;
    const edges=[
      [[-s,-s,-s],[s,-s,-s]], [[s,-s,-s],[s,s,-s]], [[s,s,-s],[-s,s,-s]], [[-s,s,-s],[-s,-s,-s]],
      [[-s,-s,s],[s,-s,s]], [[s,-s,s],[s,s,s]], [[s,s,s],[-s,s,s]], [[-s,s,s],[-s,-s,s]],
      [[-s,-s,-s],[-s,-s,s]], [[s,-s,-s],[s,-s,s]], [[s,s,-s],[s,s,s]], [[-s,s,-s],[-s,s,s]],
    ];
    const perEdge=Math.floor(count/edges.length);
    edges.forEach(([a,b])=>{
      const av=new THREE.Vector3(...a), bv=new THREE.Vector3(...b);
      for(let i=0;i<perEdge;i++){
        const tt=i/perEdge;
        pts.push(lerpV3(av,bv,tt).add(center).add(new THREE.Vector3(0,2.5,0)));
      }
    });
    while(pts.length<count){
      const a=edges[Math.floor(Math.random()*edges.length)];
      pts.push(lerpV3(new THREE.Vector3(...a[0]), new THREE.Vector3(...a[1]), Math.random()).add(center).add(new THREE.Vector3(0,2.5,0)));
    }
    return pts.slice(0,count);
  },

  pyramid: (count, center, t)=>{
    const pts=[]; const base=3; const h=5;
    const basePts=[new THREE.Vector3(-base,-2,-base),new THREE.Vector3(base,-2,-base),new THREE.Vector3(base,-2,base),new THREE.Vector3(-base,-2,base)];
    const apex=new THREE.Vector3(0, h-2,0);
    for(let i=0;i<count;i++){
      const r=Math.random();
      if(r<0.4){
        // base edges
        const e=Math.floor(Math.random()*4);
        const a=basePts[e], b=basePts[(e+1)%4];
        pts.push(lerpV3(a,b,Math.random()).add(center));
      } else if(r<0.85){
        // side edges
        const e=Math.floor(Math.random()*4);
        pts.push(lerpV3(basePts[e],apex,Math.random()).add(center));
      } else {
        // fill base interior
        const x=(Math.random()-0.5)*base*2*0.9;
        const z=(Math.random()-0.5)*base*2*0.9;
        pts.push(new THREE.Vector3(center.x + x, -2, center.z + z));
      }
    }
    return pts;
  },

  stairs: (count, center, t)=>{
    const pts=[]; const turns=3, height=9, radius=2.5, stepsPerTurn=18;
    const totalSteps=turns*stepsPerTurn;
    const perStep=Math.floor(count/totalSteps);
    for(let s=0;s<totalSteps;s++){
      const ang=(s/totalSteps)*turns*Math.PI*2;
      const y=(s/totalSteps)*height -2;
      const cx=Math.cos(ang)*radius, cz=Math.sin(ang)*radius;
      // step platform
      for(let i=0;i<perStep;i++){
        const rr=Math.random()*0.9;
        const aa=ang + (Math.random()-0.5)*0.5;
        pts.push(new THREE.Vector3(center.x + Math.cos(aa)*radius*rr, y + Math.random()*0.12, center.z + Math.sin(aa)*radius*rr));
      }
      // railing
      if(s%2===0) pts.push(new THREE.Vector3(center.x + Math.cos(ang)*(radius+0.15), y+0.6, center.z + Math.sin(ang)*(radius+0.15)));
    }
    // center pole
    for(let i=0;i<count*0.1;i++){
      pts.push(new THREE.Vector3(center.x + (Math.random()-0.5)*0.2, -2 + Math.random()*height, center.z + (Math.random()-0.5)*0.2));
    }
    return pts.slice(0,count);
  },

  infinity: (count, center, t)=>{
    const pts=[];
    for(let i=0;i<count;i++){
      const tt=(i/count)*Math.PI*2;
      // figure-8 on torus
      const scale=2.8;
      const x=scale*Math.cos(tt);
      const y=2 + scale*Math.sin(tt)*Math.cos(tt)*0.9;
      const z=scale*0.5*Math.sin(tt);
      // add thickness
      const jitter=(Math.random()-0.5)*0.18;
      pts.push(new THREE.Vector3(center.x + x + jitter, y + jitter*0.5, center.z + z));
    }
    return pts;
  },

  torus: (count, center, t)=>{
    const pts=[]; const R=2.6, r=0.9;
    for(let i=0;i<count;i++){
      const u=Math.random()*Math.PI*2;
      const v=Math.random()*Math.PI*2;
      const x=(R + r*Math.cos(v))*Math.cos(u);
      const y=2.5 + (R + r*Math.cos(v))*Math.sin(u)*0.35 + r*Math.sin(v)*0.7;
      const z=r*Math.sin(v);
      pts.push(new THREE.Vector3(center.x + x, y, center.z + z));
    }
    return pts;
  },

  dragon: (count, center, t)=>{
    const pts=[];
    const len=16;
    for(let i=0;i<count;i++){
      const norm=i/count;
      const prog=norm*len;
      // serpentine curve
      const x=(norm-0.5)*12 + Math.sin(prog*1.2 + t*0.001)*0.8;
      const y=2 + Math.sin(prog*0.6)*1.2 + Math.cos(prog*0.4)*0.8 + norm*1.5;
      const z=Math.cos(prog*0.9 + t*0.0015)*2.5 + Math.sin(prog*0.7)*0.6;
      // body thickness
      const thick= (1 - norm*0.5)*0.5;
      const ang=Math.random()*Math.PI*2;
      pts.push(new THREE.Vector3(
        center.x + x + Math.cos(ang)*thick*0.5,
        y + Math.sin(ang)*thick*0.5,
        center.z + z + Math.cos(ang*1.3)*thick*0.3
      ));
    }
    return pts;
  },

  shield: (count, center, t)=>{
    const pts=[];
    const h=4, w=2.8;
    for(let i=0;i<count;i++){
      const ny=(Math.random()-0.5)*h;
      // shield shape: curved plane like arc
      const nx=(Math.random()-0.5)*w*(1 - Math.abs(ny)/h*0.3);
      const nz= Math.cos(nx*0.6)*0.6 + Math.sin(ny*0.8 + t*0.001)*0.05;
      pts.push(new THREE.Vector3(center.x + nx, 2+ny, center.z + nz));
    }
    return pts;
  },

  funnel: (count, center, t)=>{
    const pts=[];
    for(let i=0;i<count;i++){
      const norm=Math.pow(Math.random(),1.2);
      const y=norm*10 -2;
      const r=(1 - norm)*3.5 + 0.2 + Math.sin(norm*15 + t*0.002)*0.1;
      const ang=norm*12*Math.PI + t*0.002;
      pts.push(new THREE.Vector3(center.x + Math.cos(ang)*r, y, center.z + Math.sin(ang)*r));
    }
    return pts;
  },

  hiro: (count, center, t)=>{
    // simple text HIRO as voxel
    const letterTemplates={
      H: [[0,0],[0,1],[0,2],[1,1],[2,0],[2,1],[2,2]],
      I: [[0,0],[0,1],[0,2],[0,3]],
      R: [[0,0],[0,1],[0,2],[0,3],[1,0],[1,1],[2,1],[1,3],[2,3]],
      O: [[0,0],[0,1],[0,2],[1,0],[1,2],[2,0],[2,1],[2,2]],
    };
    const letters=['H','I','R','O'];
    const pts=[];
    const spacing=1.8, scale=0.45;
    letters.forEach((ch, li)=>{
      const tmpl=letterTemplates[ch];
      tmpl.forEach(([x,y])=>{
        for(let k=0;k<4;k++){
          pts.push(new THREE.Vector3(
            center.x + (li*spacing - 2.7) + x*scale + (Math.random()-0.5)*0.08,
            3 + y*scale + (Math.random()-0.5)*0.08,
            center.z + (Math.random()-0.5)*0.25
          ));
        }
      });
    });
    while(pts.length<count){
      const base=pts[Math.floor(Math.random()*pts.length)];
      pts.push(base.clone().add(new THREE.Vector3((Math.random()-0.5)*0.2,(Math.random()-0.5)*0.2,(Math.random()-0.5)*0.2)));
    }
    return pts.slice(0,count);
  },

  city: (count, center, t)=>{
    const pts=[];
    const buildings=12;
    for(let b=0;b<buildings;b++){
      const bx=(b - buildings/2)*1.4 + (Math.random()-0.5)*0.3;
      const bz=(Math.random()-0.5)*2.5;
      const h=1 + Math.random()*4 + (b%3);
      const w=0.4 + Math.random()*0.4;
      const d=0.4 + Math.random()*0.4;
      const perB=Math.floor(count/buildings);
      for(let i=0;i<perB;i++){
        const x=bx + (Math.random()-0.5)*w;
        const y=-2 + Math.random()*h;
        const z=bz + (Math.random()-0.5)*d;
        // only surface
        if(Math.random()<0.3 || y>h*0.9) pts.push(new THREE.Vector3(center.x + x, y, center.z + z));
        else i--;
      }
    }
    return pts.slice(0,count);
  },

  hand: (count, center, t)=>{
    const pts=[];
    // palm
    const palmW=1.2,palmH=1.4;
    for(let i=0;i<count*0.35;i++){
      pts.push(new THREE.Vector3(
        center.x + (Math.random()-0.5)*palmW,
        1 + Math.random()*palmH,
        center.z + (Math.random()-0.5)*0.3
      ));
    }
    // 5 fingers
    for(let f=0;f<5;f++){
      const fingerX=(f-2)*0.35;
      const fingerLen=0.6 + (f===2?0.4:0) + Math.random()*0.2;
      const perFinger=Math.floor(count*0.13);
      for(let i=0;i<perFinger;i++){
        const tt=Math.random();
        const y=2.2 + tt*fingerLen + Math.sin(tt*Math.PI)*0.05* (f===0? -1:0);
        const x=fingerX + (Math.random()-0.5)*0.18 + (f===0? -tt*0.3 : 0);
        const z=(Math.random()-0.5)*0.18 + (f===0? tt*0.2:0);
        pts.push(new THREE.Vector3(center.x + x, y, center.z + z));
      }
    }
    return pts.slice(0,count);
  },

  satellite: (count, center, t)=>{
    const pts=[];
    // dish parabolic
    for(let i=0;i<count*0.6;i++){
      const r=Math.random()*2.2;
      const ang=Math.random()*Math.PI*2;
      const y=r*r*0.18;
      pts.push(new THREE.Vector3(
        center.x + Math.cos(ang)*r,
        3.5 + y*0.5,
        center.z + Math.sin(ang)*r
      ));
    }
    // stem + base
    for(let i=0;i<count*0.4;i++){
      if(Math.random()<0.5){
        // stem
        const yy=Math.random()*2;
        pts.push(new THREE.Vector3(center.x + (Math.random()-0.5)*0.15, 1.5 + yy, center.z + (Math.random()-0.5)*0.15));
      } else {
        // base box
        pts.push(new THREE.Vector3(
          center.x + (Math.random()-0.5)*0.8,
          -0.5 + Math.random()*1.5,
          center.z + (Math.random()-0.5)*0.8
        ));
      }
    }
    return pts.slice(0,count);
  },

  helixRing: (count, center, t)=>{
    const pts=[];
    const rings=4;
    for(let i=0;i<count;i++){
      const ring=Math.floor((i/count)*rings);
      const norm=(i%Math.floor(count/rings))/Math.floor(count/rings);
      const ang=norm*Math.PI*2 + t*0.001 + ring*0.5;
      const R=2.5 - ring*0.45;
      const y=2 + Math.sin(ring*1.2)*1.2 + Math.cos((i/count)*Math.PI*2*2)*0.15;
      pts.push(new THREE.Vector3(
        center.x + Math.cos(ang)*R,
        y,
        center.z + Math.sin(ang)*R
      ));
    }
    return pts;
  },

  bh6: (count, center, t)=>{
    // B H 6 logo
    const basePts=[];
    const addLine=(x1,z1,x2,z2, steps=12)=>{
      for(let s=0;s<steps;s++){
        const tt=s/(steps-1);
        basePts.push(new THREE.Vector3(x1 + (x2-x1)*tt, 0, z1 + (z2-z1)*tt));
      }
    };
    const addCircle=(cx,cz,r, from=0, to=Math.PI*2, steps=18)=>{
      for(let i=0;i<steps;i++){
        const tt=from + (to-from)*(i/(steps-1));
        basePts.push(new THREE.Vector3(cx+Math.cos(tt)*r,0,cz+Math.sin(tt)*r));
      }
    };
    addLine(-6,-1.5,-6,1.5,14);
    addCircle(-5.2,0.75,0.75, -Math.PI/2, Math.PI/2, 12);
    addCircle(-5.2,-0.75,0.75, -Math.PI/2, Math.PI/2, 12);
    addLine(-1,-1.5,-1,1.5,14);
    addLine(1,-1.5,1,1.5,14);
    addLine(-1,0,1,0,10);
    addCircle(4.5,-0.3,1.0,0,Math.PI*2,24);
    addLine(4.5,0.7,5.5,1.5,10);
    addLine(3.5,1.5,5.5,1.5,12);
    const pts=[];
    for(let i=0;i<count;i++){
      const p=basePts[i % basePts.length];
      pts.push(new THREE.Vector3(center.x + p.x + Math.sin(t*0.001 + i)*0.03, 2.2 + p.y*0.15, center.z + p.z));
    }
    return pts;
  },

  scatter: (count, center, t)=>{
    const pts=[];
    for(let i=0;i<count;i++){
      pts.push(new THREE.Vector3((Math.random()-0.5)*20, Math.random()*10-1, (Math.random()-0.5)*20));
    }
    return pts;
  }
};

export function getFormation(mode, count, center, time){
  const fn = Formations[mode] || Formations.orbit;
  return fn(count, center, time);
}
