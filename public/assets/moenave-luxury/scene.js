(()=>{
'use strict';
const hero=document.getElementById('experience'),video=document.getElementById('door-film');
const slider=document.getElementById('door-position'),percent=document.getElementById('door-percent'),toggle=document.getElementById('door-toggle'),reset=document.getElementById('scene-reset');
let duration=0,pending=0,dragging=false;
function update(){const progress=duration?video.currentTime/duration:0;slider.value=String(Math.round(progress*100));percent.value=Math.round(progress*100)+'%';slider.setAttribute('aria-valuetext',Math.round(progress*100)+' percent through film');const playing=!video.paused&&!video.ended;toggle.innerHTML=(playing?'Pause':progress>.98?'Replay':'Open door')+' <span>'+(playing?'Ⅱ':'↗')+'</span>';toggle.setAttribute('aria-label',playing?'Pause door-opening film':progress>.98?'Replay door-opening film':'Play door-opening film');}
function seek(value){pending=Math.max(0,Math.min(100,Number(value)));video.pause();if(duration){video.currentTime=duration*pending/100;update();}else{percent.value=pending+'%';}}
video.addEventListener('loadedmetadata',()=>{duration=Number.isFinite(video.duration)?video.duration:0;video.currentTime=duration*pending/100;update();});
video.addEventListener('loadeddata',()=>hero.classList.add('video-ready'));
video.addEventListener('timeupdate',()=>{if(!dragging)update();});video.addEventListener('play',update);video.addEventListener('pause',update);video.addEventListener('ended',update);
slider.addEventListener('pointerdown',()=>{dragging=true;video.pause();});slider.addEventListener('pointerup',()=>{dragging=false;update();});slider.addEventListener('pointercancel',()=>{dragging=false;update();});slider.addEventListener('input',()=>seek(slider.value));slider.addEventListener('change',()=>{dragging=false;seek(slider.value);});
function play(){if(!video.paused){video.pause();return;}if(video.ended||duration&&video.currentTime>=duration-.05)video.currentTime=0;video.play().catch(()=>{toggle.textContent='Tap to play';});}
toggle.addEventListener('click',play);document.getElementById('enter-scene').addEventListener('click',play);
reset.addEventListener('click',()=>seek(0));
if(video.readyState>=1){duration=video.duration;update();}if(video.readyState>=2)hero.classList.add('video-ready');
})();
