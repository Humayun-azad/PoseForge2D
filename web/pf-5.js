function applyControl(key,val){const l=selected();if(!l)return;l[key]=Number(val);syncControls();draw();debouncedHistory();}
let histTimer=null;function debouncedHistory(){clearTimeout(histTimer);histTimer=setTimeout(()=>{pushHistory('adjust');autoSave();},280);}
for(const [k,el] of Object.entries(controls)){el.addEventListener('input',()=>applyControl(k==='rot'?'rotation':k==='sx'?'scaleX':k==='sy'?'scaleY':k==='bright'?'brightness':k==='sat'?'saturation':k,el.value));}
function syncControls(){
 const l=selected();$('#selectedName').textContent=l?l.name:'None';
 const map={x:['x',0],y:['y',0],rot:['rotation',0],sx:['scaleX',1],sy:['scaleY',1],bend:['bend',0],opacity:['opacity',1],bright:['brightness',1],contrast:['contrast',1],sat:['saturation',1],hue:['hue',0],warmth:['warmth',0],lightIntensity:['lightIntensity',0],lightAngle:['lightAngle',315],lightSoftness:['lightSoftness',65],contactShadow:['contactShadow',0],shadow:['shadow',0]};
 for(const [c,[prop,def]] of Object.entries(map)){const v=l?(l[prop]??def):def;controls[c].value=v;controls[c].disabled=!l;outs[c].textContent=(c==='rot'||c==='hue'||c==='lightAngle')?Math.round(v)+'°':(c==='opacity'||c==='sx'||c==='sy'||c==='bright'||c==='contrast'||c==='sat')?Number(v).toFixed(2):(c==='warmth'||c==='lightIntensity'||c==='lightSoftness'||c==='contactShadow')?Math.round(v)+'%':Math.round(v);}
}

function renderLayers(){
 const list=$('#layerList');list.innerHTML='';[...state.layers].reverse().forEach(l=>{const d=document.createElement('div');d.className='layer-item'+(l.id===state.selectedId?' active':'');const left=document.createElement('div');left.innerHTML=`<div>${escapeHtml(l.name)}</div><div class="layer-meta">${l.kind}${l.ownerId?' · part':''}${l.groupId?' · linked':''}</div>`;left.addEventListener('click',()=>{state.selectedId=l.id;renderUI();draw();});const eye=document.createElement('button');eye.className='eye';eye.textContent=l.visible?'◉':'○';eye.addEventListener('click',e=>{e.stopPropagation();l.visible=!l.visible;draw();renderLayers();autoSave();});d.append(left,eye);list.append(d);});
 $('#charCount').textContent=`${chars().length} / ${MAX_CHARACTERS} people`;
 const sel=$('#connectTarget');const cur=sel.value;sel.innerHTML='<option value="">None</option>';state.layers.filter(l=>l.id!==state.selectedId&&l.kind==='character').forEach(l=>{const o=document.createElement('option');o.value=l.id;o.textContent=l.name;sel.append(o);});if([...sel.options].some(o=>o.value===cur))sel.value=cur;
}
function escapeHtml(s){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function renderUI(){renderLayers();syncControls();renderSnapshots();}

async function handleImageInput(input,fn){const f=input.files?.[0];if(!f)return;try{const src=await readFileDataURL(f);await fn(src,f.name.replace(/\.[^.]+$/,''));}catch(e){say(e.message,true);}finally{input.value='';}}
$('#charInput').addEventListener('change',()=>handleImageInput($('#charInput'),addCharacterData));
$('#bgInput').addEventListener('change',()=>handleImageInput($('#bgInput'),setBackground));
$('#cutModeBtn').addEventListener('click',()=>{const l=selected();if(!l||l.kind!=='character'){say('Select a base character layer first.',true);return;}cutMode=!cutMode;cutPoints=[];setCutButtons();draw();});
$('#finishCutBtn').addEventListener('click',finishCut);$('#cancelCutBtn').addEventListener('click',cancelCut);
$('#undoBtn').addEventListener('click',undo);$('#redoBtn').addEventListener('click',redo);
$('#flipHBtn').addEventListener('click',()=>{const l=selected();if(!l)return;l.scaleX*=-1;pushHistory('flip');renderUI();draw();autoSave();});
$('#flipVBtn').addEventListener('click',()=>{const l=selected();if(!l)return;l.scaleY*=-1;pushHistory('flip');renderUI();draw();autoSave();});
$('#resetTransformBtn').addEventListener('click',()=>{const l=selected();if(!l)return;Object.assign(l,{rotation:0,bend:0,opacity:1});pushHistory('reset transform');renderUI();draw();autoSave();});
$('#resetLightBtn').addEventListener('click',()=>{const l=selected();if(!l)return;Object.assign(l,{brightness:1,contrast:1,saturation:1,hue:0,warmth:0,lightIntensity:0,lightAngle:315,lightSoftness:65,contactShadow:0,shadow:0});pushHistory('reset light');renderUI();draw();autoSave();});
$('#deleteBtn').addEventListener('click',()=>{const l=selected();if(!l)return;state.layers=state.layers.filter(x=>x.id!==l.id&&x.ownerId!==l.id);state.selectedId=state.layers.at(-1)?.id||null;pushHistory('delete');renderUI();draw();autoSave();});
$('#duplicateBtn').addEventListener('click',async()=>{const l=selected();if(!l)return;if(l.kind==='character'&&chars().length>=MAX_CHARACTERS){say('25-person active limit reached.',true);return;}const n={...cloneLayerForJSON(l),id:uid(l.kind==='character'?'char':'part'),name:l.name+' copy',x:l.x+40,y:l.y+40};n.image=await imageFromDataURL(n.src);state.layers.push(n);state.selectedId=n.id;pushHistory('duplicate');renderUI();draw();autoSave();});
$('#layerUpBtn').addEventListener('click',()=>reorder(1));$('#layerDownBtn').addEventListener('click',()=>reorder(-1));
function reorder(dir){const i=state.layers.findIndex(l=>l.id===state.selectedId);if(i<0)return;const j=clamp(i+dir,0,state.layers.length-1);if(i===j)return;[state.layers[i],state.layers[j]]=[state.layers[j],state.layers[i]];pushHistory('layer order');renderUI();draw();autoSave();}

$('#connectBtn').addEventListener('click',()=>{const a=selected(),b=state.layers.find(l=>l.id===$('#connectTarget').value);if(!a||!b)return;const gid=a.groupId||b.groupId||'g'+state.groupSeq++;for(const l of state.layers){if(l.id===a.id||l.id===b.id||l.ownerId===a.id||l.ownerId===b.id)l.groupId=gid;}pushHistory('connect');renderUI();autoSave();say('Movement linked. Pose parts stay editable independently.');});
$('#disconnectBtn').addEventListener('click',()=>{const l=selected();if(!l||!l.groupId)return;const gid=l.groupId;for(const x of state.layers){if(x.groupId===gid)x.groupId=null;}pushHistory('disconnect');renderUI();autoSave();});

$('#zoomInBtn').addEventListener('click',()=>setZoom(zoom*1.15));$('#zoomOutBtn').addEventListener('click',()=>setZoom(zoom/1.15));$('#fitBtn').addEventListener('click',fitCanvas);
function setZoom(v){zoom=clamp(v,.15,3);wrap.style.transform=`scale(${zoom})`;wrap.style.marginBottom=`${(zoom-1)*canvas.height}px`;wrap.style.marginRight=`${(zoom-1)*canvas.width}px`;$('#zoomLabel').textContent=Math.round(zoom*100)+'%';}
function fitCanvas(){const sc=$('#canvasScroller');const z=Math.min((sc.clientWidth-30)/canvas.width,(Math.min(sc.clientHeight||700,700)-30)/canvas.height,1);setZoom(Math.max(.15,z));}
window.addEventListener('resize',()=>{if(innerWidth<980)fitCanvas();});
