/* Vòng Xơ Cần Giờ — GD5: supplied models & textures.
   This is kept separate from terrain/bridge geometry; no GD4 coordinates change.
   Original model: ingdearco, CC BY 4.0 (see ATTRIBUTIONS.md). */
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';

const ROOT = './assets/user/';
const clamp = (n,a,b)=>Math.max(a,Math.min(b,n));
const repeat=(THREE,texture,x=1,y=1,color=false)=>{
  texture.wrapS=texture.wrapT=THREE.RepeatWrapping;
  texture.repeat.set(x,y);
  texture.colorSpace=color?THREE.SRGBColorSpace:THREE.NoColorSpace;
  texture.anisotropy=4;
  texture.needsUpdate=true;
  return texture;
};
const loadTexture=(THREE,name)=>new Promise((resolve,reject)=>new THREE.TextureLoader().load(ROOT+name,resolve,undefined,reject));

async function loadCompressedMangrove(){
  const res=await fetch(ROOT+'red-mangrove-tree.glb.gz');
  if(!res.ok)throw Error('GLB response '+res.status);
  if(typeof DecompressionStream==='undefined')throw Error('Trình duyệt không hỗ trợ giải nén GLB gzip');
  const unzipped=res.body.pipeThrough(new DecompressionStream('gzip'));
  const buffer=await new Response(unzipped).arrayBuffer();
  const loader=new GLTFLoader();
  const gltf=await new Promise((resolve,reject)=>loader.parse(buffer,ROOT,resolve,reject));
  gltf.scene.traverse(o=>{
    if(!o.isMesh)return;
    o.frustumCulled=true;
    o.userData.importedAsset=true;
    const leaf=/Leaf|Foliage/i.test(o.material?.name||'')||/Leaf/i.test(o.name||'');
    o.castShadow=!leaf;
    o.receiveShadow=!leaf;
    const materials=Array.isArray(o.material)?o.material:[o.material];
    const fixed=materials.map(m=>{
      if(!m)return m;
      m=m.clone();
      m.transparent=false; // PBR glTF BLEND material otherwise sorts badly in dense forest.
      m.alphaTest=leaf?.32:.10;
      m.depthWrite=true;
      m.side=leaf?2:0; // THREE.DoubleSide for leaves; FrontSide for bark
      m.roughness=Math.max(.78,m.roughness??.9);
      m.needsUpdate=true;
      return m;
    });
    o.material=Array.isArray(o.material)?fixed:fixed[0];
  });
  return gltf.scene;
}

export async function loadCanGioAssets(THREE,materials,onProgress=()=>{}){
  const result={tree:null,branches:null,wood:false,waterNormal:null};
  const gltfLoader=new GLTFLoader();
  const jobs=[
    (async()=>{
      const [color,normal,rough]=await Promise.all([
        loadTexture(THREE,'wood_color.webp'),loadTexture(THREE,'wood_normal.webp'),loadTexture(THREE,'wood_rough.webp')
      ]);
      repeat(THREE,color,1.25,1.25,true);repeat(THREE,normal,1.25,1.25);repeat(THREE,rough,1.25,1.25);
      for(const [name,tint] of [['wood','#eee9dd'],['dark','#9c978b'],['roof','#b1a89b']]){
        const mat=materials[name];
        mat.map=color;mat.normalMap=normal;mat.roughnessMap=rough;
        mat.color.set(tint);mat.normalScale.set(.48,.48);
        mat.roughness=.9;mat.needsUpdate=true;
      }
      result.wood=true;onProgress('Đã gắn bộ ván gỗ xám thật');
    })(),
    (async()=>{
      const map=await loadTexture(THREE,'water_ripple_normal.webp');
      result.waterNormal=repeat(THREE,map,1.8,5.8);
      onProgress('Đã gắn normal gợn mặt nước lợ');
    })(),
    (async()=>{
      result.tree=await loadCompressedMangrove();
      onProgress('Đã nạp model Red Mangrove hoàn chỉnh');
    })(),
    (async()=>{
      const gltf=await gltfLoader.loadAsync(ROOT+'dry_branches/dry_branches_medium_01_1k.gltf');
      result.branches=gltf.scene;
      gltf.scene.traverse(o=>{if(o.isMesh)o.userData.importedAsset=true;});
      onProgress('Đã nạp cụm cành khô');
    })()
  ];
  result.failures=[];
  await Promise.all(jobs.map(async(job,i)=>{
    try{await job;}catch(e){result.failures.push(['wood','water','mangrove','branches'][i]);console.warn('GD5 asset unavailable',i,e);}
  }));
  return result;
}

function treeClearance(c,graph,tools,x,z,height,occupied){
 const {mask,pathDist,channelsNow}=tools;
 if(mask(x,z,c)>.925)return false;
 const bankDist=Math.min(...channelsNow.map(ch=>pathDist(x,z,ch.p)));
 if(bankDist<.36)return false;
 const margin=.46+height*.17;
 if(graph.nodes.some(n=>Math.abs(x-n.x)<n.w/2+margin&&Math.abs(z-n.z)<n.d/2+margin))return false;
 if(graph.links.some(l=>pathDist(x,z,l.path)<l.width/2+margin))return false;
 if(occupied.some(p=>Math.hypot(x-p.x,z-p.z)<(p.height+height)*.36+.55))return false;
 return true;
}
function chooseTreeSite(c,graph,tools,used,anchor,rand){
 const x0=anchor.x*c.rx,z0=anchor.z*c.rz,height=anchor.height;
 if(treeClearance(c,graph,tools,x0,z0,height,used))return{x:x0,z:z0,y:tools.height(x0,z0,c),height};
 let best=null,score=Infinity;
 for(let i=0;i<500;i++){
  const theta=rand()*Math.PI*2,d=Math.sqrt(rand())*1.35;
  const x=x0+Math.cos(theta)*d,z=z0+Math.sin(theta)*d;
  if(!treeClearance(c,graph,tools,x,z,height,used))continue;
  const river=Math.min(...tools.channelsNow.map(ch=>tools.pathDist(x,z,ch.p)));
  const s=d*d+.10*(river-1.15)*(river-1.15);
  if(s<score){score=s;best={x,z,y:tools.height(x,z,c),height};}
 }
 return best;
}
function findDebrisSite(c,graph,tools,used,rand){
 for(let i=0;i<800;i++){
  const a=rand()*Math.PI*2,r=Math.sqrt(rand())*1.12;
  const x=c.rx*r*Math.cos(a),z=c.rz*r*Math.sin(a);
  if(tools.mask(x,z,c)>.94)continue;
  const dist=Math.min(...tools.channelsNow.map(ch=>tools.pathDist(x,z,ch.p)));
  if(dist<.28||dist>1.35)continue;
  if(graph.nodes.some(n=>Math.abs(x-n.x)<n.w/2+.36&&Math.abs(z-n.z)<n.d/2+.36))continue;
  if(graph.links.some(l=>tools.pathDist(x,z,l.path)<l.width/2+.32))continue;
  if(used.some(p=>Math.hypot(x-p.x,z-p.z)<.62))continue;
  return{x,z,y:tools.height(x,z,c)};
 }
 return null;
}
function randomSeed(seed){return()=>{seed=(seed+0x6d2b79f5)|0;let t=seed;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return((t^(t>>>14))>>>0)/4294967296;};}
function normalizeModel(THREE,source,targetHeight){
  const box=new THREE.Box3().setFromObject(source);
  const size=box.getSize(new THREE.Vector3());
  const scalar=targetHeight/Math.max(size.y,.0001);
  return {scale:scalar,box};
}
export function buildActualMangroves(THREE,g,c,assets,tools){
 if(!assets?.tree)return 0;
 const rand=randomSeed(518473),graph=tools.structureGraph(c),occupied=[];
 // Art-directed, reproducible composition; never regenerate a different forest
 // after changing light/fog or orbit. Anchors are editable in the GD5 JSON.
 const anchors=c.ecosystem?.treeLayout?.length?c.ecosystem.treeLayout:[
  {id:'west',x:-.753,z:-.621,height:3.05,yaw:28},
  {id:'east',x:1.036,z:.016,height:2.80,yaw:146},
  {id:'front',x:-.168,z:.840,height:2.58,yaw:253},
  {id:'back',x:.207,z:-.955,height:2.32,yaw:72}
 ];
 const limit=innerWidth<700?1:innerWidth<1000?3:4;
 const source=assets.tree,modelBox=new THREE.Box3().setFromObject(source);
 const size=modelBox.getSize(new THREE.Vector3());
 const center=modelBox.getCenter(new THREE.Vector3());
 const baseScale=1/Math.max(.0001,size.y);
 let count=0;
 for(const [i,anchor] of anchors.slice(0,limit).entries()){
  const p=chooseTreeSite(c,graph,tools,occupied,anchor,rand);
  if(!p)continue;
  occupied.push({...p,height:anchor.height});
  const scale=baseScale*anchor.height;
  const pivot=new THREE.Group();
  pivot.name='Cây đước GLB · '+anchor.id;
  pivot.position.set(p.x,p.y-.035,p.z);
  pivot.rotation.y=(anchor.yaw??0)*Math.PI/180;
  pivot.userData.placement={id:anchor.id,x:p.x,z:p.z,height:anchor.height,manual:true};
  const tree=source.clone(true);
  tree.scale.setScalar(scale);
  tree.position.set(-center.x*scale,-modelBox.min.y*scale,-center.z*scale);
  // Keep GLB materials/textures; mesh geometry is shared by each clone.
  tree.traverse(o=>{if(o.isMesh)o.userData.importedAsset=true;});
  pivot.add(tree);g.add(pivot);count++;
 }
 if(assets.branches){
  const branch=assets.branches;
  for(let i=0;i<7;i++){
   const p=findDebrisSite(c,graph,tools,occupied,rand);if(!p)break;
   occupied.push({...p,height:.18});
   const model=branch.clone(true),bounds=new THREE.Box3().setFromObject(model);
   const size=bounds.getSize(new THREE.Vector3());
   const scale=(.23+rand()*.24)/Math.max(size.y,.01);
   const center=bounds.getCenter(new THREE.Vector3());
   const pivot=new THREE.Group();pivot.name='Cành mục ở bờ bùn '+(i+1);
   pivot.position.set(p.x,p.y+.015,p.z);
   pivot.rotation.set(0,rand()*Math.PI*2,(rand()-.5)*.14);
   model.scale.setScalar(scale);
   model.position.set(-center.x*scale,-bounds.min.y*scale,-center.z*scale);
   model.traverse(o=>{if(o.isMesh){o.castShadow=false;o.userData.importedAsset=true;}});
   pivot.add(model);g.add(pivot);
  }
 }
 return count;
}
