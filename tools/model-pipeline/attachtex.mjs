import {NodeIO} from '@gltf-transform/core';
import {ALL_EXTENSIONS} from '@gltf-transform/extensions';
import {prune,dedup} from '@gltf-transform/functions';
const io=new NodeIO().registerExtensions(ALL_EXTENSIONS);
const [rigP,srcP,outP]=process.argv.slice(2);
const rig=await io.read(rigP),src=await io.read(srcP);
const sm=src.getRoot().listMaterials()[0];
const copy=t=>t?rig.createTexture(t.getName()).setImage(t.getImage()).setMimeType(t.getMimeType()):null;
for(const m of rig.getRoot().listMaterials()){
  m.setBaseColorTexture(copy(sm.getBaseColorTexture())).setNormalTexture(copy(sm.getNormalTexture())).setMetallicRoughnessTexture(copy(sm.getMetallicRoughnessTexture()))
   .setMetallicFactor(sm.getMetallicFactor()).setRoughnessFactor(sm.getRoughnessFactor()).setBaseColorFactor(sm.getBaseColorFactor()).setDoubleSided(sm.getDoubleSided());
  const bt=m.getBaseColorTextureInfo(),st=sm.getBaseColorTextureInfo();}
await rig.transform(dedup(),prune({keepLeaves:true}));
await io.write(outP,rig);
