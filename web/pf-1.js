'use strict';
const $ = s => document.querySelector(s);
const canvas = $('#studioCanvas');
const ctx = canvas.getContext('2d', {alpha:false});
const wrap = $('#canvasWrap');
const MAX_CHARACTERS = 25;
const DB_NAME='poseforge2d'; const DB_VERSION=2;
let dbPromise = null;
let zoom = 1;
let cutMode = false;
let cutPoints = [];
let drag = null;
let history = [];
let future = [];
let suppressHistory = false;
const renderCache = new WeakMap();

const state = {
  version:1,
  canvas:{width:1080,height:1350},
  background:null,
  layers:[],
  selectedId:null,
  groups:{},
  groupSeq:1,
  snapshots:[]
};

const controls = {
 x:$('#xCtrl'), y:$('#yCtrl'), rot:$('#rotCtrl'), sx:$('#sxCtrl'), sy:$('#syCtrl'), bend:$('#bendCtrl'), opacity:$('#opacityCtrl'),
 bright:$('#brightCtrl'), contrast:$('#contrastCtrl'), sat:$('#satCtrl'), hue:$('#hueCtrl'), warmth:$('#warmthCtrl'), lightIntensity:$('#lightIntensityCtrl'), lightAngle:$('#lightAngleCtrl'), lightSoftness:$('#lightSoftnessCtrl'), contactShadow:$('#contactShadowCtrl'), shadow:$('#shadowCtrl')
};
const outs = {x:$('#xOut'),y:$('#yOut'),rot:$('#rotOut'),sx:$('#sxOut'),sy:$('#syOut'),bend:$('#bendOut'),opacity:$('#opacityOut'),bright:$('#brightOut'),contrast:$('#contrastOut'),sat:$('#satOut'),hue:$('#hueOut'),warmth:$('#warmthOut'),lightIntensity:$('#lightIntensityOut'),lightAngle:$('#lightAngleOut'),lightSoftness:$('#lightSoftnessOut'),contactShadow:$('#contactShadowOut'),shadow:$('#shadowOut')};

function uid(p='id'){ return p+'_'+Date.now().toString(36)+'_'+Math.random().toString(36).slice(2,8); }
function clamp(v,a,b){ return Math.max(a,Math.min(b,v)); }
function selected(){ return state.layers.find(l=>l.id===state.selectedId)||null; }
function chars(){ return state.layers.filter(l=>l.kind==='character'); }
function say(msg,err=false){ const el=$('#message'); el.textContent=msg; el.style.color=err?'#ff9d9d':''; clearTimeout(say.t); say.t=setTimeout(()=>{el.textContent='';el.style.color='';},4200); }
