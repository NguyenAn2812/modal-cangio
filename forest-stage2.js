/* Vòng Xơ Cần Giờ — giai đoạn 2: hệ sinh thái dựng bằng mã.
   Cảnh cây dạng 2.5D theo camera của Terrain Studio. Không phải GLB scan thật.
   Tạo sinh vật ổn định theo seed, không thay đổi layout GD1. */
(function(){
'use strict';
const TAU=Math.PI*2;
const palette={
  bark:'#423a2b',barkLight:'#766449',root:'#554632',rootLight:'#958064',
  dark:'#152f24',deep:'#244a30',green:'#335b35',leaf:'#527c43',
  light:'#718f50',glow:'#9cac64',fern:'#477343',mud:'#4c4732'
};
function random(seed){return function(){let t=seed+=0x6D2B79F5;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return((t^t>>>14)>>>0)/4294967296;}}
function clamp(v,a,b){return Math.max(a,Math.min(b,v));}
function distancePath(x,z,points){let d=1e9;for(let i=1;i<points.length;i++){let a=points[i-1],b=points[i],vx=b.x-a.x,vz=b.z-a.z,t=clamp(((x-a.x)*vx+(z-a.z)*vz)/(vx*vx+vz*vz+1e-9),0,1);d=Math.min(d,Math.hypot(x-(a.x+vx*t),z-(a.z+vz*t)));}return d;}
function pathSites(config){return config.sites.map(s=>({x:s.x*config.rx,z:s.z*config.rz}));}
function forestPoints(config,channels){
 const r=random(732891),out=[],route=pathSites(config),total=270;
 for(let i=0;i<total;i++){
   const a=r()*TAU, rad=Math.sqrt(r())*.965;
   const nx=Math.cos(a)*rad,nz=Math.sin(a)*rad;
   const x=nx*config.rx,z=nz*config.rz;
   // Retain the user's three creek centerlines, their mudflats and the main boardwalk.
   const cd=Math.min(...channels.map(ch=>distancePath(x,z,ch.pts)-ch.width*.72));
   const pd=distancePath(x,z,route);
   const minSite=Math.min(...config.sites.map(s=>Math.hypot(x-s.x*config.rx,z-s.z*config.rz)));
   if(cd<.30 || pd<.28 || minSite<.48)continue;
   const wet=cd<1.15;
   let kind = (i%13===0?'nipa':i%7===0?'avicennia':i%3===0?'young':'rhizophora');
   if(wet&&i%5===0)kind='avicennia';
   if(rad>.84&&i%3===0)kind='young';
   const h=(kind==='young'?.65:kind==='nipa'?.75:kind==='avicennia'?1.24:1.50)*(.75+r()*.65);
   out.push({x,z,nx,nz,kind,h,cd,seed:Math.floor(r()*999999),d:i,wet});
 }
 return out;
}
function stroke(ctx,a,b,color,width){ctx.strokeStyle=color;ctx.lineWidth=Math.max(.55,width);ctx.lineCap='round';ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();}
function path(ctx,pts,color,width){ctx.strokeStyle=color;ctx.lineWidth=Math.max(.6,width);ctx.lineJoin='round';ctx.lineCap='round';ctx.beginPath();ctx.moveTo(pts[0].x,pts[0].y);for(let i=1;i<pts.length;i++)ctx.lineTo(pts[i].x,pts[i].y);ctx.stroke();}
function blob(ctx,c,rx,ry,pal,seed){
 const rnd=random(seed),radius=Math.max(1,rx),grad=ctx.createRadialGradient(c.x-rx*.34,c.y-ry*.35,1,c.x,c.y,radius*1.08);
 grad.addColorStop(0,pal[2]);grad.addColorStop(.57,pal[1]);grad.addColorStop(1,pal[0]);
 ctx.fillStyle=grad;ctx.beginPath();
 for(let k=0;k<=16;k++){const a=k/16*TAU,mod=.87+.09*Math.sin(a*5+seed)+.10*Math.cos(a*7-seed*.13);
  const x=c.x+Math.cos(a)*rx*mod,y=c.y+Math.sin(a)*ry*mod;
  if(k===0)ctx.moveTo(x,y);else ctx.lineTo(x,y);}
 ctx.closePath();ctx.fill();
 ctx.fillStyle=pal[3];
 for(let i=0;i<7;i++){let a=rnd()*TAU,rr=Math.sqrt(rnd());ctx.beginPath();ctx.ellipse(c.x+Math.cos(a)*rr*rx*.72,c.y+Math.sin(a)*rr*ry*.72,Math.max(.6,rx*.09),Math.max(.5,ry*.10),a,0,TAU);ctx.fill();}
}
function renderTree(ctx,tree,env){
 const {p3,topo,ch,view,scale,roots,canopy}=env;
 const rnd=random(tree.seed),w=view.width,h=view.height,t=topo(tree.x,tree.z,ch),y=t.y+.04;
 const H=tree.h*canopy,base=p3({x:tree.x,y,z:tree.z},w,h);
 const apex=p3({x:tree.x+.06*H,y:y+H,z:tree.z},w,h);
 const k=Math.max(1,scale),size=tree.kind==='young'?.72:1,leafRadius=H*k*.29*size;
 if(base.x<-180||base.x>w+180||base.y<-220||base.y>h+150)return;
 ctx.save();
 // Soft wet shadow at soil level.
 ctx.fillStyle='rgba(6,20,13,.23)';ctx.beginPath();ctx.ellipse(base.x+5,base.y+5,Math.max(2,k*.27*H),Math.max(1,k*.085*H),0,0,TAU);ctx.fill();
 if(tree.kind==='nipa'){
  const root=p3({x:tree.x,y:y+.22,z:tree.z},w,h);
  for(let i=0;i<7;i++){const a=i/7*TAU+rnd()*.35,xx=Math.cos(a),zz=Math.sin(a),end=p3({x:tree.x+xx*.45*H,y:y+.20+H*.23,z:tree.z+zz*.45*H},w,h);
   const mid=p3({x:tree.x+xx*.19*H,y:y+.18+H*.55,z:tree.z+zz*.18*H},w,h);
   path(ctx,[root,mid,end],i%2?palette.deep:palette.leaf,Math.max(1.8,k*.06*H));
   for(let j=1;j<6;j++){let q=j/6,px=mid.x*(1-q)+end.x*q,py=mid.y*(1-q)+end.y*q;blob(ctx,{x:px,y:py},Math.max(2,k*.06*H),Math.max(1.6,k*.025*H),[palette.deep,palette.green,palette.light,palette.glow],tree.seed+i*50+j);}
  }
  ctx.restore();return;
 }
 // Mangrove prop-roots or aerial pneumatophores, distinct silhouettes.
 if(roots&&tree.kind!=='young'){
   const count=tree.kind==='avicennia'?7:10;
   for(let j=0;j<count;j++){
    const a=j/count*TAU+(rnd()-.5)*.3,dist=(.22+rnd()*.2)*H,xx=Math.cos(a),zz=Math.sin(a);
    if(tree.kind==='avicennia'){
      const x=tree.x+xx*dist,z=tree.z+zz*dist,b=p3({x,y:topo(x,z,ch).y+.02,z},w,h),topp=p3({x,y:topo(x,z,ch).y+.06+rnd()*.10,z},w,h);
      stroke(ctx,b,topp,palette.root,Math.max(.8,k*.016));
    }else{
      const start=p3({x:tree.x+xx*.06,y:y+H*(.32+rnd()*.19),z:tree.z+zz*.06},w,h);
      const mid=p3({x:tree.x+xx*dist*.5,y:y+H*.12,z:tree.z+zz*dist*.5},w,h);
      const end=p3({x:tree.x+xx*dist,y:topo(tree.x+xx*dist,tree.z+zz*dist,ch).y,z:tree.z+zz*dist},w,h);
      path(ctx,[start,mid,end],palette.root,Math.max(1.0,k*.034*H));
      path(ctx,[start,{x:mid.x-1,y:mid.y-1}],palette.rootLight,Math.max(.6,k*.008*H));
    }
   }
 }
 stroke(ctx,base,apex,palette.bark,Math.max(1.5,k*.08*H));
 stroke(ctx,{x:base.x-.9,y:base.y},{x:apex.x-1.1,y:apex.y},palette.barkLight,Math.max(.65,k*.016*H));
 for(let i=0;i<5;i++){
   const a=i*TAU/5+rnd()*.6,ux=Math.cos(a),uz=Math.sin(a),len=H*(.18+rnd()*.19);
   const start=p3({x:tree.x,y:y+H*(.58+rnd()*.12),z:tree.z},w,h);
   const finish=p3({x:tree.x+ux*len,y:y+H*(.76+rnd()*.18),z:tree.z+uz*len},w,h);
   stroke(ctx,start,finish,palette.bark,Math.max(1,k*.029*H));
 }
 const colors=tree.kind==='avicennia'?
 [palette.dark,'#294f3d','#527c60','#a0b47b']:
 [palette.dark,palette.deep,palette.leaf,palette.glow];
 const clusters=tree.kind==='young'?5:tree.kind==='avicennia'?8:11;
 for(let i=0;i<clusters;i++){
  const a=i*2.399+tree.seed*.0001,rad=Math.sqrt((i+.7)/clusters)*.38*H,dx=Math.cos(a)*rad,dz=Math.sin(a)*rad;
  const yy=y+H*(.76+.15*(rnd()-.5)),center=p3({x:tree.x+dx,y:yy,z:tree.z+dz},w,h);
  const rr=leafRadius*(.44+.24*rnd());
  blob(ctx,center,rr,rr*(.40+.16*rnd()),colors,tree.seed+i*47);
 }
 // Tiny individual glossy leaves catch the canopy light; they help avoid "cotton balls".
 ctx.fillStyle='#9aa971';
 for(let i=0;i<(tree.kind==='young'?3:12);i++){
  const a=rnd()*TAU,rad=Math.sqrt(rnd())*leafRadius*.93;
  const cx=apex.x+Math.cos(a)*rad,cy=apex.y+Math.sin(a)*rad*.43;
  ctx.beginPath();ctx.ellipse(cx,cy,Math.max(.8,k*.016*H),Math.max(.45,k*.008*H),a*.6,0,TAU);ctx.fill();
 }
 ctx.restore();
}
function renderUnderstory(ctx,tree,env){
 const {p3,topo,ch,view,scale}=env,w=view.width,h=view.height,rnd=random(tree.seed+9012),Y=topo(tree.x,tree.z,ch).y+.04;
 const b=p3({x:tree.x,y:Y,z:tree.z},w,h),k=Math.max(.8,scale);
 if(tree.d%3===0){
  for(let i=0;i<5;i++){
   const a=i*TAU/5+rnd()*.4,tip=p3({x:tree.x+Math.cos(a)*.14,y:Y+.18+rnd()*.12,z:tree.z+Math.sin(a)*.14},w,h);
   stroke(ctx,b,tip,'#455b32',Math.max(1,k*.015));
   ctx.fillStyle=i%2?'#476e3d':'#719454';
   ctx.beginPath();ctx.ellipse(tip.x,tip.y,Math.max(1.7,k*.045),Math.max(1,k*.022),a,0,TAU);ctx.fill();
  }
 }
 if(tree.wet&&tree.d%4===0){
  for(let i=0;i<6;i++){
   const a=i*TAU/6+rnd()*.3,dx=Math.cos(a)*.15,dz=Math.sin(a)*.15;
   const start=p3({x:tree.x+dx,y:Y,z:tree.z+dz},w,h);
   const end=p3({x:tree.x+dx,y:Y+.065+rnd()*.065,z:tree.z+dz},w,h);
   stroke(ctx,start,end,palette.root,Math.max(.7,k*.012));
  }
 }
}
function render(opts){
 const {ctx,p3,topo,channels,config,view,scale,layers}=opts;
 if(!layers.forest && !layers.understory)return;
 const density=clamp((config.ecosystem?.density??75)/100,.15,1.5);
 const canopy=clamp((config.ecosystem?.height??100)/100,.5,1.65);
 let points=forestPoints(config,channels);
 const selected=points.filter((p,i)=>i%19<Math.round(density*11)); // stable thinning at any density.
 selected.sort((a,b)=>p3({x:a.x,y:0,z:a.z},view.width,view.height).d-p3({x:b.x,y:0,z:b.z},view.width,view.height).d);
 const env={p3,topo,ch:channels,view,scale,roots:layers.roots,canopy};
 if(layers.understory)for(const p of selected)renderUnderstory(ctx,p,env);
 if(layers.forest)for(const p of selected)renderTree(ctx,p,env);
 return selected.length;
}
function mapDots(opts){
 const {config,channels}=opts;
 const points=forestPoints(config,channels),density=clamp((config.ecosystem?.density??75)/100,.15,1.5);
 return points.filter((p,i)=>i%19<Math.round(density*11)).map((p,i)=>{
 const cx=(170+p.nx*120).toFixed(1),cy=(137+p.nz*100).toFixed(1),rad=p.kind==='young'?1.25:2.2;
 return '<circle cx="'+cx+'" cy="'+cy+'" r="'+rad+'" fill="#3b7250" opacity=".75"/>';
 }).join('');
}
window.MangroveForest={render,mapDots};
})();