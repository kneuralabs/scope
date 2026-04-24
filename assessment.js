const ans={},rem={};

function build(){
  const c=document.getElementById("dimensions-container"),pl=document.getElementById("dim-progress-list");
  DIMS.forEach(d=>{
    const qs=d.q.map(q=>`
      <div class="question-row" id="qrow-${q.num}">
        <div class="q-header">
          <span class="q-num">Q${q.num}</span>
          <span class="q-text">${q.text}</span>
          <span class="q-signal">${q.signal}</span>
        </div>
        <div class="options-grid">
          ${Object.entries(q.opt).map(([k,v])=>`
            <button class="option-btn" data-q="${q.num}" data-key="${k}" onclick="selectAnswer(${q.num},'${k}',this)">
              <span class="option-key">${k}</span><span class="option-text">${v}</span>
            </button>`).join("")}
        </div>
        <button class="add-note-trigger" id="note-trigger-${q.num}" style="display:none" onclick="addNote(${q.num})">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Add note
        </button>
      </div>
      <div class="remarks-row" id="remarks-row-${q.num}">
        <textarea class="remarks-input" placeholder="Optional context or remark…" rows="2" oninput="rem[${q.num}]=this.value"></textarea>
      </div>`).join("");

    const el=document.createElement("div");
    el.className="dimension open";
    el.innerHTML=`
      <div class="dimension-header" onclick="this.closest('.dimension').classList.toggle('open')">
        <div class="dim-icon">${d.icon}</div>
        <div class="dim-title-block"><div class="dim-title">${d.title}</div><div class="dim-subtitle">${d.subtitle}</div></div>
        <span class="dim-gov-tag">${d.govTag}</span>
        <div class="dim-score-badge" id="dim-badge-${d.id}">0 / ${d.q.length}</div>
        <svg class="dim-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor"><polyline points="6 9 12 15 18 9"></polyline></svg>
      </div>
      <div class="dimension-body">${qs}</div>`;
    c.appendChild(el);

    const pi=document.createElement("div");
    pi.className="dim-progress-item";
    pi.innerHTML=`<div class="dim-dot" id="dimDot-${d.id}"></div><span class="dim-progress-label">${d.title}</span><span class="dim-progress-count" id="dimPC-${d.id}">0/${d.q.length}</span>`;
    pl.appendChild(pi);
  });
}

function selectAnswer(q,k,btn){
  btn.closest(".question-row").querySelectorAll(".option-btn").forEach(b=>b.classList.remove("selected"));
  btn.classList.add("selected");
  ans[q]=k;
  document.getElementById(`note-trigger-${q}`).style.display="inline-flex";
  update();
}

function addNote(q){
  document.getElementById(`note-trigger-${q}`).style.display="none";
  const rr=document.getElementById(`remarks-row-${q}`);
  rr.classList.add("visible");
  rr.querySelector("textarea")?.focus();
}

function update(){
  const a=Object.keys(ans).length,t=TOTAL_Q,p=Math.round(a/t*100);
  document.getElementById("progress-count").innerHTML=`${a} <span>/ ${t} answered</span>`;
  document.getElementById("progress-bar").style.width=p+"%";
  document.getElementById("progress-pct").textContent=p+"%";

  DIMS.forEach(d=>{
    const da=d.q.filter(q=>ans[q.num]).length,to=d.q.length;
    document.getElementById(`dim-badge-${d.id}`).textContent=`${da}/${to}`;
    document.getElementById(`dimPC-${d.id}`).textContent=`${da}/${to}`;
    const dot=document.getElementById(`dimDot-${d.id}`);
    dot.className="dim-dot"+(da===to?" complete":da>0?" partial":"");
  });

  document.getElementById("submit-btn").disabled=a<t;

  if(a){
    const vals=Object.values(ans).map(v=>SM[v]);
    const avg=vals.reduce((x,y)=>x+y,0)/vals.length;
    const m=getM(avg);
    const gaps=Object.values(ans).filter(v=>v==='A'||v==='B').length;
    document.getElementById("live-result-card").classList.add("visible");
    document.getElementById("live-avg").textContent=avg.toFixed(2);
    const gapEl=document.getElementById("live-gaps");
    gapEl.textContent=gaps+(gaps===1?" gap":" gaps");
    gapEl.className="svalue"+(gaps>2?" alert":"");
    const badge=document.getElementById("live-maturity-badge");
    badge.textContent=m.label;badge.className=`maturity-badge ${m.status}`;
    document.getElementById("live-recommendation").textContent=m.rec;
  }
}

function resetAll(){
  Object.keys(ans).forEach(k=>delete ans[k]);
  Object.keys(rem).forEach(k=>delete rem[k]);
  document.querySelectorAll(".option-btn").forEach(b=>b.classList.remove("selected"));
  document.querySelectorAll(".remarks-row").forEach(r=>r.classList.remove("visible"));
  document.querySelectorAll(".remarks-input").forEach(i=>i.value="");
  document.querySelectorAll("[id^='note-trigger-']").forEach(t=>t.style.display="none");
  document.getElementById("live-result-card").classList.remove("visible");
  document.getElementById("submit-btn").disabled=true;
  update();
}

function generateResults(){
  const org=document.getElementById("org-name").value||"Your Organisation";
  const ass=document.getElementById("assessor-name").value;
  localStorage.setItem("knScope",JSON.stringify({ans,rem,org,ass}));

  // Show reveal overlay then redirect
  const ov=document.getElementById("reveal-overlay");
  const vals=Object.values(ans).map(v=>SM[v]);
  const avg=vals.reduce((x,y)=>x+y,0)/vals.length;
  const m=getM(avg);

  document.getElementById("reveal-maturity-tier").textContent=m.label;
  document.getElementById("reveal-score-display").innerHTML=`0.00<span> / 4.0</span>`;
  ov.classList.add("active");

  const govTags=DIMS.map(d=>d.govTag);
  let idx=0;
  const scanEl=document.getElementById("reveal-scan-line");
  scanEl.classList.add("visible");
  const iv=setInterval(()=>{
    if(idx<govTags.length){scanEl.textContent=`Scanning · ${govTags[idx++]}`;}
    else{clearInterval(iv);scanEl.textContent="Gap analysis complete";}
  },130);

  const scoreEl=document.getElementById("reveal-score-display");
  const start=performance.now(),dur=1200;
  function count(now){
    const e=now-start,p=Math.min(e/dur,1),cur=((p<1?(1-Math.pow(1-p,3))*avg:avg)).toFixed(2);
    scoreEl.innerHTML=`${cur}<span> / 4.0</span>`;
    if(p<1)requestAnimationFrame(count);
  }
  setTimeout(()=>requestAnimationFrame(count),500);
  setTimeout(()=>window.location.href="results.html",2600);
}

build();update();
