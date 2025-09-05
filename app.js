// ====== Core State ======
const STORAGE_KEY = 'lifequest-v8-2';
const DIFF_XP = { Trivial:10, Easy:20, Medium:35, Hard:60, Epic:100 };
const CLASS_BONUS = {
  "Ranger": { Explore: 1.1 },
  "Barbarian": { Wellbeing: 1.1 },
  "Bard": { Community: 1.1, Creative: 1.1 },
  "Druid": { Daily: 1.1 },
  "Rogue": { Work: 1.1 }
};
const CLASS_THEME_MAP = { Ranger:'rangerdeep', Druid:'druidmoss', Barbarian:'barbcrimson', Rogue:'rogueneon', Bard:'barddeep' };

let state = {
  hero: { name: 'Stewart', cls: 'Ranger', level: 1, xp: 0 },
  settings: { autoTheme: false, theme: 'barddeep' },
  filter: 'all',
  search: '',
  quests: [],      // {id,title,category,difficulty,neighbourhood,due,notes,done,createdAt,doneAt}
  badges: []
};

// ====== Storage ======
function save(){ localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
function load(){
  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw) { try { state = JSON.parse(raw); } catch(e){} }
  if (!state.settings) state.settings = { autoTheme:false, theme:'barddeep' };
}

// ====== Theme ======
function currentTheme(){ return state.settings.autoTheme ? (CLASS_THEME_MAP[state.hero.cls]||'parchment') : (state.settings.theme||'parchment'); }
function applyTheme(){ document.documentElement.setAttribute('data-theme', currentTheme()); }

// ====== UI Helpers ======
const $ = s => document.querySelector(s);
function showToast(msg) {
  const d = $('#toast');
  if (!d) return;
  $('#toastMsg').textContent = msg;
  d.show();
  setTimeout(()=>d.close(), 1200);
}

// ====== XP / Level ======
function nextXpFor(level){ return 100 * level; }
function addXp(amount){
  state.hero.xp += amount;
  while (state.hero.xp >= nextXpFor(state.hero.level)) {
    state.hero.xp -= nextXpFor(state.hero.level);
    state.hero.level++;
    showToast('Level up! Lvl '+state.hero.level);
  }
}

// ====== Quest Logic ======
function addQuest(q){
  const id = 'q'+Math.random().toString(36).slice(2);
  const clean = {
    id,
    title: q.title?.trim() || 'Untitled Quest',
    category: q.category || 'Daily',
    difficulty: q.difficulty || 'Trivial',
    neighbourhood: q.neighbourhood || '',
    due: q.due || '',
    notes: q.notes || '',
    done: false,
    createdAt: Date.now(),
    doneAt: 0
  };
  state.quests.push(clean);
  state.filter = 'all'; state.search = '';
  save(); renderQuests();
  document.getElementById('questList')?.scrollIntoView({behavior:'smooth'});
}

function completeQuest(id){
  const q = state.quests.find(x=>x.id===id);
  if (!q || q.done) return;
  q.done = true; q.doneAt = Date.now();
  const base = DIFF_XP[q.difficulty] || 10;
  const mult = (CLASS_BONUS[state.hero.cls]?.[q.category]||1);
  const gain = Math.round(base * mult);
  addXp(gain);
  save(); renderAll();
  showToast(`+${gain} XP — Quest Complete!`);
}

function deleteQuest(id){
  state.quests = state.quests.filter(x=>x.id!==id);
  save(); renderAll();
}

function editQuest(id){
  const q = state.quests.find(x=>x.id===id); if(!q) return;
  const t = prompt('Edit title', q.title); if (t===null) return;
  q.title = t.trim() || q.title; save(); renderAll();
}

function addSamplePack(){
  const samples = [
    {title:'Train', category:'Wellbeing', difficulty:'Easy'},
    {title:'Cook', category:'Daily', difficulty:'Trivial'},
    {title:'Explore', category:'Explore', difficulty:'Easy'},
    {title:'Message a friend', category:'Community', difficulty:'Trivial'},
    {title:'Journal 10m', category:'Creative', difficulty:'Easy'},
    {title:'Apply to 2 jobs', category:'Work', difficulty:'Medium'}
  ];
  samples.forEach(addQuest);
}

function rollQuest(){
  const cls = state.hero.cls;
  const pool = {
    Ranger: ['Walk a new side-street','Check a local trail','Note 3 birds or trees'],
    Barbarian: ['Push-ups x20','Cold splash','Long, brisk walk'],
    Bard: ['Compliment a stranger','Write 4 lines of verse','Hum a tune outdoors'],
    Druid: ['Tidy a corner','Breathe outside 5m','Make a herbal tea'],
    Rogue: ['Polish your resume line','Send 2 outreach messages','Tidy your inbox 10m']
  }[cls] || ['Drink water','Stretch 2 min','Clean desk 5 min'];
  addQuest({ title: pool[Math.floor(Math.random()*pool.length)], category:'Daily', difficulty:'Trivial' });
}

// ====== Rendering ======
function renderHeader(){
  $('#level').textContent = state.hero.level;
  const next = nextXpFor(state.hero.level);
  $('#nextXp').textContent = next;
  $('#xpText').textContent = state.hero.xp;
  const pct = Math.min(100, Math.round(100*state.hero.xp/next));
  $('#xpFill').style.width = pct+'%';
}

function renderGreeting(){
  const el = $('#dmGreeting');
  const name = state.hero.name || 'Adventurer';
  const lines = [
    `${name} the ${state.hero.cls}`,
    `The wind carries rumors of XP. Sharpen your focus with one clear quest today.`,
    `Your save is local to this device.`
  ];
  el.innerHTML = `<div class="dm-card"><div class="dm-title">${lines[0]}</div><div class="dm-body">${lines[1]}</div><div class="dm-foot">${lines[2]}</div></div>`;
}

function renderStats(){
  const done = state.quests.filter(q=>q.done);
  $('#questsDone').textContent = done.length;
  const days = new Set(done.map(q=> new Date(q.doneAt).toDateString()));
  $('#streak').textContent = days.size;
  const hoods = new Set(state.quests.map(q=>q.neighbourhood).filter(Boolean));
  $('#neighCount').textContent = hoods.size;
  $('#badgeCount').textContent = state.badges?.length || 0;
}

function questCard(q){
  const tpl = document.getElementById('questItemTpl');
  const node = tpl.content.firstElementChild.cloneNode(true);
  node.querySelector('.quest-title').textContent = q.title + (q.done?' • ✔️':'');
  const meta = [];
  meta.push(q.category); meta.push(q.difficulty);
  if (q.neighbourhood) meta.push(q.neighbourhood);
  if (q.due) meta.push('Due '+q.due);
  node.querySelector('.quest-meta').textContent = meta.join(' • ');
  node.querySelector('.complete').onclick = ()=> completeQuest(q.id);
  node.querySelector('.edit').onclick = ()=> editQuest(q.id);
  node.querySelector('.delete').onclick = ()=> deleteQuest(q.id);
  return node;
}

function renderQuests(){
  let qs = state.quests.slice().sort((a,b)=> (b.createdAt||0)-(a.createdAt||0));
  if (state.filter!=='all') qs = qs.filter(q=>q.category===state.filter);
  if (state.search) {
    const s = state.search.toLowerCase();
    qs = qs.filter(q => (q.title+' '+q.notes+' '+(q.neighbourhood||'')).toLowerCase().includes(s));
  }
  const list = $('#questList'); list.innerHTML = '';
  qs.forEach(q => list.appendChild(questCard(q)));
  $('#emptyState').style.display = qs.length ? 'none' : 'block';
}

function renderSettings(){
  $('#heroName').value = state.hero.name || '';
  $('#heroClass').value = state.hero.cls;
  $('#autoTheme').checked = !!state.settings.autoTheme;
  $('#themeSelect').value = state.settings.theme || 'parchment';
}

// ====== Render All ======
function renderAll(){ applyTheme(); renderHeader(); renderGreeting(); renderStats(); renderQuests(); }

// ====== Bind Events ======
function bind(){
  const form = $('#questForm');
  if (form) form.addEventListener('submit', e => {
    e.preventDefault();
    addQuest({
      title: $('#qTitle').value,
      category: $('#qCategory').value,
      difficulty: $('#qDifficulty').value,
      neighbourhood: $('#qNeighbourhood').value,
      due: $('#qDue').value,
      notes: $('#qNotes').value
    });
    e.target.reset();
  });
  $('#addSample')?.addEventListener('click', addSamplePack);
  $('#rollBtn')?.addEventListener('click', rollQuest);
  $('#openSettings')?.addEventListener('click', ()=> $('#settingsDialog').showModal());
  $('#saveSettings')?.addEventListener('click', ()=> {
    state.hero.name = $('#heroName').value || 'Stewart';
    state.hero.cls = $('#heroClass').value;
    state.settings.autoTheme = $('#autoTheme').checked;
    state.settings.theme = $('#themeSelect').value;
    save(); renderAll();
  });
  $('#resetBtn')?.addEventListener('click', ()=> { if(confirm('Reset all data?')){ localStorage.removeItem(STORAGE_KEY); location.reload(); } });
  $('#exportBtn')?.addEventListener('click', ()=> {
    const blob = new Blob([JSON.stringify(state,null,2)], {type:'application/json'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'lifequest-save.json'; a.click();
    URL.revokeObjectURL(url);
  });
  $('#importFile')?.addEventListener('change', e=> {
    const f = e.target.files[0]; if(!f) return;
    const r = new FileReader(); r.onload = () => { try { state = JSON.parse(r.result); save(); renderAll(); } catch{} };
    r.readAsText(f);
  });
  $('#tabs')?.addEventListener('click', e => {
    const b = e.target.closest('button.tab'); if (!b) return;
    document.querySelectorAll('.tab').forEach(t=>t.classList.remove('active'));
    b.classList.add('active'); state.filter = b.dataset.filter; renderQuests();
  });
  $('#search')?.addEventListener('input', e => { state.search = e.target.value; renderQuests(); });
  const b = document.getElementById('debugBanner'); if (b){ b.style.display='inline-block'; b.textContent='JS ready: buttons bound'; }
}

// ====== Boot ======
document.addEventListener('DOMContentLoaded', () => {
  try {
    load(); bind(); renderAll();
  } catch (e) {
    const b = document.getElementById('debugBanner'); if (b){ b.style.display='inline-block'; b.style.background='#ef4444'; b.textContent = 'Fatal: '+e.message; }
    console.error(e);
  }
});

// ====== Service Worker (cache-busted) ======
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('./sw.js?version=8.2').catch(()=>{});
}
