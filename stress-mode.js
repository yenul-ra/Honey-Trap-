/* Honey Trap plugin: STRESS MODE (shockwave)
   When ON, every time a bee discovers a cell nobody has seen, it sends a shockwave to the whole swarm:
   every bee marks that cell as "already explored", so bees stop sending a second bee down the same path.
   The exit cell is never broadcast and the exit ROUTE still spreads only through local contact. */
(()=>{
const S=window.STRESS={on:false,count:0,log:[]},rings=[];let ri=0,lastR=0;
const dock=document.getElementById('dock');
let box=document.getElementById('plug');
if(!box){box=document.createElement('div');box.id='plug';box.className='dg';box.innerHTML='<h4>Experimental features</h4>';dock.insertBefore(box,dock.lastElementChild)}
box.insertAdjacentHTML('beforeend','<label title="New discoveries are broadcast to every bee"><input type="checkbox" id="stressOn"> ⚡ Stress mode <small>(shockwave)</small></label>');
document.getElementById('stressOn').onchange=e=>{S.on=e.target.checked};
function attach(){const grp=new THREE.Group();rings.length=0;
 for(let i=0;i<24;i++){const m=new THREE.Mesh(new THREE.TorusGeometry(1,.04,6,48),new THREE.MeshBasicMaterial({color:0xffe066,transparent:true,opacity:0,depthWrite:false}));m.rotation.x=Math.PI/2;m.visible=false;m.userData.t=0;grp.add(m);rings.push(m)}G.add(grp)}
function ring(x,z){const now=performance.now();if(now-lastR<25)return;lastR=now;const m=rings[ri++%rings.length];m.position.set(x,.7,z);m.userData.t=now;m.visible=true}
const _arrive=arrive,_bs=buildScene,_us=updStats;
arrive=function(b){const c=b.tgt,fresh=S.on&&c!==EXIT&&!disc[c];_arrive(b);
 if(!fresh)return;S.count++;S.log.push({t:T,bee:b.id,cell:c});for(const o of bees)if(o!==b)setK(o,c,2);ring(b.x,b.z)};
buildScene=function(){_bs();S.count=0;S.log=[];attach()};
updStats=function(){_us();if(S.on||S.count)document.getElementById('stats').insertAdjacentHTML('beforeend','<h3>Stress mode</h3>'+rw('Shockwaves sent',S.count)+rw('Cells told to every bee',S.count))};
(function anim(now){requestAnimationFrame(anim);for(const m of rings){if(!m.visible)continue;const a=(now-m.userData.t)/900;if(a>=1){m.visible=false;continue}m.scale.setScalar(.3+a*Math.max(W,H)*.35);m.material.opacity=.8*(1-a)}})(performance.now());
attach();
})();
