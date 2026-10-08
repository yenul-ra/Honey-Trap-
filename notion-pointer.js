/* Honey Trap plugin: NOTION POINTER
   Bees leave physical signposts in the maze (stigmergy, no bee-to-bee contact needed):
   - green arrow: dropped by a bee that already knows the exit route, pointing one step toward the exit
   - red mark: dropped on a cell a bee has found to be a dead end
   A bee that walks onto an arrow follows it; a bee next to a red mark treats that cell as a dead end.
   Pointers only exist where a knowing bee has actually walked. Nothing is broadcast. */
(()=>{
const NP=window.NPTR={on:false,placed:0,reads:0,marks:0,ptr:null,avoid:null};let arr,mk;
const dock=document.getElementById('dock');
let box=document.getElementById('plug');
if(!box){box=document.createElement('div');box.id='plug';box.style.cssText='position:absolute;left:12px;bottom:12px;z-index:6;background:var(--panel);border:1px solid var(--line);border-radius:12px;padding:8px 12px;box-shadow:var(--sh)';box.innerHTML='<div style="font-size:12px;color:var(--m);margin-bottom:2px">Experimental features</div>';document.getElementById('view').appendChild(box)}
box.insertAdjacentHTML('beforeend','<label title="Bees leave arrows toward the exit and marks on dead ends"><input type="checkbox" id="nptrOn"> 📌 Notion Pointer <small>(signposts)</small></label>');
document.getElementById('nptrOn').onchange=e=>{NP.on=e.target.checked};
function reset(){NP.ptr=new Int32Array(N).fill(-1);NP.avoid=new Uint8Array(N);NP.placed=NP.reads=NP.marks=0}
function attach(){arr=new THREE.InstancedMesh(new THREE.ConeGeometry(.13,.34,6),new THREE.MeshBasicMaterial({color:0x58ff8a}),N);
 mk=new THREE.InstancedMesh(new THREE.BoxGeometry(.22,.03,.22),new THREE.MeshBasicMaterial({color:0xff4040}),N);
 for(const m of[arr,mk]){m.frustumCulled=false;m.count=0;G.add(m)}}
const _arrive=arrive,_decide=decide,_bs=buildScene,_us=updStats,o3=new THREE.Object3D();
arrive=function(b){_arrive(b);if(!NP.on||!b.exitKnown||b.cell===EXIT)return;const c=b.cell;
 if(NP.ptr[c]<0){const n=bfs(b);if(n>=0){NP.ptr[c]=n;NP.placed++}}};
decide=function(b){if(!NP.on)return _decide(b);const c=b.cell,x=c%W,y=c/W|0;
 for(let d=0;d<4;d++)if(open[c]>>d&1){const n=(y+DY[d])*W+x+DX[d];if(NP.avoid[n]&&!b.dead[n]){b.dead[n]=1;NP.reads++}}
 const d0=b.dead[c];_decide(b);
 if(!d0&&b.dead[c]&&!NP.avoid[c]){NP.avoid[c]=1;NP.marks++}
 const p=NP.ptr[c];b.pf=b.pf||0;
 if(p>=0&&!b.exitKnown&&!b.hasExited&&p!==b.prev&&b.pf<2*W){b.tgt=p;b.pf++;NP.reads++}else if(p<0)b.pf=0};
buildScene=function(){_bs();reset();attach()};
function draw(){if(!arr)return;let i=0,j=0;
 for(let c=0;c<N;c++){const x=c%W+.5,z=(c/W|0)+.5;
  if(NP.ptr[c]>=0){const p=NP.ptr[c];o3.position.set(x,.1,z);o3.rotation.set(-Math.PI/2,Math.atan2(-((p%W)-c%W),-((p/W|0)-(c/W|0))),0,'YXZ');o3.scale.setScalar(1);o3.updateMatrix();arr.setMatrixAt(i++,o3.matrix)}
  if(NP.avoid[c]){o3.position.set(x,.06,z);o3.rotation.set(0,0,0);o3.updateMatrix();mk.setMatrixAt(j++,o3.matrix)}}
 arr.count=i;mk.count=j;arr.instanceMatrix.needsUpdate=mk.instanceMatrix.needsUpdate=true}
setInterval(draw,400);
updStats=function(){_us();if(NP.on||NP.placed||NP.marks)document.getElementById('stats').insertAdjacentHTML('beforeend','<h3>Notion Pointer</h3>'+rw('Arrows placed',NP.placed)+rw('Dead-end marks',NP.marks)+rw('Signposts read',NP.reads))};
reset();attach();
})();
