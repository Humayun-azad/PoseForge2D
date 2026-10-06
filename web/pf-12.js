/* PoseForge 2D v0.6 precision masking, face expressions and contact anchors */
let maskEditMode=false;
let maskBrushMode='hide';
let maskStroke=null;
const maskRenderCache=new WeakMap();

function ensureMaskOps(layer){if(!Array.isArray(layer.maskOps))layer.maskOps=[];return layer.maskOps;}
function invalidateLayerPixels(layer){
  layer.maskRev=(layer.maskRev||0)+1;
  layer.meshRev=(layer.meshRev||0)+1;
  maskRenderCache.delete(layer);
  if(typeof meshRenderCache!=='undefined')meshRenderCache.delete(layer);
}
function buildLayerMask(layer){
  const sig=(layer.maskRev||0)+'|'+(layer.maskOps?.length||0);
  const cached=maskRenderCache.get(layer);if(cached?.sig===sig)return cached.canvas;
  const m=document.createElement('canvas');m.width=layer.width;m.height=layer.height;const g=m.getContext('2d');
  g.fillStyle='#fff';g.fillRect(0,0,m.width,m.height);
  for(const stroke of (layer.maskOps||[])){
    const pts=stroke.points||[];if(!pts.length)continue;
    g.save();g.lineCap='round';g.lineJoin='round';g.lineWidth=Math.max(1,stroke.size||40);
    g.globalCompositeOperation=stroke.mode==='reveal'?'source-over':'destination-out';
    g.strokeStyle='#fff';g.fillStyle='#fff';
    if(pts.length===1){g.beginPath();g.arc(pts[0].x,pts[0].y,g.lineWidth/2,0,Math.PI*2);g.fill();}
    else{g.beginPath();g.moveTo(pts[0].x,pts[0].y);for(let i=1;i<pts.length;i++)g.lineTo(pts[i].x,pts[i].y);g.stroke();}
    g.restore();
  }
  maskRenderCache.set(layer,{sig,canvas:m});return m;
}
const litBeforeMask=litLayerImage;
litLayerImage=function(layer){
  const base=litBeforeMask(layer);if(!layer?.maskOps?.length)return base;
  const sig=[layer.maskRev||0,layer.src,layer.brightness,layer.contrast,layer.saturation,layer.hue,layer.warmth,layer.detail,layer.grain].join('|');
  const cached=layer._maskedRenderCache;if(cached?.sig===sig)return cached.canvas;
  const out=document.createElement('canvas');out.width=layer.width;out.height=layer.height;const g=out.getContext('2d');
  g.drawImage(base,0,0);g.globalCompositeOperation='destination-in';g.drawImage(buildLayerMask(layer),0,0);g.globalCompositeOperation='source-over';
  layer._maskedRenderCache={sig,canvas:out};return out;
};

function setMaskMode(on){
  maskEditMode=!!on;if(maskEditMode&&typeof setMeshMode==='function')setMeshMode(false);
  $('#maskModeBtn')?.classList.toggle('active-tool',maskEditMode);
  $('#toolStatus').textContent=maskEditMode?'Mask Brush: paint to '+(maskBrushMode==='hide'?'hide':'reveal')+' selected pixels':'Select/drag mode';
  draw();
}
function setMaskBrushMode(mode){
  maskBrushMode=mode;
  $('#maskHideBtn')?.classList.toggle('active-tool',mode==='hide');
  $('#maskRevealBtn')?.classList.toggle('active-tool',mode==='reveal');
  if(maskEditMode)$('#toolStatus').textContent='Mask Brush: paint to '+(mode==='hide'?'hide':'reveal')+' selected pixels';
}
$('#maskModeBtn')?.addEventListener('click',()=>setMaskMode(!maskEditMode));
$('#maskHideBtn')?.addEventListener('click',()=>setMaskBrushMode('hide'));
$('#maskRevealBtn')?.addEventListener('click',()=>setMaskBrushMode('reveal'));
$('#resetMaskBtn')?.addEventListener('click',()=>{const l=selected();if(!l)return;l.maskOps=[];invalidateLayerPixels(l);pushHistory('reset mask');draw();autoSave();say('Mask reset.');});
$('#maskSizeCtrl')?.addEventListener('input',e=>{$('#maskSizeOut').textContent=e.target.value;});

canvas.addEventListener('pointerdown',ev=>{
  if(!maskEditMode||cutMode)return;const l=selected();if(!l){say('Select a layer first.',true);return;}
  ev.preventDefault();ev.stopImmediatePropagation();const world=screenToCanvas(ev),local=worldToLocal(l,world);
  const stroke={mode:maskBrushMode,size:Number($('#maskSizeCtrl')?.value||56),points:[{x:clamp(local.x,0,l.width),y:clamp(local.y,0,l.height)}]};
  ensureMaskOps(l).push(stroke);maskStroke={layerId:l.id,stroke};invalidateLayerPixels(l);canvas.setPointerCapture(ev.pointerId);draw();
},true);
canvas.addEventListener('pointermove',ev=>{
  if(!maskStroke)return;ev.preventDefault();ev.stopImmediatePropagation();const l=state.layers.find(x=>x.id===maskStroke.layerId);if(!l)return;
  const local=worldToLocal(l,screenToCanvas(ev));const last=maskStroke.stroke.points.at(-1),p={x:clamp(local.x,0,l.width),y:clamp(local.y,0,l.height)};
  if(!last||Math.hypot(p.x-last.x,p.y-last.y)>2){maskStroke.stroke.points.push(p);invalidateLayerPixels(l);draw();}
},true);
canvas.addEventListener('pointerup',ev=>{if(!maskStroke)return;ev.preventDefault();ev.stopImmediatePropagation();maskStroke=null;pushHistory('mask paint');renderUI();draw();autoSave();},true);

function applyMeshInfluence(layer,origin,dx,dy,radius,strength=1){
  if(!layer?.mesh)return;const r=Math.max(2,radius);
  for(const p of layer.mesh.points){const dist=Math.hypot(p.x-origin.x,p.y-origin.y);if(dist>r)continue;const t=1-dist/r,w=(t*t*(3-2*t))*strength;p.dx+=dx*w;p.dy+=dy*w;}
}
function ensureFaceBaseline(layer){
  if(!layer.mesh)createMeshForLayer(layer,9);
  if(!Array.isArray(layer.faceBaseMesh)||layer.faceBaseMesh.length!==layer.mesh.points.length)layer.faceBaseMesh=layer.mesh.points.map(p=>({dx:p.dx||0,dy:p.dy||0}));
  if(!layer.faceExpression)layer.faceExpression={smile:0,mouth:0,brow:0,eye:0,jaw:0};
}
function faceLandmark(layer,index){
  const p=layer.aiAnalysis?.faces?.[0]?.landmarks?.[index];return p?{x:p.x*layer.width,y:p.y*layer.height}:null;
}
function facePush(layer,index,dx,dy,radius){
  const p=faceLandmark(layer,index);if(p)applyMeshInfluence(layer,p,dx,dy,radius,1);
}
function reapplyFaceExpression(layer){
  if(!layer?.aiAnalysis?.faces?.[0]?.landmarks?.length)return false;ensureFaceBaseline(layer);
  for(let i=0;i<layer.mesh.points.length;i++){layer.mesh.points[i].dx=layer.faceBaseMesh[i].dx;layer.mesh.points[i].dy=layer.faceBaseMesh[i].dy;}
  const e=layer.faceExpression||{},scale=Math.min(layer.width,layer.height),r=Math.max(18,scale*.095);
  const smile=clamp(Number(e.smile||0),-100,100)/100;
  facePush(layer,61,-smile*scale*.025,-smile*scale*.030,r);facePush(layer,291,smile*scale*.025,-smile*scale*.030,r);
  const mouth=clamp(Number(e.mouth||0),0,100)/100;
  facePush(layer,13,0,-mouth*scale*.022,r*.8);facePush(layer,14,0,mouth*scale*.035,r*.8);facePush(layer,152,0,mouth*scale*.012,r*1.15);
  const brow=clamp(Number(e.brow||0),-100,100)/100;
  for(const i of [70,105,107,300,334,336])facePush(layer,i,0,-brow*scale*.028,r*.75);
  const eye=clamp(Number(e.eye||0),-100,100)/100;
  for(const [up,down] of [[159,145],[158,153],[386,374],[385,380]]){facePush(layer,up,0,-eye*scale*.014,r*.55);facePush(layer,down,0,eye*scale*.014,r*.55);}
  const jaw=clamp(Number(e.jaw||0),-100,100)/100;
  facePush(layer,152,0,jaw*scale*.038,r*1.25);facePush(layer,172,-jaw*scale*.010,jaw*scale*.014,r);facePush(layer,397,jaw*scale*.010,jaw*scale*.014,r);
  layer.meshRev=(layer.meshRev||0)+1;if(typeof meshRenderCache!=='undefined')meshRenderCache.delete(layer);return true;
}
const faceControls={smile:['#faceSmileCtrl','#faceSmileOut'],mouth:['#faceMouthCtrl','#faceMouthOut'],brow:['#faceBrowCtrl','#faceBrowOut'],eye:['#faceEyeCtrl','#faceEyeOut'],jaw:['#faceJawCtrl','#faceJawOut']};
for(const [key,[sel,outSel]] of Object.entries(faceControls)){
  $(sel)?.addEventListener('input',ev=>{const l=selected();if(!l)return;if(!l.aiAnalysis?.faces?.[0]){say('Run Analyze selected first for face landmarks.',true);return;}ensureFaceBaseline(l);l.faceExpression[key]=Number(ev.target.value);$(outSel).textContent=ev.target.value;reapplyFaceExpression(l);draw();debouncedHistory();});
}
function setFacePreset(name){
  const l=selected();if(!l?.aiAnalysis?.faces?.[0]){say('Run Analyze selected first for face landmarks.',true);return;}ensureFaceBaseline(l);
  const presets={neutral:{smile:0,mouth:0,brow:0,eye:0,jaw:0},smile:{smile:70,mouth:12,brow:8,eye:-10,jaw:0},sad:{smile:-55,mouth:4,brow:32,eye:-8,jaw:0},surprise:{smile:0,mouth:75,brow:68,eye:72,jaw:26}};
  Object.assign(l.faceExpression,presets[name]||presets.neutral);reapplyFaceExpression(l);pushHistory('face preset');renderUI();draw();autoSave();say('Face expression applied with local mesh deformation.');
}
for(const b of document.querySelectorAll('.face-preset'))b.addEventListener('click',()=>setFacePreset(b.dataset.facePreset));

function anchorTargetsFor(layer){return state.layers.filter(x=>x.id!==layer?.id&&x.visible);}
function anchorWouldCycle(layer,target){
  let cur=target,guard=0;while(cur?.anchor&&guard++<40){if(cur.anchor.targetId===layer.id)return true;cur=state.layers.find(x=>x.id===cur.anchor.targetId);}return false;
}
function setContactAnchor(){
  const l=selected(),target=state.layers.find(x=>x.id===$('#anchorTarget')?.value);if(!l||!target){say('Select a layer and choose an anchor target.',true);return;}
  if(anchorWouldCycle(l,target)){say('That anchor would create a loop.',true);return;}
  l.anchor={targetId:target.id,targetLocal:worldToLocal(target,{x:l.x,y:l.y}),rotationOffset:(l.rotation||0)-(target.rotation||0),followRotation:!!$('#anchorRotateToggle')?.checked};
  pushHistory('set contact anchor');renderUI();draw();autoSave();say('Contact anchor pinned.');
}
function releaseContactAnchor(){const l=selected();if(!l?.anchor)return;delete l.anchor;pushHistory('release anchor');renderUI();draw();autoSave();say('Contact anchor released.');}
$('#setAnchorBtn')?.addEventListener('click',setContactAnchor);$('#releaseAnchorBtn')?.addEventListener('click',releaseContactAnchor);
function updateContactAnchors(){
  for(let pass=0;pass<3;pass++)for(const l of state.layers){if(!l.anchor)continue;const t=state.layers.find(x=>x.id===l.anchor.targetId);if(!t)continue;const p=localToWorld(t,l.anchor.targetLocal);l.x=p.x;l.y=p.y;if(l.anchor.followRotation)l.rotation=(t.rotation||0)+(l.anchor.rotationOffset||0);}
}
const drawBeforeV06=draw;
draw=function(){updateContactAnchors();drawBeforeV06();if(maskEditMode){const l=selected();if(l){const size=Number($('#maskSizeCtrl')?.value||56);ctx.save();ctx.strokeStyle=maskBrushMode==='hide'?'#ff8f70':'#7cf3c8';ctx.lineWidth=2/zoom;const c=localToWorld(l,{x:l.width/2,y:l.height/2});ctx.globalAlpha=.18;ctx.beginPath();ctx.arc(c.x,c.y,(size*Math.max(Math.abs(l.scaleX),Math.abs(l.scaleY)))/2,0,Math.PI*2);ctx.stroke();ctx.restore();}}};

const renderBeforeV06=renderUI;
renderUI=function(){
  renderBeforeV06();const l=selected();
  const sel=$('#anchorTarget');if(sel){const cur=l?.anchor?.targetId||sel.value;sel.innerHTML='<option value="">Choose layer</option>';for(const x of anchorTargetsFor(l)){const o=document.createElement('option');o.value=x.id;o.textContent=x.name;sel.append(o);}if([...sel.options].some(o=>o.value===cur))sel.value=cur;}
  const a=l?.anchor,target=a&&state.layers.find(x=>x.id===a.targetId);if($('#anchorStatus'))$('#anchorStatus').textContent=target?'Pinned to '+target.name:'Not anchored';if($('#anchorRotateToggle'))$('#anchorRotateToggle').checked=a?.followRotation??true;
  for(const [key,[ctrlSel,outSel]] of Object.entries(faceControls)){const v=Number(l?.faceExpression?.[key]||0);if($(ctrlSel)){$(ctrlSel).value=v;$(ctrlSel).disabled=!l;}if($(outSel))$(outSel).textContent=Math.round(v);}
  $('#maskModeBtn')?.classList.toggle('active-tool',maskEditMode);
};
window.PoseForgePrecision={setMaskMode,reapplyFaceExpression,setContactAnchor,releaseContactAnchor};
