// ShadowBorn v9 — extensões seguras sobre a base estável.
(()=>{
const INV_KEY='shadowborn_inventory_v9', ECO_KEY='shadowborn_economy_v9';
let inv=load(INV_KEY,{items:{}}), eco=load(ECO_KEY,{money:0,diamonds:0});
function load(k,d){try{return Object.assign(d,JSON.parse(localStorage.getItem(k)||'{}'))}catch{return d}}
function save(){localStorage.setItem(INV_KEY,JSON.stringify(inv));localStorage.setItem(ECO_KEY,JSON.stringify(eco));syncHeader()}
function home(){ if(typeof window.showTitle==='function')window.showTitle(); }
function show(id){if(typeof window.hideAllScreens==='function')window.hideAllScreens();else document.querySelectorAll('.screen').forEach(x=>x.classList.add('hidden'));document.getElementById(id)?.classList.remove('hidden')}
function safe(x){const d=document.createElement('div');d.textContent=x||'';return d.innerHTML}
function syncProfile(){
 let u=window.currentUser;try{u=u||JSON.parse(localStorage.getItem('jogoDeLuta_user')||'null')}catch{}
 const r=window.ShadowRPG?.getData?.()||{};
 const n=document.getElementById('v2-player-name'),lv=document.getElementById('v2-level');
 if(n)n.textContent=u?.nome||'Caçador'; if(lv)lv.textContent=r.level||u?.dadosJogo?.level||1;syncHeader();
}
function syncHeader(){let u=window.currentUser||{};let m=document.getElementById('v9-money'),d=document.getElementById('v9-diamonds');if(m)m.textContent=Number(eco.money||u?.dadosJogo?.money||0).toLocaleString('pt-BR');if(d)d.textContent=Number(eco.diamonds||u?.dadosJogo?.diamonds||0).toLocaleString('pt-BR')}
function itemName(id){return String(id||'item').replace(/_/g,' ').replace(/\b\w/g,x=>x.toUpperCase())}
function addItem(id,qty=1){if(!id)return;inv.items[id]=(inv.items[id]||0)+qty;save()}
function rollDrops(type){(type?.drops||[]).forEach(d=>{if(Math.random()*100<Number(d.chance||0)){let min=Number(d.min||1),max=Math.max(min,Number(d.max||min));addItem(d.itemId,Math.floor(Math.random()*(max-min+1))+min)}});renderInventory()}
function renderInventory(){let el=document.getElementById('v9-inventory');if(!el)return;let arr=Object.entries(inv.items).filter(x=>x[1]>0);document.getElementById('v9-inv-count').textContent=arr.reduce((a,x)=>a+x[1],0)+' itens';el.innerHTML=arr.length?arr.map(([id,q])=>`<article class="v9-item"><span>🎁</span><b>${safe(itemName(id))}</b><small>x${q}</small></article>`).join(''):'<div class="v9-empty">Seu inventário está vazio.<br><small>Derrote NPCs e Bosses que possuam drops configurados pelo Admin.</small></div>'}
function cardNpc(n,boss){return `<article class="v8-card"><span>${boss?'♛':'👤'}</span><div><b>${safe(n.name||n.nome)}</b><p>${boss?'Boss':'NPC'} · HP ${Number(n.health||0)} · Dano ${Number(n.damage||0)}</p><small>${(n.drops||[]).length} drop(s) configurado(s)</small></div></article>`}
async function refreshContent(){try{await window.refreshAdminContentFromServer?.()}catch{}}
async function renderNpcs(){await refreshContent();let all=(window.getAllNpcTypes?.()||[]).filter(x=>!x.isBoss);document.getElementById('v8-npcs').innerHTML=all.length?all.map(x=>cardNpc(x,false)).join(''):'<p>Nenhum NPC encontrado.</p>'}
async function renderBosses(){await refreshContent();let all=(window.getAllNpcTypes?.()||[]).filter(x=>x.isBoss);document.getElementById('v8-bosses').innerHTML=all.length?all.map(x=>cardNpc(x,true)).join(''):'<p>Nenhum Boss encontrado.</p>'}
function renderSkills(){document.getElementById('v8-skills').innerHTML=[['✦','Corte Sombrio','Aumenta o poder dos ataques.'],['♥','Sangue do Abismo','Fortalece a vida do caçador.'],['➤','Passo Fantasma','Melhora mobilidade e esquiva.'],['☠','Ceifador','Especialização contra bosses.']].map(x=>`<article class="v8-card"><span>${x[0]}</span><div><b>${x[1]}</b><p>${x[2]}</p></div></article>`).join('')}
let cache=null,mode='level';
async function loadRank(force=false){const el=document.getElementById('v8-ranking');el.innerHTML='<p>Carregando ranking...</p>';try{if(!cache||force){const r=await window.apiCall('ranking',{});if(!r?.sucesso)throw Error(r?.mensagem||'Falha');cache=r.dados||{}}renderRank(mode)}catch(e){el.innerHTML='<p class="v8-error">Ranking indisponível: '+safe(e.message)+'</p>'}}
function renderRank(m){mode=m;const rows=cache?.[m]||[],key=m==='level'?'level':m==='coins'?'moedas':'money',icon=m==='level'?'🏆':m==='coins'?'🪙':'💰';document.getElementById('v8-ranking').innerHTML=rows.length?rows.slice(0,100).map((j,i)=>`<div class="v8-rank-row"><strong>${i<3?['🥇','🥈','🥉'][i]:'#'+(i+1)}</strong><span>${safe(j.nome)}</span><small>Nv. ${Number(j.level)||1}</small><b>${icon} ${Number(j[key]||0).toLocaleString('pt-BR')}</b></div>`).join(''):'<p>Nenhum jogador encontrado.</p>'}
function hookEnemyDrops(){if(window.Enemy?.prototype)return; /* classe pode não estar global; sprites chama hook abaixo */ }
window.ShadowV9={addItem,rollDrops,getInventory:()=>inv,getEconomy:()=>eco};
document.addEventListener('DOMContentLoaded',()=>{
 const bind=(id,screen,render)=>document.getElementById(id)?.addEventListener('click',async()=>{show(screen);await render?.()});
 bind('skills-btn-menu','skills-screen',renderSkills);bind('npcs-btn-menu','npcs-screen',renderNpcs);bind('bosses-btn-menu','bosses-screen',renderBosses);bind('ranking-btn-menu','ranking-screen',()=>loadRank(false));bind('system-btn-menu','system-screen');
 bind('inventory-btn-menu','inventory-screen',renderInventory);
 document.getElementById('inventory-back-btn')?.addEventListener('click',home);
 document.querySelectorAll('.v8-back').forEach(b=>b.addEventListener('click',home));
 document.querySelectorAll('[data-v8rank]').forEach(b=>b.addEventListener('click',()=>renderRank(b.dataset.v8rank)));
 document.getElementById('v8-fullscreen')?.addEventListener('click',()=>document.getElementById('v2-fullscreen-btn')?.click());
 document.getElementById('v8-reload')?.addEventListener('click',()=>location.reload());
 document.getElementById('v9-game-fullscreen')?.addEventListener('click',()=>document.getElementById('v2-fullscreen-btn')?.click());
 setInterval(syncProfile,1000);syncProfile();
});
})();