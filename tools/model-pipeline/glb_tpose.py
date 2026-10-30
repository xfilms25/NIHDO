"""Put an unrigged A-pose GLB into a T-pose (palms down) in place: positions and normals are rewritten in the GLB,
textures and everything else stay byte-identical.  usage: python3 glb_tpose.py in.glb out.glb"""
import sys,os,json,struct,numpy as np,trimesh
sys.path.insert(0,os.path.dirname(__file__))
from tpose2 import arm_weights,apply_fast,palms_down2
src,dst=sys.argv[1],sys.argv[2]
b=bytearray(open(src,'rb').read());l0=struct.unpack('<I',b[12:16])[0];j=json.loads(b[20:20+l0]);b0=20+l0+8
prim=j['meshes'][0]['primitives'][0]
def view(ai):
  a=j['accessors'][ai];bv=j['bufferViews'][a['bufferView']];assert bv.get('byteStride',12)==12
  off=b0+bv.get('byteOffset',0)+a.get('byteOffset',0);return off,a
po,pa=view(prim['attributes']['POSITION']);no,na=view(prim['attributes']['NORMAL'])
n=pa['count'];V=np.frombuffer(bytes(b[po:po+n*12]),dtype='<f4').reshape(-1,3).astype(np.float64);N=np.frombuffer(bytes(b[no:no+n*12]),dtype='<f4').reshape(-1,3).astype(np.float64)
idx=np.frombuffer(bytes(b[view(prim['indices'])[0]:view(prim['indices'])[0]+j['accessors'][prim['indices']]['count']*4]),dtype='<u4').reshape(-1,3)
ymin=V[:,1].min();k=1.65/(V[:,1].max()-ymin);U=(V-[0,ymin,0])*k
m=trimesh.Trimesh(U,idx,process=False);w=m.copy();w.merge_vertices();mx=np.abs(U[:,0]).max();hand=U[np.abs(U[:,0])>mx-0.06];Wr=(float(np.abs(hand[:,0]).mean()),float(hand[:,1].mean()),0.0);print('wrist',Wr)
W,_=arm_weights(np.array(w.vertices),np.array(w.faces),Wr=Wr,hx=mx-0.1,hy=Wr[1]+0.15)
from scipy.spatial import cKDTree;_,ix=cKDTree(w.vertices).query(U);Wv=W[ix]
f=lambda X:palms_down2(apply_fast(X,Wv,Wr=Wr),Wv)
U2=f(U);Un=f(U+N*0.002);N2=Un-U2;N2/=np.linalg.norm(N2,axis=1,keepdims=True)+1e-12
V2=U2/k+[0,ymin,0]
b[po:po+n*12]=V2.astype('<f4').tobytes();b[no:no+n*12]=N2.astype('<f4').tobytes()
pa['min']=V2.min(0).tolist();pa['max']=V2.max(0).tolist()
js=json.dumps(j,separators=(',',':')).encode();js+=b' '*((4-len(js)%4)%4)
rest=bytes(b[20+l0:]);out=bytearray(b[:12])+struct.pack('<I',len(js))+b'JSON'+js+rest;struct.pack_into('<I',out,8,len(out))
open(dst,'wb').write(out);print('moved',int((Wv>0).sum()),'of',n)
