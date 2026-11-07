# Light bake (lightmaps)

Bakes one bounce of indirect light per light plus ambient occlusion for a scene, keeping each light in its own channel
so the game can drive it with the live light colour and intensity (flicker, colour changes, lights going out).

1. In the test harness, enter the room and wait for the fixture model, then run `dump.js` in the page and save the
   returned JSON (scene triangles, albedo, shell planes, lights).
2. `pip install trimesh embreex numpy pillow`
3. `python3 bake.py bathdump.json bath 40 256` (texels per metre, rays per sample) → `bath_lm.png`, `bath_lmv.bin`, `bath_lm.json`.
4. Copy the three files next to index.html and bump `?v=` in `bathLM()` (limbo.js).

Channels: R = ambient occlusion, G = sqrt(bulb bounce / MB), B = sqrt(moon bounce / MM).
Shell planes read the atlas through `uv1`; fixture meshes get a per-vertex `lmv` attribute (matched by name + vertex count).
`?nolm` turns it off for comparison. `LM_GAIN` and `LMU.lmAO` (how much AO darkens direct light) tune the look.
