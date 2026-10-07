/* PoseForge 2D v0.9 character preparation + easy occlusion/front-pass tools */
(function(){
  'use strict';

  function lang(){return window.PoseForgeI18n?.lang?.()||'bn';}
  function msg(bn,en){return lang()==='bn'?bn:en;}
  function ownerFor(layer){
    return typeof personOwner==='function'?personOwner(layer):(layer?.kind==='character'?layer:state.layers.find(x=>x.id===layer?.ownerId)||layer);
  }
  function commit(label){pushHistory(label);renderUI();draw();autoSave();}

  async function applyPersonMask(layer,maskSrc){
    if(!layer||!maskSrc)return false;
    if(!layer.originalSrc)layer.originalSrc=layer.baseSrc||layer.src;
    const mask=await imageFromDataURL(maskSrc);
    const c=document.createElement('canvas');c.width=layer.width;c.height=layer.height;
    const g=c.getContext('2d');g.drawImage(layer.image,0,0,layer.width,layer.height);
    g.globalCompositeOperation='destination-in';g.drawImage(mask,0,0,layer.width,layer.height);g.globalCompositeOperation='source-over';
    layer.src=c.toDataURL('image/png');layer.image=await imageFromDataURL(layer.src);layer.backgroundRemoved=true;
    if(typeof invalidateLayerPixels==='function')invalidateLayerPixels(layer);
    return true;
  }

  async function prepareCharacter(layer,quiet=false){
    const owner=ownerFor(layer);
    if(!owner||owner.kind!=='character'){if(!quiet)say(msg('আগে একটি চরিত্র বাছুন।','Select a character first.'),true);return false;}
    try{
      let analysis=owner.aiAnalysis;
      if(!analysis?.segmentation?.classMasks?.person){
        analysis=await PoseForgeAI.offline.analyze({image:owner.originalSrc||owner.src});
        owner.aiAnalysis=analysis;
      }
      const mask=analysis?.segmentation?.classMasks?.person;
      if(!mask)throw new Error(msg('মানুষ আলাদা করার মাস্ক পাওয়া যায়নি।','Person segmentation mask was not available.'));
      await applyPersonMask(owner,mask);
      if(!quiet){commit('prepare transparent character');say(msg('চরিত্রের পুরোনো ব্যাকগ্রাউন্ড সরানো হয়েছে।','Character background removed.'));}
      return true;
    }catch(e){
      if(!quiet)say((e&&e.message)||String(e),true);
      return false;
    }
  }

  async function restoreOriginal(){
    const owner=ownerFor(selected());if(!owner||owner.kind!=='character')return;
    const src=owner.originalSrc||owner.baseSrc;if(!src){say(msg('মূল ছবি পাওয়া যায়নি।','Original image is unavailable.'),true);return;}
    owner.src=src;owner.image=await imageFromDataURL(src);owner.backgroundRemoved=false;
    if(typeof invalidateLayerPixels==='function')invalidateLayerPixels(owner);
    commit('restore original character');
    say(msg('মূল ছবিটি ফিরিয়ে আনা হয়েছে।','Original character image restored.'));
  }

  $('#prepareCharacterBtn')?.addEventListener('click',()=>prepareCharacter(selected()));
  $('#restoreCharacterBtn')?.addEventListener('click',restoreOriginal);

  /* New imports try offline person segmentation automatically. The original stays preserved. */
  const addCharacterBeforeV09=addCharacterData;
  addCharacterData=async function(src,name='Character',opts={}){
    const layer=await addCharacterBeforeV09(src,name,opts);
    if(opts?.skipAutoCutout)return layer;
    if(window.PoseForgeAI?.offline){
      const ok=await prepareCharacter(layer,true);
      if(ok){pushHistory('auto character cutout');renderUI();draw();autoSave();say(msg('চরিত্র যোগ হয়েছে, ব্যাকগ্রাউন্ড নিজে থেকে সরানো হয়েছে।','Character added with automatic background removal.'));}
      else say(msg('চরিত্র যোগ হয়েছে। ব্যাকগ্রাউন্ড কাটতে “ব্যাকগ্রাউন্ড সরান” চাপুন।','Character added. Use Remove Background if automatic cutout was unavailable.'));
    }
    return layer;
  };

  function targetSelect(){return $('#occlusionTarget');}
  function refillTargets(){
    const sel=targetSelect();if(!sel)return;
    const cur=sel.value,chosen=ownerFor(selected());
    sel.innerHTML='<option value="">Choose character</option>';
    for(const l of chars()){
      if(chosen&&l.id===chosen.id)continue;
      const o=document.createElement('option');o.value=l.id;o.textContent=l.name;sel.append(o);
    }
    if([...sel.options].some(o=>o.value===cur))sel.value=cur;
  }

  function moveOwnerRelative(owner,target,front){
    if(!owner||!target||owner.id===target.id)return false;
    const family=[owner,...state.layers.filter(x=>x.ownerId===owner.id)];
    const familySet=new Set(family.map(x=>x.id));
    state.layers=state.layers.filter(x=>!familySet.has(x.id));
    let ti=state.layers.findIndex(x=>x.id===target.id);
    if(ti<0){state.layers.push(...family);return false;}
    const insert=front?ti+1:ti;
    state.layers.splice(insert,0,...family);
    return true;
  }

  function coverBehind(){
    const owner=ownerFor(selected()),target=state.layers.find(x=>x.id===targetSelect()?.value);
    if(!owner||!target){say(msg('পিছনের চরিত্র আর সামনের চরিত্র বাছুন।','Choose the hidden character and the front character.'),true);return;}
    if(moveOwnerRelative(owner,target,false)){commit('character behind target');say(msg('নির্বাচিত চরিত্রটি টার্গেটের পেছনে গেছে।','Selected character moved behind target.'));}
  }

  function bringWholeFront(){
    const owner=ownerFor(selected()),target=state.layers.find(x=>x.id===targetSelect()?.value);
    if(!owner||!target)return;
    if(moveOwnerRelative(owner,target,true)){commit('character in front of target');say(msg('নির্বাচিত চরিত্রটি সামনে এসেছে।','Selected character moved in front.'));}
  }

  function ellipseMaskCanvas(w,h,cx,cy,rx,ry,feather=8){
    const m=document.createElement('canvas');m.width=w;m.height=h;
    const g=m.getContext('2d');g.fillStyle='#fff';g.beginPath();g.ellipse(cx,cy,Math.max(2,rx),Math.max(2,ry),0,0,Math.PI*2);g.fill();
    if(feather>0){const b=document.createElement('canvas');b.width=w;b.height=h;const bg=b.getContext('2d');bg.filter=`blur(${feather}px)`;bg.drawImage(m,0,0);return b;}
    return m;
  }

  async function createFrontPass(regionKey){
    const owner=ownerFor(selected()),target=state.layers.find(x=>x.id===targetSelect()?.value);
    if(!owner||!target){say(msg('পিছনের চরিত্র আর সামনের চরিত্র বাছুন।','Choose the hidden character and the front character.'),true);return null;}
    const regs=window.PoseForgeBodyRegions?.bodyRegions?.(owner);const r=regs?.[regionKey];
    if(!r){say(msg('এই অংশটি পাওয়া যায়নি।','That body region is unavailable.'),true);return null;}
    const pad=1.35,x0=Math.max(0,Math.floor(r.cx-r.rx*pad)),y0=Math.max(0,Math.floor(r.cy-r.ry*pad));
    const x1=Math.min(owner.width,Math.ceil(r.cx+r.rx*pad)),y1=Math.min(owner.height,Math.ceil(r.cy+r.ry*pad));
    const w=Math.max(2,x1-x0),h=Math.max(2,y1-y0);
    const source=owner.mesh?.points?.length?meshWarpCanvas(owner,litLayerImage(owner)):litLayerImage(owner);
    const full=document.createElement('canvas');full.width=owner.width;full.height=owner.height;const fg=full.getContext('2d');fg.drawImage(source,0,0);
    fg.globalCompositeOperation='destination-in';fg.drawImage(ellipseMaskCanvas(owner.width,owner.height,r.cx,r.cy,r.rx*1.12,r.ry*1.12,7),0,0);fg.globalCompositeOperation='source-over';
    const crop=document.createElement('canvas');crop.width=w;crop.height=h;crop.getContext('2d').drawImage(full,x0,y0,w,h,0,0,w,h);
    const src=crop.toDataURL('image/png'),im=await imageFromDataURL(src),center=localToWorld(owner,{x:x0+w/2,y:y0+h/2});
    const part={id:uid('front'),kind:'part',name:'Front '+regionKey,src,baseSrc:src,width:w,height:h,image:im,...layerDefaults(),
      x:center.x,y:center.y,rotation:owner.rotation,scaleX:owner.scaleX,scaleY:owner.scaleY,opacity:owner.opacity,
      brightness:1,contrast:1,saturation:1,hue:0,warmth:0,lightIntensity:0,lightAngle:315,lightSoftness:65,contactShadow:0,shadow:0,detail:0,grain:0,
      ownerId:owner.id,partRole:regionKey,frontPass:true,frontOfTargetId:target.id,sourceRegion:regionKey};
    const targetIndex=state.layers.findIndex(x=>x.id===target.id);
    state.layers.splice(Math.max(0,targetIndex+1),0,part);state.selectedId=part.id;
    commit('front pass body region');
    say(msg('শুধু নির্বাচিত শরীরের অংশ সামনে আনা হয়েছে। এখন এটাকে টেনে/ভঙ্গি বদলে বসাতে পারবেন।','Only the selected body region was brought in front. You can now move or deform it.'));
    return part;
  }

  async function faceOnly(){
    const owner=ownerFor(selected()),target=state.layers.find(x=>x.id===targetSelect()?.value);
    if(!owner||!target)return;
    moveOwnerRelative(owner,target,false);
    const pass=await createFrontPass('head');
    if(pass){pass.partRole='face/head';commit('cover character except face');}
  }

  $('#occlusionBehindBtn')?.addEventListener('click',coverBehind);
  $('#occlusionFrontBtn')?.addEventListener('click',bringWholeFront);
  $('#occlusionFaceBtn')?.addEventListener('click',faceOnly);
  $('#occlusionRegionFrontBtn')?.addEventListener('click',()=>createFrontPass($('#easyRegionSelect')?.value||'head'));

  const renderBeforeV09=renderUI;
  renderUI=function(){renderBeforeV09();refillTargets();};

  window.addEventListener('poseforge-language',refillTargets);
  window.PoseForgeV09={prepareCharacter,restoreOriginal,createFrontPass,coverBehind,bringWholeFront};
})();