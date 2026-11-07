"""Bathroom light bake: one bounce of indirect light per light + ambient occlusion.

Input : a scene dump from the game (dump.js run in the page): world triangles, albedo, the shell planes and the lights.
Output: <out>_lm.png  atlas for the shell planes   R = ambient occlusion, G = sqrt(bulb bounce / MB), B = sqrt(moon bounce / MM)
        <out>_lmv.bin per-vertex values for the fixture model, same channels, uint8, in model traverse order
        <out>_lm.json  atlas rects (one per shell plane, in creation order), scales MB / MM, vertex table
The lights are baked at intensity 1 with the game's own falloff (legacy lights), so the game scales each channel by the
light's live colour * intensity: flicker, colour changes and the moon going out keep working.
"""
import json, sys, math, numpy as np, trimesh
from trimesh.ray.ray_pyembree import RayMeshIntersector
from PIL import Image

src, out = sys.argv[1], sys.argv[2]
RES = float(sys.argv[3]) if len(sys.argv) > 3 else 28.0      # texels per metre on the shell
SPP = int(sys.argv[4]) if len(sys.argv) > 4 else 160         # hemisphere rays per sample
AO_R = 0.55
rng = np.random.default_rng(7)
d = json.load(open(src))

# ---- scene ----
V, F, ALB, = [], [], []
off = 0
for m in d['meshes']:
    if m.get('emis'): continue
    P = np.array(m['P'], np.float64).reshape(-1, 3); I = np.array(m['I'], np.int64).reshape(-1, 3)
    V.append(P); F.append(I + off); off += len(P)
    a = np.array(m['albedo']) * (1.0 - 0.85 * m.get('metal', 0))
    ALB.append(np.repeat(a[None], len(I), 0))
V = np.concatenate(V); F = np.concatenate(F); ALB = np.concatenate(ALB)
mesh = trimesh.Trimesh(V, F, process=False)
TN = mesh.face_normals
ray = RayMeshIntersector(mesh)
print('tris', len(F))

def first_hit(o, dv):
    tri, ri, loc = ray.intersects_id(o, dv, multiple_hits=False, return_locations=True)
    T = np.full(len(o), np.inf); TI = np.full(len(o), -1)
    T[ri] = np.einsum('ij,ij->i', loc - o[ri], dv[ri]); TI[ri] = tri
    return T, TI

lights = {l['name']: l for l in d['lights']}

def direct(L, p, n, jitter):
    """irradiance (game units, intensity 1) at points p with normals n, shadowed"""
    lp = np.array(L['pos'])[None] + (rng.normal(size=p.shape) * jitter if jitter else 0)
    v = lp - p; dist = np.linalg.norm(v, axis=1); l = v / dist[:, None]
    c = np.clip(np.einsum('ij,ij->i', n, l), 0, None)
    att = np.where(L['dist'] > 0, np.clip(1 - dist / L['dist'], 0, 1) ** L['decay'], 1.0)
    e = c * att
    if L['spot']:
        ax = np.array(L['target']) - np.array(L['pos']); ax /= np.linalg.norm(ax)
        ac = np.einsum('ij,j->i', -l, ax)
        c0, c1 = math.cos(L['angle']), math.cos(L['angle'] * (1 - L['pen']))
        t = np.clip((ac - c0) / (c1 - c0), 0, 1); e *= t * t * (3 - 2 * t)
    live = e > 1e-5
    if live.any():
        o = p[live] + n[live] * 2e-3
        T, _ = first_hit(o, l[live])
        vis = T > dist[live] - 4e-3
        ee = e[live]; ee[~vis] = 0; e[live] = ee
    return e

def frame(n):
    a = np.where(np.abs(n[:, 0:1]) < 0.9, np.array([[1., 0, 0]]), np.array([[0., 1, 0]]))
    t = np.cross(n, a); t /= np.linalg.norm(t, axis=1)[:, None]; b = np.cross(n, t)
    return t, b

def bake(p, n):
    """returns (ao, bulb, moon) per sample"""
    N = len(p); out_ = np.zeros((N, 3))
    CH = max(1, 400000 // SPP)
    for s in range(0, N, CH):
        P = p[s:s + CH]; Nn = n[s:s + CH]; k = len(P)
        t, b = frame(Nn)
        u1 = rng.random((k, SPP)); u2 = rng.random((k, SPP))
        r = np.sqrt(u1); ph = 2 * np.pi * u2
        x, y, z = r * np.cos(ph), r * np.sin(ph), np.sqrt(1 - u1)
        D = x[..., None] * t[:, None] + y[..., None] * b[:, None] + z[..., None] * Nn[:, None]
        O = np.repeat(P + Nn * 2e-3, SPP, 0); D = D.reshape(-1, 3)
        T, TI = first_hit(O, D)
        occ = np.where(np.isfinite(T), np.clip(1 - T / AO_R, 0, 1), 0)
        ao = 1 - occ.reshape(k, SPP).mean(1)
        hit = TI >= 0
        H = O[hit] + D[hit] * T[hit][:, None]
        hn = TN[TI[hit]]; flip = np.einsum('ij,ij->i', hn, D[hit]) > 0; hn[flip] *= -1
        alb = ALB[TI[hit]].mean(1)
        res = []
        for nm, jit in (('bulb', 0.02), ('moon', 0.05)):
            e = np.zeros(len(O)); e[hit] = alb * direct(lights[nm], H, hn, jit)
            res.append(e.reshape(k, SPP).mean(1))
        out_[s:s + k] = np.stack([ao, res[0], res[1]], 1)
        print(f'  {s + k}/{N}', flush=True)
    return out_

# ---- shell atlas ----
PAD = 2
rects = []; samples = []
for m in d['meshes']:
    if m['kind'] != 'shell': continue
    P = np.array(m['P'], np.float64).reshape(4, 3); nrm = np.array(m['N'][:3], np.float64)
    w, h = m['w'], m['h']
    nw, nh = max(4, math.ceil(w * RES)), max(4, math.ceil(h * RES))
    rects.append(dict(si=m['si'], nw=nw, nh=nh, P=P, n=nrm))
order = sorted(range(len(rects)), key=lambda i: -rects[i]['nh'])
A = 256
while True:
    x = y = rowh = 0; ok = True
    for i in order:
        r = rects[i]; W, H = r['nw'] + 2 * PAD, r['nh'] + 2 * PAD
        if x + W > A: x = 0; y += rowh; rowh = 0
        if y + H > A or W > A: ok = False; break
        r['x'], r['y'] = x, y; x += W; rowh = max(rowh, H)
    if ok: break
    A *= 2
print('atlas', A)
pts, nrs, own = [], [], []
for ri, r in enumerate(rects):
    i, j = np.meshgrid((np.arange(r['nw']) + 0.5) / r['nw'], (np.arange(r['nh']) + 0.5) / r['nh'])
    P0, P1, P2, P3 = r['P']           # PlaneGeometry order: uv (0,1) (1,1) (0,0) (1,0)
    pos = P2[None, None] + i[..., None] * (P3 - P2) + j[..., None] * (P0 - P2)
    pts.append(pos.reshape(-1, 3)); nrs.append(np.repeat(r['n'][None], pos.shape[0] * pos.shape[1], 0))
pts = np.concatenate(pts); nrs = np.concatenate(nrs)
print('shell samples', len(pts))
S = bake(pts, nrs)

# ---- fixtures, per vertex ----
vp, vn, vtab = [], [], []
for m in d['meshes']:
    if m['kind'] != 'model': continue
    P = np.array(m['P'], np.float64).reshape(-1, 3); Nn = np.array(m['N'], np.float64).reshape(-1, 3)
    l = np.linalg.norm(Nn, axis=1); Nn[l < 1e-6] = [0, 1, 0]; Nn /= np.linalg.norm(Nn, axis=1)[:, None]
    vtab.append([m['name'], len(P)]); vp.append(P); vn.append(Nn)
vp = np.concatenate(vp); vn = np.concatenate(vn)
print('vertex samples', len(vp))
Vb = bake(vp, vn)

MB = float(max(np.percentile(np.concatenate([S[:, 1], Vb[:, 1]]), 99.7), 1e-6))
MM = float(max(np.percentile(np.concatenate([S[:, 2], Vb[:, 2]]), 99.7), 1e-6))
def enc(X):
    return np.stack([np.clip(X[:, 0], 0, 1), np.sqrt(np.clip(X[:, 1] / MB, 0, 1)), np.sqrt(np.clip(X[:, 2] / MM, 0, 1))], 1)

img = np.zeros((A, A, 3)); k = 0
for r in rects:
    n_ = r['nw'] * r['nh']; blk = enc(S[k:k + n_]).reshape(r['nh'], r['nw'], 3); k += n_
    blk = np.pad(blk, ((PAD, PAD), (PAD, PAD), (0, 0)), mode='edge')
    img[r['y']:r['y'] + blk.shape[0], r['x']:r['x'] + blk.shape[1]] = blk
Image.fromarray((np.flipud(img) * 255 + 0.5).astype(np.uint8)).save(out + '_lm.png', optimize=True)
open(out + '_lmv.bin', 'wb').write((enc(Vb) * 255 + 0.5).astype(np.uint8).tobytes())
meta = dict(A=A, MB=MB, MM=MM, verts=vtab,
            rects=[[r['si'], (r['x'] + PAD) / A, (r['y'] + PAD) / A, r['nw'] / A, r['nh'] / A] for r in rects])
json.dump(meta, open(out + '_lm.json', 'w'))
print('MB', MB, 'MM', MM, 'ao mean', S[:, 0].mean(), Vb[:, 0].mean())
