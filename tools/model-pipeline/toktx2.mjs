// glb (jpeg/png textures) -> glb with KHR_texture_basisu (KTX2). Same resolution; textures stay compressed on the GPU.
// usage: node toktx2.mjs in.glb out.glb [uastc|etc1s]
import {NodeIO} from '@gltf-transform/core';
import {ALL_EXTENSIONS,KHRTextureBasisu} from '@gltf-transform/extensions';
import {encodeToKTX2} from 'ktx2-encoder';
import sharp from 'sharp';
import fs from 'fs';
const [src,dst,mode='uastc']=process.argv.slice(2);
const io=new NodeIO().registerExtensions(ALL_EXTENSIONS);
const doc=await io.read(src);
const slotsOf=t=>t.listParents().flatMap(p=>p.propertyType==='Material'?['base','normal','mr','occ','emissive'].filter(s=>{const g={base:'getBaseColorTexture',normal:'getNormalTexture',mr:'getMetallicRoughnessTexture',occ:'getOcclusionTexture',emissive:'getEmissiveTexture'}[s];return p[g]()===t;}):[]);
let any=false;
for(const t of doc.getRoot().listTextures()){
  if(t.getMimeType()==='image/ktx2')continue;
  const sl=slotsOf(t),isColor=sl.includes('base')||sl.includes('emissive'),isNormal=sl.includes('normal');
  const {data,info}=await sharp(Buffer.from(t.getImage())).ensureAlpha().raw().toBuffer({resolveWithObject:true});
  const etc=mode==='etc1s'&&!isNormal;
  if(info.width*info.height>12582912){console.log('  keep (too large for the encoder):',sl.join('+'),info.width+'x'+info.height);continue;}
  const out=await encodeToKTX2({data:new Uint8Array(data),width:info.width,height:info.height},{
    isUASTC:!etc,isKTX2File:true,generateMipmap:true,isSetKTX2SRGBTransferFunc:isColor,isPerceptual:isColor,isNormalMap:isNormal,
    needSupercompression:!etc,enableRDO:process.env.RDO==='1'&&!etc&&!isNormal,rdoQualityLevel:1.0,uastcLDRQualityLevel:2,qualityLevel:etc?230:undefined,compressionLevel:etc?2:undefined,
    imageDecoder:async()=>({data:new Uint8Array(data),width:info.width,height:info.height})});
  console.log(' ',sl.join('+')||'?',info.width+'x'+info.height,(t.getImage().byteLength/1e6).toFixed(2)+'MB ->',(out.byteLength/1e6).toFixed(2)+'MB');
  t.setImage(out).setMimeType('image/ktx2');any=true;}
if(any)doc.createExtension(KHRTextureBasisu).setRequired(true);
await io.write(dst,doc);
console.log(dst,(fs.statSync(src).size/1e6).toFixed(1)+'MB ->',(fs.statSync(dst).size/1e6).toFixed(1)+'MB');
