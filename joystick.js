export class Joystick {
  constructor(containerEl, options={}){
    this.container = containerEl;
    this.base = containerEl.querySelector('.joystick-base');
    this.stick = containerEl.querySelector('.joystick-stick');
    if(!this.base || !this.stick){
      // create if not exists
      this.base = document.createElement('div');
      this.base.className='joystick-base';
      this.stick = document.createElement('div');
      this.stick.className='joystick-stick';
      this.base.appendChild(this.stick);
      containerEl.appendChild(this.base);
    }
    this.maxRadius = options.maxRadius || 40;
    this.onMove = options.onMove || (()=>{});
    this.onEnd = options.onEnd || (()=>{});
    this.active = false;
    this.value = {x:0,y:0};
    this._touchId = null;
    this._bind();
  }
  _bind(){
    const getPos = (e)=>{
      const t = e.touches ? (e.touches[0] || e.changedTouches[0]) : e;
      return {x: t.clientX, y: t.clientY, id: t.identifier ?? 0};
    };
    const rect = ()=> this.base.getBoundingClientRect();

    const start = (e)=>{
      if(this.active) return;
      const pos = getPos(e);
      const r = rect();
      const cx = r.left + r.width/2;
      const cy = r.top + r.height/2;
      const dx = pos.x - cx;
      const dy = pos.y - cy;
      if(Math.hypot(dx,dy) > r.width) { /* check if touch near base */ }
      // Only activate if touch inside base or container
      const inside = e.currentTarget === this.base || e.currentTarget === this.container || this.container.contains(e.target);
      if(!inside && e.target!==this.base) {
        // allow if touch starts within 120px of center
        if(Math.hypot(dx,dy) > 80) return;
      }
      this.active=true;
      this._touchId = pos.id;
      this.container.classList.add('active');
      if(e.cancelable) e.preventDefault();
      // store center
      this._center = {x: cx, y: cy};
      this._move(e);
    };
    const move = (e)=>{
      if(!this.active) return;
      if(e.touches){
        let found = null;
        for(let i=0;i<e.touches.length;i++){
          if(e.touches[i].identifier===this._touchId){ found=e.touches[i]; break; }
        }
        if(!found && e.touches.length>0) found=e.touches[0];
        if(!found) return;
        e = {touches:[found], clientX:found.clientX, clientY:found.clientY, preventDefault:()=>{}};
      }
      this._move(e);
      if(e.cancelable) e.preventDefault();
    };
    const end = (e)=>{
      if(!this.active) return;
      if(e.changedTouches){
        let isOurTouch=false;
        for(let i=0;i<e.changedTouches.length;i++){
          if(e.changedTouches[i].identifier===this._touchId) isOurTouch=true;
        }
        if(!isOurTouch && e.touches && e.touches.length>0) return;
      }
      this.active=false;
      this._touchId=null;
      this.value={x:0,y:0};
      this.stick.style.transform=`translate(-50%, -50%)`;
      this.container.classList.remove('active');
      this.onMove(this.value);
      this.onEnd();
    };

    this.base.addEventListener('touchstart', start, {passive:false});
    this.base.addEventListener('mousedown', start);
    window.addEventListener('touchmove', move, {passive:false});
    window.addEventListener('mousemove', move);
    window.addEventListener('touchend', end, {passive:false});
    window.addEventListener('mouseup', end);
    window.addEventListener('touchcancel', end);
  }
  _move(e){
    const pos = e.touches ? {x:e.touches[0].clientX, y:e.touches[0].clientY} : {x:e.clientX, y:e.clientY};
    if(!this._center){
      const r=this.base.getBoundingClientRect();
      this._center={x:r.left + r.width/2, y:r.top + r.height/2};
    }
    let dx = pos.x - this._center.x;
    let dy = pos.y - this._center.y;
    const dist = Math.hypot(dx,dy);
    const max = this.maxRadius;
    if(dist>max){
      const ang=Math.atan2(dy,dx);
      dx=Math.cos(ang)*max;
      dy=Math.sin(ang)*max;
    }
    this.stick.style.transform=`translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
    this.value = {x: dx/max, y: dy/max};
    this.onMove(this.value);
  }
}
