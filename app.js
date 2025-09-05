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
    badges: [],
    neighborhoods: [],
    questsDone: 0,
    filter: "all",
    search: ""
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
    $("#saveSettings").addEventListener("click", () => { state.hero.name=$("#heroName").value||"Stewart"; state.hero.cls=$("#heroClass").value; save(); renderAll(); });
    $("#exportBtn").addEventListener("click", exportData);
    $("#importFile").addEventListener("change", e => { const f = e.target.files[0]; if (f) importData(f); });
    $("#resetBtn").addEventListener("click", resetAll);
    $("#tabs").addEventListener("click", e => { const b=e.target.closest('button.tab'); if(!b) return; $$(".tab").forEach(t=>t.classList.remove('active')); b.classList.add('active'); state.filter=b.dataset.filter; renderQuests(); });
    $("#search").addEventListener("input", e => { state.search = e.target.value; renderQuests(); });
    window.addEventListener('beforeunload', (e) => { const hasQuests = (state.quests||[]).length>0; if (hasQuests) { e.preventDefault(); e.returnValue=''; }});
  }

  function renderSettings(){ $("#heroName").value = state.hero.name||""; $("#heroClass").value = state.hero.cls||"Ranger"; }
  function renderAll(){ renderHeader(); renderStats(); renderQuests(); renderSettings(); }

  if ('serviceWorker' in navigator) { window.addEventListener('load', () => { navigator.serviceWorker.register('./sw.js').catch(()=>{}); }); }
  load(); bind(); renderAll();
})();