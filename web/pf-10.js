/* PoseForge 2D v0.4 interaction + harmonization layer */
const qualityCache = new WeakMap();

function personOwner(layer){
  if(!layer) return null;
  if(layer.kind === 'character') return layer;
  if(layer.ownerId) return state.layers.find(x=>x.id===layer.ownerId) || layer;
  return layer;
}
function ownedParts(owner){ return owner ? state.layers.filter(x=>x.ownerId===owner.id) : []; }
function wholePersonLayers(layer){
  const owner=personOwner(layer); if(!owner) return [];
  return [owner,...ownedParts(owner)];
}
function wholePersonMove(layer,dx,dy){
  const owner=personOwner(layer); if(!owner) return;
  if(owner.groupId){
    for(const x of state.layers) if(x.groupId===owner.groupId){x.x+=dx;x.y+=dy;}
  } else {
    for(const x of wholePersonLayers(owner)){x.x+=dx;x.y+=dy;}
  }
}

moveGroup = function(layer,dx,dy){
  if(layer.kind==='character') { wholePersonMove(layer,dx,dy); return; }
  if(layer.groupId){ for(const x of state.layers) if(x.groupId===layer.groupId){x.x+=dx;x.y+=dy;} return; }
  layer.x+=dx; layer.y+=dy;
};

function currentPersonScale(layer){
  const owner=personOwner(layer); if(!owner) return 1;
  return Math.sqrt(Math.max(.0001,Math.abs((owner.scaleX||1)*(owner.scaleY||1))));
}
function scalePersonTo(layer,target){
  const owner=personOwner(layer); if(!owner) return;
  const current=currentPersonScale(owner); if(current<.0001) return;
  const factor=clamp(target/current,.05,20);
  const cx=owner.x,cy=owner.y;
  for(const x of wholePersonLayers(owner)){
    if(x!==owner){x.x=cx+(x.x-cx)*factor;x.y=cy+(x.y-cy)*factor;}
    x.scaleX*=factor; x.scaleY*=factor;
  }
}
function rotateWholePerson(owner,targetRotation,snapshot){
  const delta=(targetRotation-snapshot.ownerRotation)*Math.PI/180;
  const cs=Math.cos(delta),sn=Math.sin(delta),cx=snapshot.cx,cy=snapshot.cy;
  for(const item of snapshot.items){
    const l=state.layers.find(x=>x.id===item.id); if(!l) continue;
    const dx=item.x-cx,dy=item.y-cy;
    l.x=cx+dx*cs-dy*sn; l.y=cy+dx*sn+dy*cs;
    l.rotation=item.rotation+(targetRotation-snapshot.ownerRotation);
  }
}
function personSnapshot(owner){
  return {cx:owner.x,cy:owner.y,ownerRotation:owner.rotation||0,items:wholePersonLayers(owner).map(x=>({id:x.id,x:x.x,y:x.y,rotation:x.rotation||0,scaleX:x.scaleX,scaleY:x.scaleY}))};
}
function applySnapshotScale(owner,snapshot,factor){
  const cx=snapshot.cx,cy=snapshot.cy;
  for(const item of snapshot.items){
    const l=state.layers.find(x=>x.id===item.id); if(!l) continue;
    l.x=cx+(item.x-cx)*factor; l.y=cy+(item.y-cy)*factor;
    l.scaleX=item.scaleX*factor; l.scaleY=item.scaleY*factor;
  }
}

function lowResSharpen(input,amount){
  const maxSide=1400, scale=Math.min(1,maxSide/Math.max(input.width,input.height));
  const w=Math.max(2,Math.round(input.width*scale)),h=Math.max(2,Math.round(input.height*scale));
  const work=document.createElement('canvas');work.width=w;work.height=h;const g=work.getContext('2d',{willReadFrequently:true});g.drawImage(input,0,0,w,h);
  const img=g.getImageData(0,0,w,h),src=img.data,out=new Uint8ClampedArray(src);
  const a=clamp(amount/12,0,1)*.17;
  for(let y=1;y<h-1;y++) for(let x=1;x<w-1;x++){
    const i=(y*w+x)*4,li=i-4,ri=i+4,ui=i-w*4,di=i+w*4;
    for(let c=0;c<3;c++) out[i+c]=clamp(src[i+c]*(1+4*a)-a*(src[li+c]+src[ri+c]+src[ui+c]+src[di+c]),0,255);
    out[i+3]=src[i+3];
  }
  img.data.set(out);g.putImageData(img,0,0);
  const result=document.createElement('canvas');result.width=input.width;result.height=input.height;result.getContext('2d').drawImage(work,0,0,result.width,result.height);return result;
}
function addDeterministicGrain(canvasIn,amount){
  if(amount<=.01) return canvasIn;
  const out=document.createElement('canvas');out.width=canvasIn.width;out.height=canvasIn.height;const g=out.getContext('2d');g.drawImage(canvasIn,0,0);
  const tile=document.createElement('canvas');tile.width=96;tile.height=96;const tg=tile.getContext('2d'),im=tg.createImageData(96,96);let seed=0x45d6b5;
  for(let i=0;i<im.data.length;i+=4){seed^=seed<<13;seed^=seed>>>17;seed^=seed<<5;const n=96+(seed>>>24)%96;im.data[i]=n;im.data[i+1]=n;im.data[i+2]=n;im.data[i+3]=255;}tg.putImageData(im,0,0);
  g.save();g.globalCompositeOperation='source-atop';g.globalAlpha=clamp(amount,0,30)/30*.16;g.fillStyle=g.createPattern(tile,'repeat');g.fillRect(0,0,out.width,out.height);g.restore();return out;
}

const baseLitLayerImage = litLayerImage;
litLayerImage = function(l){
  const sig=[l.src,l.brightness,l.contrast,l.saturation,l.hue,l.warmth,l.lightIntensity,l.lightAngle,l.lightSoftness,l.detail||0,l.grain||0].join('|');
  const cached=qualityCache.get(l); if(cached?.sig===sig) return cached.canvas;
  let base=baseLitLayerImage(l),out=base,detail=Number(l.detail||0),grain=Number(l.grain||0);
  if(detail<-.05){const c=document.createElement('canvas');c.width=base.width;c.height=base.height;const g=c.getContext('2d');g.filter=`blur(${Math.min(4,Math.abs(detail)*.28)}px)`;g.drawImage(base,0,0);g.filter='none';out=c;}
  else if(detail>.05) out=lowResSharpen(base,detail);
  if(grain>.05) out=addDeterministicGrain(out,grain);
  qualityCache.set(l,{sig,canvas:out});return out;
};

function sampleQualityStats(im){
  const c=document.createElement('canvas'),s=64;c.width=s;c.height=s;const g=c.getContext('2d',{willReadFrequently:true});g.drawImage(im,0,0,s,s);const d=g.getImageData(0,0,s,s).data;
  const L=new Float32Array(s*s),A=new Uint8Array(s*s);for(let i=0;i<s*s;i++){const p=i*4;A[i]=d[p+3];L[i]=(.2126*d[p]+.7152*d[p+1]+.0722*d[p+2])/255;}
  let edge=0,noise=0,n=0;for(let y=1;y<s-1;y++)for(let x=1;x<s-1;x++){const i=y*s+x;if(A[i]<20)continue;const h=Math.abs(L[i]-L[i-1])+Math.abs(L[i]-L[i+1]),v=Math.abs(L[i]-L[i-s])+Math.abs(L[i]-L[i+s]);const avg=(L[i-1]+L[i+1]+L[i-s]+L[i+s])/4;edge+=(h+v)/4;noise+=Math.abs(L[i]-avg);n++;}return{edge:n?edge/n:.04,noise:n?noise/n:.02};
}
function matchSelectedQuality(layer,bgStats){
  const q=sampleQualityStats(layer.image),edgeDiff=bgStats.edge-q.edge,noiseDiff=bgStats.noise-q.noise;
  layer.detail=clamp(edgeDiff*105,-10,10);
  if(q.noise>bgStats.noise*1.35) layer.detail=clamp(layer.detail-(q.noise-bgStats.noise)*70,-12,10);
  layer.grain=clamp(noiseDiff*260,0,24);
}
function matchQualityAll(){
  if(!state.background?.image){say('Add a background first.',true);return;}
  const bq=sampleQualityStats(state.background.image);for(const l of state.layers) if(l.kind==='character'||l.kind==='part') matchSelectedQuality(l,bq);
  pushHistory('quality match');renderUI();draw();autoSave();say('Sharpness, blur and grain harmonized to the scene.');
}
$('#matchSceneBtn').addEventListener('click',()=>{if(!state.background?.image)return;const bq=sampleQualityStats(state.background.image);for(const l of state.layers)if(l.kind==='character'||l.kind==='part')matchSelectedQuality(l,bq);renderUI();draw();autoSave();});
$('#matchQualityBtn')?.addEventListener('click',matchQualityAll);

function updateEasyControls(){
  const l=selected(),owner=personOwner(l),size=$('#sizeCtrl'),detail=$('#detailCtrl'),grain=$('#grainCtrl');
  if(size){const v=owner?currentPersonScale(owner):1;size.value=clamp(v,.05,4);size.disabled=!owner;$('#sizeOut').textContent=v.toFixed(2)+'×';}
  if(detail){const v=l?Number(l.detail||0):0;detail.value=v;detail.disabled=!l;$('#detailOut').textContent=v.toFixed(1);}
  if(grain){const v=l?Number(l.grain||0):0;grain.value=v;grain.disabled=!l;$('#grainOut').textContent=Math.round(v)+'%';}
  updateCoverageUI(l);
}
const oldRenderUI=renderUI;
renderUI=function(){oldRenderUI();updateEasyControls();};

$('#sizeCtrl')?.addEventListener('input',e=>{const l=selected();if(!l)return;scalePersonTo(l,Number(e.target.value));updateEasyControls();draw();debouncedHistory();});
$('#detailCtrl')?.addEventListener('input',e=>{const l=selected();if(!l)return;l.detail=Number(e.target.value);updateEasyControls();draw();debouncedHistory();});
$('#grainCtrl')?.addEventListener('input',e=>{const l=selected();if(!l)return;l.grain=Number(e.target.value);updateEasyControls();draw();debouncedHistory();});
for(const b of document.querySelectorAll('[data-nudge]')) b.addEventListener('click',()=>{const l=selected();if(!l)return;const [dx,dy]=b.dataset.nudge.split(',').map(Number);wholePersonMove(l,dx,dy);pushHistory('nudge person');renderUI();draw();autoSave();});
for(const b of document.querySelectorAll('[data-size]')) b.addEventListener('click',()=>{const l=selected();if(!l)return;scalePersonTo(l,Number(b.dataset.size));pushHistory('person size');renderUI();draw();autoSave();});

function selectedHandleGeometry(l){
  const corners=[localToWorld(l,{x:0,y:0}),localToWorld(l,{x:l.width,y:0}),localToWorld(l,{x:l.width,y:l.height}),localToWorld(l,{x:0,y:l.height})];
  const top={x:(corners[0].x+corners[1].x)/2,y:(corners[0].y+corners[1].y)/2};const vx=top.x-l.x,vy=top.y-l.y,len=Math.hypot(vx,vy)||1;const rot={x:top.x+vx/len*54/zoom,y:top.y+vy/len*54/zoom};
  return{corners,rot,top};
}
function drawEasyHandles(){
  const l=selected();if(!l||cutMode)return;const h=selectedHandleGeometry(l);ctx.save();ctx.lineWidth=2.3/zoom;ctx.strokeStyle='#45d6b5';ctx.fillStyle='#101114';ctx.beginPath();ctx.moveTo(h.corners[0].x,h.corners[0].y);for(let i=1;i<4;i++)ctx.lineTo(h.corners[i].x,h.corners[i].y);ctx.closePath();ctx.stroke();ctx.beginPath();ctx.moveTo(h.top.x,h.top.y);ctx.lineTo(h.rot.x,h.rot.y);ctx.stroke();for(const p of h.corners){ctx.beginPath();ctx.arc(p.x,p.y,8/zoom,0,Math.PI*2);ctx.fill();ctx.stroke();}ctx.beginPath();ctx.arc(h.rot.x,h.rot.y,9/zoom,0,Math.PI*2);ctx.fill();ctx.stroke();ctx.restore();
}
const oldDraw=draw;
draw=function(){oldDraw();drawEasyHandles();};

let easyGesture=null;
function near(a,b,r){return Math.hypot(a.x-b.x,a.y-b.y)<=r;}
canvas.addEventListener('pointerdown',ev=>{
  if(cutMode)return;const l=selected();if(!l)return;const p=screenToCanvas(ev),h=selectedHandleGeometry(l),hitCorner=h.corners.findIndex(q=>near(p,q,18/zoom));
  if(hitCorner>=0){ev.preventDefault();ev.stopImmediatePropagation();const owner=l.kind==='character'?l:null;easyGesture={type:'scale',id:l.id,ownerId:owner?.id||null,startDist:Math.max(1,Math.hypot(p.x-l.x,p.y-l.y)),startSX:l.scaleX,startSY:l.scaleY,snapshot:owner?personSnapshot(owner):null};canvas.setPointerCapture(ev.pointerId);return;}
  if(near(p,h.rot,20/zoom)){ev.preventDefault();ev.stopImmediatePropagation();const owner=l.kind==='character'?l:null;easyGesture={type:'rotate',id:l.id,ownerId:owner?.id||null,startAngle:Math.atan2(p.y-l.y,p.x-l.x),startRotation:l.rotation||0,snapshot:owner?personSnapshot(owner):null};canvas.setPointerCapture(ev.pointerId);}
},true);
canvas.addEventListener('pointermove',ev=>{
  if(!easyGesture)return;ev.preventDefault();ev.stopImmediatePropagation();const l=state.layers.find(x=>x.id===easyGesture.id);if(!l)return;const p=screenToCanvas(ev);
  if(easyGesture.type==='scale'){const f=clamp(Math.hypot(p.x-l.x,p.y-l.y)/easyGesture.startDist,.08,12);if(easyGesture.snapshot){const owner=state.layers.find(x=>x.id===easyGesture.ownerId);if(owner)applySnapshotScale(owner,easyGesture.snapshot,f);}else{l.scaleX=easyGesture.startSX*f;l.scaleY=easyGesture.startSY*f;}}
  else{const a=Math.atan2(p.y-l.y,p.x-l.x),deg=(a-easyGesture.startAngle)*180/Math.PI,target=easyGesture.startRotation+deg;if(easyGesture.snapshot){const owner=state.layers.find(x=>x.id===easyGesture.ownerId);if(owner)rotateWholePerson(owner,target,easyGesture.snapshot);}else l.rotation=target;}
  updateEasyControls();syncControls();draw();
},true);
canvas.addEventListener('pointerup',ev=>{if(!easyGesture)return;ev.preventDefault();ev.stopImmediatePropagation();easyGesture=null;pushHistory('easy transform');renderUI();draw();autoSave();},true);

function coverageLabel(c){if(!c)return 'Not analyzed';if(c.state==='covered')return 'Covered';if(c.state==='mixed')return 'Mixed coverage';if(c.state==='high-skin-exposure')return 'High skin exposure';return c.state||'Unknown';}
function updateCoverageUI(layer){
  const card=$('#coverageCard'),status=$('#coverageStatus');if(!card||!status)return;const c=layer?.aiAnalysis?.coverage;if(!c){status.textContent='Run Analyze selected to estimate covered vs exposed body regions.';card.dataset.state='unknown';return;}const covered=Math.round((c.coveredRatio||0)*100),exposed=Math.round((c.exposedRatio||0)*100);status.textContent=`${coverageLabel(c)} · clothes ${covered}% · exposed body-skin ${exposed}%`;card.dataset.state=c.state||'unknown';
}
window.updateCoverageUI=updateCoverageUI;

async function semanticLayerFromMask(owner,key,name){
  const src=owner.aiAnalysis?.segmentation?.classMasks?.[key];if(!src)return null;const mask=await imageFromDataURL(src),mw=mask.width,mh=mask.height,mc=document.createElement('canvas');mc.width=mw;mc.height=mh;const mg=mc.getContext('2d',{willReadFrequently:true});mg.drawImage(mask,0,0);const md=mg.getImageData(0,0,mw,mh).data;let minX=mw,minY=mh,maxX=-1,maxY=-1;for(let y=0;y<mh;y++)for(let x=0;x<mw;x++){if(md[(y*mw+x)*4+3]>30){minX=Math.min(minX,x);maxX=Math.max(maxX,x);minY=Math.min(minY,y);maxY=Math.max(maxY,y);}}if(maxX<minX)return null;
  const x0=Math.floor(minX/mw*owner.width),y0=Math.floor(minY/mh*owner.height),x1=Math.ceil((maxX+1)/mw*owner.width),y1=Math.ceil((maxY+1)/mh*owner.height),w=Math.max(2,x1-x0),h=Math.max(2,y1-y0);
  const out=document.createElement('canvas');out.width=w;out.height=h;const og=out.getContext('2d');og.drawImage(owner.image,x0,y0,w,h,0,0,w,h);og.globalCompositeOperation='destination-in';og.drawImage(mask,minX,minY,maxX-minX+1,maxY-minY+1,0,0,w,h);og.globalCompositeOperation='source-over';const partSrc=out.toDataURL('image/png'),im=await imageFromDataURL(partSrc),center=localToWorld(owner,{x:x0+w/2,y:y0+h/2});
  const part={id:uid('part'),kind:'part',name,src:partSrc,baseSrc:partSrc,width:w,height:h,image:im,...layerDefaults(),x:center.x,y:center.y,rotation:owner.rotation,scaleX:owner.scaleX,scaleY:owner.scaleY,brightness:owner.brightness,contrast:owner.contrast,saturation:owner.saturation,hue:owner.hue,warmth:owner.warmth,lightIntensity:owner.lightIntensity,lightAngle:owner.lightAngle,lightSoftness:owner.lightSoftness,contactShadow:owner.contactShadow,shadow:owner.shadow,detail:owner.detail||0,grain:owner.grain||0,ownerId:owner.id,partRole:name,semanticKey:key,groupId:owner.groupId};
  const fullMask=document.createElement('canvas');fullMask.width=owner.width;fullMask.height=owner.height;fullMask.getContext('2d').drawImage(mask,0,0,owner.width,owner.height);const base=document.createElement('canvas');base.width=owner.width;base.height=owner.height;const bg=base.getContext('2d');bg.drawImage(owner.image,0,0);bg.globalCompositeOperation='destination-out';bg.drawImage(fullMask,0,0);bg.globalCompositeOperation='source-over';owner.src=base.toDataURL('image/png');owner.image=await imageFromDataURL(owner.src);return part;
}
async function semanticSplit(){
  const l=selected(),owner=personOwner(l);if(!owner||owner.kind!=='character'){say('Select a base character first.',true);return;}const masks=owner.aiAnalysis?.segmentation?.classMasks;if(!masks){say('Run Offline Analyze first. Semantic masks are not available.',true);return;}
  const specs=[['hair','Hair'],['faceSkin','Face skin'],['bodySkin','Body skin'],['clothes','Clothes']];const made=[];for(const [key,name] of specs){if(!masks[key]||state.layers.some(x=>x.ownerId===owner.id&&x.semanticKey===key))continue;const p=await semanticLayerFromMask(owner,key,name);if(p)made.push(p);}if(!made.length){say('No new semantic regions were available.',true);return;}const idx=state.layers.indexOf(owner);state.layers.splice(idx+1,0,...made);state.selectedId=made[0].id;pushHistory('semantic split');renderUI();draw();autoSave();say(`Created ${made.length} pixel-masked semantic layers.`);
}
$('#semanticPartsBtn')?.addEventListener('click',semanticSplit);

const oldExtractRectPart=extractRectPart;
extractRectPart=async function(owner,reg){
  const maskSrc=owner.aiAnalysis?.segmentation?.classMasks?.person;if(!maskSrc)return oldExtractRectPart(owner,reg);const mask=await imageFromDataURL(maskSrc);
  const x=Math.floor(reg.x0*owner.width),y=Math.floor(reg.y0*owner.height),w=Math.max(2,Math.ceil((reg.x1-reg.x0)*owner.width)),h=Math.max(2,Math.ceil((reg.y1-reg.y0)*owner.height));const c=document.createElement('canvas');c.width=w;c.height=h;const g=c.getContext('2d');g.drawImage(owner.image,x,y,w,h,0,0,w,h);g.globalCompositeOperation='destination-in';g.drawImage(mask,reg.x0*mask.width,reg.y0*mask.height,(reg.x1-reg.x0)*mask.width,(reg.y1-reg.y0)*mask.height,0,0,w,h);g.globalCompositeOperation='source-over';const src=c.toDataURL('image/png'),im=await imageFromDataURL(src),center=localToWorld(owner,{x:x+w/2,y:y+h/2});return{id:uid('part'),kind:'part',name:reg.name,src,baseSrc:src,width:w,height:h,image:im,...layerDefaults(),x:center.x,y:center.y,rotation:owner.rotation,scaleX:owner.scaleX,scaleY:owner.scaleY,brightness:owner.brightness,contrast:owner.contrast,saturation:owner.saturation,hue:owner.hue,warmth:owner.warmth,lightIntensity:owner.lightIntensity,lightAngle:owner.lightAngle,lightSoftness:owner.lightSoftness,contactShadow:owner.contactShadow,shadow:owner.shadow,detail:owner.detail||0,grain:owner.grain||0,ownerId:owner.id,partRole:reg.name,groupId:owner.groupId};
};

updateEasyControls();
