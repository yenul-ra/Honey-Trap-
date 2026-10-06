
const DX=[0,1,0,-1],DY=[-1,0,1,0],$=id=>document.getElementById(id),CD=1.2,TYPES=['EXPLORATION_INFO','DEAD_END_INFO','NEW_AREA_INFO','EXIT_DISCOVERY','EXIT_ROUTE','GENERAL_CONTACT'];
let P={size:21,bees:25,speed:2.2,radius:1.6,rand:.3,mem:.8,share:.8},perf=3,seed=(Math.random()*4e9)>>>0,SPD=1,
W,H,N,open,EXIT,bees,events,pairs,lastT,T,disc,discN,vc,heat,heatMax,routeAny,firstExit,lastExit,finder,exited,done,R,
view=null,replaying=false,running=true,imported=false,sel=-1,live=[],born=new Map(),topP=[],cps=0;
const rng=a=>()=>{a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296};
const ci=(z,x)=>Math.max(0,Math.min(H-1,z|0))*W+Math.max(0,Math.min(W-1,x|0));
/* ---------- maze ---------- */
function genMaze(){const Rm=rng(seed),n=P.size;W=H=n;N=n*n;open=new Uint8Array(N);const vis=new Uint8Array(N),st=[0];vis[0]=1;
 while(st.length){const c=st[st.length-1],x=c%W,y=c/W|0,nb=[];for(let d=0;d<4;d++){const nx=x+DX[d],ny=y+DY[d];if(nx>=0&&ny>=0&&nx<W&&ny<H&&!vis[ny*W+nx])nb.push(d)}
  if(!nb.length){st.pop();continue}const d=nb[Rm()*nb.length|0],m=(y+DY[d])*W+x+DX[d];open[c]|=1<<d;open[m]|=1<<((d+2)%4);vis[m]=1;st.push(m)}
 for(let i=0;i<N*.12;i++){const c=Rm()*N|0,x=c%W,y=c/W|0,d=Rm()*4|0,nx=x+DX[d],ny=y+DY[d];if(nx>=0&&ny>=0&&nx<W&&ny<H){open[c]|=1<<d;open[ny*W+nx]|=1<<((d+2)%4)}}
 EXIT=N-1}
/* ---------- bees ---------- */
const setK=(b,c,v)=>{if(b.know[c]<v){if(v===2)b.knowN++;b.know[c]=v}};
function visit(b,c){if(!b.own[c]){b.own[c]=1;b.ownN++;setK(b,c,2);if(!disc[c]){disc[c]=1;discN++;b.uniq++}}vc[c]++}
function addBee(){if(bees.length>=1000)return;const o=(R()-.5)*.5,b={id:bees.length,x:.5+o,z:.5+(R()-.5)*.5,ox:o,oz:0,cell:0,prev:-1,tgt:-1,wait:Math.min(bees.length*.25,10),ang:0,own:new Uint8Array(N),know:new Uint8Array(N),dead:new Uint8Array(N),rt:new Uint8Array(N),par:new Int32Array(N).fill(-1),exitKnown:false,hasExited:false,exitT:null,uniq:0,ownN:0,knowN:0,comm:0};b.oz=b.z-.5;visit(b,0);bees.push(b);done=false}
const seenA=new Int32Array(1),pr=0;let SA,PR,Q,stamp=0;
function bfs(b){const s=++stamp;let h=0,t=0;Q[t++]=b.cell;SA[b.cell]=s;
 while(h<t){const c=Q[h++];if(c===EXIT){let k=c;while(PR[k]!==b.cell)k=PR[k];return k}const x=c%W,y=c/W|0;
  for(let d=0;d<4;d++)if(open[c]>>d&1){const n=(y+DY[d])*W+x+DX[d];if(SA[n]!==s&&(b.know[n]||b.rt[n])){SA[n]=s;PR[n]=c;Q[t++]=n}}}return -1}
function decide(b){const c=b.cell,x=c%W,y=c/W|0,o=[];
 for(let d=0;d<4;d++)if(open[c]>>d&1){const n=(y+DY[d])*W+x+DX[d];o.push(n);setK(b,n,1)}
 let lv=0;for(const n of o)if(n!==b.prev&&!b.dead[n])lv++;if(!lv&&c!==0&&c!==EXIT)b.dead[c]=1;
 if(b.exitKnown&&!b.hasExited&&R()>P.rand*.3){const n=bfs(b);if(n>=0){b.tgt=n;return}}
 if(R()<P.rand*.15){b.tgt=o[R()*o.length|0];return}
 let best=o[0],bs=-1e9;for(const n of o){const s=R()*P.rand*3+(b.own[n]?-2*P.mem:0)+(b.know[n]===2?-1.5*P.mem:2)+(b.dead[n]?-8*P.mem:0)+(n===b.prev?-1.2*P.mem:0);if(s>bs){bs=s;best=n}}b.tgt=best}
function arrive(b){const p=b.cell,c=b.tgt;b.prev=p;b.cell=c;b.tgt=-1;if(!b.own[c]&&b.par[c]<0)b.par[c]=p;visit(b,c);
 if(c===EXIT&&!b.hasExited){b.hasExited=true;b.exitT=T;exited++;
  if(firstExit===null){firstExit=T;finder=b.id;banner(`🚨 EXIT DISCOVERED<br>Bee #${b.id} · ${T.toFixed(2)} s`,5000)}
  lastExit=T;if(!b.exitKnown){b.exitKnown=true;b.learnT=T;b.learnFrom=-1;for(let k=c;k>=0;k=b.par[k]){b.rt[k]=1;routeAny[k]=1}}
  if(exited===bees.length){done=true;running=false;showDone()}}}
function move(b,dt){if(b.wait>0){b.wait-=dt;return}if(b.tgt<0)decide(b);
 const tx=(b.tgt%W)+.5+b.ox,tz=(b.tgt/W|0)+.5+b.oz,dx=tx-b.x,dz=tz-b.z,d=Math.hypot(dx,dz),s=P.speed*dt;
 if(d>.001)b.ang=Math.atan2(dx,dz);if(d<=s){b.x=tx;b.z=tz;arrive(b)}else{b.x+=dx/d*s;b.z+=dz/d*s}}
/* ---------- communication ---------- */
function talk(a,b,d){let nA=0,nB=0,dead=0,ex=0,sender=-1;
 for(let c=0;c<N;c++){const ka=a.know[c],kb=b.know[c];if(ka!==kb&&R()<P.share){if(ka>kb){setK(b,c,ka);nB++}else{setK(a,c,kb);nA++}}
  if(a.dead[c]!==b.dead[c]&&R()<P.share){a.dead[c]=b.dead[c]=1;dead++}}
 if(a.exitKnown!==b.exitKnown&&R()<P.share){const s=a.exitKnown?a:b,r=s===a?b:a;for(let c=0;c<N;c++)if(s.rt[c]){r.rt[c]=1;setK(r,c,2)}r.exitKnown=true;r.learnT=T;r.learnFrom=s.id;ex=1;sender=s.id}
 const nn=nA+nB,type=ex?(sender===finder?'EXIT_DISCOVERY':'EXIT_ROUTE'):nn>=5?'NEW_AREA_INFO':nn>0?'EXPLORATION_INFO':dead?'DEAD_END_INFO':'GENERAL_CONTACT',r2=v=>Math.round(v*100)/100;
 events.push({t:T,a:a.id,b:b.id,pa:{x:r2(a.x),y:.4,z:r2(a.z)},pb:{x:r2(b.x),y:.4,z:r2(b.z)},type,d,ka:a.knowN/N*100,kb:b.knowN/N*100});
 a.comm++;b.comm++;const pk=Math.min(a.id,b.id)*1024+Math.max(a.id,b.id),pc=(pairs.get(pk)||0)+1;pairs.set(pk,pc);if(pc===1)born.set(pk,performance.now());
 const mc=ci((a.z+b.z)/2,(a.x+b.x)/2);heat[mc]++;if(heat[mc]>heatMax)heatMax=heat[mc];
 live.push({a:a.id,b:b.id,t:T,type});if(live.length>[30,80,150,200][perf])live.shift()}
function comms(){const r=P.radius,g=new Map();
 for(const b of bees){if(b.wait>0)continue;const k=(b.x/r|0)*4096+(b.z/r|0);let a=g.get(k);if(!a)g.set(k,a=[]);a.push(b)}
 for(const b of bees){if(b.wait>0)continue;const gx=b.x/r|0,gz=b.z/r|0;
  for(let i=-1;i<2;i++)for(let j=-1;j<2;j++){const a=g.get((gx+i)*4096+gz+j);if(!a)continue;
   for(const o of a){if(o.id<=b.id)continue;const d=Math.hypot(o.x-b.x,o.z-b.z);if(d>r)continue;const key=b.id*1024+o.id,lt=lastT.get(key);if(lt!==undefined&&T-lt<CD)continue;lastT.set(key,T);talk(b,o,d)}}}}
function step(dt){T+=dt;for(const b of bees)move(b,dt);comms()}
/* ---------- history aggregation ---------- */
const bsT=t=>{let lo=0,hi=events.length;while(lo<hi){const m=lo+hi>>1;if(events[m].t<=t)lo=m+1;else hi=m}return lo};
function agg(t){const k=Math.floor(t*4)+':'+events.length;if(agg.k===k)return agg.v;const p=new Map(),h=new Float32Array(N);let mx=1;
 for(const e of events){if(e.t>t)break;const key=Math.min(e.a,e.b)*1024+Math.max(e.a,e.b);p.set(key,(p.get(key)||0)+1);const c=ci((e.pa.z+e.pb.z)/2,(e.pa.x+e.pb.x)/2);h[c]++;if(h[c]>mx)mx=h[c]}
 agg.k=k;return agg.v={pairs:p,heat:h,heatMax:mx}}
const net=()=>view===null?{pairs,heat,heatMax}:agg(view);
function getS(){const nt=net(),n=bees.length,deg=new Uint16Array(n);let lk=0,lc=0;for(const[k,c]of nt.pairs){const a=k>>10,b=k&1023;if(a<n&&b<n){deg[a]++;deg[b]++}if(c>lc){lc=c;lk=k}}
 let tb=0;for(let i=1;i<n;i++)if(deg[i]>deg[tb])tb=i;return{nt,deg,tb,lk,lc,ln:nt.pairs.size}}
/* ---------- world init ---------- */
function initWorld(keep){gpos=null;gSelKey=null;if(!keep)genMaze();R=rng(seed^0x9e3779b9);SA=new Int32Array(N);PR=new Int32Array(N);Q=new Int32Array(N);
 disc=new Uint8Array(N);discN=0;vc=new Uint16Array(N);heat=new Float32Array(N);heatMax=1;routeAny=new Uint8Array(N);bees=[];events=[];pairs=new Map();lastT=new Map();live=[];born.clear();
 T=0;view=null;replaying=false;firstExit=lastExit=null;finder=-1;exited=0;done=false;agg.k=null;sel=-1;$('banner').style.display='none';
 for(let i=0;i<P.bees;i++)addBee();buildScene()}
/* ---------- three.js ---------- */
const ren=new THREE.WebGLRenderer({antialias:true}),scene=new THREE.Scene(),cam=new THREE.PerspectiveCamera(30,1,.1,500),cv=ren.domElement,dm=new THREE.Object3D(),col=new THREE.Color();
$('view').prepend(cv);scene.background=new THREE.Color(0x0d0905);scene.add(new THREE.HemisphereLight(0xffffff,0x664422,.95));const dl=new THREE.DirectionalLight(0xffffff,.55);dl.position.set(-10,30,10);scene.add(dl);
let G,tex,beeM,wingM,lineM,histP,marker,exitM,markT=0;
function buildScene(){if(G)scene.remove(G);G=new THREE.Group();scene.add(G);
 tex=new THREE.DataTexture(new Uint8Array(W*H*4),W,H,THREE.RGBAFormat);tex.magFilter=tex.minFilter=THREE.NearestFilter;
 const fl=new THREE.Mesh(new THREE.PlaneGeometry(W,H),new THREE.MeshBasicMaterial({map:tex}));fl.rotation.x=-Math.PI/2;fl.position.set(W/2,0,H/2);G.add(fl);
 const ws=[],t=.14,h=.55;for(let c=0;c<N;c++){const x=c%W,y=c/W|0;if(!(open[c]&2))ws.push([x+1,y+.5,t,1+t]);if(!(open[c]&4))ws.push([x+.5,y+1,1+t,t]);if(y===0)ws.push([x+.5,0,1+t,t]);if(x===0)ws.push([0,y+.5,t,1+t])}
 const wm=new THREE.InstancedMesh(new THREE.BoxGeometry(1,h,1),new THREE.MeshLambertMaterial({color:0xc4964a}),ws.length);
 ws.forEach((w,i)=>{dm.position.set(w[0],h/2,w[1]);dm.rotation.set(0,0,0);dm.scale.set(w[2],1,w[3]);dm.updateMatrix();wm.setMatrixAt(i,dm.matrix)});G.add(wm);
 const sm=new THREE.Mesh(new THREE.BoxGeometry(.8,.05,.8),new THREE.MeshBasicMaterial({color:0x33ccff}));sm.position.set(.5,.04,.5);G.add(sm);
 exitM=new THREE.Mesh(new THREE.CylinderGeometry(.3,.3,.6,12),new THREE.MeshBasicMaterial({color:0x35ff6a}));exitM.position.set(W-.5,.3,H-.5);G.add(exitM);
 const bg=new THREE.SphereGeometry(.17,8,6);bg.scale(.85,.6,1.3);beeM=new THREE.InstancedMesh(bg,new THREE.MeshLambertMaterial(),1024);beeM.instanceMatrix.setUsage(THREE.DynamicDrawUsage);beeM.frustumCulled=false;G.add(beeM);
 wingM=new THREE.InstancedMesh(new THREE.BoxGeometry(.4,.01,.12),new THREE.MeshBasicMaterial({color:0xcfe8ff,transparent:true,opacity:.6}),1024);wingM.frustumCulled=false;G.add(wingM);
 lineM=new THREE.InstancedMesh(new THREE.BoxGeometry(1,.02,1),new THREE.MeshBasicMaterial({transparent:true,blending:THREE.AdditiveBlending,depthWrite:false}),420);lineM.frustumCulled=false;lineM.count=0;G.add(lineM);
 const hg=new THREE.BufferGeometry();hg.setAttribute('position',new THREE.BufferAttribute(new Float32Array(18000),3));hg.setAttribute('color',new THREE.BufferAttribute(new Float32Array(18000),3));
 histP=new THREE.Points(hg,new THREE.PointsMaterial({size:.22,vertexColors:true,transparent:true,blending:THREE.AdditiveBlending,depthWrite:false}));histP.frustumCulled=false;histP.visible=false;G.add(histP);
 marker=new THREE.Mesh(new THREE.TorusGeometry(.5,.04,6,24),new THREE.MeshBasicMaterial({color:0xffffff}));marker.rotation.x=Math.PI/2;marker.visible=false;G.add(marker);
 rsz();resetCam();paint()}
const CCOL={EXIT_DISCOVERY:[.2,1,.35],EXIT_ROUTE:[.2,1,.35],NEW_AREA_INFO:[1,.55,.1],EXPLORATION_INFO:[1,.55,.1]},RED=[1,.15,.15];
function drawBees(tm){const n=bees.length;beeM.count=wingM.count=n;
 for(let i=0;i<n;i++){const b=bees[i],v=b.wait<=0;dm.position.set(b.x,.35,b.z);dm.rotation.set(0,b.ang,0);dm.scale.setScalar(v?(i===sel?1.8:1):1e-4);dm.updateMatrix();beeM.setMatrixAt(i,dm.matrix);
  col.setHex(i===sel?0xffffff:b.hasExited?0x66ff88:b.exitKnown?0xb6ff5a:0xffc61a);beeM.setColorAt(i,col);
  if(perf>=2){dm.position.y=.48;dm.scale.set(v?1:1e-4,1,.6+.5*Math.abs(Math.sin(tm*30+i)));dm.updateMatrix();wingM.setMatrixAt(i,dm.matrix)}}
 beeM.instanceMatrix.needsUpdate=true;if(beeM.instanceColor)beeM.instanceColor.needsUpdate=true;wingM.visible=perf>=2;if(perf>=2)wingM.instanceMatrix.needsUpdate=true;
 exitM.scale.y=1+.25*Math.sin(tm*4)}
function drawLines(){let k=0;const set=(ax,az,bx,bz,cnt,c,f)=>{if(k>=420)return;const dx=bx-ax,dz=bz-az;dm.position.set((ax+bx)/2,.9,(az+bz)/2);dm.rotation.set(0,-Math.atan2(dz,dx),0);
  dm.scale.set(Math.max(Math.hypot(dx,dz),.02),1,.05+.4*(1-Math.exp(-cnt/25)));dm.updateMatrix();lineM.setMatrixAt(k,dm.matrix);col.setRGB(c[0]*f,c[1]*f,c[2]*f);lineM.setColorAt(k,col);k++};
 if(view===null){live=live.filter(l=>T-l.t<.9);for(const l of live){const A=bees[l.a],B=bees[l.b];if(A&&B)set(A.x,A.z,B.x,B.z,pairs.get(Math.min(l.a,l.b)*1024+Math.max(l.a,l.b))||1,CCOL[l.type]||RED,1-(T-l.t)/.9)}}
 else{let i=bsT(view)-1;for(;i>=0&&events[i].t>view-.8&&k<200;i--){const e=events[i];set(e.pa.x,e.pa.z,e.pb.x,e.pb.z,3,CCOL[e.type]||RED,1-(view-e.t)/.8)}}
 if($('phys').checked)for(const[key,c]of topP){const A=bees[key>>10],B=bees[key&1023];if(A&&B)set(A.x,A.z,B.x,B.z,c,RED,.5)}
 lineM.count=k;lineM.instanceMatrix.needsUpdate=true;if(lineM.instanceColor)lineM.instanceColor.needsUpdate=true}
function updHist(){histP.visible=$('hist').checked&&perf>0;if(!histP.visible)return;const hi=view===null?events.length:bsT(view),n=Math.min(6000,hi),p=histP.geometry.attributes.position,c=histP.geometry.attributes.color;
 for(let i=0;i<n;i++){const e=events[hi-n+i],f=(i+1)/n;p.setXYZ(i,(e.pa.x+e.pb.x)/2,.75,(e.pa.z+e.pb.z)/2);c.setXYZ(i,f,f*.15,f*.15)}histP.geometry.setDrawRange(0,n);p.needsUpdate=c.needsUpdate=true}
function paint(){const d=tex.image.data,m=$('mode').value,b=bees[sel],nt=net();
 for(let c=0;c<N;c++){const i=((H-1-(c/W|0))*W+c%W)*4;let r=26,g=18,bl=9;
  if(m==='heat'){const v=Math.sqrt(nt.heat[c]/nt.heatMax);r=25+230*v;g=20+170*v*v;bl=35+20*v}
  else if(m==='unk'){if(disc[c]){r=22;g=26;bl=34}else{r=170;g=50;bl=60}}
  else if(m==='sel'&&b){if(b.own[c]){r=110;g=175;bl=255}else if(b.know[c]===2){r=55;g=85;bl=135}else if(b.know[c]===1){r=45;g=48;bl=62}else{r=24;g=24;bl=28}if(b.rt[c]){r=40;g=210;bl=100}}
  else{if(disc[c]){const v=Math.min(1,vc[c]/12);r=70+185*v;g=62+140*v;bl=30+20*v}if(routeAny[c]){r=30;g=200;bl=90}}
  d[i]=r;d[i+1]=g;d[i+2]=bl;d[i+3]=255}tex.needsUpdate=true}
/* ---------- camera ---------- */
const C={tx:0,tz:0,dist:30,yaw:0,tilt:.05};
function resetCam(){C.tx=W/2;C.tz=H/2;C.yaw=0;C.tilt=.05;const a=cv.clientWidth/Math.max(1,cv.clientHeight);C.dist=Math.max(H/2,W/2/a)*1.12/Math.tan(cam.fov*Math.PI/360)}
function updCam(){const o=Math.sin(C.tilt)*C.dist;cam.position.set(C.tx+o*Math.sin(C.yaw),Math.cos(C.tilt)*C.dist,C.tz+o*Math.cos(C.yaw));cam.up.set(-Math.sin(C.yaw),0,-Math.cos(C.yaw));cam.lookAt(C.tx,0,C.tz)}
function rsz(){const v=$('view');ren.setPixelRatio([1,1,Math.min(devicePixelRatio,1.5),devicePixelRatio][perf]);ren.setSize(v.clientWidth,v.clientHeight);cam.aspect=v.clientWidth/Math.max(1,v.clientHeight);cam.updateProjectionMatrix()}
new ResizeObserver(rsz).observe($('view'));
let dr=null;cv.onpointerdown=e=>{dr={x:e.clientX,y:e.clientY,sx:e.clientX,sy:e.clientY,rot:e.button===2||e.shiftKey};cv.setPointerCapture(e.pointerId)};
cv.onpointermove=e=>{if(!dr)return;if(mapMode)return moveG(e);const dx=e.clientX-dr.x,dy=e.clientY-dr.y;dr.x=e.clientX;dr.y=e.clientY;
 if(dr.rot){C.yaw+=dx*.008;C.tilt=Math.max(.02,Math.min(1.2,C.tilt+dy*.006))}
 else{const k=2*C.dist*Math.tan(cam.fov*Math.PI/360)/cv.clientHeight,s=Math.sin(C.yaw),c=Math.cos(C.yaw);C.tx+=c*(-dx*k)+(-s)*(dy*k);C.tz+=(-s)*(-dx*k)+(-c)*(dy*k)}};
cv.onpointerup=e=>{if(dr&&Math.hypot(e.clientX-dr.sx,e.clientY-dr.sy)<5)pick(e);dr=null};cv.oncontextmenu=e=>e.preventDefault();
cv.addEventListener('wheel',e=>{e.preventDefault();const o=mapMode?GC:C;o.dist=Math.max(4,Math.min(200,o.dist*Math.exp(e.deltaY*.001)))},{passive:false});
const rc=new THREE.Raycaster(),pl=new THREE.Plane(new THREE.Vector3(0,1,0),-.35),pt=new THREE.Vector3();
function pick(e){if(mapMode)return pickG(e);const r=cv.getBoundingClientRect();rc.setFromCamera({x:(e.clientX-r.left)/r.width*2-1,y:-((e.clientY-r.top)/r.height*2-1)},cam);if(!rc.ray.intersectPlane(pl,pt))return;
 let bi=-1,bd=.8;for(const b of bees){const d=Math.hypot(b.x-pt.x,b.z-pt.z);if(d<bd&&b.wait<=0){bd=d;bi=b.id}}sel=bi;paint()}
/* ---------- 2D network / heatmap ---------- */
const nc=$('net'),nx=nc.getContext('2d'),hc=document.createElement('canvas');let nodes=[];
function drawNet(){const cw=nc.clientWidth,ch=nc.clientHeight;if(nc.width!==cw||nc.height!==ch){nc.width=cw;nc.height=ch}nx.fillStyle='#130e06';nx.fillRect(0,0,cw,ch);
 const S=getS(),nt=S.nt;if($('nmode').value==='heat'){drawHeat(nt,cw,ch);return}
 const n=bees.length,cx=cw/2,cy=ch/2,rad=Math.min(cw,ch)/2-20,act=new Float32Array(n);nodes=[];
 const es=[...nt.pairs].sort((a,b)=>a[1]-b[1]),pos=i=>[cx+rad*Math.cos(i/n*6.2832-1.5708),cy+rad*Math.sin(i/n*6.2832-1.5708)],now=performance.now();
 for(const[k,c]of es){const a=k>>10,b=k&1023;if(a<n&&b<n){act[a]+=c;act[b]+=c}}
 for(const[k,c]of es.slice(-1500)){const a=k>>10,b=k&1023;if(a>=n||b>=n)continue;const pa=pos(a),pb=pos(b),nw=now-(born.get(k)||0)<1500&&view===null;
  nx.lineWidth=.6+Math.min(9,Math.sqrt(c)*.9);nx.strokeStyle=nw?'#fff':`rgba(255,59,59,${.25+Math.min(.6,c/40)})`;nx.beginPath();nx.moveTo(pa[0],pa[1]);nx.lineTo(pb[0],pb[1]);nx.stroke()}
 for(let i=0;i<n;i++){const p=pos(i);nodes.push({id:i,x:p[0],y:p[1]});const rr=3+Math.min(9,Math.sqrt(act[i])*.35);
  nx.fillStyle=i===sel?'#fff':i===S.tb?'#ffd23a':bees[i].exitKnown?'#58ff8a':'#c98a00';nx.beginPath();nx.arc(p[0],p[1],rr,0,6.2832);nx.fill();
  if(i===sel||i===S.tb){nx.strokeStyle='#fff';nx.lineWidth=1.5;nx.stroke()}if(n<=60){nx.fillStyle='#ebe7da';nx.font='9px monospace';nx.fillText('#'+i,p[0]+rr+2,p[1]+3)}}}
function drawHeat(nt,cw,ch){hc.width=W;hc.height=H;const g=hc.getContext('2d'),im=g.createImageData(W,H);
 for(let c=0;c<N;c++){const v=Math.sqrt(nt.heat[c]/nt.heatMax),j=c*4;im.data[j]=20+235*v;im.data[j+1]=15+170*v*v;im.data[j+2]=30;im.data[j+3]=255}g.putImageData(im,0,0);
 const s=Math.min(cw/W,ch/H),ox=(cw-W*s)/2,oy=(ch-H*s)/2;nx.imageSmoothingEnabled=true;nx.drawImage(hc,ox,oy,W*s,H*s);nx.strokeStyle='rgba(255,255,255,.55)';nx.lineWidth=1;nx.beginPath();
 for(let c=0;c<N;c++){const x=c%W,y=c/W|0,X=ox+x*s,Y=oy+y*s;if(!(open[c]&2)){nx.moveTo(X+s,Y);nx.lineTo(X+s,Y+s)}if(!(open[c]&4)){nx.moveTo(X,Y+s);nx.lineTo(X+s,Y+s)}if(y===0){nx.moveTo(X,Y);nx.lineTo(X+s,Y)}if(x===0){nx.moveTo(X,Y);nx.lineTo(X,Y+s)}}nx.stroke()}
nc.onclick=e=>{if($('nmode').value!=='net')return;const r=nc.getBoundingClientRect();let bi=-1,bd=14;for(const n of nodes){const d=Math.hypot(n.x-(e.clientX-r.left),n.y-(e.clientY-r.top));if(d<bd){bd=d;bi=n.id}}sel=bi;paint()};
/* ---------- UI ---------- */
const rw=(k,v)=>`<div class="r"><span>${k}</span><b>${v}</b></div>`,sf=x=>x===null?'—':x.toFixed(2)+' s';
function banner(h,ms){const b=$('banner');b.innerHTML=h;b.style.display='block';clearTimeout(banner.t);if(ms)banner.t=setTimeout(()=>b.style.display='none',ms)}$('banner').onclick=()=>$('banner').style.display='none';
function showDone(){showResults();const S=getS();banner(`<b>SIMULATION COMPLETE</b><br>First exit ${sf(firstExit)} · Last exit ${sf(lastExit)}<br>Propagation ${sf(lastExit-firstExit)}<br>Communications ${events.length.toLocaleString()} · Maze discovered ${(discN/N*100).toFixed(1)}%<br>Most connected: #${S.tb} · Most active link: #${S.lk>>10} ↔ #${S.lk&1023}<br><small>No single bee held the whole solution. Click to dismiss.</small>`)}
function updStats(){const S=getS(),n=bees.length,dp=discN/N*100,kx=bees.filter(b=>b.exitKnown).length,ne=view===null?events.length:bsT(view);let mc=bees[0],act=0;for(const b of bees)if(b.comm>mc.comm)mc=b;if(view===null)for(const v of lastT.values())if(T-v<5)act++;
 $('stats').innerHTML='<h3>Swarm intelligence</h3>'+rw('Bees',n)+rw('Sim time',T.toFixed(1)+' s')+rw('Maze discovery',dp.toFixed(2)+'%')+`<div class="bar"><i style="width:${dp}%"></i></div>`+rw('Cells discovered',discN+' / '+N)+
 rw('Communications',ne.toLocaleString())+rw('Comms / sec',cps)+rw('Avg / bee',(2*ne/n).toFixed(1))+rw('Most communicative',(mc?'Bee #'+mc.id+' ('+mc.comm+')':'—'))+rw('Active links (5 s)',view===null?act:'—')+
 '<h3>Network</h3>'+rw('Nodes',n)+rw('Connections',S.ln)+rw('Avg connections',(2*S.ln/n).toFixed(2))+rw('Most connected','#'+S.tb+' ('+S.deg[S.tb]+')')+rw('Most active link',S.lc?`#${S.lk>>10} ↔ #${S.lk&1023} (${S.lc})`:'—')+
 '<h3>Exit</h3>'+rw('Found by',finder<0?'—':'Bee #'+finder)+rw('First exit',sf(firstExit))+rw('Last exit'+(done?'':' (so far)'),sf(lastExit))+rw('Propagation',firstExit===null?'—':sf(lastExit-firstExit))+rw('Bees reached exit',exited+' / '+n)+rw('Bees knowing route',kx+' ('+(kx/n*100).toFixed(0)+'%)')}
function updInsp(){const b=bees[sel];if(!b){$('insp').innerHTML='<h3>Bee inspector</h3><small>Click a bee in the 3D view or a node in the network.</small>';return}
 const nt=net(),cn=[];let tot=0;for(const[k,c]of nt.pairs){const a=k>>10,o=k&1023;if(a===b.id){cn.push([o,c]);tot+=c}else if(o===b.id){cn.push([a,c]);tot+=c}}cn.sort((x,y)=>y[1]-x[1]);
 $('insp').innerHTML=`<h3>Bee #${b.id}</h3>`+rw('Exit knowledge',b.exitKnown?'YES':'no')+rw('Position',`${b.x.toFixed(2)}, 0.40, ${b.z.toFixed(2)}`)+rw('Cells discovered',`${b.ownN} (${(b.ownN/N*100).toFixed(1)}%)`)+rw('Unique discoveries',b.uniq)+rw('Cells known (incl. told)',`${b.knowN} (${(b.knowN/N*100).toFixed(1)}%)`)+
 rw('Communications',view===null?b.comm:tot)+cn.slice(0,6).map(c=>rw('↔ Bee #'+c[0],c[1])).join('')+rw('Reached exit',b.hasExited?sf(b.exitT):'no')+'<button onclick="$(\'mode\').value=\'sel\';paint()">Show Bee Knowledge</button>'}
function updLog(){const hi=view===null?events.length:bsT(view);let h='';for(let i=hi-1;i>=Math.max(0,hi-30);i--){const e=events[i];h+=`<div class="ev" data-i="${i}">#${i+1} ${e.t.toFixed(1)}s ${e.a}↔${e.b} <em>${e.type.replace('_INFO','')}</em></div>`}$('log').innerHTML=h||'<div class="ev">No communications yet</div>'}
$('log').onclick=e=>{const d=e.target.closest('.ev');if(!d||d.dataset.i===undefined)return;const v=events[+d.dataset.i],mx=(v.pa.x+v.pb.x)/2,mz=(v.pa.z+v.pb.z)/2;
 $('evd').innerHTML=`<b>COMMUNICATION #${+d.dataset.i+1}</b><br>t ${v.t.toFixed(2)} s · #${v.a} ↔ #${v.b}<br>A ${v.pa.x}, ${v.pa.y}, ${v.pa.z}<br>B ${v.pb.x}, ${v.pb.y}, ${v.pb.z}<br>dist ${v.d.toFixed(2)} · ${v.type}<br>knowledge ${v.ka.toFixed(0)}% / ${v.kb.toFixed(0)}%`;
 C.tx=mx;C.tz=mz;C.dist=Math.min(C.dist,16);marker.position.set(mx,.8,mz);marker.visible=true;markT=performance.now()+4000};
const dl_=(name,blob)=>{const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1e3)},ds=()=>new Date().toISOString().slice(0,10);
$('exp').onclick=()=>dl_(`bee-swarm-experiment-${ds()}.json`,new Blob([JSON.stringify({format:'honey-harness-1',seed,size:P.size,params:P,simTime:T,beeCount:bees.length,firstExit,lastExit,propagation:firstExit===null?null:lastExit-firstExit,exitFoundBy:finder,discoveredPct:discN/N*100,
 bees:bees.map(b=>({id:b.id,comm:b.comm,ownN:b.ownN,knowN:b.knowN,uniq:b.uniq,exitKnown:b.exitKnown,exitTime:b.exitT,x:+b.x.toFixed(2),z:+b.z.toFixed(2),cells:[...b.own.keys()].filter(c=>b.own[c])})),
 pairs:[...pairs].map(([k,c])=>[k>>10,k&1023,c]),events:events.map(e=>({t:+e.t.toFixed(3),a:e.a,b:e.b,pa:e.pa,pb:e.pb,type:e.type,d:+e.d.toFixed(3),ka:+e.ka.toFixed(1),kb:+e.kb.toFixed(1)}))})]));
$('ep').onclick=()=>{$('nmode').value='net';drawNet();nc.toBlob(b=>dl_(`communication-map-${ds()}.png`,b))};
$('ej').onclick=()=>dl_(`communication-map-${ds()}.json`,new Blob([JSON.stringify({nodes:bees.map(b=>({id:b.id,comm:b.comm})),edges:[...net().pairs].map(([k,c])=>({a:k>>10,b:k&1023,count:c}))})]));
function load(d){const fin=Number.isFinite,bad=m=>{throw Error(m)};
 if(!d||d.format!=='honey-harness-1')bad('unrecognised format');if(!fin(d.seed)||!Number.isInteger(d.size)||d.size<11||d.size>45||!Number.isInteger(d.beeCount)||d.beeCount<1||d.beeCount>1000||!Array.isArray(d.events)||d.events.length>5e5||!fin(d.simTime))bad('invalid header');
 const ev=d.events.map(e=>{if(!e||!fin(e.t)||!Number.isInteger(e.a)||!Number.isInteger(e.b)||e.a<0||e.b<0||e.a>=d.beeCount||e.b>=d.beeCount||!e.pa||!e.pb||![e.pa.x,e.pa.z,e.pb.x,e.pb.z,e.d].every(fin)||!TYPES.includes(e.type))bad('invalid event');
  return{t:e.t,a:e.a,b:e.b,pa:{x:e.pa.x,y:.4,z:e.pa.z},pb:{x:e.pb.x,y:.4,z:e.pb.z},type:e.type,d:e.d,ka:+e.ka||0,kb:+e.kb||0}}).sort((x,y)=>x.t-y.t);
 if(d.params)for(const k of['speed','radius','rand','mem','share'])if(fin(d.params[k]))P[k]=d.params[k];P.size=d.size;P.bees=d.beeCount;seed=d.seed>>>0;initWorld();syncUI();events=ev;T=d.simTime;
 if(Array.isArray(d.bees))for(const s of d.bees){const b=s&&bees[s.id];if(!b||!Array.isArray(s.cells))continue;for(const c of s.cells)if(Number.isInteger(c)&&c>=0&&c<N&&!b.own[c]){b.own[c]=1;b.ownN++;setK(b,c,2);if(!disc[c]){disc[c]=1;discN++}vc[c]++}if(fin(s.comm))b.comm=s.comm}
 if(fin(d.firstExit))firstExit=d.firstExit;if(fin(d.lastExit))lastExit=d.lastExit;imported=true;running=false;view=T;$('go').textContent='▶ Start';paint()}
$('imp').onchange=async e=>{const f=e.target.files[0];if(!f)return;try{load(JSON.parse(await f.text()))}catch(x){alert('Import rejected: '+x.message)}e.target.value=''};
/* controls */
const SL=[['size','Maze size',11,45,2],['speed','Bee speed',.5,6,.1],['radius','Communication radius',.5,6,.1],['rand','Exploration randomness',0,1,.05],['mem','Memory strength',0,1.5,.05],['share','Information sharing',0,1,.05]];
$('ctl').innerHTML='<div class="r"><span>Bee count</span><select id="bc">'+[10,25,50,100,250,500].map(v=>`<option ${v==P.bees?'selected':''}>${v}</option>`).join('')+'</select></div>'+SL.map(([k,l,a,b,s])=>`<label>${l}: <b id="v_${k}">${P[k]}</b><input type="range" id="s_${k}" min="${a}" max="${b}" step="${s}" value="${P[k]}"></label>`).join('')+'<small>Maze size and bee count apply on Restart / Reset Swarm.</small>';
SL.forEach(([k])=>$('s_'+k).oninput=e=>{P[k]=+e.target.value;$('v_'+k).textContent=P[k]});$('bc').onchange=e=>P.bees=+e.target.value;
function syncUI(){SL.forEach(([k])=>{$('s_'+k).value=P[k];$('v_'+k).textContent=P[k]});if([...$('bc').options].some(o=>+o.value===P.bees))$('bc').value=P.bees}
const restart=()=>{seed=(Math.random()*4e9)>>>0;imported=false;running=true;$('go').textContent='⏸ Pause';initWorld()};
$('go').onclick=()=>{if(imported||done)return;running=!running;$('go').textContent=running?'⏸ Pause':'▶ Start'};
$('rs').onclick=restart;$('rsw').onclick=()=>{imported=false;running=true;$('go').textContent='⏸ Pause';initWorld(true)};
$('a1').onclick=()=>addBee();$('a10').onclick=()=>{for(let i=0;i<10;i++)addBee()};$('a50').onclick=()=>{for(let i=0;i<50;i++)addBee()};
$('spd').onchange=e=>SPD=parseFloat(e.target.value);$('mode').onchange=paint;$('cr').onclick=()=>mapMode?resetG():resetCam();
$('tl').oninput=e=>{view=+e.target.value;replaying=false};$('lv').onclick=()=>{view=imported?T:null;replaying=false;paint()};$('rp').onclick=()=>{if(events.length){view=0;replaying=true}};
const preset=(n,r)=>{P.bees=n;P.radius=r;syncUI();restart()};$('pA').onclick=()=>preset(10,.9);$('pB').onclick=()=>preset(100,1.6);$('pC').onclick=()=>preset(100,4);
function setPerf(v){perf=v;$('pf').value=v;rsz()}$('pf').onchange=e=>setPerf(+e.target.value);
$('hp').onclick=()=>{const p=$('perfm');p.style.display=p.style.display==='none'?'block':'none'};
/* ---------- main loop ---------- */
let lt=performance.now(),acc=0,f0=lt,fc=0,fps=0,c0=0,lowC=0,tP=0,tU=0,tN=0,tH=0;
function frame(now){requestAnimationFrame(frame);const dt=Math.min(.1,(now-lt)/1000);lt=now;fc++;
 if(now-f0>=1000){fps=fc;fc=0;f0=now;cps=events.length-c0;c0=events.length;lowC=fps<24?lowC+1:0;if(lowC>=3&&perf>0){setPerf(perf-1);lowC=0}}
 if(running&&view===null&&!imported){acc+=dt*SPD;let n=0;while(acc>=.05&&n<40){step(.05);acc-=.05;n++}if(n>=40)acc=0}
 if(replaying){view+=dt*SPD*Math.max(1,T/30);if(view>=T){view=imported?T:null;replaying=false}}
 if(now-tP>[600,350,250,150][perf]){tP=now;paint()}
 if(now-tU>250){tU=now;updStats();updInsp();$('tl').max=T;$('tl').value=view===null?T:view;$('tt').textContent=(view===null?T:view).toFixed(1)+' s';
  $('perfm').textContent=`FPS ${fps} · Bees ${bees.length} · Comms/s ${cps} · Active lines ${lineM.count}`}
 if(now-tN>[800,500,300,250][perf]){tN=now;drawNet()}
 if(now-tH>500){tH=now;updLog();updHist();if($('phys').checked)topP=[...net().pairs].sort((a,b)=>b[1]-a[1]).slice(0,200)}
 if(marker.visible&&now>markT)marker.visible=false;
 if(mapMode){updGraph();ren.render(gs,gcam)}else{drawBees(now/1000);drawLines();updCam();ren.render(scene,cam)}}
/* ---------- popup windows ---------- */
let zt=20;
document.querySelectorAll('.win').forEach(w=>{const t=w.querySelector('.wt');let d=null;
 t.onpointerdown=e=>{if(e.target.tagName==='BUTTON')return;const r=w.getBoundingClientRect();d={x:e.clientX-r.left,y:e.clientY-r.top};t.setPointerCapture(e.pointerId);
  Object.assign(w.style,{left:r.left+'px',top:r.top+'px',right:'auto',bottom:'auto',zIndex:++zt})};
 t.onpointermove=e=>{if(d){w.style.left=Math.max(0,e.clientX-d.x)+'px';w.style.top=Math.max(0,e.clientY-d.y)+'px'}};t.onpointerup=()=>d=null;
 w.querySelector('.x').onclick=()=>w.classList.add('hid')});
document.querySelectorAll('[data-w]').forEach(b=>b.onclick=()=>$('w-'+b.dataset.w).classList.toggle('hid'));
/* ---------- 3D mind map (Obsidian-style force graph) ---------- */
let mapMode=false,gpos=null,gvel=null,gEdges=[],gSelKey=null;
const gs=new THREE.Scene(),gcam=new THREE.PerspectiveCamera(45,1,.1,400),GC={yaw:.6,pit:.45,dist:22,t:new THREE.Vector3()},
 gnM=new THREE.InstancedMesh(new THREE.SphereGeometry(1,12,9),new THREE.MeshBasicMaterial(),1024),
 geM=new THREE.InstancedMesh(new THREE.CylinderGeometry(1,1,1,6,1),new THREE.MeshBasicMaterial(),1200),
 UP=new THREE.Vector3(0,1,0),V1=new THREE.Vector3(),V2=new THREE.Vector3(),labs=[];
gs.background=new THREE.Color(0x0d0905);gnM.frustumCulled=geM.frustumCulled=false;gs.add(gnM,geM);
const resetG=()=>{GC.yaw=.6;GC.pit=.45;GC.dist=22;GC.t.set(0,0,0)};
function setMap(on){mapMode=on;$('mm').textContent=on?'🗺 Back to maze':'🕸 3D connection map';if(on)banner('Mind map · drag = rotate · right-drag = pan · wheel = zoom<br>Click a node to focus a bee · click a line to read its communications',5000)}
$('mm').onclick=()=>setMap(!mapMode);
function updGraph(){const n=bees.length,S=getS();
 if(!gpos||gpos.length!==n*3){const o=gpos,v=new Float32Array(n*3);for(let i=0;i<n*3;i++)v[i]=o&&i<o.length?o[i]:(Math.random()-.5)*10;gpos=v;gvel=new Float32Array(n*3)}
 gEdges=[...S.nt.pairs].sort((a,b)=>b[1]-a[1]).slice(0,1200).filter(([k])=>(k>>10)<n&&(k&1023)<n);
 for(let s=0;s<(n>200?1:2);s++){
  for(let i=0;i<n;i++){const ix=i*3;for(let j=i+1;j<n;j++){const jx=j*3,dx=gpos[ix]-gpos[jx],dy=gpos[ix+1]-gpos[jx+1],dz=gpos[ix+2]-gpos[jx+2],d=Math.sqrt(dx*dx+dy*dy+dz*dz)+.05,f=1.2/(d*d*d);
   gvel[ix]+=dx*f;gvel[ix+1]+=dy*f;gvel[ix+2]+=dz*f;gvel[jx]-=dx*f;gvel[jx+1]-=dy*f;gvel[jx+2]-=dz*f}}
  for(const[k,c]of gEdges){const a=(k>>10)*3,b=(k&1023)*3,dx=gpos[b]-gpos[a],dy=gpos[b+1]-gpos[a+1],dz=gpos[b+2]-gpos[a+2],d=Math.sqrt(dx*dx+dy*dy+dz*dz)+.01,f=(d-5/(1+.35*Math.sqrt(c)))*.03/d;
   gvel[a]+=dx*f;gvel[a+1]+=dy*f;gvel[a+2]+=dz*f;gvel[b]-=dx*f;gvel[b+1]-=dy*f;gvel[b+2]-=dz*f}
  for(let i=0;i<n*3;i++){gvel[i]=Math.max(-.5,Math.min(.5,(gvel[i]-gpos[i]*.01)*.85));gpos[i]+=gvel[i]}}
 const nbs=new Set();if(sel>=0)for(const[k]of gEdges){const a=k>>10,b=k&1023;if(a===sel)nbs.add(b);else if(b===sel)nbs.add(a)}
 for(let i=0;i<n;i++){const f=sel<0||i===sel||nbs.has(i)?1:.3;dm.position.set(gpos[i*3],gpos[i*3+1],gpos[i*3+2]);dm.rotation.set(0,0,0);dm.scale.setScalar(Math.min(.8,.2+.05*S.deg[i]));dm.updateMatrix();gnM.setMatrixAt(i,dm.matrix);
  col.setHex(i===sel?0xffffff:i===S.tb?0xffd23a:bees[i].exitKnown?0x58ff8a:0xe09a00).multiplyScalar(f);gnM.setColorAt(i,col)}
 gEdges.forEach(([k,c],i)=>{const a=k>>10,b=k&1023;V1.set(gpos[a*3],gpos[a*3+1],gpos[a*3+2]);V2.set(gpos[b*3],gpos[b*3+1],gpos[b*3+2]).sub(V1);const len=V2.length()||.01;
  dm.position.copy(V1).addScaledVector(V2,.5);dm.quaternion.setFromUnitVectors(UP,V2.normalize());const r=.06+.16*(1-Math.exp(-c/25));dm.scale.set(r,len,r);dm.updateMatrix();geM.setMatrixAt(i,dm.matrix);
  const hl=k===gSelKey,w=sel>=0&&a!==sel&&b!==sel?.2:.5+.5*Math.min(1,c/20);hl?col.setRGB(1,1,1):col.setRGB(w,.2*w,.2*w);geM.setColorAt(i,col)});
 gnM.count=n;geM.count=gEdges.length;gnM.instanceMatrix.needsUpdate=geM.instanceMatrix.needsUpdate=true;if(gnM.instanceColor)gnM.instanceColor.needsUpdate=true;if(geM.instanceColor)geM.instanceColor.needsUpdate=true;
 if(n<=60){while(labs.length<n){const i=labs.length,c=document.createElement('canvas');c.width=64;c.height=32;const x=c.getContext('2d');x.fillStyle='#ebe7da';x.font='22px monospace';x.textAlign='center';x.fillText('#'+i,32,24);
   const sp=new THREE.Sprite(new THREE.SpriteMaterial({map:new THREE.CanvasTexture(c),depthTest:false}));sp.scale.set(1.2,.6,1);gs.add(sp);labs.push(sp)}
  labs.forEach((s,i)=>{s.visible=i<n;if(s.visible)s.position.set(gpos[i*3],gpos[i*3+1]+.6,gpos[i*3+2])})}else labs.forEach(s=>s.visible=false);
 gcam.aspect=cv.clientWidth/Math.max(1,cv.clientHeight);gcam.updateProjectionMatrix();const c=Math.cos(GC.pit);
 gcam.position.set(GC.t.x+GC.dist*c*Math.sin(GC.yaw),GC.t.y+GC.dist*Math.sin(GC.pit),GC.t.z+GC.dist*c*Math.cos(GC.yaw));gcam.lookAt(GC.t)}
function moveG(e){const dx=e.clientX-dr.x,dy=e.clientY-dr.y;dr.x=e.clientX;dr.y=e.clientY;
 if(dr.rot){const k=GC.dist*.0016,m=gcam.matrixWorld.elements;GC.t.x+=(-m[0]*dx+m[4]*dy)*k;GC.t.y+=(-m[1]*dx+m[5]*dy)*k;GC.t.z+=(-m[2]*dx+m[6]*dy)*k}
 else{GC.yaw-=dx*.007;GC.pit=Math.max(-1.5,Math.min(1.5,GC.pit+dy*.007))}}
function pickG(e){const r=cv.getBoundingClientRect();rc.setFromCamera({x:(e.clientX-r.left)/r.width*2-1,y:-((e.clientY-r.top)/r.height*2-1)},gcam);
 const hn=rc.intersectObject(gnM)[0],he=rc.intersectObject(geM)[0];
 if(hn&&(!he||hn.distance<=he.distance+.3)){sel=hn.instanceId;gSelKey=null;$('w-link').classList.add('hid');$('w-stats').classList.remove('hid')}
 else if(he){gSelKey=gEdges[he.instanceId][0];showLink()}else{sel=-1;gSelKey=null;$('w-link').classList.add('hid')}paint()}
function showLink(){if(gSelKey===null)return;const a=gSelKey>>10,b=gSelKey&1023,ls=[];let c=0;
 for(let i=events.length-1;i>=0;i--){const e=events[i];if(view!==null&&e.t>view)continue;if(Math.min(e.a,e.b)===a&&Math.max(e.a,e.b)===b){c++;
  if(ls.length<60)ls.push(`<div class="ev" data-loc="${i}">#${i+1} · ${e.t.toFixed(2)}s · <em>${e.type}</em><br><small>A(${e.pa.x}, ${e.pa.z}) B(${e.pb.x}, ${e.pb.z}) · d ${e.d.toFixed(2)} · knowledge ${e.ka.toFixed(0)}% / ${e.kb.toFixed(0)}%</small></div>`)}}
 $('lk').innerHTML=`<b>Bee #${a} ↔ #${b}</b> · ${c} communications<br><small>Click one to see where it happened in the maze.</small>`+ls.join('');$('w-link').classList.remove('hid')}
$('lk').onclick=e=>{const d=e.target.closest('[data-loc]');if(!d)return;setMap(false);$('w-log').classList.remove('hid');$('log').onclick({target:{closest:()=>({dataset:{i:d.dataset.loc}})}})};
setInterval(()=>{if(mapMode&&gSelKey!==null&&!$('w-link').classList.contains('hid'))showLink()},700);
initWorld();requestAnimationFrame(frame);

/* side dock */
$('dk').onclick=()=>{document.body.classList.toggle('collapsed');setTimeout(()=>{if(!mapMode)resetCam()},260)};

/* full screen */
const isFS=()=>document.fullscreenElement||document.webkitFullscreenElement;
async function toggleFS(){const el=document.documentElement;try{if(isFS())await(document.exitFullscreen||document.webkitExitFullscreen).call(document);else await(el.requestFullscreen||el.webkitRequestFullscreen).call(el)}
 catch(x){document.body.classList.toggle('collapsed');banner('Browser full screen is blocked here. Open the page in its own tab and try again, or press F11. The side panel was toggled instead.',6000)}}
$('fs').onclick=toggleFS;
['fullscreenchange','webkitfullscreenchange'].forEach(ev=>document.addEventListener(ev,()=>{const f=!!isFS();$('fs').textContent=f?'⤢ Exit full screen':'⛶ Full screen';document.body.classList.toggle('collapsed',f);setTimeout(()=>{if(!mapMode)resetCam()},300)}));
addEventListener('keydown',e=>{if(e.key==='f'&&!/INPUT|SELECT|TEXTAREA/.test(e.target.tagName))toggleFS()});
/* results */
function showResults(){const S=getS(),n=bees.length,dp=discN/N*100,ne=events.length,
 kn=bees.filter(b=>b.exitKnown&&b.learnT!==undefined).sort((a,b)=>a.learnT-b.learnT),tp=[...bees].sort((a,b)=>b.uniq-a.uniq).slice(0,8);let mc=bees[0];for(const b of bees)if(b.comm>mc.comm)mc=b;
 $('res').innerHTML=`<b>${done?'SIMULATION COMPLETE':'Results so far (simulation still running)'}</b>`
 +'<h3>Exit</h3>'+rw('Found by',finder<0?'—':'Bee #'+finder)+rw('First exit',sf(firstExit))+rw('Last exit',sf(lastExit))+rw('Exit propagation time',firstExit===null?'—':sf(lastExit-firstExit))+rw('Bees that reached the exit',exited+' / '+n)+rw('Bees knowing the route',kn.length+' ('+(kn.length/n*100).toFixed(0)+'%)')
 +'<h3>Exploration</h3>'+rw('Maze discovered',dp.toFixed(2)+'% ('+discN+' / '+N+' cells)')+tp.map(b=>rw('Bee #'+b.id,`${b.uniq} unique · ${b.ownN} cells (${(b.ownN/N*100).toFixed(0)}%)`)).join('')
 +'<h3>Communication</h3>'+rw('Total communications',ne.toLocaleString())+rw('Average per bee',(2*ne/n).toFixed(1))+rw('Average per second',(ne/Math.max(T,1)).toFixed(1))+rw('Most communicative bee','#'+mc.id+' ('+mc.comm+')')+rw('Most connected bee','#'+S.tb+' ('+S.deg[S.tb]+' links)')+rw('Most active link',S.lc?`#${S.lk>>10} ↔ #${S.lk&1023} (${S.lc})`:'—')+rw('Distinct links',S.ln)
 +'<h3>How the route spread</h3><canvas id="rch" width="520" height="110" style="width:100%"></canvas>'+kn.slice(0,12).map((b,i)=>`<div class="r"><span>${i+1}. Bee #${b.id}</span><b>${b.learnT.toFixed(1)} s ${b.learnFrom<0?'(found it)':'← #'+b.learnFrom}</b></div>`).join('')
 +'<h3>Settings used</h3>'+rw('Simulated time',T.toFixed(1)+' s')+rw('Bees / maze',n+' / '+P.size+'×'+P.size)+rw('Comm radius · speed',P.radius+' · '+P.speed)+rw('Randomness · memory · sharing',P.rand+' · '+P.mem+' · '+P.share)+rw('Maze seed',seed)
 +'<p><small>No single bee holds the whole solution: the route reached the swarm only through local contacts.</small></p><div class="row"><button onclick="$(\'exp\').click()">Download data</button><button onclick="setMap(true);$(\'w-res\').classList.add(\'hid\')">Show 3D connection map</button></div>';
 $('w-res').classList.remove('hid');$('w-res').style.zIndex=++zt;
 const c=$('rch').getContext('2d'),t0=firstExit===null?0:firstExit,t1=Math.max(kn.length?kn[kn.length-1].learnT:1,t0+1);
 c.fillStyle='#130e06';c.fillRect(0,0,520,110);c.strokeStyle='#ffb81c';c.lineWidth=2;c.beginPath();c.moveTo(0,105);
 kn.forEach((b,i)=>c.lineTo((b.learnT-t0)/(t1-t0)*510+5,105-(i+1)/n*95));c.stroke();c.fillStyle='#a8946a';c.font='10px sans-serif';c.fillText('bees knowing the route over time (0–'+(t1-t0).toFixed(1)+' s after first exit)',6,12)}
$('rpt').onclick=showResults;
