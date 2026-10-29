import {NodeIO} from '@gltf-transform/core';
import {ALL_EXTENSIONS} from '@gltf-transform/extensions';
import {prune,dedup,textureCompress} from '@gltf-transform/functions';
import sharp from 'sharp';
const io=new NodeIO().registerExtensions(ALL_EXTENSIONS);
const jobs=[['pty/dsuit.glb','damian_suit.glb',/Walking/],['pty/seb_src.glb','seb.glb',null],['pty/zuri_src.glb','zuri.glb',null],['pty/man_in.glb','drinker.glb',/./],['pty/sheriff_in.glb','sheriff.glb',/./],['pty/kitty_in.glb','kitty.glb',/./],['pty/mari_in.glb','maribeth.glb',/jazz/i],['goth/goth.glb','goth.glb',/./],['angel/angel.glb','luna2.glb',/./]];
for(const [src,dst,keep] of jobs){
  const doc=await io.read(src);
  for(const a of doc.getRoot().listAnimations())if(!keep||!keep.test(a.getName()))a.dispose();
  for(const m of doc.getRoot().listMeshes())for(const p of m.listPrimitives())if(p.getAttribute('TANGENT'))p.setAttribute('TANGENT',null);
  await doc.transform(dedup(),textureCompress({encoder:sharp,targetFormat:'jpeg',formats:/png/,quality:92}),prune({keepLeaves:true}));
  await io.write('full/'+dst,doc);
}
