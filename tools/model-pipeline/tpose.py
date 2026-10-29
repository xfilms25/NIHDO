import numpy as np
def rot(axis,ang):
  axis=axis/np.linalg.norm(axis);K=np.array([[0,-axis[2],axis[1]],[axis[2],0,-axis[0]],[-axis[1],axis[0],0]])
  return np.eye(3)+np.sin(ang)*K+(1-np.cos(ang))*K@K
def ss(a,b,x):t=np.clip((x-a)/(b-a),0,1);return t*t*(3-2*t)
def tpose(v,P=(0.165,1.28,0.0),Wr=(0.42,0.82,0.0),ret_w=False):
  v=v.copy();W=np.zeros(len(v))
  for side in (1,-1):
    p=np.array([side*P[0],P[1],P[2]]);wr=np.array([side*Wr[0],Wr[1],Wr[2]])
    d=wr-p;L=np.linalg.norm(d);d=d/L
    rel=v-p;t=rel@d;perp=np.linalg.norm(rel-np.outer(t,d),axis=1)
    R=np.where(t<L*0.9,0.068,0.09)
    m=(t>-0.05)&(t<L+0.25)&(perp<R)&(side*v[:,0]>0.125)&~((v[:,2]<-0.055)&(t<0.35))
    w=ss(-0.03,0.09,t)*m
    tgt=np.array([side,0.0,0.0]);ax=np.cross(d,tgt);ang=np.arccos(np.clip(d@tgt,-1,1))
    for i in np.where(w>0)[0]:
      v[i]=p+rot(ax,ang*w[i])@(v[i]-p)
    W=np.maximum(W,w)
  return (v,W) if ret_w else v
