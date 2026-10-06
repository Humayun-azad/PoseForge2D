/* PoseForge 2D v0.5 local deformable mesh + pose-driven warp */
let meshEditMode = false;
let meshGesture = null;
const meshRenderCache = new WeakMap();

function meshDensity(){ return Number($('#meshDensityCtrl')?.value || 6); }
function meshRadius(){ return Number($('#meshRadiusCtrl')?.value || 170); }
function meshStrength(){ return Number($('#meshStrengthCtrl')?.value || .75); }

function createMeshForLayer(layer, density=meshDensity()){
  if(!layer) return null;
  const cols=clamp(Math.round(density),3,9), rows=clamp(Math.round(density+1),4,10);
  const points=[];
  for(let y=0;y<rows;y++) for(let x=0;x<cols;x++){
    points.push({
      x:(x/(cols-1))*layer.width,
      y:(y/(rows-1))*layer.height,
      dx:0,dy:0
    });
  }
  layer.mesh={version:1,cols,rows,points,poseBound:false};
  layer.meshRev=(layer.meshRev||0)+1;
  meshRenderCache.delete(layer);
  return layer.mesh;
}
function resetMesh(layer){
  if(!layer?.mesh)return;
  for(const p of layer.mesh.points){p.dx=0;p.dy=0;}
  layer.meshRev=(layer.meshRev||0)+1;
  meshRenderCache.delete(layer);
}
function meshPoint(layer,index){
  const p=layer.mesh?.points?.[index];if(!p)return null;
  return{x:p.x+p.dx,y:p.y+p.dy};
}
function meshIndex(mesh,x,y){return y*mesh.cols+x;}

function affineTriangle(g,image,s0,s1,s2,d0,d1,d2){
  const den=s0.x*(s1.y-s2.y)+s1.x*(s2.y-s0.y)+s2.x*(s0.y-s1.y);
  if(Math.abs(den)<1e-6)return;
  const a=(d0.x*(s1.y-s2.y)+d1.x*(s2.y-s0.y)+d2.x*(s0.y-s1.y))/den;
  const c=(d0.x*(s2.x-s1.x)+d1.x*(s0.x-s2.x)+d2.x*(s1.x-s0.x))/den;
  const e=(d0.x*(s1.x*s2.y-s2.x*s1.y)+d1.x*(s2.x*s0.y-s0.x*s2.y)+d2.x*(s0.x*s1.y-s1.x*s0.y))/den;
  const b=(d0.y*(s1.y-s2.y)+d1.y*(s2.y-s0.y)+d2.y*(s0.y-s1.y))/den;
  const d=(d0.y*(s2.x-s1.x)+d1.y*(s0.x-s2.x)+d2.y*(s1.x-s0.x))/den;
  const f=(d0.y*(s1.x*s2.y-s2.x*s1.y)+d1.y*(s2.x*s0.y-s0.x*s2.y)+d2.y*(s0.x*s1.y-s1.x*s0.y))/den;
  g.save();
  g.beginPath();g.moveTo(d0.x,d0.y);g.lineTo(d1.x,d1.y);g.lineTo(d2.x,d2.y);g.closePath();g.clip();
  g.setTransform(a,b,c,d,e,f);g.drawImage(image,0,0);g.restore();
}
function meshWarpCanvas(layer,image){
  if(!layer.mesh?.points?.length)return image;
  const sig=(layer.meshRev||0)+'|'+layer.src+'|'+layer.brightness+'|'+layer.contrast+'|'+layer.saturation+'|'+layer.hue+'|'+layer.warmth+'|'+layer.detail+'|'+layer.grain;
  const cached=meshRenderCache.get(layer);if(cached?.sig===sig)return cached.canvas;
  const out=document.createElement('canvas');out.width=layer.width;out.height=layer.height;
  const g=out.getContext('2d');const m=layer.mesh;
  for(let y=0;y<m.rows-1;y++) for(let x=0;x<m.cols-1;x++){
    const i00=meshIndex(m,x,y),i10=meshIndex(m,x+1,y),i01=meshIndex(m,x,y+1),i11=meshIndex(m,x+1,y+1);
    const p00=m.points[i00],p10=m.points[i10],p01=m.points[i01],p11=m.points[i11];
    const s00={x:p00.x,y:p00.y},s10={x:p10.x,y:p10.y},s01={x:p01.x,y:p01.y},s11={x:p11.x,y:p11.y};
    const d00={x:p00.x+p00.dx,y:p00.y+p00.dy},d10={x:p10.x+p10.dx,y:p10.y+p10.dy},d01={x:p01.x+p01.dx,y:p01.y+p01.dy},d11={x:p11.x+p11.dx,y:p11.y+p11.dy};
    affineTriangle(g,image,s00,s10,s11,d00,d10,d11);
    affineTriangle(g,image,s00,s11,s01,d00,d11,d01);
  }
  meshRenderCache.set(layer,{sig,canvas:out});return out;
}

const drawLayerPreMesh=drawLayer;
drawLayer=function(l,selectedStroke=true){
  if(!l?.mesh?.points?.length){drawLayerPreMesh(l,selectedStroke);return;}
  if(!l.visible||!l.image)return;
  drawContactShadow(l);
  ctx.save();ctx.translate(l.x,l.y);ctx.rotate(l.rotation*Math.PI/180);ctx.scale(l.scaleX,l.scaleY);ctx.globalAlpha=l.opacity;
  if(l.shadow>0){ctx.shadowColor='rgba(0,0,0,.55)';ctx.shadowBlur=l.shadow;ctx.shadowOffsetX=l.shadow*.15;ctx.shadowOffsetY=l.shadow*.35;}
  const warped=meshWarpCanvas(l,litLayerImage(l));
  drawBentImage(ctx,warped,l.width,l.height,l.bend||0);ctx.restore();
};

function meshLocalToWorld(layer,p){return localToWorld(layer,p);}
function drawMeshOverlay(){
  if(!meshEditMode)return;const l=selected();if(!l?.mesh?.points?.length)return;
  const m=l.mesh;ctx.save();ctx.lineWidth=1.5/zoom;ctx.strokeStyle='rgba(69,214,181,.58)';
  for(let y=0;y<m.rows;y++){ctx.beginPath();for(let x=0;x<m.cols;x++){const p=meshLocalToWorld(l,meshPoint(l,meshIndex(m,x,y)));if(x===0)ctx.moveTo(p.x,p.y);else ctx.lineTo(p.x,p.y);}ctx.stroke();}
  for(let x=0;x<m.cols;x++){ctx.beginPath();for(let y=0;y<m.rows;y++){const p=meshLocalToWorld(l,meshPoint(l,meshIndex(m,x,y)));if(y===0)ctx.moveTo(p.x,p.y);else ctx.lineTo(p.x,p.y);}ctx.stroke();}
  for(let i=0;i<m.points.length;i++){const p=meshLocalToWorld(l,meshPoint(l,i));ctx.beginPath();ctx.fillStyle='rgba(16,17,20,.95)';ctx.strokeStyle='#45d6b5';ctx.arc(p.x,p.y,5.5/zoom,0,Math.PI*2);ctx.fill();ctx.stroke();}
  if(m.poseBound && $('#showPoseMeshToggle')?.checked && l.aiAnalysis?.poses?.[0]){
    ctx.fillStyle='#ffd166';ctx.strokeStyle='rgba(255,209,102,.7)';
    for(const p0 of l.aiAnalysis.poses[0]){const p=localToWorld(l,{x:p0.x*l.width,y:p0.y*l.height});ctx.beginPath();ctx.arc(p.x,p.y,6.5/zoom,0,Math.PI*2);ctx.fill();}
  }
  ctx.restore();
}
const drawBeforeV05=draw;
draw=function(){drawBeforeV05();drawMeshOverlay();};

if(typeof drawEasyHandles==='function'){
  const easyBeforeMesh=drawEasyHandles;
  drawEasyHandles=function(){if(!meshEditMode)easyBeforeMesh();};
}

function setMeshMode(on){
  meshEditMode=!!on;$('#meshModeBtn')?.classList.toggle('active-tool',meshEditMode);
  const l=selected();if(meshEditMode&&l&&!l.mesh)createMeshForLayer(l);
  $('#toolStatus').textContent=meshEditMode?'Mesh Edit: drag teal mesh points or yellow AI pose joints':'Select/drag mode';
  draw();
}
$('#meshModeBtn')?.addEventListener('click',()=>setMeshMode(!meshEditMode));
$('#createMeshBtn')?.addEventListener('click',()=>{const l=selected();if(!l){say('Select a layer first.',true);return;}createMeshForLayer(l);setMeshMode(true);pushHistory('create mesh');renderUI();draw();autoSave();say('Local deformable mesh created.');});
$('#resetMeshBtn')?.addEventListener('click',()=>{const l=selected();if(!l?.mesh){say('Selected layer has no mesh.',true);return;}resetMesh(l);pushHistory('reset mesh');draw();autoSave();say('Mesh deformation reset.');});
$('#meshFromPoseBtn')?.addEventListener('click',()=>{const l=selected();if(!l){say('Select a character first.',true);return;}if(!l.aiAnalysis?.poses?.[0]){say('Run Analyze selected first so pose joints are available.',true);return;}if(!l.mesh)createMeshForLayer(l);l.mesh.poseBound=true;l.meshRev=(l.meshRev||0)+1;setMeshMode(true);pushHistory('bind pose mesh');renderUI();draw();autoSave();say('AI pose joints bound to local soft mesh. Drag yellow joints in Mesh Edit.');});

for(const id of ['meshDensityCtrl','meshRadiusCtrl','meshStrengthCtrl']){
  const el=$('#'+id);if(!el)continue;el.addEventListener('input',()=>{
    if(id==='meshDensityCtrl')$('#meshDensityOut').textContent=el.value;
    if(id==='meshRadiusCtrl')$('#meshRadiusOut').textContent=el.value;
    if(id==='meshStrengthCtrl')$('#meshStrengthOut').textContent=Number(el.value).toFixed(2);
  });
}
$('#showPoseMeshToggle')?.addEventListener('change',draw);

function nearestMeshPoint(layer,local,maxPx=24){
  if(!layer?.mesh)return -1;let best=-1,bestD=maxPx;
  for(let i=0;i<layer.mesh.points.length;i++){const p=meshPoint(layer,i),d=Math.hypot(local.x-p.x,local.y-p.y);if(d<bestD){best=i;bestD=d;}}
  return best;
}
function nearestPoseJoint(layer,local,maxPx=28){
  const pose=layer?.aiAnalysis?.poses?.[0];if(!pose||!layer.mesh?.poseBound)return -1;let best=-1,bestD=maxPx;
  for(let i=0;i<pose.length;i++){const p={x:pose[i].x*layer.width,y:pose[i].y*layer.height},d=Math.hypot(local.x-p.x,local.y-p.y);if(d<bestD){best=i;bestD=d;}}
  return best;
}
function applySoftMeshDelta(layer,origin,dx,dy,radius=meshRadius(),strength=meshStrength()){
  if(!layer?.mesh)return;const r=Math.max(1,radius);
  for(const p of layer.mesh.points){
    const cx=p.x+p.dx,cy=p.y+p.dy,dist=Math.hypot(cx-origin.x,cy-origin.y);
    if(dist>r)continue;const t=1-dist/r,w=(t*t*(3-2*t))*strength;
    p.dx+=dx*w;p.dy+=dy*w;
    p.dx=clamp(p.dx,-layer.width*.42,layer.width*.42);p.dy=clamp(p.dy,-layer.height*.42,layer.height*.42);
  }
  layer.meshRev=(layer.meshRev||0)+1;meshRenderCache.delete(layer);
}

canvas.addEventListener('pointerdown',ev=>{
  if(!meshEditMode||cutMode)return;const l=selected();if(!l?.mesh)return;const world=screenToCanvas(ev),local=worldToLocal(l,world);
  const poseIndex=nearestPoseJoint(l,local,34/Math.max(.1,Math.abs(l.scaleX||1)));
  if(poseIndex>=0){ev.preventDefault();ev.stopImmediatePropagation();meshGesture={type:'pose',layerId:l.id,index:poseIndex,last:local};canvas.setPointerCapture(ev.pointerId);return;}
  const pointIndex=nearestMeshPoint(l,local,28/Math.max(.1,Math.abs(l.scaleX||1)));
  if(pointIndex>=0){ev.preventDefault();ev.stopImmediatePropagation();meshGesture={type:'mesh',layerId:l.id,index:pointIndex,last:local};canvas.setPointerCapture(ev.pointerId);}
},true);

canvas.addEventListener('pointermove',ev=>{
  if(!meshGesture)return;ev.preventDefault();ev.stopImmediatePropagation();const l=state.layers.find(x=>x.id===meshGesture.layerId);if(!l?.mesh)return;
  const world=screenToCanvas(ev),local=worldToLocal(l,world),dx=local.x-meshGesture.last.x,dy=local.y-meshGesture.last.y;
  if(meshGesture.type==='mesh'){
    const p=meshPoint(l,meshGesture.index);if(p)applySoftMeshDelta(l,p,dx,dy);
  }else{
    const pose=l.aiAnalysis?.poses?.[0],joint=pose?.[meshGesture.index];
    if(joint){const old={x:joint.x*l.width,y:joint.y*l.height};joint.x=clamp(local.x/l.width,0,1);joint.y=clamp(local.y/l.height,0,1);applySoftMeshDelta(l,old,dx,dy);}
  }
  meshGesture.last=local;draw();
},true);

canvas.addEventListener('pointerup',ev=>{
  if(!meshGesture)return;ev.preventDefault();ev.stopImmediatePropagation();meshGesture=null;pushHistory('mesh deform');renderUI();draw();autoSave();
},true);

const renderBeforeMesh=renderUI;
renderUI=function(){renderBeforeMesh();const l=selected();$('#meshModeBtn')?.classList.toggle('active-tool',meshEditMode);if($('#meshDensityOut'))$('#meshDensityOut').textContent=meshDensity();if($('#meshRadiusOut'))$('#meshRadiusOut').textContent=meshRadius();if($('#meshStrengthOut'))$('#meshStrengthOut').textContent=meshStrength().toFixed(2);if(meshEditMode&&l&&!l.mesh)$('#toolStatus').textContent='Mesh Edit: create a mesh for this layer';};

window.PoseForgeMesh={createMeshForLayer,resetMesh,setMeshMode,applySoftMeshDelta};
