# Character model pipeline (highest quality)

Standing rules for this project's characters:
- **Never simplify meshes or downsize textures.** Keep original resolution; PNG may be re-encoded as JPEG q92 only (`game_models_fullres.mjs`).
- Drop only what the game doesn't use (unused animation clips, TANGENT attribute).

## Mixamo prep (`mixamo_prep.py`)
- OBJ + the original base-color image bytes (no re-encode), **matte** MTL (Ks 0, illum 1, Kd 1).
- Scaled to human height, feet on the floor.
- `--tpose`: arms rotated from the shoulders into a T-pose (arms found by mesh connectivity, so wings/hair/dress stay put; smooth blend at the shoulder).
- Heavy models (Mixamo rejects ~1M+ triangles): make a light proxy for rigging and transfer the rig back onto the full model.

## Clips between rigs
In-game, clips made on one rig are retargeted onto another in world space against each rig's rest pose (`retarget()` in `limbo.js`), with a rest-direction correction for T-pose vs A-pose.

## Auto-rig without Mixamo (`autorig.html` + `attachtex.mjs`)
For an unrigged Meshy character in T-pose: the skeleton and skin weights of a similar rigged character (e.g. zuri.glb) are fitted to the new mesh (height match, arm bones moved to the new arms), each vertex takes the weights of the nearest reference vertices, and the original full-resolution textures are re-attached. Full mesh, no simplification. Run in a browser page: `autorig.html?src=new.glb&ref=rigged.glb&h=1.66`, then `node attachtex.mjs rig_notex.glb new.glb out.glb`.
