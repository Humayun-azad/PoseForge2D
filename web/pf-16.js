/* PoseForge 2D v0.10 natural soft-body force gestures + smart limb/finger IK */
(function(){
  'use strict';

  let forceMode=false, forceGesture=null, smartJointMode=false, jointGesture=null;
  const profileCache=new WeakMap();

  const $mode=()=>$('#softBodyMode');
  const $force=()=>$('#softBodyForceCtrl');
  const lang=()=>window.PoseForgeI18n?.lang?.()||'bn';
  const msg=(bn,en)=>lang()==='bn'?bn:en;

  function ownerFor(layer){
    return typeof personOwner==='function'?personOwner(layer):(layer?.kind==='character'?layer:state.layers.find(x=>x.id===layer?.ownerId)||layer);
  }
  function pose(layer){return layer?.aiAnalysis?.poses?.[0]||null;}
  function posePt(layer,i){const p=pose(layer)?.[i];return p?{x:p.x*layer.width,y:p.y*layer.height}:null;}
  function ensureMesh(layer){
    if(!layer.mesh)createMeshForLayer(layer,9);
    layer.mesh.poseBound=!!pose(layer);
    if(layer.aiAnalysis?.hands?.length)layer.mesh.handBound=true;
    return layer.mesh;
  }
  function invalidate(layer){
    layer.meshRev=(layer.meshRev||0)+1;
    if(typeof meshRenderCache!=='undefined')meshRenderCache.delete(layer);
  }
  function commit(label){pushHistory(label);renderUI();draw();autoSave();}
  function distance(a,b){return Math.hypot(a.x-b.x,a.y-b.y);}
  function regionKey(){return $('#easyRegionSelect')?.value||'whole';}

  function defaultRegion(layer,key){
    return window.PoseForgeBodyRegions?.bodyRegions?.(layer)?.[key]||null;
  }

  /* Alpha/silhouette sampling captures an original local profile once.
     It makes the force radius follow the imported character instead of one universal preset. */
  function profileFor(layer,key){
    let layerMap=profileCache.get(layer);
    if(!layerMap){layerMap=new Map();profileCache.set(layer,layerMap);}
    if(layerMap.has(key))return layerMap.get(key);
    const r=defaultRegion(layer,key);if(!r)return null;
    let out={...r,source:'landmark'};
    try{
      const pad=1.18,x0=Math.max(0,Math.floor(r.cx-r.rx*pad)),y0=Math.max(0,Math.floor(r.cy-r.ry*pad));
      const x1=Math.min(layer.width,Math.ceil(r.cx+r.rx*pad)),y1=Math.min(layer.height,Math.ceil(r.cy+r.ry*pad));
      const sw=Math.max(2,x1-x0),sh=Math.max(2,y1-y0),maxSide=128,s=Math.min(1,maxSide/Math.max(sw,sh));
      const cw=Math.max(2,Math.round(sw*s)),ch=Math.max(2,Math.round(sh*s));
      const c=document.createElement('canvas');c.width=cw;c.height=ch;const g=c.getContext('2d',{willReadFrequently:true});
      g.drawImage(layer.image,x0,y0,sw,sh,0,0,cw,ch);
      const d=g.getImageData(0,0,cw,ch).data;
      let n=0,sx=0,sy=0,sxx=0,syy=0;
      for(let y=0;y<ch;y++)for(let x=0;x<cw;x++){
        const a=d[(y*cw+x)*4+3];if(a<56)continue;
        const lx=x0+(x+.5)/cw*sw,ly=y0+(y+.5)/ch*sh;
        const ex=(lx-r.cx)/Math.max(1,r.rx*1.12),ey=(ly-r.cy)/Math.max(1,r.ry*1.12);
        if(ex*ex+ey*ey>1)continue;
        const w=a/255;n+=w;sx+=lx*w;sy+=ly*w;sxx+=lx*lx*w;syy+=ly*ly*w;
      }
      const occupancy=n/(cw*ch);
      if(n>24&&occupancy<.88){
        const cx=sx/n,cy=sy/n,vx=Math.max(1,sxx/n-cx*cx),vy=Math.max(1,syy/n-cy*cy);
        const rx=clamp(Math.sqrt(vx)*2.15,r.rx*.62,r.rx*1.18),ry=clamp(Math.sqrt(vy)*2.15,r.ry*.62,r.ry*1.18);
        out={key:r.key,cx:clamp(cx,r.cx-r.rx*.22,r.cx+r.rx*.22),cy:clamp(cy,r.cy-r.ry*.22,r.cy+r.ry*.22),rx,ry,source:'silhouette',occupancy};
      }
    }catch(e){}
    layerMap.set(key,out);return out;
  }

  function weightForPoint(p,r,softness=1.15){
    const qx=p.x+p.dx,qy=p.y+p.dy;
    const dx=(qx-r.cx)/Math.max(2,r.rx*softness),dy=(qy-r.cy)/Math.max(2,r.ry*softness);
    const d=Math.hypot(dx,dy);if(d>=1)return 0;
    const t=1-d;return t*t*(3-2*t);
  }

  function applyMatrixForce(layer,r,m11,m12,m21,m22,tx=0,ty=0,strength=1){
    ensureMesh(layer);
    const softness=Number($('#easyBodySoftnessCtrl')?.value||1.25);
    for(const p of layer.mesh.points){
      const w=weightForPoint(p,r,softness)*strength;if(w<=0)continue;
      const qx=p.x+p.dx,qy=p.y+p.dy,x=qx-r.cx,y=qy-r.cy;
      const nx=r.cx+m11*x+m12*y+tx,ny=r.cy+m21*x+m22*y+ty;
      p.dx=clamp(p.dx+(nx-qx)*w,-layer.width*.46,layer.width*.46);
      p.dy=clamp(p.dy+(ny-qy)*w,-layer.height*.46,layer.height*.46);
    }
    invalidate(layer);
  }

  function applyMoveForce(layer,r,dx,dy,strength=1){
    applyMatrixForce(layer,r,1,0,0,1,dx,dy,strength);
  }

  function applyDirectionalAreaLock(layer,r,dx,dy,mode){
    const mag=Math.hypot(dx,dy);if(mag<.01)return;
    const ux=dx/mag,uy=dy/mag,vx=-uy,vy=ux,base=Math.max(12,(r.rx+r.ry)*.5);
    const fctrl=Number($force()?.value||55)/100;
    let along=1,translate=.45;
    if(mode==='pull'){along=clamp(1+mag/base*.19*fctrl,1,1.22);translate=.58;}
    else if(mode==='push'){along=clamp(1-mag/base*.18*fctrl,.78,1);translate=.22;}
    const across=1/along;
    const m11=along*ux*ux+across*vx*vx,m12=along*ux*uy+across*vx*vy;
    const m21=along*uy*ux+across*vy*vx,m22=along*uy*uy+across*vy*vy;
    applyMatrixForce(layer,r,m11,m12,m21,m22,dx*translate,dy*translate,.86);
  }

  function applyBendForce(layer,r,dx,dy){
    const mag=Math.hypot(dx,dy);if(mag<.01)return;
    const ux=dx/mag,uy=dy/mag,vx=-uy,vy=ux,base=Math.max(12,(r.rx+r.ry)*.5);
    const k=clamp(mag/base*.20*(Number($force()?.value||55)/100),0,.24);
    /* shear in the gesture basis, determinant stays 1 */
    const a11=1,a12=k,a21=0,a22=1;
    const m11=ux*(a11*ux+a12*vx)+vx*(a21*ux+a22*vx);
    const m12=ux*(a11*uy+a12*vy)+vx*(a21*uy+a22*vy);
    const m21=uy*(a11*ux+a12*vx)+vy*(a21*ux+a22*vx);
    const m22=uy*(a11*uy+a12*vy)+vy*(a21*uy+a22*vy);
    applyMatrixForce(layer,r,m11,m12,m21,m22,dx*.18,dy*.18,.82);
  }

  function applyTwistForce(layer,r,last,current){
    const ax=last.x-r.cx,ay=last.y-r.cy,bx=current.x-r.cx,by=current.y-r.cy;
    if(Math.hypot(ax,ay)<4||Math.hypot(bx,by)<4)return;
    let da=Math.atan2(by,bx)-Math.atan2(ay,ax);
    while(da>Math.PI)da-=Math.PI*2;while(da<-Math.PI)da+=Math.PI*2;
    da=clamp(da,-.18,.18)*(Number($force()?.value||55)/100);
    const cs=Math.cos(da),sn=Math.sin(da);
    applyMatrixForce(layer,r,cs,-sn,sn,cs,0,0,.9);
  }

  function setForceMode(on){
    forceMode=!!on;
    if(forceMode){
      window.PoseForgeBodyV08?.setDirectDrag?.(false);
      if(typeof setMeshMode==='function')setMeshMode(false);
      if(typeof setMaskMode==='function')setMaskMode(false);
      smartJointMode=false;$('#smartJointBtn')?.classList.remove('active-tool');
    }
    $('#softBodyGestureBtn')?.classList.toggle('active-tool',forceMode);
    if($('#softBodyGestureBtn'))$('#softBodyGestureBtn').textContent=forceMode?msg('সফট বডি বন্ধ','Stop soft body gesture'):msg('সফট বডি জেসচার','Soft body gesture');
    if(forceMode)$('#toolStatus').textContent=msg('শরীরের অংশ বাছুন, তারপর তার উপর টেনে force দিন','Choose a body region, then drag on it to apply force');
    draw();
  }
  $('#softBodyGestureBtn')?.addEventListener('click',()=>setForceMode(!forceMode));
  $force()?.addEventListener('input',()=>{if($('#softBodyForceOut'))$('#softBodyForceOut').textContent=$force().value+'%';});

  canvas.addEventListener('pointerdown',ev=>{
    if(!forceMode||cutMode||meshEditMode||maskEditMode||regionKey()==='whole')return;
    const layer=ownerFor(selected());if(!layer)return;
    const r=profileFor(layer,regionKey());if(!r)return;
    const local=worldToLocal(layer,screenToCanvas(ev));
    const d=Math.hypot((local.x-r.cx)/Math.max(2,r.rx*1.45),(local.y-r.cy)/Math.max(2,r.ry*1.45));
    if(d>1.3)return;
    ev.preventDefault();ev.stopImmediatePropagation();ensureMesh(layer);
    forceGesture={layerId:layer.id,last:local,regionKey:regionKey(),moved:false};
    canvas.setPointerCapture?.(ev.pointerId);
  },true);

  canvas.addEventListener('pointermove',ev=>{
    if(!forceGesture)return;
    const layer=state.layers.find(x=>x.id===forceGesture.layerId);if(!layer)return;
    ev.preventDefault();ev.stopImmediatePropagation();
    const current=worldToLocal(layer,screenToCanvas(ev)),dx=current.x-forceGesture.last.x,dy=current.y-forceGesture.last.y;
    if(Math.abs(dx)+Math.abs(dy)<.03)return;
    const r=profileFor(layer,forceGesture.regionKey)||defaultRegion(layer,forceGesture.regionKey),mode=$mode()?.value||'move';
    if(mode==='move')applyMoveForce(layer,r,dx,dy,.92);
    else if(mode==='pull'||mode==='push')applyDirectionalAreaLock(layer,r,dx,dy,mode);
    else if(mode==='bend')applyBendForce(layer,r,dx,dy);
    else if(mode==='twist')applyTwistForce(layer,r,forceGesture.last,current);
    forceGesture.last=current;forceGesture.moved=true;draw();
  },true);

  function finishForce(ev){
    if(!forceGesture)return;
    ev?.preventDefault?.();ev?.stopImmediatePropagation?.();
    const moved=forceGesture.moved;forceGesture=null;
    if(moved){commit('v0.10 soft body force');say(msg('মূল আকার ধরে সফট-বডি পরিবর্তন প্রয়োগ হয়েছে।','Soft-body edit applied with local size lock.'));}
  }
  canvas.addEventListener('pointerup',finishForce,true);
  canvas.addEventListener('pointercancel',finishForce,true);

  function smoothMesh(layer,iterations=2){
    if(!layer?.mesh?.points?.length)return false;
    const m=layer.mesh;
    for(let iter=0;iter<iterations;iter++){
      const next=m.points.map(p=>({dx:p.dx,dy:p.dy}));
      for(let y=0;y<m.rows;y++)for(let x=0;x<m.cols;x++){
        const i=y*m.cols+x,p=m.points[i],n=[];
        if(x>0)n.push(m.points[i-1]);if(x<m.cols-1)n.push(m.points[i+1]);
        if(y>0)n.push(m.points[i-m.cols]);if(y<m.rows-1)n.push(m.points[i+m.cols]);
        if(!n.length)continue;
        const adx=n.reduce((s,q)=>s+q.dx,0)/n.length,ady=n.reduce((s,q)=>s+q.dy,0)/n.length;
        const edge=(x===0||y===0||x===m.cols-1||y===m.rows-1),blend=edge?.16:.38;
        next[i].dx=p.dx*(1-blend)+adx*blend;next[i].dy=p.dy*(1-blend)+ady*blend;
      }
      for(let i=0;i<m.points.length;i++){m.points[i].dx=next[i].dx;m.points[i].dy=next[i].dy;}
    }
    invalidate(layer);return true;
  }
  $('#meshSmoothBtn')?.addEventListener('click',()=>{
    const layer=ownerFor(selected());if(!layer?.mesh){say(msg('আগে শরীরের অংশ নড়ান বা Mesh তৈরি করুন।','Create or deform a mesh first.'),true);return;}
    if(smoothMesh(layer,3)){commit('smooth soft mesh');say(msg('কঠিন ভাঁজগুলো নরম করা হয়েছে।','Harsh mesh folds were smoothed.'));}
  });

  function cross(a,b,c){return (b.x-a.x)*(c.y-a.y)-(b.y-a.y)*(c.x-a.x);}
  function solveTwoBone(root,mid,end,target,l1,l2,bendSign){
    const vx=target.x-root.x,vy=target.y-root.y,raw=Math.hypot(vx,vy)||.001;
    const d=clamp(raw,Math.abs(l1-l2)+.001,l1+l2-.001),base=Math.atan2(vy,vx);
    const ca=clamp((l1*l1+d*d-l2*l2)/(2*l1*d),-1,1),a=Math.acos(ca);
    const ang=base+(bendSign||1)*a,newMid={x:root.x+Math.cos(ang)*l1,y:root.y+Math.sin(ang)*l1};
    const ratio=d/raw,newEnd={x:root.x+vx*ratio,y:root.y+vy*ratio};
    return{mid:newMid,end:newEnd};
  }
  function setPosePoint(layer,index,p){
    const q=pose(layer)?.[index];if(!q)return;
    q.x=clamp(p.x/layer.width,0,1);q.y=clamp(p.y/layer.height,0,1);
  }
  function translateNearestHand(layer,oldWrist,newWrist){
    const hands=layer.aiAnalysis?.hands||[];if(!hands.length)return;
    let best=null,bestD=Infinity;
    for(let h=0;h<hands.length;h++){
      const w=hands[h]?.landmarks?.[0];if(!w)continue;
      const p={x:w.x*layer.width,y:w.y*layer.height},d=distance(p,oldWrist);
      if(d<bestD){best={h,p};bestD=d;}
    }
    if(!best||bestD>Math.max(layer.width,layer.height)*.18)return;
    const dx=newWrist.x-oldWrist.x,dy=newWrist.y-oldWrist.y;
    for(const q of hands[best.h].landmarks||[]){q.x=clamp((q.x*layer.width+dx)/layer.width,0,1);q.y=clamp((q.y*layer.height+dy)/layer.height,0,1);}
  }
  function moveLimbIK(layer,g,target){
    const root=posePt(layer,g.root),mid=posePt(layer,g.mid),end=posePt(layer,g.end);if(!root||!mid||!end)return;
    const solved=solveTwoBone(root,mid,end,target,g.l1,g.l2,g.sign);
    const oldMid=mid,oldEnd=end,rad=Math.max(28,(g.l1+g.l2)*.36);
    applySoftMeshDelta(layer,oldMid,solved.mid.x-oldMid.x,solved.mid.y-oldMid.y,rad,.82);
    applySoftMeshDelta(layer,oldEnd,solved.end.x-oldEnd.x,solved.end.y-oldEnd.y,rad*.88,.92);
    setPosePoint(layer,g.mid,solved.mid);setPosePoint(layer,g.end,solved.end);
    if(g.end===15||g.end===16)translateNearestHand(layer,oldEnd,solved.end);
    if(g.end===27){for(const i of [29,31]){const p=posePt(layer,i);if(p)setPosePoint(layer,i,{x:p.x+solved.end.x-oldEnd.x,y:p.y+solved.end.y-oldEnd.y});}}
    if(g.end===28){for(const i of [30,32]){const p=posePt(layer,i);if(p)setPosePoint(layer,i,{x:p.x+solved.end.x-oldEnd.x,y:p.y+solved.end.y-oldEnd.y});}}
    invalidate(layer);
  }

  const fingerChains={4:[0,1,2,3,4],8:[0,5,6,7,8],12:[0,9,10,11,12],16:[0,13,14,15,16],20:[0,17,18,19,20]};
  function handPoint(layer,handIndex,index){
    const p=layer.aiAnalysis?.hands?.[handIndex]?.landmarks?.[index];return p?{x:p.x*layer.width,y:p.y*layer.height}:null;
  }
  function solveFabrik(points,lengths,target){
    const pts=points.map(p=>({...p})),base={...pts[0]},total=lengths.reduce((s,x)=>s+x,0);
    if(distance(base,target)>=total){
      const a=Math.atan2(target.y-base.y,target.x-base.x);
      for(let i=1;i<pts.length;i++)pts[i]={x:pts[i-1].x+Math.cos(a)*lengths[i-1],y:pts[i-1].y+Math.sin(a)*lengths[i-1]};
      return pts;
    }
    for(let iter=0;iter<5;iter++){
      pts[pts.length-1]={...target};
      for(let i=pts.length-2;i>=0;i--){const d=Math.max(.001,distance(pts[i],pts[i+1])),r=lengths[i]/d;pts[i]={x:pts[i+1].x+(pts[i].x-pts[i+1].x)*r,y:pts[i+1].y+(pts[i].y-pts[i+1].y)*r};}
      pts[0]={...base};
      for(let i=0;i<pts.length-1;i++){const d=Math.max(.001,distance(pts[i],pts[i+1])),r=lengths[i]/d;pts[i+1]={x:pts[i].x+(pts[i+1].x-pts[i].x)*r,y:pts[i].y+(pts[i+1].y-pts[i].y)*r};}
    }
    return pts;
  }
  function moveFingerIK(layer,g,target){
    const landmarks=layer.aiAnalysis?.hands?.[g.hand]?.landmarks;if(!landmarks)return;
    const old=g.chain.map(i=>handPoint(layer,g.hand,i));if(old.some(x=>!x))return;
    const solved=solveFabrik(old,g.lengths,target),rad=Math.max(18,Math.min(layer.width,layer.height)*.055);
    for(let k=1;k<g.chain.length;k++){
      const idx=g.chain[k],before=old[k],after=solved[k];
      applySoftMeshDelta(layer,before,after.x-before.x,after.y-before.y,rad,.62);
      landmarks[idx].x=clamp(after.x/layer.width,0,1);landmarks[idx].y=clamp(after.y/layer.height,0,1);
    }
    invalidate(layer);
  }

  function nearestSmartHandle(layer,local){
    const P=pose(layer),scale=Math.max(.1,Math.abs(layer.scaleX||1)),max=38/scale;let best=null,bestD=max;
    if(P){
      for(const spec of [{root:11,mid:13,end:15,name:'left arm'},{root:12,mid:14,end:16,name:'right arm'},{root:23,mid:25,end:27,name:'left leg'},{root:24,mid:26,end:28,name:'right leg'}]){
        const e=posePt(layer,spec.end),m=posePt(layer,spec.mid),r=posePt(layer,spec.root);if(!e||!m||!r)continue;
        const d=distance(local,e);if(d<bestD){bestD=d;best={type:'limb',...spec,l1:distance(r,m),l2:distance(m,e),sign:cross(r,e,m)>=0?1:-1};}
      }
    }
    const hands=layer.aiAnalysis?.hands||[];
    for(let h=0;h<hands.length;h++)for(const tip of [4,8,12,16,20]){
      const p=handPoint(layer,h,tip);if(!p)continue;const d=distance(local,p);
      if(d<bestD){const chain=fingerChains[tip],pts=chain.map(i=>handPoint(layer,h,i));if(pts.some(x=>!x))continue;bestD=d;best={type:'finger',hand:h,tip,chain,lengths:pts.slice(0,-1).map((p,i)=>distance(p,pts[i+1]))};}
    }
    return best;
  }

  function setSmartJointMode(on){
    smartJointMode=!!on;
    if(smartJointMode){
      setForceMode(false);window.PoseForgeBodyV08?.setDirectDrag?.(false);
      if(typeof setMeshMode==='function')setMeshMode(false);if(typeof setMaskMode==='function')setMaskMode(false);
    }
    $('#smartJointBtn')?.classList.toggle('active-tool',smartJointMode);
    if($('#smartJointBtn'))$('#smartJointBtn').textContent=smartJointMode?msg('স্মার্ট জয়েন্ট বন্ধ','Stop smart joints'):msg('স্মার্ট জয়েন্ট ড্র্যাগ','Smart joint drag');
    if(smartJointMode)$('#toolStatus').textContent=msg('কবজি/গোড়ালি/আঙুলের ডগা টানুন, সংযুক্ত জয়েন্ট নিজে থেকে বাঁকবে','Drag a wrist, ankle, or fingertip; connected joints solve automatically');
    draw();
  }
  $('#smartJointBtn')?.addEventListener('click',()=>{
    const layer=ownerFor(selected());
    if(!smartJointMode&&(!layer?.aiAnalysis?.poses?.[0]&&!layer?.aiAnalysis?.hands?.length)){say(msg('আগে নির্বাচিত ছবি Analyze করুন।','Analyze the selected character first.'),true);return;}
    setSmartJointMode(!smartJointMode);
  });

  canvas.addEventListener('pointerdown',ev=>{
    if(!smartJointMode||cutMode||meshEditMode||maskEditMode)return;
    const layer=ownerFor(selected());if(!layer)return;ensureMesh(layer);
    const local=worldToLocal(layer,screenToCanvas(ev)),h=nearestSmartHandle(layer,local);if(!h)return;
    ev.preventDefault();ev.stopImmediatePropagation();jointGesture={layerId:layer.id,...h,moved:false};
    canvas.setPointerCapture?.(ev.pointerId);
  },true);
  canvas.addEventListener('pointermove',ev=>{
    if(!jointGesture)return;
    const layer=state.layers.find(x=>x.id===jointGesture.layerId);if(!layer)return;
    ev.preventDefault();ev.stopImmediatePropagation();const local=worldToLocal(layer,screenToCanvas(ev));
    if(jointGesture.type==='limb')moveLimbIK(layer,jointGesture,local);else moveFingerIK(layer,jointGesture,local);
    jointGesture.moved=true;draw();
  },true);
  function finishJoint(ev){
    if(!jointGesture)return;ev?.preventDefault?.();ev?.stopImmediatePropagation?.();
    const moved=jointGesture.moved;jointGesture=null;
    if(moved){commit('v0.10 smart IK');say(msg('হাড়ের দৈর্ঘ্য ধরে স্মার্ট জয়েন্ট পোজ প্রয়োগ হয়েছে।','Smart joint pose applied while preserving limb segment lengths.'));}
  }
  canvas.addEventListener('pointerup',finishJoint,true);
  canvas.addEventListener('pointercancel',finishJoint,true);

  function drawSmartOverlay(){
    if(!smartJointMode)return;const layer=ownerFor(selected());if(!layer)return;
    ctx.save();ctx.lineWidth=2/zoom;
    const P=pose(layer);
    if(P){
      for(const i of [15,16,27,28]){const p=posePt(layer,i);if(!p)continue;const w=localToWorld(layer,p);ctx.beginPath();ctx.fillStyle='#8be9fd';ctx.strokeStyle='#101114';ctx.arc(w.x,w.y,8/zoom,0,Math.PI*2);ctx.fill();ctx.stroke();}
    }
    const hands=layer.aiAnalysis?.hands||[];
    for(let h=0;h<hands.length;h++)for(const i of [4,8,12,16,20]){const p=handPoint(layer,h,i);if(!p)continue;const w=localToWorld(layer,p);ctx.beginPath();ctx.fillStyle='#ffb86c';ctx.strokeStyle='#101114';ctx.arc(w.x,w.y,6.5/zoom,0,Math.PI*2);ctx.fill();ctx.stroke();}
    ctx.restore();
  }
  const drawBeforeV010=draw;
  draw=function(){drawBeforeV010();drawSmartOverlay();};

  const renderBeforeV010=renderUI;
  renderUI=function(){
    renderBeforeV010();
    if($('#softBodyForceOut'))$('#softBodyForceOut').textContent=Number($force()?.value||55)+'%';
    $('#softBodyGestureBtn')?.classList.toggle('active-tool',forceMode);
    $('#smartJointBtn')?.classList.toggle('active-tool',smartJointMode);
    window.PoseForgeI18n?.localizeTree?.(document.body);
  };
  window.addEventListener('poseforge-language',()=>{setForceMode(forceMode);setSmartJointMode(smartJointMode);});

  window.PoseForgeV010={setForceMode,setSmartJointMode,smoothMesh,profileFor,applyDirectionalAreaLock};
})();