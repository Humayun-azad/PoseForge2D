/* PoseForge 2D v0.14 Repair Studio + Scene Harmony Pro */
(function(){
'use strict';

var repairMode=false,stroke=null,preview=null,retrySeed=1,autoTimer=null;
var msg=function(b,e){return window.PoseForgeI18n&&PoseForgeI18n.lang&&PoseForgeI18n.lang()==='bn'?b:e;};
var owner=function(l){return typeof personOwner==='function'?personOwner(l):(l&&l.kind==='character'?l:state.layers.find(function(x){return x.id===(l&&l.ownerId)})||l);};
var num=function(id,d){var e=$(id);return Number(e&&e.value!=null?e.value:d);};
var val=function(id,d){var e=$(id);return e&&e.value!=null?e.value:d;};
var check=function(id,d){var e=$(id);return e?!!e.checked:!!d;};
function commit(label){pushHistory(label);renderUI();draw();autoSave();}
function invalidate(l){if(typeof invalidateLayerPixels==='function')invalidateLayerPixels(l);l.meshRev=(l.meshRev||0)+1;if(typeof meshRenderCache!=='undefined')meshRenderCache.delete(l);}
function ensureOps(l){if(!Array.isArray(l.repairMaskOps))l.repairMaskOps=[];return l.repairMaskOps;}
function sourceCanvas(l){
  var base=document.createElement('canvas');base.width=l.width;base.height=l.height;
  base.getContext('2d').drawImage(l.image,0,0,l.width,l.height);
  if(l.mesh&&l.mesh.points&&l.mesh.points.length&&typeof meshWarpCanvas==='function')return meshWarpCanvas(l,base);
  return base;
}
function maskCanvas(l){
  var c=document.createElement('canvas');c.width=l.width;c.height=l.height;var g=c.getContext('2d');
  g.strokeStyle='#fff';g.fillStyle='#fff';g.lineCap='round';g.lineJoin='round';
  (l.repairMaskOps||[]).forEach(function(s){var pts=s.points||[];if(!pts.length)return;g.lineWidth=Math.max(2,s.size||52);g.beginPath();g.moveTo(pts[0].x,pts[0].y);for(var i=1;i<pts.length;i++)g.lineTo(pts[i].x,pts[i].y);if(pts.length===1)g.lineTo(pts[0].x+.01,pts[0].y+.01);g.stroke();});
  return c;
}
function maskBounds(mask){
  var g=mask.getContext('2d',{willReadFrequently:true}),d=g.getImageData(0,0,mask.width,mask.height).data,minX=mask.width,minY=mask.height,maxX=-1,maxY=-1;
  for(var y=0;y<mask.height;y++)for(var x=0;x<mask.width;x++)if(d[(y*mask.width+x)*4+3]>18){if(x<minX)minX=x;if(x>maxX)maxX=x;if(y<minY)minY=y;if(y>maxY)maxY=y;}
  return maxX<minX?null:{x0:minX,y0:minY,x1:maxX+1,y1:maxY+1,w:maxX-minX+1,h:maxY-minY+1,cx:(minX+maxX)/2,cy:(minY+maxY)/2};
}
function hasMask(l){return !!maskBounds(maskCanvas(l));}
function setRepairMode(on){
  repairMode=!!on;preview=null;
  if(repairMode){if(typeof setMaskMode==='function')setMaskMode(false);if(typeof setMeshMode==='function')setMeshMode(false);window.PoseForgeV010&&PoseForgeV010.setForceMode&&PoseForgeV010.setForceMode(false);}
  var b=$('#repairPaintBtn');if(b){b.classList.toggle('active-tool',repairMode);b.textContent=repairMode?msg('মেরামত মাস্ক আঁকা বন্ধ','Stop repair mask painting'):msg('মেরামত মাস্ক আঁকুন','Paint repair mask');}
  if($('#toolStatus'))$('#toolStatus').textContent=repairMode?msg('যে জায়গা মেরামত করতে চান সেখানে ব্রাশ করুন','Brush the area that needs repair'):'Select/drag mode';
  updateRepairStatus();draw();
}
function clearMask(){var l=selected();if(!l)return;l.repairMaskOps=[];preview=null;invalidate(l);commit('clear repair mask');}
function screenLocal(l,e){return worldToLocal(l,screenToCanvas(e));}
canvas.addEventListener('pointerdown',function(e){
  if(!repairMode||cutMode)return;var l=selected();if(!l)return;
  e.preventDefault();e.stopImmediatePropagation();var p=screenLocal(l,e);if(p.x<0||p.y<0||p.x>l.width||p.y>l.height)return;
  var s={size:num('#repairBrushSize',56),points:[{x:clamp(p.x,0,l.width),y:clamp(p.y,0,l.height)}]};ensureOps(l).push(s);stroke={id:l.id,s:s};preview=null;canvas.setPointerCapture&&canvas.setPointerCapture(e.pointerId);draw();
},true);
canvas.addEventListener('pointermove',function(e){
  if(!stroke)return;var l=state.layers.find(function(x){return x.id===stroke.id});if(!l)return;
  e.preventDefault();e.stopImmediatePropagation();var p=screenLocal(l,e),q={x:clamp(p.x,0,l.width),y:clamp(p.y,0,l.height)},last=stroke.s.points[stroke.s.points.length-1];
  if(!last||Math.hypot(q.x-last.x,q.y-last.y)>2){stroke.s.points.push(q);preview=null;draw();}
},true);
canvas.addEventListener('pointerup',function(e){
  if(!stroke)return;e.preventDefault();e.stopImmediatePropagation();stroke=null;pushHistory('repair mask');autoSave();scheduleAutoPreview();
},true);
canvas.addEventListener('pointercancel',function(){stroke=null;},true);

function prng(seed){var x=(seed|0)||1;return function(){x^=x<<13;x^=x>>>17;x^=x<<5;return((x>>>0)%1000000)/1000000;};}
function offlineFill(src,mask,seed,strategy){
  var maxSide=640,scale=Math.min(1,maxSide/Math.max(src.width,src.height)),w=Math.max(4,Math.round(src.width*scale)),h=Math.max(4,Math.round(src.height*scale));
  var sc=document.createElement('canvas');sc.width=w;sc.height=h;var sg=sc.getContext('2d',{willReadFrequently:true});sg.drawImage(src,0,0,w,h);
  var mc=document.createElement('canvas');mc.width=w;mc.height=h;var mg=mc.getContext('2d',{willReadFrequently:true});mg.drawImage(mask,0,0,w,h);
  var im=sg.getImageData(0,0,w,h),d=im.data,md=mg.getImageData(0,0,w,h).data,N=w*h,need=new Uint8Array(N),known=new Uint8Array(N),orig=new Uint8Array(N);
  var minX=w,minY=h,maxX=-1,maxY=-1,queue=[],head=0,rnd=prng(seed);
  for(var y=0;y<h;y++)for(var x=0;x<w;x++){var i=y*w+x,m=md[i*4+3]>20;if(m){need[i]=1;if(x<minX)minX=x;if(x>maxX)maxX=x;if(y<minY)minY=y;if(y>maxY)maxY=y;}else if(d[i*4+3]>8){known[i]=1;orig[i]=1;}}
  if(maxX<minX)return sc;
  function nearKnown(i,x,y){for(var yy=Math.max(0,y-1);yy<=Math.min(h-1,y+1);yy++)for(var xx=Math.max(0,x-1);xx<=Math.min(w-1,x+1);xx++){var j=yy*w+xx;if(j!==i&&known[j])return true;}return false;}
  for(y=minY;y<=maxY;y++)for(x=minX;x<=maxX;x++){i=y*w+x;if(need[i]&&nearKnown(i,x,y))queue.push(i);}
  var queued=new Uint8Array(N);queue.forEach(function(i){queued[i]=1;});
  var cx=(minX+maxX)/2,cy=(minY+maxY)/2,blend=strategy==='mirror'?.72:strategy==='spread'?.18:.44;
  while(head<queue.length){
    i=queue[head++];if(known[i])continue;x=i%w;y=(i/w)|0;
    var sums=[0,0,0,0],cnt=0;
    for(var yy=Math.max(0,y-1);yy<=Math.min(h-1,y+1);yy++)for(var xx=Math.max(0,x-1);xx<=Math.min(w-1,x+1);xx++){var j=yy*w+xx;if(!known[j])continue;var p=j*4;if(d[p+3]<8)continue;sums[0]+=d[p];sums[1]+=d[p+1];sums[2]+=d[p+2];sums[3]+=d[p+3];cnt++;}
    if(!cnt)continue;
    var sample=-1,mx=Math.round(2*cx-x),my=Math.round(y);
    if(mx>=0&&mx<w&&my>=0&&my<h&&orig[my*w+mx])sample=my*w+mx;
    if(sample<0){for(var a=0;a<12;a++){var rad=6+rnd()*Math.max(18,Math.max(maxX-minX,maxY-minY)*.8),ang=rnd()*Math.PI*2,sx=Math.round(x+Math.cos(ang)*rad),sy=Math.round(y+Math.sin(ang)*rad);if(sx>=0&&sx<w&&sy>=0&&sy<h&&orig[sy*w+sx]){sample=sy*w+sx;break;}}}
    var k=i*4;for(var c=0;c<4;c++){var av=sums[c]/cnt;if(sample>=0){var sv=d[sample*4+c];d[k+c]=clamp(av*(1-blend)+sv*blend,0,255);}else d[k+c]=clamp(av,0,255);}known[i]=1;
    for(yy=Math.max(0,y-1);yy<=Math.min(h-1,y+1);yy++)for(xx=Math.max(0,x-1);xx<=Math.min(w-1,x+1);xx++){j=yy*w+xx;if(need[j]&&!known[j]&&!queued[j]){queued[j]=1;queue.push(j);}}
  }
  sg.putImageData(im,0,0);
  var out=document.createElement('canvas');out.width=src.width;out.height=src.height;out.getContext('2d').drawImage(sc,0,0,out.width,out.height);return out;
}
function patchFromFull(full,mask){
  var p=document.createElement('canvas');p.width=full.width;p.height=full.height;var g=p.getContext('2d');g.drawImage(full,0,0);g.globalCompositeOperation='destination-in';g.drawImage(mask,0,0,p.width,p.height);g.globalCompositeOperation='source-over';return p;
}
async function dataToCanvas(data,w,h){
  var src=String(data||'');if(!src)return null;if(!src.startsWith('data:'))src='data:image/png;base64,'+src;var im=await imageFromDataURL(src),c=document.createElement('canvas');c.width=w||im.width;c.height=h||im.height;c.getContext('2d').drawImage(im,0,0,c.width,c.height);return c;
}
function safeInstruction(){
  var u=val('#repairInstruction','').trim();
  var base='Repair only the user-masked visible region. Preserve the source identity, style, clothing, lighting, pose context and surrounding pixels. For real people, reconstruct only visible neutral or clothing-consistent content; do not infer or generate hidden explicit anatomy.';
  return u?base+' User instruction: '+u:base;
}
async function repairOfflinePayload(payload){
  var im=await imageFromDataURL(payload.image),src=document.createElement('canvas');src.width=im.width;src.height=im.height;src.getContext('2d').drawImage(im,0,0);
  var mm=await imageFromDataURL(payload.mask),mask=document.createElement('canvas');mask.width=src.width;mask.height=src.height;mask.getContext('2d').drawImage(mm,0,0,src.width,src.height);
  var full=offlineFill(src,mask,payload.seed||1,payload.strategy||'auto');return{image:full.toDataURL('image/png'),engine:'offline-local-repair'};
}
async function makePreview(seed){
  var l=selected();if(!l){say(msg('আগে একটি লেয়ার বাছুন।','Select a layer first.'),true);return;}var mask=maskCanvas(l),bounds=maskBounds(mask);if(!bounds){say(msg('আগে মেরামতের জায়গায় মাস্ক আঁকুন।','Paint a repair mask first.'),true);return;}
  var src=sourceCanvas(l),mode=val('#aiMode','offline'),strategy=val('#repairStrategy','auto');setStatus(msg('মেরামতের preview তৈরি হচ্ছে…','Creating repair preview…'));
  try{
    var full,method;
    if(mode==='offline'){full=offlineFill(src,mask,seed,strategy);method='offline-local';}
    else{
      var cfg={url:$('#endpointUrl')?$('#endpointUrl').value.trim():'',token:$('#endpointToken')?$('#endpointToken').value:''};
      var out=await PoseForgeAI.online.repair(cfg,{image:src.toDataURL('image/png'),mask:mask.toDataURL('image/png'),instruction:safeInstruction(),seed:seed,strategy:strategy,projectVersion:1});
      var data=out&& (out.image||out.data_url||out.dataUrl);if(!data)throw new Error('AI response did not include image/data_url.');
      full=await dataToCanvas(data,l.width,l.height);method='online';
    }
    preview={layerId:l.id,mask:mask,patch:patchFromFull(full,mask),bounds:bounds,method:method,seed:seed};setStatus(method==='online'?msg('Online preview তৈরি। Accept/Retry/Cancel বাছুন।','Online preview ready. Choose Accept, Retry, or Cancel.'):msg('Offline local-repair preview তৈরি। বড় missing anatomy-এর জন্য এটা neural generation নয়।','Offline local-repair preview ready. This is not neural generation for large missing anatomy.'));draw();
  }catch(e){setStatus((e&&e.message)||String(e),true);}
}
async function acceptPreview(){
  if(!preview){say(msg('আগে Preview তৈরি করুন।','Create a preview first.'),true);return;}var l=state.layers.find(function(x){return x.id===preview.layerId});if(!l)return;var b=preview.bounds,pad=4,x0=Math.max(0,b.x0-pad),y0=Math.max(0,b.y0-pad),x1=Math.min(l.width,b.x1+pad),y1=Math.min(l.height,b.y1+pad),w=x1-x0,h=y1-y0;
  var crop=document.createElement('canvas');crop.width=w;crop.height=h;crop.getContext('2d').drawImage(preview.patch,x0,y0,w,h,0,0,w,h);var src=crop.toDataURL('image/png'),im=await imageFromDataURL(src),center=localToWorld(l,{x:x0+w/2,y:y0+h/2});
  var part={id:uid('repair'),kind:'part',name:'Repair overlay',src:src,baseSrc:src,width:w,height:h,image:im,...layerDefaults(),x:center.x,y:center.y,rotation:l.rotation,scaleX:l.scaleX,scaleY:l.scaleY,opacity:l.opacity,brightness:l.brightness,contrast:l.contrast,saturation:l.saturation,hue:l.hue,warmth:l.warmth||0,lightIntensity:l.lightIntensity||0,lightAngle:l.lightAngle||315,lightSoftness:l.lightSoftness||65,contactShadow:0,shadow:0,detail:l.detail||0,grain:l.grain||0,ownerId:l.kind==='character'?l.id:(l.ownerId||null),partRole:'repair-overlay',repairOverlay:true,repairMethod:preview.method,repairSourceLayerId:l.id};
  var idx=state.layers.indexOf(l);state.layers.splice(idx+1,0,part);state.selectedId=part.id;preview=null;setRepairMode(false);commit('accept repair preview');say(msg('Repair overlay আলাদা editable layer হিসেবে যোগ হয়েছে।','Repair overlay added as a separate editable layer.'));
}
function cancelPreview(){preview=null;setStatus(msg('Preview বাতিল হয়েছে। Mask রাখা আছে।','Preview cancelled. Mask is kept.'));draw();}
function retry(){retrySeed++;makePreview(retrySeed);}
function setStatus(s,err){var e=$('#repairStudioStatus');if(e){e.textContent=s;e.dataset.error=err?'1':'0';}}
function updateRepairStatus(){var l=selected(),n=l&&l.repairMaskOps?l.repairMaskOps.length:0;if(!preview)setStatus(n?msg(n+'টি mask stroke আছে। Preview চাপুন।',n+' mask stroke(s). Press Preview.'):msg('Mask আঁকা হয়নি।','No repair mask yet.'));}
function scheduleAutoPreview(){clearTimeout(autoTimer);if(!check('#repairAutoPreview',false))return;var l=selected();if(!l||!hasMask(l))return;autoTimer=setTimeout(function(){makePreview(++retrySeed);},650);}
function openRepair(){setRepairMode(true);var tabs=document.querySelectorAll('.tab'),ai=document.querySelector('.tab[data-tab="ai"]');if(ai&&!ai.classList.contains('active'))ai.click();}

function colorStats(im){
  var s=72,c=document.createElement('canvas');c.width=s;c.height=s;var g=c.getContext('2d',{willReadFrequently:true});g.drawImage(im,0,0,s,s);var d=g.getImageData(0,0,s,s).data,n=0,rs=0,gs=0,bs=0,ls=0,l2=0,ss=0;
  for(var i=0;i<d.length;i+=4){if(d[i+3]<24)continue;var r=d[i]/255,gg=d[i+1]/255,b=d[i+2]/255,mx=Math.max(r,gg,b),mn=Math.min(r,gg,b),lum=.2126*r+.7152*gg+.0722*b,sat=mx?((mx-mn)/mx):0;n++;rs+=r;gs+=gg;bs+=b;ls+=lum;l2+=lum*lum;ss+=sat;}
  if(!n)return{r:.5,g:.5,b:.5,l:.5,std:.2,sat:.35};var lm=ls/n;return{r:rs/n,g:gs/n,b:bs/n,l:lm,std:Math.sqrt(Math.max(.0001,l2/n-lm*lm)),sat:ss/n};
}
function harmonyLayer(l,bg,strength){
  var st=colorStats(l.image),k=clamp(strength/100,0,1),bright=clamp(1+(bg.l-st.l)*1.35,.58,1.62),cont=clamp(bg.std/Math.max(.045,st.std),.68,1.42),sat=clamp(bg.sat/Math.max(.06,st.sat),.55,1.5),warm=clamp(((bg.r-bg.b)-(st.r-st.b))*155,-70,70);
  l.brightness=1+(bright-1)*k;l.contrast=1+(cont-1)*k;l.saturation=1+(sat-1)*k;l.warmth=warm*k;
  if(typeof sampleQualityStats==='function'){var bq=sampleQualityStats(state.background.image),q=sampleQualityStats(l.image),edge=bq.edge-q.edge,noise=bq.noise-q.noise;l.detail=clamp(edge*105*k,-10,10);l.grain=clamp(noise*260*k,0,24);}
  l.contactShadow=clamp((18+(1-bg.l)*28)*k,0,55);l.shadow=clamp((8+(1-bg.std)*18)*k,0,32);
}
function harmony(selectedOnly){
  if(!state.background||!state.background.image){say(msg('আগে background দিন।','Add a background first.'),true);return;}var strength=num('#harmonyStrength',75),bg=colorStats(state.background.image),ls=selectedOnly?[selected()].filter(Boolean):state.layers.filter(function(x){return x.kind==='character'||x.kind==='part'});
  ls.forEach(function(l){harmonyLayer(l,bg,strength);});commit(selectedOnly?'scene harmony selected':'scene harmony all');say(msg('আলো, রঙ, sharpness/blur, grain ও shadow scene-এর সাথে মিলানো হয়েছে।','Lighting, color, sharpness/blur, grain, and shadows were harmonized to the scene.'));
}
function drawRepairOverlay(){
  var l=selected();if(!l)return;var mask=(repairMode||l.repairMaskOps&&l.repairMaskOps.length)?maskCanvas(l):null;
  ctx.save();ctx.translate(l.x,l.y);ctx.rotate((l.rotation||0)*Math.PI/180);ctx.scale(l.scaleX||1,l.scaleY||1);
  if(mask){ctx.globalAlpha=.28;ctx.fillStyle='#ff725e';ctx.drawImage(mask,-l.width/2,-l.height/2,l.width,l.height);}
  if(preview&&preview.layerId===l.id){ctx.globalAlpha=.88;ctx.drawImage(preview.patch,-l.width/2,-l.height/2,l.width,l.height);}
  ctx.restore();
}
function mount(){
  var mainRepair=$('#repairBtn');if(mainRepair&&!mainRepair.dataset.v14){mainRepair.dataset.v14='1';mainRepair.addEventListener('click',function(e){e.preventDefault();e.stopImmediatePropagation();openRepair();},true);}
  var paint=$('#repairPaintBtn');if(paint&&!paint.dataset.v14){paint.dataset.v14='1';paint.addEventListener('click',function(){setRepairMode(!repairMode)});}
  [['repairPreviewBtn',function(){makePreview(retrySeed)}],['repairRetryBtn',retry],['repairAcceptBtn',acceptPreview],['repairCancelBtn',cancelPreview],['repairClearMaskBtn',clearMask],['harmonySelectedBtn',function(){harmony(true)}],['harmonyAllBtn',function(){harmony(false)}]].forEach(function(x){var e=$(x[0]);if(e&&!e.dataset.v14){e.dataset.v14='1';e.addEventListener('click',x[1]);}});
  var bs=$('#repairBrushSize');if(bs&&!bs.dataset.v14){bs.dataset.v14='1';bs.addEventListener('input',function(){if($('#repairBrushSizeOut'))$('#repairBrushSizeOut').textContent=bs.value+'px';});}
  var hs=$('#harmonyStrength');if(hs&&!hs.dataset.v14){hs.dataset.v14='1';hs.addEventListener('input',function(){if($('#harmonyStrengthOut'))$('#harmonyStrengthOut').textContent=hs.value+'%';});}
  var off=$('#offlineStatus');if(off&&/Ready:/.test(off.textContent)&&!off.textContent.includes('repair'))off.textContent=off.textContent+' + local repair';
  updateRepairStatus();
}
var draw0=draw;draw=function(){draw0();drawRepairOverlay();};
var render0=renderUI;renderUI=function(){render0();mount();if(window.PoseForgeI18n&&PoseForgeI18n.localizeTree)PoseForgeI18n.localizeTree(document.body);};
window.addEventListener('poseforge-language',function(){setTimeout(mount,0);});
window.PoseForgeRepairStudio={open:openRepair,setRepairMode:setRepairMode,preview:makePreview,accept:acceptPreview,cancel:cancelPreview,offlineRepairPayload:repairOfflinePayload,harmony:harmony};
mount();
})();