import fs from 'node:fs';

const html=fs.readFileSync('web/index.html','utf8');
const repair=fs.readFileSync('web/pf-18.js','utf8');
const gradle=fs.readFileSync('android/app/build.gradle.kts','utf8');
const workflow=fs.readFileSync('.github/workflows/build-apk.yml','utf8');

function assert(ok,msg){if(!ok){console.error('FAIL:',msg);process.exitCode=1;}else console.log('PASS:',msg);}

assert(html.includes('v0.15</span>'),'UI version badge is v0.15');
assert(html.includes('<script src="pf-18.js"></script>'),'Repair Studio module is loaded');
assert(html.includes('<script src="pf-19.js"></script>'),'Object Studio module is loaded');
for(const id of ['repairPaintBtn','repairPreviewBtn','repairRetryBtn','repairAcceptBtn','repairCancelBtn','repairClearMaskBtn','harmonySelectedBtn','harmonyAllBtn']){
  assert(html.includes('id="'+id+'"'),'control exists: '+id);
}
const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);
const dup=ids.filter((x,i)=>ids.indexOf(x)!==i);
assert(dup.length===0,'HTML IDs are unique');
const scripts=[...html.matchAll(/<script\s+src="([^"]+)"/g)].map(m=>m[1]);
for(const s of scripts)assert(fs.existsSync('web/'+s),'referenced script exists: '+s);
assert(repair.includes('offlineFill')&&repair.includes('acceptPreview'),'repair preview/offline/accept engine present');
assert(repair.includes('repairOverlay:true'),'accepted repair remains an editable overlay layer');
assert(repair.includes('harmonyLayer'),'scene harmony engine present');
assert(gradle.includes('versionCode = 15')&&gradle.includes('versionName = "0.15.0"'),'Android version is 0.15.0');
assert(workflow.includes('PoseForge2D-v0.15-object-interaction-ai-apk'),'APK artifact is named v0.15');
assert(workflow.includes('node tests/web-smoke.mjs'),'workflow runs web smoke tests');
if(process.exitCode)process.exit(process.exitCode);
console.log('PoseForge2D v0.15 smoke checks complete.');
