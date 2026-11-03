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
function coast(theta,r,c){const wig=1+.038*Math.sin(5*theta+.2)+.032*Math.cos(9*theta+.8)+.016*Math.sin(17*theta+1);return [c.rx*GD4B.landExpansion*r*wig*Math.cos(theta),c.rz*GD4B.landExpansion*r*wig*Math.sin(theta)];}
function mask(x,z,c){const angle=Math.atan2(z/c.rz,x/c.rx);const wig=1+.038*Math.sin(5*angle+.2)+.032*Math.cos(9*angle+.8)+.016*Math.sin(17*angle+1);return Math.hypot(x/c.rx,z/c.rz)/(wig*GD4B.landExpansion);}
function height(x,z,c){const d=riverD(x,z),r=mask(x,z,c);const noise=.31*Math.sin(x*1.2+z*.4)*Math.cos(z*1.56-x*.45)+.20*Math.sin(x*2.9-z*1.4)+.13*Math.cos(x*4.2+z*3.3);return 1.20+.13*noise-.15*Math.max(0,r-.78)-.72*Math.pow(Math.max(0,1-d/(.54+c.bank*2.1)),1.5);}
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
 const radial=50,angular=168,positions=[],colors=[],uv=[],indices=[];
 const shade=new THREE.Color(),wet=new THREE.Color('#a69a81'),dry=new THREE.Color('#bac7a0');
 for(let ri=0;ri<=radial;ri++)for(let aj=0;aj<=angular;aj++){const [x,z]=coast(aj/angular*TAU,ri/radial,c),y=height(x,z,c),d=riverD(x,z);positions.push(x,y,z);uv.push(x/3.5,z/3.5);shade.copy(wet).lerp(dry,clamp(d/4,0,1));colors.push(shade.r,shade.g,shade.b);}
 for(let ri=0;ri<radial;ri++)for(let aj=0;aj<angular;aj++){const a=ri*(angular+1)+aj,b=a+angular+1;indices.push(a,b,a+1,b,b+1,a+1);}
 const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geo.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));geo.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));geo.setIndex(indices);geo.computeVertexNormals();
 const top=new THREE.Mesh(geo,mat.mud);top.receiveShadow=true;g.add(top);
 const radii=[1,.98,.91,.79,.59,.38,.13,.013],ys=[0,-.22,-.45,-.81,-1.15,-1.46,-1.73,-1.78],vp=[],vc=[],vt=[],ix=[];
 for(let i=0;i<radii.length;i++)for(let j=0;j<=angular;j++){const [x,z]=coast(j/angular*TAU,radii[i],c);const y=i?1.08+ys[i]*c.thickness/1.4:height(x,z,c)-.025;vp.push(x,y,z);vt.push(j/angular*4,i/7*3);const color=new THREE.Color().setRGB(.83-i*.038,.78-i*.036,.67-i*.031);vc.push(color.r,color.g,color.b);}
 for(let i=0;i<radii.length-1;i++)for(let j=0;j<angular;j++){const a=i*(angular+1)+j,b=a+angular+1;ix.push(a,a+1,b,b,a+1,b+1);}
 const cliffGeo=new THREE.BufferGeometry();cliffGeo.setAttribute('position',new THREE.Float32BufferAttribute(vp,3));cliffGeo.setAttribute('uv',new THREE.Float32BufferAttribute(vt,2));cliffGeo.setAttribute('color',new THREE.Float32BufferAttribute(vc,3));cliffGeo.setIndex(ix);cliffGeo.computeVertexNormals();const wall=new THREE.Mesh(cliffGeo,mat.wall);wall.castShadow=true;wall.receiveShadow=true;g.add(wall);
}
function water(g,ch){
 const positions=[],uv=[],index=[];
 for(let i=0;i<ch.p.length;i++){
  const p=ch.p[i],a=ch.p[Math.max(0,i-1)],b=ch.p[Math.min(ch.p.length-1,i+1)],dx=b.x-a.x,dz=b.z-a.z,l=Math.hypot(dx,dz)||1;
  const taper=Math.pow(Math.max(0,Math.sin(Math.PI*i/(ch.p.length-1))),.72);const width=ch.w*GD4B.waterInset*(.025+.975*taper);for(const sign of [-1,1]){positions.push(p.x-dz/l*sign*width,.72,p.z+dx/l*sign*width);uv.push(sign<0?0:1,i/13);}
 }
 for(let i=0;i<ch.p.length-1;i++){const a=i*2;index.push(a,a+1,a+2,a+1,a+3,a+2);}
 const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geo.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));geo.setIndex(index);geo.computeVertexNormals();
 const m=new THREE.MeshPhysicalMaterial({color:'#38564b',roughness:.29,metalness:.06,transparent:true,opacity:.94,clearcoat:.45,clearcoatRoughness:.22,side:THREE.DoubleSide,depthWrite:false});
 const obj=new THREE.Mesh(geo,m);obj.renderOrder=3;obj.receiveShadow=true;g.add(obj);
 waterMaterials.push({object:obj,initial:.72});
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
 [trunks,leaves,roots].forEach(obj=>{obj.instanceMatrix.needsUpdate=true;obj.castShadow=true;obj.receiveShadow=true;g.add(obj);});
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
function boardwalk(g,path,c,width){
 const y=1.56,w=width||c.bridgeWidth,st=c.structures||{},postsL=[],postsR=[];
 for(let i=0;i<path.length-1;i++){
  const a=path[i],b=path[i+1],dx=b.x-a.x,dz=b.z-a.z,l=Math.hypot(dx,dz);if(l<.004)continue;
  const deck=box(g,(a.x+b.x)/2,y,(a.z+b.z)/2,l+.009,.065,w,i%3===0?mat.dark:mat.wood);deck.rotation.y=Math.atan2(-dz,dx);
 }
 for(let i=0;i<path.length;i+=Math.max(3,Math.floor(path.length/25))){
  const p=path[i],a=path[Math.max(i-1,0)],b=path[Math.min(i+1,path.length-1)],dx=b.x-a.x,dz=b.z-a.z,l=Math.hypot(dx,dz)||1;
  for(const s of [-1,1]){
   const x=p.x-s*dz/l*w*.54,z=p.z+s*dx/l*w*.54;
   if(st.piles!==false)rod(g,[x,height(x,z,c)-.08,z],[x,y+.06,z],.038,mat.dark);
   if(st.railings!==false){rod(g,[x,y,z],[x,y+.48,z],.028,mat.wood);(s<0?postsL:postsR).push({x,z});}
  }
 }
 if(st.railings!==false)for(const ps of [postsL,postsR])for(let i=1;i<ps.length;i++)rod(g,[ps[i-1].x,y+.43,ps[i-1].z],[ps[i].x,y+.43,ps[i].z],.015,mat.rope);
}
function roof(g,x,z,w,d,y){
 const positions=[x-w*.58,y,z-d*.6,x,y+w*.35,z-d*.6,x,y+w*.35,z+d*.6,x-w*.58,y,z-d*.6,x,y+w*.35,z+d*.6,x-w*.58,y,z+d*.6,x,y+w*.35,z-d*.6,x+w*.58,y,z-d*.6,x+w*.58,y,z+d*.6,x,y+w*.35,z-d*.6,x+w*.58,y,z+d*.6,x,y+w*.35,z+d*.6];
 const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geo.computeVertexNormals();
 const mesh=new THREE.Mesh(geo,mat.roof);mesh.castShadow=true;mesh.receiveShadow=true;g.add(mesh);
 rod(g,[x,y+w*.35,z-d*.61],[x,y+w*.35,z+d*.61],.025,mat.dark);
}
function deckPlatform(g,x,z,w,d,y,c){
 box(g,x,y-.065,z,w,.13,d,mat.dark);
 for(let j=0;j<6;j++)box(g,x-w/2+(j+.5)*w/6,y+.013,z,w/6-.008,.026,d,mat.wood);
 for(const sx of [-1,1])for(const sz of [-1,1]){
  const xx=x+sx*w*.44,zz=z+sz*d*.44;rod(g,[xx,height(xx,zz,c)-.10,zz],[xx,y,zz],.045,mat.dark);
 }
}
function hut(g,s,c,isTower=false){
 const x=s.x*c.rx,z=s.z*c.rz,st=c.structures||{},k=(st.scale??100)/100,w=(isTower?.9:.83)*k,d=.8*k,y=isTower?1.5+2.55*k:1.57,top=y+(isTower?.82:.96)*k;
 deckPlatform(g,x,z,w,d,y,c);
 for(const sx of [-1,1])for(const sz of [-1,1]){
  const xx=x+sx*w*.43,zz=z+sz*d*.43;
  rod(g,[xx,isTower?height(xx,zz,c):y,zz],[xx,top,zz],isTower?.051:.04,mat.dark);
 }
 if(isTower){
  for(let i=0;i<4;i++){const za=z+(i%2?d*.43:-d*.43),zb=z+(i%2?-d*.43:d*.43),xx=x+(i<2?w*.43:-w*.43);rod(g,[xx,1.55,za],[xx,y-.08,zb],.022,mat.wood);}
  for(let i=0;i<11;i++){const t=i/10;box(g,x,y-(y-1.50)*t,z+d*.43+t*.93*k,.36*k,.035,.09*k,mat.wood);}
 }
 if(st.railings!==false){
  for(const side of [-1,1]){
   const xx=x+side*w*.47;rod(g,[xx,y+.38,z-d*.44],[xx,y+.38,z+d*.44],.016,mat.rope);
   rod(g,[x-w*.45,y+.38,z+side*d*.47],[x+w*.45,y+.38,z+side*d*.47],.016,mat.rope);
  }
 }
 if(st.roofs!==false)roof(g,x,z,w,d,top);
}
function structures(g,c){
 const ps=smooth(c.sites.map(s=>({x:s.x*c.rx,z:s.z*c.rz})),22);
 boardwalk(g,ps,c,c.bridgeWidth);
 for(const s of c.sites){
  if(s.type==='hut')hut(g,s,c,false);
  else if(s.type==='tower')hut(g,s,c,true);
  else if(s.type==='entry'){
   const x=s.x*c.rx,z=s.z*c.rz;deckPlatform(g,x,z,.62,.58,1.57,c);rod(g,[x-.32,1.57,z],[x-.32,2.22,z],.035);rod(g,[x+.32,1.57,z],[x+.32,2.22,z],.035);rod(g,[x-.32,2.22,z],[x+.32,2.22,z],.035);
  }
 }
 if(c.structures?.spurs!==false)for(const [id,dx,dz]of [['hut1',-.4,-.3],['hut3',.36,-.36],['hut4',-.39,.28]]){
  const s=c.sites.find(t=>t.id===id);if(!s)continue;
  const x=s.x*c.rx,z=s.z*c.rz;
  boardwalk(g,smooth([{x,z},{x:x+dx*.55,z:z+dz*.55},{x:x+dx,z:z+dz}],8),c,c.bridgeWidth*.76);
  deckPlatform(g,x+dx,z+dz,.48,.44,1.57,c);
 }
}
function rebuild(){
 if(!cfg)return;
 if(group){scene.remove(group);group.traverse(o=>{if(o.geometry&&!Object.values(G).includes(o.geometry))o.geometry.dispose();});}
 group=new THREE.Group();scene.add(group);channelsNow=channels(cfg);waterMaterials=[];
 terrain(group,cfg);if($('#layerWater').checked)for(const ch of channelsNow)water(group,ch);
 if($('#layerForest').checked)forest(group,cfg);
 if($('#layerStructures').checked)structures(group,cfg);
 $('#status').textContent='Đã cập nhật bản dựng GD4';
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
$('#jsonInput').onchange=async e=>{const f=e.target.files[0];if(!f)return;try{const c=JSON.parse(await f.text());if(!valid(c))throw Error('Cấu hình không hợp lệ');cfg=c;sync();rebuild();}catch(err){alert(err.message)}e.target.value='';};
$('#reset').onclick=async()=>{try{cfg=await(await fetch('./layouts/CanGio_CongTrinh_GD3.json')).json();sync();rebuild();}catch(e){alert('Không mở được GD3: '+e.message)}};
$('#photo').onclick=()=>{renderer.render(scene,camera);const a=document.createElement('a');a.href=renderer.domElement.toDataURL('image/png');a.download='CanGio-GD4.png';a.click();};
function sync(){if(cfg.appearance){GD4B.landExpansion=clamp(Number(cfg.appearance.landExpansion)||1.24,1.06,1.45);GD4B.waterInset=clamp(Number(cfg.appearance.waterInset)||.76,.48,.91);}$('#landExpand').value=Math.round(GD4B.landExpansion*100);$('#landExpandValue').textContent=Math.round(GD4B.landExpansion*100)+'%';$('#waterInset').value=Math.round(GD4B.waterInset*100);$('#waterInsetValue').textContent=Math.round(GD4B.waterInset*100)+'%';if(!cfg.ecosystem)cfg.ecosystem={density:100,height:100};if(!cfg.structures)cfg.structures={scale:100};$('#density').value=cfg.ecosystem.density;$('#densityValue').textContent=cfg.ecosystem.density+'%';$('#layout').textContent='Đảo '+cfg.rx+' × '+cfg.rz+' · '+cfg.sites.length+' điểm công trình';}
async function init(){
 try{const response=await fetch('./layouts/CanGio_GD4_v2.json',{cache:'no-store'});if(!response.ok)throw Error('HTTP '+response.status);cfg=await response.json();
 if(location.hash.startsWith('#layout=')){try{const val=unpack(location.hash.slice(8));if(valid(val))cfg=val;}catch(e){console.warn('Không thể nhập liên kết:',e);}}
 sync();resize();rebuild();$('#light').dispatchEvent(new Event('input'));$('#fog').dispatchEvent(new Event('input'));$('#loading').hidden=true;
 }catch(e){console.error(e);$('#loading').textContent='Lỗi nạp cảnh: '+e.message;}
}
const clock=new THREE.Clock();
function animate(){requestAnimationFrame(animate);const t=clock.getElapsedTime();for(const obj of waterMaterials)obj.object.position.y=Math.sin(t*.38)*.008;renderer.render(scene,camera);}
animate();init();
