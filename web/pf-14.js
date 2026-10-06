/* PoseForge 2D v0.8 direct full-body soft-region editing */
(function(){
  'use strict';
  const regionSelect=$('#easyRegionSelect');
  const amountCtrl=$('#easyBodyAmountCtrl');
  let directDrag=false;
  let gesture=null;

  function lang(){return window.PoseForgeI18n?.lang?.()||'bn';}
  function msg(bn,en){return lang()==='bn'?bn:en;}
  function ownerFor(layer){return typeof personOwner==='function'?personOwner(layer):(layer?.kind==='character'?layer:state.layers.find(x=>x.id===layer?.ownerId)||layer);}
  function key(){return regionSelect?.value||'whole';}
  function amount(){return Number(amountCtrl?.value||24);}
  function commit(label){pushHistory(label);renderUI();draw();autoSave();}
  function applyLocal(kind,value){
    const layer=ownerFor(selected());
    if(!layer){say(msg('আগে একটি চরিত্র বাছুন।','Select a character first.'),true);return false;}
    if(key()==='whole'){
      if(kind==='scaleBoth' && typeof scalePersonTo==='function'){
        const cur=typeof currentPersonScale==='function'?currentPersonScale(layer):1;
        scalePersonTo(layer,clamp(cur*value,.05,8)); return true;
      }
      return false;
    }
    if(kind==='scaleBoth'){
      PoseForgeBodyRegions.deformRegion(layer,'scaleX',value);
      PoseForgeBodyRegions.deformRegion(layer,'scaleY',value);
      return true;
    }
    return PoseForgeBodyRegions.deformRegion(layer,kind,value);
  }

  function scaleSelected(sign){
    const a=amount();
    const f=sign>0?1+a/240:Math.max(.58,1-a/270);
    if(applyLocal('scaleBoth',f)){
      commit('v0.8 region size');
      say(msg('নির্বাচিত অংশের আকার বদলানো হয়েছে।','Selected region resized.'));
    }
  }
  $('#bodyBiggerBtn')?.addEventListener('click',()=>scaleSelected(1));
  $('#bodySmallerBtn')?.addEventListener('click',()=>scaleSelected(-1));

  function setDirect(on){
    directDrag=!!on;
    const b=$('#bodyDirectDragBtn');
    if(b){
      b.classList.toggle('active-tool',directDrag);
      b.textContent=directDrag?msg('সফট ড্র্যাগ বন্ধ','Stop soft drag'):msg('অংশ ধরে সফট ড্র্যাগ','Soft drag region');
    }
    const ts=$('#toolStatus');
    if(ts && directDrag) ts.textContent=msg('Soft Drag: অংশ বাছুন, তারপর শরীরের ওই অংশ টানুন','Soft Drag: choose a region, then drag that body area');
    draw();
  }
  $('#bodyDirectDragBtn')?.addEventListener('click',()=>setDirect(!directDrag));

  function pointerLocal(ev,layer){return worldToLocal(layer,screenToCanvas(ev));}
  canvas.addEventListener('pointerdown',ev=>{
    if(!directDrag||cutMode||meshEditMode||maskEditMode||key()==='whole')return;
    const layer=ownerFor(selected());if(!layer)return;
    const p=pointerLocal(ev,layer);
    const regs=PoseForgeBodyRegions.bodyRegions(layer),r=regs[key()];
    if(!r)return;
    const d=Math.hypot((p.x-r.cx)/Math.max(1,r.rx*1.55),(p.y-r.cy)/Math.max(1,r.ry*1.55));
    if(d>1.35)return;
    ev.preventDefault();ev.stopImmediatePropagation();
    gesture={layerId:layer.id,last:p,moved:false};
    canvas.setPointerCapture?.(ev.pointerId);
  },true);
  canvas.addEventListener('pointermove',ev=>{
    if(!gesture)return;
    const layer=state.layers.find(x=>x.id===gesture.layerId);if(!layer)return;
    ev.preventDefault();ev.stopImmediatePropagation();
    const p=pointerLocal(ev,layer),dx=p.x-gesture.last.x,dy=p.y-gesture.last.y;
    if(Math.abs(dx)+Math.abs(dy)>.05){
      PoseForgeBodyRegions.deformRegion(layer,'moveX',dx);
      PoseForgeBodyRegions.deformRegion(layer,'moveY',dy);
      gesture.last=p;gesture.moved=true;draw();
    }
  },true);
  function endDrag(ev){
    if(!gesture)return;
    ev?.preventDefault?.();ev?.stopImmediatePropagation?.();
    const moved=gesture.moved;gesture=null;
    if(moved){commit('v0.8 soft drag');say(msg('অংশটি সফটভাবে টেনে নতুন জায়গায় নেওয়া হয়েছে।','Region soft-dragged into place.'));}
  }
  canvas.addEventListener('pointerup',endDrag,true);
  canvas.addEventListener('pointercancel',endDrag,true);

  function pose(layer){return layer?.aiAnalysis?.poses?.[0]||null;}
  function pt(layer,i){const p=pose(layer)?.[i];return p?{x:p.x*layer.width,y:p.y*layer.height}:null;}
  function dist(a,b){return a&&b?Math.hypot(a.x-b.x,a.y-b.y):0;}
  function ensure(layer){if(!layer.mesh)createMeshForLayer(layer,9);layer.mesh.poseBound=true;}
  function moveJoint(layer,index,target,radius){
    const p=pose(layer)?.[index];if(!p||!target)return;
    const old={x:p.x*layer.width,y:p.y*layer.height},dx=target.x-old.x,dy=target.y-old.y;
    applySoftMeshDelta(layer,old,dx,dy,radius,.88);
    p.x=clamp(target.x/layer.width,0,1);p.y=clamp(target.y/layer.height,0,1);
    layer.meshRev=(layer.meshRev||0)+1;
    if(typeof meshRenderCache!=='undefined')meshRenderCache.delete(layer);
  }
  function handsFront(){
    const layer=ownerFor(selected());
    if(!layer){say(msg('আগে একটি চরিত্র বাছুন।','Select a character first.'),true);return;}
    if(!pose(layer)){say(msg('আগে “নির্বাচিত ছবি বিশ্লেষণ” চালান।','Run Analyze selected first.'),true);return;}
    ensure(layer);
    const ls=pt(layer,11),rs=pt(layer,12),le=pt(layer,13),re=pt(layer,14),lw=pt(layer,15),rw=pt(layer,16);
    const lh=pt(layer,23),rh=pt(layer,24);
    if(!ls||!rs||!le||!re||!lw||!rw||!lh||!rh)return;
    const shoulderY=(ls.y+rs.y)/2,hipY=(lh.y+rh.y)/2;
    const chest={x:(ls.x+rs.x)/2,y:shoulderY+(hipY-shoulderY)*.30};
    const sw=Math.max(dist(ls,rs),layer.width*.12),arm=Math.max(dist(ls,le)+dist(le,lw),dist(rs,re)+dist(re,rw));
    const radius=Math.max(38,sw*.58);
    moveJoint(layer,13,{x:chest.x-sw*.33,y:chest.y+arm*.02},radius);
    moveJoint(layer,15,{x:chest.x-sw*.12,y:chest.y+arm*.10},radius);
    moveJoint(layer,14,{x:chest.x+sw*.33,y:chest.y+arm*.02},radius);
    moveJoint(layer,16,{x:chest.x+sw*.12,y:chest.y+arm*.10},radius);
    commit('v0.8 hands front pose');
    say(msg('হাত সামনে আনার ভঙ্গি প্রয়োগ হয়েছে। প্রয়োজন হলে সফট ড্র্যাগ দিয়ে সূক্ষ্মভাবে ঠিক করুন।','Hands-front pose applied. Fine-tune with Soft Drag if needed.'));
  }
  $('#poseHandsFrontBtn')?.addEventListener('click',handsFront);

  window.addEventListener('poseforge-language',()=>setDirect(directDrag));
  window.PoseForgeBodyV08={setDirectDrag:setDirect,handsFront,scaleSelected};
})();