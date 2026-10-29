/* Nothing I Haven't Dreamed Of — Part II: El Limbo (vertical slice: the hub + the bedroom memory)
   Loaded only when the player goes there. First person, no axe, no combat.
   Borrowed from the main game through window.GAME: renderer, post-processing, audio buses, Damian, Luna, Hollow. */
(function(){
'use strict';
var L={ready:false};window.LIMBO=L;
var G,T=window.THREE,R,scene,cam,ac,AU={},UI={},GL={};
var HOLS=0.235; /* Hollow at Damian's height in the Limbo */
var RO={x:0,z:-60};            /* the bedroom lives here, far from the hub */
var CO={x:80,z:0};             /* the car, stopped at the red light */
var PO={x:-80,z:0};            /* the party house */
var P={x:0,z:7,yaw:Math.PI,pitch:-0.02,phase:0,spd:0,area:'hub',stepAcc:0};
var S={};                      /* run state, reset by restart() */
var timers=[],time=0;
var inter=[],curInter=null;    /* things you can use */

/* ---------- words ---------- */
var TX={
 es:{lily:'Yo creo que el lirio blanco aparece cuando el amor se corrompe.',find:'Busca la luz.',dontLook:'No mires atrás.',
  open:'Abrir',look:'Mirar',take:'Tomar',veil:'Retirar el velo',locked:'Todavía no.',stuck:'No abre.',
  eyes:'Mantén {k} para cerrar los ojos',eyesK:'F',eyesP:'LT',eyesT:'el ojo',
  v1:'Anoche soñé con nosotros.',v2:'Corríamos entre los árboles. La luz entraba entre los pinos.',v3:'Eras feliz. Yo era feliz.',
  v4:'Pero en algún momento… te solté la mano.',v5:'Y cuando quise encontrarte… ya no estabas.',
  mock:'Damián… ¿Ya no me amas?',help:'Damián… ayúdame.',
  endA:'Continuará',endB:'Parte II · El Limbo',endC:'La habitación. El carro. La fiesta. Ahora él sabe.',menu:'Menú principal',again:'Volver a jugar',
  brush:'El labial rojo',mirror:'El espejo',neck:'El collar',door:'La puerta',
  tune:'Sintonizar',reach:'Acercarte',takeHand:'Tomar su mano',radio:'La radio',rear:'El retrovisor',nextDoor:'Otra puerta te espera.',
  noStare:'No lo mires fijamente.',c1:'¿Por qué ya no me hablas?',c2:'Todavía lo intentas…',c4:'Quédate conmigo.',
  findHer:'Encuéntrala.',hall:'El pasillo.',someone:'Hay alguien adentro.',p1:'Te busqué toda la noche.',lunaCall:'¿Damian?',p2:'Nadie me veía.',p3:'No me sueltes.'},
 en:{lily:'I believe the white lily appears when love goes rotten.',find:'Find the light.',dontLook:"Don't look back.",
  open:'Open',look:'Look',take:'Take',veil:'Lift the veil',locked:'Not yet.',stuck:"It won't open.",
  eyes:'Hold {k} to close your eyes',eyesK:'F',eyesP:'LT',eyesT:'the eye',
  v1:'Last night I dreamed about us.',v2:'We were running through the trees. The light came in between the pines.',v3:'You were happy. I was happy.',
  v4:'But at some point… I let go of your hand.',v5:'And when I tried to find you… you were gone.',
  mock:"Damian… don't you love me anymore?",help:'Damian… help me.',
  endA:'To be continued',endB:'Part II · Limbo',endC:'The bedroom. The car. The party. Now he knows.',menu:'Main menu',again:'Play again',
  brush:'The red lipstick',mirror:'The mirror',neck:'The necklace',door:'The door',
  tune:'Tune',reach:'Reach out',takeHand:'Take her hand',radio:'The radio',rear:'The rear-view mirror',nextDoor:'Another door is waiting.',
  noStare:"Don't stare at him.",c1:"Why don't you talk to me anymore?",c2:'You still try…',c4:'Stay with me.',
  findHer:'Find her.',hall:'The hallway.',someone:'Someone is inside.',p1:'I looked for you all night.',lunaCall:'Damian?',p2:'Nobody could see me.',p3:"Don't let go of me."}};
function tx(k){var l=(G&&G.lang())==='es'?'es':'en';return TX[l][k]!==undefined?TX[l][k]:k;}

/* ---------- small helpers ---------- */
function after(sec,fn){timers.push({t:sec,fn:fn});}
var EYE=1.68;
function clamp(v,a,b){return Math.max(a,Math.min(b,v));}
function ss(a,b,x){x=clamp((x-a)/(b-a),0,1);return x*x*(3-2*x);}
function canvasTex(w,h,draw,rep){var c=document.createElement('canvas');c.width=w;c.height=h;draw(c.getContext('2d'),w,h);var t=new T.CanvasTexture(c);if(rep){t.wrapS=t.wrapT=T.RepeatWrapping;t.repeat.set(rep[0],rep[1]);}t.anisotropy=4;return t;}
function std(o){return new T.MeshStandardMaterial(o);}
function box(w,h,d,mat,x,y,z,par){var m=new T.Mesh(new T.BoxGeometry(w,h,d),mat);m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;(par||scene).add(m);return m;}
function rnd(seed){var s=seed||1;return function(){s=(s*16807)%2147483647;return (s-1)/2147483646;};}

/* ---------- textures ---------- */
function texWall(scratched){return canvasTex(256,256,function(g,w,h){
  g.fillStyle='#2b2521';g.fillRect(0,0,w,h);var r=rnd(7);
  for(var x=0;x<w;x+=32){g.fillStyle=(x/32)%2?'rgba(60,50,44,.35)':'rgba(20,16,14,.25)';g.fillRect(x,0,16,h);}
  g.fillStyle='rgba(120,100,82,.12)';for(var yy=16;yy<h;yy+=48)for(var xx=8;xx<w;xx+=32){g.beginPath();g.ellipse(xx,yy,5,9,0,0,6.283);g.fill();}
  for(var i=0;i<14;i++){var gx=r()*w,gy=r()*h,rr=10+r()*50,gr=g.createRadialGradient(gx,gy,0,gx,gy,rr);gr.addColorStop(0,'rgba(10,8,6,.35)');gr.addColorStop(1,'rgba(10,8,6,0)');g.fillStyle=gr;g.fillRect(gx-rr,gy-rr,rr*2,rr*2);}
  if(scratched){g.strokeStyle='rgba(8,6,5,.6)';g.lineWidth=1.5;for(var j=0;j<40;j++){var sx=r()*w,sy=r()*h;g.beginPath();g.moveTo(sx,sy);g.lineTo(sx+(r()-0.5)*40,sy+r()*60);g.stroke();}}
},[2,1.3]);}
function texWood(){return canvasTex(256,256,function(g,w,h){var r=rnd(3);
  for(var y=0;y<h;y+=32){var c=60+r()*25|0;g.fillStyle='rgb('+c+','+(c*0.72|0)+','+(c*0.5|0)+')';g.fillRect(0,y,w,32);
    g.strokeStyle='rgba(0,0,0,.25)';for(var k=0;k<6;k++){g.beginPath();var yy=y+4+r()*24;g.moveTo(0,yy);g.bezierCurveTo(w*0.3,yy+(r()-0.5)*6,w*0.7,yy+(r()-0.5)*6,w,yy);g.stroke();}
    g.fillStyle='rgba(0,0,0,.6)';g.fillRect(0,y,w,2);g.fillRect((r()*w)|0,y,2,32);}
},[3,4]);}
function texBlackTile(floor){return canvasTex(256,256,function(g,w,h){g.fillStyle='#262626';g.fillRect(0,0,w,h);var r=rnd(floor?11:7),n=floor?3:4,cs=w/n;
  for(var y=0;y<n;y++)for(var x=0;x<n;x++){var v=6+Math.floor(r()*7);g.fillStyle='rgb('+v+','+v+','+(v+1)+')';g.fillRect(x*cs+2,y*cs+2,cs-4,cs-4);
    var gr=g.createLinearGradient(x*cs,y*cs,x*cs+cs,y*cs+cs);gr.addColorStop(0,'rgba(255,255,255,0.05)');gr.addColorStop(0.5,'rgba(255,255,255,0)');g.fillStyle=gr;g.fillRect(x*cs+2,y*cs+2,cs-4,cs-4);}
},[1,1]);}
function texNight(){return canvasTex(256,256,function(g,w,h){var gr=g.createLinearGradient(0,0,0,h);gr.addColorStop(0,'#0b1430');gr.addColorStop(0.7,'#16244a');gr.addColorStop(1,'#0a0f1e');g.fillStyle=gr;g.fillRect(0,0,w,h);
  var r=rnd(3);for(var i=0;i<70;i++){g.fillStyle='rgba(220,230,255,'+(0.2+r()*0.6)+')';g.fillRect(r()*w,r()*h*0.7,1,1);}
  var mg=g.createRadialGradient(w*0.42,h*0.3,0,w*0.42,h*0.3,70);mg.addColorStop(0,'rgba(220,232,255,0.9)');mg.addColorStop(0.16,'rgba(200,218,255,0.55)');mg.addColorStop(1,'rgba(120,150,230,0)');g.fillStyle=mg;g.fillRect(0,0,w,h);
  g.fillStyle='#eef3ff';g.beginPath();g.arc(w*0.42,h*0.3,11,0,Math.PI*2);g.fill();
  g.strokeStyle='#04060c';g.lineCap='round';function br(x,y,a,l,t){if(t<0.6||l<4)return;var x2=x+Math.cos(a)*l,y2=y+Math.sin(a)*l;g.lineWidth=t;g.beginPath();g.moveTo(x,y);g.lineTo(x2,y2);g.stroke();br(x2,y2,a-0.4-r()*0.3,l*0.72,t*0.66);br(x2,y2,a+0.35+r()*0.3,l*0.66,t*0.62);}
  br(w,h*0.15,Math.PI*0.88,60,7);br(0,h*0.95,-Math.PI*0.32,70,8);
});}
function texShaft(){return canvasTex(8,128,function(g,w,h){var gr=g.createLinearGradient(0,0,0,h);gr.addColorStop(0,'rgba(255,255,255,1)');gr.addColorStop(1,'rgba(255,255,255,0)');g.fillStyle=gr;g.fillRect(0,0,w,h);});}
/* Damian's hands, first person: black sleeves, bare hands, reaching for her */
function makeFPHands(){
  var skin=std({color:0xa98670,roughness:0.6}),cloth=std({color:0x0b0b0d,roughness:0.9,side:T.DoubleSide});
  function hand(side){var g=new T.Group(),w=new T.Group();g.add(w);
    var sl=new T.Mesh(new T.CylinderGeometry(0.036,0.05,0.85,14,1,true).rotateX(Math.PI/2).translate(0,0,0.44),cloth);w.add(sl);
    var cf=new T.Mesh(new T.CylinderGeometry(0.046,0.046,0.03,12).rotateX(Math.PI/2).translate(0,0,0.025),cloth);w.add(cf);
    var wr=new T.Mesh(new T.CylinderGeometry(0.026,0.03,0.05,10).rotateX(Math.PI/2),skin);w.add(wr);
    var palm=new T.Mesh(new T.SphereGeometry(1,14,10),skin);palm.scale.set(0.04,0.015,0.048);palm.position.set(0,0,-0.055);w.add(palm);
    var fing=[];
    [-0.027,-0.009,0.009,0.027].forEach(function(x,i){var len=[0.042,0.05,0.048,0.038][i],f=new T.Group();f.position.set(x,0,-0.098);
      var a=new T.Mesh(new T.CylinderGeometry(0.0078,0.0085,len,7).rotateX(Math.PI/2).translate(0,0,-len/2),skin);f.add(a);
      var jn=new T.Group();jn.position.z=-len;f.add(jn);var b=new T.Mesh(new T.CylinderGeometry(0.0065,0.0076,len*0.8,7).rotateX(Math.PI/2).translate(0,0,-len*0.4),skin);jn.add(b);
      var tip=new T.Mesh(new T.SphereGeometry(0.0066,7,5),skin);tip.position.z=-len*0.8;jn.add(tip);w.add(f);fing.push({f:f,j:jn});});
    var th=new T.Group();th.position.set(-side*0.036,-0.004,-0.03);th.rotation.y=side*0.7;var tm=new T.Mesh(new T.CylinderGeometry(0.0085,0.0095,0.05,7).rotateX(Math.PI/2).translate(0,0,-0.025),skin);th.add(tm);w.add(th);
    g.userData={w:w,fing:fing,th:th,side:side};g.scale.setScalar(1.3);g.visible=false;return g;}
  GL.fpL=hand(-1);GL.fpR=hand(1);cam.add(GL.fpL);cam.add(GL.fpR);
  GL.fpLight=new T.PointLight(0xffd9b8,0,1.4,1.5);GL.fpLight.position.set(0,0.25,-0.25);cam.add(GL.fpLight);
  if(!cam.parent)scene.add(cam);
}
/* Damian's Mixamo clips (Driving, Kiss, Reaching, Opening), loaded in the background */
function loadDamianClips(){
  if(GL.clipsLoading)return;GL.clipsLoading=true;
  fetch('damian_anims.json?v=1').then(function(r){return r.json();}).then(function(j){GL.clips={};for(var n in j){try{GL.clips[n]=T.AnimationClip.parse(j[n]);}catch(e){}}
    if(P.area==='car'&&!S.dmUse)dmUse('Driving');kissMix();
  }).catch(function(){});
}
function dmAct(name){var D=DM();if(!GL.clips||!GL.clips[name]||!D||!D.mixer)return null;var clip=GL.clips[name];if(D!==G.dmn){clip=altClip(D,name,clip);if(!clip)return null;}
  GL.dmActs=GL.dmActs||{};return GL.dmActs[name]||(GL.dmActs[name]=D.mixer.clipAction(clip));}
/* his clips were made on his old rig: the new bodies get them re-aimed bone by bone (see retarget) */
function damRest(cb){if(GL.dRest){cb(GL.dRest);return;}(GL.dRestQ=GL.dRestQ||[]).push(cb);if(GL.dRestL)return;GL.dRestL=true;
  fetch('damian.b64.txt').then(function(r){return r.text();}).then(function(t){var bin=atob(t.trim()),u=new Uint8Array(bin.length);for(var i=0;i<bin.length;i++)u[i]=bin.charCodeAt(i);
    new T.GLTFLoader().parse(u.buffer,'',function(g){GL.dRest=restClone(g.scene,null);var q=GL.dRestQ;GL.dRestQ=[];q.forEach(function(f){try{f(GL.dRest);}catch(e){console.warn(e);}});});}).catch(function(e){console.warn('damRest',e);});}
function altClip(D,name,clip){if(!D.src||!clip)return null;D.rc=D.rc||{};if(!D.rc[name]){try{D.rc[name]=retarget(restClone(D.src,null),clip,D.rest);}catch(e){console.warn('rt '+name,e);D.rc[name]=null;}}return D.rc[name];}
function kissMix(){var D=GL.alt.suit;if(!GL.dClone||!GL.dClone.isObject3D||!GL.clips||!GL.clips.Kiss)return;
  var c=GL.clips.Kiss;if(D&&GL.dClone.userData.suit){c=altClip(D,'Kiss',c);if(!c)return;}GL.dcMix=new T.AnimationMixer(GL.dClone);GL.dcAct=GL.dcMix.clipAction(c);GL.dcAct.play();}
/* Damian's other bodies: before the party (white shirt, painted face) in the bathroom and the car; the black suit at the party */
function DM(){return GL.heroAlt||G.dmn;}
function altFor(a){return (a==='party'||a==='car'||a==='room')?GL.alt.suit||null:null;}
GL.alt={};
function loadAlt(key,file,cb){if(GL.alt[key]||GL['altL_'+key]||!T.GLTFLoader)return;GL['altL_'+key]=true;
  new T.GLTFLoader().load(file,function(g){var m=g.scene;
    m.traverse(function(o){if(o.isMesh){o.frustumCulled=false;o.castShadow=false;var ms=Array.isArray(o.material)?o.material:[o.material];ms.forEach(function(x){x.skinning=true;x.roughness=Math.max(0.6,x.roughness||0.85);x.metalness=0;});}});
    m.updateMatrixWorld(true);var hp=m.getObjectByName('mixamorigHips'),hy=hp?hp.getWorldPosition(new T.Vector3()).y:0.95;
    var sc=0.8324/Math.max(0.1,hy);
    /* his arms have to reach the same wheel and the same mirror: lean toward the old rig's arm length */
    var al=function(r){var a=r.getObjectByName('mixamorigRightArm'),b=r.getObjectByName('mixamorigRightForeArm'),c=r.getObjectByName('mixamorigRightHand');if(!a||!b||!c)return 0;r.updateMatrixWorld(true);var pa=a.getWorldPosition(new T.Vector3()),pb=b.getWorldPosition(new T.Vector3()),pc=c.getWorldPosition(new T.Vector3());return (pa.distanceTo(pb)+pb.distanceTo(pc))/r.scale.x;};
    var la=al(m),lo=G.hero?al(G.hero):0;if(la>0&&lo>0)sc=Math.max(sc,0.5*(sc+lo/la));
    m.scale.setScalar(sc);m.visible=false;scene.add(m);
    var D={g:m,key:key,sc:sc,mixer:new T.AnimationMixer(m),acts:{},anims:g.animations||[],rest:T.SkeletonUtils?restClone(m,null):null};
    GL.alt[key]=D;heroSync();if(cb)cb(D);
    if(D.rest)damRest(function(src){D.src=src;var A=G.dmn&&G.dmn.acts;
      if(A)['idle','walk'].forEach(function(n){if(A[n]){var c=altClip(D,n,A[n].getClip());if(!c)return;var ac2=D.mixer.clipAction(c);ac2.play();ac2.setEffectiveWeight(0);D.acts[n]=ac2;}});
      if(GL.heroAlt===D){GL.dmActs={};if(P.area==='car')dmUse('Driving');}if(key==='suit')kissMix();});
  },undefined,function(e){console.warn('damian '+key,e);});}
/* Damian wears the black suit everywhere in the Limbo: bathroom, car and party */
function loadSuit(){loadAlt('suit','damian_suit.glb?v=2',function(D){kissDamian(D);var wc=D.anims.filter(function(a){return /walk/i.test(a.name);})[0];if(wc&&T.SkeletonUtils){GL.walkRig=restClone(D.g,null);GL.walkSrc=wc;makeLunaWalk();}});}
function loadDamianPP(){loadSuit();}
function heroSync(){if(!GL.hero)return;var want=altFor(P.area)||null;if(want===(GL.heroAlt||null))return;
  var old=GL.hero,vis=old.visible,f=GL.fb;
  if(f){if(f.Head)f.Head.scale.setScalar(1);if(f.q)for(var n in f.q)f[n].quaternion.copy(f.q[n]);}
  var use=S.dmUse;dmStop();GL.dmActs={};
  GL.heroAlt=want;GL.heroPP=!!want;GL.hero=want?want.g:G.hero;GL.fb=undefined;
  GL.hero.position.copy(old.position);GL.hero.rotation.copy(old.rotation);old.visible=false;GL.hero.visible=vis;
  if(vis){var f2=fbInit();if(f2&&f2.Head)f2.Head.scale.setScalar(0.001);}
  if(use)dmUse(use);}
function dmUse(name,o){o=o||{};var a=dmAct(name);if(!a)return false;dmStop();a.reset();a.setLoop(o.once?T.LoopOnce:T.LoopRepeat,Infinity);a.clampWhenFinished=true;a.timeScale=o.speed||1;a.setEffectiveWeight(1);a.play();if(o.at)a.time=o.at;S.dmUse=name;return true;}
function dmStop(){if(GL.dmActs)for(var n in GL.dmActs){GL.dmActs[n].stop();}S.dmUse=null;}
/* his body behind the camera, head hidden, so his arms are what you see */
function fpBody(back,down){var f=fbInit();if(!f)return;var h=GL.hero,fx=Math.sin(P.yaw),fz=Math.cos(P.yaw);GL.fpOn=true;h.visible=true;if(f.Head)f.Head.scale.setScalar(0.001);
  h.position.set(P.x-fx*back,(S.camDY||0)-down,P.z-fz*back);h.rotation.y=P.yaw;h.updateMatrixWorld(true);}
function fpBodyOff(){var f=fbInit();GL.fpOn=false;GL.hero.visible=false;if(f&&f.Head)f.Head.scale.setScalar(1);}
/* opening a door: his hand comes up into view for a moment */
function fpOpen(){if(!dmUse('Opening',{once:true,speed:1.6,at:0.55}))return;S.fpOpen=1.35;}
/* his real arms: Damian's own model, head hidden, arms posed by aiming each bone at a target (two-bone IK) */
var _q1=new T.Quaternion(),_q2=new T.Quaternion(),_q3=new T.Quaternion(),_v1=new T.Vector3(),_v2=new T.Vector3(),_v3=new T.Vector3(),_ht=new T.Vector3(),_et=new T.Vector3();
function fbInit(){if(GL.fb!==undefined)return GL.fb;var h=GL.hero,f={};if(!h)return (GL.fb=null);
  ['LeftArm','LeftForeArm','LeftHand','RightArm','RightForeArm','RightHand','Head'].forEach(function(n){f[n]=h.getObjectByName('mixamorig'+n);});
  if(!f.LeftArm||!f.RightArm||!f.LeftForeArm||!f.RightForeArm||!f.LeftHand||!f.RightHand)return (GL.fb=null);
  f.q={};['LeftArm','LeftForeArm','RightArm','RightForeArm'].forEach(function(n){f.q[n]=f[n].quaternion.clone();});return (GL.fb=f);}
/* turn a hand so its palm and fingers point where asked, then close the fingers (rig-agnostic: reads the knuckles) */
var _hv1=new T.Vector3(),_hv2=new T.Vector3(),_hq=new T.Quaternion(),_hm=new T.Matrix4(),_hm2=new T.Matrix4(),_ha=new T.Vector3(),_hb=new T.Vector3(),_hc=new T.Vector3(),_hd=new T.Vector3(),_hx=new T.Vector3(),_hy=new T.Vector3(),_hz=new T.Vector3();
function handFrame(HD,side,F,N){var r=HD.parent;while(r.parent&&r.parent.parent)r=r.parent;var g=function(n){return HD.getObjectByName('mixamorig'+side+'Hand'+n);};
  var mi=g('Middle1'),ix=g('Index1'),pk=g('Pinky1');
  if(!mi||!ix||!pk){/* a hand without finger bones: fingers point at the middle-finger tip, the palm faces down in the T-pose rest */
    var tip=g('Middle4'),D=GL.heroAlt;if(!tip||!D||!D.rest)return false;var rb=D.rest.getObjectByName(HD.name);if(!rb)return false;
    if(!HD.userData.palmL){HD.userData.palmL=new T.Vector3(0,-1,0).applyQuaternion(rb.getWorldQuaternion(new T.Quaternion()).invert());}
    HD.updateMatrixWorld(true);HD.getWorldPosition(_ha);tip.getWorldPosition(_hb);F.copy(_hb).sub(_ha).normalize();
    N.copy(HD.userData.palmL).applyQuaternion(HD.getWorldQuaternion(_q2)).addScaledVector(F,-0).normalize();return true;}
  HD.updateMatrixWorld(true);
  HD.getWorldPosition(_ha);mi.getWorldPosition(_hb);ix.getWorldPosition(_hc);pk.getWorldPosition(_hd);
  F.copy(_hb).sub(_ha).normalize();_hc.sub(_hd).normalize();N.crossVectors(F,_hc).multiplyScalar(side==='Right'?-1:1).normalize();return true;}
function handPose(HD,side,palm,fwd,curl){
  if(!handFrame(HD,side,_hx,_hy))return;
  _hz.crossVectors(_hx,_hy);_hm.makeBasis(_hx,_hy,_hz);
  var tf=_ha.copy(fwd).normalize(),tp=_hb.copy(palm).addScaledVector(tf,-palm.dot(tf)).normalize();_hc.crossVectors(tf,tp);_hm2.makeBasis(tf,tp,_hc);
  _hq.setFromRotationMatrix(_hm2.multiply(_hm.transpose()));
  var wq=HD.getWorldQuaternion(_q2).premultiply(_hq);HD.parent.getWorldQuaternion(_q3);HD.quaternion.copy(_q3.invert().multiply(wq));HD.updateMatrixWorld(true);
  if(!curl)return;var ax=_hd.crossVectors(tf,tp).normalize();
  ['Index','Middle','Ring','Pinky','Thumb'].forEach(function(fn){for(var j=1;j<=3;j++){var b=HD.getObjectByName('mixamorig'+side+'Hand'+fn+j);if(!b)continue;
    var ang=(fn==='Thumb'?0.35:(j===1?0.9:0.8))*curl;_hq.setFromAxisAngle(ax,ang);var bq=b.getWorldQuaternion(_q2).premultiply(_hq);b.parent.getWorldQuaternion(_q3);b.quaternion.copy(_q3.invert().multiply(bq));b.updateMatrixWorld(true);}});}
function handCurl(HD,side,curl){if(!handFrame(HD,side,_hx,_hy))return;var ax=_hd.crossVectors(_hx,_hy).normalize();
  ['Index','Middle','Ring','Pinky','Thumb'].forEach(function(fn){for(var j=1;j<=3;j++){var b=HD.getObjectByName('mixamorig'+side+'Hand'+fn+j);if(!b)continue;
    var ang=(fn==='Thumb'?(j===1?0.15:0.3):(j===1?0.75:j===2?0.9:0.55))*curl;_hq.setFromAxisAngle(ax,ang);var bq=b.getWorldQuaternion(_q2).premultiply(_hq);b.parent.getWorldQuaternion(_q3);b.quaternion.copy(_q3.invert().multiply(bq));b.updateMatrixWorld(true);}});}
function aimBone(b,c,target){
  b.updateMatrixWorld(true);b.getWorldPosition(_v1);c.getWorldPosition(_v2);
  _v2.sub(_v1).normalize();_v3.copy(target).sub(_v1).normalize();
  _q1.setFromUnitVectors(_v2,_v3);b.getWorldQuaternion(_q2);b.parent.getWorldQuaternion(_q3);
  b.quaternion.copy(_q3.invert().multiply(_q1.multiply(_q2)));b.updateMatrixWorld(true);
}
function fpHands(rise,reach,shake,panic){
  var f=fbInit();
  if(!f){fpHandsSimple(rise,reach,shake,panic);return;}
  var h=GL.hero;
  if(rise<0.01){if(GL.fpOn){GL.fpOn=false;h.visible=false;if(f.Head)f.Head.scale.setScalar(1);for(var n in f.q)f[n].quaternion.copy(f.q[n]);}return;}
  GL.fpOn=true;h.visible=true;if(f.Head)f.Head.scale.setScalar(0.001);
  var fx=Math.sin(P.yaw),fz=Math.cos(P.yaw),rx=-Math.cos(P.yaw),rz=Math.sin(P.yaw),dy=S.camDY||0;
  h.position.set(P.x-fx*0.1,dy-0.17,P.z-fz*0.1);h.rotation.y=P.yaw;h.updateMatrixWorld(true);
  var ey=EYE+dy;
  [['Left',-1],['Right',1]].forEach(function(sd,i){var A=f[sd[0]+'Arm'],FA=f[sd[0]+'ForeArm'],HD=f[sd[0]+'Hand'],s1=sd[1];
    var tn=time*(i?23:19),fw=0.32+0.46*reach+0.12*panic,side=s1*(0.22-0.1*reach+0.05*panic),up=-0.95+0.74*rise+0.42*reach+0.06*panic;
    _ht.set(P.x+fx*fw+rx*side+Math.sin(tn)*shake,ey+up+Math.sin(tn*1.3+1)*shake,P.z+fz*fw+rz*side+Math.sin(tn*0.7)*shake);
    A.getWorldPosition(_v1);_et.copy(_v1).add(_ht).multiplyScalar(0.5);_et.x+=rx*s1*0.1;_et.z+=rz*s1*0.1;_et.y-=0.14;
    aimBone(A,FA,_et);aimBone(FA,HD,_ht);});
}
/* rise: 0..1 up into view; reach: 0..1 arms out toward her; shake: tremble; panic: fingers splayed, arms thrown forward */
function fpHandsSimple(rise,reach,shake,panic){
  if(!GL.fpL)return;
  if(GL.fpLight)GL.fpLight.intensity=rise>0.01?0.45*rise:0;
  [GL.fpL,GL.fpR].forEach(function(h,i){var u=h.userData,sd=u.side;h.visible=rise>0.01;if(!h.visible)return;
    /* wrist position in front of the eyes; the sleeve trails back and out to the bottom corner */
    var x=sd*(0.26-0.11*reach+0.03*panic),y=-0.56+0.3*rise+0.06*reach+0.05*panic,z=-0.5-0.16*reach-0.1*panic;
    var tn=time*(i?23:19);h.position.set(x+Math.sin(tn)*shake,y+Math.sin(tn*1.3+1)*shake,z+Math.sin(tn*0.7)*shake*0.5);
    h.rotation.set(0.42-0.2*reach+0.1*panic,sd*(0.5-0.15*reach),sd*(-0.35+0.2*reach));
    var curl=0.55*(1-reach)+0.12-0.3*panic;u.fing.forEach(function(F,j){F.f.rotation.x=-curl*0.6;F.j.rotation.x=-curl;F.f.rotation.y=(j-1.5)*0.08*(1+panic*2);});
    u.th.rotation.x=-curl*0.4;});
}
/* the shroud over her, and the pendant: models swapped into the meshes the game already moves around */
/* the makeup kit on the shelf (its lipstick is the one he takes), and the necklace on the tub */
function loadKitModels(){
  if(!T.GLTFLoader)return;
  new T.GLTFLoader().load('makeup.glb?v=1',function(gl){
    var k=gl.scene,sh=GL.shelf,BA=GL.bath;k.scale.setScalar(0.00085);k.rotation.y=-Math.PI/2;k.position.set(sh.x,sh.y,sh.z-0.14);
    k.traverse(function(o){if(o.isMesh){o.castShadow=true;o.receiveShadow=true;}});BA.add(k);k.updateMatrixWorld(true);
    var lip=k.getObjectByName('lipstick'),cap=k.getObjectByName('cap001');
    if(lip){var g=new T.Group();BA.add(g);g.updateMatrixWorld(true);g.attach(lip);if(cap)g.attach(cap);
      var wasVis=GL.brush.visible;BA.remove(GL.brush);GL.brush=g;g.visible=wasVis;
      lip.traverse(function(o){if(o.isMesh&&o.material&&/crimson/i.test(o.material.name)){o.material=o.material.clone();o.material.emissive=new T.Color(0);GL.bristleM=o.material;}});
      var bb=new T.Box3().setFromObject(lip);GL.brushPos.copy(bb.getCenter(new T.Vector3()));}
    (GL.stubs||[]).forEach(function(m){BA.remove(m);});GL.kit=k;
  },undefined,function(){});
  new T.GLTFLoader().load('necklace.glb?v=1',function(gl){
    var m=gl.scene;m.updateMatrixWorld(true);var bb=new T.Box3().setFromObject(m),c=bb.getCenter(new T.Vector3());
    var piv=new T.Group();piv.add(m);m.position.set(-c.x,-bb.max.y,-c.z);
    GL.neck.children.slice().forEach(function(o){if(!o.isSprite)o.visible=false;});
    /* lying on the wet tiles in front of the tub, pendant face up */
    var flat=new T.Group();flat.scale.set(1.8,0.5,1.8);piv.rotation.x=-Math.PI/2;flat.add(piv);flat.position.set(0,0.03,0.12);GL.neck.add(flat);GL.neckModel=flat;
    var nl=new T.PointLight(0xffe2b0,0.9,0.9,2);nl.position.set(0,0.35,0.1);GL.neck.add(nl);
    m.traverse(function(o){if(o.isMesh){o.castShadow=true;if(o.material){o.material.emissive=new T.Color(0xffffff);o.material.emissiveMap=o.material.map;o.material.emissiveIntensity=1.4;o.material.needsUpdate=true;}}});
  },undefined,function(){});
}
function loadVeilModels(){
  if(!T.GLTFLoader)return;
  function geoOf(gl){var g=null;gl.scene.updateMatrixWorld(true);gl.scene.traverse(function(o){if(o.isMesh&&!g){g=o.geometry.clone();g.applyMatrix4(o.matrixWorld);}});return g;}
  new T.GLTFLoader().load('shroud.glb?v=1',function(gl){var g=geoOf(gl);if(!g)return;
    g.computeBoundingBox();var b=g.boundingBox,h=b.max.y-b.min.y,sc=1.86/h;g.translate(-(b.min.x+b.max.x)/2,-b.min.y,-(b.min.z+b.max.z)/2);g.scale(sc,sc,sc);
    if(!g.attributes.normal)g.computeVertexNormals();
    var old=GL.veil.geometry;GL.veil.geometry=g;old.dispose();
    var m=GL.veil.material;m.color.setHex(0xdcdfdc);m.roughness=0.88;m.emissive.setHex(0x101112);m.opacity=1;m.needsUpdate=true;
  },undefined,function(){});
  new T.GLTFLoader().load('pendant.glb?v=1',function(gl){var g=geoOf(gl);if(!g||!GL.pend)return;
    g.computeBoundingBox();var b=g.boundingBox,h=b.max.y-b.min.y,sc=0.09/h;g.translate(-(b.min.x+b.max.x)/2,-(b.min.y+b.max.y)/2,-(b.min.z+b.max.z)/2);g.scale(sc,sc,sc);g.computeVertexNormals();
    var old=GL.pend.geometry;GL.pend.geometry=g;old.dispose();GL.pend.rotation.set(-Math.PI/2,0,0.5);GL.pend.position.set(0.0,0.004,0.085);
  },undefined,function(){});
}
/* the obsidian arm that comes up out of the water for him */
function loadHandModel(){
  if(!T.GLTFLoader)return;
  new T.GLTFLoader().load('hand.glb?v=1',function(gl){
    var proto=gl.scene;proto.traverse(function(o){if(o.isMesh){o.frustumCulled=false;o.castShadow=false;o.receiveShadow=false;if(o.material){o.material.color.setHex(0xb4bac6);o.material.roughness=0.26;o.material.normalMap=null;o.material.onBeforeCompile=function(sh){sh.fragmentShader=sh.fragmentShader.replace('#include <normal_fragment_begin>',T.ShaderChunk.normal_fragment_begin.replace(/normalize\( vNormal \)/g,'normalize( vNormal + vec3( 0.0, 0.0, 1e-5 ) )'));};o.material.needsUpdate=true;o.material.metalness=0.35;if(o.material.map)o.material.map.anisotropy=4;}}});
    GL.arms=[];
    for(var i=0;i<6;i++){var piv=new T.Group(),a=proto.clone(true);a.position.x=0.47;piv.add(a);piv.visible=false;scene.add(piv);GL.arms.push({p:piv,a:a});}
    GL.armLight=new T.PointLight(0x8fa8ff,0,4,1.6);scene.add(GL.armLight);
    try{GL.arms.forEach(function(A){A.p.visible=true;});R.compile(scene,cam);GL.arms.forEach(function(A){A.p.visible=false;});}catch(e){}
  },undefined,function(){});
}
var _m4=new T.Matrix4(),_ax=new T.Vector3(1,0,0),_ad=new T.Vector3(),_aq=new T.Quaternion(),_ar=new T.Quaternion();
function armsStart(){
  var r=S.rv;if(!GL.arms)return false;
  /* where each hand closes, relative to his eyes [right, up, forward], and where its arm comes from [right, up, forward] (all from above) */
  var L=[[0.02,0.16,0.8, 0.05,0.9,0.42],[-0.2,0.11,0.76, -0.42,0.84,0.34],[0.22,0.09,0.74, 0.46,0.82,0.3],
         [-0.37,0.02,0.68, -0.72,0.66,0.2],[0.39,0.0,0.66, 0.72,0.66,0.2],[0.1,0.24,0.66, 0.22,0.95,0.2]];
  r.arms=GL.arms.map(function(A,i){var c=L[i],a=new T.Vector3(c[3],c[4],c[5]).normalize();
    return {A:A,g:[c[0],c[1],c[2]],a:a,sc:0.95+Math.random()*0.12,d:[0.05,0.14,0,0.1,0.2,0.24][i]};});
  return true;
}
function armsTick(dt){
  var r=S.rv;if(!r||!r.arms||!r.snap||r.cut)return;var k=r.t-r.st;
  var fx=Math.sin(P.yaw),fz=Math.cos(P.yaw),rx=-Math.cos(P.yaw),rz=Math.sin(P.yaw),c=cam.position;
  GL.armLight.intensity=(1-ss(1.6,2.5,k))*3.5;GL.armLight.position.set(c.x+fx*0.7,c.y+0.7,c.z+fz*0.7);
  r.arms.forEach(function(o,i){var A=o.A,u=ss(o.d,o.d+0.3,k),len=0.94*o.sc;A.p.visible=k>=o.d;if(!A.p.visible)return;
    var tr=Math.sin(k*31+i*2)*0.006;
    /* the hand closes on this point; the arm hangs back up along its approach */
    var tx=c.x+rx*o.g[0]+fx*o.g[2]+tr,ty=c.y+o.g[1]+tr,tz=c.z+rz*o.g[0]+fz*o.g[2];
    var ax=rx*o.a.x+fx*o.a.z,ay=o.a.y,az=rz*o.a.x+fz*o.a.z,ext=len+(1-u)*1.1;
    var px=tx+ax*ext,py=ty+ay*ext,pz=tz+az*ext;
    A.p.position.set(px,py,pz);
    /* basis: +X runs down the arm to the fingers, -Z (the palm) turns to his eyes */
    _ad.set(-ax,-ay,-az);
    _v.set(c.x-(px-ax*len*0.85),c.y-(py-ay*len*0.85),c.z-(pz-az*len*0.85));_v.addScaledVector(_ad,-_v.dot(_ad));
    if(_v.lengthSq()<1e-6)_v.set(0,-1,0);_v.normalize().negate();
    _v1.crossVectors(_v,_ad);_m4.makeBasis(_ad,_v1,_v);A.p.quaternion.setFromRotationMatrix(_m4);
    /* the arm is bent: mirror it (a left arm) if its elbow would swing into his face */
    if(!o.sy){var ex=px+_ad.x*0.45*len,ey=py+_ad.y*0.45*len,ez=pz+_ad.z*0.45*len,e=0.21*o.sc;
      var d1=Math.hypot(ex-_v1.x*e-c.x,ey-_v1.y*e-c.y,ez-_v1.z*e-c.z),d2=Math.hypot(ex+_v1.x*e-c.x,ey+_v1.y*e-c.y,ez+_v1.z*e-c.z);o.sy=d1>=d2?1:-1;}
    A.p.scale.set(o.sc,o.sc*o.sy,o.sc);});
}
function armsHide(){if(GL.arms)GL.arms.forEach(function(A){A.p.visible=false;});if(GL.armLight)GL.armLight.intensity=0;}
/* the bedroom set (bed + desk + chair), placed with the headboard on the west wall and the desk in the north-west corner */
function loadBedModel(B){
  if(!T.GLTFLoader)return;
  new T.GLTFLoader().load('bedroom.glb?v=1',function(gl){
    var m=gl.scene;m.scale.setScalar(0.78);m.rotation.y=Math.PI/2;m.position.set(-0.86,0,-0.97);
    m.traverse(function(o){if(!o.isMesh)return;o.castShadow=true;o.receiveShadow=true;var mt=o.material;if(mt){mt.side=T.FrontSide;if(mt.map)mt.map.anisotropy=4;mt.color.setHex(0xd8d2c6);GL.sheetM=mt;}});
    B.add(m);GL.bedModel=m;if(GL.bedStub){B.remove(GL.bedStub);GL.bedStub=null;}
  },undefined,function(){});
}
/* the bathroom model: restyled on load (black, white tub, red sink, brass) */
function loadBathModel(BA){
  if(!T.GLTFLoader)return;
  new T.GLTFLoader().load('bathroom.glb?v=2',function(gl){
    var oldW=GL.water;
    var m=gl.scene,b=GL.bs;m.scale.setScalar(b.s);m.rotation.y=-Math.PI/2;m.position.set(b.x,b.y,b.z);
    var white=std({color:0xf4f2ec,roughness:0.16,metalness:0}),red=std({color:0x8e0c0c,roughness:0.2,metalness:0.05}),black=std({color:0x0d0d0e,roughness:0.35}),
      brass=std({color:0xb08a4e,roughness:0.32,metalness:0.55}),dark=std({color:0x15161a,roughness:0.06,metalness:0.9}),
      glass=std({color:0x8a9aa8,roughness:0.05,metalness:0.3,transparent:true,opacity:0.16,depthWrite:false}),
      water=std({color:0x05080a,roughness:0.03,metalness:0.75}),bar=std({color:0xfff1d8,emissive:0xffc88a,emissiveIntensity:1.3});
    var MAP={Object_4:red,Object_17:white,Object_38:red,Object_40:black,Object_41:black,Object_19:(T.Reflector?null:dark),Object_24:GL.bulbM,Object_56:water,Object_44:glass,Object_8:white,Object_12:black,Object_13:brass};
    m.traverse(function(o){if(!o.isMesh)return;var nm=o.name,mt=MAP[nm];if((nm==='Object_19'&&T.Reflector)||nm==='Object_20'||nm==='Object_24'){o.visible=false;return;}
      if(!mt){var on=(o.material&&o.material.name)||'';mt=(on.indexOf('mirror_frame')===0||on==='shilang'||nm==='partition_frame'||on.indexOf('edge_wear')===0)?(on.indexOf('edge_wear')===0?black:brass):o.material;}
      if(o.material&&o.material!==mt&&o.material.dispose)o.material.dispose();o.material=mt;
      o.castShadow=mt!==glass&&mt!==water;o.receiveShadow=true;
      if(nm==='Object_56'){GL.water=o;GL.waterY=o.position.y;}});
    /* the fixed glass panel of the partition (the sliding half stays open) */
    var pp=GL.part,pane=new T.Mesh(new T.PlaneGeometry(pp.zb-pp.za,pp.h),glass);pane.position.set(pp.x,pp.h/2+0.03,(pp.za+pp.zb)/2);pane.rotation.y=Math.PI/2;BA.add(pane);
    if(GL.tubBox)BA.remove(GL.tubBox);if(oldW&&oldW!==GL.water)BA.remove(oldW);
    BA.add(m);GL.bathModel=m;
    /* compile now so opening the door doesn't hitch */
    try{var v=BA.visible;BA.visible=true;R.compile(scene,cam);BA.visible=v;}catch(e){}
  },undefined,function(){});
}
function texTile(){return canvasTex(128,128,function(g,w,h){g.fillStyle='#7d8580';g.fillRect(0,0,w,h);var r=rnd(5);
  for(var y=0;y<h;y+=32)for(var x=0;x<w;x+=32){var c=110+r()*30|0;g.fillStyle='rgb('+(c-6)+','+c+','+(c-3)+')';g.fillRect(x+2,y+2,28,28);}
  for(var i=0;i<10;i++){var gx=r()*w,gy=r()*h,rr=8+r()*20,gr=g.createRadialGradient(gx,gy,0,gx,gy,rr);gr.addColorStop(0,'rgba(40,46,30,.35)');gr.addColorStop(1,'rgba(40,46,30,0)');g.fillStyle=gr;g.fillRect(gx-rr,gy-rr,rr*2,rr*2);}
},[3,3]);}
function texPhoto(scratched){return canvasTex(128,160,function(g,w,h){
  var gr=g.createLinearGradient(0,0,0,h);gr.addColorStop(0,'#cdbfa3');gr.addColorStop(1,'#8f8269');g.fillStyle=gr;g.fillRect(0,0,w,h);
  g.fillStyle='#3b4a32';g.fillRect(0,h*0.55,w,h*0.45);
  [[44,'#2a2320'],[84,'#efe9df']].forEach(function(p){g.fillStyle=p[1];g.beginPath();g.arc(p[0],70,11,0,6.283);g.fill();g.fillRect(p[0]-13,82,26,60);});
  if(scratched){g.fillStyle='#0b0908';g.strokeStyle='#0b0908';g.lineWidth=3;[[44,70],[84,70]].forEach(function(c){for(var i=0;i<16;i++){g.beginPath();g.moveTo(c[0]-12+Math.random()*24,c[1]-12+Math.random()*24);g.lineTo(c[0]-12+Math.random()*24,c[1]-12+Math.random()*24);g.stroke();}});}
  g.strokeStyle='#f3efe6';g.lineWidth=8;g.strokeRect(0,0,w,h);
});}
function texDrips(){return canvasTex(128,192,function(g,w,h){g.clearRect(0,0,w,h);var r=rnd(11);
  for(var i=0;i<14;i++){var x=r()*w,l=40+r()*150,wd=2+r()*5;g.fillStyle='rgba(6,6,7,'+(0.75+r()*0.25)+')';g.fillRect(x,0,wd,l);g.beginPath();g.arc(x+wd/2,l,wd*0.9,0,6.283);g.fill();}
  g.fillStyle='rgba(6,6,7,.85)';g.fillRect(0,0,w,10);
});}
function texGlow(){return canvasTex(64,64,function(g,w,h){var gr=g.createRadialGradient(32,32,0,32,32,32);gr.addColorStop(0,'rgba(255,255,255,1)');gr.addColorStop(0.35,'rgba(255,255,255,.35)');gr.addColorStop(1,'rgba(255,255,255,0)');g.fillStyle=gr;g.fillRect(0,0,w,h);});}

/* ---------- builders ---------- */
function makeCone(h,r,col,op){
  var geo=new T.ConeGeometry(r,h,32,1,true);geo.translate(0,-h/2,0);
  var m=new T.Mesh(geo,new T.ShaderMaterial({transparent:true,depthWrite:false,blending:T.AdditiveBlending,side:T.DoubleSide,
    uniforms:{k:{value:op||1},c:{value:new T.Color(col)}},
    vertexShader:'varying vec3 vN;varying vec3 vV;varying float vT;uniform float hh;void main(){vT=-position.y/'+h.toFixed(2)+';vN=normalize(normalMatrix*normal);vec4 mv=modelViewMatrix*vec4(position,1.0);vV=normalize(-mv.xyz);gl_Position=projectionMatrix*mv;}',
    fragmentShader:'uniform float k;uniform vec3 c;varying vec3 vN;varying vec3 vV;varying float vT;void main(){float f=pow(abs(dot(normalize(vN),normalize(vV))),1.5);float a=((1.0-vT*0.55)*f*0.16+0.012)*k;gl_FragColor=vec4(c,a);}'}));
  m.renderOrder=5;m.frustumCulled=false;return m;
}
function makeVeil(){
  var pts=[],H=1.78;
  [[0.0,1.78],[0.12,1.76],[0.17,1.66],[0.15,1.55],[0.12,1.5],[0.36,1.42],[0.42,1.2],[0.44,0.9],[0.5,0.5],[0.6,0.12],[0.66,0.0]].forEach(function(p){pts.push(new T.Vector2(p[0],p[1]));});
  var geo=new T.LatheGeometry(pts,48),ps=geo.attributes.position;
  for(var i=0;i<ps.count;i++){var x=ps.getX(i),y=ps.getY(i),z=ps.getZ(i),a=Math.atan2(z,x),rr=Math.hypot(x,z);if(rr<0.01)continue;
    var f=1+Math.sin(a*9+y*2.6)*0.05*(1-y/H)+Math.sin(a*4-y*5)*0.025;ps.setX(i,x*f);ps.setZ(i,z*f);}
  geo.computeVertexNormals();
  var mat=std({color:0xe8e4dc,roughness:0.96,metalness:0,side:T.DoubleSide,emissive:0x1a1a1a,transparent:true,opacity:1});
  var m=new T.Mesh(geo,mat);m.castShadow=true;m.receiveShadow=true;return m;
}
/* the wooden doors from the pack: D1 dark walnut, D2 red-brown; frame and leaf swapped into each door */
function loadDoorModels(){
  if(!T.GLTFLoader)return;
  new T.GLTFLoader().load('doors.glb?v=1',function(gl){
    var P2={},sc=2.25/5.3;gl.scene.updateMatrixWorld(true);
    ['D1','D2'].forEach(function(k){var fr=gl.scene.getObjectByName(k+'-Frame'),dr=gl.scene.getObjectByName(k+'-Door');if(!fr||!dr)return;
      fr.updateMatrixWorld(true);var bb=new T.Box3().setFromObject(fr),cz=(bb.min.z+bb.max.z)/2,cx=(bb.min.x+bb.max.x)/2;
      function bake(o){var gs=[];o.traverse(function(m){if(m.isMesh){var gg=m.geometry.clone();gg.applyMatrix4(m.matrixWorld);gg.translate(-cx,0,-cz);gg.applyMatrix4(new T.Matrix4().makeRotationY(Math.PI/2));gg.scale(sc,sc,sc);gs.push({g:gg,m:m.material});}});return gs;}
      P2[k]={frame:bake(fr),door:bake(dr)};});
    gl.scene.traverse(function(m){if(m.isMesh&&m.material&&!m.material._fixed){m.material._fixed=1;m.material.metalness=0;m.material.roughness=0.62;if(m.material.map)m.material.map.anisotropy=4;m.material.needsUpdate=true;}});
    GL.doorParts=P2;(GL.doors||[]).forEach(dressDoor);
  },undefined,function(){});
}
function dressDoor(d){
  var P2=GL.doorParts&&(GL.doorParts[d.style]||GL.doorParts.D1);if(!P2||d.dressed)return;d.dressed=true;
  d.stub.forEach(function(m){m.visible=false;});
  P2.frame.forEach(function(e){var m=new T.Mesh(e.g,e.m);m.castShadow=m.receiveShadow=true;d.g.add(m);});
  /* the leaf hangs from its hinge edge, which sits on the pivot */
  P2.door.forEach(function(e){var m=new T.Mesh(e.g,e.m);m.position.x=0.44;m.castShadow=m.receiveShadow=true;d.piv.add(m);});
}
function makeDoor(col,par,style){
  var g=new T.Group(),wood=std({color:0x2a1d16,roughness:0.75}),frameM=std({color:0x1a120d,roughness:0.8});
  var stub=[box(0.1,2.2,0.16,frameM,-0.5,1.1,0,g),box(0.1,2.2,0.16,frameM,0.5,1.1,0,g),box(1.1,0.1,0.16,frameM,0,2.2,0,g)];
  var piv=new T.Group();piv.position.set(-0.44,0,0);g.add(piv);
  var slab=box(0.88,2.08,0.05,wood,0.44,1.04,0,piv);
  var vd=new T.Mesh(new T.PlaneGeometry(0.9,2.12),new T.MeshBasicMaterial({map:GL.voidTex,color:col!==null&&col!==undefined?col:0x7a7f88,fog:false}));vd.rotation.y=Math.PI;vd.position.set(0,1.06,-0.035);vd.renderOrder=-1;g.add(vd);GL.lastVoid=vd;
  stub.push(slab,box(0.06,0.06,0.07,std({color:0x9a8a6a,metalness:0.6,roughness:0.4}),0.8,1.0,0.04,piv));
  var strip=null,light=null;
  if(col!==null&&col!==undefined){
    strip=new T.Mesh(new T.PlaneGeometry(0.86,0.5).rotateX(-Math.PI/2),new T.MeshBasicMaterial({color:col,transparent:true,opacity:0.55,depthWrite:false,blending:T.AdditiveBlending,map:GL.stripTex}));
    strip.position.set(0,0.012,0.27);g.add(strip);
    light=new T.PointLight(col,0.5,3.2,2);light.position.set(0,0.12,0.4);g.add(light);
  }
  (par||scene).add(g);
  var d={g:g,piv:piv,slab:slab,strip:strip,light:light,open:0,want:0,stub:stub,style:style||'D1'};(GL.doors=GL.doors||[]).push(d);if(GL.doorParts)dressDoor(d);return d;
}

/* ---------- audio ---------- */
function audioInit(){
  var A=G.audio();ac=A.ac;if(!ac)return;
  try{
    /* the forest goes quiet */
    var t=ac.currentTime;[A.ambBus&&A.ambBus.gain,A.musicG&&A.musicG.gain,A.droneGain&&A.droneGain.gain,A.windG&&A.windG.gain,A.whisG&&A.whisG.gain].forEach(function(p){if(p){p.cancelScheduledValues(t);p.setTargetAtTime(0,t,0.4);}});
    G.menuMusicOff();
    AU.sfx=ac.createGain();AU.sfx.gain.value=1;AU.sfx.connect(A.sfxBus);
    AU.amb=ac.createGain();AU.amb.gain.value=1;AU.amb.connect(A.musBus);
    /* two rooms of echo: the endless dark, and a small bedroom */
    function ir(dur,decay){var len=Math.floor(ac.sampleRate*dur),b=ac.createBuffer(2,len,ac.sampleRate);for(var c=0;c<2;c++){var d=b.getChannelData(c);for(var i=0;i<len;i++)d[i]=(Math.random()*2-1)*Math.pow(1-i/len,decay);}return b;}
    AU.cvHub=ac.createConvolver();AU.cvHub.buffer=ir(3.2,2.6);AU.cvRoom=ac.createConvolver();AU.cvRoom.buffer=ir(0.7,3);
    AU.wetHub=ac.createGain();AU.wetRoom=ac.createGain();AU.wetHub.gain.value=0.7;AU.wetRoom.gain.value=0;
    AU.send=ac.createGain();AU.send.connect(AU.cvHub);AU.send.connect(AU.cvRoom);AU.cvHub.connect(AU.wetHub);AU.cvRoom.connect(AU.wetRoom);AU.wetHub.connect(AU.sfx);AU.wetRoom.connect(AU.sfx);
    /* room tone: a low hum that never stops */
    AU.drone=ac.createGain();AU.drone.gain.value=0;AU.drone.connect(AU.amb);
    [41,61.7,82.6].forEach(function(f,i){var o=ac.createOscillator();o.type='sine';o.frequency.value=f;var gg=ac.createGain();gg.gain.value=[0.06,0.03,0.012][i];o.connect(gg);gg.connect(AU.drone);o.start();});
    var nb=ac.createBuffer(1,ac.sampleRate*3,ac.sampleRate),nd=nb.getChannelData(0),l=0;for(var i2=0;i2<nd.length;i2++){var w=Math.random()*2-1;l=(l+0.02*w)/1.02;nd[i2]=l*3;}
    var ns=ac.createBufferSource();ns.buffer=nb;ns.loop=true;var nf=ac.createBiquadFilter();nf.type='lowpass';nf.frequency.value=260;var ngn=ac.createGain();ngn.gain.value=0.05;ns.connect(nf);nf.connect(ngn);ngn.connect(AU.drone);ns.start();
    AU.drone.gain.setTargetAtTime(1,ac.currentTime,2);
    /* the ringing */
    AU.ring=ac.createGain();AU.ring.gain.value=0;AU.ring.connect(AU.sfx);
    [6100,6163].forEach(function(f){var o=ac.createOscillator();o.type='sine';o.frequency.value=f;o.connect(AU.ring);o.start();});
    /* the bedroom lamp's buzz */
    AU.buzz=ac.createGain();AU.buzz.gain.value=0;var bo=ac.createOscillator();bo.type='sawtooth';bo.frequency.value=100;var bf=ac.createBiquadFilter();bf.type='lowpass';bf.frequency.value=420;bo.connect(bf);bf.connect(AU.buzz);AU.buzz.connect(AU.sfx);bo.start();
    /* the whole world through a wall (used when the hands come) */
    AU.muffle=1;
  }catch(e){console.warn('limbo audio',e);}
}
function noiseBurst(dur,f,q,gain,wet,rate){
  if(!ac)return;try{var t=ac.currentTime,len=Math.max(1,Math.floor(ac.sampleRate*dur)),b=ac.createBuffer(1,len,ac.sampleRate),d=b.getChannelData(0);
    for(var i=0;i<len;i++)d[i]=(Math.random()*2-1)*Math.pow(1-i/len,2);
    var s=ac.createBufferSource();s.buffer=b;s.playbackRate.value=rate||1;var bp=ac.createBiquadFilter();bp.type='bandpass';bp.frequency.value=f;bp.Q.value=q;var g=ac.createGain();g.gain.value=gain;
    s.connect(bp);bp.connect(g);g.connect(AU.sfx);if(wet)g.connect(AU.send);s.start(t);}catch(e){}
}
/* footsteps in shallow water: the heel slosh, a few drops falling back, a soft thud under it */
function floorAt(){if(P.area==='hub'||S.revealing)return 'water';if(P.area==='party')return 'wood';return (P.z-RO.z)<-2.5?'tile':'wood';}
function sStep(){if(!ac)return;var f=floorAt();
  if(f==='water')stepWater();else if(f==='tile')stepTile();else stepWood();
  if(f==='water')ripple(P.x,P.z);
}
/* shallow water: the heel slosh, a few drops falling back, a soft thud under it */
function stepWater(){var v=P.area==='hub'?1:0.75;
  try{var t=ac.currentTime,len=Math.floor(ac.sampleRate*0.34),b=ac.createBuffer(1,len,ac.sampleRate),d=b.getChannelData(0),l=0;
    for(var i=0;i<len;i++){var x=i/len,w=Math.random()*2-1;l=l*0.55+w*0.45;d[i]=l*Math.pow(1-x,1.6)*(x<0.03?x/0.03:1);}
    var s=ac.createBufferSource();s.buffer=b;s.playbackRate.value=0.85+Math.random()*0.3;
    var f=ac.createBiquadFilter();f.type='bandpass';f.Q.value=1.1;f.frequency.setValueAtTime(1500+Math.random()*500,t);f.frequency.exponentialRampToValueAtTime(420,t+0.26);
    var g=ac.createGain();g.gain.value=0.5*v;s.connect(f);f.connect(g);g.connect(AU.sfx);g.connect(AU.send);s.start(t);
    var nd=2+Math.floor(Math.random()*3);
    for(var k=0;k<nd;k++){var td=t+0.05+Math.random()*0.22,o=ac.createOscillator(),og=ac.createGain(),f0=700+Math.random()*900;o.type='sine';
      o.frequency.setValueAtTime(f0,td);o.frequency.exponentialRampToValueAtTime(f0*1.9,td+0.03);og.gain.setValueAtTime(0.0001,td);og.gain.exponentialRampToValueAtTime(0.05*v,td+0.004);og.gain.exponentialRampToValueAtTime(0.0001,td+0.05);
      o.connect(og);og.connect(AU.sfx);og.connect(AU.send);o.start(td);o.stop(td+0.06);}
    thud(t,80,45,0.08*v);
  }catch(e){}
}
/* old floorboards: a dull heel, the toe after it, sometimes a board gives */
function stepWood(){
  try{var t=ac.currentTime;thud(t,105,55,0.26);thud(t+0.06+Math.random()*0.02,140,70,0.1);
    noiseBurst(0.07,380+Math.random()*120,1.2,0.22,true,0.9+Math.random()*0.2);
    if(Math.random()<0.3){var len=Math.floor(ac.sampleRate*0.42),b=ac.createBuffer(1,len,ac.sampleRate),d=b.getChannelData(0);for(var i=0;i<len;i++){var x=i/len;d[i]=(Math.random()*2-1)*(0.5+0.5*Math.sin(x*180+Math.sin(x*30)*4))*Math.sin(Math.PI*x);}
      var s=ac.createBufferSource();s.buffer=b;var bp=ac.createBiquadFilter();bp.type='bandpass';bp.Q.value=12;var f0=500+Math.random()*400;bp.frequency.setValueAtTime(f0,t+0.04);bp.frequency.linearRampToValueAtTime(f0*1.5,t+0.45);
      var g=ac.createGain();g.gain.value=0.09;s.connect(bp);bp.connect(g);g.connect(AU.sfx);g.connect(AU.send);s.start(t+0.04);}
  }catch(e){}
}
/* tiles: a hard heel click that rings in the small room */
function stepTile(){
  try{var t=ac.currentTime,len=Math.floor(ac.sampleRate*0.05),b=ac.createBuffer(1,len,ac.sampleRate),d=b.getChannelData(0);for(var i=0;i<len;i++)d[i]=(Math.random()*2-1)*Math.pow(1-i/len,4);
    var s=ac.createBufferSource();s.buffer=b;var hp=ac.createBiquadFilter();hp.type='bandpass';hp.frequency.value=2600+Math.random()*700;hp.Q.value=1.4;var g=ac.createGain();g.gain.value=0.5;
    s.connect(hp);hp.connect(g);g.connect(AU.sfx);g.connect(AU.send);g.connect(AU.send);s.start(t);
    var o=ac.createOscillator(),og=ac.createGain();o.type='triangle';o.frequency.setValueAtTime(320+Math.random()*60,t);o.frequency.exponentialRampToValueAtTime(190,t+0.05);og.gain.setValueAtTime(0.09,t);og.gain.exponentialRampToValueAtTime(0.0001,t+0.08);o.connect(og);og.connect(AU.sfx);og.connect(AU.send);o.start(t);o.stop(t+0.1);
    thud(t,95,60,0.1);
  }catch(e){}
}
function thud(t,f0,f1,v){try{var o=ac.createOscillator(),g=ac.createGain();o.frequency.setValueAtTime(f0,t);o.frequency.exponentialRampToValueAtTime(f1,t+0.1);g.gain.setValueAtTime(v,t);g.gain.exponentialRampToValueAtTime(0.0001,t+0.13);o.connect(g);g.connect(AU.sfx);g.connect(AU.send);o.start(t);o.stop(t+0.15);}catch(e){}}
/* rings spreading where he steps */
function ripple(x,z,big){if(!GL.rip)return;var R=GL.rip[GL.ripI];GL.ripI=(GL.ripI+1)%GL.rip.length;R.t=0;R.big=big?2.2:1;R.m.position.set(x+(Math.random()-0.5)*0.15,0.006,z+(Math.random()-0.5)*0.15);R.m.visible=true;}
function rippleTick(dt){if(!GL.rip)return;GL.rip.forEach(function(R){if(!R.m.visible)return;R.t+=dt;var u=R.t/1.5;if(u>=1){R.m.visible=false;return;}R.m.scale.setScalar((0.06+u*0.6)*R.big);R.m.material.opacity=0.28*(1-u)*(1-u);});}
function sCreak(){if(!ac)return;try{var t=ac.currentTime,len=Math.floor(ac.sampleRate*1.3),b=ac.createBuffer(1,len,ac.sampleRate),d=b.getChannelData(0);for(var i=0;i<len;i++)d[i]=(Math.random()*2-1)*(0.6+0.4*Math.sin(i/len*40));
  var s=ac.createBufferSource();s.buffer=b;var bp=ac.createBiquadFilter();bp.type='bandpass';bp.Q.value=9;bp.frequency.setValueAtTime(380,t);bp.frequency.linearRampToValueAtTime(1500,t+0.6);bp.frequency.linearRampToValueAtTime(700,t+1.3);
  var g=ac.createGain();g.gain.setValueAtTime(0.0001,t);g.gain.exponentialRampToValueAtTime(0.5,t+0.08);g.gain.exponentialRampToValueAtTime(0.0001,t+1.3);s.connect(bp);bp.connect(g);g.connect(AU.sfx);g.connect(AU.send);s.start(t);}catch(e){}}
function sClick(n){for(var i=0;i<(n||1);i++)(function(i){after(i*0.09,function(){noiseBurst(0.03,2600,2,0.35,true);});})(i);}
function sDrip(){if(!ac)return;try{var t=ac.currentTime,o=ac.createOscillator(),g=ac.createGain();o.frequency.setValueAtTime(1500+Math.random()*300,t);o.frequency.exponentialRampToValueAtTime(600,t+0.12);g.gain.setValueAtTime(0.12,t);g.gain.exponentialRampToValueAtTime(0.0001,t+0.16);o.connect(g);g.connect(AU.sfx);g.connect(AU.send);o.start(t);o.stop(t+0.18);}catch(e){}}
function sBoom(v){if(!ac)return;try{var t=ac.currentTime,o=ac.createOscillator(),g=ac.createGain();o.frequency.setValueAtTime(64,t);o.frequency.exponentialRampToValueAtTime(26,t+2);g.gain.setValueAtTime(0.0001,t);g.gain.exponentialRampToValueAtTime(0.8*(v||1),t+0.02);g.gain.exponentialRampToValueAtTime(0.0001,t+2.4);o.connect(g);g.connect(AU.sfx);g.connect(AU.send);o.start(t);o.stop(t+2.5);noiseBurst(0.4,160,0.7,0.5*(v||1),true);}catch(e){}}
function sWhoosh(dur){if(!ac)return;try{var t=ac.currentTime,len=Math.floor(ac.sampleRate*dur),b=ac.createBuffer(1,len,ac.sampleRate),d=b.getChannelData(0);for(var i=0;i<len;i++)d[i]=Math.random()*2-1;
  var s=ac.createBufferSource();s.buffer=b;var bp=ac.createBiquadFilter();bp.type='bandpass';bp.Q.value=1.1;bp.frequency.setValueAtTime(240,t);bp.frequency.exponentialRampToValueAtTime(3200,t+dur);var g=ac.createGain();g.gain.setValueAtTime(0.0001,t);g.gain.exponentialRampToValueAtTime(0.35,t+dur*0.9);g.gain.exponentialRampToValueAtTime(0.0001,t+dur);s.connect(bp);bp.connect(g);g.connect(AU.sfx);s.start(t);}catch(e){}}
function sChime(){if(!ac)return;try{var t=ac.currentTime;[1,1.5,2.01,2.99].forEach(function(m,i){var o=ac.createOscillator(),g=ac.createGain();o.frequency.value=392*m;var st=t+i*0.08;g.gain.setValueAtTime(0.0001,st);g.gain.exponentialRampToValueAtTime(0.05/(1+i*0.7),st+0.8);g.gain.exponentialRampToValueAtTime(0.0001,st+5);o.connect(g);g.connect(AU.sfx);g.connect(AU.send);o.start(st);o.stop(st+5.1);});}catch(e){}}
/* Luna's voice: one of her recorded calls, far away and full of echo, under each line */
function sLuna(i,gain){var B=G.lunaBufs();if(!ac||!B||!B.length)return;var buf=B[i%B.length]||B.find(function(b){return b;});if(!buf)return;
  try{var s=ac.createBufferSource();s.buffer=buf;s.playbackRate.value=0.92;var lp=ac.createBiquadFilter();lp.type='lowpass';lp.frequency.value=2400;var g=ac.createGain();g.gain.value=gain||0.5;s.connect(lp);lp.connect(g);g.connect(AU.sfx);g.connect(AU.send);s.start();}catch(e){}}
function vo(key,ms,li){sub(tx(key),ms||5200);sLuna(li===undefined?Math.floor(Math.random()*5):li,0.45);}

/* ---------- UI (built here, removed with the level) ---------- */
function uiInit(){
  var css=document.createElement('style');css.textContent=
  '#lbFade{position:fixed;inset:0;background:#000;z-index:20;pointer-events:none;opacity:1}'+
  '#lbWhite{position:fixed;inset:0;background:#fff;z-index:21;pointer-events:none;opacity:0}'+
  '#lbDeep{position:fixed;inset:0;z-index:15;pointer-events:none;opacity:0;background:radial-gradient(ellipse at 50% 35%,rgba(26,48,80,.5),rgba(2,6,14,.97) 78%)}'+
  '#lbRing{position:fixed;inset:0;z-index:12;pointer-events:none;opacity:0;background:radial-gradient(ellipse at center,rgba(255,255,255,0) 30%,rgba(255,255,255,.95) 100%)}'+
  '.lbLid{position:fixed;z-index:13;pointer-events:none}'+
  '#lbLidT{inset:0;height:auto!important;display:none}#lbLidB{display:none}'+
  '#lbLidG{position:fixed;inset:0;z-index:14;pointer-events:none;opacity:0;background:radial-gradient(ellipse at 50% 55%,rgba(70,10,6,.55),rgba(20,2,2,.2) 45%,rgba(0,0,0,0) 75%)}'+
  '#lbSub{position:fixed;left:8%;right:8%;bottom:12vh;z-index:15;text-align:center;font:italic clamp(18px,2.4vw,26px)/1.35 "IM Fell English",Georgia,serif;color:#efe7da;text-shadow:0 2px 14px #000,0 0 3px #000;opacity:0;transition:opacity .8s;pointer-events:none}'+
  '#lbHint{position:fixed;left:0;right:0;top:16vh;z-index:15;text-align:center;font:500 clamp(14px,1.6vw,18px) Cinzel,Georgia,serif;letter-spacing:.32em;text-transform:uppercase;color:#d9cfc0;opacity:0;transition:opacity 1s;pointer-events:none;text-shadow:0 2px 12px #000}'+
  '#lbPrompt{position:fixed;left:50%;top:58%;transform:translate(-50%,-50%);z-index:15;font:600 14px "Barlow Condensed",Arial,sans-serif;letter-spacing:.24em;text-transform:uppercase;color:#efe7da;opacity:0;transition:opacity .25s;pointer-events:none;text-shadow:0 1px 8px #000}'+
  '#lbDot{position:fixed;left:50%;top:50%;width:4px;height:4px;margin:-2px;border-radius:50%;background:rgba(239,231,218,.55);z-index:14;pointer-events:none}'+
  '#lbHands{position:fixed;inset:0;z-index:16;pointer-events:none;opacity:0;background:radial-gradient(ellipse at center,rgba(0,0,0,0) 30%,rgba(0,0,0,.75) 85%)}#lbHands svg{width:100%;height:100%;filter:blur(5px)}'+
  '#lbEnd{position:fixed;inset:0;z-index:22;display:none;flex-direction:column;align-items:center;justify-content:center;gap:14px;background:#000;color:#e8dcc9;text-align:center;padding:24px}'+
  '#lbEnd h2{font:500 clamp(30px,5vw,58px) Cinzel,Georgia,serif;letter-spacing:.08em;margin:0}#lbEnd p{margin:0;font:italic 18px "IM Fell English",Georgia,serif;color:#a9a59b}#lbEnd .eb{font:600 13px "Barlow Condensed",Arial,sans-serif;letter-spacing:.3em;text-transform:uppercase;color:#d9b24c}'+
  '#lbEnd button{pointer-events:auto;cursor:pointer;margin-top:8px;font:600 15px "Barlow Condensed",Arial,sans-serif;letter-spacing:.2em;text-transform:uppercase;padding:11px 26px;border:1px solid rgba(226,220,205,.5);background:transparent;color:#e2dccd}#lbEnd button.pri{background:#e2dccd;color:#111;border-color:#e2dccd}'+
  '.lbBtn{position:fixed;z-index:15;display:none;width:66px;height:66px;border-radius:50%;border:2px solid #e2dccd;background:rgba(12,14,15,.55);color:#e2dccd;font:600 12px "Barlow Condensed",Arial,sans-serif;letter-spacing:.06em;text-transform:uppercase;pointer-events:auto;touch-action:none}'+
  '#lbAct{right:max(28px,env(safe-area-inset-right,0px));bottom:max(110px,calc(env(safe-area-inset-bottom,0px) + 110px))}#lbEyes{right:max(110px,calc(env(safe-area-inset-right,0px) + 110px));bottom:max(46px,calc(env(safe-area-inset-bottom,0px) + 46px))}';
  document.head.appendChild(css);UI.css=css;
  function el(id,tag,par){var e=document.createElement(tag||'div');e.id=id;(par||document.body).appendChild(e);UI[id]=e;return e;}
  el('lbFade');el('lbWhite');el('lbDeep');el('lbRing');var lt=el('lbLidT');lt.className='lbLid';var lb=el('lbLidB');lb.className='lbLid';el('lbLidG');
  el('lbSub');el('lbHint');el('lbPrompt');el('lbDot');
  var hd=el('lbHands');hd.innerHTML=handsSVG();
  var end=el('lbEnd');end.innerHTML='<div class="eb"></div><h2></h2><p></p><div><button class="pri" type="button" id="lbAgain"></button> <button type="button" id="lbMenu"></button></div>';
  var a=el('lbAct','button');a.className='lbBtn';a.type='button';var ey=el('lbEyes','button');ey.className='lbBtn';ey.type='button';ey.textContent='◉';
  a.addEventListener('touchstart',function(e){e.preventDefault();interact();},{passive:false});
  ey.addEventListener('touchstart',function(e){e.preventDefault();S.eyesTouch=true;},{passive:false});
  ey.addEventListener('touchend',function(e){e.preventDefault();S.eyesTouch=false;},{passive:false});
  end.querySelector('#lbAgain').addEventListener('click',function(){end.style.display='none';L.restart();});
  end.querySelector('#lbMenu').addEventListener('click',function(){location.hash='';location.reload();});
  ['hud','btnA','btnK','btnJ','btnS','btnD','btnE','joyHint'].forEach(function(id){var e=G.$(id);if(e)e.style.display='none';});
}
function handsSVG(){
  /* dark hands closing in from the edges, leaving one gap between two fingers */
  var h='<svg viewBox="0 0 100 100" preserveAspectRatio="none">';
  var specs=[[-8,108,35,1],[20,112,10,1],[50,114,-6,1],[80,112,-14,1],[108,108,-35,1],[-10,-8,150,0.9],[30,-12,175,0.9],[70,-12,190,0.9],[110,-6,215,0.9]];
  specs.forEach(function(s,i){
    h+='<g class="lbh" data-x="'+s[0]+'" data-y="'+s[1]+'" data-r="'+s[2]+'" data-s="'+s[3]+'" transform="translate('+s[0]+' '+(s[1]+(i>=5?-45:45))+') rotate('+s[2]+') scale('+s[3]+')"><ellipse cx="0" cy="-14" rx="11" ry="15" fill="#020202"/>';
    for(var f=0;f<4;f++){var fl=26+Math.sin(f*1.7+i)*6,fx=-8+f*5.2+Math.sin(i+f)*0.8;h+='<path d="M'+(fx-2.1)+' -30 Q'+(fx-1.6)+' '+(-30-fl*0.6)+' '+(fx+0.2)+' '+(-30-fl)+' Q'+(fx+1.9)+' '+(-30-fl*0.55)+' '+(fx+2.1)+' -30 Z" fill="#020202"/>';}
    h+='<rect x="8" y="-30" width="4" height="18" rx="2" transform="rotate(35 10 -20)" fill="#020202"/></g>';});
  return h+'</svg>';
}
function sub(text,ms){var e=UI.lbSub;e.textContent=text;e.style.opacity='1';clearTimeout(UI.subT);UI.subT=setTimeout(function(){e.style.opacity='0';},ms||4500);}
function hint(text,ms){var e=UI.lbHint;e.textContent=text;e.style.opacity='1';clearTimeout(UI.hintT);UI.hintT=setTimeout(function(){e.style.opacity='0';},ms||3200);}
function keyName(){return G.GP.on?'A':G.touch()?'':'E';}
function eyesKey(){return G.GP.on?tx('eyesP'):G.touch()?tx('eyesT'):tx('eyesK');}

/* ---------- world ---------- */
function build(){
  GL.glow=texGlow();
  GL.voidTex=canvasTex(64,128,function(g,w,h){g.fillStyle='#000';g.fillRect(0,0,w,h);var gr=g.createLinearGradient(0,h,0,h*0.55);gr.addColorStop(0,'rgba(255,255,255,0.16)');gr.addColorStop(1,'rgba(255,255,255,0)');g.fillStyle=gr;g.fillRect(0,0,w,h);var r2=g.createRadialGradient(w/2,h*0.62,0,w/2,h*0.62,w*0.5);r2.addColorStop(0,'rgba(255,255,255,0.05)');r2.addColorStop(1,'rgba(255,255,255,0)');g.fillStyle=r2;g.fillRect(0,0,w,h);});
  GL.stripTex=canvasTex(64,64,function(g,w,h){var gr=g.createLinearGradient(0,0,0,h);gr.addColorStop(0,'rgba(255,255,255,0)');gr.addColorStop(0.6,'rgba(255,255,255,.35)');gr.addColorStop(1,'rgba(255,255,255,1)');g.fillStyle=gr;g.fillRect(0,0,w,h);});
  scene=new T.Scene();scene.background=new T.Color(0x000000);
  cam=new T.PerspectiveCamera(57,window.innerWidth/window.innerHeight,0.05,90);cam.rotation.order='YXZ';
  scene.add(new T.HemisphereLight(0x1a2028,0x050505,0.12));
  /* the player carries no light; a faint presence keeps the nearest few metres readable */
  GL.near=new T.PointLight(0x8090a0,0.35,4.5,2);scene.add(GL.near);
  GL.rip=[];GL.ripI=0;for(var ri=0;ri<10;ri++){var rm=new T.Mesh(new T.RingGeometry(0.9,1.0,48).rotateX(-Math.PI/2),new T.MeshBasicMaterial({color:0xc8d4e0,transparent:true,opacity:0,depthWrite:false,fog:false}));rm.visible=false;scene.add(rm);GL.rip.push({m:rm,t:9,big:1});}
  loadHandModel();loadVeilModels();makeFPHands();loadKitModels();loadDoorModels();loadDamianClips();loadDamianPP();

  /* === HUB: endless dark, one light from above === */
  var H=GL.hub=new T.Group();scene.add(H);
  var floor=new T.Mesh(new T.CircleGeometry(40,64).rotateX(-Math.PI/2),std({color:0x040506,roughness:0.12,metalness:0.6}));floor.receiveShadow=true;H.add(floor);
  var spot=GL.spot=new T.SpotLight(0xf3eee4,5,16,0.3,0.75,1.1);spot.position.set(0,8,-5);spot.target.position.set(0,0,-5);spot.castShadow=true;spot.shadow.mapSize.set(1024,1024);spot.shadow.bias=-0.0006;H.add(spot);H.add(spot.target);
  var cone=GL.cone=makeCone(8,2.6,0xf3eee4,1);cone.position.set(0,8,-5);H.add(cone);
  var veil=GL.veil=makeVeil();veil.position.set(0,0,-5);H.add(veil);
  /* three doors standing in the void: the bedroom (warm), the car (red light), the party (flicker) */
  GL.dBed=makeDoor(0xffb070,H);GL.dBed.g.position.set(3.4,0,-1.2);GL.dBed.g.rotation.y=-0.95;
  GL.dCar=makeDoor(0xff2a1a,H);GL.dCar.g.position.set(-3.5,0,-1.4);GL.dCar.g.rotation.y=0.95;
  GL.dParty=makeDoor(0xb050ff,H);GL.dParty.g.position.set(4.6,0,-7.6);GL.dParty.g.rotation.y=-0.55;
  /* a dim light over each door so the wood reads in the void */
  [[GL.dBed,0xffc89a],[GL.dCar,0xff8070],[GL.dParty,0xc8a0ff]].forEach(function(e){var l=new T.SpotLight(e[1],4,6,0.6,0.7,1);l.position.set(0,3.2,1.6);var tg=new T.Object3D();tg.position.set(0,1.0,0);e[0].g.add(tg);l.target=tg;e[0].g.add(l);});
  /* Hollow waits in the dark (borrowed from the forest, made human-sized) */
  adoptHollow();
  /* Luna under the veil */
  if(G.luna&&G.luna.g){GL.luna=G.luna.g;scene.add(GL.luna);GL.luna.position.set(0,0,-5);GL.luna.rotation.set(0,Math.PI,0);G.lunaOp(0);GL.luna.visible=false;}
  /* Damian is only ever seen in the mirror */
  GL.hero=G.hero;scene.add(GL.hero);GL.hero.visible=false;if(G.axe&&G.axe.g)G.axe.g.visible=false;
  if(G.dmn&&G.dmn.mixer){try{G.dmn.mixer._actions.forEach(function(a){a.setEffectiveWeight(0);});}catch(e){}}

  /* === BEDROOM === */
  var B=GL.room=new T.Group();B.position.set(RO.x,0,RO.z);scene.add(B);B.visible=false;
  GL.wallTex=texWall(false);GL.wallTex2=texWall(true);
  var wallM=GL.wallM=std({map:GL.wallTex,roughness:0.92,color:0xffffff});
  var W=2,D=2.5,HH=2.7;
  function wall(w,h,x,y,z,ry){var m=new T.Mesh(new T.PlaneGeometry(w,h),wallM);m.position.set(x,y,z);m.rotation.y=ry;m.receiveShadow=true;B.add(m);return m;}
  /* north wall: built around the bathroom doorway */
  wall(2.5,HH,-0.75,HH/2,-D,0);wall(0.5,HH,1.75,HH/2,-D,0);wall(1.0,HH-2.2,1.0,2.2+(HH-2.2)/2,-D,0);
  /* south wall: built around the way out */
  wall(W-0.5,HH,-(W+0.5)/2,HH/2,D,Math.PI);wall(W-0.5,HH,(W+0.5)/2,HH/2,D,Math.PI);wall(1.0,HH-2.2,0,2.2+(HH-2.2)/2,D,Math.PI);
  wall(D*2,HH,-W,HH/2,0,Math.PI/2);wall(D*2,HH,W,HH/2,0,-Math.PI/2);
  var fl=new T.Mesh(new T.PlaneGeometry(W*2,D*2).rotateX(-Math.PI/2),std({map:texWood(),roughness:0.7}));fl.receiveShadow=true;B.add(fl);
  var ce=new T.Mesh(new T.PlaneGeometry(W*2,D*2).rotateX(Math.PI/2),std({color:0x1b1918,roughness:1}));ce.position.y=HH;B.add(ce);
  var base=std({color:0x140e0b,roughness:0.8});box(W*2,0.12,0.03,base,0,0.06,-D+0.015,B);box(W-0.5,0.12,0.03,base,-(W+0.5)/2,0.06,D-0.015,B);box(W-0.5,0.12,0.03,base,(W+0.5)/2,0.06,D-0.015,B);box(0.03,0.12,D*2,base,-W+0.015,0.06,0,B);box(0.03,0.12,D*2,base,W-0.015,0.06,0,B);
  /* the bed, the desk and the chair (one model, loaded in the background; plain stand-ins until then) */
  var bedW=std({color:0x2a1c14,roughness:0.7}),sheet=GL.sheetM=std({color:0xd8d2c6,roughness:0.95});
  GL.bedStub=new T.Group();B.add(GL.bedStub);
  box(2.2,0.45,1.65,sheet,-0.85,0.23,-0.27,GL.bedStub);box(0.08,1.0,1.7,bedW,-1.95,0.5,-0.27,GL.bedStub);box(1.7,0.04,0.7,bedW,-1.05,0.69,-2.1,GL.bedStub);
  GL.bedForm=box(1.15,0.13,0.36,std({color:0x34503a,roughness:0.95}),-0.62,0.56,-0.35,B);GL.bedForm.visible=false;   /* something lying under the covers */
  loadBedModel(B);
  /* the desk lamp */
  var shade=GL.shadeM=std({color:0xf0d9b0,emissive:0xffb066,emissiveIntensity:0.9,roughness:0.9,side:T.DoubleSide});
  var sh=new T.Mesh(new T.CylinderGeometry(0.1,0.15,0.18,18,1,true),shade);sh.position.set(-1.62,0.98,-2.22);B.add(sh);
  box(0.025,0.24,0.025,bedW,-1.62,0.82,-2.22,B);box(0.12,0.02,0.12,bedW,-1.62,0.71,-2.22,B);
  GL.lamp=new T.PointLight(0xffa860,2.0,8,1.5);GL.lamp.position.set(-1.58,1.08,-2.1);B.add(GL.lamp);
  GL.roomFill=new T.PointLight(0x9fb4ff,0,6,2);GL.roomFill.position.set(0,2.4,0.6);B.add(GL.roomFill);
  GL.roomAmb=new T.HemisphereLight(0x4a423b,0x0e0b09,0.4);B.add(GL.roomAmb);
  var mf=std({color:0x3a2a1c,roughness:0.5,metalness:0.3});
  /* the photo on the wall */
  GL.photoTex=texPhoto(false);GL.photoTex2=texPhoto(true);
  GL.photo=new T.Mesh(new T.PlaneGeometry(0.34,0.43),new T.MeshStandardMaterial({map:GL.photoTex,roughness:0.6}));GL.photo.position.set(0.3,1.6,-D+0.02);B.add(GL.photo);
  box(0.38,0.47,0.02,mf,0.3,1.6,-D+0.005,B);
  /* doors: the way in/out (south), the bathroom (north) */
  GL.dExit=makeDoor(null,B);GL.dExit.g.position.set(0,0,D-0.02);GL.dExit.g.rotation.y=Math.PI;
  GL.dBath=makeDoor(0x7fa8ff,B,'D2');GL.dBath.g.remove(GL.lastVoid);GL.dBath.g.position.set(1.0,0,-D+0.02);GL.dBath.strip.position.z=0.27;GL.dBath.light.position.set(0,0.12,0.35);
  GL.dBath.strip.material.opacity=0;GL.dBath.light.intensity=0;
  /* the bathroom behind it: a long black-tiled room, warm bulb over the red sink, moonlight through the window over the tub.
     Everything is placed from the model's own coordinates (ML), so the shell, the fixtures and the collisions stay together at any scale. */
  var BA=GL.bath=new T.Group();B.add(BA);
  var BS=0.27,BOX=1.0-8*BS,BOY=0.79*BS,BOZ=-D-7.03*BS;GL.bs={s:BS,x:BOX,y:BOY,z:BOZ};
  function ML(mx,my,mz){return [-BS*mz+BOX,BS*my+BOY,BS*mx+BOZ];}
  var BX0=ML(0,0,5.4)[0],BX1=ML(0,0,-15.0)[0],BZ0=ML(-0.18,0,0)[2],BZ1=-D,BH=2.5,NZ=ML(-0.71,0,0)[2],NX0=ML(0,0,3.0)[0],NX1=ML(0,0,-2.9)[0];
  var tWall=texBlackTile(false),tFloor=texBlackTile(true);
  var tileM=std({map:tWall,roughness:0.22,metalness:0.1,color:0xffffff}),floorM=std({map:tFloor,roughness:0.3,metalness:0.1,color:0xffffff});
  function bp(w,h,x,y,z,ry,mat,ts){var g=new T.PlaneGeometry(w,h),uv=g.attributes.uv;for(var i=0;i<uv.count;i++)uv.setXY(i,uv.getX(i)*w/ts,uv.getY(i)*h/ts);
    var m=new T.Mesh(g,mat);m.position.set(x,y,z);m.rotation.y=ry;m.receiveShadow=true;m.castShadow=true;BA.add(m);return m;}
  var WT=0.5;
  /* south wall (bathroom side), around the doorway x 0.5..1.5 */
  bp(0.5-BX0,BH,(BX0+0.5)/2,BH/2,BZ1-0.003,Math.PI,tileM,WT);bp(BX1-1.5,BH,(1.5+BX1)/2,BH/2,BZ1-0.003,Math.PI,tileM,WT);bp(1.0,BH-2.2,1.0,2.2+(BH-2.2)/2,BZ1-0.003,Math.PI,tileM,WT);
  /* north wall, with the niche behind the tub */
  bp(NX0-BX0,BH,(BX0+NX0)/2,BH/2,BZ0,0,tileM,WT);bp(BX1-NX1,BH,(NX1+BX1)/2,BH/2,BZ0,0,tileM,WT);
  bp(NX1-NX0,BH,(NX0+NX1)/2,BH/2,NZ,0,tileM,WT);bp(BZ0-NZ,BH,NX0,BH/2,(NZ+BZ0)/2,Math.PI/2,tileM,WT);bp(BZ0-NZ,BH,NX1,BH/2,(NZ+BZ0)/2,-Math.PI/2,tileM,WT);
  /* east wall (behind the sink) */
  bp(BZ1-BZ0,BH,BX1,BH/2,(BZ0+BZ1)/2,-Math.PI/2,tileM,WT);
  /* west wall, cut around the window */
  var WZ0=ML(1.11,0,0)[2],WZ1=ML(5.23,0,0)[2],WY0=ML(0,2.09,0)[1],WY1=ML(0,6.73,0)[1],WZC=(WZ0+WZ1)/2,WYC=(WY0+WY1)/2;
  bp(WZ0-BZ0,BH,BX0,BH/2,(BZ0+WZ0)/2,Math.PI/2,tileM,WT);bp(BZ1-WZ1,BH,BX0,BH/2,(WZ1+BZ1)/2,Math.PI/2,tileM,WT);
  bp(WZ1-WZ0,WY0,BX0,WY0/2,WZC,Math.PI/2,tileM,WT);bp(WZ1-WZ0,BH-WY1,BX0,(WY1+BH)/2,WZC,Math.PI/2,tileM,WT);
  /* window reveal (the wall's thickness), so the opening reads as a real hole */
  var rv=std({color:0x0b0b0c,roughness:0.5});box(0.2,0.02,WZ1-WZ0,rv,BX0-0.1,WY0,WZC,BA);box(0.2,0.02,WZ1-WZ0,rv,BX0-0.1,WY1,WZC,BA);
  box(0.2,WY1-WY0,0.02,rv,BX0-0.1,WYC,WZ0,BA);box(0.2,WY1-WY0,0.02,rv,BX0-0.1,WYC,WZ1,BA);
  /* floor + ceiling */
  var bfl=new T.Mesh(new T.PlaneGeometry(BX1-BX0,BZ1-NZ).rotateX(-Math.PI/2),floorM);
  (function(g,w,h){var uv=g.attributes.uv;for(var i=0;i<uv.count;i++)uv.setXY(i,uv.getX(i)*w/0.8,uv.getY(i)*h/0.8);})(bfl.geometry,BX1-BX0,BZ1-NZ);
  bfl.position.set((BX0+BX1)/2,0.002,(NZ+BZ1)/2);bfl.receiveShadow=true;BA.add(bfl);
  var bce=new T.Mesh(new T.PlaneGeometry(BX1-BX0,BZ1-NZ).rotateX(Math.PI/2),std({color:0x101010,roughness:0.9}));bce.position.set((BX0+BX1)/2,BH,(NZ+BZ1)/2);BA.add(bce);
  /* the tub (model coords), where the moon falls and the necklace waits */
  var TUB=[ML(0,0,2.57)[0],ML(0,0,-2.53)[0],ML(0,0,0)[2],ML(2.51,0,0)[2]],TUBY=ML(0,0.65,0)[1],TUBC=[(TUB[0]+TUB[1])/2,(TUB[2]+TUB[3])/2];
  /* the night outside: sky, moon, a few branches */
  var sky=new T.Mesh(new T.PlaneGeometry(3.6,2.9),new T.MeshBasicMaterial({map:texNight(),fog:false}));sky.position.set(BX0-1.3,WYC+0.1,WZC);sky.rotation.y=Math.PI/2;BA.add(sky);
  /* moonlight: a cold spot outside the window, the frame casts its cross on the floor and the tub */
  GL.moon=new T.SpotLight(0xa9c2ff,0,9,0.5,0.35,1);GL.moon.position.set(BX0-1.45,WY1+0.75,WZC+0.08);GL.moon.target.position.set(TUBC[0],0.1,TUBC[1]+0.15);BA.add(GL.moon);BA.add(GL.moon.target);
  GL.moon.castShadow=true;GL.moon.shadow.mapSize.set(1024,1024);GL.moon.shadow.bias=-0.0015;GL.moon.shadow.camera.near=0.4;GL.moon.shadow.camera.far=8;
  /* a soft shaft of light in the air */
  var shM=new T.MeshBasicMaterial({map:texShaft(),color:0x9fb8ff,transparent:true,opacity:0.16,depthWrite:false,blending:T.AdditiveBlending,side:T.DoubleSide,fog:false});
  var shG=new T.CylinderGeometry(0.55,0.95,2.4,4,1,true);shG.rotateY(Math.PI/4);shG.translate(0,-1.2,0);
  GL.shaft=new T.Mesh(shG,shM);GL.shaft.position.set(BX0-0.05,WYC,WZC);GL.shaft.lookAt(TUBC[0],0.1,TUBC[1]+0.15);GL.shaft.rotateX(-Math.PI/2);GL.shaft.scale.set(1,1,0.75);BA.add(GL.shaft);
  /* the mirror over the sink (model coords) */
  var MP=ML(5.335,5.0,-14.70),MX=MP[0],MY=MP[1],MZ=MP[2],MRW=0.4,MRH=0.24;
  /* warm light: a bulb over the sink mirror */
  GL.bathL=new T.PointLight(0xffa660,0,5,1.6);GL.bathL.position.set(BX1-0.38,MY+0.3,MZ);BA.add(GL.bathL);
  GL.bathFill=new T.HemisphereLight(0x3a3430,0x050505,0);BA.add(GL.bathFill);
  /* the fixtures (loaded in the background; a plain tub stands in until then) */
  var tubM=std({color:0xf2f0ea,roughness:0.18});GL.tubBox=box(TUB[1]-TUB[0],TUBY,TUB[3]-TUB[2]-0.04,tubM,TUBC[0],TUBY/2,TUBC[1],BA);
  GL.water=new T.Mesh(new T.PlaneGeometry(TUB[1]-TUB[0]-0.16,TUB[3]-TUB[2]-0.16).rotateX(-Math.PI/2),std({color:0x05080a,roughness:0.04,metalness:0.7}));GL.water.position.set(TUBC[0],TUBY-0.05,TUBC[1]);BA.add(GL.water);GL.waterY=TUBY-0.05;
  /* === the makeup corner: the mirror over the red sink, the paint, the brush === */
  GL.vanL=GL.bathL;GL.vanL.intensity=1.3;
  GL.bulbM=std({color:0xfff2d8,emissive:0xffd9a0,emissiveIntensity:1.4});var bulb=new T.Mesh(new T.SphereGeometry(0.032,10,8),GL.bulbM);bulb.position.set(BX1-0.07,MY+MRH+0.14,MZ);BA.add(bulb);
  box(0.02,0.07,0.02,std({color:0x111111}),BX1-0.015,MY+MRH+0.2,MZ,BA);
  var SHY=ML(0,3.4,0)[1];
  var shelfM=std({color:0x0d0d0e,roughness:0.3});box(0.21,0.02,0.8,shelfM,BX1-0.105,SHY,MZ,BA);GL.shelf={x:BX1-0.1,y:SHY+0.01,z:MZ};
  var potW=new T.Mesh(new T.CylinderGeometry(0.032,0.032,0.045,16),std({color:0xf0ede6,roughness:0.4}));potW.position.set(BX1-0.06,SHY+0.033,MZ-0.19);BA.add(potW);GL.stubs=[potW];
  var potB=new T.Mesh(new T.CylinderGeometry(0.032,0.032,0.045,16),std({color:0x0a0a0b,roughness:0.3}));potB.position.set(BX1-0.06,SHY+0.033,MZ-0.1);BA.add(potB);GL.stubs.push(potB);
  /* the red lipstick, standing open on the shelf */
  var brush=GL.brush=new T.Group(),gold=std({color:0xc9a35a,metalness:0.85,roughness:0.28}),caseM=std({color:0x0c0c0d,metalness:0.4,roughness:0.25});
  brush.add(new T.Mesh(new T.CylinderGeometry(0.0115,0.0115,0.042,18).translate(0,0.021,0),caseM));
  brush.add(new T.Mesh(new T.CylinderGeometry(0.0118,0.0118,0.006,18).translate(0,0.045,0),gold));
  brush.add(new T.Mesh(new T.CylinderGeometry(0.0095,0.0095,0.014,18).translate(0,0.055,0),gold));
  GL.bristleM=std({color:0xa3000f,roughness:0.32,metalness:0.05,emissive:0x000000});
  var bul=new T.CylinderGeometry(0.0082,0.0082,0.026,18,4).translate(0,0.075,0),bp=bul.attributes.position;
  for(var bi=0;bi<bp.count;bi++){var by=bp.getY(bi);if(by>0.08){var cut=0.0885-bp.getX(bi)*0.75;if(by>cut)bp.setY(bi,cut);}}bul.computeVertexNormals();
  brush.add(new T.Mesh(bul,GL.bristleM));
  var cap=new T.Mesh(new T.CylinderGeometry(0.0118,0.0118,0.036,18).translate(0,0.018,0),caseM);cap.position.set(0,0,0.03);cap.rotation.x=Math.PI/2;cap.position.y=0.012;brush.add(cap);
  brush.position.set(BX1-0.07,SHY+0.011,MZ+0.12);brush.rotation.y=-0.6;brush.scale.setScalar(1.6);BA.add(brush);GL.brushPos=new T.Vector3(RO.x+BX1-0.07,SHY+0.08,RO.z+MZ+0.12);
  GL.mirrorPos=new T.Vector3(RO.x+MX,MY,RO.z+MZ);
  function oval(){return new T.PlaneGeometry(MRW*2,MRH*2);}
  /* a thin brass frame around the square */
  var mfr=std({color:0xb08a4e,roughness:0.32,metalness:0.55}),ft=0.03;
  box(0.03,ft,MRW*2+ft*2,mfr,MX+0.006,MY+MRH+ft/2,MZ,BA);box(0.03,ft,MRW*2+ft*2,mfr,MX+0.006,MY-MRH-ft/2,MZ,BA);box(0.03,MRH*2,ft,mfr,MX+0.006,MY,MZ-MRW-ft/2,BA);box(0.03,MRH*2,ft,mfr,MX+0.006,MY,MZ+MRW+ft/2,BA);
  box(0.012,MRH*2+0.02,MRW*2+0.02,std({color:0x050505,roughness:0.6}),MX+0.012,MY,MZ,BA);
  if(T.Reflector){
    var pr=Math.min(1.5,R.getPixelRatio());
    var mir=GL.mirror=new T.Reflector(oval(),{clipBias:0.003,textureWidth:Math.round(380*pr),textureHeight:Math.round(620*pr),color:0xc4c4c4});
    mir.position.set(MX,MY,MZ);mir.rotation.y=-Math.PI/2;BA.add(mir);
    var ob=mir.onBeforeRender;
    mir.onBeforeRender=function(){var hv=GL.hero.visible,hl=GL.hol?GL.hol.visible:false;GL.hero.visible=P.area==='room';if(GL.hol)GL.hol.visible=hl||S.holMirror;try{ob.apply(this,arguments);}finally{GL.hero.visible=hv;if(GL.hol)GL.hol.visible=hl;}};
  }else{var mm=new T.Mesh(oval(),std({color:0x222428,metalness:0.9,roughness:0.15}));mm.position.set(MX,MY,MZ);mm.rotation.y=-Math.PI/2;BA.add(mm);}
  GL.drips=new T.Mesh(oval(),new T.MeshBasicMaterial({map:texDrips(),transparent:true,depthWrite:false}));GL.drips.position.set(MX-0.004,MY,MZ);GL.drips.rotation.y=-Math.PI/2;GL.drips.visible=false;BA.add(GL.drips);
  /* the shower glass: the fixed half, and the sliding half that stays shut until the last visit */
  var PX=ML(0,0,-4.25)[0],PZA=ML(-0.18,0,0)[2],PZB=ML(3.0,0,0)[2],PH=2.3;GL.part={x:PX,za:PZA,zb:PZB,h:PH};
  var slG=std({color:0x8a9aa8,roughness:0.05,metalness:0.3,transparent:true,opacity:0.2,depthWrite:false});
  var sw=BZ1-PZB;GL.slide=new T.Group();var sp=new T.Mesh(new T.PlaneGeometry(sw,PH),slG);sp.rotation.y=Math.PI/2;GL.slide.add(sp);
  var sf=std({color:0xb08a4e,roughness:0.32,metalness:0.55});box(0.025,0.025,sw,sf,0,PH/2,0,GL.slide);box(0.025,0.025,sw,sf,0,-PH/2,0,GL.slide);box(0.025,PH,0.025,sf,0,0,-sw/2,GL.slide);box(0.025,PH,0.025,sf,0,0,sw/2,GL.slide);
  box(0.03,0.32,0.02,sf,0.03,0,sw/2-0.08,GL.slide);
  GL.slide.position.set(PX-0.03,PH/2+0.03,(PZB+BZ1)/2);BA.add(GL.slide);
  /* where you can and can't walk (local): the room, then the toilet, the sink, the fixed glass, the tub */
  GL.bathBox=[BX0,BX1,BZ0,BZ1];
  var TO=[ML(0,0,-8.96)[0],ML(0,0,-10.94)[0],ML(0.16,0,0)[2],ML(3,0,0)[2]],SI=[ML(0,0,-12.98)[0],BX1,ML(3.82,0,0)[2],BZ1];
  GL.bathBlocks=[[TO[0],TO[1],BZ0-0.2,TO[3]],[SI[0],SI[1],SI[2],SI[3]],[PX-0.1,PX+0.1,NZ-0.2,PZB+0.04],[TUB[0],TUB[1],NZ-0.2,TUB[3]]];
  GL.bathShut=[BX0-0.2,PX+0.1,NZ-0.2,BZ1];
  GL.holZone=[TO[0]-1.0,TO[0]-0.25,BZ0+0.35,TO[3]+0.15];
  loadBathModel(BA);
  /* the necklace on the edge of the tub */
  var nk=GL.neck=new T.Group();var nkM=std({color:0xe8d9a8,metalness:0.9,roughness:0.25,emissive:0x3a3018});
  var ch=new T.Mesh(new T.TorusGeometry(0.07,0.004,6,40),nkM);ch.rotation.x=Math.PI/2;nk.add(ch);
  var pend=GL.pend=new T.Mesh(new T.TorusGeometry(0.018,0.006,8,20,Math.PI*1.4),nkM);pend.position.set(0,0,0.075);pend.rotation.x=Math.PI/2;nk.add(pend);
  var ng=new T.Sprite(new T.SpriteMaterial({map:GL.glow,color:0xffe9b0,transparent:true,opacity:0.35,depthWrite:false,blending:T.AdditiveBlending}));ng.scale.set(0.25,0.25,1);nk.add(ng);
  nk.position.set(TUBC[0]+0.3,0.004,TUB[3]+0.16);BA.add(nk);GL.neckPos=new T.Vector3(RO.x+TUBC[0]+0.3,0.08,RO.z+TUB[3]+0.25);BA.visible=false;

  buildCar();buildParty();
  /* things you can use */
  inter=[
    {id:'bedDoor',pos:function(){return GL.dBed.g.position.clone().setY(1.2);},r:2.3,area:'hub',label:'open',when:function(){return !S.roomDone;},use:function(){goRoom(1);}},
    {id:'carDoor',pos:function(){return GL.dCar.g.position.clone().setY(1.2);},r:2.3,area:'hub',label:'open',when:function(){return !S.carDone;},use:function(){if(!S.roomDone){sClick(3);hint(tx('locked'),2200);return;}goCar(1);}},
    {id:'partyDoor',pos:function(){return GL.dParty.g.position.clone().setY(1.2);},r:2.3,area:'hub',label:'open',when:function(){return !S.partyDone;},use:function(){if(!S.carDone){sClick(3);hint(tx('locked'),2200);return;}goParty(1);}},
    {id:'veil',pos:function(){return new T.Vector3(0,1.3,-5);},r:3.2,area:'hub',label:'veil',use:function(){if(!S.roomDone||!S.carDone||!S.partyDone){sClick(1);hint(tx('locked'),2200);return;}reveal();}},
    {id:'exit',pos:function(){return new T.Vector3(RO.x,1.2,RO.z+D);},r:2.0,area:'room',label:'open',use:function(){exitRoom();}},
    {id:'brush',pos:function(){return GL.brushPos;},r:1.7,area:'room',label:'take',when:function(){return S.loop===2&&!S.trig;},use:function(){S.trig=true;GL.brush.visible=false;noiseBurst(0.12,1800,1,0.3,true);vo('v2',6000,1);after(1.2,function(){GL.drips.visible=true;sBoom(0.25);});unlockExit(3.5);}},
    {id:'bath',pos:function(){return new T.Vector3(RO.x+1.0,1.2,RO.z-D);},r:1.9,area:'room',label:'open',when:function(){return S.loop===4&&!S.bathOpen;},use:function(){sClick(2);hint(tx('stuck'),2000);}},
    {id:'radio',pos:function(){return cw(CAR.radio[0],CAR.radio[1],-0.64);},r:1.3,area:'car',label:'tune',when:function(){return S.loop===1&&!S.trig;},use:function(){S.tune++;sClick(1);
      if(AU.car){AU.car.stF.frequency.setTargetAtTime(900+Math.random()*3000,ac.currentTime,0.05);}
      if(S.tune>=S.tuneGoal){S.trig=true;if(AU.car)AU.car.stG.gain.setTargetAtTime(0.008,ac.currentTime,0.4);after(0.5,function(){vo('c1',5200,2);});nextCarLoop(6.5);}}},
    {id:'dash',pos:function(){return cw(CAR.dash[0],CAR.dash[1],CAR.dash[2]);},r:1.3,area:'car',label:'reach',when:function(){return S.loop===2&&!S.trig;},use:function(){S.trig=true;S.walk=0;
      after(4.4,function(){noiseBurst(0.3,800,0.8,0.08,true,0.5);});after(5.2,function(){vo('c2',4200,1);});nextCarLoop(9.5);}},
    {id:'lunaHand',pos:function(){var p=GL.lunaHand.position;return cw(p.x,p.y,p.z);},r:1.3,area:'car',label:'takeHand',when:function(){return S.loop===4&&S.handOut&&S.give<0;},use:function(){takeHand();}},
    {id:'neck',pos:function(){return GL.neckPos;},r:1.7,area:'room',label:'take',when:function(){return S.loop===4&&S.bathOpen&&!S.neckTaken;},use:function(){takeNecklace();}}
  ];
}

/* ================= THE CAR (blocked-out Beetle; a model can replace GL.carBody later) ================= */
var CAR={eye:[-0.31,1.12,0.06],wheel:[-0.31,0.84,-0.44],radio:[0.02,0.8,-0.66],mirror:[0.0,1.27,-0.7],dash:[0.12,0.97,-0.66],hol:[0.28,-0.62,1.0],hand:[0.5,0.84,-0.18]};
function cw(a,b,c){return new T.Vector3(CO.x+a,b,CO.z+c);}  /* car-local to world (the car faces -z) */
function texRainGlass(){return canvasTex(512,256,function(g,w,h){g.clearRect(0,0,w,h);var r=rnd(21);
  for(var i=0;i<260;i++){var x=r()*w,y=r()*h,rr=0.6+r()*r()*2.6;
    g.fillStyle='rgba(205,215,230,'+(0.10+r()*0.12)+')';g.beginPath();g.ellipse(x,y,rr,rr*1.15,0,0,7);g.fill();
    g.fillStyle='rgba(255,255,255,'+(0.25+r()*0.25)+')';g.beginPath();g.arc(x-rr*0.35,y-rr*0.4,Math.max(0.4,rr*0.3),0,7);g.fill();
    if(rr>1.6&&r()<0.5){var gr=g.createLinearGradient(x,y,x,y+20+r()*50);gr.addColorStop(0,'rgba(210,220,235,.14)');gr.addColorStop(1,'rgba(210,220,235,0)');g.strokeStyle=gr;g.lineWidth=rr*0.7;g.beginPath();g.moveTo(x,y);g.quadraticCurveTo(x+(r()-0.5)*6,y+20,x+(r()-0.5)*4,y+30+r()*40);g.stroke();}}
},[1,1]);}
function texFog(){return canvasTex(128,128,function(g,w,h){var gr=g.createRadialGradient(w*0.5,h*0.55,0,w*0.5,h*0.55,w*0.5);gr.addColorStop(0,'rgba(230,236,245,.75)');gr.addColorStop(0.55,'rgba(220,228,240,.35)');gr.addColorStop(1,'rgba(220,228,240,0)');g.fillStyle=gr;g.fillRect(0,0,w,h);});}
function texWindows(){return canvasTex(128,256,function(g,w,h){g.fillStyle='#000';g.fillRect(0,0,w,h);var r=rnd(31);
  for(var y=8;y<h-8;y+=22)for(var x=8;x<w-8;x+=26){if(r()<0.16){g.fillStyle=r()<0.5?'rgba(255,190,120,.85)':'rgba(170,190,230,.6)';g.fillRect(x,y,14,12);}}});}
function texDial(){return canvasTex(128,128,function(g,w,h){g.fillStyle='#0d0d0c';g.beginPath();g.arc(64,64,62,0,7);g.fill();g.strokeStyle='#d9cfae';g.lineWidth=2;
  for(var i=0;i<=12;i++){var a=Math.PI*0.75+i/12*Math.PI*1.5;g.beginPath();g.moveTo(64+Math.cos(a)*50,64+Math.sin(a)*50);g.lineTo(64+Math.cos(a)*(i%2?44:40),64+Math.sin(a)*(i%2?44:40));g.stroke();}
  g.fillStyle='#d9cfae';g.font='bold 11px Georgia';g.textAlign='center';g.fillText('km/h',64,92);});}
function texRadio(){return canvasTex(256,64,function(g,w,h){g.fillStyle='#0a0805';g.fillRect(0,0,w,h);g.strokeStyle='rgba(255,200,120,.75)';g.lineWidth=1;
  for(var i=0;i<=20;i++){var x=14+i*11.4;g.beginPath();g.moveTo(x,40);g.lineTo(x,i%5?48:52);g.stroke();}
  g.fillStyle='rgba(255,205,130,.8)';g.font='10px Georgia';['88','92','96','100','104','108'].forEach(function(t,i){g.fillText(t,10+i*45,30);});});}
function makeLunaHand(){
  var skin=std({color:0xe2c9b8,roughness:0.55,emissive:0x2a1a14}),sl=std({color:0xe8e4dc,roughness:0.9});
  var g=new T.Group(),w=new T.Group();g.add(w);
  w.add(new T.Mesh(new T.CylinderGeometry(0.03,0.038,0.42,12).rotateZ(Math.PI/2).translate(0.25,0,0),sl));
  w.add(new T.Mesh(new T.CylinderGeometry(0.022,0.025,0.06,10).rotateZ(Math.PI/2).translate(0.03,0,0),skin));
  var palm=new T.Mesh(new T.SphereGeometry(1,14,10),skin);palm.scale.set(0.042,0.013,0.036);palm.position.set(-0.035,0,0);w.add(palm);
  var fing=[];[-0.022,-0.007,0.008,0.022].forEach(function(z,i){var len=[0.036,0.044,0.042,0.032][i],f=new T.Group();f.position.set(-0.075,0,z);
    var a=new T.Mesh(new T.CylinderGeometry(0.0062,0.007,len,7).rotateZ(Math.PI/2).translate(-len/2,0,0),skin);f.add(a);
    var jn=new T.Group();jn.position.x=-len;f.add(jn);jn.add(new T.Mesh(new T.CylinderGeometry(0.0052,0.006,len*0.8,7).rotateZ(Math.PI/2).translate(-len*0.4,0,0),skin));
    w.add(f);fing.push({f:f,j:jn});});
  var th=new T.Mesh(new T.CylinderGeometry(0.007,0.008,0.045,7).rotateZ(Math.PI/2).translate(-0.022,0,0),skin);th.position.set(-0.02,0.004,-0.035);th.rotation.y=-0.6;w.add(th);
  g.userData={fing:fing};g.visible=false;return g;
}
function buildCar(){
  var C=GL.car=new T.Group();C.position.set(CO.x,0,CO.z);scene.add(C);C.visible=false;
  /* the street */
  var ST=GL.street=new T.Group();C.add(ST);
  var asph=std({color:0x0b0c0e,roughness:0.2,metalness:0.55});
  var road=new T.Mesh(new T.PlaneGeometry(10,240).rotateX(-Math.PI/2),asph);road.position.set(0,0,-60);road.receiveShadow=true;ST.add(road);
  var curbM=std({color:0x2a2a2c,roughness:0.75});[-1,1].forEach(function(sd){box(3,0.15,240,curbM,sd*6.5,0.075,-60,ST);});
  var lineM=new T.MeshBasicMaterial({color:0x8c8778});for(var z=12;z>-180;z-=7){var ln=new T.Mesh(new T.PlaneGeometry(0.12,3).rotateX(-Math.PI/2),lineM);ln.position.set(0,0.004,z);ST.add(ln);}
  var winT=texWindows();winT.wrapS=winT.wrapT=T.RepeatWrapping;
  var bm=std({color:0x0d0d10,roughness:0.9,emissive:0xffffff,emissiveMap:winT,emissiveIntensity:0.55});
  var r=rnd(7);for(var bz=20;bz>-180;bz-=9){[-1,1].forEach(function(sd){var hh=6+r()*12,bw=6+r()*2;box(bw,hh,8.4,bm,sd*(8+bw/2+r()*1.5),hh/2,bz,ST);});}
  /* streetlights: every 16 m, alternating sides; the near ones carry a real light */
  var poleM=std({color:0x141416,roughness:0.6,metalness:0.4});GL.lamps=[];
  for(var i=0;i<12;i++){var lz=8-i*16,sd=i%2?1:-1,lp=new T.Group();lp.position.set(sd*5.4,0,lz);ST.add(lp);
    box(0.14,6.2,0.14,poleM,0,3.1,0,lp);box(1.6,0.1,0.1,poleM,-sd*0.8,6.1,0,lp);
    var headM=new T.MeshBasicMaterial({color:0xffb04a});var hd=new T.Mesh(new T.BoxGeometry(0.5,0.12,0.28),headM);hd.position.set(-sd*1.5,6.0,0);lp.add(hd);
    var spr=new T.Sprite(new T.SpriteMaterial({map:GL.glow,color:0xffa040,transparent:true,opacity:0.75,depthWrite:false,blending:T.AdditiveBlending,fog:false}));spr.scale.set(3.2,3.2,1);spr.position.copy(hd.position);lp.add(spr);
    var pl=null;if(i<4){pl=new T.PointLight(0xff9a3c,3.2,22,1.6);pl.position.set(-sd*1.5,5.8,0);lp.add(pl);}
    GL.lamps.push({g:lp,m:headM,s:spr,l:pl,z:lz,on:1});}
  /* the traffic light, hanging over the road ahead */
  var TL=new T.Group();TL.position.set(0.6,0,-11);ST.add(TL);
  box(0.16,7,0.16,poleM,4.6,3.5,0,TL);box(4.8,0.1,0.1,poleM,2.3,6.6,0,TL);
  box(0.36,1.05,0.32,std({color:0x111214,roughness:0.5}),0,6.0,0,TL);
  GL.tlR=new T.MeshBasicMaterial({color:0xff1a10});GL.tlY=new T.MeshBasicMaterial({color:0x221a08});GL.tlG=new T.MeshBasicMaterial({color:0x06200e});
  [[GL.tlR,6.32],[GL.tlY,6.0],[GL.tlG,5.68]].forEach(function(e){var c=new T.Mesh(new T.CircleGeometry(0.11,20),e[0]);c.position.set(0,e[1],0.165);TL.add(c);});
  GL.tlGlow=new T.Sprite(new T.SpriteMaterial({map:GL.glow,color:0xff2010,transparent:true,opacity:0.9,depthWrite:false,blending:T.AdditiveBlending,fog:false}));GL.tlGlow.scale.set(2.2,2.2,1);GL.tlGlow.position.set(0,6.32,0.2);TL.add(GL.tlGlow);
  GL.tlLight=new T.PointLight(0xff2010,2.4,18,1.3);GL.tlLight.position.set(0,5.4,1.8);TL.add(GL.tlLight);GL.tl=TL;
  /* rain: thin streaks, brightest at the bottom, slanted by the wind; none inside the cabin */
  var N=1400,rp=new Float32Array(N*6),rc=new Float32Array(N*6);GL.rainN=N;GL.rainV=new Float32Array(N);
  for(var j=0;j<N;j++){var rx2,rz2;do{rx2=(Math.random()-0.5)*20;rz2=-30+Math.random()*38;}while(Math.abs(rx2)<1.2&&rz2>-2.2&&rz2<2.4);
    var ry=Math.random()*9,ln=0.35+Math.random()*0.3;GL.rainV[j]=11+Math.random()*4;
    rp[j*6]=rx2;rp[j*6+1]=ry+ln;rp[j*6+2]=rz2;rp[j*6+3]=rx2-ln*0.12;rp[j*6+4]=ry;rp[j*6+5]=rz2;
    var b=0.35+Math.random()*0.4;rc[j*6]=0;rc[j*6+1]=0;rc[j*6+2]=0;rc[j*6+3]=b*0.75;rc[j*6+4]=b*0.82;rc[j*6+5]=b;}
  var rg=new T.BufferGeometry();rg.setAttribute('position',new T.BufferAttribute(rp,3));rg.setAttribute('color',new T.BufferAttribute(rc,3));
  GL.rain=new T.LineSegments(rg,new T.LineBasicMaterial({vertexColors:true,transparent:true,opacity:0.5,blending:T.AdditiveBlending,depthWrite:false,fog:true}));GL.rain.frustumCulled=false;C.add(GL.rain);
  /* splashes on the road, in the light */
  GL.splash=[];for(var q=0;q<40;q++){var sp=new T.Sprite(new T.SpriteMaterial({map:GL.glow,color:0xaab8cc,transparent:true,opacity:0,depthWrite:false,blending:T.AdditiveBlending}));sp.scale.set(0.12,0.05,1);C.add(sp);GL.splash.push({s:sp,t:Math.random()});}

  /* ---- the Beetle (stand-in) ---- */
  var B=GL.carBody=new T.Group();C.add(B);
  var gold=std({color:0xb8913c,roughness:0.32,metalness:0.55}),blk=std({color:0x0c0c0d,roughness:0.6}),
      leather=std({color:0x2a1f19,roughness:0.75}),head=std({color:0x8a8172,roughness:0.95,side:T.BackSide}),chrome=std({color:0xb9bcc2,roughness:0.25,metalness:0.9});
  /* floor, sills, firewall */
  box(1.36,0.05,2.5,blk,0,0.3,0.25,B);box(0.04,0.48,2.3,gold,-0.68,0.55,0.25,B);box(0.04,0.48,2.3,gold,0.68,0.55,0.25,B);
  /* the painted dashboard (Beetles had the body colour on the dash), the padded top */
  box(1.34,0.28,0.14,gold,0,0.83,-0.73,B);box(1.34,0.06,0.3,blk,0,0.98,-0.72,B);box(1.34,0.45,0.05,blk,0,0.52,-0.84,B);
  /* the round speedometer in front of the driver */
  var dial=new T.Mesh(new T.CircleGeometry(0.085,32),new T.MeshBasicMaterial({map:texDial(),color:0xbfb6a0}));dial.position.set(-0.31,0.86,-0.657);B.add(dial);
  var rim=new T.Mesh(new T.TorusGeometry(0.088,0.008,8,32),chrome);rim.position.copy(dial.position);B.add(rim);
  GL.needle=new T.Mesh(new T.BoxGeometry(0.004,0.06,0.002),new T.MeshBasicMaterial({color:0xff5a20}));GL.needle.geometry.translate(0,0.03,0);GL.needle.position.set(-0.31,0.86,-0.655);GL.needle.rotation.z=2.2;B.add(GL.needle);
  /* the radio in the middle */
  box(0.3,0.09,0.03,chrome,CAR.radio[0],CAR.radio[1],-0.655,B);
  GL.radioFace=new T.Mesh(new T.PlaneGeometry(0.22,0.055),new T.MeshBasicMaterial({map:texRadio(),color:0xffffff}));GL.radioFace.position.set(CAR.radio[0],CAR.radio[1]+0.008,-0.638);B.add(GL.radioFace);
  GL.radioNeedle=new T.Mesh(new T.BoxGeometry(0.003,0.045,0.002),new T.MeshBasicMaterial({color:0xff3010}));GL.radioNeedle.position.set(CAR.radio[0]-0.09,CAR.radio[1]+0.008,-0.636);B.add(GL.radioNeedle);
  [-0.135,0.135].forEach(function(dx){var kn=new T.Mesh(new T.CylinderGeometry(0.016,0.016,0.025,14).rotateX(Math.PI/2),chrome);kn.position.set(CAR.radio[0]+dx,CAR.radio[1],-0.64);B.add(kn);});
  GL.radioL=new T.PointLight(0xffb060,0.25,0.8,2);GL.radioL.position.set(CAR.radio[0],CAR.radio[1]+0.02,-0.55);B.add(GL.radioL);
  /* the thin steering wheel and its column */
  var wh=new T.Group();wh.position.set(CAR.wheel[0],CAR.wheel[1],CAR.wheel[2]);wh.rotation.x=-0.55;B.add(wh);
  wh.add(new T.Mesh(new T.TorusGeometry(0.19,0.011,8,48),std({color:0xe4dccb,roughness:0.4})));
  [0,2.1,-2.1].forEach(function(a){var sp=new T.Mesh(new T.BoxGeometry(0.012,0.17,0.008),chrome);sp.rotation.z=a;sp.position.set(Math.sin(-a)*0.09,Math.cos(a)*-0.09*-1,0);wh.add(sp);});
  wh.add(new T.Mesh(new T.CylinderGeometry(0.035,0.035,0.03,16).rotateX(Math.PI/2),chrome));
  var col=new T.Mesh(new T.CylinderGeometry(0.022,0.026,0.42,10),blk);col.position.set(CAR.wheel[0],CAR.wheel[1]-0.1,CAR.wheel[2]-0.18);col.rotation.x=1.0;B.add(col);
  /* seats: two fronts and the bench */
  function seat(x){box(0.48,0.12,0.5,leather,x,0.5,0.2,B);var bk=box(0.48,0.62,0.1,leather,x,0.86,0.47,B);bk.rotation.x=-0.18;box(0.3,0.2,0.08,leather,x,1.27,0.55,B);}
  seat(-0.31);seat(0.31);box(1.25,0.14,0.5,leather,0,0.5,1.0,B);var bb2=box(1.25,0.55,0.12,leather,0,0.86,1.3,B);bb2.rotation.x=-0.25;
  /* the round roof (headliner) and pillars */
  var rf=new T.Mesh(new T.CylinderGeometry(0.78,0.78,2.3,28,1,true,-1.12,2.24).rotateZ(Math.PI/2).rotateY(Math.PI/2),head);rf.geometry.rotateX(0);rf.position.set(0,0.62,0.3);rf.scale.set(1,1,1);B.add(rf);
  /* the upright windshield with its frame, the A-pillars, the small rear window */
  [-0.62,0.62].forEach(function(x){var pl=box(0.06,0.48,0.06,gold,x,1.17,-0.8,B);pl.rotation.z=x<0?0.18:-0.18;pl.rotation.x=-0.25;});
  box(1.2,0.05,0.06,gold,0,1.0,-0.86,B);box(1.05,0.05,0.06,gold,0,1.38,-0.74,B);
  var glassM=std({color:0x0a0f16,roughness:0.05,metalness:0.2,transparent:true,opacity:0.12,depthWrite:false});
  var ws=new T.Mesh(new T.PlaneGeometry(1.14,0.4),glassM);ws.position.set(0,1.19,-0.8);ws.rotation.x=-0.3;B.add(ws);
  GL.rainTex=texRainGlass();GL.rainTex.wrapS=GL.rainTex.wrapT=T.RepeatWrapping;GL.rainTex.repeat.set(1.4,1);
  var rw=new T.Mesh(new T.PlaneGeometry(1.14,0.4),new T.MeshBasicMaterial({map:GL.rainTex,transparent:true,opacity:0.8,depthWrite:false,fog:false}));rw.position.set(0,1.19,-0.795);rw.rotation.x=-0.3;B.add(rw);
  /* the wipers */
  GL.wipers=[];[-0.32,0.22].forEach(function(x){var pv=new T.Group();pv.position.set(x,1.0,-0.83);pv.rotation.x=-0.3;var bl=new T.Mesh(new T.BoxGeometry(0.012,0.38,0.012),blk);bl.position.y=0.19;pv.add(bl);pv.rotation.z=1.35;B.add(pv);GL.wipers.push(pv);});
  /* side windows (fogged on her side) */
  [-0.66,0.66].forEach(function(x){var w=new T.Mesh(new T.PlaneGeometry(1.1,0.38),glassM);w.position.set(x,1.06,0.05);w.rotation.y=x<0?Math.PI/2:-Math.PI/2;B.add(w);});
  GL.fogM=new T.MeshBasicMaterial({map:texFog(),transparent:true,opacity:0,depthWrite:false});var fg=new T.Mesh(new T.PlaneGeometry(0.42,0.3),GL.fogM);fg.position.set(0.655,1.06,-0.05);fg.rotation.y=-Math.PI/2;B.add(fg);
  /* door cards */
  [-0.66,0.66].forEach(function(x){box(0.03,0.36,1.0,leather,x,0.66,0.05,B);box(0.05,0.03,0.22,chrome,x*0.97,0.8,-0.15,B);});
  /* the rear-view mirror (a real mirror: Hollow lives in it) */
  box(0.02,0.08,0.02,blk,CAR.mirror[0],CAR.mirror[1]+0.08,CAR.mirror[2],B);
  box(0.25,0.085,0.03,blk,CAR.mirror[0],CAR.mirror[1],CAR.mirror[2]-0.012,B);
  if(T.Reflector){var cm=GL.carMirror=new T.Reflector(new T.PlaneGeometry(0.23,0.07),{clipBias:0.003,textureWidth:384,textureHeight:118,color:0xbfbfbf});
    cm.position.set(CAR.mirror[0],CAR.mirror[1],CAR.mirror[2]+0.005);cm.rotation.x=-0.08;B.add(cm);var ob=cm.onBeforeRender;
    cm.onBeforeRender=function(){var hv=GL.hero.visible,hl=GL.hol?GL.hol.visible:false;GL.hero.visible=false;if(GL.hol)GL.hol.visible=hl||S.holMirror;try{ob.apply(this,arguments);}finally{GL.hero.visible=hv;if(GL.hol)GL.hol.visible=hl;}};}
  GL.carMirrorPos=cw(CAR.mirror[0],CAR.mirror[1],CAR.mirror[2]);
  /* the cabin's own low light */
  GL.carAmb=new T.HemisphereLight(0x5a4632,0x0a0806,0.5);C.add(GL.carAmb);
  GL.dashL=new T.PointLight(0xffc890,0.35,1.2,2);GL.dashL.position.set(-0.31,0.92,-0.5);B.add(GL.dashL);
  /* her hand, and the necklace it brings */
  GL.lunaHand=makeLunaHand();B.add(GL.lunaHand);
  GL.carNeck=new T.Group();var cn=new T.Mesh(new T.TorusGeometry(0.03,0.004,8,24),std({color:0xc9c9cc,metalness:0.85,roughness:0.3,emissive:0x222222}));cn.rotation.x=Math.PI/2;GL.carNeck.add(cn);
  var cnc=new T.Mesh(new T.TorusGeometry(0.06,0.0018,5,40),std({color:0x5a3a24,roughness:0.8}));cnc.rotation.x=Math.PI/2;cnc.position.x=0.04;GL.carNeck.add(cnc);GL.carNeck.visible=false;B.add(GL.carNeck);
}
/* ---------- the real car and the lonely road (loaded in the background) ---------- */
var RD={FS:9,pts:[[0.8,4.4],[-0.4,3.4],[-1.2,2.4],[-1.75,1.4],[-1.9,0.4],[-1.4,-0.6],[-0.2,-1.3],[1.0,-1.9],[1.8,-2.7],[2.2,-3.6],[2.3,-4.4]],car:[-0.55,3.25]};
function loadRoadModels(){
  if(GL.roadLoading||!T.GLTFLoader)return;GL.roadLoading=true;
  var got={},need=['beetle','forest','tl','sl'];
  function ok(k,g){got[k]=g;if(need.every(function(n){return n in got;}))dressCar(got);}
  [['beetle','beetle.glb?v=1'],['forest','forestroad.glb?v=1'],['tl','trafficlight.glb?v=1'],['sl','streetlight.glb?v=1']].forEach(function(e){
    new T.GLTFLoader().load(e[1],function(g){ok(e[0],g.scene);},undefined,function(){ok(e[0],null);});});
}
function dressCar(m){
  /* --- the gold Beetle --- */
  if(m.beetle){
    var bs=0.86,oy=0.25,B=GL.carBody,keep=[GL.carMirror,GL.lunaHand,GL.carNeck,GL.dashL,GL.radioL];
    B.children.forEach(function(o){if(keep.indexOf(o)<0)o.visible=false;});
    var car=m.beetle;car.scale.setScalar(bs);car.rotation.y=Math.PI;car.position.y=oy;B.add(car);GL.beetle=car;
    car.traverse(function(o){if(o.isMesh){o.castShadow=false;o.receiveShadow=true;if(/mirror_rear/.test(o.name))GL.beetleMirror=o;if(/visor/.test(o.name))o.visible=false;
      if(o.material&&/windows/.test(o.name)){o.material.depthWrite=false;o.material.opacity=0.18;o.material.transparent=true;}}});
    function L(x,y,z){return [-x*bs,y*bs+oy,-z*bs];}
    CAR.eye=L(0.355,1.27,0.2);CAR.wheel=L(0.335,0.86,0.69);CAR.radio=L(0.0,0.93,0.93);CAR.mirror=L(0.005,1.325,0.85);CAR.dash=L(0.12,1.03,0.86);
    CAR.hol=[0.1,L(0,0.3,0)[1]-0.87,0.62];CAR.hand=[0.46,L(0,0.56,0)[1]+0.24,-0.16];
    if(GL.carMirror){GL.carMirror.position.set(CAR.mirror[0],CAR.mirror[1]-0.005,CAR.mirror[2]+0.032);GL.carMirror.rotation.set(0.02,-0.13,0);GL.carMirror.scale.set(0.72,0.95,1);}
    /* the Beetle's own rear-view mirror, as modelled: no live reflection on it */
    if(GL.carMirror)GL.carMirror.visible=false;
    GL.carMirrorPos=cw(CAR.mirror[0],CAR.mirror[1],CAR.mirror[2]);
    GL.dashL.position.set(CAR.wheel[0],CAR.wheel[1]+0.02,CAR.wheel[2]+0.2);GL.dashL.distance=0.7;GL.radioL.position.set(CAR.radio[0],CAR.radio[1]+0.02,CAR.radio[2]+0.1);
    /* rain on the windshield and her fogged window, moved onto the real glass */
    GL.rainGlass=new T.MeshBasicMaterial({map:GL.rainTex,transparent:true,opacity:0.5,depthWrite:false,fog:false});var rw=new T.Mesh(new T.PlaneGeometry(1.2,0.42),GL.rainGlass);rw.position.set(0,L(0,1.2,0)[1],L(0,0,1.02)[2]+0.06);rw.rotation.x=-0.42;B.add(rw);
    var fg=new T.Mesh(new T.PlaneGeometry(0.5,0.32),GL.fogM);fg.position.set(0.62,L(0,1.16,0)[1],-0.05);fg.rotation.y=-Math.PI/2;B.add(fg);
    if(P.area==='car'){P.x=CO.x+CAR.eye[0];P.z=CO.z+CAR.eye[2];S.camDY=CAR.eye[1]-EYE;}
  }
  /* --- the forest road --- */
  if(m.forest){
    var ST=GL.street;ST.children.forEach(function(o){o.visible=false;});
    var W=GL.roadW=new T.Group();ST.add(W);var F=m.forest;F.scale.setScalar(RD.FS);W.add(F);
    var ground=null;
    F.traverse(function(o){if(!o.isMesh)return;o.receiveShadow=true;var mt=o.material;
      if(mt&&mt.name==='Material'){mt.transparent=false;mt.alphaTest=0.45;mt.depthWrite=true;mt.side=T.DoubleSide;}
      if(mt&&mt.name==='Material.003'){ground=o;dequant(o.geometry);}if(mt){mt.roughness=0.95;mt.metalness=0;mt.color.setRGB(0.42,0.44,0.5);}});
    W.updateMatrixWorld(true);
    /* the road as a curve, with the ground height sampled along it */
    var pts=RD.pts.map(function(p){return new T.Vector3(p[0]*RD.FS,0,p[1]*RD.FS);});
    var cv=new T.CatmullRomCurve3(pts,false,'centripetal');var len=cv.getLength();
    var rc=new T.Raycaster();ST.updateMatrixWorld(true);
    function gy(x,z){if(!ground)return 0;W.updateMatrixWorld(true);var inv=new T.Matrix4().copy(W.matrixWorld).invert(),o=new T.Vector3(x,60,z).applyMatrix4(W.matrixWorld);
      rc.set(o,new T.Vector3(0,-1,0).transformDirection(W.matrixWorld));var h=rc.intersectObject(ground,false);return h.length?h[0].point.applyMatrix4(inv).y:0;}
    var N=120,ys=[];for(var i=0;i<=N;i++){var q=cv.getPointAt(i/N);ys.push(gy(q.x,q.z));}
    /* where the car stops: the arc length nearest to RD.car */
    var best=0,bd=1e9,cp=new T.Vector3(RD.car[0]*RD.FS,0,RD.car[1]*RD.FS);for(var j=0;j<=400;j++){var d=cv.getPointAt(j/400).distanceTo(cp);if(d<bd){bd=d;best=j/400;}}
    GL.road={cv:cv,len:len,ys:ys,s0:best*len,gy:gy};
    buildAsphalt(W,cv,len,gy);clearVerge(F,W,cv);
    function at(dist){var u=clamp((GL.road.s0+dist)/len,0,1);return {p:cv.getPointAt(u),t:cv.getTangentAt(u),y:ys[Math.round(u*N)]};}
    /* the traffic light hangs over the road 12 m ahead; the pole stands on the right */
    if(m.tl){var tl=m.tl,ts=1.05;
      /* 18 m straight ahead of the driver, lenses low enough to sit inside the windshield, the pole on the left verge, the arm reaching over (mirrored model), facing the car */
      placeRoad(0);GL.car.updateMatrixWorld(true);W.updateMatrixWorld(true);
      var lw=W.worldToLocal(GL.car.localToWorld(new T.Vector3(CAR.eye[0],0,-18))),cw0=W.worldToLocal(GL.car.localToWorld(new T.Vector3(CAR.eye[0],0,0)));
      var ang=Math.atan2(cw0.x-lw.x,cw0.z-lw.z);tl.scale.set(-ts,ts,ts);tl.rotation.y=ang;
      var off=new T.Vector3(2.9*ts,0,-0.42*ts).applyAxisAngle(new T.Vector3(0,1,0),ang);var ox=lw.x-off.x,oz=lw.z-off.z;
      tl.position.set(ox,2.95-4.88*ts-W.position.y,oz);W.add(tl);W.position.set(0,0,0);W.rotation.set(0,0,0);
      tl.traverse(function(o){if(o.isMesh){o.castShadow=true;}});
      /* move the glowing lenses onto the real housing */
      var TL=GL.tl;TL.visible=true;TL.children.forEach(function(o){o.visible=false;});
      var hz=-0.19+0.012,lens=[[GL.tlR,4.88],[GL.tlY,4.565],[GL.tlG,4.25]];
      lens.forEach(function(e){e[0].side=T.DoubleSide;e[0].needsUpdate=true;var c=new T.Mesh(new T.CircleGeometry(0.125,24),e[0]);c.position.set(-2.9,e[1],-0.15);tl.add(c);});
      GL.tlGlow.position.set(-2.9,4.88,0.05);GL.tlGlow.scale.set(3.2,3.2,1);tl.add(GL.tlGlow);GL.tlGlow.visible=true;
      GL.tlLight.position.set(-2.9,3.2,2.6);tl.add(GL.tlLight);GL.tlLight.visible=true;GL.tlLight.distance=30;GL.tlLight.intensity=5.5;GL.tlLight.decay=1.2;GL.tlHeads={red:4.88,green:4.25};}
    /* street lights along the road, alternating sides, the closest ones casting light */
    if(m.sl){GL.lamps.forEach(function(l){if(l.l)l.l.intensity=0;});GL.lamps=[];
      [-16,3,22,40,58,-34].forEach(function(dd,i){var a2=at(dd),sd=i%2?1:-1,rt=new T.Vector3(-a2.t.z,0,a2.t.x).normalize();
        var lp=new T.Group(),bx=a2.p.x+rt.x*sd*3.6,bz=a2.p.z+rt.z*sd*3.6;lp.position.set(bx,gy(bx,bz)-0.05,bz);
        lp.rotation.y=Math.atan2(-rt.x*sd,-rt.z*sd);W.add(lp);
        var sl=m.sl.clone(true);sl.scale.setScalar(0.015);sl.position.set(229.8*0.015,0,0);lp.add(sl);
        var lensM=new T.MeshBasicMaterial({color:0xffb04a});sl.traverse(function(o){if(o.isMesh&&/385/.test(o.name))o.material=lensM;if(o.isMesh)o.castShadow=false;});
        var hx=0.0,hy=4.80*1.5,hzz=180.5*0.015;var spr=new T.Sprite(new T.SpriteMaterial({map:GL.glow,color:0xffa040,transparent:true,opacity:0.8,depthWrite:false,blending:T.AdditiveBlending,fog:false}));spr.scale.set(3.4,3.4,1);spr.position.set(hx,hy-0.1,hzz);lp.add(spr);
        var pl=null;if(Math.abs(dd)<30){pl=new T.PointLight(0xff9a3c,2.0,17,1.6);pl.position.set(hx,hy-0.4,hzz);lp.add(pl);}
        GL.lamps.push({g:lp,m:lensM,s:spr,l:pl,z:dd,on:1});});
      GL.lamps.sort(function(x,y){return Math.abs(x.z)-Math.abs(y.z);});}
    /* the headlights: the only thing that shows the road */
    GL.heads=[];[-0.55,0.55].forEach(function(x){var h=new T.SpotLight(0xffe8c0,2.6,34,0.42,0.55,1.2);h.position.set(x,0.75,-1.9);var tg=new T.Object3D();tg.position.set(x*1.5,0,-16);GL.car.add(tg);h.target=tg;GL.car.add(h);GL.heads.push(h);});
    GL.roadAmb=new T.HemisphereLight(0x22324e,0x070809,0.24);GL.car.add(GL.roadAmb);
    GL.moonL=new T.DirectionalLight(0x6f86b8,0.22);GL.moonL.position.set(-20,40,10);GL.car.add(GL.moonL);
    GL.carFog=new T.FogExp2(0x04070d,0.055);
    if(P.area==='car'){scene.fog=GL.carFog;placeRoad(S.dist||0);}else placeRoad(0);
    try{var v=GL.car.visible;GL.car.visible=true;R.compile(scene,cam);GL.car.visible=v;}catch(e){}
  }
  GL.roadReady=true;
}
/* quantized vertex data reads raw on the CPU in this three.js: expand it so raycasts see real positions */
function dequant(g){var a=g.attributes.position;if(!a||!a.normalized)return;var arr=a.isInterleavedBufferAttribute?a.data.array:a.array,d=arr instanceof Int16Array?32767:arr instanceof Uint16Array?65535:arr instanceof Int8Array?127:arr instanceof Uint8Array?255:1,f=new Float32Array(a.count*3);
  for(var i=0;i<a.count;i++){f[i*3]=Math.max(a.getX(i)/d,-1);f[i*3+1]=Math.max(a.getY(i)/d,-1);f[i*3+2]=Math.max(a.getZ(i)/d,-1);}g.setAttribute('position',new T.BufferAttribute(f,3));g.computeBoundingSphere();g.computeBoundingBox();}
/* wet asphalt: dark, worn, a broken yellow centre line and white edges */
function texAsphalt(){return canvasTex(256,512,function(g,w,h){var r=rnd(41);g.fillStyle='#1a1b1d';g.fillRect(0,0,w,h);
  for(var i=0;i<9000;i++){var v=20+r()*30|0;g.fillStyle='rgba('+v+','+v+','+(v+2)+','+(0.35+r()*0.5)+')';g.fillRect(r()*w,r()*h,1+r()*2,1+r()*2);}
  for(var k=0;k<14;k++){var px=r()*w,py=r()*h,pr=10+r()*40,gr=g.createRadialGradient(px,py,0,px,py,pr);gr.addColorStop(0,'rgba(8,8,10,.55)');gr.addColorStop(1,'rgba(8,8,10,0)');g.fillStyle=gr;g.fillRect(px-pr,py-pr,pr*2,pr*2);}
  g.fillStyle='rgba(205,165,60,.85)';for(var y=0;y<h;y+=128){g.fillRect(w/2-4,y+10,8,70);}
  g.fillStyle='rgba(215,215,205,.75)';g.fillRect(12,0,6,h);g.fillRect(w-18,0,6,h);
  /* tyre tracks, darker and smoother */
  g.fillStyle='rgba(6,6,8,.35)';g.fillRect(w*0.22,0,22,h);g.fillRect(w*0.66,0,22,h);
});}
function buildAsphalt(W,cv,len,gy){
  var RW=3.1,NS=Math.ceil(len/1.0),pos=[],uv=[],idx=[],up=new T.Vector3(0,1,0),hh=[];
  for(var i=0;i<=NS;i++){var u=i/NS,p=cv.getPointAt(u),t=cv.getTangentAt(u),rt=new T.Vector3().crossVectors(t,up).normalize();
    /* sit on the highest ground under the road's width, so the terrain never pokes through */
    var y=-1e9;for(var k=-2;k<=2;k++){var q=p.clone().addScaledVector(rt,k*RW/2);y=Math.max(y,gy(q.x,q.z));}hh.push(y);}
  for(var i2=0;i2<=NS;i2++){var a=Math.max(0,i2-2),b=Math.min(NS,i2+2),m=0;for(var j=a;j<=b;j++)m+=hh[j];hh[i2]=Math.max(hh[i2]-0.05,m/(b-a+1))+0.06;}
  for(var i3=0;i3<=NS;i3++){var u3=i3/NS,p3=cv.getPointAt(u3),t3=cv.getTangentAt(u3),r3=new T.Vector3().crossVectors(t3,up).normalize(),d=u3*len;
    [-1,1].forEach(function(sd){var q=p3.clone().addScaledVector(r3,sd*RW);pos.push(q.x,hh[i3],q.z);uv.push(sd<0?0:1,d/8);});
    /* shoulders that slope down into the ground */
    [-1,1].forEach(function(sd){var q=p3.clone().addScaledVector(r3,sd*(RW+1.0));pos.push(q.x,Math.min(hh[i3]-0.12,gy(q.x,q.z)+0.03),q.z);uv.push(sd<0?-0.05:1.05,d/8);});}
  for(var i4=0;i4<NS;i4++){var o=i4*4,n=o+4;idx.push(o,n,o+1,o+1,n,n+1);idx.push(o+2,n+2,o,o,n+2,n);idx.push(o+1,n+1,o+3,o+3,n+1,n+3);}
  var g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(pos,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setIndex(idx);g.computeVertexNormals();
  var tx=texAsphalt();tx.wrapS=T.ClampToEdgeWrapping;tx.wrapT=T.RepeatWrapping;tx.anisotropy=8;
  var m2=std({map:tx,roughness:0.42,metalness:0.08,color:0xb0b0b0,side:T.DoubleSide});
  var road=new T.Mesh(g,m2);road.receiveShadow=true;W.add(road);GL.asphalt=road;GL.roadH=hh;
  GL.roadHere=function(x,z){return 0.02;};
}
/* clear trees and brush off the road: drop every triangle of foliage or trunk whose centre is within a few metres of it */
function clearVerge(F,W,cv){
  var pts=[];for(var i=0;i<=240;i++){var p=cv.getPointAt(i/240);pts.push([p.x,p.z]);}
  var inv=new T.Matrix4().copy(W.matrixWorld).invert(),mm=new T.Matrix4(),v=new T.Vector3();
  F.traverse(function(o){if(!o.isMesh)return;var mt=o.material;if(!mt||mt.name==='Material.003')return;
    var lim=mt.name==='Material'?4.4:4.0,g=o.geometry,ix=g.index;if(!ix)return;dequant(g);var pa=g.attributes.position;
    mm.multiplyMatrices(inv,o.matrixWorld);var keep=[],a=ix.array,cx=[],nv=pa.count,wx=new Float32Array(nv),wz=new Float32Array(nv);
    for(var k=0;k<nv;k++){v.set(pa.getX(k),pa.getY(k),pa.getZ(k)).applyMatrix4(mm);wx[k]=v.x;wz[k]=v.z;}
    for(var t=0;t<a.length;t+=3){var x=(wx[a[t]]+wx[a[t+1]]+wx[a[t+2]])/3,z=(wz[a[t]]+wz[a[t+1]]+wz[a[t+2]])/3,near=false;
      for(var q=0;q<pts.length;q++){var dx=pts[q][0]-x,dz=pts[q][1]-z;if(dx*dx+dz*dz<lim*lim){near=true;break;}}
      if(!near)keep.push(a[t],a[t+1],a[t+2]);}
    g.setIndex(keep);});
}
/* put the road under the car: the point 'dist' metres along the road sits at the car, heading forward */
function placeRoad(dist){
  var r=GL.road,W=GL.roadW;if(!r||!W)return;var u=clamp((r.s0+dist)/r.len,0,1),p=r.cv.getPointAt(u),t=r.cv.getTangentAt(u);
  var a=Math.PI-Math.atan2(t.x,t.z),y=GL.roadH?GL.roadH[Math.round(u*(GL.roadH.length-1))]:r.ys[Math.round(u*(r.ys.length-1))];
  W.rotation.y=a;var v=new T.Vector3(p.x,0,p.z).applyAxisAngle(new T.Vector3(0,1,0),a);W.position.set(-v.x-(GL.asphalt?1.45:0),-y,-v.z);  /* keep to the right-hand lane */
}
/* car audio: the engine idling, the radio static, the rain, the traffic light ticking */
function carAudio(on){
  if(!ac)return;
  if(on&&!AU.car){try{var A={};
    A.g=ac.createGain();A.g.gain.value=0;A.g.connect(AU.sfx);
    var eo=ac.createOscillator();eo.type='sawtooth';eo.frequency.value=30;var ef=ac.createBiquadFilter();ef.type='lowpass';ef.frequency.value=160;var eg=ac.createGain();eg.gain.value=0.07;
    var lfo=ac.createOscillator();lfo.frequency.value=7.5;var lg=ac.createGain();lg.gain.value=0.025;lfo.connect(lg);lg.connect(eg.gain);eo.connect(ef);ef.connect(eg);eg.connect(A.g);eo.start();lfo.start();A.eng=eo;A.engF=ef;A.engG=eg;
    var nb=ac.createBuffer(1,ac.sampleRate*2,ac.sampleRate),nd=nb.getChannelData(0);for(var i=0;i<nd.length;i++)nd[i]=Math.random()*2-1;
    var st=ac.createBufferSource();st.buffer=nb;st.loop=true;A.stF=ac.createBiquadFilter();A.stF.type='bandpass';A.stF.frequency.value=2400;A.stF.Q.value=0.8;A.stG=ac.createGain();A.stG.gain.value=0.0;st.connect(A.stF);A.stF.connect(A.stG);A.stG.connect(A.g);st.start();
    var rn=ac.createBufferSource();rn.buffer=nb;rn.loop=true;rn.playbackRate.value=0.7;var rf=ac.createBiquadFilter();rf.type='highpass';rf.frequency.value=2200;var rg=ac.createGain();rg.gain.value=0.035;rn.connect(rf);rf.connect(rg);rg.connect(A.g);rn.start();
    AU.car=A;}catch(e){console.warn('car audio',e);}}
  if(AU.car)AU.car.g.gain.setTargetAtTime(on?1:0,ac.currentTime,0.3);
}
function sTick(){noiseBurst(0.02,1800,3,0.12,false);}
/* entering the car */
function goCar(loop){
  if(S.busy)return;loadRoadModels();loadGoth();loadLuna2();S.busy=true;sCreak();GL.dCar.want=1.2;
  after(0.5,function(){fadeTo(1,0.6,function(){enterCar(loop);fadeTo(0,0.9,function(){S.busy=false;});});});
}
function enterCar(loop){
  setArea('car');S.loop=loop;S.trig=false;S.lookT=0;S.holSeen=false;S.holMirror=false;S.eyesAcc=0;S.mockT=2;S.c3T=0;S.leanT=0;S.leanSnd=0;if(GL.hol){GL.hol.scale.setScalar(HOLS);GL.hol.rotation.x=0;}S.c4T=0;S.handOut=false;S.drive=0;S.tune=0;S.tuneGoal=3+Math.floor(Math.random()*3);S.walk=-1;S.give=-1;S.wipeT=3;S.tickT=1;
  S.ring=Math.min(S.ring,0.2);
  P.x=CO.x+CAR.eye[0];P.z=CO.z+CAR.eye[2];P.yaw=Math.PI;P.pitch=-0.03;S.camDY=CAR.eye[1]-EYE;P.spd=0;
  GL.street.position.z=0;GL.carBody.position.y=0;S.dist=0;if(GL.road)placeRoad(0);
  GL.lamps.forEach(function(l){l.on=1;l.m.color.setHex(0xffb04a);l.s.visible=true;if(l.l)l.l.intensity=3.2;});
  loadDamianClips();if(S.dmUse!=='Driving')dmUse('Driving');
  lunaSeat(false);setTL('red');if(GL.heads)GL.heads.forEach(function(h){h.intensity=2.6;});GL.lunaHand.visible=false;GL.carNeck.visible=false;GL.fogM.opacity=0;
  if(GL.hol){GL.hol.visible=false;GL.holLight.intensity=0;}
  GL.carAmb.intensity=loop===4?0.14:0.5;GL.radioL.intensity=loop===4?0.08:0.25;
  carAudio(true);if(AU.car)AU.car.stG.gain.setTargetAtTime(loop===1?0.09:0.025,ac.currentTime,0.2);
  if(loop===1)after(2.2,function(){hint(tx('radio'),2600);});
  if(loop===2)after(2.2,function(){hint(tx('reach'),2600);});
  S.knock1=S.knock2=0;
}
function setTL(c){GL.tlR.color.setHex(c==='red'?0xff1a10:0x200606);GL.tlG.color.setHex(c==='green'?0x20ff70:0x06200e);
  var col=c==='red'?0xff2010:0x30ff80;GL.tlGlow.material.color.setHex(col);GL.tlLight.color.setHex(col);GL.tlGlow.position.y=GL.tlHeads?(c==='red'?GL.tlHeads.red:GL.tlHeads.green):(c==='red'?6.32:5.68);}
function nextCarLoop(delay){
  after(delay||4,function(){S.busy=true;fadeTo(1,1.0,function(){S.holMirror=false;if(GL.hol){GL.hol.visible=false;GL.holLight.intensity=0;}enterCar(S.loop+1);fadeTo(0,1.2,function(){S.busy=false;});});});
}
/* the asphalt's height under a point (the road rises and falls ahead of the car) */
var _rrc=null;function roadYAt(x,z){if(!GL.asphalt)return 0;_rrc=_rrc||new T.Raycaster();_rrc.set(_v1.set(x,40,z),_v2.set(0,-1,0));var h=_rrc.intersectObject(GL.asphalt,false);return h.length?h[0].point.y:0;}
/* Damian's hands in the car: on the wheel, or reaching where the scene needs them */
function carArms(dt){
  var f=fbInit();if(!f)return;var h=GL.hero;GL.fpOn=true;h.visible=true;if(f.Head)f.Head.scale.setScalar(0.001);
  h.position.set(P.x,S.camDY,P.z+0.05);h.rotation.y=Math.PI;h.updateMatrixWorld(true);
  if(S.dmUse==='Driving'){var hp=h.getObjectByName('mixamorigHips');if(hp){var hw=hp.getWorldPosition(new T.Vector3()),want=cw(CAR.eye[0],CAR.eye[1]-0.66,CAR.eye[2]+(GL.heroAlt&&GL.heroAlt.key==='clown'?-0.05:GL.heroPP?0.03:0.14));h.position.x+=want.x-hw.x;h.position.y+=want.y-hw.y;h.position.z+=want.z-hw.z;h.updateMatrixWorld(true);}}
  var w=CAR.wheel,br=Math.sin(time*1.6)*0.004;
  var hi=GL.heroAlt&&GL.heroAlt.key==='suit'?0.13:0.15,hu=GL.heroAlt&&GL.heroAlt.key==='suit'?0.1:0.07,L1=cw(w[0]-hi,w[1]+hu+br,w[2]+0.06),R1=cw(w[0]+hi,w[1]+hu+br,w[2]+0.06);
  /* the little walking figure: two fingers stepping across the dash toward her seat */
  if(S.walk>=0){var u=S.walk;var x=-0.12+0.5*ss(0.6,3.6,u),hop=Math.abs(Math.sin(u*7))*0.025*(u>0.6&&u<3.6?1:0),back=ss(5.2,6.4,u);
    var tgt=cw(x,CAR.dash[1]+0.02+hop,CAR.dash[2]);R1.lerp(tgt,ss(0,0.6,u)*(1-back));}
  if(S.give>=0){var g2=S.give;R1.lerp(cw(0.06,CAR.hand[1]+0.02,CAR.hand[2]-0.1),ss(0,1.0,g2)*(1-ss(6.2,7.2,g2)));}
  [['Left',L1,-1],['Right',R1,1]].forEach(function(e){var A=f[e[0]+'Arm'],FA=f[e[0]+'ForeArm'],HD=f[e[0]+'Hand'];
    A.getWorldPosition(_v1);_et.copy(_v1).add(e[1]).multiplyScalar(0.5);_et.x+=e[2]*0.12;_et.y-=0.1;aimBone(A,FA,_et);aimBone(FA,HD,e[1]);
    if(GL.heroPP){var fr=f[e[0]+'Fing'];if(!fr){fr=f[e[0]+'Fing']={};HD.traverse(function(o){if(o.isBone&&o!==HD)fr[o.name]=o.quaternion.clone();});}for(var fn in fr){var fb=HD.getObjectByName(fn);if(fb)fb.quaternion.copy(fr[fn]);}HD.updateMatrixWorld(true);
      if(GL.heroAlt&&GL.heroAlt.key==='clown'){if(S.walk<0&&S.give<0)handPose(HD,e[0],_hv2.set(e[2]*0.15,-1,-0.3),_hv1.set(-e[2]*0.3,-0.3,-1),0);}else if(S.walk<0&&S.give<0)handPose(HD,e[0],_hv2.set(e[2]*0.25,-1,-0.35),_hv1.set(-e[2]*0.15,0.25,-1),1.15);else handCurl(HD,e[0],0.25);}});
}
function carTick(dt){
  var L4=S.loop===4;
  /* the cabin breathes: engine shudder, rain on the glass, the wipers now and then, the traffic light ticking */
  GL.carBody.position.y=Math.sin(time*31)*0.0009+(S.drive>0?Math.sin(time*13)*0.002:0);
  GL.rainTex.offset.y+=dt*(0.012+(S.drive>0?ss(0,3,S.drive)*0.25:0));
  /* rain only shows where there is light: fewer lamps and dead headlights, fainter rain and glass */
  var lit=0;GL.lamps.forEach(function(l){if(l.on)lit++;});var hl=GL.heads&&GL.heads[0]?GL.heads[0].intensity/2.6:1,lv=clamp(0.25+0.45*lit/Math.max(1,GL.lamps.length)+0.3*Math.min(1,hl),0.06,1);
  if(S.loop===4&&!S.drive)lv*=0.55;GL.rain.material.opacity=0.42*lv;if(GL.rainGlass)GL.rainGlass.opacity=0.5*lv;
  var spd=S.drive>0?ss(0,3.2,S.drive)*16:0;GL.rain.scale.z=1;
  var rp=GL.rain.geometry.attributes.position,ra=rp.array,dz=spd*dt,sl=spd*0.035;
  for(var i=0;i<GL.rainN;i++){var dy=GL.rainV[i]*dt,dx=dy*0.12,k=i*6;ra[k+1]-=dy;ra[k+4]-=dy;ra[k]-=dx;ra[k+3]-=dx;ra[k+2]+=dz;ra[k+5]+=dz;
    /* when driving, each streak leans back toward the car */
    ra[k+2]=ra[k+5]-sl;
    if(ra[k+4]<-0.2){var up=9;ra[k+1]+=up;ra[k+4]+=up;ra[k]+=up*0.12;ra[k+3]+=up*0.12;}
    if(ra[k+5]>8){ra[k+5]-=38;ra[k+2]-=38;}
    if(Math.abs(ra[k+3])<1.2&&ra[k+5]>-2.2&&ra[k+5]<2.4){ra[k+5]-=4.6;ra[k+2]-=4.6;}}rp.needsUpdate=true;
  if(GL.splash)GL.splash.forEach(function(o){o.t-=dt*3;if(o.t<=0){o.t=1;var gz=-2.5-Math.random()*16,gx=(Math.random()-0.5)*5.5;o.s.position.set(gx,GL.roadHere?GL.roadHere(gx,gz):0.02,gz);}o.s.material.opacity=0.55*o.t*o.t;var sc=0.06+0.16*(1-o.t);o.s.scale.set(sc*1.6,sc*0.45,1);});
  S.wipeT-=dt;var wp=S.wipeT<0?ss(0,0.45,-S.wipeT)*(1-ss(0.55,1.0,-S.wipeT)):0;if(S.wipeT<-1.05)S.wipeT=5+Math.random()*4;GL.wipers.forEach(function(w2){w2.rotation.z=1.35-wp*2.0;});
  S.tickT-=dt;if(S.tickT<=0&&!S.drive){S.tickT=1;sTick();}
  GL.needle.rotation.z=2.2-(S.drive>0?ss(0,3,S.drive)*2.6:0)+Math.sin(time*23)*0.01;
  if(S.loop<4)GL.fogM.opacity=0.25+0.2*Math.sin(time*0.9);
  /* look limits: you can turn your head, not your body */
  var dy=Math.atan2(Math.sin(P.yaw-Math.PI),Math.cos(P.yaw-Math.PI));if(Math.abs(dy)>2.75)P.yaw=Math.PI+Math.sign(dy)*2.75;P.pitch=clamp(P.pitch,-0.95,0.55);
  if(!S.revealing)carArms(dt);
  if(S.walk>=0)S.walk+=dt;if(S.give>=0)S.give+=dt;
  /* 1: the radio has lost her; tune until she comes through */
  if(S.loop===1&&AU.car)GL.radioNeedle.position.x=CO.x*0+CAR.radio[0]-0.09+((S.tune/S.tuneGoal)*0.15);
  /* 3: someone sits behind you; you only see him in the mirror. Don't turn around. */
  /* 3: someone is coming up the road, drunk, through the headlights. Don't stare at him. He reaches your window. */
  if(S.loop===3&&GL.hol){
    if(!S.holSeen&&!S.busy&&S.c3T===0){S.holSeen=true;S.hd=26;S.hx=0.35;S.hPh='walk';S.hT=0;S.stare=0;
      GL.hol.scale.setScalar(HOLS);GL.hol.rotation.set(0,0,0);GL.hol.visible=true;holUse('walk',0.9);
      GL.holLight.color.setHex(0xb8c4e8);GL.holLight.distance=5;GL.holLight.intensity=0;}
    if(S.holSeen&&!S.trig&&!S.busy){S.c3T+=dt;S.hT+=dt;var H=GL.hol;H.visible=true;
      /* stagger: forward along the road in the car's lane, weaving */
      if(S.hPh==='walk'){S.hd=Math.max(2.3,S.hd-dt*0.78);S.hx=0.35+Math.sin(S.c3T*0.9)*0.55+Math.sin(S.c3T*2.3)*0.12;holUse('walk',0.9);
        if(S.hd<=2.3){S.hPh='side';S.hT=0;holUse('turn');}}
      /* round the front of the car to the driver's window */
      else if(S.hPh==='side'){var u=ss(0,2.6,S.hT);S.hx=0.35+(-1.25-0.35)*u;S.hd=2.3+(0.2-2.3)*u;holUse(u<0.95?'walk':'idleB',0.7);if(S.hT>2.6){S.hPh='window';S.hT=0;}}
      /* at the window: he sways, leans in, knocks on the glass */
      else if(S.hPh==='window'){S.hx=-1.25;S.hd=0.2;holUse('idleB');
        if(!S.knock1&&S.hT>1.2){S.knock1=1;knock();}if(!S.knock2&&S.hT>2.6){S.knock2=1;knock();}
        if(S.hT>4.6){S.trig=true;setTL('off');GL.heads&&GL.heads.forEach(function(h){h.intensity=0;});H.visible=false;GL.holLight.intensity=0;sBoom(0.7);
          after(0.5,function(){setTL('red');if(GL.heads)GL.heads.forEach(function(h){h.intensity=2.6;});});nextCarLoop(2.2);}}
      /* place him (car-local: -z is ahead), facing where he goes, then the car */
      var wx=CO.x+S.hx,wz=CO.z-S.hd;var face=S.hPh==='walk'?0:S.hPh==='side'?Math.atan2(-1,0.3):Math.atan2(CO.x+CAR.eye[0]-wx,CO.z+CAR.eye[2]-wz);
      if(S.hPh==='window'){S.hLean=Math.min(1,(S.hLean||0)+dt*0.8);}else S.hLean=0;H.rotation.order='YXZ';H.rotation.x=0.26*ss(0,1,S.hLean);H.position.set(wx,roadYAt(wx,wz),wz);H.rotation.y+=Math.atan2(Math.sin(face-H.rotation.y),Math.cos(face-H.rotation.y))*Math.min(1,dt*3);
      GL.holLight.position.set(wx+0.3,2.0,wz+(S.hPh==='window'?0.6:1.2));GL.holLight.intensity=S.hPh==='walk'?1.0:1.4;
      /* staring at him is what brings the ringing */
      var lk=lookingAt(_v.set(wx,1.5,wz),40,0.93);if(lk){S.stare+=dt;S.ringSrc=true;S.ring=Math.min(1.2,S.ring+dt*(S.hPh==='window'?0.5:0.22));}else S.stare=Math.max(0,S.stare-dt*0.5);
      if(S.c3T>0.5&&S.c3T<0.6)hint(tx('noStare'),3200);}
  }
  /* 4: the streetlights die, far to near; her voice; the ringing. Close your eyes until it passes. */
  if(L4){
    S.c4T+=dt;
    GL.lamps.forEach(function(l,i){var off=1.0+(GL.lamps.length-1-i)*0.75;if(l.on&&S.c4T>off){l.on=0;l.m.color.setHex(0x110a04);l.s.visible=false;if(l.l)l.l.intensity=0;noiseBurst(0.12,180,0.7,0.2,false,0.6);}
      else if(l.on&&S.c4T>off-0.5&&Math.random()<0.2){l.s.visible=!l.s.visible;}});
    if(GL.heads){var hf=S.c4T>1.0+GL.lamps.length*0.75+0.6?0:1;if(S.c4T>1.0+GL.lamps.length*0.75&&hf&&Math.random()<0.3)hf=0.2;GL.heads.forEach(function(h){h.intensity=2.6*hf;});}
    if(!S.handOut){S.mockT-=dt;if(S.mockT<=0){S.mockT=6;vo('mock',3000,3);}
      S.ring=Math.min(1.2,S.ring+dt*0.1);S.ringSrc=true;
      if(S.eyes>0.85){S.eyesAcc+=dt;if(S.eyesAcc>4.2){S.handOut=true;S.ring=0;GL.lunaHand.visible=true;GL.lunaHand.position.set(CAR.hand[0],CAR.hand[1],CAR.hand[2]);lunaSeat(true);GL.lunaHand.rotation.set(0,0.25,0);sChime();after(1.2,function(){hint(tx('takeHand'),3000);});}}}
    else if(S.give<0){var hp=GL.lunaHand.position;hp.x+=(CAR.hand[0]-0.2-hp.x)*Math.min(1,dt*0.8);}
  }
  if(GL.lunaCar&&GL.lunaCar.on)lunaSeatTick(dt);
  /* the payoff: she takes his hand, holds it, then the light turns green */
  if(S.give>=0){var g3=S.give,lh=GL.lunaHand;
    var tgt=new T.Vector3(0.1,CAR.hand[1]+0.04,CAR.hand[2]-0.08);lh.position.lerp(tgt,Math.min(1,dt*2.2)*ss(0.8,1.6,g3));
    lh.userData.fing.forEach(function(F){F.f.rotation.z=0.9*ss(2.4,3.4,g3);F.j.rotation.z=1.0*ss(2.4,3.4,g3);});
    GL.carNeck.visible=false;   /* no necklace: she only holds his hand */
    if(g3>4.6){lh.visible=g3<5.6&&Math.random()>ss(4.6,5.6,g3);if(GL.lunaCar)GL.lunaCar.on=lh.visible;}
    if(g3>6.4&&!S.drive){S.drive=0.001;setTL('green');noiseBurst(0.6,120,0.5,0.4,true,0.6);
      /* the street comes back on, one lamp after another */
      GL.lamps.forEach(function(l,i){after(0.15+i*0.12,function(){l.on=1;l.m.color.setHex(0xffb04a);l.s.visible=true;if(l.l)l.l.intensity=3.2;});});GL.carAmb.intensity=0.35;if(GL.heads)GL.heads.forEach(function(h){h.intensity=3.2;});}
  }
  /* pulling away: the street slides past faster and faster, and it all goes white */
  if(S.drive>0){S.drive+=dt;var v=ss(0,3.2,S.drive)*16;if(GL.road){S.dist+=v*dt;placeRoad(S.dist);}else GL.street.position.z+=v*dt;
    if(AU.car){AU.car.eng.frequency.setTargetAtTime(30+v*3.2,ac.currentTime,0.1);AU.car.engF.frequency.setTargetAtTime(160+v*40,ac.currentTime,0.1);}
    if(S.drive>3.4&&!S.white&&!S.carEnd){S.carEnd=true;whiteout(function(){S.carDone=true;S.drive=0;carAudio(false);if(AU.car){AU.car.eng.frequency.value=30;AU.car.engF.frequency.value=160;}fpHands(0,0,0,0);toHub(true);});}}
}
/* Luna, sitting beside him: her own model, legs bent by aiming the bones; she watches the window, then turns to him and reaches */
/* Luna for the car and the party: the angel-costume model (with her own "stand and drink"), the forest Luna until it loads */
function loadLuna2(){
  if(GL.luna2Loading||!T.GLTFLoader)return;GL.luna2Loading=true;
  new T.GLTFLoader().load('luna2.glb?v=2',function(gl){
    if(GL.lunaCar&&GL.lunaCar.on)return;   /* don't swap her out from under the scene */
    var g=gl.scene;g.traverse(function(o){if(o.isMesh){o.frustumCulled=false;o.castShadow=false;o.receiveShadow=true;if(o.material&&o.material.map)o.material.map.anisotropy=4;}});
    if(GL.luna&&GL.luna.parent&&GL.luna!==g){GL.luna.parent.remove(GL.luna);}if(G.luna&&G.luna.g)G.luna.g.visible=false;
    GL.luna=g;GL.lunaRest=boneRest(g);g.visible=false;scene.add(g);GL.lunaNew=true;GL.lunaCar=null;GL.lunaStand=null;
    if(gl.animations&&gl.animations[0]){GL.l2Mix=new T.AnimationMixer(g);GL.l2Act=GL.l2Mix.clipAction(gl.animations[0]);}
  },undefined,function(){});
}
function lunaShow(v){if(!GL.luna)return;if(GL.lunaNew){GL.luna.visible=v;}else{G.lunaOp(v?1:0);if(G.luna.spr)G.luna.spr.visible=!v;}}
/* standing: her drink at the party; still and watching in the hallway */
function lunaAnim(dt,drink){
  if(GL.lunaNew){if(!GL.l2Act)return;if(GL.l2Walk&&!S.ls)GL.l2Walk.setEffectiveWeight(0);GL.l2Act.setEffectiveWeight(1);if(drink){if(!GL.l2Act.isRunning()){GL.l2Act.reset();GL.l2Act.play();}GL.l2Mix.update(dt);}else{GL.l2Act.play();GL.l2Act.paused=true;GL.l2Act.time=0;GL.l2Mix.update(0);}return;}
  try{G.lunaIdle(time);}catch(e){}
}
function lunaSeat(on){
  if(!GL.luna||!G.luna)return;var Lg=GL.luna;
  if(!GL.lunaCar){var c={on:false,b:{}};['Hips','Spine','Spine1','Spine2','Neck','Head','LeftUpLeg','LeftLeg','LeftFoot','RightUpLeg','RightLeg','RightFoot','LeftArm','LeftForeArm','LeftHand','RightArm','RightForeArm','RightHand'].forEach(function(n){c.b[n]=Lg.getObjectByName('mixamorig'+n);});
    c.q={};for(var n in c.b)if(c.b[n])c.q[n]=c.b[n].quaternion.clone();c.light=new T.PointLight(0xa8b8e0,0,1.8,1.6);GL.lunaCar=c;}
  var C=GL.lunaCar;
  if(on){if(GL.l2Act)GL.l2Act.stop();C.on=true;C.t=0;GL.carBody.add(Lg);Lg.visible=true;lunaShow(true);Lg.rotation.set(0,Math.PI,0);
    /* size her from her own skeleton: hips to the top of the head ~0.78 m on a woman of 1.65 m */
    if(GL.lunaNew)C.sc=1.0;
    if(!C.sc){for(var m in C.q)C.b[m].quaternion.copy(C.q[m]);Lg.scale.setScalar(1);Lg.updateMatrixWorld(true);var top=Lg.getObjectByName('mixamorigHeadTop_End')||C.b.Head,d=C.b.Hips.getWorldPosition(new T.Vector3()).distanceTo(top.getWorldPosition(new T.Vector3()));C.sc=0.78/Math.max(0.01,d);}
    Lg.scale.setScalar(C.sc);
    GL.carBody.add(C.light);C.light.intensity=0.9;GL.lunaHand.traverse(function(o){if(o.isMesh)o.visible=false;});}
  else{if(!C.on)return;C.on=false;for(var m in C.q)C.b[m].quaternion.copy(C.q[m]);scene.add(Lg);Lg.visible=false;lunaShow(false);Lg.scale.setScalar(1);C.light.intensity=0;
    GL.lunaHand.traverse(function(o){if(o.isMesh)o.visible=true;});}
}
function lunaSitPose(){var L=GL.luna;if(!GL.lunaNew||!GL.lunaRest||!T.SkeletonUtils)return false;
  if(!GL.lunaSitMix){if(GL.lunaSitFail)return false;if(!GL.dRest){damRest(function(){});loadDamianClips();return false;}if(!GL.clips||!GL.clips.Driving){loadDamianClips();return false;}
    try{var c=retarget(restClone(GL.dRest,null),GL.clips.Driving,restClone(L,GL.lunaRest));GL.lunaSitMix=new T.AnimationMixer(L);GL.lunaSitAct=GL.lunaSitMix.clipAction(c);GL.lunaSitAct.play();}catch(e){GL.lunaSitFail=true;console.warn('lunaSit',e);return false;}}
  L.traverse(function(o){if(o.isBone&&GL.lunaRest[o.name])o.quaternion.copy(GL.lunaRest[o.name]);});
  GL.lunaSitAct.enabled=true;GL.lunaSitAct.setEffectiveWeight(1);GL.lunaSitMix.setTime(0.4);L.updateMatrixWorld(true);return true;}
function lunaSeatTick(dt){
  var C=GL.lunaCar,Lg=GL.luna,B=GL.carBody,b=C.b;C.t+=dt;
  for(var m in C.q)b[m].quaternion.copy(C.q[m]);
  /* a real seated pose: Damian's driving clip moved onto her rig, held still; her arms, neck and head are then placed by hand */
  var sit=lunaSitPose();
  /* sit: hips on the cushion, a little back */
  var seat=new T.Vector3(0.3,GL.lunaNew?0.69:0.76,GL.lunaNew?-0.02:-0.06);Lg.position.set(0,0,0);Lg.updateMatrixWorld(true);
  var hp=B.worldToLocal(b.Hips.getWorldPosition(new T.Vector3()));Lg.position.set(seat.x-hp.x,seat.y-hp.y,seat.z-hp.z);Lg.updateMatrixWorld(true);
  function W(x,y,z){return B.localToWorld(new T.Vector3(x,y,z));}
  /* legs: thighs forward, shins down to the floor */
  if(!sit)[['Left',-0.09],['Right',0.09]].forEach(function(e){var x=0.3+e[1];var kz=GL.lunaNew?-0.46:-0.52,ky=GL.lunaNew?0.72:0.8;aimBone(b[e[0]+'UpLeg'],b[e[0]+'Leg'],W(x,ky,kz));aimBone(b[e[0]+'Leg'],b[e[0]+'Foot'],W(x+e[1]*0.3,0.3,kz-0.06));});
  /* back against the seat, a slight slump */
  if(!sit)aimBone(b.Spine,b.Neck,GL.lunaNew?W(0.31,1.4,-0.06):W(0.32,1.4,0.02));
  /* she looks out of her window; when she gives it to him, she turns */
  var g=S.give>=0?S.give:-1,turn=g<0?0:ss(0.2,1.2,g);
  /* the neck stays upright and only leans a little toward where she looks; the head turns with it */
  if(b.Head&&b.Neck){var np=B.worldToLocal(b.Neck.getWorldPosition(new T.Vector3()));var lean=new T.Vector3(0.1,1,-0.12).lerp(new T.Vector3(-0.14,1,0.02),turn).normalize().multiplyScalar(0.3);
    aimBone(b.Neck,b.Head,W(np.x+lean.x,np.y+lean.y,np.z+lean.z));
    var hp2=B.worldToLocal(b.Head.getWorldPosition(new T.Vector3())),HT=Lg.getObjectByName('mixamorigHeadTop_End');if(HT){var tilt=new T.Vector3(0.14,1,-0.06).lerp(new T.Vector3(-0.1,1,0.0),turn).normalize().multiplyScalar(0.25);aimBone(b.Head,HT,W(hp2.x+tilt.x,hp2.y+tilt.y,hp2.z+tilt.z));}}
  /* hands: resting in her lap; the left one reaches for his when she gives him the necklace */
  aimBone(b.RightArm,b.RightForeArm,W(0.47,0.9,-0.12));aimBone(b.RightForeArm,b.RightHand,W(0.36,0.82,-0.32));
  var lhT=B.localToWorld(GL.lunaHand.position.clone()),rest=W(0.24,0.82,-0.32),k=S.give>=0?ss(0.6,1.6,S.give):0.15*(1+Math.sin(C.t*0.7));
  var tgt=rest.clone().lerp(lhT,k),sh=b.LeftArm.getWorldPosition(new T.Vector3()),el=sh.clone().lerp(tgt,0.5);el.y-=0.12;el.add(B.localToWorld(new T.Vector3(0.12,0,0)).sub(B.localToWorld(new T.Vector3())));
  aimBone(b.LeftArm,b.LeftForeArm,el);aimBone(b.LeftForeArm,b.LeftHand,tgt);
  C.light.position.set(0.55,1.3,-0.45);C.light.intensity=0.9*(GL.lunaHand.visible?1:0);
}
/* three knuckles on the driver's window */
function knock(){for(var i=0;i<3;i++)(function(i){after(i*0.22,function(){noiseBurst(0.04,1400,1.5,0.5,true,0.8);thud(ac?ac.currentTime:0,180,90,0.12);});})(i);}
function takeHand(){
  S.give=0;S.busy=true;S.lockInput=true;noiseBurst(0.2,2600,1.5,0.15,true);
  after(1.4,function(){sChime();});after(2.6,function(){vo('c4',4200,0);});
  after(9.5,function(){S.lockInput=false;});
}
/* Hollow comes from the forest; his model may still be loading when Limbo starts, so take him whenever he arrives */
function adoptHollow(){
  if(GL.hol||!G.hol||!G.hol.g||G.hol.ready===false)return false;
  try{if(G.hol.act){G.hol.act.setEffectiveWeight(1);G.hol.act.timeScale=0.3;}if(G.hol.runAct)G.hol.runAct.setEffectiveWeight(0);if(G.hol.stompAct)G.hol.stompAct.setEffectiveWeight(0);G.hol.grab=false;}catch(e){}
  GL.hol=G.hol.g;scene.add(GL.hol);GL.hol.visible=false;GL.hol.scale.setScalar(HOLS);
  GL.hol.traverse(function(o){o.frustumCulled=false;});
  GL.holLight=new T.PointLight(0x6f86a8,0.0,5,2);scene.add(GL.holLight);
  loadHolClips();
  return true;
}
/* Hollow's drunk clips: stagger, sway, lurch */
function loadHolClips(){
  if(GL.hcLoading)return;GL.hcLoading=true;
  fetch('hollow_anims.json?v=3').then(function(r){return r.json();}).then(function(j){
    /* the clips are already baked onto his own rig (rest pose to rest pose), hips included */
    var k=1;GL.hc={};
    for(var n in j){var c=j[n];c.tracks.forEach(function(t){if(t.name==='mixamorigHips.position'){for(var i=0;i<t.values.length;i++)t.values[i]*=k;}});try{GL.hc[n]=T.AnimationClip.parse(c);}catch(e){}}
    holUse('idleA');
  }).catch(function(){});
}
function holUse(name,speed){
  if(!GL.hc||!GL.hc[name]||!G.hol||!G.hol.mixer)return;var M=G.hol.mixer;GL.hcActs=GL.hcActs||{};
  [G.hol.act,G.hol.runAct,G.hol.stompAct].forEach(function(a){if(a)a.setEffectiveWeight(0);});
  var a=GL.hcActs[name]||(GL.hcActs[name]=M.clipAction(GL.hc[name]));a.timeScale=speed||1;
  if(GL.hcCur===name){return;}
  if(GL.hcCur&&GL.hcActs[GL.hcCur]){var o=GL.hcActs[GL.hcCur];o.fadeOut(0.4);}
  a.reset();a.setEffectiveWeight(1);a.fadeIn(0.4);a.play();GL.hcCur=name;
}
/* ================= THE PARTY (scenes 6, 9, 14): a house, masks, colour, the door at the end of the hallway ================= */
var PW=5,PD=4,PH=2.9,HW=0.8,HL=6;   /* room half-width / half-depth / height; hallway half-width and length (north) */
function texMask(kind){return canvasTex(128,160,function(g,w,h){g.clearRect(0,0,w,h);
  var base=kind===1?'#e9e6df':kind===2?'#c9a24a':kind===3?'#1a1a1c':'#f2efe8';
  g.fillStyle=base;g.beginPath();g.ellipse(w/2,h/2,w*0.42,h*0.46,0,0,7);g.fill();
  if(kind===1){g.fillStyle='#121212';g.beginPath();g.moveTo(w/2,8);g.lineTo(w*0.92,h*0.5);g.lineTo(w/2,h-6);g.closePath();g.fill();}
  g.fillStyle='#050505';[[0.33],[0.67]].forEach(function(e){g.beginPath();g.ellipse(w*e[0],h*0.42,w*0.11,h*0.06,0,0,7);g.fill();});
  if(kind!==3){g.strokeStyle=kind===2?'#7a5a18':'#8a1a1a';g.lineWidth=3;g.beginPath();g.moveTo(w*0.38,h*0.74);g.quadraticCurveTo(w/2,h*0.78,w*0.62,h*0.74);g.stroke();}
  else{g.strokeStyle='#d8d8d8';g.lineWidth=2;g.beginPath();g.moveTo(w*0.36,h*0.75);g.lineTo(w*0.64,h*0.75);g.stroke();}
  g.strokeStyle='rgba(0,0,0,.25)';g.lineWidth=2;g.beginPath();g.ellipse(w/2,h/2,w*0.42,h*0.46,0,0,7);g.stroke();
});}
function makeDancer(i,dress){
  var r=rnd(100+i),g=new T.Group(),cols=[0x15161a,0x221116,0x101820,0x1c1c1c,0x2a2018,0x161022],cm=std({color:dress||cols[i%cols.length],roughness:0.7}),sk=std({color:0x3a2c26,roughness:0.6});
  var body=new T.Group();g.add(body);
  [-0.09,0.09].forEach(function(x){var l=new T.Mesh(new T.CylinderGeometry(0.06,0.055,0.86,8).translate(0,0.43,0),cm);l.position.x=x;body.add(l);});
  var torso=new T.Mesh(dress?new T.CylinderGeometry(0.15,0.36,1.05,14).translate(0,0.86,0):new T.CylinderGeometry(0.19,0.16,0.62,12).translate(0,1.17,0),cm);body.add(torso);
  if(dress){var top=new T.Mesh(new T.CylinderGeometry(0.17,0.15,0.3,12).translate(0,1.35,0),cm);body.add(top);}
  var arms=[];[-1,1].forEach(function(sd){var a=new T.Group();a.position.set(sd*0.23,1.44,0);var m=new T.Mesh(new T.CylinderGeometry(0.05,0.045,0.62,8).translate(0,-0.31,0),cm);a.add(m);var hd=new T.Mesh(new T.SphereGeometry(0.05,8,6),sk);hd.position.y=-0.64;a.add(hd);body.add(a);arms.push(a);});
  var head=new T.Group();head.position.y=1.6;body.add(head);
  head.add(new T.Mesh(new T.SphereGeometry(0.11,14,10),dress?std({color:0x0d0907,roughness:0.8}):sk));
  var mk=new T.Mesh(new T.PlaneGeometry(0.21,0.27),new T.MeshStandardMaterial({map:GL.masks[(i*7)%4],transparent:true,alphaTest:0.4,roughness:0.35,side:T.DoubleSide}));mk.position.set(0,-0.01,0.1);head.add(mk);
  if(i%7===3&&!dress){var hat=new T.Mesh(new T.ConeGeometry(0.07,0.2,10).translate(0,0.18,0),std({color:[0xb02a6a,0x2a8ab0,0xc0a030][i%3],roughness:0.5}));head.add(hat);}
  if(dress){var hair=new T.Mesh(new T.SphereGeometry(0.12,12,8,0,Math.PI*2,0,Math.PI*0.62),std({color:0x0d0907}));hair.position.y=0.02;hair.position.z=-0.02;head.add(hair);}
  g.traverse(function(o){if(o.isMesh)o.castShadow=false;});
  g.userData={body:body,arms:arms,head:head,ph:r()*6.3,sp:0.9+r()*0.3,amp:0.6+r()*0.6,home:new T.Vector3(),yaw:r()*6.3};
  return g;
}
function buildParty(){
  var Pg=GL.party=new T.Group();Pg.position.set(PO.x,0,PO.z);scene.add(Pg);Pg.visible=false;
  GL.masks=[texMask(0),texMask(1),texMask(2),texMask(3)];
  var wall=std({map:texWall(false),color:0x6a5a78,roughness:0.9}),fl=std({map:texWood(),roughness:0.5,metalness:0.1}),ceil=std({color:0x0d0b10,roughness:1});
  function pl(w,h,x,y,z,ry,m){var me=new T.Mesh(new T.PlaneGeometry(w,h),m);me.position.set(x,y,z);me.rotation.y=ry;me.receiveShadow=true;Pg.add(me);return me;}
  /* the room */
  var f=new T.Mesh(new T.PlaneGeometry(PW*2,PD*2+HL).rotateX(-Math.PI/2),fl);f.position.set(0,0,-HL/2);Pg.add(f);
  var c=new T.Mesh(new T.PlaneGeometry(PW*2,PD*2+HL).rotateX(Math.PI/2),ceil);c.position.set(0,PH,-HL/2);Pg.add(c);
  pl(PW*2,PH,0,PH/2,PD,Math.PI,wall);pl(PD*2,PH,-PW,PH/2,0,Math.PI/2,wall);pl(PD*2,PH,PW,PH/2,0,-Math.PI/2,wall);
  /* north wall with the hallway opening, the hallway, the door at its end */
  pl(PW-HW,PH,-(PW+HW)/2,PH/2,-PD,0,wall);pl(PW-HW,PH,(PW+HW)/2,PH/2,-PD,0,wall);
  pl(HL,PH,-HW,PH/2,-PD-HL/2,Math.PI/2,wall);pl(HL,PH,HW,PH/2,-PD-HL/2,-Math.PI/2,wall);pl(HW-0.52,PH,-(HW+0.52)/2,PH/2,-PD-HL+0.01,0,wall);pl(HW-0.52,PH,(HW+0.52)/2,PH/2,-PD-HL+0.01,0,wall);pl(1.04,PH-2.2,0,2.2+(PH-2.2)/2,-PD-HL+0.01,0,wall);
  GL.pDoor=makeDoor(0xff2a4a,Pg,'D2');GL.pDoor.g.remove(GL.lastVoid);GL.pDoor.g.position.set(0,0,-PD-HL+0.06);
  GL.pDoorPos=new T.Vector3(PO.x,1.2,PO.z-PD-HL+0.1);
  /* behind the door: a small room, red light, the two of them */
  var K=GL.kissRoom=new T.Group();K.position.set(0,0,-PD-HL);Pg.add(K);
  var kw=std({color:0x2a0c10,roughness:0.9});[[-1.4,0],[1.4,0]].forEach(function(e){var m=new T.Mesh(new T.PlaneGeometry(3,PH),kw);m.position.set(e[0],PH/2,-1.5);m.rotation.y=e[0]<0?Math.PI/2:-Math.PI/2;K.add(m);});
  var kb=new T.Mesh(new T.PlaneGeometry(2.8,PH),kw);kb.position.set(0,PH/2,-3);K.add(kb);
  GL.kissL=new T.PointLight(0xff2030,0,6,1.4);GL.kissL.position.set(0.3,2.3,-1.4);K.add(GL.kissL);
  K.visible=false;
  /* furniture: a sofa, a table of red cups, a speaker */
  var sofaM=std({color:0x2a1420,roughness:0.85});box(2.4,0.45,0.9,sofaM,-3.6,0.22,2.8,Pg);box(2.4,0.6,0.25,sofaM,-3.6,0.6,3.25,Pg);
  var tab=std({color:0x1a120c,roughness:0.6});box(1.6,0.06,0.8,tab,3.6,0.78,2.6,Pg);[[-0.7,-0.32],[0.7,-0.32],[-0.7,0.32],[0.7,0.32]].forEach(function(e){box(0.05,0.76,0.05,tab,3.6+e[0],0.38,2.6+e[1],Pg);});
  var cup=std({color:0xb01818,roughness:0.4});for(var q=0;q<9;q++){var cu=new T.Mesh(new T.CylinderGeometry(0.045,0.035,0.11,10),cup);cu.position.set(3.0+(q%4)*0.32,0.865,2.4+Math.floor(q/4)*0.22);Pg.add(cu);}
  box(0.5,1.1,0.45,std({color:0x0a0a0a,roughness:0.5}),4.4,0.55,-3.4,Pg);
  GL.pBlocks=[[-4.85,-2.35,2.3,3.4],[2.75,4.45,2.15,3.05],[4.1,4.7,-3.7,-3.1]];
  /* the lights: three coloured spots that sweep, a mirror ball, a strobe */
  GL.pSpots=[];[[0xff2a9a,-3.5,-2.5],[0x2ad0ff,3.5,-2.5],[0xffa020,0,3]].forEach(function(e,i){var sp=new T.SpotLight(e[0],4.2,16,0.55,0.6,1.2);sp.position.set(e[1],PH-0.1,e[2]);var tg=new T.Object3D();Pg.add(tg);sp.target=tg;Pg.add(sp);GL.pSpots.push({l:sp,t:tg,ph:i*2.1,base:e[0]});});
  var ball=GL.pBall=new T.Mesh(new T.SphereGeometry(0.22,16,12),std({color:0xd8d8e0,metalness:1,roughness:0.15,flatShading:true}));ball.position.set(0,PH-0.45,0);Pg.add(ball);
  GL.pGlints=[];for(var j=0;j<26;j++){var gs=new T.Sprite(new T.SpriteMaterial({map:GL.glow,color:[0xff6ad0,0x7ae0ff,0xffd080][j%3],transparent:true,opacity:0.5,depthWrite:false,blending:T.AdditiveBlending}));gs.scale.set(0.35,0.35,1);Pg.add(gs);GL.pGlints.push({s:gs,a:Math.random()*6.3,e:-0.2-Math.random()*1.1});}
  GL.pStrobe=new T.PointLight(0xffffff,0,22,1.2);GL.pStrobe.position.set(0,PH-0.3,0);Pg.add(GL.pStrobe);
  GL.pAmb=new T.HemisphereLight(0x3a2a48,0x0a0608,0.35);Pg.add(GL.pAmb);
  GL.pHall=new T.PointLight(0xff3050,0,6,1.4);GL.pHall.position.set(0,0.3,-PD-HL+0.6);Pg.add(GL.pHall);
  /* one bare bulb halfway down the hallway */
  GL.pBulb=new T.PointLight(0xffc890,0.3,6,1.6);GL.pBulb.position.set(0,PH-0.25,-PD-HL/2);Pg.add(GL.pBulb);var hb=new T.Mesh(new T.SphereGeometry(0.04,8,6),new T.MeshBasicMaterial({color:0xffe0b0}));hb.position.copy(GL.pBulb.position);Pg.add(hb);
  /* the crowd */
  GL.crowd=[];var spots=[];
  for(var di=0;di<16;di++){var a=di*2.39996,rr=0.9+Math.sqrt(di)*0.95;spots.push([Math.cos(a)*rr*1.15,Math.sin(a)*rr*0.75-0.3]);}
  spots.forEach(function(sp,di){var d=makeDancer(di);d.position.set(sp[0],0,sp[1]);d.userData.home.set(sp[0],0,sp[1]);d.rotation.y=d.userData.yaw;Pg.add(d);GL.crowd.push(d);});
  /* the other girl: masked, a red dress */
  GL.girl=makeDancer(41,0x8a0c18);K.add(GL.girl);GL.girl.position.set(0.18,0,-1.55);GL.girl.rotation.y=-Math.PI/2+0.25;
  /* the other Damian: a copy of his own body */
  try{if(T.SkeletonUtils&&G.hero){var dm=GL.dClone=T.SkeletonUtils.clone(G.hero);dm.traverse(function(o){o.frustumCulled=false;});var hdc=dm.getObjectByName('mixamorigHead');if(hdc)hdc.scale.setScalar(1);dm.visible=true;K.add(dm);dm.position.set(-0.22,0,-1.55);dm.rotation.y=Math.PI/2-0.25;}}catch(e){console.warn('clone',e);}
  if(!GL.dClone){GL.dClone=makeDancer(42,null);K.add(GL.dClone);GL.dClone.position.set(-0.22,0,-1.55);GL.dClone.rotation.y=Math.PI/2-0.25;}
  /* Luna's spots in the first visit, the last one at the hallway */
  GL.lunaSpots=[[3.2,-1.8],[-3.0,-2.9],[0,-PD+0.35]];
}
/* the music: a heavy kick, an off-beat hat, a sick minor bass line; muffled when she can't hear it */
function partyAudio(on){
  if(!ac)return;
  if(on&&!AU.party){try{var A={};A.g=ac.createGain();A.g.gain.value=0;A.f=ac.createBiquadFilter();A.f.type='lowpass';A.f.frequency.value=16000;A.f.connect(A.g);A.g.connect(AU.amb);A.send=ac.createGain();A.send.gain.value=0.25;A.f.connect(A.send);A.send.connect(AU.send);A.beat=0;A.t=ac.currentTime+0.1;AU.party=A;}catch(e){}}
  if(AU.party)AU.party.g.gain.setTargetAtTime(on?0.9:0,ac.currentTime,on?0.4:0.15);
  if(AU.party&&on)AU.party.t=Math.max(AU.party.t,ac.currentTime+0.05);
}
function partyMusicTick(){
  var A=AU.party;if(!A||!ac)return;var bpm=118,step=60/bpm/2;
  while(A.t<ac.currentTime+0.25){var t=A.t,b=A.beat%16;
    if(b%2===0){var o=ac.createOscillator(),g=ac.createGain();o.frequency.setValueAtTime(140,t);o.frequency.exponentialRampToValueAtTime(42,t+0.12);g.gain.setValueAtTime(0.55,t);g.gain.exponentialRampToValueAtTime(0.0001,t+0.22);o.connect(g);g.connect(A.f);o.start(t);o.stop(t+0.25);}
    else{var len=Math.floor(ac.sampleRate*0.04),bf=ac.createBuffer(1,len,ac.sampleRate),d=bf.getChannelData(0);for(var i=0;i<len;i++)d[i]=(Math.random()*2-1)*(1-i/len);var n=ac.createBufferSource();n.buffer=bf;var hp=ac.createBiquadFilter();hp.type='highpass';hp.frequency.value=7000;var hg=ac.createGain();hg.gain.value=0.12;n.connect(hp);hp.connect(hg);hg.connect(A.f);n.start(t);}
    var notes=[55,55,65.4,55,49,49,58.3,49,55,55,65.4,73.4,49,49,58.3,46.2],bo=ac.createOscillator(),bg=ac.createGain(),bl=ac.createBiquadFilter();bo.type='sawtooth';bo.frequency.value=notes[b];bl.type='lowpass';bl.frequency.setValueAtTime(900,t);bl.frequency.exponentialRampToValueAtTime(180,t+step*0.9);bg.gain.setValueAtTime(0.13,t);bg.gain.exponentialRampToValueAtTime(0.0001,t+step*0.95);bo.connect(bl);bl.connect(bg);bg.connect(A.f);bo.start(t);bo.stop(t+step);
    if(b===0||b===8){var p=ac.createOscillator(),pg=ac.createGain();p.type='triangle';p.frequency.value=[440,415.3,392,349.2][(A.beat>>4)%4];pg.gain.setValueAtTime(0.0001,t);pg.gain.exponentialRampToValueAtTime(0.05,t+0.3);pg.gain.exponentialRampToValueAtTime(0.0001,t+step*7);p.connect(pg);pg.connect(A.f);p.start(t);p.stop(t+step*7.5);}
    A.t+=step;A.beat++;}
}
/* the other girl: the goth girl he cheats with (a real model, posed by aiming the bones) */
function loadGoth(){
  if(GL.gothLoading||!T.GLTFLoader)return;GL.gothLoading=true;
  new T.GLTFLoader().load('goth.glb?v=2',function(gl){
    var g=gl.scene;g.traverse(function(o){if(o.isMesh){o.frustumCulled=false;o.castShadow=false;o.receiveShadow=true;if(o.material){o.material.roughness=Math.max(0.45,o.material.roughness||0.5);if(o.material.map)o.material.map.anisotropy=4;}}});
    var b={};['Hips','Spine','Spine2','Neck','Head','LeftArm','LeftForeArm','LeftHand','RightArm','RightForeArm','RightHand'].forEach(function(n){b[n]=g.getObjectByName('mixamorig'+n)||g.getObjectByName('mixamorig:'+n);});
    var q={};for(var n in b)if(b[n])q[n]=b[n].quaternion.clone();
    GL.goth={g:g,b:b,q:q};
    /* in the kiss room, in place of the stand-in */
    if(GL.girl){GL.girl.visible=false;}
    var kg=g;GL.kissRoom.add(kg);kg.position.set(0.2,0,-1.55);kg.rotation.y=-Math.PI/2+0.25;kg.scale.setScalar(0.96);
    /* a second copy for the party: unmasked, by the hallway, watching him */
    if(T.SkeletonUtils){var w=GL.gothWatch=T.SkeletonUtils.clone(g);w.traverse(function(o){o.frustumCulled=false;});GL.party.add(w);w.position.set(1.35,0,-PD+0.55);w.visible=false;
      var wb={};for(var n2 in b)wb[n2]=w.getObjectByName(b[n2].name);GL.gothW={g:w,b:wb,q:q};}
    gothPose(GL.goth,'kiss');if(GL.gothW)gothPose(GL.gothW,'watch');
    if(P.area==='party')enterPartyGoth();
  },undefined,function(){});
}
function gothPose(G2,mode){
  var g=G2.g,b=G2.b;for(var n in G2.q)if(b[n])b[n].quaternion.copy(G2.q[n]);var top=g;while(top.parent)top=top.parent;top.updateMatrixWorld(true);
  function L(x,y,z){return g.localToWorld(new T.Vector3(x,y,z));}
  function arm(side,el,hd){var A=b[side+'Arm'],F=b[side+'ForeArm'],H=b[side+'Hand'];if(!A||!F||!H)return;aimBone(A,F,el);aimBone(F,H,hd);}
  if(mode==='watch'){
    /* one arm hanging, the other hand on her hip; head a little to the side */
    arm('Right',L(-0.24,1.12,0.02),L(-0.25,0.86,0.06));
    arm('Left',L(0.34,1.12,-0.05),L(0.17,0.98,0.08));
    if(b.Neck&&b.Head)aimBone(b.Neck,b.Head,L(0.06,1.75,0.1));
  }else if(mode==='kiss'){
    /* arms up around his neck, leaning into him */
    if(b.Spine&&b.Neck)aimBone(b.Spine,b.Neck,L(0,1.45,0.1));
    arm('Right',L(-0.2,1.18,0.22),L(-0.02,1.46,0.36));
    arm('Left',L(0.2,1.18,0.22),L(0.02,1.47,0.37));
    if(b.Neck&&b.Head)aimBone(b.Neck,b.Head,L(0.05,1.72,0.22));
  }
  g.updateMatrixWorld(true);
}
function gothFollow(){
  var hd=GL.dClone.getObjectByName&&GL.dClone.getObjectByName('mixamorigHead');if(!hd)return;var G2=GL.goth,g=G2.g,b=G2.b;
  for(var n in G2.q)if(b[n])b[n].quaternion.copy(G2.q[n]);var top=g;while(top.parent)top=top.parent;top.updateMatrixWorld(true);
  var hw=hd.getWorldPosition(new T.Vector3()),hl=g.worldToLocal(hw.clone());function L(x,y,z){return g.localToWorld(new T.Vector3(x,y,z));}
  if(b.Spine&&b.Neck)aimBone(b.Spine,b.Neck,L(0,1.45,0.08+Math.min(0.12,hl.z*0.15)));
  [['Right',-1],['Left',1]].forEach(function(e){var A=b[e[0]+'Arm'],F=b[e[0]+'ForeArm'],H=b[e[0]+'Hand'];if(!A)return;
    aimBone(A,F,L(e[1]*0.2,1.2,0.2));aimBone(F,H,L(hl.x+e[1]*0.1,hl.y-0.06,hl.z-0.04));});
  if(b.Neck&&b.Head)aimBone(b.Neck,b.Head,L(hl.x*0.5,1.72,0.2));
}
/* the party cast: Damian in his suit (his body here, and the one behind the door), Seb and Zuri among the guests */
function loadPartyCast(){
  loadSuit();if(GL.alt.suit&&!(GL.dClone&&GL.dClone.userData&&GL.dClone.userData.suit))kissDamian(GL.alt.suit);
  if(GL.castLoading||!T.GLTFLoader)return;GL.castLoading=true;GL.cast={};
  fetch('hollow_anims.json?v=3').then(function(r){return r.json();}).then(function(j){GL.drunkRaw=j;castAnim();}).catch(function(){});
  [['seb','seb.glb?v=2',[3.05,1.75],'idleD',0.9],['zuri','zuri.glb?v=2',[-2.35,1.85],'drink',0.9],['drinker','drinker.glb?v=2',[3.95,0.75],'own',0.9],['sheriff','sheriff.glb?v=2',[1.7,-1.5],'own',1.0],['kitty','kitty.glb?v=2',[-1.25,-0.55],'own',1.0],['maribeth','maribeth.glb?v=2',[0.45,0.95],'own',1.0]].forEach(function(e){
    new T.GLTFLoader().load(e[1],function(g){var m=g.scene;m.traverse(function(o){if(o.isMesh){o.frustumCulled=false;o.castShadow=false;o.receiveShadow=true;var ms=Array.isArray(o.material)?o.material:[o.material];ms.forEach(function(x){x.skinning=true;x.metalness=0;x.roughness=Math.max(0.55,x.roughness||0.8);});}});
      m.updateMatrixWorld(true);var ht=m.getObjectByName('mixamorigHeadTop_End')||m.getObjectByName('mixamorigHead'),h=ht?ht.getWorldPosition(new T.Vector3()).y:1.7;
      m.scale.setScalar(({seb:1.76,zuri:1.64,drinker:1.74,sheriff:1.68,kitty:1.62,maribeth:1.63}[e[0]]||1.7)/Math.max(0.01,h));m.position.set(e[2][0],0,e[2][1]);m.rotation.y=Math.atan2(-e[2][0]*0.6,-e[2][1]);GL.party.add(m);
      /* make room for them in the crowd */
      GL.crowd.forEach(function(d){if(Math.hypot(d.userData.home.x-e[2][0],d.userData.home.z-e[2][1])<1.0){d.userData.home.x+=(d.userData.home.x-e[2][0]>0?1:-1)*0.9;d.position.copy(d.userData.home);}});
      GL.cast[e[0]]={g:m,mixer:new T.AnimationMixer(m),clip:e[3],ts:e[4],yaw:m.rotation.y,anims:g.animations||[],rest:T.SkeletonUtils?restClone(m,null):null};m.visible=P.area==='party'&&S.loop<=3;castAnim();
    },undefined,function(err){console.warn(e[0],err);});});
}
/* the drunk idles, fitted to each guest's hips */
function castAnim(){if(!GL.cast)return;for(var k in GL.cast){var C=GL.cast[k];if(C.act)continue;
  if(C.clip==='idleD'){/* Damian's own standing idle; this rig's elbows fold badly, so they stay straight */
    if(!C.rest||!G.dmn||!G.dmn.acts||!G.dmn.acts.idle)continue;if(!GL.dRest){damRest(function(){});continue;}
    try{var ic=retarget(restClone(GL.dRest,null),G.dmn.acts.idle.getClip(),C.rest);ic.tracks=ic.tracks.filter(function(t){return !/(ForeArm|Hand)/.test(t.name);});
      C.act=C.mixer.clipAction(ic);C.act.timeScale=C.ts;C.act.play();C.act.time=Math.random()*3;}catch(er){C.clip='-';}continue;}
  if(C.clip.indexOf('from:')===0){/* another guest's own animation, moved onto this rig */var S2=GL.cast[C.clip.slice(5)];if(!S2||!S2.rest||!S2.anims[0]||!C.rest)continue;
    try{C.act=C.mixer.clipAction(retarget(restClone(S2.rest,null),S2.anims[0],C.rest));C.act.timeScale=C.ts;C.act.play();C.act.time=Math.random()*3;}catch(er){C.clip='-';}continue;}
  if(C.clip==='own'){/* their own animation, made on their own rig */if(C.anims[0]){var oc=C.anims[0].clone();oc.tracks.forEach(function(t){if(/Hips\.position$/.test(t.name)){var x0=t.values[0],z0=t.values[2];for(var i=0;i<t.values.length;i+=3){t.values[i]=x0;t.values[i+2]=z0;}}});/* dance in place */C.act=C.mixer.clipAction(oc);C.act.timeScale=C.ts;C.act.play();C.act.time=Math.random()*C.anims[0].duration;}else C.clip='-';continue;}
  if(C.clip==='drink'){/* Luna's "stand and drink", fitted to her hips */
    if(!GL.l2Act||!GL.lunaRest||!T.SkeletonUtils){loadLuna2();continue;}var dc;try{dc=retarget(restClone(GL.luna,GL.lunaRest),GL.l2Act.getClip(),restClone(C.g,null));}catch(er){C.clip='-';continue;}
    C.act=C.mixer.clipAction(dc);C.act.timeScale=C.ts;C.act.play();C.act.time=Math.random()*2;continue;}
  if(!GL.drunkRaw)continue;var raw=GL.drunkRaw[C.clip];if(!raw)continue;
  var f=1,c=JSON.parse(JSON.stringify(raw));   /* baked offline onto this guest's own rig */
  c.tracks.forEach(function(t){if(t.name==='mixamorigHips.position'){for(var i=0;i<t.values.length;i++)t.values[i]*=f;}});
  try{C.act=C.mixer.clipAction(T.AnimationClip.parse(c));C.act.timeScale=C.ts;C.act.play();C.act.time=Math.random()*3;}catch(er){}}}
function castTick(dt){if(!GL.cast)return;var px=P.x-PO.x,pz=P.z-PO.z,watch=S.loop===2?ss(0,2.5,4-(S.muteT||0)):0;
  if(!GL._caT||(GL._caT-=dt)<0){GL._caT=1;castAnim();}
  for(var k in GL.cast){var C=GL.cast[k];if(!C.g.visible)continue;C.mixer.update(dt);
    var ty=watch>0?Math.atan2(px-C.g.position.x,pz-C.g.position.z):C.yaw;C.g.rotation.y+=Math.atan2(Math.sin(ty-C.g.rotation.y),Math.cos(ty-C.g.rotation.y))*Math.min(1,dt*1.5);}}
/* the Damian behind the door wears the suit too */
function kissDamian(D){if(!T.SkeletonUtils||!GL.kissRoom)return;try{var dm=T.SkeletonUtils.clone(D.g);dm.traverse(function(o){o.frustumCulled=false;});
  var hd=dm.getObjectByName('mixamorigHead');if(hd)hd.scale.setScalar(1);dm.visible=true;dm.scale.setScalar(D.sc);dm.userData.suit=true;
  if(GL.dClone&&GL.dClone.parent)GL.dClone.parent.remove(GL.dClone);GL.kissRoom.add(dm);dm.position.set(-0.22,0,-1.55);dm.rotation.y=Math.PI/2-0.25;GL.dClone=dm;
  GL.dcMix=null;kissMix();}catch(e){console.warn('kissDamian',e);}}
/* moving a clip between two different rigs: compare each bone in world space against its own rest pose, then rebuild the locals */
function boneRest(root){var r={};root.traverse(function(o){if(o.isBone)r[o.name]=o.quaternion.clone();});return r;}
function restClone(root,rest){var c=T.SkeletonUtils.clone(root);c.position.set(0,0,0);c.rotation.set(0,0,0);c.scale.setScalar(1);if(rest)c.traverse(function(o){if(o.isBone&&rest[o.name])o.quaternion.copy(rest[o.name]);});c.updateMatrixWorld(true);return c;}
function retarget(src,clip,dst){
  var bones=[];dst.traverse(function(o){if(o.isBone&&!/(Index|Middle|Ring|Pinky|Thumb|_End|headfront)/.test(o.name)&&src.getObjectByName(o.name))bones.push(o);});
  var sR={},dR={},pR={};bones.forEach(function(b){sR[b.name]=src.getObjectByName(b.name).getWorldQuaternion(new T.Quaternion()).invert();dR[b.name]=b.getWorldQuaternion(new T.Quaternion());pR[b.name]=b.parent.getWorldQuaternion(new T.Quaternion());
    /* if the two rest poses differ (T-pose against A-pose), first turn the bone to point where the source's does */
    var ch=null;for(var ci=0;ci<b.children.length;ci++){var cc=b.children[ci];if(cc.isBone&&src.getObjectByName(cc.name)&&!/(Index|Middle|Ring|Pinky|Thumb|headfront)/.test(cc.name)){ch=cc;break;}}
    if(ch&&!/Hips$/.test(b.name)){var sb=src.getObjectByName(b.name),sc=src.getObjectByName(ch.name),dd=ch.getWorldPosition(new T.Vector3()).sub(b.getWorldPosition(new T.Vector3())),ds=sc.getWorldPosition(new T.Vector3()).sub(sb.getWorldPosition(new T.Vector3()));
      if(dd.lengthSq()>1e-10&&ds.lengthSq()>1e-10){var cq=new T.Quaternion().setFromUnitVectors(dd.normalize(),ds.normalize());dR[b.name].premultiply(cq);}}});
  var hS=src.getObjectByName('mixamorigHips'),hD=dst.getObjectByName('mixamorigHips'),hs0=hS.position.y,hd0=hD.position.clone();
  var mx=new T.AnimationMixer(src);mx.clipAction(clip).play();
  var fps=30,n=Math.max(2,Math.round(clip.duration*fps)+1),times=new Float32Array(n),vals={},hy=new Float32Array(n*3),q=new T.Quaternion();bones.forEach(function(b){vals[b.name]=new Float32Array(n*4);});
  for(var i=0;i<n;i++){var t=Math.min(clip.duration,i/fps);times[i]=t;mx.setTime(t);src.updateMatrixWorld(true);var W={};
    bones.forEach(function(b){src.getObjectByName(b.name).getWorldQuaternion(q);var wt=q.clone().multiply(sR[b.name]).multiply(dR[b.name]);
      var pw=W[b.parent.name]||pR[b.name];pw.clone().invert().multiply(wt).toArray(vals[b.name],i*4);W[b.name]=wt;});
    hy[i*3]=hd0.x;hy[i*3+1]=hd0.y*(hS.position.y/hs0);hy[i*3+2]=hd0.z;}
  mx.stopAllAction();mx.uncacheRoot(src);
  var tr=bones.map(function(b){return new T.QuaternionKeyframeTrack(b.name+'.quaternion',times,vals[b.name]);});tr.push(new T.VectorKeyframeTrack(hD.name+'.position',times,hy));
  return new T.AnimationClip(clip.name+'_rt',clip.duration,tr);}
/* Luna walks: the suit's walk moved onto her rig, kept in place (the code moves her) */
function makeLunaWalk(){if(!GL.walkSrc||!GL.walkRig||!GL.lunaNew||!GL.l2Mix||GL.l2Walk||!GL.lunaRest||!T.SkeletonUtils)return;
  try{var dst=restClone(GL.luna,GL.lunaRest),c=retarget(GL.walkRig,GL.walkSrc,dst);GL.l2Walk=GL.l2Mix.clipAction(c);GL.l2Walk.setEffectiveWeight(0);GL.l2Walk.play();}catch(e){console.warn('lunaWalk',e);GL.walkSrc=null;}}
/* first visit: she is looking for him through the crowd. She walks, stops, looks around, calls his name. */
function lunaSearchStart(){var sp=GL.lunaSpots[S.lunaI];S.ls={tx:sp[0],tz:sp[1],stop:0.6+Math.random(),look:0,call:1.5+Math.random()*2,walkW:0};}
function lunaPick(){var L=GL.luna,b=GL.pBlocks,x,z,tries=0;do{x=(Math.random()*2-1)*(PW-1.0);z=(Math.random()*2-1)*(PD-1.0);tries++;}
  while(tries<20&&(Math.hypot(x-L.position.x,z-L.position.z)<1.6||b.some(function(q){return x>q[0]-0.4&&x<q[1]+0.4&&z>q[2]-0.4&&z<q[3]+0.4;})));S.ls.tx=x;S.ls.tz=z;}
function lunaSearchTick(dt){var L=GL.luna,Q=S.ls;if(!Q)lunaSearchStart(),Q=S.ls;makeLunaWalk();
  var dx=Q.tx-L.position.x,dz=Q.tz-L.position.z,d=Math.hypot(dx,dz),walking=Q.stop<=0&&d>0.15;
  if(walking){var sp=0.85*dt;L.position.x+=dx/d*Math.min(sp,d);L.position.z+=dz/d*Math.min(sp,d);var ty=Math.atan2(dx,dz);L.rotation.y+=Math.atan2(Math.sin(ty-L.rotation.y),Math.cos(ty-L.rotation.y))*Math.min(1,dt*4);
    if(d<=0.2){Q.stop=1.8+Math.random()*1.8;Q.look=0;}}
  else{Q.stop-=dt;Q.look+=dt;if(Q.stop<=0)lunaPick();}
  Q.walkW+=((walking?1:0)-Q.walkW)*Math.min(1,dt*5);
  if(GL.l2Walk){GL.l2Walk.setEffectiveWeight(Q.walkW);if(GL.l2Act){if(!GL.l2Act.isRunning()){GL.l2Act.reset();GL.l2Act.play();}GL.l2Act.setEffectiveWeight(1-Q.walkW);}GL.l2Mix.update(dt);}else lunaAnim(dt,true);
  /* standing still she searches the room: the head turns from side to side */
  var hd=L.getObjectByName('mixamorigHead'),nk=L.getObjectByName('mixamorigNeck');if(hd&&(1-Q.walkW)>0.05){var a=Math.sin(Q.look*1.7)*0.65*(1-Q.walkW);_q1.setFromAxisAngle(_v1.set(0,1,0),a*0.55);hd.quaternion.multiply(_q1);if(nk){_q1.setFromAxisAngle(_v1.set(0,1,0),a*0.45);nk.quaternion.multiply(_q1);}}
  if(GL.lunaPL){GL.lunaPL.position.set(L.position.x,2.1,L.position.z+0.6);}
  Q.call-=dt;if(Q.call<=0){Q.call=4+Math.random()*3;var dp=Math.hypot(P.x-PO.x-L.position.x,P.z-PO.z-L.position.z);sLuna(Math.floor(Math.random()*5),0.35*Math.max(0.25,1-dp/9));if(dp<7)sub(tx('lunaCall'),1600);}}
function enterPartyGoth(){if(GL.gothWatch){GL.gothWatch.visible=S.loop<=2;gothPose(GL.gothW,'watch');}}
function goParty(loop){
  if(S.busy)return;loadGoth();loadPartyCast();S.busy=true;sCreak();GL.dParty.want=1.2;
  after(0.5,function(){fadeTo(1,0.6,function(){enterParty(loop);fadeTo(0,0.9,function(){S.busy=false;});});});
}
function enterParty(loop){
  setArea('party');S.loop=loop;S.trig=false;S.lookT=0;S.eyesAcc=0;S.pDoorOpen=false;S.lunaI=0;S.lunaGone=0;S.strobeT=1.5;S.hp=null;S.kiss=-1;S.mockT=3;
  S.ring=Math.min(S.ring,0.2);P.x=PO.x;P.z=PO.z+PD-0.7;P.yaw=Math.PI;P.pitch=-0.02;
  GL.pDoor.open=GL.pDoor.want=0;GL.kissRoom.visible=false;GL.kissL.intensity=0;
  if(GL.hol){GL.hol.visible=false;GL.holLight.intensity=0;}
  GL.crowd.forEach(function(d){d.visible=true;d.position.copy(d.userData.home);d.userData.head.rotation.set(0,0,0);});
  var lights=loop<=2;GL.pSpots.forEach(function(e){e.l.intensity=lights?4.2:0;});GL.pBall.visible=lights;GL.pGlints.forEach(function(g){g.s.visible=lights;});
  GL.pAmb.intensity=loop===1?0.35:loop===2?0.22:loop===3?0.05:0.14;GL.pStrobe.intensity=0;GL.pHall.intensity=loop>=3?2.2:loop===2?0.8:0;GL.pBulb.intensity=loop===4?0.9:loop===2?0.6:0.3;
  if(loop===4)GL.crowd.forEach(function(d){d.visible=false;});
  partyAudio(true);if(AU.party){AU.party.f.frequency.setTargetAtTime(loop===1?16000:loop===2?16000:180,ac.currentTime,0.1);AU.party.g.gain.setTargetAtTime(loop===1||loop===2?0.9:loop===3?0.5:0.15,ac.currentTime,0.3);}
  /* Luna in the crowd (first visit) */
  if(loop===1)placeLunaParty(0);else hideLunaParty();
  enterPartyGoth();loadPartyCast();if(GL.cast)for(var ck in GL.cast)GL.cast[ck].g.visible=loop<=3;
  if(loop===1)after(2,function(){hint(tx('findHer'),2600);});
  if(loop===2){S.muteT=4;after(2,function(){hint(tx('hall'),2600);});}
  if(loop===3)after(1.5,function(){hint(tx('dontLook'),3000);});
  if(loop===4)after(1.5,function(){hint(tx('someone'),2600);});
}
function lunaStandScale(){var L=GL.luna;if(!L)return 1;if(GL.lunaNew)return 1.0;if(GL.lunaStand)return GL.lunaStand;
  var keep=L.scale.x;L.scale.setScalar(1);L.updateMatrixWorld(true);var top=L.getObjectByName('mixamorigHeadTop_End')||L.getObjectByName('mixamorigHead'),hip=L.getObjectByName('mixamorigHips');
  var d=hip&&top?hip.getWorldPosition(new T.Vector3()).distanceTo(top.getWorldPosition(new T.Vector3())):1;L.scale.setScalar(keep);GL.lunaStand=0.78/Math.max(0.01,d);return GL.lunaStand;}
function placeLunaParty(i){
  if(!GL.luna)return;S.ls=null;if(GL.l2Walk)GL.l2Walk.setEffectiveWeight(0);var L=GL.luna,sp=GL.lunaSpots[i];GL.party.add(L);L.scale.setScalar(lunaStandScale());L.visible=true;lunaShow(true);
  if(GL.lunaCar&&GL.lunaCar.q&&!GL.lunaNew)for(var m in GL.lunaCar.q)GL.lunaCar.b[m].quaternion.copy(GL.lunaCar.q[m]);
  if(GL.lunaNew&&GL.l2Mix){GL.l2Act.stop();GL.l2Act.reset();GL.l2Act.setEffectiveWeight(1);GL.l2Act.play();GL.l2Mix.update(0.01);}
  L.position.set(sp[0],0,sp[1]);L.updateMatrixWorld(true);var mn=new T.Box3().setFromObject(L).min.y;S.lunaI=i;
  if(!GL.lunaPL){GL.lunaPL=new T.PointLight(0xf0e8ff,0,3,1.6);GL.party.add(GL.lunaPL);}GL.lunaPL.position.set(sp[0],2.1,sp[1]+0.6);GL.lunaPL.intensity=1.8;
}
function hideLunaParty(){if(GL.luna&&GL.luna.parent===GL.party){scene.add(GL.luna);GL.luna.visible=false;lunaShow(false);}if(GL.lunaPL)GL.lunaPL.intensity=0;}
function nextPartyLoop(delay){
  after(delay||4,function(){S.busy=true;fadeTo(1,1.0,function(){if(GL.hol){GL.hol.visible=false;GL.holLight.intensity=0;}enterParty(S.loop+1);fadeTo(0,1.2,function(){S.busy=false;});});});
}
var _pv=new T.Vector3();
function partyTick(dt){
  partyMusicTick();castTick(dt);
  var Pg=GL.party,L=S.loop,px=P.x-PO.x,pz=P.z-PO.z,beat=AU.party&&ac?((ac.currentTime*118/60)%1):((time*118/60)%1),pulse=Math.pow(1-beat,3);
  /* lights sweep with the music */
  if(L<=2)GL.pSpots.forEach(function(e,i){var a=time*(0.5+i*0.17)+e.ph;e.t.position.set(Math.sin(a)*3.5,0,Math.cos(a*1.3)*2.8);e.l.intensity=(L===2?2.2:3.2)+2.0*pulse;});
  GL.pBall.rotation.y+=dt*0.6;GL.pGlints.forEach(function(g,i){var a=g.a+time*0.6;g.s.position.set(Math.cos(a)*PW*0.9,PH/2+g.e,Math.sin(a)*PD*0.9);});
  /* the crowd dances; in the silence they stop and watch him */
  var watch=L===2?ss(0,2.5,4-(S.muteT||0)):0;
  GL.crowd.forEach(function(d,i){if(!d.visible)return;var u=d.userData,ph=time*2*Math.PI*118/60*0.5*u.sp+u.ph,k=(L===1||L===2)?(1-watch):0.2;
    u.body.position.y=Math.abs(Math.sin(ph))*0.06*k;u.body.rotation.z=Math.sin(ph*0.5)*0.12*k*u.amp;
    u.arms[0].rotation.z=-0.3-Math.max(0,Math.sin(ph))*1.9*k*u.amp;u.arms[1].rotation.z=0.3+Math.max(0,Math.sin(ph+1.6))*1.9*k*u.amp;
    if(L===1){d.rotation.y=u.yaw+Math.sin(time*0.3+i)*0.5;}
    if(watch>0||L===4){var tgt=Math.atan2(px-d.position.x,pz-d.position.z);d.rotation.y+=Math.atan2(Math.sin(tgt-d.rotation.y),Math.cos(tgt-d.rotation.y))*Math.min(1,dt*1.2*Math.max(watch,0.3));}});
  if(GL.gothWatch&&GL.gothWatch.visible){var gw=GL.gothWatch,ty=Math.atan2(px-gw.position.x,pz-gw.position.z);gw.rotation.y+=Math.atan2(Math.sin(ty-gw.rotation.y),Math.cos(ty-gw.rotation.y))*Math.min(1,dt*0.8);}
  /* 1: she is always just ahead, in the crowd */
  if(L===1&&!S.trig&&GL.luna&&GL.luna.visible){var sp=GL.lunaSpots[S.lunaI],dd=Math.hypot(px-sp[0],pz-sp[1]);
    if(GL.lunaNew){lunaSearchTick(dt);dd=Math.hypot(px-GL.luna.position.x,pz-GL.luna.position.z);}else{lunaAnim(dt,true);GL.luna.rotation.y=Math.atan2(px-sp[0],pz-sp[1])+Math.PI*0.85;}
    if(dd<2.1){S.ls=null;sWhoosh(0.5);GL.luna.visible=false;GL.lunaPL.intensity=0;
      if(S.lunaI<2){var nx=S.lunaI+1;after(1.4,function(){placeLunaParty(nx);});}
      else{S.trig=true;hideLunaParty();vo('p1',5000,0);nextPartyLoop(5.5);}}}
  /* 2: the music drops away; everyone turns to watch; the door at the end of the hallway */
  if(L===2){S.muteT=Math.max(0,(S.muteT||0)-dt);if(AU.party&&S.muteT<3.5&&!S.muted){S.muted=true;AU.party.f.frequency.setTargetAtTime(220,ac.currentTime,0.6);AU.party.g.gain.setTargetAtTime(0.25,ac.currentTime,1.2);}
    if(!S.trig&&pz<-PD-HL+1.6){S.trig=true;sClick(3);after(0.6,function(){girlLaugh();});after(1.4,function(){hint(tx('someone'),2400);vo('p2',5000,1);});nextPartyLoop(6);}}
  else S.muted=false;
  /* 3: strobe. Each flash he is closer. Don't look at him. Get to the hallway. */
  if(L===3&&GL.hol){S.strobeT-=dt;GL.pStrobe.intensity=Math.max(0,GL.pStrobe.intensity-dt*90);
    if(!S.hp){S.hp=new T.Vector3(-3.2,0,-2.6);}
    if(S.strobeT<=0&&!S.trig){S.strobeT=0.7+Math.random()*0.6;GL.pStrobe.intensity=9;noiseBurst(0.05,3000,0.7,0.25,true);
      var dx=px-S.hp.x,dz=pz-S.hp.z,dl=Math.hypot(dx,dz)||1,step=Math.min(dl-0.6,0.6);S.hp.x+=dx/dl*step;S.hp.z+=dz/dl*step;
      GL.hol.visible=true;holUse(step>0.3?'walk':'idleA');GL.hol.position.set(PO.x+S.hp.x,0,PO.z+S.hp.z);GL.hol.rotation.y=Math.atan2(dx,dz);
      GL.crowd.forEach(function(d){var u=d.userData;d.position.set(u.home.x+(Math.random()-0.5)*1.2,0,u.home.z+(Math.random()-0.5)*1.2);d.rotation.y=Math.random()*6.3;});
      if(dl<1.25){S.ring=1.1;}}
    var lk=lookingAt(_pv.set(GL.hol.position.x,1.6,GL.hol.position.z),12,0.75);if(lk&&GL.pStrobe.intensity>0.5){S.ringSrc=true;S.ring=Math.min(1.2,S.ring+dt*1.4);}
    if(!S.trig&&pz<-PD-0.5){S.trig=true;GL.hol.visible=false;vo('p3',4500,2);nextPartyLoop(5);}}
  /* 4: silence, the red light under the door; her voice behind it. Close your eyes and it opens. */
  if(L===4){GL.pHall.intensity=1.0+0.25*Math.sin(time*2.3);S.mockT-=dt;if(S.mockT<=0&&!S.pDoorOpen){S.mockT=7;girlLaugh();}
    var nearDoor=pz<-PD-HL+2.2;
    if(nearDoor&&!S.pDoorOpen){if(S.eyes>0.85){S.eyesAcc+=dt;if(S.eyesAcc>3.2)openPartyDoor();}}
    if(S.kiss>=0)kissTick(dt);}
  if(GL.dcMix&&GL.kissRoom.visible){GL.dcMix.update(dt);if(GL.goth)gothFollow();}
  if(AU.party&&ac&&L===4&&!S.pDoorOpen){var dd2=Math.max(0,pz-(-PD-HL));AU.party.g.gain.setTargetAtTime(0.06+0.22*(1-Math.min(1,dd2/6)),ac.currentTime,0.3);}
}
function girlLaugh(){if(!ac)return;try{var t=ac.currentTime;for(var i=0;i<5;i++){var o=ac.createOscillator(),g=ac.createGain(),f=ac.createBiquadFilter();o.type='sawtooth';var f0=420+Math.random()*60;o.frequency.setValueAtTime(f0,t+i*0.16);o.frequency.exponentialRampToValueAtTime(f0*0.82,t+i*0.16+0.12);f.type='bandpass';f.frequency.value=1100;f.Q.value=2;g.gain.setValueAtTime(0.0001,t+i*0.16);g.gain.exponentialRampToValueAtTime(0.05*(1-i*0.15),t+i*0.16+0.02);g.gain.exponentialRampToValueAtTime(0.0001,t+i*0.16+0.13);o.connect(f);f.connect(g);g.connect(AU.sfx);g.connect(AU.send);o.start(t+i*0.16);o.stop(t+i*0.16+0.15);}}catch(e){}}
/* the truth: the door opens on him kissing someone else; he turns, and Luna is standing in the hallway behind him */
function openPartyDoor(){
  S.pDoorOpen=true;S.busy=true;S.lockInput=true;S.kiss=0;sCreak();GL.pDoor.want=1.5;GL.kissRoom.visible=true;GL.kissL.intensity=2.8;
  if(AU.party){AU.party.f.frequency.setTargetAtTime(16000,ac.currentTime,0.05);AU.party.g.gain.setTargetAtTime(0.75,ac.currentTime,0.05);}
  S.kiss0={yaw:P.yaw,x:P.x,z:P.z};
  /* pose the two of them close, heads together */
  loadDamianClips();var dm=GL.dClone,gi=GL.goth?GL.goth.g:GL.girl;if(GL.dcMix){if(GL.goth)gothFollow();}else if(GL.goth)gothPose(GL.goth,'kiss');try{var f=dm.getObjectByName&&dm.getObjectByName('mixamorigLeftArm');if(f){var B=GL.kissRoom;scene.updateMatrixWorld(true);
      var waist=gi.localToWorld(new T.Vector3(0.14,0.98,-0.06)),back=gi.localToWorld(new T.Vector3(-0.12,1.15,-0.1));
      aimBone(dm.getObjectByName('mixamorigLeftArm'),dm.getObjectByName('mixamorigLeftForeArm'),waist.clone().add(new T.Vector3(0,0.05,0)).lerp(dm.localToWorld(new T.Vector3(0.25,1.15,0.1)),0.5));aimBone(dm.getObjectByName('mixamorigLeftForeArm'),dm.getObjectByName('mixamorigLeftHand'),waist);
      aimBone(dm.getObjectByName('mixamorigRightArm'),dm.getObjectByName('mixamorigRightForeArm'),back.clone().lerp(dm.localToWorld(new T.Vector3(-0.25,1.1,0.1)),0.5));aimBone(dm.getObjectByName('mixamorigRightForeArm'),dm.getObjectByName('mixamorigRightHand'),back);
      var hd=dm.getObjectByName('mixamorigHead'),nk=dm.getObjectByName('mixamorigNeck');if(hd&&nk)aimBone(nk,hd,gi.localToWorld(new T.Vector3(0,1.7,0.05)));}}catch(e){}
  if(gi.userData&&gi.userData.arms){gi.userData.arms[0].rotation.set(-1.2,0,-0.6);gi.userData.arms[1].rotation.set(-1.2,0,0.6);gi.userData.head.rotation.set(0.2,0,0);}
}
function kissTick(dt){
  S.kiss+=dt;var k=S.kiss,dp=GL.pDoorPos;
  /* step into the doorway */
  var u=ss(0.2,1.6,k);P.x=S.kiss0.x+(dp.x-S.kiss0.x)*u;P.z=S.kiss0.z+(dp.z+0.7-S.kiss0.z)*u;P.spd=u<1?0.6:0;
  var ty=Math.PI;if(k<5.2){P.yaw+=Math.atan2(Math.sin(ty-P.yaw),Math.cos(ty-P.yaw))*Math.min(1,dt*3);P.pitch+=(-0.06-P.pitch)*Math.min(1,dt*2);}
  GL.kissL.intensity=2.8+Math.sin(time*13)*0.25;
  /* he turns round */
  if(k>5.2){var tu=ss(5.2,6.6,k);P.yaw=Math.PI+tu*Math.PI;if(!S.lunaBack&&GL.luna){S.lunaBack=1;placeLunaParty(2);var L=GL.luna;L.position.set(0,0,-PD-HL+2.6);L.rotation.y=Math.PI;GL.lunaPL.position.set(0.2,2.0,-PD-HL+1.9);GL.lunaPL.intensity=1.6;
      if(AU.party)AU.party.g.gain.setTargetAtTime(0,ac.currentTime,0.08);sBoom(0.5);}}
  if(k>6.6&&k<9.6&&GL.luna){lunaAnim(dt,false);GL.luna.rotation.y=Math.PI;}
  if(k>9.6&&!S.pEnd){S.pEnd=true;whiteout(function(){S.partyDone=true;S.lunaBack=0;S.pEnd=false;S.kiss=-1;S.lockInput=false;hideLunaParty();partyAudio(false);GL.kissRoom.visible=false;toHub(true);});}
}
/* ---------- areas and transitions ---------- */
function fadeTo(v,dur,cb){S.fadeFrom=S.fade;S.fadeTo=v;S.fadeT=0;S.fadeDur=dur||0.6;S.fadeCb=cb||null;}
function setArea(a){if(a!=='car'&&GL.lunaCar&&GL.lunaCar.on)lunaSeat(false);
  P.area=a;heroSync();GL.hub.visible=a==='hub';GL.room.visible=a==='room';if(GL.car)GL.car.visible=a==='car';if(GL.party)GL.party.visible=a==='party';if(a!=='party'){partyAudio(false);if(GL.luna&&GL.luna.parent===GL.party)hideLunaParty();}scene.fog=a==='car'&&GL.road?GL.carFog:null;if(a!=='car'){if(GL.hol){GL.hol.scale.setScalar(HOLS);GL.hol.rotation.x=0;}S.camDY=0;if(GL.fpOn&&!S.revealing)fpHands(0,0,0,0);carAudio(false);if(S.dmUse==='Driving')dmStop();}
  if(AU.wetHub&&ac){AU.wetHub.gain.setTargetAtTime(a==='hub'?0.7:0,ac.currentTime,0.05);AU.wetRoom.gain.setTargetAtTime(a==='room'?0.45:a==='car'?0.18:a==='party'?0.55:0,ac.currentTime,0.05);}
}
function goRoom(loop){
  if(S.busy)return;loadRoadModels();loadLuna2();S.busy=true;sCreak();GL.dBed.want=1.2;
  after(0.5,function(){fadeTo(1,0.6,function(){enterRoom(loop);fadeTo(0,0.9,function(){S.busy=false;});});});
}
function enterRoom(loop){
  setArea('room');S.loop=loop;S.trig=false;S.exitOpen=false;S.lookT=0;S.holSeen=false;S.holMirror=false;S.failArmed=false;S.eyesAcc=0;S.mockT=1.5;S.bathOpen=false;S.neckTaken=false;S.ring=Math.min(S.ring,0.2);
  P.x=RO.x;P.z=RO.z+1.95;P.yaw=Math.PI;P.pitch=-0.05;
  GL.dExit.open=GL.dExit.want=0;
  GL.brush.visible=true;GL.bristleM.emissive.setHex(0);GL.drips.visible=loop>=3;
  GL.wallM.map=loop>=3?GL.wallTex2:GL.wallTex;GL.wallM.needsUpdate=true;
  GL.photo.material.map=loop>=3?GL.photoTex2:GL.photoTex;GL.photo.material.needsUpdate=true;
  GL.bedForm.visible=loop===3;GL.sheetM.color.setHex(loop>=3?0xb9b6ae:0xd8d2c6);
  GL.lamp.color.setHex(loop>=3?0x9fb4ff:0xffa860);GL.shadeM.emissive.setHex(loop>=3?0x6f88c0:0xffb066);
  GL.lamp.intensity=loop===4?0:2.0;GL.shadeM.emissiveIntensity=loop===4?0:0.9;GL.roomFill.intensity=loop===4?0.18:0;
  GL.roomAmb.intensity=loop===4?0.06:loop===3?0.28:0.4;GL.vanL.intensity=loop===4?0:1.3;GL.vanL.color.setHex(loop===3?0xb8c8ff:0xffa660);
  GL.bath.visible=loop<4;GL.dBath.open=GL.dBath.want=loop<4?1.35:0;GL.moon.intensity=loop<4?2.2:0;GL.bathFill.intensity=loop<4?0.3:0;GL.slide.visible=loop<4;GL.neck.visible=loop===4;GL.bulbM.emissiveIntensity=loop===4?0:1.4;
  GL.dBath.strip.material.opacity=loop===4?0.5:0;GL.dBath.light.intensity=loop===4?0.6:0;
  if(GL.hol){GL.hol.visible=false;GL.holLight.intensity=0;}
  if(ac&&AU.buzz)AU.buzz.gain.setTargetAtTime(loop===4?0:0.012,ac.currentTime,0.2);
  if(loop===1||loop===3)after(2,function(){hint(tx('mirror'),2400);});
  if(loop===2)after(2,function(){hint(tx('brush'),2400);});
  if(loop===4)after(1.5,function(){hint(tx('eyes').replace('{k}',eyesKey()),4200);});
}
function unlockExit(delay){after(delay||0.5,function(){S.exitOpen=true;sClick(1);noiseBurst(0.2,900,1,0.18,true);hint(tx('door'),2200);});}
function exitRoom(){
  if(S.busy)return;
  if(!S.exitOpen){sClick(3);hint(tx('locked'),1800);return;}
  S.busy=true;sCreak();GL.dExit.want=1.3;
  var next=S.loop+1;
  after(0.45,function(){fadeTo(1,0.6,function(){
    if(S.loop===3&&S.holSeen)vo('v3',5200,2);
    S.holMirror=false;if(GL.hol){GL.hol.visible=false;GL.holLight.intensity=0;}
    enterRoom(next);fadeTo(0,0.9,function(){S.busy=false;});});});
}
function takeNecklace(){
  S.neckTaken=true;GL.neck.visible=false;S.busy=true;noiseBurst(0.15,3200,2,0.3,true);sChime();
  vo('v5',6500,4);S.ringLock=true;
  /* the ringing swallows everything and throws him back into the dark */
  var t0=0;S.ringRamp=1;
  after(4.2,function(){whiteout(function(){S.roomDone=true;S.ringRamp=0;S.ringLock=false;S.ring=0;toHub(true);});});
}
function toHub(after2){
  setArea('hub');P.x=0;P.z=7;P.yaw=Math.PI;P.pitch=-0.02;GL.dBed.open=GL.dBed.want=0;GL.dCar.open=GL.dCar.want=0;GL.dParty.open=GL.dParty.want=0;
  S.hubT=0;S.hol.d=9;S.hol.on=false;S.hol.cool=after2?999:14;S.busy=false;
  if(after2){GL.dBed.light.intensity=0;GL.dBed.strip.material.opacity=0;
    if(S.carDone){GL.dCar.light.intensity=0;GL.dCar.strip.material.opacity=0;}
    if(S.partyDone){GL.spot.intensity=6.5;if(GL.dParty.light)GL.dParty.strip.material.opacity=0;after(2.5,function(){hint(tx('veil'),3000);});}
    else after(2.5,function(){hint(tx('nextDoor'),3000);});}
}
function whiteout(cb){
  if(S.white)return;S.white=1;sWhoosh(0.5);
  UI.lbWhite.style.transition='opacity .35s';UI.lbWhite.style.opacity='1';
  after(0.55,function(){sBoom(0.6);fadeTo(1,0.01);UI.lbWhite.style.transition='opacity .9s';UI.lbWhite.style.opacity='0';
    after(0.6,function(){if(cb)cb();S.white=0;S.ring=0;after(0.8,function(){fadeTo(0,1.4);});});});
}
function fail(){
  /* the ringing wins: start this moment over */
  S.ring=0;S.busy=true;
  whiteout(function(){if(P.area==='room'){enterRoom(S.loop);}else if(P.area==='car'){enterCar(S.loop);}else if(P.area==='party'){enterParty(S.loop);}else{toHub(S.roomDone);}S.busy=false;});
}

/* ---------- the reveal (end of the slice) ---------- */
function reveal(){
  if(S.revealing)return;S.revealing=true;S.busy=true;S.lockInput=true;
  var dx=P.x,dz=P.z+5,dl=Math.hypot(dx,dz)||1;
  var r={t:0,sx:P.x,sz:P.z,ax:dx/dl,az:dz/dl};r.tx=r.ax*0.9;r.tz=-5+r.az*0.9;S.rv=r;
  noiseBurst(1.0,500,0.6,0.12,true,0.6);
}
function revealTick(dt){
  var r=S.rv;if(!r)return;r.t+=dt;var t=r.t;
  /* 1. he walks up to her and reaches for the veil */
  if(t<2.7){var u=ss(0,1.9,t);P.x=r.sx+(r.tx-r.sx)*u;P.z=r.sz+(r.tz-r.sz)*u;P.spd=u<1?0.9:0;
    var ty=Math.atan2(0-P.x,-5-P.z);P.yaw+=Math.atan2(Math.sin(ty-P.yaw),Math.cos(ty-P.yaw))*Math.min(1,dt*3);r.yaw=P.yaw;
    P.pitch+=(-0.12-P.pitch)*Math.min(1,dt*2.5);
    if(t>0.35&&!r.s1){r.s1=1;sStep();}if(t>0.95&&!r.s2){r.s2=1;sStep();}if(t>1.55&&!r.s3){r.s3=1;sStep();}
    if(t>1.0&&!r.a){r.a=1;vo('help',4200,0);}
    fpHands(ss(0.4,1.9,t),ss(1.5,2.65,t),0.004+0.006*ss(1.5,2.6,t),0);
    GL.veil.scale.set(1,1+Math.sin(t*2.1)*0.006,1);
    GL.veil.rotation.y=Math.sin(t*7)*0.012*ss(2.0,2.6,t);
  }
  /* 2. the water takes him */
  if(t>=2.7&&!r.snap){r.snap=1;r.st=t;sBoom(1.0);noiseBurst(0.6,260,0.7,0.7,true,0.5);noiseBurst(0.35,1400,0.8,0.35,true,0.9);if(G.buzz)G.buzz([300,60,400],1);
    S.ring=0.5;armsStart();ripple(P.x,P.z,true);ripple(P.x+0.4,P.z+0.3,true);UI.lbHands.innerHTML='';}
  if(r.snap){var k=t-r.st,dd=Math.pow(ss(0.15,2.6,k),1.5)*7.5;
    P.x=r.tx+r.ax*dd;P.z=r.tz+r.az*dd;P.yaw=r.yaw;P.spd=0;
    /* yanked back and down: the head snaps, the room tilts, the surface closes over him */
    P.pitch+=((k<0.35?0.16:-0.08-0.12*ss(1.5,2.6,k))-P.pitch)*Math.min(1,dt*(k<0.35?9:3));
    S.camRoll=Math.sin(k*5.3)*0.09*(1-ss(2,3,k))+0.12*ss(0.1,0.6,k);
    S.camDY=-ss(1.1,2.5,k)*1.95;
    fpHands(1,1,0.012+0.01*Math.sin(k*30),ss(0,0.5,k));
    UI.lbHands.style.opacity=String(ss(0.2,2.2,k)*0.9);
    var under=ss(1.6,2.3,k);UI.lbDeep.style.opacity=under.toFixed(3);
    if(ac&&AU.sfx)AU.sfx.gain.setTargetAtTime(1-under*0.7,ac.currentTime,0.08);
    r.sp=(r.sp||0)-dt;if(r.sp<=0&&k<2.4){r.sp=0.22+Math.random()*0.12;ripple(P.x,P.z,true);if(under<0.5)sStep();else sDrip();}
    GL.spot.intensity=5*(1-0.5*ss(1,2.6,k));
    /* 3. nothing */
    if(k>2.75&&!r.cut){r.cut=1;S.fade=1;S.fadeDur=0;S.fadeTo=1;UI.lbFade.style.opacity='1';fpHands(0,0,0,0);armsHide();
      if(ac){var n=ac.currentTime;if(AU.sfx){AU.sfx.gain.cancelScheduledValues(n);AU.sfx.gain.setValueAtTime(0,n);}if(AU.drone){AU.drone.gain.cancelScheduledValues(n);AU.drone.gain.setValueAtTime(0,n);}if(AU.ring)AU.ring.gain.setValueAtTime(0,n);}
      S.ringLock=true;S.ring=0;}
    if(k>6.0&&!r.e){r.e=1;UI.lbDeep.style.opacity='0';showEnd();}
  }
}
function showEnd(){
  var e=UI.lbEnd;e.querySelector('.eb').textContent=tx('endB');e.querySelector('h2').textContent=tx('endA');e.querySelector('p').textContent=tx('endC');
  e.querySelector('#lbAgain').textContent=tx('again');e.querySelector('#lbMenu').textContent=tx('menu');e.style.display='flex';
  try{if(document.pointerLockElement)document.exitPointerLock();}catch(er){}
  if(ac&&AU.sfx){AU.sfx.gain.setTargetAtTime(1,ac.currentTime,0.5);}
  sDrip();after(1.6,sDrip);after(3.1,sDrip);
  try{localStorage.setItem('nihdo_p2_bed','1');localStorage.setItem('nihdo_p2_car','1');localStorage.setItem('nihdo_p2_party','1');}catch(er){}
}

/* ---------- per-frame ---------- */
var _v=new T.Vector3(),_d=new T.Vector3();
function lookingAt(p,maxD,minDot){_v.copy(p).sub(cam.position);var d=_v.length();if(d>maxD)return 0;_v.normalize();cam.getWorldDirection(_d);var dot=_v.dot(_d);return dot>minDot?dot:0;}
function walkable(x,z){
  if(P.area==='hub'){if(Math.hypot(x,z+3)>15)return false;
    var ds=[GL.dBed,GL.dCar,GL.dParty];for(var i=0;i<ds.length;i++){var g=ds[i].g.position;if(Math.hypot(x-g.x,z-g.z)<0.7)return false;}
    if(!S.revealing&&Math.hypot(x,z+5)<0.85)return false;return true;}
  if(P.area==='party'){var qx=x-PO.x,qz=z-PO.z,rr=0.25;var inR=qx>-PW+rr&&qx<PW-rr&&qz>-PD+rr&&qz<PD-rr,inH=qx>-HW+rr&&qx<HW-rr&&qz>-PD-HL+0.45&&qz<-PD+0.6;if(!(inR||inH))return false;
    for(var pb=0;pb<GL.pBlocks.length;pb++){var B2=GL.pBlocks[pb];if(qx>B2[0]-rr&&qx<B2[1]+rr&&qz>B2[2]-rr&&qz<B2[3]+rr)return false;}return true;}
  var lx=x-RO.x,lz=z-RO.z,r=0.25;
  var inRoom=lx>-2+r&&lx<2-r&&lz>-2.5+r&&lz<2.5-r,bb=GL.bathBox,inBath=(S.loop<4||S.bathOpen)&&lx>bb[0]+r&&lx<bb[1]-r&&lz>bb[2]+r&&lz<bb[3]+r,inDoor=(S.loop<4||S.bathOpen)&&lx>0.62&&lx<1.38&&lz>-2.9&&lz<-2.1;
  if(!(inRoom||inBath||inDoor))return false;
  var blocks=[[-2,0.32,-1.15,0.62],[-2,-0.12,-2.5,-1.2]];
  if(inBath&&!inRoom){blocks=GL.bathBlocks.slice();if(S.loop<4)blocks.push(GL.bathShut);}
  for(var j=0;j<blocks.length;j++){var b=blocks[j];if(lx>b[0]-r&&lx<b[1]+r&&lz>b[2]-r&&lz<b[3]+r)return false;}
  return true;
}
L.frame=function(dt){
  if(!L.ready)return;
  time+=dt;S.t+=dt;
  for(var i=timers.length-1;i>=0;i--){timers[i].t-=dt;if(timers[i].t<=0){var f=timers[i].fn;timers.splice(i,1);try{f();}catch(e){console.warn(e);}}}
  /* fades */
  if(S.fadeTo!==undefined&&S.fadeDur){S.fadeT+=dt;var u=Math.min(1,S.fadeT/S.fadeDur);S.fade=S.fadeFrom+(S.fadeTo-S.fadeFrom)*u;if(u>=1){S.fadeDur=0;var cb=S.fadeCb;S.fadeCb=null;if(cb)cb();}}
  UI.lbFade.style.opacity=S.fade.toFixed(3);
  /* move */
  var K=G.keys(),fwd=0,str=0;
  if(!S.lockInput&&!S.busy){
    if(K.KeyW||K.ArrowUp)fwd+=1;if(K.KeyS||K.ArrowDown)fwd-=1;if(K.KeyD||K.ArrowRight)str+=1;if(K.KeyA||K.ArrowLeft)str-=1;
    fwd+=-(G.joy.y||0)-(G.GP.my||0);str+=(G.joy.x||0)+(G.GP.mx||0);
  }
  var len=Math.hypot(fwd,str);if(len>1){fwd/=len;str/=len;len=1;}
  var eyesHeld=!S.lockInput&&(K.KeyF||K.KeyC||S.eyesTouch||S.eyesPad);
  /* lids: quick to close, slow and heavy to open */
  var eT=eyesHeld?1:0;S.eyes+=(eT-S.eyes)*Math.min(1,dt*(eT>S.eyes?8.5:3.6));
  var sp=P.area==='car'?0:(K.ShiftLeft||K.ShiftRight?1.4:1.0)*len*(1-0.65*S.eyes);
  var fx=Math.sin(P.yaw),fz=Math.cos(P.yaw),rx=-Math.cos(P.yaw),rz=Math.sin(P.yaw);
  var vx=(fx*fwd+rx*str),vz=(fz*fwd+rz*str),vl=Math.hypot(vx,vz)||1;vx=vx/vl*sp;vz=vz/vl*sp;
  var nx=P.x+vx*dt,nz=P.z+vz*dt;
  if(walkable(nx,P.z))P.x=nx;if(walkable(P.x,nz))P.z=nz;
  P.spd+=(sp-P.spd)*Math.min(1,dt*8);
  if(P.spd>0.2){P.phase+=dt*P.spd*5.2;P.stepAcc+=P.spd*dt;if(P.stepAcc>0.6){P.stepAcc=0;sStep();}}
  /* camera */
  var bob=Math.sin(P.phase)*0.028*Math.min(1,P.spd/1.3);
  cam.position.set(P.x,EYE+bob+(S.camDY||0),P.z);cam.rotation.set(P.pitch,P.yaw+Math.PI,Math.sin(P.phase*0.5)*0.006*Math.min(1,P.spd/1.3)+(S.camRoll||0));
  var baseF=57+((G.CAM.fov||62)-62)*0.6;if(Math.abs(cam.fov-baseF)>0.05){cam.fov=baseF;cam.updateProjectionMatrix();}
  GL.near.position.set(P.x,1.5,P.z);GL.near.intensity=P.area==='hub'?0.35:P.area==='car'?0.06:0.25;
  /* Damian's body (only the mirror sees it) */
  if(S.fpOpen>0){S.fpOpen-=dt;fpBody(0.16,0.06);if(S.fpOpen<=0){fpBodyOff();if(S.dmUse==='Opening')dmStop();}}
  if(!GL.fpOn){GL.hero.position.set(P.x,0,P.z);GL.hero.rotation.y=P.yaw;}
  var DD=DM();if(DD&&DD.mixer&&DD.acts){var A=DD.acts,wk=S.dmUse?0:Math.min(1,P.spd/1.2);if(A.idle)A.idle.setEffectiveWeight(S.dmUse?0:1-wk);if(A.walk){A.walk.setEffectiveWeight(wk);A.walk.timeScale=Math.max(0.6,P.spd/0.95);}if(A.run)A.run.setEffectiveWeight(0);DD.mixer.update(dt);}
  if(GL.hol&&G.hol.mixer&&(GL.hol.visible||S.holMirror)){G.hol.mixer.update(dt);}
  /* doors swing */
  [GL.dBed,GL.dCar,GL.dParty,GL.pDoor,GL.dExit,GL.dBath].forEach(function(d){d.open+=(d.want-d.open)*Math.min(1,dt*2.5);d.piv.rotation.y=-d.open;});
  var fl=0.5+0.5*Math.sin(time*31)*Math.sin(time*7.3);
  if(GL.dParty.light){GL.dParty.light.intensity=S.partyDone?0:S.carDone?(0.5+0.8*fl):0.3+0.5*fl;GL.dParty.strip.material.opacity=S.partyDone?0:S.carDone?0.7:0.4;}
  if(!S.revealing)GL.veil.rotation.y=Math.sin(time*0.3)*0.04;
  /* the area's own logic */
  if(!GL.hol)adoptHollow();
  if(P.area==='hub')hubTick(dt);else if(P.area==='car')carTick(dt);else if(P.area==='party')partyTick(dt);else roomTick(dt);
  if(S.revealing)revealTick(dt);
  breathTick(dt);
  rippleTick(dt);
  if(S.revealing)armsTick(dt);
  /* ringing and closed eyes */
  if(S.ringRamp)S.ring=Math.min(1.2,S.ring+dt*0.28);
  if(S.eyes>0.85&&!S.ringLock)S.ring=Math.max(0,S.ring-dt*0.35);
  if(!S.ringRamp&&!S.ringSrc)S.ring=Math.max(0,S.ring-dt*0.08);
  S.ringSrc=false;
  if(S.ring>=1&&!S.ringLock&&!S.white&&!S.busy)fail();
  var rv=Math.min(1,S.ring);
  UI.lbRing.style.opacity=(Math.pow(rv,1.6)*0.85).toFixed(3);
  if(ac&&AU.ring)AU.ring.gain.setTargetAtTime(Math.pow(rv,2)*0.16,ac.currentTime,0.05);
  /* the eye: an almond opening that narrows; the upper lid leads and drops the centre of the opening, lashes blur its edge, they tremble when he strains */
  var ee=S.eyes,eu=ee<0.001?0:1-Math.pow(1-ee,2.2),tw=ee>0.6?Math.sin(time*27)*0.01*(0.3+S.ring)+Math.sin(time*11.3)*0.005:0;
  if(eu<=0.001){UI.lbLidT.style.display='none';}
  else{UI.lbLidT.style.display='block';
    var ry=Math.max(0,90*(1-eu)+tw*90),rx=95-30*eu,cy=50+9*eu,soft=Math.max(2,10-6*eu);
    UI.lbLidT.style.background=ry<0.4?'#000':'radial-gradient(ellipse '+rx.toFixed(1)+'% '+ry.toFixed(2)+'% at 50% '+cy.toFixed(1)+'%,rgba(0,0,0,0) 0%,rgba(0,0,0,0) '+(100-soft*2).toFixed(1)+'%,rgba(8,2,2,.85) '+(100-soft*0.6).toFixed(1)+'%,#000 100%)';}
  UI.lbLidG.style.opacity=(Math.pow(ee,6)*(0.75+0.25*Math.sin(time*5.2))).toFixed(3);
  S.lidBlur=eu;
  /* what you're looking at */
  var best=null,bd=0;
  if(!S.busy&&!S.lockInput)inter.forEach(function(it){if(it.area!==P.area)return;if(it.when&&!it.when())return;var dd=lookingAt(it.pos(),it.r,0.9);if(dd>bd){bd=dd;best=it;}});
  curInter=best;
  UI.lbPrompt.style.opacity=best?'1':'0';if(best){var k=keyName();UI.lbPrompt.textContent=(k?k+' · ':'')+tx(best.label);}
  var tch=G.touch();UI.lbAct.style.display=tch&&best?'block':'none';UI.lbEyes.style.display=tch&&!S.lockInput?'block':'none';UI.lbAct.textContent=best?tx(best.label):'';
  UI.lbDot.style.opacity=S.lockInput?'0':'1';
  /* render */
  var comp=G.comp(),gp=G.grade();
  if(gp){gp.uniforms.time.value=time;gp.uniforms.danger.value=Math.max(0,rv*0.7);gp.uniforms.focus.value.set(0.5,0.5);gp.uniforms.dofAmt.value=0.25+(S.lidBlur||0)*1.6;gp.uniforms.lens.value=1+rv*1.4;}
  if(window.__noRender)return;
  if(comp){comp.render(dt);}else R.render(scene,cam);
};
function hubTick(dt){
  S.hubT+=dt;
  GL.dBed.light.intensity=S.roomDone?0:0.5+0.15*Math.sin(time*1.7);
  GL.dCar.light.intensity=S.carDone?0:S.roomDone?0.55+0.35*Math.sin(time*2.4):0.25;GL.dCar.strip.material.opacity=S.carDone?0:S.roomDone?0.6:0.3;
  if(S.revealing)return;
  /* Hollow stands behind you in the dark. Look at him and the ringing comes; each time he comes back closer. */
  var h=S.hol;if(!GL.hol)return;
  if(!h.on){h.cool-=dt;if(h.cool<=0&&S.hubT>10){h.on=true;h.d=Math.max(3.2,h.d);var bx=P.x-Math.sin(P.yaw)*h.d,bz=P.z-Math.cos(P.yaw)*h.d;
      GL.hol.position.set(bx,0,bz);GL.hol.visible=true;holUse(Math.random()<0.5?'idleA':'idleB');GL.holLight.intensity=0.35;GL.holLight.position.set(bx,2.3,bz);if(!h.told){h.told=true;after(0.8,function(){hint(tx('dontLook'),3200);});}
      noiseBurst(0.6,300,0.5,0.25,true,0.6);}
    return;}
  GL.hol.rotation.y=Math.atan2(P.x-GL.hol.position.x,P.z-GL.hol.position.z);
  var lk=lookingAt(_v.set(GL.hol.position.x,1.6,GL.hol.position.z),30,0.7);
  if(lk){S.ringSrc=true;S.ring=Math.min(1.2,S.ring+dt*0.55);h.seen=(h.seen||0)+dt;
    if(h.seen>1.3){h.on=false;h.seen=0;GL.hol.visible=false;GL.holLight.intensity=0;h.d-=1.6;h.cool=4+Math.random()*4;noiseBurst(0.3,200,0.6,0.35,true);
      if(h.d<2.6){h.d=9;S.ring=1.05;}}}
  else h.seen=Math.max(0,(h.seen||0)-dt*0.5);
}
function roomTick(dt){
  var L4=S.loop===4;
  /* lamp flicker from the second visit on */
  if(S.loop===2||S.loop===3){var f=Math.random()<0.04?0.15:1;GL.lamp.intensity=2.0*f;GL.vanL.intensity=1.3*f;GL.shadeM.emissiveIntensity=0.9*f;if(ac&&AU.buzz)AU.buzz.gain.setTargetAtTime(0.012*f,ac.currentTime,0.02);}
  if(S.loop===2&&!S.trig){var gl2=0.22+0.18*Math.sin(time*3);GL.bristleM.emissive.setRGB(gl2,0.0,0.01);}
  var mlook=lookingAt(GL.mirrorPos,3.2,0.88);
  if(S.loop===1&&!S.trig){if(mlook){S.lookT+=dt;if(S.lookT>1.4){S.trig=true;vo('v1',5000,0);unlockExit(2.5);}}}
  /* third visit: someone stands behind you in the mirror. Get to the door without looking back. */
  if(S.loop===3&&GL.hol){
    if(!S.holSeen&&mlook&&!S.busy){S.lookT+=dt;if(S.lookT>0.6){S.holSeen=true;S.holMirror=true;holUse('idleB');
        /* over his left shoulder, a step behind: clear of his head in the reflection */
        var bb=GL.bathBox,hx=clamp(P.x-1.75,RO.x+bb[0]+0.6,RO.x+bb[1]-0.6),hz=clamp(P.z-0.7,RO.z+bb[2]+0.3,RO.z+bb[3]-0.3);GL.hol.position.set(hx,0,hz);
        GL.holLight.color.setHex(0x9fb6ff);GL.holLight.position.set(hx+0.7,1.7,hz+0.1);GL.holLight.distance=3;GL.holLight.intensity=2.2;
        GL.hol.rotation.y=Math.atan2(P.x-hx,P.z-GL.hol.position.z);sBoom(0.35);hint(tx('dontLook'),3600);S.exitOpen=true;sClick(1);}}
    if(S.holSeen&&!S.busy){GL.hol.rotation.y=Math.atan2(P.x-GL.hol.position.x,P.z-GL.hol.position.z);S.ring=Math.min(1,S.ring+dt*0.05);S.ringSrc=true;
      if(lookingAt(_v.set(GL.hol.position.x,1.5,GL.hol.position.z),8,0.55)){
        /* you looked: he's really there, for an instant */
        GL.hol.visible=true;GL.holLight.position.set(GL.hol.position.x,2,GL.hol.position.z+0.4);GL.holLight.intensity=1.2;sBoom(0.9);if(G.buzz)G.buzz([200,60,200],1);
        S.holMirror=false;after(0.25,function(){GL.hol.visible=false;GL.holLight.intensity=0;S.ring=1.1;});S.busy=true;after(0.3,function(){S.busy=false;});}}
  }
  /* fourth visit: the dark, her voice, the ringing. Close your eyes until it passes. */
  if(L4){
    S.mockT-=dt;if(S.mockT<=0&&!S.bathOpen){S.mockT=5.5;vo('mock',3000,3);}
    if(!S.bathOpen){S.ring=Math.min(1.2,S.ring+dt*0.12);S.ringSrc=true;
      if(S.eyes>0.85){S.eyesAcc+=dt;if(S.eyesAcc>4.2){S.bathOpen=true;GL.dBath.want=1.35;GL.bath.visible=true;GL.bathL.intensity=1.6;GL.bathL.color.setHex(0xffa660);GL.moon.intensity=2.2;GL.bathFill.intensity=0.35;sCreak();vo('v4',5600,1);S.dripT=1;}}}
    else{GL.bathL.intensity=Math.random()<0.03?0.35:1.6;S.dripT-=dt;if(S.dripT<=0){S.dripT=1.1+Math.random()*0.6;sDrip();}GL.water.position.y=GL.waterY+Math.sin(time*1.3)*0.0012;}
  }
}
/* Hollow's breathing: the recorded breath from the forest, placed in space (left/right, muffled with distance) */
var _bv=new T.Vector3(),_br=new T.Vector3();
function hBreath(pos,vol,heavy){
  if(!ac||!AU.sfx)return 0;
  var pan=0,lpf=6500;
  if(pos){_bv.copy(pos).sub(cam.position);var d=_bv.length()||1;_bv.normalize();_br.set(1,0,0).applyQuaternion(cam.quaternion);pan=clamp(_bv.dot(_br),-1,1)*0.85;lpf=clamp(9000-d*900,700,9000);}
  try{
    var t=ac.currentTime+0.02,B=G.breath&&G.breath(),src=ac.createBufferSource(),f=ac.createBiquadFilter(),g=ac.createGain(),pn=ac.createStereoPanner?ac.createStereoPanner():null,dur,a;
    f.type='lowpass';f.frequency.value=lpf;f.Q.value=0.5;
    if(B&&B.buf){var list=heavy?B.heavy:B.soft,seg=list[Math.floor(Math.random()*list.length)],rate=0.9+Math.random()*0.08;
      src.buffer=B.buf;src.playbackRate.value=rate;dur=seg[1]/rate;a=Math.max(0.0001,vol*(seg[2]||1));
      g.gain.setValueAtTime(0.0001,t);g.gain.exponentialRampToValueAtTime(a,t+0.08);g.gain.setValueAtTime(a,t+Math.max(0.09,dur-0.25));g.gain.exponentialRampToValueAtTime(0.0001,t+dur);
      src.start(t,seg[0],seg[1]+0.05);}
    else{/* no recording: a breath out of filtered noise */
      dur=heavy?1.6:2.2;var n=Math.floor(ac.sampleRate*dur),b=ac.createBuffer(1,n,ac.sampleRate),c=b.getChannelData(0);for(var i=0;i<n;i++)c[i]=Math.random()*2-1;
      src.buffer=b;f.type='bandpass';f.frequency.value=heavy?520:380;f.Q.value=0.8;a=Math.max(0.0001,vol*0.9);
      g.gain.setValueAtTime(0.0001,t);g.gain.linearRampToValueAtTime(a*0.7,t+dur*0.35);g.gain.linearRampToValueAtTime(0.0001,t+dur*0.45);g.gain.linearRampToValueAtTime(a,t+dur*0.6);g.gain.exponentialRampToValueAtTime(0.0001,t+dur);
      src.start(t);}
    src.connect(f);f.connect(g);if(pn){pn.pan.value=pan;g.connect(pn);pn.connect(AU.sfx);pn.connect(AU.send);}else{g.connect(AU.sfx);g.connect(AU.send);}
    return dur;
  }catch(e){return 0;}
}
var _hp=new T.Vector3();
function breathTick(dt){
  S.brT=(S.brT===undefined?3:S.brT)-dt;if(S.brT>0||S.fade>0.9)return;
  var hv=GL.hol&&GL.hol.visible,src=null,vol=0,heavy=false,gap=6;
  if(GL.hol)_hp.set(GL.hol.position.x,1.6,GL.hol.position.z);
  if(S.revealing){if(hv){var d0=_hp.distanceTo(cam.position);src=_hp;vol=clamp(1.2-d0*0.12,0.35,1);heavy=d0<4;gap=0.25;}}
  else if(P.area==='hub'){if(S.hol&&S.hol.on&&GL.hol){var d1=_hp.distanceTo(cam.position);src=_hp;vol=clamp(1-(d1-2)/12,0.15,0.9);heavy=d1<4;gap=0.5;}}
  else if(P.area==='party'){if(S.loop===3&&GL.hol&&S.hp){_hp.set(GL.hol.position.x,1.6,GL.hol.position.z);var d3=_hp.distanceTo(cam.position);src=_hp;vol=clamp(1.1-d3*0.15,0.3,1);heavy=d3<3;gap=0.3;}}
  else if(P.area==='car'){
    if(S.loop===3&&S.holSeen&&GL.hol&&!S.trig){_hp.set(GL.hol.position.x,1.5,GL.hol.position.z);var d4=_hp.distanceTo(cam.position);src=_hp;vol=clamp(1.1-d4*0.06,0.15,1);heavy=d4<4;gap=d4<4?0.3:1.2;}
    else if(S.loop===4&&!S.handOut){_hp.set(P.x+0.3,1.1,P.z+0.9);src=_hp;vol=0.4;heavy=Math.random()<0.3;gap=1.5+Math.random()*2;}
  }
  else if(P.area==='room'){
    if(S.loop===3&&S.holSeen&&GL.hol){var d2=_hp.distanceTo(cam.position);src=_hp;vol=clamp(1.1-d2*0.18,0.35,1);heavy=d2<2.2;gap=0.35;}
    else if(S.loop===4&&!S.bathOpen){/* in the dark, right behind you */_hp.set(P.x-Math.sin(P.yaw)*1.2,1.6,P.z-Math.cos(P.yaw)*1.2);src=_hp;vol=0.55;heavy=Math.random()<0.4;gap=1.2+Math.random()*1.5;}
    else if(S.loop>=2){/* far off, somewhere in the house */_hp.set(RO.x+(Math.random()-0.5)*6,1.6,RO.z+3.5);src=_hp;vol=0.16;gap=9+Math.random()*7;}
  }
  if(!src){S.brT=1;return;}
  var len=hBreath(src,vol,heavy)||2;S.brT=len+gap;
}
function interact(){if(S.busy||S.lockInput||!curInter)return;var it=curInter;curInter=null;it.use();}

/* ---------- input hooks from the main game ---------- */
L.look=function(dx,dy){if(S.lockInput||!L.ready)return;P.yaw-=dx*0.0024;P.pitch=clamp(P.pitch-dy*0.0021,-1.2,1.15);};
L.key=function(e){if(e.repeat)return;if(e.code==='KeyE'||e.code==='Enter')interact();};
L.pad=function(g,P2,dz,rdt){
  var rx=dz(g.axes[2]),ry=dz(g.axes[3]);if(rx||ry)L.look(rx*Math.abs(rx)*900*rdt*G.CAM.sens,ry*Math.abs(ry)*620*rdt*G.CAM.sens*(G.CAM.inv?-1:1));
  if(P2(0)||P2(4))interact();
  var lt=g.buttons[6],rt=g.buttons[7];S.eyesPad=!!((lt&&(lt.pressed||lt.value>0.5))||(rt&&(rt.pressed||rt.value>0.5)));
};

/* ---------- start / restart ---------- */
function resetState(){
  timers.length=0;
  S={t:0,fade:1,fadeTo:0,fadeDur:0,ring:0,eyes:0,busy:false,lockInput:false,roomDone:false,revealing:false,rv:null,white:0,
     hol:{on:false,d:9,cool:14,told:false},hubT:0,loop:0};
  GL.veil.position.set(0,0,-5);GL.veil.scale.set(1,1,1);GL.veil.material.opacity=1;
  GL.spot.color.setHex(0xf3eee4);GL.cone.material.uniforms.c.value.setHex(0xf3eee4);GL.spot.intensity=5;
  GL.dBed.light.intensity=0.5;GL.dBed.strip.material.opacity=0.55;S.carDone=false;S.partyDone=false;S.camDY=0;
  if(GL.luna){lunaShow(false);}
  if(GL.hol){GL.hol.visible=false;GL.holLight.intensity=0;}
  dmStop();S.fpOpen=0;UI.lbHands.style.opacity='0';UI.lbHands.innerHTML=handsSVG();armsHide();UI.lbDeep.style.opacity='0';fpHands(0,0,0,0);GL.veil.rotation.y=0;
  if(ac&&AU.drone){AU.drone.gain.cancelScheduledValues(ac.currentTime);AU.drone.gain.setTargetAtTime(1,ac.currentTime,0.5);}UI.lbEnd.style.display='none';UI.lbWhite.style.opacity='0';
  if(ac&&AU.sfx)AU.sfx.gain.setTargetAtTime(1,ac.currentTime,0.1);
  toHub(false);
  /* waking in the dark: only footsteps, then the light */
  S.busy=true;S.fade=1;
  after(1.2,function(){sStep();});after(1.9,function(){sStep();});
  after(2.6,function(){fadeTo(0,2.4,function(){S.busy=false;});});
  after(3.4,function(){vo('lily',6500,5);});
  after(10.5,function(){hint(tx('find'),3000);});
}
L._dbg=function(){return {handFrame:handFrame,holUse:holUse,P:P,S:S,GL:GL,cur:curInter,cam:cam,scene:scene,interact:interact,enterRoom:enterRoom,enterCar:enterCar,enterParty:enterParty,openPartyDoor:openPartyDoor,loadGoth:loadGoth,loadLuna2:loadLuna2,dmUse:dmUse,fpOpen:fpOpen,lunaSeat:lunaSeat,CAR:CAR,loadRoad:loadRoadModels,placeRoad:placeRoad,toHub:toHub,reveal:reveal,takeHand:takeHand};};
L.restart=function(){resetState();try{if(!G.touch())G.canvas.requestPointerLock();}catch(e){}};
L.init=function(api,done){
  G=api;T=G.THREE;R=G.renderer;
  try{
    uiInit();build();audioInit();
    var comp=G.comp();if(comp&&comp.passes&&comp.passes[0]){comp.passes[0].scene=scene;comp.passes[0].camera=cam;}
    var bl=G.bloom();if(bl){bl.strength=0.55;bl.threshold=0.7;}
    window.addEventListener('resize',function(){cam.aspect=window.innerWidth/window.innerHeight;cam.updateProjectionMatrix();});
    /* the forest is gone: free what it held on the graphics card */
    setTimeout(function(){try{G.scene.traverse(function(o){var keep=false;for(var q=o;q;q=q.parent){if(q===(G.hol&&G.hol.g)||q===G.hero||q===(GL.alt.pp&&GL.alt.pp.g)||q===(GL.alt.clown&&GL.alt.clown.g)||q===(GL.alt.suit&&GL.alt.suit.g)||q===(G.luna&&G.luna.g)){keep=true;break;}}if(keep)return;if(o.geometry)o.geometry.dispose();if(o.material){(Array.isArray(o.material)?o.material:[o.material]).forEach(function(m){['map','normalMap','roughnessMap','emissiveMap','alphaMap','aoMap'].forEach(function(k){if(m[k]&&m[k].dispose)m[k].dispose();});m.dispose();});}});}catch(e){console.warn('free forest',e);}},1500);
    resetState();L.ready=true;
    /* compile shaders once, behind the black */
    try{R.compile(scene,cam);}catch(e){}
  }catch(e){console.error('limbo init',e);}
  if(done)done();
};
})();
