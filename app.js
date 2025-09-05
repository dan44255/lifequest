(() => {
  const $ = (sel, el=document) => el.querySelector(sel);
  const $$ = (sel, el=document) => Array.from(el.querySelectorAll(sel));
  const storeKey = "lifequest_v1";

  const state = {
    hero: { name: "Stewart", cls: "Ranger" },
    xp: 0,
    quests: [],
    streak: 0,
    lastDoneDate: null,
    lastRollDate: null,
    badges: [],
    neighborhoods: [],
    questsDone: 0,
    filter: "all",
    search: "",
    settings: { autoTheme: true, theme: "nature" }
  };

  const DIFF_XP = { Trivial:5, Easy:10, Medium:25, Hard:50, Epic:100 };
  const CLASS_BONUS = {
    "Ranger": { Explore: 1.10 },
    "Barbarian": { Wellbeing: 1.10 },
    "Bard": { Community: 1.10, Creative: 1.10 },
    "Druid": { Daily: 1.10 },
    "Rogue": { Work: 1.10 }
  };

  function save() { localStorage.setItem(storeKey, JSON.stringify(state)); }
  function load() {
    const raw = localStorage.getItem(storeKey);
    if (!raw) return;
    try { Object.assign(state, JSON.parse(raw)); } catch {}
    // Backfill defaults
    if (!state.settings) state.settings = { autoTheme: true, theme: "nature" };
  }

  // Theme logic
  const CLASS_THEME_MAP = {
    "Ranger": "nature",
    "Druid": "nature",
    "Barbarian": "dark",
    "Rogue": "dark",
    "Bard": "light"
  };
  function currentTheme(){
    if (state.settings?.autoTheme) {
      return CLASS_THEME_MAP[state.hero.cls] || "dark";
    }
    return state.settings?.theme || "dark";
  }
  function applyTheme(){
    const theme = currentTheme();
    document.documentElement.setAttribute('data-theme', theme);
  }

  function levelForXp(xp) {
    let lvl = 1, need = 100, total = 0;
    while (xp >= total + need) { total += need; lvl++; need = 100 * lvl; }
    const next = total + need;
    return { lvl, next, into: xp - total, span: need };
  }

  const fmt = d => new Date(d).toISOString().slice(0,10);

  function showToast(msg) {
    const dlg = $("#toast"); $("#toastMsg").textContent = msg;
    dlg.showModal(); setTimeout(() => dlg.close(), 1300);
  }

  function renderHeader() {
    const { lvl, next, into, span } = levelForXp(state.xp);
    $("#level").textContent = lvl;
    $("#xpText").textContent = state.xp;
    $("#nextXp").textContent = next;
    $("#xpFill").style.width = Math.round((into/span)*100) + "%";
  }

  function renderStats() {
    $("#streak").textContent = state.streak || 0;
    $("#questsDone").textContent = state.questsDone || 0;
    $("#neighCount").textContent = (state.neighborhoods||[]).length;
    $("#badgeCount").textContent = (state.badges||[]).length;
  }

  function renderGreeting(){
    const holder = $("#dmGreeting");
    if(!holder) return;
    const name = state.hero.name || "Adventurer";
    const cls = state.hero.cls || "Ranger";
    const today = new Date();
    const seed = parseInt(new Intl.DateTimeFormat('en-CA', { year:'numeric', month:'2-digit', day:'2-digit' }).format(today).replace(/[^0-9]/g,''), 10);
    function rand(n){ return (Math.abs(Math.sin(seed + n)) % 1); }
    function pick(arr, n=0){ return arr[Math.floor(rand(n)*arr.length)] }
    const dawns = ["A new day dawns","A fresh sun cuts through the haze","The city stirs like a sleeping dragon","Morning breaks over the rooftops","The wind carries rumors of XP"];
    const hooks = ["track something worth finding","sharpen your focus with one clear quest","leave a marker in a new neighbourhood","earn XP with a tiny move that matters","follow the path of most curiosity"];
    const stings = ["No audience required—just momentum.","Small steps, big story.","You don’t need perfect, only progress.","Today counts, even if it’s five minutes.","Courage first, polish later."];
    const classNudges = {
      "Ranger": ["Scout a new trail","Map a ravine loop","Find a quiet overlook"],
      "Barbarian": ["Win a wellbeing duel","Do a hard thing early","Choose the cold plunge"],
      "Bard": ["Speak to a stranger kindly","Draft a 4-line poem","Share a story tonight"],
      "Druid": ["Do the small daily that stacks","Tend to your space","Breathe, then begin"],
      "Rogue": ["Upgrade one resume bullet","Apply to one role","Ship a 30-minute task"]
    };
    const nudgeA = pick(dawns,1);
    const nudgeB = pick(hooks,2);
    const nudgeC = pick(stings,3);
    const classPick = pick(classNudges[cls] || classNudges["Rogue"],4);
    holder.innerHTML = `<div class="dm-card"><div class="dm-title">🎲 ${name} the ${cls}</div><div class="dm-body">${nudgeA}. Today, ${nudgeB}. ${nudgeC} ${classPick}.</div><div class="dm-foot">Changes daily • Your save is local to this device</div></div>`;
  }

  function addQuest(d) {
    state.quests.push({
      id: Math.random().toString(36).slice(2,9),
      title: d.title.trim(),
      category: d.category,
      difficulty: d.difficulty,
      neighbourhood: d.neighbourhood?.trim() || "",
      due: d.due || "",
      notes: d.notes?.trim() || "",
      createdAt: Date.now()
    });
    save(); renderQuests();
  }

  // 🎲 Roll Quest logic
  function rollQuest() {
    const today = fmt(new Date());
    if (state.lastRollDate === today) {
      if (!confirm("You already rolled today. Roll again and add another side quest?")) return;
    }
    const cls = state.hero.cls || "Rogue";
    const table = {
      "Ranger": [
        { title:"Walk a street you've never taken", cat:"Explore", diff:"Easy", xp:10, notes:"Scout & note one detail" },
        { title:"Map a 20-min ravine loop", cat:"Explore", diff:"Medium", xp:25, notes:"Time it; mark start point" },
        { title:"Find a quiet overlook", cat:"Explore", diff:"Easy", xp:10, notes:"Breathe for 2 minutes" }
      ],
      "Barbarian": [
        { title:"Finish shower on cold for 30s", cat:"Wellbeing", diff:"Trivial", xp:5, notes:"Roar optional" },
        { title:"Do 15 push-ups today", cat:"Wellbeing", diff:"Easy", xp:10, notes:"Split sets fine" },
        { title:"One ‘hard thing’ before noon", cat:"Wellbeing", diff:"Medium", xp:25, notes:"Name it, then do it" }
      ],
      "Bard": [
        { title:"Write four lines of verse", cat:"Creative", diff:"Easy", xp:15, notes:"Keep one vivid image" },
        { title:"Say one kind thing to a stranger", cat:"Community", diff:"Easy", xp:10, notes:"Genuine counts" },
        { title:"Tell a 60s story tonight", cat:"Community", diff:"Medium", xp:25, notes:"Any audience is fine" }
      ],
      "Druid": [
        { title:"Tidy one small surface", cat:"Daily", diff:"Trivial", xp:5, notes:"Before/after photo optional" },
        { title:"10-min walk with deep breaths", cat:"Daily", diff:"Easy", xp:10, notes:"Count 30 steady breaths" },
        { title:"Prep tomorrow’s water/gear", cat:"Daily", diff:"Easy", xp:10, notes:"Set it by the door" }
      ],
      "Rogue": [
        { title:"Send one bold application", cat:"Work", diff:"Medium", xp:25, notes:"Short + confident" },
        { title:"Upgrade a resume bullet", cat:"Work", diff:"Easy", xp:10, notes:"Add metric & impact" },
        { title:"Ship one 30-min task", cat:"Work", diff:"Easy", xp:10, notes:"Timer on, go" }
      ]
    };
    const picks = table[cls] || table["Rogue"];
    const item = picks[Math.floor(Math.random()*picks.length)];
    addQuest({
      title: "🎲 " + item.title,
      category: item.cat,
      difficulty: item.diff,
      neighbourhood: "",
      due: today,
      notes: item.notes
    });
    state.lastRollDate = today;
    save();
    showToast(`Side quest added: ${item.title} (+${item.xp||0} XP on completion)`);
  }

  function renderQuests() {
    const list = $("#questList"); list.innerHTML = "";
    let qs = state.quests.slice().sort((a,b)=>(a.createdAt||0)-(b.createdAt||0));
    if (state.filter!=="all") qs = qs.filter(q=>q.category===state.filter);
    if (state.search) { const s = state.search.toLowerCase(); qs = qs.filter(q => (q.title+q.notes).toLowerCase().includes(s)); }
    $("#emptyState").style.display = qs.length ? "none" : "block";
    qs.forEach(q => {
      const node = $("#questItemTpl").content.firstElementChild.cloneNode(true);
      $(".quest-title", node).textContent = q.title;
      const meta = [];
      meta.push(q.category + " • " + q.difficulty + " • " + (DIFF_XP[q.difficulty]||0) + " XP");
      if (q.neighbourhood) meta.push("📍 " + q.neighbourhood);
      if (q.due) meta.push("⏳ " + q.due);
      if (q.notes) meta.push("🗒 " + q.notes);
      $(".quest-meta", node).textContent = meta.join("   ");
      $(".complete", node).addEventListener("click", () => completeQuest(q.id));
      $(".delete", node).addEventListener("click", () => deleteQuest(q.id));
      $(".edit", node).addEventListener("click", () => editQuest(q.id));
      list.appendChild(node);
    });
  }

  function applyBonus(cat, base) {
    const mult = (CLASS_BONUS[state.hero.cls]||{})[cat] || 1;
    return Math.round(base * mult);
  }

  function completeQuest(id) {
    const i = state.quests.findIndex(q=>q.id===id); if (i===-1) return;
    const q = state.quests[i];
    let gain = applyBonus(q.category, DIFF_XP[q.difficulty]||0);
    state.xp += gain;
    state.quests.splice(i,1);
    state.questsDone = (state.questsDone||0)+1;
    const today = fmt(new Date());
    if (state.lastDoneDate) {
      const prev = new Date(state.lastDoneDate);
      const diffDays = Math.floor((new Date(today)-new Date(fmt(prev)))/(24*3600*1000));
      if (diffDays===1) state.streak=(state.streak||0)+1;
      else if (diffDays===0){} else state.streak=1;
    } else state.streak=1;
    state.lastDoneDate = today;
    if (q.neighbourhood) {
      const set = new Set(state.neighborhoods||[]); set.add(q.neighbourhood.trim());
      state.neighborhoods = Array.from(set);
    }
    maybeBadges();
    save(); renderHeader(); renderStats(); renderQuests();
    showToast(`+${gain} XP — Quest Complete!`);
  }

  function maybeBadges() {
    const add = (code,name) => {
      if (!state.badges.find(b=>b.code===code)) { state.badges.push({code,name,date:new Date().toISOString()}); showToast("🏅 "+name); }
    };
    const { lvl } = levelForXp(state.xp);
    if (lvl>=5) add("lvl5","Level 5: Streetwise");
    if (lvl>=10) add("lvl10","Level 10: City Stalwart");
    if ((state.neighborhoods||[]).length>=5) add("neigh5","Explorer I");
    if ((state.neighborhoods||[]).length>=12) add("neigh12","Explorer II");
    if ((state.questsDone||0)>=25) add("q25","Taskmaster I");
    if ((state.questsDone||0)>=100) add("q100","Taskmaster II");
    if ((state.streak||0)>=7) add("streak7","Weekly Streak");
    if ((state.streak||0)>=30) add("streak30","Monthly Streak");
  }

  function deleteQuest(id) { state.quests = state.quests.filter(q=>q.id!==id); save(); renderQuests(); }
  function editQuest(id) {
    const q = state.quests.find(x=>x.id===id); if(!q) return;
    const t = prompt("Edit title:", q.title); if (t===null) return; q.title=t.trim();
    const c = prompt("Edit category (Daily/Work/Explore/Wellbeing/Community/Creative):", q.category); if (c) q.category=c;
    const d = prompt("Edit difficulty (Trivial/Easy/Medium/Hard/Epic):", q.difficulty); if (d) q.difficulty=d;
    const n = prompt("Edit neighbourhood:", q.neighbourhood); if (n!==null) q.neighbourhood=n;
    const due = prompt("Edit due date (YYYY-MM-DD):", q.due); if (due!==null) q.due=due;
    const notes = prompt("Edit notes:", q.notes); if (notes!==null) q.notes=notes;
    save(); renderQuests();
  }

  function exportData() {
    const data = JSON.stringify(state,null,2);
    const url = URL.createObjectURL(new Blob([data],{type:'application/json'}));
    const a = document.createElement('a'); a.href=url; a.download='lifequest-data.json'; a.click();
    URL.revokeObjectURL(url);
  }
  function importData(file) {
    const reader = new FileReader();
    reader.onload = e => { try { Object.assign(state, JSON.parse(e.target.result)); save(); renderAll(); showToast('Data imported!'); } catch(err){ alert('Import failed: '+err.message); } };
    reader.readAsText(file);
  }
  function resetAll(){ if(!confirm('This will wipe your local data. Proceed?'))return; localStorage.removeItem(storeKey); location.reload(); }

  function addSamplePack() {
    const today = new Date().toISOString().slice(0,10);
    [
      { title:"Morning cold plunge + stretch", category:"Wellbeing", difficulty:"Medium", neighbourhood:"", due:today, notes:"Breathing + 3x30s plank" },
      { title:"Scout a new ravine trail", category:"Explore", difficulty:"Medium", neighbourhood:"Don Valley", due:"", notes:"Map a loop, time it" },
      { title:"Update resume bullet for bartending", category:"Work", difficulty:"Easy", neighbourhood:"", due:today, notes:"Metric + action verb" },
      { title:"Library recon & card check", category:"Daily", difficulty:"Trivial", neighbourhood:"TPL", due:"", notes:"Grab holds; find creative room" },
      { title:"Open mic night story", category:"Community", difficulty:"Hard", neighbourhood:"Kensington", due:"", notes:"5-min set" },
      { title:"Forge a poem draft", category:"Creative", difficulty:"Easy", neighbourhood:"", due:"", notes:"4 lines, vivid image" }
    ].forEach(addQuest);
    showToast("Sample quests added!");
  }

  function bind() {
    $("#questForm").addEventListener("submit", e => {
      e.preventDefault();
      addQuest({
        title: $("#qTitle").value,
        category: $("#qCategory").value,
        difficulty: $("#qDifficulty").value,
        neighbourhood: $("#qNeighbourhood").value,
        due: $("#qDue").value,
        notes: $("#qNotes").value
      });
      e.target.reset();
    });
    $("#addSample").addEventListener("click", addSamplePack);
    $("#openSettings").addEventListener("click", () => $("#settingsDialog").showModal());
    $("#saveSettings").addEventListener("click", () => {
      state.hero.name=$("#heroName").value||"Stewart";
      state.hero.cls=$("#heroClass").value;
      state.settings.autoTheme = $("#autoTheme").checked;
      state.settings.theme = $("#themeSelect").value;
      save(); renderAll();
    });
    $("#exportBtn").addEventListener("click", exportData);
    $("#importFile").addEventListener("change", e => { const f = e.target.files[0]; if (f) importData(f); });
    $("#resetBtn").addEventListener("click", resetAll);
    $("#tabs").addEventListener("click", e => { const b=e.target.closest('button.tab'); if(!b) return; $$(".tab").forEach(t=>t.classList.remove('active')); b.classList.add('active'); state.filter=b.dataset.filter; renderQuests(); });
    $("#search").addEventListener("input", e => { state.search = e.target.value; renderQuests(); });
    $("#rollBtn").addEventListener("click", rollQuest);
  }

  function renderSettings(){
    $("#heroName").value = state.hero.name||"";
    $("#heroClass").value = state.hero.cls||"Ranger";
    $("#autoTheme").checked = !!state.settings.autoTheme;
    $("#themeSelect").value = state.settings.theme || "nature";
    $("#themeSelect").disabled = !!state.settings.autoTheme;
    $("#autoTheme").addEventListener("change", e => { $("#themeSelect").disabled = e.target.checked; });
  }

  function renderAll(){ applyTheme(); renderHeader(); renderStats(); renderGreeting(); renderQuests(); renderSettings(); }

  if ('serviceWorker' in navigator) { window.addEventListener('load', () => { navigator.serviceWorker.register('./sw.js').catch(()=>{}); }); }
  load(); bind(); renderAll();
})();