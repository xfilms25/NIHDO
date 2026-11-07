(function(){var D=LIMBO._dbg(),GL=D.GL,T=THREE,BA=GL.bath;D.scene.updateMatrixWorld(true);
var avgCache=new Map();
function avg(tex){if(!tex||!tex.image)return [1,1,1];if(avgCache.has(tex))return avgCache.get(tex);var im=tex.image,c=document.createElement('canvas');c.width=c.height=16;var g=c.getContext('2d');try{g.drawImage(im,0,0,16,16);var d=g.getImageData(0,0,16,16).data,r=0,gg=0,b=0;for(var i=0;i<d.length;i+=4){r+=d[i];gg+=d[i+1];b+=d[i+2];}var n=d.length/4*255,v=[r/n,gg/n,b/n];}catch(e){v=[0.5,0.5,0.5];}avgCache.set(tex,v);return v;}
var shell=GL.bathShell,model=GL.bathModel,out={meshes:[],lights:[]};
var v=new T.Vector3(),nm=new T.Matrix3();
function fixed(a){return Array.from(a,function(x){return Math.round(x*10000)/10000;});}
BA.traverse(function(o){if(!o.isMesh||o.isSkinnedMesh)return;var p=o,vis=true;while(p&&p!==BA){vis=vis&&p.visible;p=p.parent;}if(!vis)return;
  var m=o.material;if(!m||!m.isMeshStandardMaterial||m.transparent)return;
  var g=o.geometry,pos=g.attributes.position,nor=g.attributes.normal,idx=g.index;
  var P=new Float32Array(pos.count*3),N=new Float32Array(pos.count*3);nm.getNormalMatrix(o.matrixWorld);
  for(var i=0;i<pos.count;i++){v.fromBufferAttribute(pos,i).applyMatrix4(o.matrixWorld);P[i*3]=v.x;P[i*3+1]=v.y;P[i*3+2]=v.z;if(nor){v.fromBufferAttribute(nor,i).applyMatrix3(nm).normalize();N[i*3]=v.x;N[i*3+1]=v.y;N[i*3+2]=v.z;}}
  var I=idx?Array.from(idx.array):Array.from({length:pos.count},function(_,i){return i;});
  var a=avg(m.map),c=m.color;var alb=[c.r*a[0],c.g*a[1],c.b*a[2]];
  var kind=shell.indexOf(o)>=0?'shell':(function(){var q=o;while(q){if(q===model)return 'model';q=q.parent;}return 'other';})();
  var e={kind:kind,si:shell.indexOf(o),name:o.name,albedo:alb,P:fixed(P),N:fixed(N),I:I,metal:m.metalness,emis:(m.emissive&&m.emissiveIntensity>0&&(m.emissive.r+m.emissive.g+m.emissive.b)>0.05)?1:0};
  if(kind==='shell'){var uv=g.attributes.uv;var w=g.parameters.width,h=g.parameters.height;e.w=w;e.h=h;}
  out.meshes.push(e);});
function L(l,name){var p=new T.Vector3();l.getWorldPosition(p);var r={name:name,pos:p.toArray(),dist:l.distance,decay:l.decay,spot:!!l.isSpotLight};if(l.isSpotLight){var t=new T.Vector3();l.target.getWorldPosition(t);r.target=t.toArray();r.angle=l.angle;r.pen=l.penumbra;}return r;}
out.lights.push(L(GL.bathL,'bulb'));out.lights.push(L(GL.moon,'moon'));
out.order=[];if(model)model.traverse(function(o){if(o.isMesh)out.order.push(o.name+'|'+o.geometry.attributes.position.count);});
return JSON.stringify(out);})()
