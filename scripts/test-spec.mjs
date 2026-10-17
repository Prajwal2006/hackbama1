import { sanitizeSpec, specToGlb } from '../server/spec-to-glb.js';
import { EXAMPLES } from '../server/examples.js';
import { writeFileSync } from 'node:fs';
// 1. floating drawer + legs starting at 2cm + a leg missing fields
const bad = { parts: [
  { shape:'box', x:0,y:71,z:0,w:120,d:60,h:4,color:'#b5834f',material:'wood' },
  { shape:'box', x:35,y:57.5,z:0,w:40,d:50,h:15,color:'#a07040',material:'wood' },   // 1.5cm gap under top? top bottom=71, drawer top=72.5 (overlap)
  { shape:'box', x:35,y:50,z:0,w:30,d:30,h:19,color:'#a07040',material:'wood' },     // floats 2cm under the previous
  { shape:'box', x:55,y:2,z:25,w:5,d:5,h:69,color:'#333',material:'metal',mirror:'xz' },
  { shape:'cylinder', x:0,y:0,z:0,radiusTop:null,radiusBottom:5,h:null },
]};
const out = sanitizeSpec(bad);
console.log(out.map(p=>`${p.shape} x${p.x} y${p.y} z${p.z} h${p.h} ${p.material}`).join('\n'));
const legs = out.filter(p=>p.w===5 && p.shape==='box');
console.log('legs', legs.length, 'all y=0:', legs.every(l=>l.y===0), 'same top:', new Set(legs.map(l=>l.y+l.h)).size===1);
// 2. all examples build at the right size
for (const e of EXAMPLES) { const r = await specToGlb(e, e.dimensionsCm, e.name); console.log(e.name, r.glb.length,'bytes', Object.values(r.sizeM).map(v=>(v*100).toFixed(1)).join(' x ')); writeFileSync(`../.tmp-ex-${e.name.replace(/ /g,'')}.glb`, r.glb); }
