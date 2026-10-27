/* Nothing I Haven't Dreamed Of — Part II: El Limbo (vertical slice: the hub + the bedroom memory)
   Loaded only when the player goes there. First person, no axe, no combat.
   Borrowed from the main game through window.GAME: renderer, post-processing, audio buses, Damian, Luna, Hollow. */
(function(){
'use strict';
var L={ready:false};window.LIMBO=L;
var G,T=window.THREE,R,scene,cam,ac,AU={},UI={},GL={};
var RO={x:0,z:-60};            /* the bedroom lives here, far from the hub */
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
  endA:'Continuará',endB:'Parte II · El Limbo — La habitación',endC:'Faltan dos recuerdos: el carro y la fiesta.',menu:'Menú principal',again:'Volver a jugar',
  brush:'El labial rojo',mirror:'El espejo',neck:'El collar',door:'La puerta'},
 en:{lily:'I believe the white lily appears when love goes rotten.',find:'Find the light.',dontLook:"Don't look back.",
  open:'Open',look:'Look',take:'Take',veil:'Lift the veil',locked:'Not yet.',stuck:"It won't open.",
  eyes:'Hold {k} to close your eyes',eyesK:'F',eyesP:'LT',eyesT:'the eye',
  v1:'Last night I dreamed about us.',v2:'We were running through the trees. The light came in between the pines.',v3:'You were happy. I was happy.',
  v4:'But at some point… I let go of your hand.',v5:'And when I tried to find you… you were gone.',
  mock:"Damian… don't you love me anymore?",help:'Damian… help me.',
  endA:'To be continued',endB:'Part II · Limbo — The bedroom',endC:'Two memories remain: the car and the party.',menu:'Main menu',again:'Play again',
  brush:'The red lipstick',mirror:'The mirror',neck:'The necklace',door:'The door'}};
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
/* his real arms: Damian's own model, head hidden, arms posed by aiming each bone at a target (two-bone IK) */
var _q1=new T.Quaternion(),_q2=new T.Quaternion(),_q3=new T.Quaternion(),_v1=new T.Vector3(),_v2=new T.Vector3(),_v3=new T.Vector3(),_ht=new T.Vector3(),_et=new T.Vector3();
function fbInit(){if(GL.fb!==undefined)return GL.fb;var h=GL.hero,f={};if(!h)return (GL.fb=null);
  ['LeftArm','LeftForeArm','LeftHand','RightArm','RightForeArm','RightHand','Head'].forEach(function(n){f[n]=h.getObjectByName('mixamorig'+n);});
  if(!f.LeftArm||!f.RightArm||!f.LeftForeArm||!f.RightForeArm||!f.LeftHand||!f.RightHand)return (GL.fb=null);
  f.q={};['LeftArm','LeftForeArm','RightArm','RightForeArm'].forEach(function(n){f.q[n]=f[n].quaternion.clone();});return (GL.fb=f);}
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
function makeDoor(col,par){
  var g=new T.Group(),wood=std({color:0x2a1d16,roughness:0.75}),frameM=std({color:0x1a120d,roughness:0.8});
  box(0.1,2.2,0.16,frameM,-0.5,1.1,0,g);box(0.1,2.2,0.16,frameM,0.5,1.1,0,g);box(1.1,0.1,0.16,frameM,0,2.2,0,g);
  var piv=new T.Group();piv.position.set(-0.44,0,0);g.add(piv);
  var slab=box(0.88,2.08,0.05,wood,0.44,1.04,0,piv);
  var vd=new T.Mesh(new T.PlaneGeometry(0.9,2.12),new T.MeshBasicMaterial({map:GL.voidTex,color:col!==null&&col!==undefined?col:0x7a7f88,fog:false}));vd.rotation.y=Math.PI;vd.position.set(0,1.06,-0.035);vd.renderOrder=-1;g.add(vd);GL.lastVoid=vd;
  box(0.06,0.06,0.07,std({color:0x9a8a6a,metalness:0.6,roughness:0.4}),0.8,1.0,0.04,piv);
  var strip=null,light=null;
  if(col!==null&&col!==undefined){
    strip=new T.Mesh(new T.PlaneGeometry(0.86,0.5).rotateX(-Math.PI/2),new T.MeshBasicMaterial({color:col,transparent:true,opacity:0.55,depthWrite:false,blending:T.AdditiveBlending,map:GL.stripTex}));
    strip.position.set(0,0.012,0.27);g.add(strip);
    light=new T.PointLight(col,0.5,3.2,2);light.position.set(0,0.12,0.4);g.add(light);
  }
  (par||scene).add(g);
  return {g:g,piv:piv,slab:slab,strip:strip,light:light,open:0,want:0};
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
function floorAt(){if(P.area==='hub'||S.revealing)return 'water';return (P.z-RO.z)<-2.5?'tile':'wood';}
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
  loadHandModel();loadVeilModels();makeFPHands();loadKitModels();

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
  /* Hollow waits in the dark (borrowed from the forest, made human-sized) */
  if(G.hol&&G.hol.g){try{if(G.hol.act){G.hol.act.setEffectiveWeight(1);G.hol.act.timeScale=0.3;}if(G.hol.runAct)G.hol.runAct.setEffectiveWeight(0);if(G.hol.stompAct)G.hol.stompAct.setEffectiveWeight(0);G.hol.grab=false;}catch(e){}
    GL.hol=G.hol.g;scene.add(GL.hol);GL.hol.visible=false;GL.hol.scale.setScalar(0.34);
    GL.holLight=new T.PointLight(0x6f86a8,0.0,5,2);scene.add(GL.holLight);}
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
  GL.dBath=makeDoor(0x7fa8ff,B);GL.dBath.g.remove(GL.lastVoid);GL.dBath.g.position.set(1.0,0,-D+0.02);GL.dBath.strip.position.z=0.27;GL.dBath.light.position.set(0,0.12,0.35);
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

  /* things you can use */
  inter=[
    {id:'bedDoor',pos:function(){return GL.dBed.g.position.clone().setY(1.2);},r:2.3,area:'hub',label:'open',when:function(){return !S.roomDone;},use:function(){goRoom(1);}},
    {id:'carDoor',pos:function(){return GL.dCar.g.position.clone().setY(1.2);},r:2.3,area:'hub',label:'open',use:function(){sClick(3);hint(tx('locked'),2200);}},
    {id:'partyDoor',pos:function(){return GL.dParty.g.position.clone().setY(1.2);},r:2.3,area:'hub',label:'open',use:function(){sClick(3);hint(tx('locked'),2200);}},
    {id:'veil',pos:function(){return new T.Vector3(0,1.3,-5);},r:3.2,area:'hub',label:'veil',use:function(){if(!S.roomDone){sClick(1);hint(tx('locked'),2200);return;}reveal();}},
    {id:'exit',pos:function(){return new T.Vector3(RO.x,1.2,RO.z+D);},r:2.0,area:'room',label:'open',use:function(){exitRoom();}},
    {id:'brush',pos:function(){return GL.brushPos;},r:1.7,area:'room',label:'take',when:function(){return S.loop===2&&!S.trig;},use:function(){S.trig=true;GL.brush.visible=false;noiseBurst(0.12,1800,1,0.3,true);vo('v2',6000,1);after(1.2,function(){GL.drips.visible=true;sBoom(0.25);});unlockExit(3.5);}},
    {id:'bath',pos:function(){return new T.Vector3(RO.x+1.0,1.2,RO.z-D);},r:1.9,area:'room',label:'open',when:function(){return S.loop===4&&!S.bathOpen;},use:function(){sClick(2);hint(tx('stuck'),2000);}},
    {id:'neck',pos:function(){return GL.neckPos;},r:1.7,area:'room',label:'take',when:function(){return S.loop===4&&S.bathOpen&&!S.neckTaken;},use:function(){takeNecklace();}}
  ];
}

/* ---------- areas and transitions ---------- */
function fadeTo(v,dur,cb){S.fadeFrom=S.fade;S.fadeTo=v;S.fadeT=0;S.fadeDur=dur||0.6;S.fadeCb=cb||null;}
function setArea(a){
  P.area=a;GL.hub.visible=a==='hub';GL.room.visible=a==='room';
  if(AU.wetHub&&ac){AU.wetHub.gain.setTargetAtTime(a==='hub'?0.7:0,ac.currentTime,0.05);AU.wetRoom.gain.setTargetAtTime(a==='room'?0.45:0,ac.currentTime,0.05);}
}
function goRoom(loop){
  if(S.busy)return;S.busy=true;sCreak();GL.dBed.want=1.2;
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
  setArea('hub');P.x=0;P.z=7;P.yaw=Math.PI;P.pitch=-0.02;GL.dBed.open=GL.dBed.want=0;
  S.hubT=0;S.hol.d=9;S.hol.on=false;S.hol.cool=after2?999:14;S.busy=false;
  if(after2){GL.spot.intensity=6.5;GL.dBed.light.intensity=0;GL.dBed.strip.material.opacity=0;after(2.5,function(){hint(tx('veil'),3000);});}
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
  whiteout(function(){if(P.area==='room'){enterRoom(S.loop);}else{toHub(S.roomDone);}S.busy=false;});
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
  try{localStorage.setItem('nihdo_p2_bed','1');}catch(er){}
}

/* ---------- per-frame ---------- */
var _v=new T.Vector3(),_d=new T.Vector3();
function lookingAt(p,maxD,minDot){_v.copy(p).sub(cam.position);var d=_v.length();if(d>maxD)return 0;_v.normalize();cam.getWorldDirection(_d);var dot=_v.dot(_d);return dot>minDot?dot:0;}
function walkable(x,z){
  if(P.area==='hub'){if(Math.hypot(x,z+3)>15)return false;
    var ds=[GL.dBed,GL.dCar,GL.dParty];for(var i=0;i<ds.length;i++){var g=ds[i].g.position;if(Math.hypot(x-g.x,z-g.z)<0.7)return false;}
    if(!S.revealing&&Math.hypot(x,z+5)<0.85)return false;return true;}
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
  var sp=(K.ShiftLeft||K.ShiftRight?1.4:1.0)*len*(1-0.65*S.eyes);
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
  GL.near.position.set(P.x,1.5,P.z);GL.near.intensity=P.area==='hub'?0.35:0.25;
  /* Damian's body (only the mirror sees it) */
  if(!GL.fpOn){GL.hero.position.set(P.x,0,P.z);GL.hero.rotation.y=P.yaw;}
  if(G.dmn&&G.dmn.mixer&&G.dmn.acts){var A=G.dmn.acts,wk=Math.min(1,P.spd/1.2);if(A.idle)A.idle.setEffectiveWeight(1-wk);if(A.walk){A.walk.setEffectiveWeight(wk);A.walk.timeScale=Math.max(0.6,P.spd/0.95);}if(A.run)A.run.setEffectiveWeight(0);G.dmn.mixer.update(dt);}
  if(GL.hol&&G.hol.mixer&&(GL.hol.visible||S.holMirror)){G.hol.mixer.update(dt);}
  /* doors swing */
  [GL.dBed,GL.dExit,GL.dBath].forEach(function(d){d.open+=(d.want-d.open)*Math.min(1,dt*2.5);d.piv.rotation.y=-d.open;});
  var fl=0.5+0.5*Math.sin(time*31)*Math.sin(time*7.3);
  if(GL.dParty.light)GL.dParty.light.intensity=0.3+0.5*fl;
  if(!S.revealing)GL.veil.rotation.y=Math.sin(time*0.3)*0.04;
  /* the area's own logic */
  if(P.area==='hub')hubTick(dt);else roomTick(dt);
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
  if(S.revealing)return;
  /* Hollow stands behind you in the dark. Look at him and the ringing comes; each time he comes back closer. */
  var h=S.hol;if(!GL.hol)return;
  if(!h.on){h.cool-=dt;if(h.cool<=0&&S.hubT>10){h.on=true;h.d=Math.max(3.2,h.d);var bx=P.x-Math.sin(P.yaw)*h.d,bz=P.z-Math.cos(P.yaw)*h.d;
      GL.hol.position.set(bx,0,bz);GL.hol.visible=true;GL.holLight.intensity=0.35;GL.holLight.position.set(bx,2.3,bz);if(!h.told){h.told=true;after(0.8,function(){hint(tx('dontLook'),3200);});}
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
    if(!S.holSeen&&mlook&&!S.busy){S.lookT+=dt;if(S.lookT>0.9){S.holSeen=true;S.holMirror=true;
        var hzn=GL.holZone,hx=clamp(P.x-1.3,RO.x+hzn[0],RO.x+hzn[1]),hz=clamp(P.z-0.6,RO.z+hzn[2],RO.z+hzn[3]);GL.hol.position.set(hx,0,hz);
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
  GL.dBed.light.intensity=0.5;GL.dBed.strip.material.opacity=0.55;
  if(GL.luna){GL.luna.visible=false;G.lunaOp(0);}
  if(GL.hol){GL.hol.visible=false;GL.holLight.intensity=0;}
  UI.lbHands.style.opacity='0';UI.lbHands.innerHTML=handsSVG();armsHide();UI.lbDeep.style.opacity='0';fpHands(0,0,0,0);GL.veil.rotation.y=0;
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
L._dbg=function(){return {P:P,S:S,GL:GL,cur:curInter,cam:cam,scene:scene,interact:interact,enterRoom:enterRoom,toHub:toHub,reveal:reveal};};
L.restart=function(){resetState();try{if(!G.touch())G.canvas.requestPointerLock();}catch(e){}};
L.init=function(api,done){
  G=api;T=G.THREE;R=G.renderer;
  try{
    uiInit();build();audioInit();
    var comp=G.comp();if(comp&&comp.passes&&comp.passes[0]){comp.passes[0].scene=scene;comp.passes[0].camera=cam;}
    var bl=G.bloom();if(bl){bl.strength=0.55;bl.threshold=0.7;}
    window.addEventListener('resize',function(){cam.aspect=window.innerWidth/window.innerHeight;cam.updateProjectionMatrix();});
    /* the forest is gone: free what it held on the graphics card */
    setTimeout(function(){try{G.scene.traverse(function(o){if(o.geometry)o.geometry.dispose();if(o.material){(Array.isArray(o.material)?o.material:[o.material]).forEach(function(m){['map','normalMap','roughnessMap','emissiveMap','alphaMap','aoMap'].forEach(function(k){if(m[k]&&m[k].dispose)m[k].dispose();});m.dispose();});}});}catch(e){console.warn('free forest',e);}},1500);
    resetState();L.ready=true;
    /* compile shaders once, behind the black */
    try{R.compile(scene,cam);}catch(e){}
  }catch(e){console.error('limbo init',e);}
  if(done)done();
};
})();
