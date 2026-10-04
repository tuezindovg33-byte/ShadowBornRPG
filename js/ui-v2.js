(() => {
  function toast(msg){ const old=document.querySelector('.v2-toast'); if(old)old.remove(); const e=document.createElement('div');e.className='v2-toast';e.textContent=msg;document.body.appendChild(e);setTimeout(()=>e.remove(),2200); }
  function sync(){
    const r=window.ShadowRPG?.getData?.(); if(r){
      const level=document.getElementById('v2-level'), exp=document.getElementById('v2-exp'), txt=document.getElementById('v2-exp-text');
      if(level) level.textContent=r.level||1;
      const need=100+((r.level||1)-1)*75; if(exp) exp.style.width=Math.min(100,(r.xp||0)/need*100)+'%'; if(txt)txt.textContent=`${r.xp||0} / ${need}`;
      ['power','agility','vigor'].forEach(k=>{const el=document.getElementById('v2-'+k);if(el)el.textContent=r.stats?.[k]||0});
    }
    try{ const u=window.currentUser || JSON.parse(localStorage.getItem('jogoDeLuta_user')||'null'); const n=document.getElementById('v2-player-name'); if(n&&u?.nome)n.textContent=u.nome; }catch{}
  }
  document.addEventListener('DOMContentLoaded',()=>{
    document.querySelectorAll('[data-v2tab]').forEach(b=>b.addEventListener('click',()=>{
      const t=b.dataset.v2tab;if(t==='inicio')return;
      const labels={skills:'Árvore de Habilidades',npcs:'Bestiário / NPCs',bosses:'Arquivo de Bosses',system:'Sistema'};
      toast((labels[t]||t)+' — módulo preparado para a próxima expansão.');
    }));
    setInterval(sync,1200);sync();
  });
})();

// Fullscreen responsivo do ShadowBorn
(() => {
  function isFull(){ return !!(document.fullscreenElement || document.webkitFullscreenElement); }
  async function toggleFull(){
    const target=document.getElementById('game-wrapper') || document.documentElement;
    try{
      if(!isFull()){
        const fn=target.requestFullscreen || target.webkitRequestFullscreen;
        if(fn) await fn.call(target);
      } else {
        const fn=document.exitFullscreen || document.webkitExitFullscreen;
        if(fn) await fn.call(document);
      }
    }catch(e){ console.warn('Fullscreen indisponível:',e); }
  }
  function syncFull(){ const b=document.getElementById('v2-fullscreen-btn'); if(b){b.textContent=isFull()?'⤢':'⛶';b.title=isFull()?'Sair da tela cheia':'Tela cheia';} }
  document.addEventListener('DOMContentLoaded',()=>{ const b=document.getElementById('v2-fullscreen-btn'); if(b)b.addEventListener('click',toggleFull); syncFull(); });
  document.addEventListener('fullscreenchange',syncFull); document.addEventListener('webkitfullscreenchange',syncFull);
})();
