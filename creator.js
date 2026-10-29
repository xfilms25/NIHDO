/* Nothing I Haven't Dreamed Of — Creator mode (F10)
   Freezes the game, frees the camera, and lets you click any object or model to move, rotate or scale it.
   Changes are kept in this browser (localStorage) and re-applied on load; "Copiar" exports them as JSON. */
(function(){
'use strict';
var C=window.CREATOR={on:false},T=window.THREE,KEY='nihdo_creator_v1';
var G,R,canvas,scene,cam,comp,prevState,camSave,yaw=0,pitch=0,keys={},look=false,lx=0,ly=0;
var tc=null,tcLoading=false,sel=null,stack=[],ui=null,ray=new T.Raycaster(),mouse=new T.Vector2(),downAt=null;
var EDITS={};try{EDITS=JSON.parse(localStorage.getItem(KEY)||'{}')||{};}catch(e){EDITS={};}

function active(){var c=G.comp&&G.comp();if(c&&c.passes&&c.passes[0]&&c.passes[0].scene)return {scene:c.passes[0].scene,cam:c.passes[0].camera,comp:c};return {scene:G.scene,cam:G.camera,comp:null};}
function sceneTag(sc){return sc===G.scene?'main':'limbo';}
/* a stable address for an object: names where they exist, otherwise type + index among siblings */
function pathOf(o){var p=[];while(o&&o.parent){var par=o.parent,nm=o.name?o.name:o.type+'#'+par.children.indexOf(o);
    if(o.name){var same=par.children.filter(function(c){return c.name===o.name;});if(same.length>1)nm=o.name+'#'+same.indexOf(o);}
    p.unshift(nm);o=par;}return p.join('/');}
function resolve(sc,path){var o=sc,parts=path.split('/');for(var i=0;i<parts.length&&o;i++){var s=parts[i],m=s.match(/^(.*)#(\d+)$/),n=null;
    if(m){var base=m[1],k=+m[2];var cands=o.children.filter(function(c){return c.name===base;});if(cands.length)n=cands[k]||null;else{n=o.children[k]||null;if(n&&n.name)n=null;}}
    else n=o.children.filter(function(c){return c.name===s;})[0]||null;o=n;}return o;}
function r3(v){return Math.round(v*1000)/1000;}
function record(o){if(!o)return;var a=active(),id=sceneTag(a.scene)+':'+pathOf(o);
  EDITS[id]={name:o.name||o.type,p:o.position.toArray().map(r3),r:[o.rotation.x,o.rotation.y,o.rotation.z].map(r3),s:o.scale.toArray().map(r3)};
  o.userData.crId=id;try{localStorage.setItem(KEY,JSON.stringify(EDITS));}catch(e){}}
function applyEdits(){if(!G)return;var scs=[['main',G.scene]];try{var LB=window.LIMBO;if(LB&&LB.ready&&LB._dbg)scs.push(['limbo',LB._dbg().scene]);}catch(e){}
  for(var id in EDITS){var k=id.indexOf(':'),tag=id.slice(0,k),path=id.slice(k+1),e=EDITS[id];
    scs.forEach(function(s){if(s[0]!==tag||!s[1])return;var o=resolve(s[1],path);if(!o||o.userData.crApplied===e)return;
      o.position.fromArray(e.p);o.rotation.set(e.r[0],e.r[1],e.r[2]);o.scale.fromArray(e.s);o.userData.crApplied=e;});}}
setInterval(function(){if(G&&Object.keys(EDITS).length)applyEdits();},1000);

/* ---------- panel ---------- */
function el(t,css,txt){var e=document.createElement(t);if(css)e.style.cssText=css;if(txt!==undefined)e.textContent=txt;return e;}
function buildUI(){if(ui)return ui;ui={};
  var st=el('style');st.textContent='body.creator [id^="lb"]{display:none!important}#crPanel input{width:50px;min-width:0;flex:1;background:#111;color:#eee;border:1px solid #444;border-radius:3px;padding:2px 3px;font:12px monospace}#crPanel button{background:#222;color:#eee;border:1px solid #555;border-radius:4px;padding:4px 7px;margin:2px;font:12px sans-serif;cursor:pointer}#crPanel button.on{background:#7a1020;border-color:#c33}#crPanel .row{display:flex;align-items:center;gap:4px;margin:3px 0}#crPanel .lab{width:62px;color:#aaa}';document.head.appendChild(st);
  var P=ui.p=el('div','position:fixed;top:12px;right:12px;z-index:99999;width:300px;max-width:calc(100vw - 32px);background:rgba(8,8,10,.92);color:#eee;font:13px sans-serif;padding:10px 12px;border:1px solid #7a1020;border-radius:8px;display:none;user-select:none');P.id='crPanel';
  P.appendChild(el('div','font-weight:bold;letter-spacing:.08em;color:#e33;margin-bottom:6px','MODO CREADOR · F10'));
  ui.name=el('div','font:12px monospace;color:#fff;word-break:break-all;margin-bottom:4px','Haz clic en un objeto');P.appendChild(ui.name);
  ui.path=el('div','font:10px monospace;color:#888;word-break:break-all;margin-bottom:6px','');P.appendChild(ui.path);
  ui.inp={};[['p','Posición'],['r','Rotación°'],['s','Escala']].forEach(function(f){var row=el('div');row.className='row';var l=el('span','',f[1]);l.className='lab';row.appendChild(l);
    ui.inp[f[0]]=['x','y','z'].map(function(ax,i){var inp=el('input');inp.type='number';inp.step=f[0]==='r'?'5':f[0]==='s'?'0.05':'0.05';inp.title=ax;
      inp.addEventListener('change',function(){if(!sel)return;var v=parseFloat(inp.value);if(isNaN(v))return;if(f[0]==='p')sel.position.setComponent(i,v);else if(f[0]==='r')sel.rotation[ax]=v*Math.PI/180;else sel.scale.setComponent(i,v);record(sel);refresh();});
      inp.addEventListener('keydown',function(e){e.stopPropagation();});row.appendChild(inp);return inp;});
    if(f[0]==='s'){var u=el('input');u.type='number';u.step='0.05';u.title='uniforme';u.style.borderColor='#7a1020';u.addEventListener('change',function(){if(!sel)return;var v=parseFloat(u.value);if(!isNaN(v)&&v>0){var k=v/(sel.scale.x||1);sel.scale.multiplyScalar(k);record(sel);refresh();}});u.addEventListener('keydown',function(e){e.stopPropagation();});row.appendChild(u);ui.uni=u;}
    P.appendChild(row);});
  var b=el('div','margin-top:6px');
  ui.modes={};[['translate','Mover (1)'],['rotate','Rotar (2)'],['scale','Escalar (3)']].forEach(function(m){var bt=el('button','',m[1]);bt.onclick=function(){setMode(m[0]);};b.appendChild(bt);ui.modes[m[0]]=bt;});
  P.appendChild(b);
  var b2=el('div');[['Padre [',function(){up();}],['Hijo ]',function(){down();}],['Local/Mundo (L)',function(){if(tc){tc.setSpace(tc.space==='local'?'world':'local');}}],['Restablecer',function(){resetSel();}]].forEach(function(x){var bt=el('button','',x[0]);bt.onclick=x[1];b2.appendChild(bt);});P.appendChild(b2);
  var b3=el('div');[['Copiar cambios',function(){copyEdits();}],['Descargar',function(){dlEdits();}],['Borrar todo',function(){if(confirmClear())clearAll();}]].forEach(function(x){var bt=el('button','',x[0]);bt.onclick=x[1];b3.appendChild(bt);});P.appendChild(b3);
  ui.count=el('div','font-size:11px;color:#aaa;margin-top:4px','');P.appendChild(ui.count);
  P.appendChild(el('div','font-size:11px;color:#999;margin-top:6px;line-height:1.45','Clic: elegir · Clic derecho + arrastrar: mirar · WASD: volar · Q/E: bajar/subir · Shift: rápido · Rueda: escala ±5% · [ ]: padre/hijo · Supr: deseleccionar · F10 o Esc: salir'));
  ui.msg=el('div','font-size:11px;color:#6c6;margin-top:4px;min-height:14px','');P.appendChild(ui.msg);
  P.addEventListener('mousedown',function(e){e.stopPropagation();});P.addEventListener('wheel',function(e){e.stopPropagation();});
  document.body.appendChild(P);return ui;}
var _clearArm=0;function confirmClear(){var t=Date.now();if(t-_clearArm<2500)return true;_clearArm=t;say('Pulsa otra vez para borrar todos los cambios guardados');return false;}
function say(t){if(ui){ui.msg.textContent=t;clearTimeout(say.t);say.t=setTimeout(function(){ui.msg.textContent='';},3000);}}
function setMode(m){if(tc)tc.setMode(m);for(var k in ui.modes)ui.modes[k].className=k===m?'on':'';}
function refresh(){if(!ui)return;ui.count.textContent=Object.keys(EDITS).length+' objeto(s) modificados guardados';
  if(!sel){ui.name.textContent='Haz clic en un objeto';ui.path.textContent='';return;}
  ui.name.textContent=(sel.name||sel.type)+(sel.isSkinnedMesh||sel.getObjectByProperty&&sel.getObjectByProperty('isSkinnedMesh',true)?'  (personaje)':'');ui.path.textContent=pathOf(sel);
  var a=document.activeElement;
  ['x','y','z'].forEach(function(ax,i){if(a!==ui.inp.p[i])ui.inp.p[i].value=r3(sel.position.getComponent(i));if(a!==ui.inp.r[i])ui.inp.r[i].value=Math.round(sel.rotation[ax]*180/Math.PI*10)/10;if(a!==ui.inp.s[i])ui.inp.s[i].value=r3(sel.scale.getComponent(i));});
  if(a!==ui.uni)ui.uni.value=r3(sel.scale.x);}
function exportText(){return JSON.stringify(EDITS,null,1);}
function copyEdits(){var t=exportText();try{navigator.clipboard.writeText(t).then(function(){say('Copiado: pégamelo en el chat');},function(){fallbackCopy(t);});}catch(e){fallbackCopy(t);}}
function fallbackCopy(t){var ta=el('textarea');ta.value=t;document.body.appendChild(ta);ta.select();try{document.execCommand('copy');say('Copiado');}catch(e){say('No se pudo copiar');}ta.remove();}
function dlEdits(){var a=el('a');a.href=URL.createObjectURL(new Blob([exportText()],{type:'application/json'}));a.download='nihdo_creator.json';document.body.appendChild(a);a.click();a.remove();}
function clearAll(){EDITS={};try{localStorage.removeItem(KEY);}catch(e){}say('Cambios borrados (recarga para ver las posiciones originales)');refresh();}
function resetSel(){if(!sel)return;var o=sel.userData.crOrig;if(o){sel.position.fromArray(o.p);sel.rotation.set(o.r[0],o.r[1],o.r[2]);sel.scale.fromArray(o.s);}
  var id=sel.userData.crId||(sceneTag(scene)+':'+pathOf(sel));delete EDITS[id];try{localStorage.setItem(KEY,JSON.stringify(EDITS));}catch(e){}sel.userData.crApplied=null;refresh();say('Restablecido');}

/* ---------- selection ---------- */
function isHelper(o){for(var q=o;q;q=q.parent){if(q===tc||q.userData.crHelper)return true;}return false;}
function modelRoot(o){/* climb to the object that is a whole model: stop under the scene or under a big container */
  var m=o;while(m.parent&&m.parent!==scene&&m.parent.children.length<=6&&!m.parent.isScene)m=m.parent;return m;}
function select(o){sel=o;stack=[];if(o&&!o.userData.crOrig)o.userData.crOrig={p:o.position.toArray(),r:[o.rotation.x,o.rotation.y,o.rotation.z],s:o.scale.toArray()};
  if(tc){if(o)tc.attach(o);else tc.detach();}refresh();}
function up(){if(sel&&sel.parent&&sel.parent!==scene){var st=stack.concat([sel]);select(sel.parent);stack=st;}}
function down(){if(stack.length){var c=stack.pop(),st=stack.slice();select(c);stack=st;}else if(sel&&sel.children.length){select(sel.children[0]);}}
function pick(e){var r=canvas.getBoundingClientRect();mouse.set((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1);ray.setFromCamera(mouse,cam);
  var hits=ray.intersectObjects(scene.children,true).filter(function(h){var o=h.object;if(isHelper(o))return false;for(var q=o;q;q=q.parent)if(!q.visible)return false;return o.isMesh||o.isSkinnedMesh||o.isPoints||o.isSprite;});
  if(!hits.length){select(null);return;}var o=hits[0].object;
  /* clicking the same model again goes one level deeper toward the clicked part */
  if(sel&&sel!==o){var inside=false;for(var q=o;q;q=q.parent)if(q===sel){inside=true;break;}if(inside){var c=o;while(c.parent!==sel)c=c.parent;select(c);return;}}
  select(modelRoot(o));}

/* ---------- gizmo ---------- */
function ensureTC(){if(tc||tcLoading)return;if(T.TransformControls){makeTC();return;}tcLoading=true;
  var s=document.createElement('script');s.src='https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/controls/TransformControls.js';s.onload=function(){tcLoading=false;makeTC();};s.onerror=function(){tcLoading=false;say('No se pudo cargar el gizmo; usa los campos');};document.head.appendChild(s);}
function makeTC(){tc=new T.TransformControls(cam,canvas);tc.setSize(0.9);tc.userData.crHelper=true;
  tc.addEventListener('dragging-changed',function(ev){C.dragging=ev.value;if(!ev.value&&sel)record(sel);});
  tc.addEventListener('objectChange',function(){refresh();});
  if(C.on){scene.add(tc);if(sel)tc.attach(sel);}setMode('translate');}

/* ---------- input ---------- */
function onKey(e){if(e.code==='F10'){e.preventDefault();e.stopImmediatePropagation();toggle();return;}
  if(!C.on)return;var t=e.target;if(t&&(t.tagName==='INPUT'||t.tagName==='TEXTAREA'))return;
  e.stopImmediatePropagation();e.preventDefault();
  if(e.code==='Escape'){toggle();return;}
  keys[e.code]=true;
  if(e.code==='Digit1')setMode('translate');if(e.code==='Digit2')setMode('rotate');if(e.code==='Digit3')setMode('scale');
  if(e.code==='BracketLeft')up();if(e.code==='BracketRight')down();if(e.code==='Delete'||e.code==='Backspace')select(null);
  if(e.code==='KeyL'&&tc)tc.setSpace(tc.space==='local'?'world':'local');
  if(e.code==='KeyF'&&sel){var p=sel.getWorldPosition(new T.Vector3()),d=new T.Vector3(Math.sin(yaw)*Math.cos(pitch),Math.sin(pitch),Math.cos(yaw)*Math.cos(pitch));cam.position.copy(p).addScaledVector(d,-2.5);}}
function onKeyUp(e){if(!C.on)return;keys[e.code]=false;e.stopImmediatePropagation();}
function onDown(e){if(!C.on||e.target!==canvas)return;if(e.button===2){look=true;lx=e.clientX;ly=e.clientY;e.preventDefault();}
  if(e.button===0)downAt=[e.clientX,e.clientY];}
function onUp(e){if(!C.on)return;if(e.button===2)look=false;
  if(e.button===0&&downAt&&e.target===canvas){var moved=Math.hypot(e.clientX-downAt[0],e.clientY-downAt[1]);if(moved<4&&!C.dragging&&!(tc&&tc.axis))pick(e);}downAt=null;}
function onMove(e){if(!C.on||!look)return;yaw-=(e.clientX-lx)*0.004;pitch=Math.max(-1.5,Math.min(1.5,pitch-(e.clientY-ly)*0.004));lx=e.clientX;ly=e.clientY;}
function onWheel(e){if(!C.on||e.target!==canvas||!sel)return;e.preventDefault();var k=e.deltaY<0?1.05:1/1.05;sel.scale.multiplyScalar(k);record(sel);refresh();}
window.addEventListener('keydown',onKey,true);window.addEventListener('keyup',onKeyUp,true);
window.addEventListener('mousedown',onDown,true);window.addEventListener('mouseup',onUp,true);window.addEventListener('mousemove',onMove,true);
window.addEventListener('wheel',onWheel,{capture:true,passive:false});
window.addEventListener('contextmenu',function(e){if(C.on)e.preventDefault();},true);

/* ---------- on / off ---------- */
function toggle(){if(!G)G=window.GAME;if(!G)return;if(C.on)exit();else enter();}
function enter(){var st=G.st();if(['play','limbo'].indexOf(st)<0)return;
  R=G.renderer;canvas=G.canvas;var a=active();scene=a.scene;cam=a.cam;comp=a.comp;
  prevState=st;G.st('creator');C.on=true;keys={};
  try{if(document.pointerLockElement)document.exitPointerLock();}catch(e){}
  camSave={p:cam.position.clone(),q:cam.quaternion.clone(),o:cam.rotation.order,par:cam.parent};
  var wp=cam.getWorldPosition(new T.Vector3()),wq=cam.getWorldQuaternion(new T.Quaternion());if(cam.parent&&cam.parent!==scene){scene.add(cam);}cam.position.copy(wp);cam.quaternion.copy(wq);
  var d=new T.Vector3(0,0,-1).applyQuaternion(wq);yaw=Math.atan2(-d.x,-d.z);pitch=Math.asin(Math.max(-1,Math.min(1,d.y)));cam.rotation.order='YXZ';
  buildUI();ui.p.style.display='block';document.body.classList.add('creator');applyEdits();ensureTC();if(tc){tc.camera=cam;scene.add(tc);if(sel)tc.attach(sel);}refresh();}
function exit(){C.on=false;look=false;if(tc){tc.detach();if(tc.parent)tc.parent.remove(tc);}sel=null;
  if(ui)ui.p.style.display='none';document.body.classList.remove('creator');
  if(camSave){if(camSave.par&&cam.parent!==camSave.par)camSave.par.add(cam);cam.position.copy(camSave.p);cam.quaternion.copy(camSave.q);cam.rotation.order=camSave.o;}
  G.st(prevState);
  if(prevState==='play'||prevState==='limbo'){try{if(!(G.touch&&G.touch())){var pr=canvas.requestPointerLock();if(pr&&pr.catch)pr.catch(function(){});}}catch(e){}}}
C.frame=function(dt){if(!C.on)return;var sp=(keys.ShiftLeft||keys.ShiftRight?9:2.6)*dt;
  var f=new T.Vector3(-Math.sin(yaw)*Math.cos(pitch),Math.sin(pitch),-Math.cos(yaw)*Math.cos(pitch)),r=new T.Vector3(Math.cos(yaw),0,-Math.sin(yaw));
  if(keys.KeyW)cam.position.addScaledVector(f,sp);if(keys.KeyS)cam.position.addScaledVector(f,-sp);if(keys.KeyD)cam.position.addScaledVector(r,sp);if(keys.KeyA)cam.position.addScaledVector(r,-sp);
  if(keys.KeyE)cam.position.y+=sp;if(keys.KeyQ)cam.position.y-=sp;
  cam.rotation.set(pitch,yaw,0,'YXZ');cam.updateMatrixWorld(true);
  if(sel&&!C.dragging)refresh();
  var c=G.comp&&G.comp();if(c)c.render(dt);else R.render(scene,cam);};
C.toggle=toggle;C.view=function(x,y,z,yw,pt){if(!C.on||!cam)return;cam.position.set(x,y,z);yaw=yw;pitch=pt;};C.edits=function(){return EDITS;};
})();
