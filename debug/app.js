let state={quests:[]};
function save(){localStorage.setItem('lifequest-debug',JSON.stringify(state));}
function load(){let d=localStorage.getItem('lifequest-debug'); if(d) state=JSON.parse(d);}
function renderQuests(){
  let ul=document.getElementById('questList'); ul.innerHTML="";
  state.quests.forEach(q=>{let li=document.createElement('li'); li.textContent=q.title; ul.appendChild(li);});
}
function addQuest(q){q.createdAt=Date.now(); state.quests.unshift(q); save(); renderQuests();}
function addSamplePack(){['Explore','Cook','Train'].forEach(t=>addQuest({title:t}));}
function rollQuest(){addQuest({title:"Random Quest "+Math.floor(Math.random()*100)});}

function bind(){
  try{
    document.getElementById('questForm').addEventListener('submit',e=>{
      e.preventDefault(); addQuest({title:document.getElementById('qTitle').value}); e.target.reset();
    });
    document.getElementById('addSample').addEventListener('click',addSamplePack);
    document.getElementById('rollBtn').addEventListener('click',rollQuest);
    let db=document.getElementById('debugBanner'); db.style.display='inline-block'; db.textContent="JS ready: buttons bound";
  }catch(err){
    let db=document.getElementById('debugBanner'); db.style.display='inline-block'; db.style.background='#ef4444'; db.textContent='JS error: '+err.message;
  }
}
document.addEventListener('DOMContentLoaded',()=>{load(); bind(); renderQuests();});
