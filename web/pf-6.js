function sampleImageStats(im){
 const c=document.createElement('canvas'),size=48;c.width=size;c.height=size;const g=c.getContext('2d',{willReadFrequently:true});g.drawImage(im,0,0,size,size);const d=g.getImageData(0,0,size,size).data;let r=0,gg=0,b=0,lum=0,lum2=0,sat=0,n=0,left=0,right=0,top=0,bottom=0,ln=0,rn=0,tn=0,bn=0;
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){const i=(y*size+x)*4;if(d[i+3]<18)continue;const R=d[i]/255,G=d[i+1]/255,B=d[i+2]/255,L=.2126*R+.7152*G+.0722*B,ma=Math.max(R,G,B),mi=Math.min(R,G,B),S=ma?((ma-mi)/ma):0;r+=R;gg+=G;b+=B;lum+=L;lum2+=L*L;sat+=S;n++;if(x<size/2){left+=L;ln++;}else{right+=L;rn++;}if(y<size/2){top+=L;tn++;}else{bottom+=L;bn++;}}
 if(!n)return{lum:.5,sat:.5,temp:0,contrast:.2,lightAngle:315};const L=lum/n,variance=Math.max(0,lum2/n-L*L);const dx=(right/(rn||1))-(left/(ln||1)),dy=(bottom/(bn||1))-(top/(tn||1));let angle=Math.atan2(dy,dx)*180/Math.PI;if(angle<0)angle+=360;return{lum:L,sat:sat/n,temp:clamp(((r-b)/n)*1.7,-1,1),contrast:Math.sqrt(variance),lightAngle:angle};
}
$('#matchSceneBtn').addEventListener('click',()=>{
 if(!state.background?.image){say('Add a background first.',true);return;}
 const bg=sampleImageStats(state.background.image);
 for(const l of state.layers){if(l.kind!=='character'&&l.kind!=='part')continue;const a=sampleImageStats(l.image);l.brightness=clamp((bg.lum/(a.lum||.5))*.96,.55,1.55);l.saturation=clamp((bg.sat+.10)/(a.sat+.10),.60,1.45);l.contrast=clamp(1+(bg.contrast-a.contrast)*1.6,.72,1.32);l.warmth=clamp((bg.temp-a.temp)*72,-70,70);l.lightAngle=Math.round(bg.lightAngle);l.lightIntensity=clamp(18+Math.abs(bg.contrast-a.contrast)*180,12,55);l.lightSoftness=clamp(78-bg.contrast*120,28,85);l.contactShadow=Math.max(l.contactShadow||0,18);}
 pushHistory('scene match');renderUI();draw();autoSave();say('Unified scene lighting matched for photo, anime, cartoon and illustration layers.');
});


function triggerDownload(name,mime,textOrBase64,isBase64=false){
 const base64=isBase64?textOrBase64:btoa(unescape(encodeURIComponent(textOrBase64)));
 if(window.NativeBridge?.saveBase64File){window.NativeBridge.saveBase64File(name,mime,base64);say(`Saved ${name}`);return;}
 const blob=isBase64?dataURLToBlob(`data:${mime};base64,${base64}`):new Blob([textOrBase64],{type:mime});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);
}
function dataURLToBlob(url){const [h,b]=url.split(',');const mime=h.match(/:(.*?);/)[1];const bin=atob(b);const arr=new Uint8Array(bin.length);for(let i=0;i<bin.length;i++)arr[i]=bin.charCodeAt(i);return new Blob([arr],{type:mime});}
$('#exportBtn').addEventListener('click',()=>{const old=state.selectedId;state.selectedId=null;draw();const url=canvas.toDataURL('image/png');state.selectedId=old;draw();triggerDownload(`poseforge-${Date.now()}.png`,'image/png',url.split(',')[1],true);});
$('#saveProjectBtn').addEventListener('click',()=>{triggerDownload(`studio-${Date.now()}.pose2d`,'application/json',JSON.stringify(serializable()));});
$('#projectInput').addEventListener('change',async()=>{const f=$('#projectInput').files?.[0];if(!f)return;try{const obj=JSON.parse(await f.text());await hydrate(obj);history=[{label:'loaded',data:JSON.stringify(serializable())}];future=[];updateUndo();autoSave();say('Project loaded.');}catch(e){say('Could not open project: '+e.message,true);}finally{$('#projectInput').value='';}});
$('#clearBtn').addEventListener('click',()=>{if(!confirm('Start a new studio? Unsaved canvas state will be cleared.'))return;state.background=null;state.layers=[];state.selectedId=null;state.groups={};state.groupSeq=1;pushHistory('new studio');renderUI();draw();autoSave();});

async function autoSave(){if(!$('#autoSaveToggle').checked)return;try{await dbPut('autosave',{id:'latest',time:Date.now(),project:serializable()});}catch(e){console.warn(e);}}
$('#restoreAutoBtn').addEventListener('click',async()=>{const a=await dbGet('autosave','latest');if(!a){say('No autosave found.',true);return;}await hydrate(a.project);history=[{label:'restored',data:JSON.stringify(serializable())}];future=[];updateUndo();say('Autosave restored.');});
$('#snapshotBtn').addEventListener('click',async()=>{const s={id:uid('snap'),time:Date.now(),project:serializable()};await dbPut('snapshots',s);await renderSnapshots();say('Snapshot saved.');});
async function renderSnapshots(){const root=$('#snapshots');if(!root)return;const all=(await dbAll('snapshots')).sort((a,b)=>b.time-a.time).slice(0,10);root.innerHTML='';all.forEach(s=>{const d=document.createElement('div');d.className='library-entry';d.innerHTML=`<span>${new Date(s.time).toLocaleString()}</span>`;const b=document.createElement('button');b.className='mini';b.textContent='Restore';b.onclick=async()=>{await hydrate(s.project);pushHistory('snapshot restore');};d.append(b);root.append(d);});}

