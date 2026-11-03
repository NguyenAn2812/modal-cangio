import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';

const $=s=>document.querySelector(s),clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),TAU=Math.PI*2;
const mount=$('#scene'),renderer=new THREE.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});
renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.7));renderer.shadowMap.enabled=true;
renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.outputColorSpace=THREE.SRGBColorSpace;
renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=.94;
mount.appendChild(renderer.domElement);
const scene=new THREE.Scene();scene.background=new THREE.Color('#14251d');scene.fog=new THREE.FogExp2('#14251d',.012);
const camera=new THREE.PerspectiveCamera(42,1,.1,100);
const hemi=new THREE.HemisphereLight('#bbd1be','#1b291e',1.02);scene.add(hemi);
const sunlight=new THREE.DirectionalLight('#ffdbac',2.0);sunlight.position.set(-8,12,8);sunlight.castShadow=true;
sunlight.shadow.mapSize.set(1024,1024);sunlight.shadow.camera.left=-14;sunlight.shadow.camera.right=14;
sunlight.shadow.camera.top=14;sunlight.shadow.camera.bottom=-14;sunlight.shadow.camera.far=35;sunlight.shadow.bias=-.0003;
scene.add(sunlight);
const skyFill=new THREE.DirectionalLight('#668e84',.50);skyFill.position.set(8,4,-7);scene.add(skyFill);
const pivot={yaw:.70,pitch:.58,distance:21,target:new THREE.Vector3(0,.7,0),drag:false,x:0,y:0};
const GD4B={landExpansion:1.24,waterInset:.76}; // Expanded alluvial island without moving GD3 points
let cfg=null,group=null,channelsNow=[],waterMaterials=[];
function rng(seed){return ()=>{seed=(seed+0x6D2B79F5)|0;let t=seed;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return ((t^(t>>>14))>>>0)/4294967296;};}
function smooth(points,n=13){const result=[];for(let i=0;i<points.length-1;i++){const a=points[Math.max(0,i-1)],b=points[i],c=points[i+1],d=points[Math.min(points.length-1,i+2)];for(let j=0;j<n;j++){const t=j/n,t2=t*t,t3=t2*t,f=k=>.5*(2*b[k]+(-a[k]+c[k])*t+(2*a[k]-5*b[k]+4*c[k]-d[k])*t2+(-a[k]+3*b[k]-3*c[k]+d[k])*t3);result.push({x:f('x'),z:f('z')});}}result.push(points.at(-1));return result;}
function channels(c){const conv=points=>smooth(points.map(p=>({x:p.x*c.rx,z:p.z*c.rz})),15);return [{id:'main',w:c.mainWidth,p:conv(c.water.main)},{id:'west',w:c.branchWidth,p:conv(c.water.west)},{id:'east',w:c.branchWidth,p:conv(c.water.east)}];}
function pathDist(x,z,p){let result=1e5;for(let i=1;i<p.length;i++){const a=p[i-1],b=p[i],dx=b.x-a.x,dz=b.z-a.z,t=clamp(((x-a.x)*dx+(z-a.z)*dz)/(dx*dx+dz*dz+1e-9),0,1);result=Math.min(result,Math.hypot(x-a.x-dx*t,z-a.z-dz*t));}return result;}
function riverD(x,z){return Math.min(...channelsNow.map(ch=>pathDist(x,z,ch.p)/ch.w));}
function nearestRiver(x,z){let dist=Infinity,width=.41;for(const ch of channelsNow){const d=pathDist(x,z,ch.p);if(d/ch.w<dist/width){dist=d;width=ch.w;}}return {dist,width};}
function smoothstep(a,b,v){const t=clamp((v-a)/(b-a),0,1);return t*t*(3-2*t);}
function lowHuts(c){if(c?.sites)for(const item of c.sites){if(item.type==='tower'||item.id==='tower'){item.type='hut';item.name='Chòi 5';}}return c;}
function coast(theta,r,c){const wig=1+.038*Math.sin(5*theta+.2)+.032*Math.cos(9*theta+.8)+.016*Math.sin(17*theta+1);return [c.rx*GD4B.landExpansion*r*wig*Math.cos(theta),c.rz*GD4B.landExpansion*r*wig*Math.sin(theta)];}
function mask(x,z,c){const angle=Math.atan2(z/c.rz,x/c.rx);const wig=1+.038*Math.sin(5*angle+.2)+.032*Math.cos(9*angle+.8)+.016*Math.sin(17*angle+1);return Math.hypot(x/c.rx,z/c.rz)/(wig*GD4B.landExpansion);}
function height(x,z,c){
 // The channel floor used to be ABOVE its water. Carve a real creek basin.
 const river=nearestRiver(x,z),r=mask(x,z,c);
 const noise=.20*Math.sin(x*1.2+z*.4)*Math.cos(z*1.56-x*.45)+.13*Math.sin(x*2.9-z*1.4)+.07*Math.cos(x*4.2+z*3.3);
 const base=1.18+.12*noise-.12*smoothstep(.80,1.03,r);
 const halfWidth=river.width*GD4B.waterInset;
 const inner=halfWidth*.87;
 const outer=halfWidth+river.width*(.48+.53*Math.min(c.bank,1.1));
 return base-.78*(1-smoothstep(inner,outer,river.dist));
}
function paintTexture(type,seed){
 const cv=document.createElement('canvas');cv.width=cv.height=256;const ctx=cv.getContext('2d'),img=ctx.createImageData(256,256),r=rng(seed);
 const base=type==='mud'?[118,105,80]:type==='wood'?[145,111,81]:[117,102,77];
 for(let y=0;y<256;y++)for(let x=0;x<256;x++){const i=(y*256+x)*4,n=(r()-.5)*28+12*Math.sin(x*.075+y*.035)*Math.cos(y*.057-x*.02)+(type==='mud'?0:13*Math.sin(x*.13+y*.009));for(let j=0;j<3;j++)img.data[i+j]=clamp(base[j]+n*(1-j*.19),0,255);img.data[i+3]=255;}
 ctx.putImageData(img,0,0);
 if(type==='wood')for(let i=0;i<20;i++){ctx.beginPath();ctx.moveTo(r()*256,r()*256);ctx.bezierCurveTo(r()*256,r()*256,r()*256,r()*256,r()*256,r()*256);ctx.strokeStyle='rgba(35,21,12,.22)';ctx.lineWidth=1;ctx.stroke();}
 if(type==='mud')for(let i=0;i<100;i++){const x=r()*256,y=r()*256;ctx.fillStyle=i%2?'rgba(25,32,17,.10)':'rgba(176,154,104,.08)';ctx.beginPath();ctx.ellipse(x,y,2+r()*8,1+r()*4,r()*TAU,0,TAU);ctx.fill();}
 const tex=new THREE.CanvasTexture(cv);tex.wrapS=tex.wrapT=THREE.RepeatWrapping;tex.colorSpace=THREE.SRGBColorSpace;tex.anisotropy=8;return tex;
}
const mudTex=paintTexture('mud',80),woodTex=paintTexture('wood',16),barkTex=paintTexture('bark',9);
mudTex.repeat.set(3.6,3.9);barkTex.repeat.set(2,2);
const mat={
 mud:new THREE.MeshStandardMaterial({map:mudTex,color:'#eee8d9',vertexColors:true,roughness:.94,side:THREE.DoubleSide}),
 wall:new THREE.MeshStandardMaterial({map:mudTex,color:'#c5ad8a',vertexColors:true,roughness:1,side:THREE.DoubleSide}),
 wood:new THREE.MeshStandardMaterial({map:woodTex,color:'#dec7a4',roughness:.89}),
 dark:new THREE.MeshStandardMaterial({map:woodTex,color:'#6b513c',roughness:.98}),
 bark:new THREE.MeshStandardMaterial({map:barkTex,color:'#c1b394',roughness:1}),
 rope:new THREE.MeshStandardMaterial({color:'#ad9d7a',roughness:1}),
 roof:new THREE.MeshStandardMaterial({map:woodTex,color:'#67533a',roughness:1,side:THREE.DoubleSide}),
 foliage:new THREE.MeshStandardMaterial({color:'#c9dfc1',vertexColors:true,flatShading:true,roughness:.92}),
 fern:new THREE.MeshStandardMaterial({color:'#c0d0a5',vertexColors:true,flatShading:true,roughness:1})
};
const G={rod:new THREE.CylinderGeometry(1,1,1,5),crown:new THREE.IcosahedronGeometry(1,1),fern:new THREE.ConeGeometry(1,1,4)};
const up=new THREE.Vector3(0,1,0),dummy=new THREE.Object3D();
function rod(g,a,b,radius,material=mat.dark){const a3=new THREE.Vector3(...a),b3=new THREE.Vector3(...b),d=b3.clone().sub(a3),length=d.length();if(length<.001)return;const m=new THREE.Mesh(G.rod,material);m.position.copy(a3).add(b3).multiplyScalar(.5);m.quaternion.setFromUnitVectors(up,d.normalize());m.scale.set(radius,length,radius);m.castShadow=true;m.receiveShadow=true;g.add(m);}
function box(g,x,y,z,w,h,d,material=mat.wood){const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),material);m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;g.add(m);return m;}
function terrain(g,c){
 const radial=84,angular=224,positions=[],colors=[],uv=[],indices=[];
 const shade=new THREE.Color(),wet=new THREE.Color('#887d66'),dry=new THREE.Color('#839776');
 for(let ri=0;ri<=radial;ri++)for(let aj=0;aj<=angular;aj++){const [x,z]=coast(aj/angular*TAU,ri/radial,c),y=height(x,z,c),d=riverD(x,z);positions.push(x,y,z);uv.push(x/3.5,z/3.5);shade.copy(wet).lerp(dry,clamp(d/4,0,1));colors.push(shade.r,shade.g,shade.b);}
 for(let ri=0;ri<radial;ri++)for(let aj=0;aj<angular;aj++){const a=ri*(angular+1)+aj,b=a+angular+1;indices.push(a,b,a+1,b,b+1,a+1);}
 const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geo.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));geo.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));geo.setIndex(indices);geo.computeVertexNormals();
 const top=new THREE.Mesh(geo,mat.mud);top.receiveShadow=true;g.add(top);
 const radii=[1,.98,.91,.79,.59,.38,.13,.013],ys=[0,-.22,-.45,-.81,-1.15,-1.46,-1.73,-1.78],vp=[],vc=[],vt=[],ix=[];
 for(let i=0;i<radii.length;i++)for(let j=0;j<=angular;j++){const [x,z]=coast(j/angular*TAU,radii[i],c);const y=i?1.08+ys[i]*c.thickness/1.4:height(x,z,c)-.025;vp.push(x,y,z);vt.push(j/angular*4,i/7*3);const color=new THREE.Color().setRGB(.73-i*.035,.67-i*.031,.53-i*.026);vc.push(color.r,color.g,color.b);}
 for(let i=0;i<radii.length-1;i++)for(let j=0;j<angular;j++){const a=i*(angular+1)+j,b=a+angular+1;ix.push(a,a+1,b,b,a+1,b+1);}
 const cliffGeo=new THREE.BufferGeometry();cliffGeo.setAttribute('position',new THREE.Float32BufferAttribute(vp,3));cliffGeo.setAttribute('uv',new THREE.Float32BufferAttribute(vt,2));cliffGeo.setAttribute('color',new THREE.Float32BufferAttribute(vc,3));cliffGeo.setIndex(ix);cliffGeo.computeVertexNormals();const wall=new THREE.Mesh(cliffGeo,mat.wall);wall.castShadow=true;wall.receiveShadow=true;g.add(wall);
}
function water(g,ch){
 const pts=ch.p.filter(p=>mask(p.x,p.z,cfg)<.974);
 if(pts.length<2)return;
 const positions=[],uv=[],indices=[];
 for(let i=0;i<pts.length;i++){
  const p=pts[i],a=pts[Math.max(0,i-1)],b=pts[Math.min(pts.length-1,i+1)];
  const dx=b.x-a.x,dz=b.z-a.z,len=Math.hypot(dx,dz)||1,nx=-dz/len,nz=dx/len;
  const taper=Math.pow(Math.max(0,Math.sin(Math.PI*i/(pts.length-1))),.5);
  const baseHalf=ch.w*GD4B.waterInset*(.003+.997*taper);
  for(const sign of [-1,1]){
   let half=baseHalf,x=p.x+nx*sign*half,z=p.z+nz*sign*half;
   for(let k=0;k<12&&mask(x,z,cfg)>.974;k++){half*=.70;x=p.x+nx*sign*half;z=p.z+nz*sign*half;}
   positions.push(x,.725,z);uv.push(sign<0?0:1,i/14);
  }
 }
 for(let i=0;i<pts.length-1;i++){let n=i*2;indices.push(n,n+1,n+2,n+1,n+3,n+2);}
 const geometry=new THREE.BufferGeometry();
 geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
 geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));
 geometry.setIndex(indices);geometry.computeVertexNormals();
 const material=new THREE.MeshPhysicalMaterial({color:'#385b50',roughness:.31,metalness:0,transparent:true,opacity:.95,clearcoat:.42,clearcoatRoughness:.26,side:THREE.DoubleSide,depthWrite:false});
 const mesh=new THREE.Mesh(geometry,material);mesh.renderOrder=3;mesh.receiveShadow=true;g.add(mesh);
 waterMaterials.push({object:mesh,initial:.725});
}
function forest(g,c){
 if(c.ecosystem?.forest===false)return;
 const rand=rng(74523),route=smooth(c.sites.map(s=>({x:s.x*c.rx,z:s.z*c.rz})),10);
 const count=Math.round(112*clamp((c.ecosystem?.density??100)/100,.2,1.4)),trees=[];
 for(let i=0;i<count*80&&trees.length<count;i++){
  const theta=rand()*TAU,r=Math.sqrt(rand())*.98,x=Math.cos(theta)*r*c.rx,z=Math.sin(theta)*r*c.rz;
  const margin=Math.min(...channelsNow.map(ch=>pathDist(x,z,ch.p)-ch.w*.95));
  const siteGap=Math.min(...c.sites.map(s=>Math.hypot(x-s.x*c.rx,z-s.z*c.rz)));
  if(mask(x,z,c)>.96||margin<.25||pathDist(x,z,route)<.25||siteGap<.58)continue;
  trees.push({x,z,y:height(x,z,c),h:(.88+rand()*1.16)*(c.ecosystem?.height??100)/100,r:rand()});
 }
 const n=trees.length,trunks=new THREE.InstancedMesh(G.rod,mat.bark,n);
 const leaves=new THREE.InstancedMesh(G.crown,mat.foliage,n*4);
 const roots=new THREE.InstancedMesh(G.rod,mat.bark,n*6);
 let ri=0,li=0;
 const palette=['#456e4b','#628759','#527d4a','#809762','#416a4c'];
 const place=(mesh,i,a,b,rad)=>{const p=new THREE.Vector3(...a),q=new THREE.Vector3(...b),v=q.clone().sub(p);dummy.position.copy(p).add(q).multiplyScalar(.5);dummy.quaternion.setFromUnitVectors(up,v.clone().normalize());dummy.scale.set(rad,v.length(),rad);dummy.updateMatrix();mesh.setMatrixAt(i,dummy.matrix);};
 for(let i=0;i<n;i++){
  const t=trees[i],H=t.h,young=i%7===0;
  place(trunks,i,[t.x,t.y,t.z],[t.x,t.y+H*.76,t.z],young?.034:.055);
  for(let j=0;j<6;j++){
   const a=j/6*TAU+t.r*TAU,dx=Math.cos(a)*H*.19,dz=Math.sin(a)*H*.19;
   place(roots,ri++,[t.x,t.y+H*.34,t.z],[t.x+dx,height(t.x+dx,t.z+dz,c),t.z+dz],young?.009:.022);
  }
  for(let j=0;j<4;j++){
   const a=j/4*TAU+t.r*15,rr=H*(young?.18:.29),x=t.x+Math.cos(a)*rr*.65,z=t.z+Math.sin(a)*rr*.65;
   dummy.position.set(x,t.y+H*(.76+Math.sin(a)*.04),z);
   dummy.rotation.set(.2*j,.1*j,0);dummy.scale.set(rr,rr*.66,rr);dummy.updateMatrix();
   leaves.setMatrixAt(li,dummy.matrix);leaves.setColorAt(li,new THREE.Color(palette[(i+j)%5]));li++;
  }
 }
 [trunks,leaves,roots].forEach(obj=>{obj.instanceMatrix.needsUpdate=true;obj.castShadow=obj!==leaves;obj.receiveShadow=obj!==leaves;g.add(obj);}); // Avoid black opaque canopy self-shadows
 if(c.ecosystem?.roots===false)roots.visible=false;
 if(c.ecosystem?.understory!==false){
  const ferns=new THREE.InstancedMesh(G.fern,mat.fern,320);let used=0;
  for(let i=0;i<1000&&used<320;i++){
   const a=rand()*TAU,r=Math.sqrt(rand())*.97,x=Math.cos(a)*r*c.rx,z=Math.sin(a)*r*c.rz;
   if(mask(x,z,c)>.95||riverD(x,z)<.80||pathDist(x,z,route)<.19)continue;
   const h=.18+rand()*.23;
   dummy.position.set(x,height(x,z,c)+h*.42,z);dummy.rotation.set(rand()*.15,a,rand()*.12);dummy.scale.set(.07+rand()*.08,h,.07+rand()*.08);dummy.updateMatrix();ferns.setMatrixAt(used,dummy.matrix);ferns.setColorAt(used,new THREE.Color(palette[(used+2)%5]));used++;
  }
  ferns.count=used;ferns.instanceMatrix.needsUpdate=true;g.add(ferns);
 }
 $('#treeCount').textContent=String(n);
}
// GD4 • Junction-aware boardwalk construction.
// The five hut platforms own their floor, roof posts and perimeter rails.
// Boardwalk edges terminate at platform boundaries, never at platform centers.
const DECK_Y=1.57;
function structureGraph(c){
 const scale=(c.structures?.scale??100)/100;
 const nodes=c.sites.map(s=>({
  id:s.id,type:s.type==='entry'?'entry':'hut',x:s.x*c.rx,z:s.z*c.rz,
  w:s.type==='entry'?.62:.83*scale,d:s.type==='entry'?.58:.80*scale,
  openFaces:new Set(),site:s
 }));
 const byId=Object.fromEntries(nodes.map(n=>[n.id,n]));
 // Peripheral viewing decks are moved outside hut footprints to avoid overlap.
 if(c.structures?.spurs!==false){
  const docks=[['hut1',-1.40,-.25],['hut3',.30,-1.44],['hut4',-1.42,.24]];
  for(const [id,dx,dz] of docks){
   const parent=byId[id];if(!parent)continue;
   const dock={id:id+'-deck',type:'deck',x:parent.x+dx,z:parent.z+dz,
     w:.48,d:.44,openFaces:new Set(),parentId:id};
   nodes.push(dock);byId[dock.id]=dock;
  }
 }
 function portal(from,to){
  const dx=to.x-from.x,dz=to.z-from.z;
  // Pick the face that is most directly aimed at the other platform.
  const xFace=Math.abs(dx)/(from.w*.5),zFace=Math.abs(dz)/(from.d*.5);
  if(xFace>=zFace){
   const sign=dx>=0?1:-1;
   return {x:from.x+sign*from.w*.5,z:from.z,face:sign>0?'east':'west',nx:sign,nz:0};
  }
  const sign=dz>=0?1:-1;
  return {x:from.x,z:from.z+sign*from.d*.5,face:sign>0?'south':'north',nx:0,nz:sign};
 }
 const links=[];
 function connect(a,b,width){
  const p=portal(a,b),q=portal(b,a);
  a.openFaces.add(p.face);b.openFaces.add(q.face);
  const length=Math.hypot(q.x-p.x,q.z-p.z);
  const t=clamp(length*.22,.16,.72);
  // Cubic connectors leave and enter platforms normal to their open side.
  const p1={x:p.x+p.nx*t,z:p.z+p.nz*t};
  const p2={x:q.x+q.nx*t,z:q.z+q.nz*t};
  const steps=Math.max(8,Math.min(64,Math.ceil(length/.09)));
  const path=[];
  for(let i=0;i<=steps;i++){
   const u=i/steps,v=1-u;
   path.push({
    x:v*v*v*p.x+3*v*v*u*p1.x+3*v*u*u*p2.x+u*u*u*q.x,
    z:v*v*v*p.z+3*v*v*u*p1.z+3*v*u*u*p2.z+u*u*u*q.z
   });
  }
  links.push({from:a.id,to:b.id,fromFace:p.face,toFace:q.face,width,path});
 }
 // Existing GD3 topology: same sites, same order, no new hut locations.
 for(let i=1;i<c.sites.length;i++)connect(byId[c.sites[i-1].id],byId[c.sites[i].id],c.bridgeWidth);
 for(const n of nodes.filter(n=>n.type==='deck'))connect(byId[n.parentId],n,c.bridgeWidth*.76);
 return {nodes,links};
}
function tube(g,a,b,radius,material){
 const len=Math.hypot(b[0]-a[0],b[1]-a[1],b[2]-a[2]);
 if(len>.00001)rod(g,a,b,radius,material);
}
function simpleDeck(g,x,z,w,d,y=DECK_Y){
 box(g,x,y-.09,z,w,.15,d,mat.dark);
 const planks=Math.max(4,Math.round(w/.125));
 for(let i=0;i<planks;i++){
  const xx=x-w/2+(i+.5)*w/planks;
  box(g,xx,y+.005,z,w/planks-.006,.035,d,mat.wood);
 }
}
function cornerPosts(g,node,roofHeight,hasRoof,c){
 // One structural post per corner, continuous from alluvial soil to the eave.
 // No duplicated floor supports and no overlaid posts from the walkway.
 const corners=[];
 for(const sx of [-1,1])for(const sz of [-1,1]){
  const px=node.x+sx*node.w*.45,pz=node.z+sz*node.d*.45;
  const ground=height(px,pz,c)-.10;
  const cap=hasRoof?roofHeight:DECK_Y+.51;
  tube(g,[px,ground,pz],[px,cap,pz],hasRoof?.040:.034,mat.dark);
  corners.push({x:px,z:pz});
 }
 return corners;
}
function faceEndpoints(node,face){
 const x=node.x,z=node.z,hw=node.w*.45,hd=node.d*.45;
 if(face==='north')return [{x:x-hw,z:z-hd},{x:x+hw,z:z-hd}];
 if(face==='south')return [{x:x-hw,z:z+hd},{x:x+hw,z:z+hd}];
 if(face==='east')return [{x:x+hw,z:z-hd},{x:x+hw,z:z+hd}];
 return [{x:x-hw,z:z-hd},{x:x-hw,z:z+hd}];
}
function perimeterRails(g,node){
 if(cfg.structures?.railings===false)return;
 for(const face of ['north','east','south','west']){
  // Each connector face is an open passage: no rails through the doorway.
  if(node.openFaces.has(face))continue;
  const [a,b]=faceEndpoints(node,face);
  tube(g,[a.x,DECK_Y+.46,a.z],[b.x,DECK_Y+.46,b.z],.017,mat.rope);
  tube(g,[a.x,DECK_Y+.24,a.z],[b.x,DECK_Y+.24,b.z],.013,mat.wood);
 }
}
function hutRoof(g,node,eave){
 // Preserve the simple, low pitched-roof silhouette from GD4.
 const x=node.x,z=node.z,w=node.w,d=node.d,y=eave;
 const positions=[
  x-w*.58,y,z-d*.6,x,y+w*.35,z-d*.6,x,y+w*.35,z+d*.6,
  x-w*.58,y,z-d*.6,x,y+w*.35,z+d*.6,x-w*.58,y,z+d*.6,
  x,y+w*.35,z-d*.6,x+w*.58,y,z-d*.6,x+w*.58,y,z+d*.6,
  x,y+w*.35,z-d*.6,x+w*.58,y,z+d*.6,x,y+w*.35,z+d*.6
 ];
 const geo=new THREE.BufferGeometry();
 geo.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geo.computeVertexNormals();
 const mesh=new THREE.Mesh(geo,mat.roof);mesh.castShadow=true;mesh.receiveShadow=true;g.add(mesh);
 tube(g,[x,y+w*.35,z-d*.61],[x,y+w*.35,z+d*.61],.024,mat.dark);
}
function platformNode(g,node,c){
 const roofed=node.type==='hut',roofOn=roofed&&c.structures?.roofs!==false;
 const eave=DECK_Y+.96*(c.structures?.scale??100)/100;
 simpleDeck(g,node.x,node.z,node.w,node.d);
 cornerPosts(g,node,eave,roofOn,c);
 perimeterRails(g,node);
 if(roofOn)hutRoof(g,node,eave);
 if(node.type==='entry'){
  // A small entry sign without overlapping the corner structural supports.
  const z=node.z;
  tube(g,[node.x-.23,DECK_Y,z],[node.x-.23,DECK_Y+.62,z],.026,mat.wood);
  tube(g,[node.x+.23,DECK_Y,z],[node.x+.23,DECK_Y+.62,z],.026,mat.wood);
  tube(g,[node.x-.25,DECK_Y+.62,z],[node.x+.25,DECK_Y+.62,z],.030,mat.wood);
 }
}
function routeLength(path){
 let len=0;const lengths=[0];
 for(let i=1;i<path.length;i++){len+=Math.hypot(path[i].x-path[i-1].x,path[i].z-path[i-1].z);lengths.push(len);}
 return {lengths,total:len};
}
function pointOnRoute(path,lengths,s){
 const total=lengths[lengths.length-1];
 const d=clamp(s,0,total);
 let k=1;while(k<lengths.length-1&&lengths[k]<d)k++;
 const a=path[k-1],b=path[k],den=lengths[k]-lengths[k-1]||1;
 const t=clamp((d-lengths[k-1])/den,0,1);
 const dx=b.x-a.x,dz=b.z-a.z,l=Math.hypot(dx,dz)||1;
 return {x:a.x+dx*t,z:a.z+dz*t,nx:-dz/l,nz:dx/l};
}
function walkway(g,link,c){
 const path=link.path,w=link.width,st=c.structures??{},y=DECK_Y;
 const {lengths,total}=routeLength(path);
 if(total<.03)return;
 // Continuous dark underdeck avoids triangle gaps between curved planks.
 const vertices=[],faces=[];
 for(let i=0;i<path.length;i++){
  const p=path[i],q=path[Math.max(0,i-1)],r=path[Math.min(i+1,path.length-1)];
  const dx=r.x-q.x,dz=r.z-q.z,l=Math.hypot(dx,dz)||1,nx=-dz/l,nz=dx/l;
  vertices.push(p.x+nx*w/2,y-.047,p.z+nz*w/2,p.x-nx*w/2,y-.047,p.z-nz*w/2);
  if(i>0){const k=(i-1)*2;faces.push(k,k+1,k+2,k+1,k+3,k+2);}
 }
 const geom=new THREE.BufferGeometry();
 geom.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));geom.setIndex(faces);geom.computeVertexNormals();
 const under=new THREE.Mesh(geom,new THREE.MeshStandardMaterial({color:'#3a2e23',roughness:.97,side:THREE.DoubleSide}));
 under.receiveShadow=true;g.add(under);
 // Actual planks: locally tangent to the track. They end exactly at each platform face.
 const plankN=Math.max(4,Math.ceil(total/.115));
 for(let j=0;j<plankN;j++){
  const a=pointOnRoute(path,lengths,j*total/plankN),b=pointOnRoute(path,lengths,(j+1)*total/plankN);
  const dx=b.x-a.x,dz=b.z-a.z,len=Math.hypot(dx,dz);
  const plank=box(g,(a.x+b.x)/2,y,(a.z+b.z)/2,len+.004,.037,w-.010,j%9===0?mat.dark:mat.wood);
  plank.rotation.y=Math.atan2(-dz,dx);
 }
 // One post per side at each station: its bottom is the foundation and its
 // upper part is the handrail upright. No second pile at the same position.
 const stations=[];
 if(total>.48){
  stations.push(.18);
  for(let s=.18+.62;s<total-.30;s+=.62)stations.push(s);
  if(total-.18-stations[stations.length-1]>.26)stations.push(total-.18);
 }
 for(const side of [-1,1]){
  const railPts=[];
  for(const station of stations){
   const p=pointOnRoute(path,lengths,station);
   const x=p.x+p.nx*side*(w/2+.025),z=p.z+p.nz*side*(w/2+.025);
   const ground=height(x,z,c)-.10;
   tube(g,[x,st.piles!==false?ground:y,z],[x,y+.52,z],.031,mat.dark);
   railPts.push({x,z});
  }
  if(st.railings!==false)for(let i=1;i<railPts.length;i++){
   const a=railPts[i-1],b=railPts[i];
   tube(g,[a.x,y+.48,a.z],[b.x,y+.48,b.z],.016,mat.rope);
   tube(g,[a.x,y+.25,a.z],[b.x,y+.25,b.z],.012,mat.wood);
  }
 }
}
function structures(g,c){
 const graph=structureGraph(c);
 // Distinct links avoid crossing through hut footprints or joining rails
 // across a node. Platforms and walkway supports are built only once.
 for(const link of graph.links)walkway(g,link,c);
 for(const node of graph.nodes)platformNode(g,node,c);
}
function rebuild(){
 if(!cfg)return;
 lowHuts(cfg);
 if(group){scene.remove(group);group.traverse(o=>{if(o.geometry&&!Object.values(G).includes(o.geometry))o.geometry.dispose();});}
 group=new THREE.Group();scene.add(group);channelsNow=channels(cfg);waterMaterials=[];
 terrain(group,cfg);if($('#layerWater').checked)for(const ch of channelsNow)water(group,ch);
 if($('#layerForest').checked)forest(group,cfg);
 if($('#layerStructures').checked)structures(group,cfg);
 $('#status').textContent='Đã sửa mép lạch và lòng nước · 5 chòi thấp';
}
function pose(){
 camera.position.set(pivot.target.x+pivot.distance*Math.sin(pivot.yaw)*Math.cos(pivot.pitch),pivot.target.y+pivot.distance*Math.sin(pivot.pitch),pivot.target.z+pivot.distance*Math.cos(pivot.yaw)*Math.cos(pivot.pitch));camera.lookAt(pivot.target);
}
function resize(){const w=mount.clientWidth||innerWidth,h=mount.clientHeight||innerHeight;renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();pose();}
new ResizeObserver(resize).observe(mount);
renderer.domElement.addEventListener('pointerdown',e=>{pivot.drag=true;pivot.x=e.clientX;pivot.y=e.clientY;renderer.domElement.setPointerCapture(e.pointerId);});
renderer.domElement.addEventListener('pointermove',e=>{if(!pivot.drag)return;const dx=e.clientX-pivot.x,dy=e.clientY-pivot.y;pivot.x=e.clientX;pivot.y=e.clientY;pivot.yaw-=dx*.006;pivot.pitch=clamp(pivot.pitch+dy*.005,.15,1.53);pose();});
['pointerup','pointercancel','lostpointercapture'].forEach(t=>renderer.domElement.addEventListener(t,()=>pivot.drag=false));
renderer.domElement.addEventListener('wheel',e=>{e.preventDefault();pivot.distance=clamp(pivot.distance*Math.exp(e.deltaY*.0007),7,34);pose();},{passive:false});
$('#camReset').onclick=()=>{pivot.yaw=.70;pivot.pitch=.58;pivot.distance=21;pose();};
$('#camTop').onclick=()=>{pivot.yaw=0;pivot.pitch=1.52;pivot.distance=17;pose();};
$('#camNear').onclick=()=>{pivot.yaw=.95;pivot.pitch=.47;pivot.distance=12;pose();};
$('#toggleControls').onclick=()=>$('#panel').classList.toggle('closed');
for(const id of ['layerForest','layerWater','layerStructures'])$('#'+id).addEventListener('change',rebuild);
$('#density').oninput=e=>{cfg.ecosystem.density=Number(e.target.value);$('#densityValue').textContent=e.target.value+'%';clearTimeout(window.__gd4Rebuild);window.__gd4Rebuild=setTimeout(rebuild,180);};
$('#light').oninput=e=>{const v=Number(e.target.value)/100;sunlight.intensity=.85+v*2.3;hemi.intensity=.90+v*.94;renderer.toneMappingExposure=1.00+v*.43;$('#lightValue').textContent=e.target.value+'%';};
$('#fog').oninput=e=>{scene.fog.density=.002+Number(e.target.value)*.00022;$('#fogValue').textContent=e.target.value+'%';};
$('#night').onclick=()=>{$('#light').value=15;$('#light').dispatchEvent(new Event('input'));$('#fog').value=65;$('#fog').dispatchEvent(new Event('input'));};
$('#dusk').onclick=()=>{$('#light').value=66;$('#light').dispatchEvent(new Event('input'));$('#fog').value=24;$('#fog').dispatchEvent(new Event('input'));};
$('#landExpand').oninput=e=>{GD4B.landExpansion=Number(e.target.value)/100;$('#landExpandValue').textContent=e.target.value+'%';rebuild();};
$('#waterInset').oninput=e=>{GD4B.waterInset=Number(e.target.value)/100;$('#waterInsetValue').textContent=e.target.value+'%';rebuild();};
function token(c){const a=new TextEncoder().encode(JSON.stringify(c));let s='';for(const v of a)s+=String.fromCharCode(v);return btoa(s).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');}
function unpack(t){const str=atob(t.replace(/-/g,'+').replace(/_/g,'/'));return JSON.parse(new TextDecoder().decode(Uint8Array.from(str,c=>c.charCodeAt(0))));}
function valid(c){return c&&Number.isFinite(c.rx)&&Number.isFinite(c.rz)&&Array.isArray(c.sites)&&c.water&&Array.isArray(c.water.main);}
$('#edit').onclick=()=>location.href='./studio.html#layout='+token(cfg);
$('#export').onclick=()=>{cfg.appearance={landExpansion:GD4B.landExpansion,waterInset:GD4B.waterInset};const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([JSON.stringify({...cfg,_version:'stage-4-preview'},null,2)],{type:'application/json'}));a.download='CanGio_GD4_VatLieu.json';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),500);};
$('#import').onclick=()=>$('#jsonInput').click();
$('#jsonInput').onchange=async e=>{const f=e.target.files[0];if(!f)return;try{const c=JSON.parse(await f.text());if(!valid(c))throw Error('Cấu hình không hợp lệ');cfg=lowHuts(c);sync();rebuild();}catch(err){alert(err.message)}e.target.value='';};
$('#reset').onclick=async()=>{try{const res=await fetch('./layouts/CanGio_GD4_v2.json',{cache:'no-store'});if(!res.ok)throw Error('HTTP '+res.status);cfg=lowHuts(await res.json());sync();rebuild();}catch(e){alert('Không thể khôi phục GD4: '+e.message)}};
$('#photo').onclick=()=>{renderer.render(scene,camera);const a=document.createElement('a');a.href=renderer.domElement.toDataURL('image/png');a.download='CanGio-GD4.png';a.click();};
function sync(){if(cfg.appearance){GD4B.landExpansion=clamp(Number(cfg.appearance.landExpansion)||1.24,1.06,1.45);GD4B.waterInset=clamp(Number(cfg.appearance.waterInset)||.76,.48,.91);}$('#landExpand').value=Math.round(GD4B.landExpansion*100);$('#landExpandValue').textContent=Math.round(GD4B.landExpansion*100)+'%';$('#waterInset').value=Math.round(GD4B.waterInset*100);$('#waterInsetValue').textContent=Math.round(GD4B.waterInset*100)+'%';if(!cfg.ecosystem)cfg.ecosystem={density:100,height:100};if(!cfg.structures)cfg.structures={scale:100};$('#density').value=cfg.ecosystem.density;$('#densityValue').textContent=cfg.ecosystem.density+'%';$('#layout').textContent='Đảo '+cfg.rx+' × '+cfg.rz+' · '+cfg.sites.length+' điểm công trình';}
async function init(){
 try{const response=await fetch('./layouts/CanGio_GD4_v2.json',{cache:'no-store'});if(!response.ok)throw Error('HTTP '+response.status);cfg=await response.json();
 if(location.hash.startsWith('#layout=')){try{const val=unpack(location.hash.slice(8));if(valid(val))cfg=lowHuts(val);}catch(e){console.warn('Không thể nhập liên kết:',e);}}
 lowHuts(cfg);sync();resize();rebuild();$('#light').dispatchEvent(new Event('input'));$('#fog').dispatchEvent(new Event('input'));$('#loading').hidden=true;
 }catch(e){console.error(e);$('#loading').textContent='Lỗi nạp cảnh: '+e.message;}
}
const clock=new THREE.Clock();
function animate(){requestAnimationFrame(animate);const t=clock.getElapsedTime();for(const obj of waterMaterials)obj.object.position.y=Math.sin(t*.38)*.008;renderer.render(scene,camera);}
animate();init();
