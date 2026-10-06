/* PoseForge 2D v0.7 easy full-body region controls + quick pose presets */
(function(){
  'use strict';
  let pickMode=false;
  const regionSelect=$('#easyRegionSelect');
  const amountCtrl=$('#easyBodyAmountCtrl');
  const softnessCtrl=$('#easyBodySoftnessCtrl');

  function ownerFor(layer){return typeof personOwner==='function'?personOwner(layer):(layer?.kind==='character'?layer:state.layers.find(x=>x.id===layer?.ownerId)||layer);}
  function poseFor(layer){return layer?.aiAnalysis?.poses?.[0]||null;}
  function pt(layer,idx){const p=poseFor(layer)?.[idx];return p?{x:p.x*layer.width,y:p.y*layer.height}:null;}
  function avg(...pts){const a=pts.filter(Boolean);if(!a.length)return null;return{x:a.reduce((s,p)=>s+p.x,0)/a.length,y:a.reduce((s,p)=>s+p.y,0)/a.length};}
  function mid(a,b,t=.5){return a&&b?{x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t}:null;}
  function dist(a,b){return a&&b?Math.hypot(a.x-b.x,a.y-b.y):0;}
  function reg(key,cx,cy,rx,ry){return{key,cx,cy,rx:Math.max(12,rx),ry:Math.max(12,ry)};}

  function fallbackRegions(layer){
    const w=layer.width,h=layer.height;
    const R={whole:reg('whole',w*.5,h*.5,w*.55,h*.55)};
    Object.assign(R,{
      head:reg('head',w*.5,h*.115,w*.17,h*.115),neck:reg('neck',w*.5,h*.235,w*.13,h*.075),chest:reg('chest',w*.5,h*.34,w*.28,h*.13),lChest:reg('lChest',w*.39,h*.34,w*.15,h*.115),rChest:reg('rChest',w*.61,h*.34,w*.15,h*.115),abdomen:reg('abdomen',w*.5,h*.49,w*.23,h*.12),waist:reg('waist',w*.5,h*.58,w*.22,h*.09),hips:reg('hips',w*.5,h*.67,w*.28,h*.12),
      lUpperArm:reg('lUpperArm',w*.27,h*.34,w*.12,h*.15),rUpperArm:reg('rUpperArm',w*.73,h*.34,w*.12,h*.15),lForearm:reg('lForearm',w*.20,h*.49,w*.10,h*.15),rForearm:reg('rForearm',w*.80,h*.49,w*.10,h*.15),lHand:reg('lHand',w*.17,h*.61,w*.09,h*.09),rHand:reg('rHand',w*.83,h*.61,w*.09,h*.09),
      lThigh:reg('lThigh',w*.40,h*.78,w*.13,h*.17),rThigh:reg('rThigh',w*.60,h*.78,w*.13,h*.17),lLowerLeg:reg('lLowerLeg',w*.40,h*.91,w*.11,h*.14),rLowerLeg:reg('rLowerLeg',w*.60,h*.91,w*.11,h*.14),lFoot:reg('lFoot',w*.38,h*.985,w*.12,h*.06),rFoot:reg('rFoot',w*.62,h*.985,w*.12,h*.06)
    });return R;
  }

  function bodyRegions(layer){
    const pose=poseFor(layer);if(!pose||pose.length<29)return fallbackRegions(layer);
    const w=layer.width,h=layer.height;
    const ls=pt(layer,11),rs=pt(layer,12),lh=pt(layer,23),rh=pt(layer,24),shoulder=avg(ls,rs),hip=avg(lh,rh),nose=pt(layer,0);
    const shoulderW=Math.max(dist(ls,rs),w*.12),torsoH=Math.max(dist(shoulder,hip),h*.18),limbBase=Math.max(shoulderW*.28,w*.045);
    const headC=avg(nose,pt(layer,7),pt(layer,8),pt(layer,9),pt(layer,10))||{x:w*.5,y:h*.12};
    const R=fallbackRegions(layer);R.whole=reg('whole',w*.5,h*.5,w*.55,h*.55);
    R.head=reg('head',headC.x,headC.y,Math.max(shoulderW*.42,w*.08),Math.max(shoulderW*.48,h*.06));
    const neckC=mid(headC,shoulder,.72);R.neck=reg('neck',neckC.x,neckC.y,shoulderW*.22,torsoH*.12);
    const chestC=mid(shoulder,hip,.28);R.chest=reg('chest',chestC.x,chestC.y,shoulderW*.62,torsoH*.24);
    R.lChest=reg('lChest',chestC.x-shoulderW*.20,chestC.y+torsoH*.01,shoulderW*.31,torsoH*.20);
    R.rChest=reg('rChest',chestC.x+shoulderW*.20,chestC.y+torsoH*.01,shoulderW*.31,torsoH*.20);
    const abdomenC=mid(shoulder,hip,.58);R.abdomen=reg('abdomen',abdomenC.x,abdomenC.y,shoulderW*.48,torsoH*.23);
    const waistC=mid(shoulder,hip,.73);R.waist=reg('waist',waistC.x,waistC.y,shoulderW*.46,torsoH*.16);
    R.hips=reg('hips',hip.x,hip.y,Math.max(dist(lh,rh)*.72,shoulderW*.48),torsoH*.22);
    const makeSeg=(key,a,b,rx=.33,ry=.58)=>{if(!a||!b)return;const c=mid(a,b),len=Math.max(dist(a,b),h*.06);R[key]=reg(key,c.x,c.y,Math.max(limbBase,len*rx),Math.max(limbBase,len*ry));};
    makeSeg('lUpperArm',ls,pt(layer,13));makeSeg('rUpperArm',rs,pt(layer,14));makeSeg('lForearm',pt(layer,13),pt(layer,15));makeSeg('rForearm',pt(layer,14),pt(layer,16));
    const lw=pt(layer,15),rw=pt(layer,16);if(lw)R.lHand=reg('lHand',lw.x,lw.y,limbBase*1.15,limbBase*1.2);if(rw)R.rHand=reg('rHand',rw.x,rw.y,limbBase*1.15,limbBase*1.2);
    makeSeg('lThigh',lh,pt(layer,25),.38,.58);makeSeg('rThigh',rh,pt(layer,26),.38,.58);makeSeg('lLowerLeg',pt(layer,25),pt(layer,27),.32,.6);makeSeg('rLowerLeg',pt(layer,26),pt(layer,28),.32,.6);
    const la=pt(layer,27),ra=pt(layer,28),lf=pt(layer,31)||pt(layer,29),rf=pt(layer,32)||pt(layer,30);if(la)R.lFoot=reg('lFoot',(la.x+(lf?.x||la.x))/2,(la.y+(lf?.y||la.y))/2,limbBase*1.6,limbBase*.9);if(ra)R.rFoot=reg('rFoot',(ra.x+(rf?.x||ra.x))/2,(ra.y+(rf?.y||ra.y))/2,limbBase*1.6,limbBase*.9);
    return R;
  }

  function selectedRegionKey(){return regionSelect?.value||'whole';}
  function currentRegion(layer){return bodyRegions(layer)[selectedRegionKey()]||bodyRegions(layer).whole;}
  function amount(){return Number(amountCtrl?.value||24);}
  function softness(){return Number(softnessCtrl?.value||1.25);}
  function ensureMesh(layer){if(!layer.mesh)createMeshForLayer(layer,9);return layer.mesh;}
  function invalidate(layer){layer.meshRev=(layer.meshRev||0)+1;if(typeof meshRenderCache!=='undefined')meshRenderCache.delete(layer);}
  function weightFor(p,r){const sx=r.rx*softness(),sy=r.ry*softness();const dx=(p.x+p.dx-r.cx)/sx,dy=(p.y+p.dy-r.cy)/sy,d=Math.hypot(dx,dy);if(d>=1)return 0;const t=1-d;return t*t*(3-2*t);}

  function deformRegion(layer,kind,value){
    ensureMesh(layer);const r=currentRegion(layer);if(!r||r.key==='whole')return false;
    const rad=(value||0)*Math.PI/180,cs=Math.cos(rad),sn=Math.sin(rad);
    for(const p of layer.mesh.points){
      const w=weightFor(p,r);if(w<=0)continue;const qx=p.x+p.dx,qy=p.y+p.dy;let tx=qx,ty=qy;
      if(kind==='moveX')tx+=value;if(kind==='moveY')ty+=value;
      if(kind==='scaleX')tx=r.cx+(qx-r.cx)*value;
      if(kind==='scaleY')ty=r.cy+(qy-r.cy)*value;
      if(kind==='rotate'){const x=qx-r.cx,y=qy-r.cy;tx=r.cx+x*cs-y*sn;ty=r.cy+x*sn+y*cs;}
      p.dx=clamp(p.dx+(tx-qx)*w,-layer.width*.46,layer.width*.46);p.dy=clamp(p.dy+(ty-qy)*w,-layer.height*.46,layer.height*.46);
    }
    invalidate(layer);return true;
  }

  function scaleWhole(owner,fx,fy){
    const all=typeof wholePersonLayers==='function'?wholePersonLayers(owner):[owner,...state.layers.filter(x=>x.ownerId===owner.id)];const cx=owner.x,cy=owner.y;
    for(const l of all){if(l!==owner){l.x=cx+(l.x-cx)*fx;l.y=cy+(l.y-cy)*fy;}l.scaleX*=fx;l.scaleY*=fy;}
  }
  function rotateWhole(owner,deg){if(typeof personSnapshot==='function'&&typeof rotateWholePerson==='function'){const snap=personSnapshot(owner);rotateWholePerson(owner,(owner.rotation||0)+deg,snap);}else owner.rotation=(owner.rotation||0)+deg;}
  function commitEdit(label){pushHistory(label);renderUI();draw();autoSave();}
  function applyAction(kind,sign=1){
    const raw=selected(),layer=ownerFor(raw);if(!layer){say(PoseForgeI18n?.lang()==='bn'?'আগে একটি চরিত্র বাছুন।':'Select a character first.',true);return;}
    const key=selectedRegionKey(),a=amount();
    if(key==='whole'){
      if(kind==='moveX')wholePersonMove(layer,sign*a,0);else if(kind==='moveY')wholePersonMove(layer,0,sign*a);
      else if(kind==='scaleX')scaleWhole(layer,sign>0?1+a/300:Math.max(.65,1-a/330),1);
      else if(kind==='scaleY')scaleWhole(layer,1,sign>0?1+a/300:Math.max(.65,1-a/330));
      else if(kind==='rotate')rotateWhole(layer,sign*Math.max(2,a/4));
    }else{
      if(kind==='moveX')deformRegion(layer,'moveX',sign*a);else if(kind==='moveY')deformRegion(layer,'moveY',sign*a);
      else if(kind==='scaleX')deformRegion(layer,'scaleX',sign>0?1+a/260:Math.max(.68,1-a/290));
      else if(kind==='scaleY')deformRegion(layer,'scaleY',sign>0?1+a/260:Math.max(.68,1-a/290));
      else if(kind==='rotate')deformRegion(layer,'rotate',sign*Math.max(2,a/5));
    }
    commitEdit('easy body region');
  }

  const bindings={
    '#bodyUpBtn':()=>applyAction('moveY',-1),'#bodyDownBtn':()=>applyAction('moveY',1),'#bodyLeftBtn':()=>applyAction('moveX',-1),'#bodyRightBtn':()=>applyAction('moveX',1),
    '#bodyWiderBtn':()=>applyAction('scaleX',1),'#bodyNarrowerBtn':()=>applyAction('scaleX',-1),'#bodyTallerBtn':()=>applyAction('scaleY',1),'#bodyShorterBtn':()=>applyAction('scaleY',-1),
    '#bodyRotateLeftBtn':()=>applyAction('rotate',-1),'#bodyRotateRightBtn':()=>applyAction('rotate',1),'#bodyUndoBtn':()=>undo()
  };
  for(const [id,fn] of Object.entries(bindings))$(id)?.addEventListener('click',fn);
  amountCtrl?.addEventListener('input',()=>{$('#easyBodyAmountOut').textContent=amountCtrl.value;});
  softnessCtrl?.addEventListener('input',()=>{$('#easyBodySoftnessOut').textContent=Number(softnessCtrl.value).toFixed(2)+'×';draw();});
  regionSelect?.addEventListener('change',draw);

  function pickNearest(layer,local){const regs=bodyRegions(layer);let best='whole',bestScore=Infinity;for(const [key,r] of Object.entries(regs)){if(key==='whole')continue;const d=Math.hypot((local.x-r.cx)/Math.max(1,r.rx),(local.y-r.cy)/Math.max(1,r.ry));if(d<bestScore){bestScore=d;best=key;}}return bestScore<=1.8?best:'whole';}
  function setPick(on){pickMode=!!on;const b=$('#regionPickBtn');if(b)b.textContent=pickMode?'Stop picking':'Tap body to select';b?.classList.toggle('active-tool',pickMode);draw();PoseForgeI18n?.localizeTree(document.body);}
  $('#regionPickBtn')?.addEventListener('click',()=>setPick(!pickMode));
  canvas.addEventListener('pointerdown',ev=>{if(!pickMode||cutMode||meshEditMode||maskEditMode)return;const raw=selected(),layer=ownerFor(raw);if(!layer)return;ev.preventDefault();ev.stopImmediatePropagation();const local=worldToLocal(layer,screenToCanvas(ev));regionSelect.value=pickNearest(layer,local);draw();},true);

  function drawRegionOverlay(){
    const layer=ownerFor(selected());if(!layer)return;const r=currentRegion(layer);if(!r||r.key==='whole')return;const c=localToWorld(layer,{x:r.cx,y:r.cy});
    const ex=localToWorld(layer,{x:r.cx+r.rx*softness(),y:r.cy}),ey=localToWorld(layer,{x:r.cx,y:r.cy+r.ry*softness()});const rx=Math.hypot(ex.x-c.x,ex.y-c.y),ry=Math.hypot(ey.x-c.x,ey.y-c.y);
    ctx.save();ctx.translate(c.x,c.y);ctx.rotate(layer.rotation*Math.PI/180);ctx.strokeStyle='#7cf3c8';ctx.fillStyle='rgba(124,243,200,.08)';ctx.lineWidth=2.2/zoom;ctx.beginPath();ctx.ellipse(0,0,rx,ry,0,0,Math.PI*2);ctx.fill();ctx.stroke();ctx.restore();
  }
  const drawBeforeV07=draw;draw=function(){drawBeforeV07();if(pickMode||selectedRegionKey()!=='whole')drawRegionOverlay();};

  function moveJoint(layer,index,target,radius){const pose=poseFor(layer),j=pose?.[index];if(!j||!target)return;const old={x:j.x*layer.width,y:j.y*layer.height},dx=target.x-old.x,dy=target.y-old.y;applySoftMeshDelta(layer,old,dx,dy,radius,.85);j.x=clamp(target.x/layer.width,0,1);j.y=clamp(target.y/layer.height,0,1);}
  function applyArmsUp(layer){
    const pose=poseFor(layer);if(!pose||pose.length<17)return false;ensureMesh(layer);layer.mesh.poseBound=true;
    const ls=pt(layer,11),rs=pt(layer,12),le=pt(layer,13),re=pt(layer,14),lw=pt(layer,15),rw=pt(layer,16);if(!ls||!rs||!le||!re||!lw||!rw)return false;
    const arm=Math.max(dist(ls,le)+dist(le,lw),dist(rs,re)+dist(re,rw),layer.height*.18),sep=Math.max(dist(ls,rs)*.22,layer.width*.025),radius=Math.max(35,dist(ls,rs)*.55);
    moveJoint(layer,13,{x:ls.x-sep*.45,y:ls.y-arm*.43},radius);moveJoint(layer,15,{x:ls.x-sep,y:ls.y-arm*.88},radius);
    moveJoint(layer,14,{x:rs.x+sep*.45,y:rs.y-arm*.43},radius);moveJoint(layer,16,{x:rs.x+sep,y:rs.y-arm*.88},radius);
    invalidate(layer);return true;
  }
  function straightenLegs(layer){const pose=poseFor(layer);if(!pose)return;const lh=pt(layer,23),rh=pt(layer,24),lk=pt(layer,25),rk=pt(layer,26),la=pt(layer,27),ra=pt(layer,28);if(!lh||!rh||!lk||!rk||!la||!ra)return;const lenL=dist(lh,lk)+dist(lk,la),lenR=dist(rh,rk)+dist(rk,ra),radius=Math.max(38,dist(lh,rh)*.58);moveJoint(layer,25,{x:lh.x,y:lh.y+lenL*.48},radius);moveJoint(layer,27,{x:lh.x,y:lh.y+lenL*.94},radius);moveJoint(layer,26,{x:rh.x,y:rh.y+lenR*.48},radius);moveJoint(layer,28,{x:rh.x,y:rh.y+lenR*.94},radius);}
  function setOwnerRotation(owner,target){if(typeof personSnapshot==='function'&&typeof rotateWholePerson==='function'){const snap=personSnapshot(owner);rotateWholePerson(owner,target,snap);}else owner.rotation=target;}
  function posePreset(name){
    const layer=ownerFor(selected());if(!layer){say(PoseForgeI18n?.lang()==='bn'?'আগে একটি চরিত্র বাছুন।':'Select a character first.',true);return;}if(!poseFor(layer)){say(PoseForgeI18n?.lang()==='bn'?'নির্ভুল ভঙ্গির জন্য আগে “নির্বাচিত ছবি বিশ্লেষণ” চালান।':'Run Analyze selected first for precise pose presets.',true);return;}
    if(layer.easyPoseBaseRotation==null)layer.easyPoseBaseRotation=Number(layer.rotation||0);
    if(name==='arms'){if(!applyArmsUp(layer))return;setOwnerRotation(layer,layer.easyPoseBaseRotation);}
    if(name==='swim'){if(!applyArmsUp(layer))return;straightenLegs(layer);setOwnerRotation(layer,layer.easyPoseBaseRotation-90);}
    if(name==='relax'){setOwnerRotation(layer,layer.easyPoseBaseRotation);}
    layer.easyPosePreset=name;commitEdit('quick pose preset');
    say(PoseForgeI18n?.lang()==='bn'?'দ্রুত ভঙ্গি প্রয়োগ হয়েছে। বড় পরিবর্তনের পর প্রয়োজনে মাস্ক/মেরামত ব্যবহার করুন।':'Quick pose applied. Large edits may still need masking or repair.');
  }
  $('#poseArmsUpBtn')?.addEventListener('click',()=>posePreset('arms'));$('#poseSwimBtn')?.addEventListener('click',()=>posePreset('swim'));$('#poseRelaxBtn')?.addEventListener('click',()=>posePreset('relax'));

  const renderBeforeV07=renderUI;renderUI=function(){renderBeforeV07();PoseForgeI18n?.localizeTree(document.body);if(amountCtrl)$('#easyBodyAmountOut').textContent=amountCtrl.value;if(softnessCtrl)$('#easyBodySoftnessOut').textContent=Number(softnessCtrl.value).toFixed(2)+'×';};
  const langSel=$('#languageSelect');if(langSel){langSel.value=PoseForgeI18n?.lang?.()||'bn';langSel.addEventListener('change',()=>PoseForgeI18n?.setLanguage(langSel.value));}
  PoseForgeI18n?.localizeTree(document.body);
  window.PoseForgeBodyRegions={bodyRegions,deformRegion,applyAction,posePreset,setPick};
})();