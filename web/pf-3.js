function drawBackground(){
 ctx.save();ctx.fillStyle='#2a2d34';ctx.fillRect(0,0,canvas.width,canvas.height);
 if(state.background?.image){const im=state.background.image;const s=Math.max(canvas.width/im.width,canvas.height/im.height);const w=im.width*s,h=im.height*s;ctx.filter=`brightness(${state.background.brightness||1}) saturate(${state.background.saturation||1})`;ctx.drawImage(im,(canvas.width-w)/2,(canvas.height-h)/2,w,h);ctx.filter='none';}
 ctx.restore();
}
function drawBentImage(c,im,w,h,bend){
 if(Math.abs(bend)<0.5){c.drawImage(im,-w/2,-h/2,w,h);return;}
 const strips=32, sh=im.height/strips, dh=h/strips, amp=(bend/100)*w*0.22;
 for(let i=0;i<strips;i++){
   const t=(i+0.5)/strips; const off=amp*Math.sin(Math.PI*t); const sw=im.width;
   c.drawImage(im,0,i*sh,sw,sh,-w/2+off,-h/2+i*dh,w,dh+1);
 }
}
function litLayerImage(l){
 const sig=[l.src,l.brightness,l.contrast,l.saturation,l.hue,l.warmth,l.lightIntensity,l.lightAngle,l.lightSoftness].join('|');
 const cached=renderCache.get(l);if(cached?.sig===sig)return cached.canvas;
 const c=document.createElement('canvas');c.width=l.width;c.height=l.height;const g=c.getContext('2d');
 g.filter=`brightness(${l.brightness??1}) contrast(${l.contrast??1}) saturate(${l.saturation??1}) hue-rotate(${l.hue??0}deg)`;g.drawImage(l.image,0,0,l.width,l.height);g.filter='none';
 const warm=clamp(Number(l.warmth||0),-100,100)/100;
 if(Math.abs(warm)>.005){g.globalCompositeOperation='source-atop';g.fillStyle=warm>0?`rgba(255,151,58,${Math.abs(warm)*.26})`:`rgba(70,151,255,${Math.abs(warm)*.24})`;g.fillRect(0,0,c.width,c.height);g.globalCompositeOperation='source-over';}
 const strength=clamp(Number(l.lightIntensity||0),0,100)/100;
 if(strength>.005){const angle=(Number(l.lightAngle||315))*Math.PI/180,dx=Math.cos(angle),dy=Math.sin(angle),d=Math.hypot(c.width,c.height)*.56,cx=c.width/2,cy=c.height/2;const grad=g.createLinearGradient(cx-d*dx,cy-d*dy,cx+d*dx,cy+d*dy);const softness=clamp(Number(l.lightSoftness??65),0,100)/100;const edge=.5*(1-softness);grad.addColorStop(0,`rgba(0,0,0,${.34*strength})`);grad.addColorStop(clamp(.46-edge*.45,.06,.49),'rgba(0,0,0,0)');grad.addColorStop(clamp(.54+edge*.45,.51,.94),'rgba(255,255,255,0)');grad.addColorStop(1,`rgba(255,255,255,${.42*strength})`);g.globalCompositeOperation='source-atop';g.fillStyle=grad;g.fillRect(0,0,c.width,c.height);g.globalCompositeOperation='source-over';}
 renderCache.set(l,{sig,canvas:c});return c;
}
function drawContactShadow(l){const s=clamp(Number(l.contactShadow||0),0,100)/100;if(s<=.005)return;ctx.save();ctx.translate(l.x,l.y);ctx.rotate(l.rotation*Math.PI/180);const w=Math.max(12,Math.abs(l.width*l.scaleX)*.33),h=Math.max(5,Math.abs(l.height*l.scaleY)*.045);ctx.translate(0,Math.abs(l.height*l.scaleY)*.46);ctx.filter=`blur(${Math.max(2,(l.lightSoftness??65)*.09)}px)`;ctx.globalAlpha=.45*s;ctx.fillStyle='#000';ctx.beginPath();ctx.ellipse(0,0,w,h,0,0,Math.PI*2);ctx.fill();ctx.restore();}
function drawLayer(l,selectedStroke=true){
 if(!l.visible||!l.image)return;
 drawContactShadow(l);
 ctx.save();ctx.translate(l.x,l.y);ctx.rotate(l.rotation*Math.PI/180);ctx.scale(l.scaleX,l.scaleY);ctx.globalAlpha=l.opacity;
 if(l.shadow>0){ctx.shadowColor='rgba(0,0,0,.55)';ctx.shadowBlur=l.shadow;ctx.shadowOffsetX=l.shadow*.15;ctx.shadowOffsetY=l.shadow*.35;}
 drawBentImage(ctx,litLayerImage(l),l.width,l.height,l.bend||0);ctx.restore();
 if(selectedStroke&&l.id===state.selectedId){
   const box=layerBounds(l);ctx.save();ctx.strokeStyle='#45d6b5';ctx.lineWidth=3/zoom;ctx.setLineDash([10/zoom,8/zoom]);ctx.strokeRect(box.x,box.y,box.w,box.h);ctx.restore();
 }
}
function drawCutOverlay(){
 if(!cutMode||!cutPoints.length)return;
 ctx.save();ctx.strokeStyle='#45d6b5';ctx.fillStyle='rgba(69,214,181,.16)';ctx.lineWidth=4/zoom;ctx.beginPath();ctx.moveTo(cutPoints[0].x,cutPoints[0].y);cutPoints.slice(1).forEach(p=>ctx.lineTo(p.x,p.y));ctx.stroke();
 for(const p of cutPoints){ctx.beginPath();ctx.arc(p.x,p.y,7/zoom,0,Math.PI*2);ctx.fillStyle='#45d6b5';ctx.fill();}
 ctx.restore();
}
function draw(){drawBackground();for(const l of state.layers)drawLayer(l);if(typeof drawAiOverlay==='function')drawAiOverlay();drawCutOverlay();}
