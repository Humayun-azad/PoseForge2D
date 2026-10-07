import fs from 'node:fs';
const index=fs.readFileSync('web/index.html','utf8');
const repair=fs.readFileSync('web/pf-18.js','utf8');
const gradle=fs.readFileSync('android/app/build.gradle.kts','utf8');
const requiredIds=['repairPaintBtn','repairPreviewBtn','repairAcceptBtn','repairRetryBtn','repairCancelBtn','repairClearMaskBtn','harmonySelectedBtn','harmonyAllBtn','harmonyStrength'];
for(const id of requiredIds){if(!index.includes('id="'+id+'"'))throw new Error('Missing UI id: '+id);}
if(!index.includes('v0.15'))throw new Error('v0.14 features must remain present in current cumulative UI');
if(!index.includes('pf-18.js'))throw new Error('pf-18.js is not loaded');
for(const token of ['offlineFill','acceptPreview','Scene Harmony Pro','PoseForgeRepairStudio']){if(!repair.includes(token))throw new Error('Missing repair integration token: '+token);}
if(!gradle.includes('versionCode = 15')||!gradle.includes('versionName = "0.15.0"'))throw new Error('Android version metadata mismatch');
console.log('v0.14 cumulative feature smoke checks passed inside v0.15');
