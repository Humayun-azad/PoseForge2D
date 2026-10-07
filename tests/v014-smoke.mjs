import fs from 'node:fs';
const index=fs.readFileSync('web/index.html','utf8');
const repair=fs.readFileSync('web/pf-18.js','utf8');
const gradle=fs.readFileSync('android/app/build.gradle.kts','utf8');
const requiredIds=['repairPaintBtn','repairPreviewBtn','repairAcceptBtn','repairRetryBtn','repairCancelBtn','repairClearMaskBtn','harmonySelectedBtn','harmonyAllBtn','harmonyStrength'];
for(const id of requiredIds){if(!index.includes('id="'+id+'"'))throw new Error('Missing UI id: '+id);}
if(!index.includes('v0.14'))throw new Error('UI version badge is not v0.14');
if(!index.includes('pf-18.js'))throw new Error('pf-18.js is not loaded');
for(const token of ['offlineFill','acceptPreview','Scene Harmony Pro','PoseForgeRepairStudio']){if(!repair.includes(token))throw new Error('Missing repair integration token: '+token);}
if(!gradle.includes('versionCode = 14')||!gradle.includes('versionName = "0.14.0"'))throw new Error('Android version metadata mismatch');
console.log('v0.14 integration smoke checks passed');
