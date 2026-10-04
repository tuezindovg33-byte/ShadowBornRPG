// ShadowBorn RPG — camada de progressão, atributos e missões.
(() => {
  const KEY = 'shadowborn_rpg_v2';
  const QUESTS = [
    { id:'first_blood', title:'Primeiro Sangue', desc:'Derrote 5 criaturas das sombras.', goal:5, type:'kills', rewardXP:80, rewardCoins:40 },
    { id:'hunter', title:'Caçador da Noite', desc:'Derrote 20 criaturas.', goal:20, type:'kills', rewardXP:180, rewardCoins:100 },
    { id:'conqueror', title:'Além do Véu', desc:'Conclua 3 fases.', goal:3, type:'phases', rewardXP:250, rewardCoins:150 }
  ];
  const defaultData = () => ({ level:1, xp:0, points:0, totalKills:0, phases:0, stats:{vigor:0,power:0,agility:0}, claimed:{} });
  let data = load();
  function load(){ try { return Object.assign(defaultData(), JSON.parse(localStorage.getItem(KEY)||'{}')); } catch { return defaultData(); } }
  function save(){ localStorage.setItem(KEY, JSON.stringify(data)); }
  function xpNeed(){ return 100 + (data.level-1)*75; }
  function addXP(n){ data.xp += n; while(data.xp >= xpNeed()){ data.xp -= xpNeed(); data.level++; data.points += 2; } save(); }
  function progress(q){ return q.type==='kills' ? data.totalKills : data.phases; }
  function claim(id){ const q=QUESTS.find(x=>x.id===id); if(!q || data.claimed[id] || progress(q)<q.goal) return; data.claimed[id]=true; addXP(q.rewardXP); if(window.awardCoins) awardCoins(q.rewardCoins); save(); renderQuests(); }
  function spend(stat){ if(data.points<1 || !Object.hasOwn(data.stats,stat)) return; data.points--; data.stats[stat]++; save(); renderCharacter(); }
  function renderCharacter(){
    const lv=document.getElementById('rpg-level'); if(!lv)return;
    lv.textContent=data.level; document.getElementById('rpg-xp-text').textContent=`${data.xp} / ${xpNeed()} XP`;
    document.getElementById('rpg-xp-fill').style.width=`${Math.min(100,data.xp/xpNeed()*100)}%`;
    document.getElementById('rpg-points').textContent=data.points;
    const defs=[['vigor','Vigor','Vida máxima',`+${data.stats.vigor*10} HP`],['power','Poder','Dano da katana',`+${data.stats.power*2} dano`],['agility','Agilidade','Movimento',`+${data.stats.agility*2}% vel.`]];
    document.getElementById('rpg-stats').innerHTML=defs.map(([k,n,d,b])=>`<div class="rpg-stat-card"><div><b>${n}</b><small>${d}</small></div><strong>${data.stats[k]}</strong><span>${b}</span><button data-stat="${k}" ${data.points<1?'disabled':''}>+</button></div>`).join('');
    document.querySelectorAll('[data-stat]').forEach(b=>b.onclick=()=>spend(b.dataset.stat));
  }
  function renderQuests(){
    const el=document.getElementById('quest-list'); if(!el)return;
    el.innerHTML=QUESTS.map(q=>{ const p=Math.min(progress(q),q.goal), done=p>=q.goal, claimed=data.claimed[q.id]; return `<article class="quest-card ${done?'complete':''}"><div class="quest-icon">${claimed?'✓':'☾'}</div><div class="quest-body"><b>${q.title}</b><p>${q.desc}</p><div class="quest-progress"><i style="width:${p/q.goal*100}%"></i></div><small>${p}/${q.goal} · ${q.rewardXP} XP · ${q.rewardCoins} moedas</small></div><button class="quest-claim" data-quest="${q.id}" ${!done||claimed?'disabled':''}>${claimed?'Coletado':done?'Coletar':'Em progresso'}</button></article>`}).join('');
    document.querySelectorAll('[data-quest]').forEach(b=>b.onclick=()=>claim(b.dataset.quest));
  }
  function open(id, renderer){ if(window.hideAllScreens) hideAllScreens(); document.getElementById(id).classList.remove('hidden'); renderer(); }
  window.ShadowRPG={
    showCharacter:()=>open('character-screen',renderCharacter), showQuests:()=>open('quests-screen',renderQuests),
    onEnemyDefeated:(enemy)=>{ data.totalKills++; addXP(enemy?.type?.isBoss?40:12); },
    onPhaseComplete:()=>{ data.phases++; addXP(50); },
    getBonuses:()=>({health:data.stats.vigor*10, damage:data.stats.power*2, speed:data.stats.agility*.02}),
    getData:()=>data
  };
})();
