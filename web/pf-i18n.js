/* PoseForge 2D v0.10 bilingual UI layer */
(function(){
  'use strict';
  const KEY='poseforge.lang';
  const pairs=[
    ['Offline-first character & scene studio','অফলাইন-প্রথম চরিত্র ও দৃশ্য স্টুডিও'],
    ['AI','এআই'],['Offline','অফলাইন'],['Online','অনলাইন'],
    ['+ Character','+ চরিত্র'],['Background','ব্যাকগ্রাউন্ড'],['✂ Cut Part','✂ অংশ কাটুন'],['Finish Cut','কাটা শেষ'],['Cancel','বাতিল'],
    ['Match Scene','দৃশ্যের সাথে মিলান'],['Match Quality','মান মিলান'],['Mesh Edit','জাল দিয়ে নাড়ান'],['Mask Brush','অংশ লুকান/দেখান'],['↶ Undo','↶ আগের ধাপ'],['↷ Redo','↷ পরের ধাপ'],
    ['Studio','স্টুডিও'],['Layers','লেয়ার'],['Library','লাইব্রেরি'],['Project','প্রজেক্ট'],
    ['▲ Front','▲ সামনে'],['▼ Back','▼ পেছনে'],['Duplicate','কপি করুন'],['Connect movement with','চলাচল যুক্ত করুন'],['None','কোনোটিই নয়'],['Connect','যুক্ত করুন'],['Disconnect','আলাদা করুন'],
    ['Character ও pose library এই ডিভাইসেই IndexedDB-তে থাকে।','চরিত্র ও ভঙ্গির লাইব্রেরি এই ডিভাইসেই থাকে।'],['Name','নাম'],['Character','চরিত্র'],['Save Character','চরিত্র সংরক্ষণ'],['Save Pose','ভঙ্গি সংরক্ষণ'],['Characters','চরিত্র'],['Poses','ভঙ্গি'],['Add','যোগ করুন'],['Apply','প্রয়োগ করুন'],['Restore','ফিরিয়ে আনুন'],
    ['Save .pose2d','প্রজেক্ট সংরক্ষণ'],['Open project','প্রজেক্ট খুলুন'],['Autosave locally','নিজে থেকে সংরক্ষণ'],['Snapshot','স্ন্যাপশট'],['Restore autosave','অটোসেভ ফিরিয়ে আনুন'],
    ['Offline AI','অফলাইন এআই'],['Body coverage','শরীর কতটা ঢাকা'],['Online AI','অনলাইন এআই'],['Compatible AI endpoint','এআই সার্ভারের ঠিকানা'],['Token (optional)','টোকেন (ঐচ্ছিক)'],['Analyze selected','নির্বাচিত ছবি বিশ্লেষণ'],['Auto Body Parts','শরীরের অংশ বের করুন'],['Semantic Split','ত্বক/কাপড় ভাগ করুন'],['Reconstruct/Repair','মেরামত/পুনর্গঠন'],
    ['Select/drag mode','সিলেক্ট/টেনে সরানোর মোড'],['Fit','ফিট'],['Selected','নির্বাচিত'],
    ['Easy Transform','সহজ ট্রান্সফর্ম'],['Person size','শরীরের আকার'],['Rotate °','ঘোরান °'],['Scale X','আড়াআড়ি আকার'],['Scale Y','লম্বালম্বি আকার'],['Bend','বাঁকান'],['Opacity','স্বচ্ছতা'],['Flip H','ডান-বাম উল্টান'],['Flip V','উপর-নিচ উল্টান'],['Reset','রিসেট'],
    ['Unified Light / Color','আলো ও রঙ মিলান'],['Brightness','আলো'],['Contrast','কনট্রাস্ট'],['Saturation','রঙের ঘনত্ব'],['Hue','রঙের টোন'],['Warm / Cool','উষ্ণ / ঠান্ডা'],['Directional light','আলোর তীব্রতা'],['Light angle','আলোর দিক'],['Light softness','আলোর কোমলতা'],['Contact shadow','স্পর্শের ছায়া'],['Cast shadow blur','ছায়ার নরমভাব'],['Blur / Detail','ব্লার / ডিটেইল'],['Grain match','গ্রেইন মিলান'],['Reset lighting','আলো রিসেট'],
    ['Soft Body / Mesh','নরম শরীর / জাল'],['Create Mesh','নাড়ানোর জাল তৈরি'],['Reset Mesh','জাল রিসেট'],['Bind AI Joints','এআই জয়েন্ট যুক্ত করুন'],['Mesh density','জালের ঘনত্ব'],['Soft radius','কতটা জায়গা সাথে নড়বে'],['Soft strength','নড়ার শক্তি'],['Show pose joints in Mesh Edit','ভঙ্গির জয়েন্ট দেখান'],['Show hand/finger joints','হাত/আঙুলের জয়েন্ট দেখান'],
    ['Precision Mask / Occlusion','নির্ভুল লুকানো/দেখানো'],['Hide','লুকান'],['Reveal','দেখান'],['Reset Mask','মাস্ক রিসেট'],['Brush size','ব্রাশের আকার'],
    ['Face Expression','মুখের ভাব'],['Smile / Frown','হাসি / মন খারাপ'],['Mouth open','মুখ খোলা'],['Brow raise','ভ্রু তোলা'],['Eye open','চোখ খোলা'],['Jaw / Chin','চোয়াল / থুতনি'],['Neutral','স্বাভাবিক'],['Smile','হাসি'],['Sad','দুঃখ'],['Surprise','অবাক'],
    ['Contact Anchor','যোগের পিন'],['Target','লক্ষ্য'],['Choose layer','লেয়ার বাছুন'],['Follow target rotation','লক্ষ্যের ঘোরানো অনুসরণ'],['Pin Here','এখানে পিন করুন'],['Release','ছাড়ুন'],['Anchor status','পিনের অবস্থা'],['Not anchored','পিন করা নেই'],
    ['Part tools','অংশের টুল'],['New part name','নতুন অংশের নাম'],['Head','মাথা'],['Torso','ধড়'],['Arm','বাহু'],['Hand','হাত'],['Leg','পা'],['Foot','পায়ের পাতা'],['Hair/Clothes','চুল/কাপড়'],['Custom region','নিজের অংশ'],['Edge feather','ধারের কোমলতা'],['Delete selected layer','নির্বাচিত লেয়ার মুছুন'],
    ['Export PNG','PNG বের করুন'],['New Studio','নতুন স্টুডিও'],
    ['Easy Body Regions','সহজ শরীরের অংশ'],['Tap body to select','শরীরে ট্যাপ করে অংশ বাছুন'],['Stop picking','ট্যাপ বাছাই বন্ধ'],['Body region','শরীরের অংশ'],['Whole body','পুরো শরীর'],['Neck','ঘাড়'],['Chest / upper torso','বুক / উপরের ধড়'],['Left chest / breast region','বাম বুক / স্তন অঞ্চল'],['Right chest / breast region','ডান বুক / স্তন অঞ্চল'],['Abdomen','পেট'],['Waist','কোমর'],['Hips / glute area','হিপস / নিতম্ব'],['Left upper arm','বাম উপরের বাহু'],['Right upper arm','ডান উপরের বাহু'],['Left forearm','বাম নিচের বাহু'],['Right forearm','ডান নিচের বাহু'],['Left hand','বাম হাত'],['Right hand','ডান হাত'],['Left thigh','বাম উরু'],['Right thigh','ডান উরু'],['Left lower leg','বাম নিচের পা'],['Right lower leg','ডান নিচের পা'],['Left foot','বাম পায়ের পাতা'],['Right foot','ডান পায়ের পাতা'],
    ['Move amount','কতটা নড়বে'],['Softness','কতটা নরমভাবে নড়বে'],['Bigger','বড়'],['Smaller','ছোট'],['Soft drag region','অংশ ধরে সফট ড্র্যাগ'],['Stop soft drag','সফট ড্র্যাগ বন্ধ'],['Wider','চওড়া'],['Narrower','সরু'],['Taller','লম্বা'],['Shorter','খাটো'],['Rotate left','বামে ঘোরান'],['Rotate right','ডানে ঘোরান'],['Undo region edit','অংশের শেষ পরিবর্তন ফেরত'],
    ['Quick Pose','দ্রুত ভঙ্গি'],['Hands front','হাত সামনে'],['Arms up','হাত ওপরে'],['Swim reach','সাঁতারের ভঙ্গি'],['Relax pose rotation','ভঙ্গির ঘোরানো স্বাভাবিক'],['Analyze first for precise pose presets. Region controls also work approximately without AI.','নির্ভুল ভঙ্গির জন্য আগে ছবি বিশ্লেষণ করুন। এআই ছাড়াও অংশের কন্ট্রোল আনুমানিকভাবে কাজ করবে।'],
    ['Wider, keep size','চওড়া করুন, মাপ একই'],['Narrower, keep size','সরু করুন, মাপ একই'],['Taller, keep size','লম্বা করুন, মাপ একই'],['Shorter, keep size','খাটো করুন, মাপ একই'],
    ['Character Preparation','চরিত্র প্রস্তুত করুন'],['Remove Background','ব্যাকগ্রাউন্ড সরান'],['Restore Original','মূল ছবি ফিরিয়ে আনুন'],
    ['Easy Occlusion','সহজ আড়াল/সামনে'],['Front character','সামনের চরিত্র'],['Choose character','চরিত্র বাছুন'],['Put selected behind','নির্বাচিতটাকে পেছনে দিন'],['Put selected in front','নির্বাচিতটাকে সামনে আনুন'],['Cover except face','মুখ ছাড়া ঢেকে দিন'],['Bring selected body part front','বাছা শরীরের অংশ সামনে আনুন'],
    ['Natural Soft Body','স্বাভাবিক সফট বডি'],['Force type','ফোর্সের ধরন'],['Move','সরান'],['Pull','টানুন'],['Push / compress','চাপ দিন / কমপ্রেস'],['Twist / rotate soft','নরমভাবে মোচড় / ঘোরান'],['Force strength','ফোর্সের শক্তি'],['Soft body gesture','সফট বডি জেসচার'],['Stop soft body gesture','সফট বডি বন্ধ'],['Smooth deformation','ডিফরমেশন মসৃণ করুন'],['Smart joint drag','স্মার্ট জয়েন্ট ড্র্যাগ'],['Stop smart joints','স্মার্ট জয়েন্ট বন্ধ']
  ];
  const maps={bn:new Map(),en:new Map()};
  for(const [en,bn] of pairs){maps.bn.set(en,bn);maps.bn.set(bn,bn);maps.en.set(en,en);maps.en.set(bn,en);}
  function lang(){return localStorage.getItem(KEY)||'bn';}
  function translateString(s,target=lang()){
    if(!s)return s;const trimmed=s.trim();const m=maps[target];if(m.has(trimmed))return s.replace(trimmed,m.get(trimmed));
    const dynamic=(target==='bn') ? [
      [/^(\d+) \/ 25 people$/, '$1 / 25 জন'],
      [/^Pinned to (.+)$/, '$1-এর সাথে পিন করা'],
      [/^Ready: pose, face, hands, segmentation$/, 'প্রস্তুত: ভঙ্গি, মুখ, হাত ও সেগমেন্টেশন'],
      [/^Ready: pose \+ face \+ hands \+ multiclass segmentation$/, 'প্রস্তুত: ভঙ্গি + মুখ + হাত + সেগমেন্টেশন'],
      [/^Endpoint configured$/, 'সার্ভার যুক্ত আছে'],[/^Endpoint not configured$/, 'সার্ভার যুক্ত করা নেই']
    ] : [];
    for(const [re,rep] of dynamic){if(re.test(trimmed))return s.replace(trimmed,trimmed.replace(re,rep));}
    return s;
  }
  function localizeTree(root=document.body,target=lang()){
    if(!root)return;
    const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);
    const nodes=[];while(walker.nextNode())nodes.push(walker.currentNode);
    for(const n of nodes){if(n.parentElement?.closest('script,style'))continue;n.nodeValue=translateString(n.nodeValue,target);}
    for(const el of root.querySelectorAll?.('option')||[])el.textContent=translateString(el.textContent,target);
    document.documentElement.lang=target;
    const sel=document.querySelector('#languageSelect');if(sel&&sel.value!==target)sel.value=target;
  }
  function setLanguage(v){const next=v==='en'?'en':'bn';localStorage.setItem(KEY,next);localizeTree(document.body,next);window.dispatchEvent(new CustomEvent('poseforge-language',{detail:{language:next}}));}
  window.PoseForgeI18n={lang,setLanguage,translateString,localizeTree};

  const oldSay=window.say;
  if(typeof oldSay==='function'){
    window.say=function(msg,err=false){
      const target=lang();
      const exactBn={
        'Select a layer first.':'আগে একটি লেয়ার বাছুন।','Select a character first.':'আগে একটি চরিত্র বাছুন।','Select a base character first.':'আগে মূল চরিত্রটি বাছুন।',
        'Run Analyze selected first so body/hand joints are available.':'আগে নির্বাচিত ছবি বিশ্লেষণ করুন, তাহলে শরীর ও হাতের জয়েন্ট পাওয়া যাবে।',
        'Run Analyze selected first for face landmarks.':'মুখের পয়েন্ট পেতে আগে নির্বাচিত ছবি বিশ্লেষণ করুন।',
        'Local deformable mesh created.':'নাড়ানোর জাল তৈরি হয়েছে।','Mesh deformation reset.':'জালের পরিবর্তন রিসেট হয়েছে।','AI body and hand joints bound to the soft mesh.':'এআই শরীর ও হাতের জয়েন্ট নরম জালের সাথে যুক্ত হয়েছে।',
        'Mask reset.':'মাস্ক রিসেট হয়েছে।','Contact anchor pinned.':'যোগের পিন বসানো হয়েছে।','Contact anchor released.':'যোগের পিন ছাড়ানো হয়েছে।',
        'Project loaded.':'প্রজেক্ট খোলা হয়েছে।','Snapshot saved.':'স্ন্যাপশট সংরক্ষণ হয়েছে।','Autosave restored.':'অটোসেভ ফিরিয়ে আনা হয়েছে।','No autosave found.':'কোনো অটোসেভ পাওয়া যায়নি।',
        'Pose saved.':'ভঙ্গি সংরক্ষণ হয়েছে।','Editable character saved to local library.':'এডিটযোগ্য চরিত্র লাইব্রেরিতে সংরক্ষণ হয়েছে।'
      };
      let out=String(msg??'');if(target==='bn')out=exactBn[out]||translateString(out,target);return oldSay(out,err);
    };
  }
  document.addEventListener('DOMContentLoaded',()=>localizeTree(document.body,lang()));
})();