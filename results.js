let chart=null;

function init(){
  const raw=localStorage.getItem("knScope");
  if(!raw){window.location.href="index.html";return;}
  const {ans,rem,org,ass}=JSON.parse(raw);

  const vals=Object.values(ans).map(v=>SM[v]);
  const avg=vals.reduce((x,y)=>x+y,0)/vals.length;
  const m=getM(avg);

  document.getElementById("results-org-display").textContent=org+(ass?` · Assessed by ${ass}`:"");
  document.getElementById("result-big-score").innerHTML=`${avg.toFixed(2)}<span> / 4.0</span>`;
  document.getElementById("result-recommendation").textContent=m.rec;

  setTimeout(()=>{
    const p=Math.max(0,Math.min(100,((avg-1)/3)*100));
    document.getElementById("runway-fill").style.width=p+"%";
    document.getElementById("runway-marker").style.left=p+"%";
  },300);

  ["unprepared","early","ready","mature"].forEach(id=>{
    document.getElementById(`rl-${id}`)?.classList.remove("active");
    document.getElementById(`scale-${id}`).classList.remove("current");
  });
  document.getElementById(`rl-${m.id}`)?.classList.add("active");
  document.getElementById(`scale-${m.id}`).classList.add("current");

  // Gaps
  const gaps=[];
  DIMS.forEach(d=>d.q.forEach(q=>{
    if(ans[q.num]==='A'||ans[q.num]==='B')
      gaps.push({dim:d.title,signal:q.signal,gap:q.gap,severity:ans[q.num]==='A'?'Critical':'Significant'});
  }));
  const gapsList=document.getElementById("gaps-list");
  if(gaps.length===0){
    gapsList.innerHTML='<div class="gap-item" style="color:var(--kn-emerald)">No critical or significant governance gaps detected. Your posture is strong across all dimensions.</div>';
  }else{
    gaps.forEach(g=>{
      const item=document.createElement("div");
      item.className="gap-item";
      item.innerHTML=`<span class="gap-badge ${g.severity.toLowerCase()}">${g.severity}</span><div><div style="font-weight:600;margin-bottom:2px">${g.gap}</div><div style="color:var(--kn-slate);font-size:10px;font-family:var(--kn-mono);letter-spacing:0.04em">${g.dim} · ${g.signal}</div></div>`;
      gapsList.appendChild(item);
    });
  }

  // Dimension cards + chart data
  const cont=document.getElementById("dim-results-container");
  const lbls=[],data=[];
  DIMS.forEach(d=>{
    const ds=d.q.map(q=>ans[q.num]?SM[ans[q.num]]:0);
    const da=ds.reduce((x,y)=>x+y,0)/ds.length;
    lbls.push(d.title.split(" ").slice(0,2).join(" "));
    data.push(+da.toFixed(2));
    const sc=da<2?"low":da<3?"mid":"high";
    const qs=d.q.map(q=>{
      const isA=ans[q.num]==='A',isB=ans[q.num]==='B';
      const gt=isA?`<div class="dqr-gap critical">Critical Gap: ${q.gap}</div>`:isB?`<div class="dqr-gap significant">Governance Gap: ${q.gap}</div>`:"";
      return `<div class="dim-q-result">
        <span class="dqr-num">Q${q.num}</span>
        <div style="flex:1"><div class="dqr-text">${q.text}</div>${gt}${rem[q.num]?`<div class="dqr-remark">${rem[q.num]}</div>`:""}</div>
        <span class="dqr-answer">${ans[q.num]||"—"} · ${ans[q.num]?SM[ans[q.num]]:0}/4</span>
      </div>`;
    }).join("");
    const card=document.createElement("div");
    card.className="dim-result-card";
    card.innerHTML=`
      <div class="dim-result-header">
        <div class="dim-icon">${d.icon}</div>
        <div class="dim-result-title">${d.title}</div>
        <div class="dim-result-score ${sc}">${da.toFixed(2)}<span> / 4.0</span></div>
      </div>
      <div class="score-bar-track"><div class="score-bar-fill" style="width:${((da-1)/3)*100}%"></div></div>
      <div class="dim-result-body">${qs}</div>`;
    cont.appendChild(card);
  });

  // Radar chart
  if(chart)chart.destroy();
  const ctx=document.getElementById("results-chart").getContext("2d");
  chart=new Chart(ctx,{
    type:"radar",
    data:{labels:lbls,datasets:[{label:"Governance Score",data,backgroundColor:"rgba(141,163,176,0.12)",borderColor:"#7E9B8A",borderWidth:2,pointBackgroundColor:data.map(v=>v<2?"#C0392B":v<3?"#D4860A":"#7E9B8A"),pointBorderColor:"#FFFFFF",pointRadius:5}]},
    options:{responsive:true,plugins:{legend:{display:false},tooltip:{callbacks:{label:c=>` ${c.parsed.r.toFixed(2)} / 4.0`}}},scales:{r:{min:0,max:4,ticks:{stepSize:1,font:{family:"'Courier New',monospace",size:10},color:"#5C5A55"},grid:{color:"rgba(92,90,85,0.15)"},pointLabels:{font:{family:"'Inter',sans-serif",size:11,weight:"600"},color:"#1C1B19"}}}}
  });
}

init();
