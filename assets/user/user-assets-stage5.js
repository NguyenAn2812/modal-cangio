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

function findPlace(c,graph,tools,used,rand){
  // Keep roots clear of creek centers and of 5 roofs plus 8 bridge connections.
  const {mask,height,pathDist,channelsNow}=tools;
  for(let k=0;k<250;k++){
    const a=rand()*2*Math.PI,r=Math.sqrt(rand())*.87;
    const x=c.rx*r*Math.cos(a),z=c.rz*r*Math.sin(a);
    if(mask(x,z,c)>.88)continue;
    if(channelsNow.some(ch=>pathDist(x,z,ch.p)<ch.w+0.42))continue;
    if(graph.nodes.some(n=>Math.abs(x-n.x)<n.w/2+.82&&Math.abs(z-n.z)<n.d/2+.82))continue;
    if(graph.links.some(l=>pathDist(x,z,l.path)<l.width/2+.52))continue;
    if(used.some(p=>Math.hypot(x-p.x,z-p.z)<1.65))continue;
    return {x,z,y:height(x,z,c)};
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
  const rand=randomSeed(518473);
  const graph=tools.structureGraph(c),positions=[];
  const desired=matchMedia('(max-width:700px)').matches?1:3;
  const model=assets.tree;
  for(let i=0;i<desired;i++){
    const p=findPlace(c,graph,tools,positions,rand);if(!p)break;
    positions.push(p);
    const copy=model.clone(true);
    const {scale,box}=normalizeModel(THREE,copy,2.55+i*.31);
    const ctr=box.getCenter(new THREE.Vector3());
    copy.scale.setScalar(scale);
    copy.position.set(-ctr.x*scale,-box.min.y*scale,-ctr.z*scale);
    const pivot=new THREE.Group();pivot.position.set(p.x,p.y,p.z);pivot.rotation.y=rand()*Math.PI*2;
    copy.name='Cây đước thật '+(i+1);pivot.add(copy);g.add(pivot);
  }
  const realCount=positions.length;
  if(assets.branches){
    const branchModel=assets.branches;
    for(let i=0;i<4;i++){
      const p=findPlace(c,graph,tools,positions,rand);if(!p)break;
      positions.push(p);
      const b=branchModel.clone(true);
      const {scale,box}=normalizeModel(THREE,b,.26+rand()*.30);
      const center=box.getCenter(new THREE.Vector3());
      b.scale.setScalar(scale);
      b.position.set(-center.x*scale,-box.min.y*scale+.01,-center.z*scale);
      const pivot=new THREE.Group();pivot.position.set(p.x,p.y,p.z);pivot.rotation.y=rand()*Math.PI*2;
      b.traverse(o=>{if(o.isMesh)o.castShadow=false});
      b.name='Cành khô trên bãi bùn '+(i+1);pivot.add(b);g.add(pivot);
    }
  }
  return realCount;
}
