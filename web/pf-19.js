/* PoseForge 2D v0.15 Object Studio + Human/Object Interaction */
(function(){
'use strict';

var picking=false, updating=false;
var bn=function(b,e){return window.PoseForgeI18n&&PoseForgeI18n.lang&&PoseForgeI18n.lang()==='bn'?b:e;};
var objects=function(){return state.layers.filter(function(l){return l.kind==='object';});};
var people=function(){return typeof chars==='function'?chars():state.layers.filter(function(l){return l.kind==='character';});};
var pose=function(l){return l&&l.aiAnalysis&&l.aiAnalysis.poses&&l.aiAnalysis.poses[0]||null;};
var posePt=function(l,i){var p=pose(l)&&pose(l)[i];return p?{x:p.x*l.width,y:p.y*l.height}:null;};
var regs=function(l){return window.PoseForgeBodyRegions&&PoseForgeBodyRegions.bodyRegions?PoseForgeBodyRegions.bodyRegions(l):null;};
var joint={lShoulder:11,rShoulder:12,lElbow:13,rElbow:14,lHand:15,rHand:16,lHip:23,rHip:24,lKnee:25,rKnee:26,lFoot:27,rFoot:28};
var chainRoot={lHand:13,rHand:14,lFoot:25,rFoot:26,lElbow:11,rElbow:12,lKnee:23,rKnee:24};
var sourceDepth={lHand:['lHand'],rHand:['rHand'],lElbow:['lForearm','lHand'],rElbow:['rForearm','rHand'],lFoot:['lFoot'],rFoot:['rFoot'],lKnee:['lLowerLeg','lFoot'],rKnee:['rLowerLeg','rFoot']};

function v(id,d){var e=$(id);return e&&e.value!=null?e.value:d;}
function n(id,d){return Number(v(id,d));}
function ck(id,d){var e=$(id);return e?!!e.checked:!!d;}
function commit(label){pushHistory(label);renderUI();draw();autoSave();}
function selectedObject(){var s=$('#objectTarget'),id=s&&s.value;return state.layers.find(function(l){return l.id===id&&l.kind==='object';})||(selected()&&selected().kind==='object'?selected():null);}
function selectedPerson(){var s=$('#objectCharacter'),id=s&&s.value;return state.layers.find(function(l){return l.id===id&&l.kind==='character';})||(selected()&&selected().kind==='character'?selected():null);}
function localGrip(o){
  var px=n('#objectGripX',0),py=n('#objectGripY',0);
  return{x:o.width*(.5+px/100),y:o.height*(.5+py/100)};
}
function anchorLocal(c,k){
  if(joint[k]!=null){var p=posePt(c,joint[k]);if(p)return p;}
  var r=regs(c)&&regs(c)[k];return r?{x:r.cx,y:r.cy}:{x:c.width/2,y:c.height/2};
}
function anchorWorld(c,k){return localToWorld(c,anchorLocal(c,k));}
function anchorAngle(c,k){
  if(joint[k]!=null&&chainRoot[k]!=null){var a=posePt(c,chainRoot[k]),b=posePt(c,joint[k]);if(a&&b){var aw=localToWorld(c,a),bw=localToWorld(c,b);return Math.atan2(bw.y-aw.y,bw.x-aw.x)*180/Math.PI;}}
  if(k==='chest'||k==='waist'||k==='hips'){var l=posePt(c,k==='hips'?23:11),r=posePt(c,k==='hips'?24:12);if(l&&r){var lw=localToWorld(c,l),rw=localToWorld(c,r);return Math.atan2(rw.y-lw.y,rw.x-lw.x)*180/Math.PI;}}
  return c.rotation||0;
}
function placeGripAt(o,local,world){
  var rad=(o.rotation||0)*Math.PI/180,sx=o.scaleX||1,sy=o.scaleY||1,dx=(local.x-o.width/2)*sx,dy=(local.y-o.height/2)*sy;
  var rx=dx*Math.cos(rad)-dy*Math.sin(rad),ry=dx*Math.sin(rad)+dy*Math.cos(rad);o.x=world.x-rx;o.y=world.y-ry;
}
async function addObjectData(src,name){
  var im=await imageFromDataURL(src),maxDim=Math.min(canvas.width*.62,canvas.height*.62),s=Math.min(1,maxDim/Math.max(im.width,im.height));
  var o={id:uid('obj'),kind:'object',name:name||'Object',src:src,baseSrc:src,originalSrc:src,width:im.width,height:im.height,image:im,...layerDefaults(),scaleX:s,scaleY:s,ownerId:null,partRole:null,objectPrepared:false,objectLinks:[]};
  state.layers.push(o);state.selectedId=o.id;commit('add object');say(bn('বস্তু Studio-তে যোগ হয়েছে।','Object added to Studio.'));return o;
}
async function objectInputChange(){
  var input=$('#objectInput'),f=input&&input.files&&input.files[0];if(!f)return;
  try{var src=await readFileDataURL(f);await addObjectData(src,f.name.replace(/\.[^.]+$/,''));}
  catch(e){say((e&&e.message)||String(e),true);}finally{input.value='';}
}

function colorDist(d,i,c){var dr=d[i]-c[0],dg=d[i+1]-c[1],db=d[i+2]-c[2];return Math.sqrt(dr*dr+dg*dg+db*db);}
function edgeCutoutCanvas(o,threshold){
  var max=720,sc=Math.min(1,max/Math.max(o.width,o.height)),w=Math.max(4,Math.round(o.width*sc)),h=Math.max(4,Math.round(o.height*sc));
  var c=document.createElement('canvas');c.width=w;c.height=h;var g=c.getContext('2d',{willReadFrequently:true});g.drawImage(o.image,0,0,w,h);
  var im=g.getImageData(0,0,w,h),d=im.data,N=w*h,bg=new Uint8Array(N),seen=new Uint8Array(N),q=[],head=0;
  function rgb(x,y){var i=(y*w+x)*4;return[d[i],d[i+1],d[i+2]];}
  var refs=[rgb(0,0),rgb(w-1,0),rgb(0,h-1),rgb(w-1,h-1),rgb((w/2)|0,0),rgb((w/2)|0,h-1),rgb(0,(h/2)|0),rgb(w-1,(h/2)|0)];
  function qualifies(i){if(d[i*4+3]<12)return true;var best=999;for(var k=0;k<refs.length;k++)best=Math.min(best,colorDist(d,i*4,refs[k]));return best<=threshold;}
  function seed(x,y){var i=y*w+x;if(!seen[i]&&qualifies(i)){seen[i]=1;q.push(i);}}
  for(var x=0;x<w;x++){seed(x,0);seed(x,h-1);}for(var y=1;y<h-1;y++){seed(0,y);seed(w-1,y);}
  while(head<q.length){var i=q[head++];bg[i]=1;var x=i%w,y=(i/w)|0,nb=[[x-1,y],[x+1,y],[x,y-1],[x,y+1]];for(var z=0;z<4;z++){var xx=nb[z][0],yy=nb[z][1];if(xx<0||yy<0||xx>=w||yy>=h)continue;var j=yy*w+xx;if(!seen[j]&&qualifies(j)){seen[j]=1;q.push(j);}}}
  var m=document.createElement('canvas');m.width=w;m.height=h;var mg=m.getContext('2d'),mi=mg.createImageData(w,h);
  for(i=0;i<N;i++){var a=bg[i]?0:255,ii=i*4;mi.data[ii]=mi.data[ii+1]=mi.data[ii+2]=255;mi.data[ii+3]=a;}mg.putImageData(mi,0,0);
  var full=document.createElement('canvas');full.width=o.width;full.height=o.height;var fg=full.getContext('2d');fg.drawImage(o.image,0,0,o.width,o.height);fg.globalCompositeOperation='destination-in';fg.filter='blur(1.2px)';fg.drawImage(m,0,0,o.width,o.height);fg.filter='none';fg.globalCompositeOperation='source-over';return full;
}
async function prepareObject(){
  var o=selectedObject();if(!o){say(bn('একটি object বাছুন।','Choose an object.'),true);return;}
  if(!o.originalSrc)o.originalSrc=o.src;
  var out=edgeCutoutCanvas(o,n('#objectCutoutThreshold',46));o.src=out.toDataURL('image/png');o.image=await imageFromDataURL(o.src);o.objectPrepared=true;
  if(typeof invalidateLayerPixels==='function')invalidateLayerPixels(o);commit('object edge cutout');say(bn('Edge-connected background সরানো হয়েছে। দরকার হলে Precision Mask দিয়ে ঠিক করুন।','Edge-connected background removed. Refine with Precision Mask if needed.'));
}
async function restoreObject(){
  var o=selectedObject();if(!o||!o.originalSrc)return;o.src=o.originalSrc;o.image=await imageFromDataURL(o.src);o.objectPrepared=false;if(typeof invalidateLayerPixels==='function')invalidateLayerPixels(o);commit('restore object original');
}

function moveRelative(o,c,front){
  if(!o||!c)return;state.layers=state.layers.filter(function(x){return x.id!==o.id;});
  var fam=[c].concat(state.layers.filter(function(x){return x.ownerId===c.id&&!x.semanticDepthPass;})),inds=fam.map(function(x){return state.layers.findIndex(function(y){return y.id===x.id;});}).filter(function(i){return i>=0;});
  var at=inds.length?(front?Math.max.apply(null,inds)+1:Math.min.apply(null,inds)):state.layers.length;state.layers.splice(Math.max(0,at),0,o);
}
async function smartGripDepth(){
  var o=selectedObject(),c=selectedPerson();if(!o||!c)return;moveRelative(o,c,true);
  var hands=[];if(ck('#objectUseLeft',true))hands.push('lHand');if(ck('#objectUseRight',true))hands.push('rHand');
  if(hands.length&&window.PoseForgeV011&&PoseForgeV011.addDepth){
    var old=state.selectedId;state.selectedId=c.id;try{await PoseForgeV011.addDepth('front',hands,o);}catch(e){}state.selectedId=old&&state.layers.some(function(x){return x.id===old;})?old:o.id;
  }
  commit('object grip depth');
}
function objectBehind(){var o=selectedObject(),c=selectedPerson();if(!o||!c)return;moveRelative(o,c,false);commit('object behind character');}
function objectFront(){var o=selectedObject(),c=selectedPerson();if(!o||!c)return;moveRelative(o,c,true);commit('object front character');}

function makeContact(c,o,source,ox,oy){
  return{id:uid('objcontact'),sourceKey:source,targetId:o.id,targetKey:'objectCenter',ox:ox,oy:oy,strength:n('#objectContactStrength',100),autoReach:ck('#objectAutoReach',true),live:true,depth:'keep',on:true,objectContact:true};
}
function clearObjectContacts(c,o,sources){
  c.interactionContacts=c.interactionContacts||[];c.interactionContacts=c.interactionContacts.filter(function(x){return !(x.objectContact&&x.targetId===o.id&&(!sources||sources.indexOf(x.sourceKey)>=0));});
}
function addBodyToObject(two){
  var c=selectedPerson(),o=selectedObject();if(!c||!o){say(bn('Character আর Object দুটোই বাছুন।','Choose both a character and an object.'),true);return;}
  if(!pose(c)){say(bn('এই interaction-এর আগে character Analyze করুন।','Analyze the character before this interaction.'),true);return;}
  var g=localGrip(o),span=o.width*n('#objectGripSpan',38)/100,src=v('#objectBodyAnchor','rHand');
  if(two){
    clearObjectContacts(c,o,['lHand','rHand']);c.interactionContacts.push(makeContact(c,o,'lHand',g.x-o.width/2-span/2,g.y-o.height/2));c.interactionContacts.push(makeContact(c,o,'rHand',g.x-o.width/2+span/2,g.y-o.height/2));
  }else{
    clearObjectContacts(c,o,[src]);c.interactionContacts.push(makeContact(c,o,src,g.x-o.width/2,g.y-o.height/2));
  }
  if(window.PoseForgeV012&&PoseForgeV012.solveAll)PoseForgeV012.solveAll();commit(two?'two hand object grasp':'body to object contact');
  say(two?bn('দুই হাত object-এর grip point-এ solve করা হয়েছে।','Both hands were solved to the object grip points.'):bn('Body-part ↔ object contact যোগ হয়েছে।','Body-part ↔ object contact added.'));
}
function releaseBodyObject(){
  var c=selectedPerson(),o=selectedObject();if(!c||!o)return;clearObjectContacts(c,o,null);commit('release object contacts');
}

function nearestHandIndex(c,poseIndex){
  var wrist=posePt(c,poseIndex),hands=c.aiAnalysis&&c.aiAnalysis.hands||[];if(!wrist||!hands.length)return-1;var best=-1,bd=1e9;
  hands.forEach(function(h,idx){var q=h&&h.landmarks&&h.landmarks[0];if(!q)return;var x=q.x*c.width,y=q.y*c.height,d=Math.hypot(x-wrist.x,y-wrist.y);if(d<bd){bd=d;best=idx;}});
  return best;
}
function fitHandToObject(c,o,side){
  var poseIndex=side==='l'?15:16,hi=nearestHandIndex(c,poseIndex);if(hi<0)return false;
  var lm=c.aiAnalysis.hands[hi].landmarks||[],gripW=localToWorld(o,localGrip(o)),grip=worldToLocal(c,gripW),w=lm[0]?{x:lm[0].x*c.width,y:lm[0].y*c.height}:posePt(c,poseIndex);if(!w)return false;
  if(!c.mesh)createMeshForLayer(c,9);
  var chains=[[1,2,3,4],[5,6,7,8],[9,10,11,12],[13,14,15,16],[17,18,19,20]],spread=Math.max(7,Math.min(o.width*Math.abs(o.scaleX||1),o.height*Math.abs(o.scaleY||1))*.035);
  var dx=grip.x-w.x,dy=grip.y-w.y,len=Math.hypot(dx,dy)||1,nx=-dy/len,ny=dx/len;
  chains.forEach(function(chain,ci){var lane=(ci-2)*spread*.48;chain.forEach(function(idx,j){var q=lm[idx];if(!q)return;var before={x:q.x*c.width,y:q.y*c.height},t=(j+1)/chain.length,curve=.30+.48*t,target={x:w.x+dx*(.35+.50*t)+nx*lane*(1-.35*t),y:w.y+dy*(.35+.50*t)+ny*lane*(1-.35*t)},after={x:before.x+(target.x-before.x)*curve,y:before.y+(target.y-before.y)*curve};applySoftMeshDelta(c,before,after.x-before.x,after.y-before.y,Math.max(10,Math.min(c.width,c.height)*.028),.48);q.x=clamp(after.x/c.width,0,1);q.y=clamp(after.y/c.height,0,1);});});
  c.meshRev=(c.meshRev||0)+1;if(typeof meshRenderCache!=='undefined')meshRenderCache.delete(c);return true;
}
function fitGripFingers(){
  var c=selectedPerson(),o=selectedObject();if(!c||!o){say(bn('Character আর Object দুটোই বাছুন।','Choose both a character and an object.'),true);return;}
  if(!c.aiAnalysis||!(c.aiAnalysis.hands||[]).length){say(bn('আঙুল মানাতে আগে Hand/Body Analyze চালান।','Run Hand/Body Analyze before fitting fingers.'),true);return;}
  var useL=ck('#objectUseLeft',true),useR=ck('#objectUseRight',true),ok=false;if(useL)ok=fitHandToObject(c,o,'l')||ok;if(useR)ok=fitHandToObject(c,o,'r')||ok;
  if(!ok){say(bn('হাতের landmark grip-এর সাথে মেলানো যায়নি।','Hand landmarks could not be matched to the grip.'),true);return;}commit('v0.15 approximate finger grip');say(bn('Grip point অনুযায়ী আঙুলগুলো আনুমানিকভাবে wrap করা হয়েছে।','Fingers were approximately wrapped toward the grip point.'));
}

function attachObject(two){
  var c=selectedPerson(),o=selectedObject();if(!c||!o){say(bn('Character আর Object দুটোই বাছুন।','Choose both a character and an object.'),true);return;}
  if(!pose(c)){say(bn('Object follow-এর আগে character Analyze করুন।','Analyze the character before object follow.'),true);return;}
  var anchor=v('#objectBodyAnchor','rHand'),gp=localGrip(o),link={characterId:c.id,mode:two?'two':'single',anchor:anchor,gripX:n('#objectGripX',0),gripY:n('#objectGripY',0),span:n('#objectGripSpan',38),rotate:ck('#objectFollowRotation',true),scale:two&&ck('#objectFollowScale',false),enabled:true};
  if(two){var a=anchorWorld(c,'lHand'),b=anchorWorld(c,'rHand');link.baseHandDistance=Math.max(1,Math.hypot(b.x-a.x,b.y-a.y));link.baseScaleX=o.scaleX;link.baseScaleY=o.scaleY;link.angleOffset=(o.rotation||0)-Math.atan2(b.y-a.y,b.x-a.x)*180/Math.PI;}
  else{link.angleOffset=(o.rotation||0)-anchorAngle(c,anchor);}
  o.objectBodyLink=link;updateOneLink(o,true);commit(two?'object two hand follow':'object body follow');
}
function releaseAttach(){var o=selectedObject();if(!o)return;delete o.objectBodyLink;commit('release object body follow');}
function updateOneLink(o,force){
  var l=o.objectBodyLink;if(!l||l.enabled===false)return;var c=state.layers.find(function(x){return x.id===l.characterId&&x.kind==='character';});if(!c||!pose(c))return;
  if(l.mode==='two'){
    var a=anchorWorld(c,'lHand'),b=anchorWorld(c,'rHand'),mid={x:(a.x+b.x)/2,y:(a.y+b.y)/2},ang=Math.atan2(b.y-a.y,b.x-a.x)*180/Math.PI;
    if(l.rotate)o.rotation=ang+(l.angleOffset||0);
    if(l.scale){var f=Math.max(.35,Math.min(3,Math.hypot(b.x-a.x,b.y-a.y)/(l.baseHandDistance||1)));o.scaleX=(l.baseScaleX||o.scaleX)*f;o.scaleY=(l.baseScaleY||o.scaleY)*f;}
    var local={x:o.width/2,y:o.height*(.5+(l.gripY||0)/100)};placeGripAt(o,local,mid);
  }else{
    var w=anchorWorld(c,l.anchor||'rHand');if(l.rotate)o.rotation=anchorAngle(c,l.anchor||'rHand')+(l.angleOffset||0);
    var local={x:o.width*(.5+(l.gripX||0)/100),y:o.height*(.5+(l.gripY||0)/100)};placeGripAt(o,local,w);
  }
}
function updateLinks(){if(updating)return;updating=true;try{objects().forEach(function(o){updateOneLink(o,false);});}finally{updating=false;}}

function pressBody(){
  var o=selectedObject(),c=selectedPerson();if(!o||!c)return;var key=v('#objectPressRegion','abdomen'),r=regs(c)&&regs(c)[key];if(!r){say(bn('Target body region পাওয়া যায়নি।','Target body region is unavailable.'),true);return;}
  if(!c.mesh)createMeshForLayer(c,9);var p={x:r.cx,y:r.cy},pw=localToWorld(c,p),ow={x:o.x,y:o.y},vx=pw.x-ow.x,vy=pw.y-ow.y,len=Math.hypot(vx,vy)||1,amount=n('#objectPressure',16),end=worldToLocal(c,{x:pw.x+vx/len*amount,y:pw.y+vy/len*amount}),dx=end.x-p.x,dy=end.y-p.y,rad=Math.max(24,(r.rx+r.ry)*.68);
  applySoftMeshDelta(c,p,dx,dy,rad,.8);if(window.PoseForgeV010&&PoseForgeV010.applyDirectionalAreaLock)PoseForgeV010.applyDirectionalAreaLock(c,r,dx*.65,dy*.65,'push');c.meshRev=(c.meshRev||0)+1;if(typeof meshRenderCache!=='undefined')meshRenderCache.delete(c);
  commit('object soft body pressure');say(bn('Object contact জায়গায় local soft-tissue response দেওয়া হয়েছে।','Local soft-tissue response applied at the object contact area.'));
}

function pickPoint(on){
  picking=!!on;var b=$('#objectPickPointBtn');if(b){b.classList.toggle('active-tool',picking);b.textContent=picking?bn('পয়েন্ট বাছা বন্ধ','Stop picking point'):bn('Object-এ grip point বাছুন','Pick grip point on object');}
  if(picking&&$('#toolStatus'))$('#toolStatus').textContent=bn('Object-এর যে জায়গায় ধরতে চান সেখানে ট্যাপ করুন','Tap the desired grip/contact point on the object');
}
canvas.addEventListener('pointerdown',function(e){
  if(!picking)return;var o=selectedObject();if(!o)return;e.preventDefault();e.stopImmediatePropagation();var p=worldToLocal(o,screenToCanvas(e));if(p.x<0||p.y<0||p.x>o.width||p.y>o.height)return;
  var gx=Math.round((p.x/o.width-.5)*100),gy=Math.round((p.y/o.height-.5)*100);$('#objectGripX').value=gx;$('#objectGripY').value=gy;$('#objectGripXOut').textContent=gx+'%';$('#objectGripYOut').textContent=gy+'%';pickPoint(false);
},true);

async function saveObject(){
  var o=selectedObject();if(!o){say(bn('একটি object বাছুন।','Choose an object.'),true);return;}var item={id:uid('libobj'),name:v('#objectLibraryName',o.name)||o.name,time:Date.now(),layer:cloneLayerForJSON(o)};await dbPut('objects',item);await renderObjectLibrary();say(bn('Object Library-তে সংরক্ষণ হয়েছে।','Object saved to Object Library.'));
}
async function renderObjectLibrary(){
  var root=$('#objectLibrary');if(!root)return;root.innerHTML='';var all=(await dbAll('objects')).sort(function(a,b){return b.time-a.time;});
  all.forEach(function(it){var d=document.createElement('div');d.className='library-entry';var s=document.createElement('span');s.textContent=it.name;var add=document.createElement('button');add.className='mini';add.textContent=bn('যোগ','Add');add.onclick=async function(){var raw=it.layer,nw={...raw,id:uid('obj'),name:raw.name||it.name,x:(raw.x||canvas.width/2)+35,y:(raw.y||canvas.height/2)+35};nw.image=await imageFromDataURL(nw.src);delete nw.objectBodyLink;state.layers.push(nw);state.selectedId=nw.id;commit('add object from library');};var del=document.createElement('button');del.className='mini';del.textContent='×';del.onclick=async function(){await dbDelete('objects',it.id);renderObjectLibrary();};d.append(s,add,del);root.append(d);});
}
function refill(){
  var os=$('#objectTarget'),cs=$('#objectCharacter');if(os){var cur=os.value;os.innerHTML='<option value="">'+bn('Object বাছুন','Choose object')+'</option>';objects().forEach(function(o){var x=document.createElement('option');x.value=o.id;x.textContent=o.name;os.append(x);});if(Array.from(os.options).some(function(x){return x.value===cur}))os.value=cur;else if(selected()&&selected().kind==='object')os.value=selected().id;}
  if(cs){var cur2=cs.value;cs.innerHTML='<option value="">'+bn('Character বাছুন','Choose character')+'</option>';people().forEach(function(c){var x=document.createElement('option');x.value=c.id;x.textContent=c.name;cs.append(x);});if(Array.from(cs.options).some(function(x){return x.value===cur2}))cs.value=cur2;else if(selected()&&selected().kind==='character')cs.value=selected().id;}
  if($('#objectCount'))$('#objectCount').textContent=objects().length+' object(s)';
  var o=selectedObject(),status=$('#objectLinkStatus');if(status)status.textContent=o&&o.objectBodyLink?bn('Object body-follow চালু','Object body-follow active'):bn('কোনো object follow নেই','No object follow');
}
function overlay(){
  var o=selectedObject();if(!o)return;var p=localGrip(o),w=localToWorld(o,p);ctx.save();ctx.lineWidth=2/zoom;ctx.strokeStyle='rgba(255,190,92,.95)';ctx.fillStyle='rgba(255,190,92,.9)';ctx.beginPath();ctx.arc(w.x,w.y,8/zoom,0,Math.PI*2);ctx.fill();ctx.stroke();ctx.restore();
}
function mount(){
  var input=$('#objectInput');if(input&&!input.dataset.v15){input.dataset.v15='1';input.addEventListener('change',objectInputChange);}
  [['objectPrepareBtn',prepareObject],['objectRestoreBtn',restoreObject],['objectPickPointBtn',function(){pickPoint(!picking)}],['objectContactBtn',function(){addBodyToObject(false)}],['objectTwoHandBtn',function(){addBodyToObject(true)}],['objectReleaseContactBtn',releaseBodyObject],['objectFitFingersBtn',fitGripFingers],['objectFollowBtn',function(){attachObject(false)}],['objectTwoHandFollowBtn',function(){attachObject(true)}],['objectReleaseFollowBtn',releaseAttach],['objectGripDepthBtn',smartGripDepth],['objectFrontBtn',objectFront],['objectBehindBtn',objectBehind],['objectPressureBtn',pressBody],['saveObjectBtn',saveObject]].forEach(function(p){var e=$(p[0]);if(e&&!e.dataset.v15){e.dataset.v15='1';e.addEventListener('click',p[1]);}});
  ['objectGripX','objectGripY','objectGripSpan','objectCutoutThreshold','objectContactStrength','objectPressure'].forEach(function(id){var e=$(id);if(e&&!e.dataset.v15o){e.dataset.v15o='1';e.addEventListener('input',function(){var out=$(id+'Out');if(out)out.textContent=e.value+(id==='objectCutoutThreshold'?'':id==='objectPressure'?'px':'%');});}});
  refill();renderObjectLibrary();
}
var draw0=draw;draw=function(){updateLinks();draw0();overlay();};
var render0=renderUI;renderUI=function(){render0();mount();refill();if(window.PoseForgeI18n&&PoseForgeI18n.localizeTree)PoseForgeI18n.localizeTree(document.body);};
window.addEventListener('poseforge-language',function(){setTimeout(function(){refill();renderObjectLibrary();},0);});
window.PoseForgeV015={objects:objects,addObjectData:addObjectData,prepareObject:prepareObject,addBodyToObject:addBodyToObject,attachObject:attachObject,pressBody:pressBody,fitGripFingers:fitGripFingers,updateLinks:updateLinks};
mount();
})();