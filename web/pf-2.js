function openDB(){
 if(dbPromise) return dbPromise;
 dbPromise = new Promise((resolve,reject)=>{
   const r=indexedDB.open(DB_NAME,DB_VERSION);
   r.onupgradeneeded=()=>{ const db=r.result; ['characters','poses','autosave','snapshots'].forEach(s=>{if(!db.objectStoreNames.contains(s))db.createObjectStore(s,{keyPath:'id'});}); };
   r.onsuccess=()=>resolve(r.result); r.onerror=()=>reject(r.error);
 }); return dbPromise;
}
async function dbPut(store,obj){ const db=await openDB(); return new Promise((res,rej)=>{const tx=db.transaction(store,'readwrite');tx.objectStore(store).put(obj);tx.oncomplete=()=>res();tx.onerror=()=>rej(tx.error);}); }
async function dbGet(store,id){ const db=await openDB(); return new Promise((res,rej)=>{const q=db.transaction(store).objectStore(store).get(id);q.onsuccess=()=>res(q.result);q.onerror=()=>rej(q.error);}); }
async function dbAll(store){ const db=await openDB(); return new Promise((res,rej)=>{const q=db.transaction(store).objectStore(store).getAll();q.onsuccess=()=>res(q.result||[]);q.onerror=()=>rej(q.error);}); }
async function dbDelete(store,id){ const db=await openDB(); return new Promise((res,rej)=>{const tx=db.transaction(store,'readwrite');tx.objectStore(store).delete(id);tx.oncomplete=()=>res();tx.onerror=()=>rej(tx.error);}); }

function imageFromDataURL(src){ return new Promise((res,rej)=>{const im=new Image();im.onload=()=>res(im);im.onerror=rej;im.src=src;}); }
function readFileDataURL(file){ return new Promise((res,rej)=>{const r=new FileReader();r.onload=()=>res(r.result);r.onerror=rej;r.readAsDataURL(file);}); }

function layerDefaults(){ return {x:canvas.width/2,y:canvas.height/2,rotation:0,scaleX:1,scaleY:1,bend:0,opacity:1,brightness:1,contrast:1,saturation:1,hue:0,warmth:0,lightIntensity:0,lightAngle:315,lightSoftness:65,contactShadow:0,shadow:0,detail:0,grain:0,visible:true,groupId:null}; }
async function addCharacterData(src,name='Character',opts={}){
 if(chars().length>=MAX_CHARACTERS) throw new Error(`Studio limit is ${MAX_CHARACTERS} active characters.`);
 const im=await imageFromDataURL(src);
 const maxDim=Math.min(canvas.width*0.7,canvas.height*0.7); const s=Math.min(1,maxDim/Math.max(im.width,im.height));
 const layer={id:uid('char'),kind:'character',name,src,baseSrc:src,width:im.width,height:im.height,image:im,...layerDefaults(),scaleX:s,scaleY:s,ownerId:null,partRole:null};
 state.layers.push(layer); state.selectedId=layer.id; pushHistory('add character'); renderUI(); draw(); autoSave(); return layer;
}
async function setBackground(src){ const im=await imageFromDataURL(src); state.background={src,image:im,brightness:1,saturation:1}; pushHistory('background'); draw(); autoSave(); }

function cloneLayerForJSON(l){ const {image,...rest}=l; return rest; }
function serializable(){ return {version:state.version,canvas:{...state.canvas},background:state.background?{src:state.background.src,brightness:state.background.brightness||1,saturation:state.background.saturation||1}:null,layers:state.layers.map(cloneLayerForJSON),selectedId:state.selectedId,groups:JSON.parse(JSON.stringify(state.groups)),groupSeq:state.groupSeq,snapshots:state.snapshots}; }
async function hydrate(obj){
 state.version=obj.version||1; state.canvas=obj.canvas||{width:1080,height:1350}; canvas.width=state.canvas.width;canvas.height=state.canvas.height;
 state.background=null; if(obj.background?.src){ const im=await imageFromDataURL(obj.background.src); state.background={...obj.background,image:im}; }
 state.layers=[]; for(const raw of (obj.layers||[])){const im=await imageFromDataURL(raw.src);state.layers.push({...raw,image:im});}
 state.selectedId=obj.selectedId&&state.layers.some(l=>l.id===obj.selectedId)?obj.selectedId:(state.layers[0]?.id||null); state.groups=obj.groups||{};state.groupSeq=obj.groupSeq||1;state.snapshots=obj.snapshots||[];
 renderUI(); draw();
}
function pushHistory(label){ if(suppressHistory)return; history.push({label,data:JSON.stringify(serializable())}); if(history.length>50)history.shift(); future=[]; updateUndo(); }
async function undo(){ if(history.length<2)return; const cur=history.pop(); future.push(cur); const prev=history[history.length-1]; suppressHistory=true; await hydrate(JSON.parse(prev.data)); suppressHistory=false; updateUndo(); }
async function redo(){ if(!future.length)return; const n=future.pop(); history.push(n); suppressHistory=true; await hydrate(JSON.parse(n.data)); suppressHistory=false; updateUndo(); }
function updateUndo(){ $('#undoBtn').disabled=history.length<2;$('#redoBtn').disabled=!future.length; }
