function layerBounds(l){ const w=Math.abs(l.width*l.scaleX),h=Math.abs(l.height*l.scaleY);return{x:l.x-w/2,y:l.y-h/2,w,h}; }
function screenToCanvas(ev){const r=canvas.getBoundingClientRect();return{x:(ev.clientX-r.left)*(canvas.width/r.width),y:(ev.clientY-r.top)*(canvas.height/r.height)};}
function worldToLocal(l,p){const dx=p.x-l.x,dy=p.y-l.y,rad=-l.rotation*Math.PI/180;const rx=dx*Math.cos(rad)-dy*Math.sin(rad),ry=dx*Math.sin(rad)+dy*Math.cos(rad);return{x:rx/l.scaleX+l.width/2,y:ry/l.scaleY+l.height/2};}
function localToWorld(l,p){const lx=(p.x-l.width/2)*l.scaleX,ly=(p.y-l.height/2)*l.scaleY,rad=l.rotation*Math.PI/180;return{x:l.x+lx*Math.cos(rad)-ly*Math.sin(rad),y:l.y+lx*Math.sin(rad)+ly*Math.cos(rad)};}
function hitLayer(p){
 for(let i=state.layers.length-1;i>=0;i--){const l=state.layers[i];if(!l.visible)continue;const q=worldToLocal(l,p);if(q.x>=0&&q.y>=0&&q.x<=l.width&&q.y<=l.height)return l;}return null;
}
function moveGroup(layer,dx,dy){ if(!layer.groupId){layer.x+=dx;layer.y+=dy;return;} for(const l of state.layers){if(l.groupId===layer.groupId){l.x+=dx;l.y+=dy;}} }

canvas.addEventListener('pointerdown',ev=>{
 const p=screenToCanvas(ev); if(cutMode){const l=selected();if(!l){say('Select a character first',true);return;}if(l.kind!=='character'){say('Cut Part requires a base character layer',true);return;}cutPoints.push(p);$('#finishCutBtn').disabled=cutPoints.length<3;draw();return;}
 const hit=hitLayer(p); if(hit){state.selectedId=hit.id;drag={id:hit.id,last:p};canvas.setPointerCapture(ev.pointerId);renderUI();draw();} else {state.selectedId=null;renderUI();draw();}
});
canvas.addEventListener('pointermove',ev=>{if(!drag||cutMode)return;const p=screenToCanvas(ev);const l=state.layers.find(x=>x.id===drag.id);if(!l)return;const dx=p.x-drag.last.x,dy=p.y-drag.last.y;moveGroup(l,dx,dy);drag.last=p;syncControls();draw();});
canvas.addEventListener('pointerup',()=>{if(drag){pushHistory('move');autoSave();drag=null;}});
canvas.addEventListener('dblclick',ev=>{if(cutMode&&cutPoints.length>=3)finishCut();});

function polygonCanvas(points,w,h,feather){
 const m=document.createElement('canvas');m.width=w;m.height=h;const mc=m.getContext('2d');mc.fillStyle='#fff';mc.beginPath();mc.moveTo(points[0].x,points[0].y);points.slice(1).forEach(p=>mc.lineTo(p.x,p.y));mc.closePath();mc.fill();
 if(feather>0){const b=document.createElement('canvas');b.width=w;b.height=h;const bc=b.getContext('2d');bc.filter=`blur(${feather}px)`;bc.drawImage(m,0,0);return b;}return m;
}
async function finishCut(){
 const l=selected(); if(!l||l.kind!=='character'||cutPoints.length<3)return;
 const localPts=cutPoints.map(p=>worldToLocal(l,p)).map(p=>({x:clamp(p.x,0,l.width),y:clamp(p.y,0,l.height)}));
 const minX=Math.floor(Math.min(...localPts.map(p=>p.x))),minY=Math.floor(Math.min(...localPts.map(p=>p.y))),maxX=Math.ceil(Math.max(...localPts.map(p=>p.x))),maxY=Math.ceil(Math.max(...localPts.map(p=>p.y)));
 const bw=Math.max(2,maxX-minX),bh=Math.max(2,maxY-minY);const feather=+$('#featherCtrl').value||0;
 const mask=polygonCanvas(localPts,l.width,l.height,feather);
 const extracted=document.createElement('canvas');extracted.width=l.width;extracted.height=l.height;let ec=extracted.getContext('2d');ec.drawImage(l.image,0,0);ec.globalCompositeOperation='destination-in';ec.drawImage(mask,0,0);ec.globalCompositeOperation='source-over';
 const crop=document.createElement('canvas');crop.width=bw;crop.height=bh;crop.getContext('2d').drawImage(extracted,minX,minY,bw,bh,0,0,bw,bh);const partSrc=crop.toDataURL('image/png');const partIm=await imageFromDataURL(partSrc);
 const base=document.createElement('canvas');base.width=l.width;base.height=l.height;const bc=base.getContext('2d');bc.drawImage(l.image,0,0);bc.globalCompositeOperation='destination-out';bc.drawImage(mask,0,0);bc.globalCompositeOperation='source-over';l.src=base.toDataURL('image/png');l.image=await imageFromDataURL(l.src);
 const center=localToWorld(l,{x:minX+bw/2,y:minY+bh/2});
 const part={id:uid('part'),kind:'part',name:$('#partName').value,src:partSrc,baseSrc:partSrc,width:bw,height:bh,image:partIm,...layerDefaults(),x:center.x,y:center.y,rotation:l.rotation,scaleX:l.scaleX,scaleY:l.scaleY,brightness:l.brightness,contrast:l.contrast,saturation:l.saturation,hue:l.hue,warmth:l.warmth??0,lightIntensity:l.lightIntensity??0,lightAngle:l.lightAngle??315,lightSoftness:l.lightSoftness??65,contactShadow:l.contactShadow??0,shadow:l.shadow,ownerId:l.id,partRole:$('#partName').value,groupId:l.groupId};
 const idx=state.layers.indexOf(l);state.layers.splice(idx+1,0,part);state.selectedId=part.id;cutMode=false;cutPoints=[];setCutButtons();pushHistory('extract part');renderUI();draw();autoSave();say('Body-part layer extracted. It is now independently editable.');
}
function cancelCut(){cutMode=false;cutPoints=[];setCutButtons();draw();}
function setCutButtons(){$('#cutModeBtn').classList.toggle('primary',cutMode);$('#finishCutBtn').disabled=!cutMode||cutPoints.length<3;$('#cancelCutBtn').disabled=!cutMode;$('#toolStatus').textContent=cutMode?'Cut Part: tap polygon points, then Finish Cut':'Select/drag mode';}
