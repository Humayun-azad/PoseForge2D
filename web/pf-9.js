const POSE_LINKS=[[0,1],[1,2],[2,3],[3,7],[0,4],[4,5],[5,6],[6,8],[9,10],[11,12],[11,13],[13,15],[15,17],[15,19],[15,21],[17,19],[12,14],[14,16],[16,18],[16,20],[16,22],[18,20],[11,23],[12,24],[23,24],[23,25],[24,26],[25,27],[26,28],[27,29],[28,30],[29,31],[30,32],[27,31],[28,32]];
const HAND_LINKS=[[0,1],[1,2],[2,3],[3,4],[0,5],[5,6],[6,7],[7,8],[5,9],[9,10],[10,11],[11,12],[9,13],[13,14],[14,15],[15,16],[13,17],[17,18],[18,19],[19,20],[0,17]];
function aiPointToWorld(layer,p){return localToWorld(layer,{x:p.x*layer.width,y:p.y*layer.height});}
function drawLandmarkSet(layer,pts,links,stroke,point){
 if(!pts?.length)return;
 ctx.save();ctx.lineWidth=2.2/zoom;ctx.strokeStyle=stroke;ctx.fillStyle=point;
 for(const [a,b] of links){if(!pts[a]||!pts[b])continue;const A=aiPointToWorld(layer,pts[a]),B=aiPointToWorld(layer,pts[b]);ctx.beginPath();ctx.moveTo(A.x,A.y);ctx.lineTo(B.x,B.y);ctx.stroke();}
 for(const p of pts){const q=aiPointToWorld(layer,p);ctx.beginPath();ctx.arc(q.x,q.y,3.8/zoom,0,Math.PI*2);ctx.fill();}
 ctx.restore();
}
function drawAiOverlay(){
 for(const l of state.layers){
  if(!l.visible||!l.aiAnalysis)continue;
  const a=l.aiAnalysis;
  if(a.poses?.[0])drawLandmarkSet(l,a.poses[0],POSE_LINKS,'rgba(69,214,181,.95)','rgba(255,255,255,.95)');
  if(a.hands)for(const h of a.hands)drawLandmarkSet(l,h.landmarks,HAND_LINKS,'rgba(255,199,89,.95)','rgba(255,245,210,.95)');
  if(a.faces?.[0]?.landmarks){
    const pts=a.faces[0].landmarks;
    ctx.save();ctx.fillStyle='rgba(119,177,255,.8)';
    for(let i=0;i<pts.length;i+=6){const q=aiPointToWorld(l,pts[i]);ctx.beginPath();ctx.arc(q.x,q.y,1.7/zoom,0,Math.PI*2);ctx.fill();}
    ctx.restore();
  }
 }
}
window.drawAiOverlay=drawAiOverlay;

function bodyRegionsFromPose(points){
 if(!points||points.length<33)return [];
 const P=i=>points[i];
 const reg=[];
 const add=(name,idx,pad=.08)=>{const ps=idx.map(P).filter(Boolean);if(!ps.length)return;let x0=Math.min(...ps.map(p=>p.x)),x1=Math.max(...ps.map(p=>p.x)),y0=Math.min(...ps.map(p=>p.y)),y1=Math.max(...ps.map(p=>p.y));const w=x1-x0,h=y1-y0;x0-=Math.max(w,pad)*.35;y0-=Math.max(h,pad)*.35;x1+=Math.max(w,pad)*.35;y1+=Math.max(h,pad)*.35;reg.push({name,x0:clamp(x0,0,1),y0:clamp(y0,0,1),x1:clamp(x1,0,1),y1:clamp(y1,0,1)});};
 add('Head',[0,1,2,3,4,5,6,7,8,9,10],.14);
 add('Torso',[11,12,23,24],.12);
 add('Left arm',[11,13,15,17,19,21],.08);
 add('Right arm',[12,14,16,18,20,22],.08);
 add('Left leg',[23,25,27,29,31],.09);
 add('Right leg',[24,26,28,30,32],.09);
 return reg;
}
async function extractRectPart(owner,reg){
 const x=Math.floor(reg.x0*owner.width),y=Math.floor(reg.y0*owner.height),w=Math.max(2,Math.ceil((reg.x1-reg.x0)*owner.width)),h=Math.max(2,Math.ceil((reg.y1-reg.y0)*owner.height));
 const c=document.createElement('canvas');c.width=w;c.height=h;c.getContext('2d').drawImage(owner.image,x,y,w,h,0,0,w,h);
 const src=c.toDataURL('image/png'),im=await imageFromDataURL(src),center=localToWorld(owner,{x:x+w/2,y:y+h/2});
 return {id:uid('part'),kind:'part',name:reg.name,src,baseSrc:src,width:w,height:h,image:im,...layerDefaults(),x:center.x,y:center.y,rotation:owner.rotation,scaleX:owner.scaleX,scaleY:owner.scaleY,brightness:owner.brightness,contrast:owner.contrast,saturation:owner.saturation,hue:owner.hue,warmth:owner.warmth,lightIntensity:owner.lightIntensity,lightAngle:owner.lightAngle,lightSoftness:owner.lightSoftness,contactShadow:owner.contactShadow,shadow:owner.shadow,ownerId:owner.id,partRole:reg.name,groupId:owner.groupId};
}
async function autoCreateBodyParts(){
 const l=selected(); if(!l||l.kind!=='character'||!l.aiAnalysis?.poses?.[0]){say('Run Offline Analyze on a base character first.',true);return;}
 const regs=bodyRegionsFromPose(l.aiAnalysis.poses[0]); if(!regs.length){say('No usable body pose found.',true);return;}
 const idx=state.layers.indexOf(l); const parts=[]; for(const r of regs)parts.push(await extractRectPart(l,r));
 state.layers.splice(idx+1,0,...parts); state.selectedId=parts[0]?.id||l.id; pushHistory('AI body parts');renderUI();draw();autoSave();say('AI created editable head, torso, arm and leg layers.');
}
window.autoCreateBodyParts=autoCreateBodyParts;

(async()=>{try{const s=await PoseForgeAI.offline.status();$('#offlineStatus').textContent=s.ready?'Ready: pose + face + hands + multiclass segmentation':(s.reason||'Offline AI unavailable');}catch(e){$('#offlineStatus').textContent='Offline AI status unavailable';}})();
