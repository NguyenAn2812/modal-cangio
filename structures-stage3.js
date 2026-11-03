/* Vòng Xơ Cần Giờ — GD3 công trình/đường đi.
 * Bản phác 2.5D Canvas bám theo 6 điểm GD1 (không sửa tọa độ).
 * Mặt sàn, ván gỗ, lan can, cọc chịu lực, chòi, tháp và lối nhánh.
 */
(()=>{'use strict';
const TAU=Math.PI*2;
const C={wood:'#805f42',wood2:'#a07e56',plank:'#947450',plankAlt:'#7c5d40',
   dark:'#35271f',edge:'#4f3b2b',rail:'#b4956a',rope:'#c4ad83',
   roof:'#4d4030',roof2:'#756046',roofRidge:'#a18761',lamp:'#d7ac61'};
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
function catmull(points,steps=14){
  const out=[];
  for(let i=0;i<points.length-1;i++){
    const p0=points[Math.max(0,i-1)],p1=points[i],p2=points[i+1],p3=points[Math.min(points.length-1,i+2)];
    for(let j=0;j<steps;j++){
      const t=j/steps,t2=t*t,t3=t2*t;
      const f=k=>.5*(2*p1[k]+(-p0[k]+p2[k])*t+(2*p0[k]-5*p1[k]+4*p2[k]-p3[k])*t2+(-p0[k]+3*p1[k]-3*p2[k]+p3[k])*t3);
      out.push({x:f('x'),z:f('z')});
    }
  }
  return [...out,points.at(-1)];
}
function plan(config){
  return catmull(config.sites.map(s=>({x:s.x*config.rx,z:s.z*config.rz})),18);
}
function settings(config){
  return Object.assign({scale:100,railings:true,piles:true,spurs:true,roofs:true},config.structures||{});
}
function point(p,y){return {x:p.x,y,z:p.z};}
function seg(ctx,a,b,col,width){
  ctx.strokeStyle=col;ctx.lineWidth=width;ctx.lineCap='round';ctx.lineJoin='round';
  ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();
}
function chain(ctx,points,col,width){
  if(points.length<2)return;
  ctx.strokeStyle=col;ctx.lineWidth=width;ctx.lineJoin='round';ctx.lineCap='round';
  ctx.beginPath();ctx.moveTo(points[0].x,points[0].y);
  for(let i=1;i<points.length;i++)ctx.lineTo(points[i].x,points[i].y);
  ctx.stroke();
}
function face(ctx,points,col,stroke){
  if(!points.length)return;
  ctx.fillStyle=col;ctx.beginPath();ctx.moveTo(points[0].x,points[0].y);
  for(let i=1;i<points.length;i++)ctx.lineTo(points[i].x,points[i].y);
  ctx.closePath();ctx.fill();
  if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=.8;ctx.stroke();}
}
function viewProj(env){
  return p=>env.p3(p,env.view.width,env.view.height);
}
function perp(a,b){
  const dx=b.x-a.x,dz=b.z-a.z,l=Math.hypot(dx,dz)||1;
  return {x:-dz/l,z:dx/l};
}
function side(pos,v,offset,y){return {x:pos.x+v.x*offset,z:pos.z+v.z*offset,y};}
function getDeckY(config){return 1.54;}
function drawBoardwalk(ctx,env,points,{width,sideRails=true,posts=true}={}){
  if(points.length<2)return;
  const cfg=env.config,s=settings(cfg),P=viewProj(env),k=env.scale;
  const w=width||cfg.bridgeWidth,half=w*.5,deck=getDeckY(cfg);
  // Understructure, supporting piles and cross beams.
  const rails=[[],[]],baseRails=[[],[]];
  for(let i=0;i<points.length-1;i++){
    let a=points[i],b=points[i+1],t=perp(a,b);
    const q0=side(a,t,half,deck),q1=side(a,t,-half,deck);
    const q2=side(b,t,-half,deck),q3=side(b,t,half,deck);
    const under=[q0,q1,q2,q3].map(p=>P({...p,y:deck-.075}));
    face(ctx,under,C.dark);
    face(ctx,[q0,q1,q2,q3].map(P),i%4===0?C.wood2:(i%2?C.plank:C.plankAlt),C.edge);
    if(i%2===0){
      seg(ctx,P(q0),P(q1),'rgba(40,29,20,.44)',Math.max(.55,k*.010));
      const nail=P({x:(a.x+b.x)*.5,y:deck+.003,z:(a.z+b.z)*.5});
      ctx.fillStyle='rgba(43,35,27,.7)';ctx.beginPath();ctx.arc(nail.x,nail.y,Math.max(.48,k*.006),0,TAU);ctx.fill();
    }
    if(i%7===0||i===points.length-2){
      for(const sign of [-1,1]){
        let pivot=side(a,t,sign*(half+.04),deck);
        baseRails[sign<0?0:1].push(P(pivot));
        rails[sign<0?0:1].push(P({...pivot,y:deck+.53}));
        if(posts&&s.piles&&i%14===0){
          const mud=env.topo(pivot.x,pivot.z,env.channels).y;
          seg(ctx,P({...pivot,y:mud-.09}),P({...pivot,y:deck+.09}),C.edge,Math.max(1,k*.05));
          seg(ctx,P({...pivot,y:mud-.06}),P({...pivot,y:deck+.07}),C.wood,Math.max(.8,k*.028));
        }
        if(sideRails&&s.railings){
          seg(ctx,P(pivot),P({...pivot,y:deck+.57}),C.dark,Math.max(1,k*.046));
          seg(ctx,P({...pivot,y:deck+.07}),P({...pivot,y:deck+.56}),C.wood2,Math.max(.7,k*.026));
          const cap=P({...pivot,y:deck+.57});
          ctx.fillStyle=C.rope;ctx.beginPath();ctx.arc(cap.x,cap.y,Math.max(.8,k*.019),0,TAU);ctx.fill();
        }
      }
    }
  }
  if(sideRails&&s.railings)for(let n=0;n<2;n++){
    chain(ctx,rails[n],C.rope,Math.max(1,k*.020));
    chain(ctx,baseRails[n],C.edge,Math.max(.65,k*.014));
  }
}
function rectAround(x,z,wx,wz,y){
  return [
    {x:x-wx/2,y,z:z-wz/2},{x:x+wx/2,y,z:z-wz/2},
    {x:x+wx/2,y,z:z+wz/2},{x:x-wx/2,y,z:z+wz/2}
  ];
}
function drawPlatform(ctx,env,x,z,wx,wz,y,{stairs=false,supports=true}={}){
  const P=viewProj(env),k=env.scale,s=settings(env.config);
  const corners=rectAround(x,z,wx,wz,y);
  if(s.piles&&supports)for(const c of corners){
    let ty=env.topo(c.x,c.z,env.channels).y-.11;
    seg(ctx,P({...c,y:ty}),P({...c,y:y+.06}),C.dark,Math.max(2,k*.076));
    seg(ctx,P({...c,y:ty}),P({...c,y:y+.06}),C.wood,Math.max(1.2,k*.048));
  }
  face(ctx,corners.map(p=>P({...p,y:y-.12})),C.dark);
  face(ctx,corners.map(P),C.wood2,C.edge);
  const count=Math.max(4,Math.round(wx/.13));
  for(let i=1;i<count;i++){
    let xx=x-wx/2+wx*i/count;
    seg(ctx,P({x:xx,z:z-wz/2,y:y+.008}),P({x:xx,z:z+wz/2,y:y+.008}),
      i%2?C.edge:'#ba9060',Math.max(.55,k*.010));
  }
  if(stairs){
    for(let i=1;i<4;i++){
      let yy=y-i*.10,zz=z+wz*.5+i*.11;
      seg(ctx,P({x:x-wx*.26,z:zz,y:yy}),P({x:x+wx*.26,z:zz,y:yy}),C.wood2,Math.max(1,k*.035));
    }
  }
  return corners;
}
function platformRails(ctx,env,corners,skipSide=true){
  if(!settings(env.config).railings)return;
  const P=viewProj(env),k=env.scale,y=corners[0].y;
  for(let i=0;i<4;i++){
    if(skipSide&&i===2)continue;
    const a=corners[i],b=corners[(i+1)%4];
    for(const p of [a,b]){
      seg(ctx,P(p),P({...p,y:y+.43}),C.wood,Math.max(1,k*.034));
    }
    chain(ctx,[P({...a,y:y+.43}),P({...b,y:y+.43})],C.rope,Math.max(.9,k*.017));
    chain(ctx,[P({...a,y:y+.21}),P({...b,y:y+.21})],C.edge,Math.max(.8,k*.017));
  }
}
function drawRoof(ctx,env,x,z,wx,wz,eave){
  const P=viewProj(env),k=env.scale;
  const aw=wx*.60,az=wz*.60,rise=wx*.35;
  const a={x:x-aw,y:eave,z:z-az},b={x:x+aw,y:eave,z:z-az},
        c={x:x+aw,y:eave,z:z+az},d={x:x-aw,y:eave,z:z+az};
  const rid0={x,y:eave+rise,z:z-az},rid1={x,y:eave+rise,z:z+az};
  face(ctx,[a,rid0,rid1,d].map(P),C.roof,C.dark);
  face(ctx,[rid0,b,c,rid1].map(P),C.roof2,C.dark);
  seg(ctx,P(rid0),P(rid1),C.roofRidge,Math.max(1.0,k*.028));
  for(let i=1;i<6;i++){
    const f=i/6,zz=z-az+2*az*f;
    seg(ctx,P({x:x-aw,y:eave,z:zz}),P({x,y:eave+rise,z:zz}),i%2?C.edge:C.roofRidge,Math.max(.5,k*.008));
    seg(ctx,P({x,y:eave+rise,z:zz}),P({x:x+aw,y:eave,z:zz}),i%2?C.edge:C.roofRidge,Math.max(.5,k*.008));
  }
}
function drawHut(ctx,env,site){
  const cfg=env.config,s=settings(cfg),P=viewProj(env),k=env.scale,
        x=site.x*cfg.rx,z=site.z*cfg.rz,scale=s.scale/100,
        wx=.77*scale,wz=.72*scale,y=1.56;
  const corners=drawPlatform(ctx,env,x,z,wx,wz,y,{stairs:false,supports:false});
  const top=y+1.04*scale;
  for(const p of corners){
    seg(ctx,P({...p,y:env.topo(p.x,p.z,env.channels).y-.09}),P({...p,y:top}),C.dark,Math.max(2,k*.07*scale));
    seg(ctx,P({...p,y:env.topo(p.x,p.z,env.channels).y-.07}),P({...p,y:top}),C.wood2,Math.max(1.2,k*.039*scale));
  }
  // Door faces remain unobstructed in the plan view. Final railings
  // and their shared posts are drawn in the Three.js viewer.
  if(s.roofs)drawRoof(ctx,env,x,z,wx,wz,top+.06*scale);
  else{
    for(let j=0;j<2;j++){
      const a=corners[j],b=corners[(j+2)%4];
      seg(ctx,P({...a,y:top}),P({...b,y:top}),C.wood,Math.max(1,k*.024));
    }
  }
}
function drawTower(ctx,env,site){
  const cfg=env.config,s=settings(cfg),P=viewProj(env),k=env.scale,x=site.x*cfg.rx,z=site.z*cfg.rz,
        sf=s.scale/100,wx=.70*sf,wz=.66*sf,y=2.55*sf+.18;
  const floor=rectAround(x,z,wx,wz,1.53);
  const corners=rectAround(x,z,wx,wz,y);
  for(let i=0;i<4;i++){
    const c=corners[i],g=env.topo(c.x,c.z,env.channels).y-.12;
    seg(ctx,P({...c,y:g}),P(c),C.dark,Math.max(2,k*.074*sf));
    seg(ctx,P({...c,y:g}),P(c),C.wood2,Math.max(1,k*.039*sf));
    const next=corners[(i+1)%4];
    if(i<3){
      seg(ctx,P({...c,y:1.55}),P({...next,y:y-.10}),C.edge,Math.max(1,k*.025));
      seg(ctx,P({...next,y:1.55}),P({...c,y:y-.10}),C.edge,Math.max(1,k*.025));
    }
  }
  drawPlatform(ctx,env,x,z,wx,wz,y);
  platformRails(ctx,env,corners,true);
  for(const c of corners){
    seg(ctx,P(c),P({...c,y:y+.82*sf}),C.wood2,Math.max(1,k*.045*sf));
  }
  if(s.roofs)drawRoof(ctx,env,x,z,wx,wz,y+.88*sf);
  // External stair with graduated treads, directed along +z away from the tower.
  const n=10,fromZ=z+wz*.49,toZ=z+wz*.49+.9*sf;
  for(let j=0;j<n;j++){
    let f=j/(n-1),zz=fromZ+(toZ-fromZ)*f,yy=y-(y-1.48)*f;
    const half=.20*sf;
    seg(ctx,P({x:x-half,y:yy,z:zz}),P({x:x+half,y:yy,z:zz}),C.roofRidge,Math.max(1,k*.025));
  }
  seg(ctx,P({x:x-wx*.30,y:y+.04,z:fromZ}),P({x:x-wx*.30,y:1.5,z:toZ}),C.wood,Math.max(.85,k*.024));
  seg(ctx,P({x:x+wx*.30,y:y+.04,z:fromZ}),P({x:x+wx*.30,y:1.5,z:toZ}),C.wood,Math.max(.85,k*.024));
}
function drawEntrance(ctx,env,site){
 const cfg=env.config,P=viewProj(env),k=env.scale,x=site.x*cfg.rx,z=site.z*cfg.rz,y=1.52;
 drawPlatform(ctx,env,x,z,.63,.56,y,{stairs:true});
 for(const dx of [-.28,.28])seg(ctx,P({x:x+dx,y,z:z-.12}),P({x:x+dx,y:y+.83,z:z-.12}),C.wood,Math.max(1.2,k*.05));
 seg(ctx,P({x:x-.32,y:y+.82,z:z-.12}),P({x:x+.32,y:y+.82,z:z-.12}),C.rope,Math.max(2,k*.045));
 const label=P({x,y:y+.92,z:z-.12});ctx.save();ctx.fillStyle='#ead7a9';ctx.font='600 10px Segoe UI,sans-serif';ctx.textAlign='center';ctx.fillText('LỐI VÀO',label.x,label.y);ctx.restore();
}
function drawSpurs(ctx,env){
 const cfg=env.config,s=settings(cfg);
 if(!s.spurs||!env.layers.walk)return;
 const spurs=[
 {id:'hut1',ox:-.42,oz:-.27},
 {id:'hut3',ox:.36,oz:-.35},
 {id:'hut4',ox:-.42,oz:.30}
 ];
 for(const sp of spurs){
  const a=cfg.sites.find(site=>site.id===sp.id);if(!a)continue;
  const x=a.x*cfg.rx,z=a.z*cfg.rz,tx=x+sp.ox,tz=z+sp.oz;
  const points=catmull([{x,z},{x:(x+tx)*.5+.08,z:(z+tz)*.5},{x:tx,z:tz}],7);
  drawBoardwalk(ctx,env,points,{width:cfg.bridgeWidth*.76});
  drawPlatform(ctx,env,tx,tz,.49,.46,1.55);
 }
}
function drawLabel(ctx,env,site){
 const P=viewProj(env),cfg=env.config,top=site.type==='tower'?3.9:site.type==='entry'?2.55:3.06,
 q=P({x:site.x*cfg.rx,y:top,z:site.z*cfg.rz}),txt=site.name;
 ctx.save();ctx.font='600 11px Segoe UI,Arial,sans-serif';
 const w=ctx.measureText(txt).width+18;
 ctx.fillStyle='rgba(10,22,16,.82)';ctx.strokeStyle='rgba(192,166,108,.42)';ctx.lineWidth=.7;
 ctx.beginPath();ctx.roundRect(q.x+10,q.y-19,w,24,6);ctx.fill();ctx.stroke();
 ctx.fillStyle='#e8dfc6';ctx.fillText(txt,q.x+19,q.y-4);ctx.restore();
}
// Match the GD4 connector topology; this Canvas preview intentionally
// shows simplified decks without duplicating rail/pile geometry.
function studioPlan(config){
 const k=settings(config).scale/100;
 const nodes=config.sites.map(s=>({id:s.id,type:s.type==='entry'?'entry':'hut',x:s.x*config.rx,z:s.z*config.rz,
   w:s.type==='entry'?.62:.83*k,d:s.type==='entry'?.58:.8*k,site:s}));
 const byId=Object.fromEntries(nodes.map(n=>[n.id,n]));
 if(settings(config).spurs){
  for(const [id,dx,dz]of [['hut1',-1.40,-.25],['hut3',.30,-1.44],['hut4',-1.42,.24]]){
   const n=byId[id];if(!n)continue;
   const dock={id:id+'-deck',type:'deck',parentId:id,x:n.x+dx,z:n.z+dz,w:.48,d:.44};
   nodes.push(dock);byId[dock.id]=dock;
  }
 }
 function port(a,b){
  const dx=b.x-a.x,dz=b.z-a.z;
  if(Math.abs(dx)/(a.w*.5)>=Math.abs(dz)/(a.d*.5)){
   const sg=dx>=0?1:-1;return{x:a.x+sg*a.w*.5,z:a.z,nx:sg,nz:0};
  }
  const sg=dz>=0?1:-1;return{x:a.x,z:a.z+sg*a.d*.5,nx:0,nz:sg};
 }
 const links=[];
 function connect(a,b,width){
  const p=port(a,b),q=port(b,a),dist=Math.hypot(q.x-p.x,q.z-p.z),t=Math.max(.16,Math.min(.72,dist*.22));
  const h1={x:p.x+p.nx*t,z:p.z+p.nz*t},h2={x:q.x+q.nx*t,z:q.z+q.nz*t},path=[];
  const n=Math.max(8,Math.ceil(dist/.09));
  for(let i=0;i<=n;i++){
   const u=i/n,v=1-u;
   path.push({x:v*v*v*p.x+3*v*v*u*h1.x+3*v*u*u*h2.x+u*u*u*q.x,z:v*v*v*p.z+3*v*v*u*h1.z+3*v*u*u*h2.z+u*u*u*q.z});
  }
  links.push({from:a.id,to:b.id,width,path});
 }
 for(let i=1;i<config.sites.length;i++)connect(byId[config.sites[i-1].id],byId[config.sites[i].id],config.bridgeWidth);
 for(const n of nodes.filter(x=>x.type==='deck'))connect(byId[n.parentId],n,config.bridgeWidth*.76);
 return{nodes,links};
}
function render(env){
 const {ctx,config,layers}=env,plan=studioPlan(config);
 if(layers.walk){
  for(const link of plan.links)drawBoardwalk(ctx,env,link.path,{width:link.width,posts:false,sideRails:false});
 }
 if(layers.sites){
  const sites=[...config.sites].sort((a,b)=>env.p3({x:a.x*config.rx,y:0,z:a.z*config.rz},env.view.width,env.view.height).d-
    env.p3({x:b.x*config.rx,y:0,z:b.z*config.rz},env.view.width,env.view.height).d);
  for(const site of sites){
   if(site.type==='entry')drawEntrance(ctx,env,site);
   else drawHut(ctx,env,site);
   if(layers.labels)drawLabel(ctx,env,site);
  }
  for(const n of plan.nodes.filter(x=>x.type==='deck'))drawPlatform(ctx,env,n.x,n.z,n.w,n.d,1.56);
 }
}
function mapOverlay({config,toMap}){
 const plan=studioPlan(config),mapPt=p=>toMap({x:p.x/config.rx,z:p.z/config.rz});
 let out='';
 for(const link of plan.links){
  const d=link.path.map((p,i)=>{const q=mapPt(p);return(i?'L':'M')+q.x.toFixed(2)+' '+q.y.toFixed(2)}).join(' ');
  out+='<path d="'+d+'" fill="none" stroke="#65472f" stroke-width="6.5" stroke-linecap="round" stroke-linejoin="round"/>';
  out+='<path d="'+d+'" fill="none" stroke="#d6ad77" stroke-width="4.0" stroke-linecap="round" stroke-linejoin="round"/>';
 }
 for(const n of plan.nodes){
  const q=mapPt(n),r=n.type==='entry'?4:n.type==='deck'?3:5;
  out+='<rect x="'+(q.x-r)+'" y="'+(q.y-r)+'" width="'+(r*2)+'" height="'+(r*2)+'" rx="1" fill="#987047" stroke="#f2d5a0" stroke-width="1.2"/>';
 }
 return out;
}
window.CangioStructures={render,mapOverlay};
})();