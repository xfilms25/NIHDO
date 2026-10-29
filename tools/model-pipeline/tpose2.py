import numpy as np,scipy.sparse as sp
from scipy.sparse.csgraph import connected_components
from tpose import rot,ss
def arm_weights(v,faces,P=(0.165,1.28,0.0),Wr=(0.42,0.82,0.0)):
  e=np.vstack([faces[:,[0,1]],faces[:,[1,2]],faces[:,[2,0]]])
  W=np.zeros(len(v));info={}
  for side in (1,-1):
    p=np.array([side*P[0],P[1],P[2]]);wr=np.array([side*Wr[0],Wr[1],Wr[2]]);d=(wr-p);L=np.linalg.norm(d);d/=L
    t=(v-p)@d
    C=(side*v[:,0]>0.13)&(v[:,2]>-0.08)&(v[:,1]>0.55)&(t>-0.06)
    ee=e[C[e[:,0]]&C[e[:,1]]]
    G=sp.coo_matrix((np.ones(len(ee)),(ee[:,0],ee[:,1])),shape=(len(v),len(v)))
    n,lab=connected_components(G,directed=False)
    hand=np.where(C&(side*v[:,0]>0.40)&(v[:,1]<0.9))[0]
    labs=np.unique(lab[hand]);sel=np.isin(lab,labs)&C
    w=ss(-0.03,0.09,t)*sel
    W=np.maximum(W,w);info[side]=(p,d,sel.sum(),labs)
  return W,info
def apply(v,W,P=(0.165,1.28,0.0),Wr=(0.42,0.82,0.0)):
  v=v.copy()
  for side in (1,-1):
    p=np.array([side*P[0],P[1],P[2]]);wr=np.array([side*Wr[0],Wr[1],Wr[2]]);d=(wr-p);d/=np.linalg.norm(d)
    tgt=np.array([side,0.0,0.0]);ax=np.cross(d,tgt);ang=np.arccos(np.clip(d@tgt,-1,1))
    idx=np.where((W>0)&(np.sign(v[:,0])==side))[0]
    for i in idx:v[i]=p+rot(ax,ang*W[i])@(v[i]-p)
  return v
def apply_fast(v,W,P=(0.165,1.28,0.0),Wr=(0.42,0.82,0.0)):
  v=v.copy()
  for side in (1,-1):
    p=np.array([side*P[0],P[1],P[2]]);wr=np.array([side*Wr[0],Wr[1],Wr[2]]);d=(wr-p);d/=np.linalg.norm(d)
    tgt=np.array([side,0.0,0.0]);k=np.cross(d,tgt);k/=np.linalg.norm(k);ang=np.arccos(np.clip(d@tgt,-1,1))
    idx=np.where((W>0)&(np.sign(v[:,0])==side))[0];a=(ang*W[idx])[:,None];r=v[idx]-p
    v[idx]=p+r*np.cos(a)+np.cross(k,r)*np.sin(a)+np.outer(r@k,k)*(1-np.cos(a))
  return v
