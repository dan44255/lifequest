
// ---------- State ----------
const state = {
  hero: { name: "Stewart", cls: "Ranger" },
  xp: 0, level: 1, nextXp: 100,
  streak: 0, lastDone: null,
  badges: [],
  quests: [],
  filter: 'all',
  search: '',
  settings: { autoTheme: false, theme: "barddeep" }
};

// ---------- Constants ----------
const DIFF_XP = { "Trivial":10, "Easy":20, "Medium":40, "Hard":80, "Epic":150 };
const CLASS_BONUS = {
  "Ranger": { Explore: 0.10 },
  "Barbarian": { Wellbeing: 0.10 },
  "Bard": { Community: 0.10, Creative: 0.10 },
  "Druid": { Daily: 0.10 },
  "Rogue": { Work: 0.10 }
};
const CLASS_THEME_MAP = { Ranger: "nature", Druid: "nature", Barbarian: "crimson", Rogue: "neon", Bard: "parchment" };

// ---------- Storage ----------
function save(){ localStorage.setItem("lifequest-v84", JSON.stringify(state)); }
function load(){ try{ const d = localStorage.getItem("lifequest-v84"); if(d){ Object.assign(state, JSON.parse(d)); } }catch(e){} }

// ---------- Theme ----------
function currentTheme(){ return state.settings.autoTheme ? (CLASS_THEME_MAP[state.hero.cls]||"parchment") : (state.settings.theme||"parchment"); }
function applyTheme(){ document.documentElement.setAttribute('data-theme', currentTheme()); }

// ---------- Helpers ----------
const $ = s => document.querySelector(s);
function showToast(msg){ const d=$("#toast"); const m=$("#toastMsg"); if(!d||!m) return; m.textContent=msg; d.show(); setTimeout(()=>d.close(),1000); }
function formatDate(ts){ const d = new Date(ts); return d.toLocaleDateString(); }

// ---------- Rendering ----------
function renderHeader(){
  $("#level").textContent = state.level;
  $("#xpText").textContent = state.xp;
  $("#nextXp").textContent = state.nextXp;
  $("#xpFill").style.width = Math.min(100, (state.xp/state.nextXp)*100) + "%";
}
function renderStats(){
  $("#questsDone").textContent = state.quests.filter(q=>q.done).length;
  const ns = new Set(state.quests.filter(q=>q.neighbourhood).map(q=>q.neighbourhood.toLowerCase().trim()));
  $("#neighCount").textContent = ns.size;
  $("#badgeCount").textContent = state.badges.length;
  $("#streak").textContent = state.streak||0;
}
function dailyGreeting(){
  const name = state.hero.name || "Adventurer";
  const cls = state.hero.cls || "Wanderer";
  const flavour = [
    "Sharpen focus with one clear quest.",
    "Today counts, even if it's five minutes.",
    "Scout a quiet corner. Listen for clues.",
    "Trade doomscrolling for a tiny win.",
    "Add one friendly hello to your map."
  ];
  const seed = new Date().toDateString().length % flavour.length;
  return `${name} the ${cls} — ${flavour[seed]} <br><span class="muted">Your save is local to this device.</span>`;
}
function renderGreeting(){ $("#dmGreeting").innerHTML = `<div class="dm-card">${dailyGreeting()}</div>`; }

function renderQuests(){
  const list = $("#questList"); const empty = $("#emptyState");
  list.innerHTML = "";
  let qs = state.quests.slice().sort((a,b)=>(b.createdAt||0)-(a.createdAt||0));
  if (state.filter!=='all') qs = qs.filter(q=>q.category===state.filter);
  if (state.search) qs = qs.filter(q=> (q.title||'').toLowerCase().includes(state.search.toLowerCase()));
  empty.style.display = qs.length? "none":"block";

  const tpl = document.getElementById("questItemTpl");
  qs.forEach(q=>{
    const node = tpl.content.firstElementChild.cloneNode(true);
    node.querySelector(".quest-title").textContent = q.title;
    const meta = [];
    if (q.category) meta.push(q.category);
    if (q.difficulty) meta.push(q.difficulty);
    if (q.neighbourhood) meta.push(q.neighbourhood);
    if (q.due) meta.push(`Due ${q.due}`);
    if (q.done) meta.push(`✓ done`);
    node.querySelector(".quest-meta").textContent = meta.join(" • ");

    node.querySelector(".complete").addEventListener("click", ()=>completeQuest(q));
    node.querySelector(".edit").addEventListener("click", ()=>{
      const t = prompt("Edit title", q.title||""); if (t!=null){ q.title=t.trim(); save(); renderQuests(); }
    });
    node.querySelector(".delete").addEventListener("click", ()=>{
      state.quests = state.quests.filter(x=>x!==q); save(); renderStats(); renderQuests();
    });

    list.appendChild(node);
  });
}

// ---------- XP / Level / Streak / Badges ----------
function addXp(n){
  state.xp += n;
  while (state.xp >= state.nextXp){
    state.xp -= state.nextXp;
    state.level += 1;
    state.nextXp = Math.round(state.nextXp*1.25);
    showToast(`Level Up! → ${state.level}`);
  }
  save(); renderHeader();
}
function updateStreakOnComplete(){
  const today = new Date(); today.setHours(0,0,0,0);
  const last = state.lastDone ? new Date(state.lastDone) : null;
  if (!last){ state.streak = 1; }
  else{
    last.setHours(0,0,0,0);
    const diffDays = (today - last)/(24*3600*1000);
    if (diffDays===0){ /* same day, keep streak */ }
    else if (diffDays===1){ state.streak = (state.streak||0)+1; }
    else { state.streak = 1; }
  }
  state.lastDone = Date.now();
}
function recalcBadges(){
  const badges = new Set(state.badges);
  const done = state.quests.filter(q=>q.done).length;
  const nhoods = new Set(state.quests.filter(q=>q.neighbourhood).map(q=>q.neighbourhood.toLowerCase().trim())).size;

  if (done>=1) badges.add("First Steps");
  if (done>=10) badges.add("Tenacious");
  if (nhoods>=3) badges.add("Explorer I");
  if ((state.streak||0)>=3) badges.add("Streak 3");

  state.badges = Array.from(badges);
}

// ---------- Actions ----------
function addQuest(q){
  const item = {
    title: (q.title||"Untitled").trim(),
    category: q.category||"Daily",
    difficulty: q.difficulty||"Trivial",
    neighbourhood: q.neighbourhood||"",
    due: q.due||"",
    notes: q.notes||"",
    createdAt: Date.now(),
    done:false
  };
  state.quests.unshift(item);
  state.filter='all'; state.search='';
  save(); renderStats(); renderQuests();
  document.getElementById('questList').scrollIntoView({behavior:'smooth'});
}
function completeQuest(q){
  if (q.done) return;
  q.done = true;
  const base = DIFF_XP[q.difficulty||"Trivial"]||10;
  const bonus = (CLASS_BONUS[state.hero.cls]?.[q.category]||0);
  const gain = Math.round(base * (1+bonus));
  addXp(gain);
  updateStreakOnComplete();
  recalcBadges();
  save(); renderStats(); renderQuests();
  showToast(`+${gain} XP — Quest Complete!`);
}
function rollQuest(){
  const tiny = [
    { title:"Five-minute focus", category:"Daily", difficulty:"Trivial" },
    { title:"Talk to a stranger (kindly)", category:"Community", difficulty:"Easy" },
    { title:"Scout a new alley mural", category:"Explore", difficulty:"Easy" },
    { title:"Bodyweight set x3", category:"Wellbeing", difficulty:"Medium" }
  ];
  const pick = tiny[Math.floor(Math.random()*tiny.length)];
  addQuest(pick);
}
function addSamplePack(){
  [
    {title:"Train",category:"Wellbeing",difficulty:"Easy"},
    {title:"Cook",category:"Daily",difficulty:"Easy"},
    {title:"Explore",category:"Explore",difficulty:"Easy"},
    {title:"Message a friend",category:"Community",difficulty:"Trivial"},
    {title:"Portfolio tweak",category:"Work",difficulty:"Medium"},
    {title:"Sketch a scene",category:"Creative",difficulty:"Easy"}
  ].forEach(addQuest);
}

// ---------- Bind ----------
function buildSwatches(){
  const SW = [
    ["parchment","Parchment"],["nature","Nature"],["dark","Dark"],
    ["neon","Neon"],["crimson","Crimson"],["jewel","Jewel"],["barddeep","Bard Deep"]
  ];
  const wrap = document.getElementById('swatches'); if(!wrap) return;
  wrap.innerHTML="";
  SW.forEach(([v,label])=>{
    const d=document.createElement('div'); d.className='swatch'; d.style.background='var(--card)'; d.dataset.value=v;
    d.textContent=label;
    d.addEventListener('click', ()=>{ document.getElementById('themeSelect').value=v; applyThemeFromSettingsPreview(); });
    wrap.appendChild(d);
  });
}
function applyThemeFromSettingsPreview(){
  const prev = document.getElementById('themeSelect').value;
  document.documentElement.setAttribute('data-theme', prev);
}

function bind(){
  const form = document.getElementById('questForm');
  if (form) form.addEventListener('submit', e=>{
    e.preventDefault();
    addQuest({
      title: document.getElementById('qTitle').value,
      category: document.getElementById('qCategory').value,
      difficulty: document.getElementById('qDifficulty').value,
      neighbourhood: document.getElementById('qNeighbourhood').value,
      due: document.getElementById('qDue').value,
      notes: document.getElementById('qNotes').value
    });
    e.target.reset();
  });
  const tabs = document.getElementById('tabs');
  if (tabs) tabs.addEventListener('click', e=>{
    const b=e.target.closest('button.tab'); if(!b) return;
    document.querySelectorAll('.tab').forEach(t=>t.classList.remove('active'));
    b.classList.add('active'); state.filter=b.dataset.filter; renderQuests();
  });
  const search = document.getElementById('search');
  if (search) search.addEventListener('input', e=>{ state.search=e.target.value; renderQuests(); });

  document.getElementById('rollBtn')?.addEventListener('click', rollQuest);
  document.getElementById('addSample')?.addEventListener('click', addSamplePack);
  document.getElementById('openSettings')?.addEventListener('click', ()=>{
    buildSwatches();
    document.getElementById('themeSelect').value = state.settings.theme||"parchment";
    document.getElementById('autoTheme').checked = !!state.settings.autoTheme;
    document.getElementById('heroName').value = state.hero.name||"";
    document.getElementById('heroClass').value = state.hero.cls||"Ranger";
    applyThemeFromSettingsPreview();
    document.getElementById('settingsDialog').showModal();
  });
  document.getElementById('saveSettings')?.addEventListener('click', ()=>{
    state.hero.name = document.getElementById('heroName').value||"Stewart";
    state.hero.cls = document.getElementById('heroClass').value||"Ranger";
    state.settings.autoTheme = document.getElementById('autoTheme').checked;
    state.settings.theme = document.getElementById('themeSelect').value;
    save(); renderAll();
  });
  document.getElementById('exportBtn')?.addEventListener('click', ()=>{
    const blob = new Blob([JSON.stringify(state,null,2)],{type:'application/json'});
    const a = document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='lifequest-save.json'; a.click();
  });
  document.getElementById('importFile')?.addEventListener('change', e=>{
    const f = e.target.files[0]; if(!f) return;
    const r = new FileReader(); r.onload = () => { Object.assign(state, JSON.parse(r.result)); save(); renderAll(); };
    r.readAsText(f);
  });
  document.getElementById('resetBtn')?.addEventListener('click', ()=>{
    if (!confirm("Reset all data?")) return;
    localStorage.removeItem('lifequest-v84'); location.reload();
  });
}

// ---------- Render All ----------
function renderAll(){ applyTheme(); renderHeader(); renderStats(); renderGreeting(); renderQuests(); }

// ---------- Boot (safe) ----------
document.addEventListener('DOMContentLoaded', ()=>{
  try{
    load(); bind(); renderAll();
    const b=document.getElementById('debugBanner'); if(b){ b.style.display='inline-block'; b.textContent='JS ready: buttons bound'; }
  }catch(e){
    const b=document.getElementById('debugBanner'); if(b){ b.style.display='inline-block'; b.style.background='#ef4444'; b.textContent='Fatal: '+e.message; }
    console.error(e);
  }
});

// ---------- PWA ----------
if ('serviceWorker' in navigator){
  window.addEventListener('load', ()=>{ navigator.serviceWorker.register('./sw.js'); });
}
