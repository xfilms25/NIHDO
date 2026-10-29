"""Prepare a GLB character for Mixamo without touching its quality.
usage: python3 mixamo_prep.py in.glb out_dir [height_m] [--tpose]
 - one mesh, original vertices/UVs (no simplification), scaled to height_m with feet on y=0
 - original base-color image bytes copied as-is (no re-encode); matte material (Ks 0, illum 1)
 - --tpose: rotate the arms up from the shoulders into a T-pose (tpose2.py; arms found by mesh connectivity)
 - heavy models: make a light copy for rigging first (gltf-transform weld + simplify ratio 0.05 on the GLB),
   run this script on both, and transfer the rig back onto the full model (nearest-vertex weights)"""
import sys,os,json,struct,trimesh,numpy as np
sys.path.insert(0,os.path.dirname(__file__))
src,out=sys.argv[1],sys.argv[2];H=float(sys.argv[3]) if len(sys.argv)>3 and not sys.argv[3].startswith('--') else 1.7
os.makedirs(out,exist_ok=True)
s=trimesh.load(src);m=s.to_geometry() if hasattr(s,'to_geometry') else s.dump(concatenate=True)
k=H/(m.bounds[1][1]-m.bounds[0][1]);m.apply_translation([0,-m.bounds[0][1],0]);m.apply_scale(k)
if '--tpose' in sys.argv:
  from tpose2 import arm_weights,apply_fast
  w=m.copy();w.merge_vertices(merge_tex=True,merge_norm=True);W,_=arm_weights(np.array(w.vertices),np.array(w.faces))
  from scipy.spatial import cKDTree;_,ix=cKDTree(w.vertices).query(m.vertices);m.vertices=apply_fast(np.array(m.vertices),W[ix])
name=os.path.splitext(os.path.basename(src))[0];m.export(os.path.join(out,name+'.obj'))
b=open(src,'rb').read();l0=struct.unpack('<I',b[12:16])[0];j=json.loads(b[20:20+l0]);b0=20+l0+8
ti=j['materials'][0]['pbrMetallicRoughness']['baseColorTexture']['index'];img=j['images'][j['textures'][ti]['source']];bv=j['bufferViews'][img['bufferView']]
ext='.jpg' if 'jpeg' in img.get('mimeType','') else '.png';tex=name+'_color'+ext
open(os.path.join(out,tex),'wb').write(b[b0+bv.get('byteOffset',0):b0+bv.get('byteOffset',0)+bv['byteLength']])
for f in os.listdir(out):
  if f.startswith('material_0.'):os.remove(os.path.join(out,f))
open(os.path.join(out,'material.mtl'),'w').write('newmtl material_0\nKa 0 0 0\nKd 1 1 1\nKs 0 0 0\nNs 0\nillum 1\nmap_Kd %s\n'%tex)
print('wrote',out)
