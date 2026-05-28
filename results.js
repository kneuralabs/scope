/* ============================================================
   Scope — Results logic
   ============================================================ */

let chart = null;

function accentVar() {
  return getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() || '#8a2a1f';
}
function cssVar(name) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

function init() {
  let parsed;
  try { parsed = JSON.parse(localStorage.getItem('scope') || 'null'); } catch (e) { parsed = null; }
  if (!parsed || !parsed.ans || !Object.keys(parsed.ans).length) {
    window.location.href = 'index.html';
    return;
  }
  const { ans, rem = {}, org, ass, ind, size } = parsed;

  const vals = Object.values(ans).map(v => SM[v]);
  const avg = vals.reduce((a, b) => a + b, 0) / vals.length;
  const m = getM(avg);

  // header
  document.getElementById('report-org').textContent = org || 'Your Organisation';
  const dateStr = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
  const meta = [ind, size, ass ? 'Assessed by ' + ass : '', dateStr].filter(Boolean);
  document.getElementById('report-meta').innerHTML = meta.join('&nbsp;&nbsp;·&nbsp;&nbsp;');
  document.getElementById('report-date').textContent = dateStr;
  document.getElementById('big-tier').textContent = m.label;
  document.getElementById('signal-rec').textContent = m.rec;

  // count up big score
  const bs = document.getElementById('big-score');
  const start = performance.now(), dur = 1000;
  (function up(now) {
    const p = Math.min((now - start) / dur, 1);
    const e = 1 - Math.pow(1 - p, 3);
    bs.innerHTML = (e * avg).toFixed(2) + '<span class="denom"> / 4.0</span>';
    if (p < 1) requestAnimationFrame(up);
  })(start);

  // maturity ladder
  const stops = document.getElementById('ladder-stops');
  stops.innerHTML = MAT.map(t => `
    <div class="ladder-stop ${t.id === m.id ? 'current' : ''}" data-id="${t.id}">
      <div class="ladder-stop-range">${t.min.toFixed(1)}–${t.max.toFixed(1)}</div>
      <div class="ladder-stop-label">${t.label}</div>
    </div>`).join('');
  const pos = Math.max(0, Math.min(100, ((avg - 1) / 3) * 100));
  setTimeout(() => {
    document.getElementById('ladder-fill').style.width = pos + '%';
    document.getElementById('ladder-marker').style.left = pos + '%';
    document.getElementById('ladder-marker-val').textContent = avg.toFixed(2);
  }, 250);

  // dimension scores
  const lbls = [], data = [], dimScores = [];
  DIMS.forEach(d => {
    const ds = d.q.map(q => ans[q.num] ? SM[ans[q.num]] : 0);
    const da = ds.reduce((a, b) => a + b, 0) / ds.length;
    lbls.push(d.govTag.replace(' Governance', ''));
    data.push(+da.toFixed(2));
    dimScores.push({ d, da });
  });

  // bars
  const barsList = document.getElementById('bars-list');
  barsList.innerHTML = dimScores.map(({ d, da }) => {
    const cls = da < 2 ? 'low' : da < 3 ? 'mid' : '';
    const w = ((da - 1) / 3) * 100;
    return `
    <div class="bar-row">
      <div class="bar-num ${cls === 'low' ? 'low' : ''}">${da.toFixed(2)}</div>
      <div class="bar-track-wrap">
        <div class="bar-label" style="margin-bottom:2px">
          <span class="bar-name">${d.title}</span>
        </div>
        <div class="bar-track"><div class="bar-fill ${cls}" data-w="${w}"></div></div>
      </div>
      <div class="bar-tag">${d.govTag}</div>
    </div>`;
  }).join('');
  setTimeout(() => {
    document.querySelectorAll('.bar-fill').forEach(f => { f.style.width = f.dataset.w + '%'; });
  }, 350);

  // stats
  const gapsArr = [];
  DIMS.forEach(d => d.q.forEach(q => {
    if (ans[q.num] === 'A' || ans[q.num] === 'B') {
      gapsArr.push({ dim: d.title, signal: q.signal, gap: q.gap, sev: ans[q.num] === 'A' ? 'critical' : 'significant' });
    }
  }));
  const critical = gapsArr.filter(g => g.sev === 'critical').length;
  const strong = Object.values(ans).filter(v => v === 'D').length;
  document.getElementById('stat-gaps').textContent = gapsArr.length;
  document.getElementById('stat-critical').textContent = critical;
  document.getElementById('stat-strong').textContent = strong;

  // gaps list (critical first)
  gapsArr.sort((a, b) => (a.sev === b.sev ? 0 : a.sev === 'critical' ? -1 : 1));
  const gapsList = document.getElementById('gaps-list');
  const gapsIntro = document.getElementById('gaps-intro');
  if (!gapsArr.length) {
    gapsIntro.textContent = '';
    gapsList.innerHTML = '<div class="gaps-none">No critical or significant gaps detected. Your governance posture is strong across all six dimensions — focus now on sustaining and auditing.</div>';
  } else {
    gapsIntro.textContent = `${gapsArr.length} structural gap${gapsArr.length > 1 ? 's' : ''} surfaced from answers marked A or B. Ordered by severity — address critical items first.`;
    gapsList.innerHTML = gapsArr.map((g, i) => `
      <div class="gap-item">
        <div class="gap-index">${String(i + 1).padStart(2, '0')}</div>
        <div class="gap-severity ${g.sev}"><span class="sev-dot"></span>${g.sev === 'critical' ? 'Critical' : 'Significant'}</div>
        <div class="gap-body">
          <div class="gap-text">${g.gap}</div>
          <div class="gap-src">${g.dim} · ${g.signal}</div>
        </div>
      </div>`).join('');
  }

  // breakdown
  const bd = document.getElementById('breakdown');
  bd.innerHTML = dimScores.map(({ d, da }, di) => {
    const low = da < 2;
    const qs = d.q.map(q => {
      const a = ans[q.num];
      const isA = a === 'A', isB = a === 'B';
      const gap = isA ? `<div class="bd-q-gap">Critical gap — ${q.gap}</div>`
        : isB ? `<div class="bd-q-gap significant">Governance gap — ${q.gap}</div>` : '';
      const remk = rem[q.num] ? `<div class="bd-q-remark">“${rem[q.num]}”</div>` : '';
      const ansLow = (a === 'A' || a === 'B') ? 'low' : '';
      return `
      <div class="bd-q">
        <span class="bd-q-num">Q${String(q.num).padStart(2, '0')}</span>
        <div>
          <div class="bd-q-text">${q.text}</div>
          ${gap}${remk}
        </div>
        <span class="bd-q-answer ${ansLow}">${a ? SM[a] : 0}/4<span class="key">${a || '—'}</span></span>
      </div>`;
    }).join('');
    return `
    <div class="bd-dim">
      <div class="bd-dim-head">
        <div class="section-numeral">${String(di + 1).padStart(2, '0')}</div>
        <h3 class="bd-dim-title">${d.title}</h3>
        <div class="bd-dim-score ${low ? 'low' : ''}">${da.toFixed(2)} / 4.0</div>
      </div>
      ${qs}
    </div>`;
  }).join('');

  buildChart(lbls, data);
}

function buildChart(lbls, data) {
  const ctx = document.getElementById('radar').getContext('2d');
  const dark = document.documentElement.getAttribute('data-theme') === 'dark';
  const ink = cssVar('--ink') || '#15161a';
  const dimc = cssVar('--dim') || '#6c6c74';
  const hair = dark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.1)';
  const accent = accentVar();
  const paper = cssVar('--paper') || '#f6f3ec';

  // hex to rgba fill
  function toRGBA(hex, a) {
    const h = hex.replace('#', '');
    const r = parseInt(h.substring(0, 2), 16), g = parseInt(h.substring(2, 4), 16), b = parseInt(h.substring(4, 6), 16);
    return `rgba(${r},${g},${b},${a})`;
  }

  if (chart) chart.destroy();
  chart = new Chart(ctx, {
    type: 'radar',
    data: {
      labels: lbls,
      datasets: [{
        label: 'Governance Score',
        data,
        backgroundColor: toRGBA(accent, 0.1),
        borderColor: accent,
        borderWidth: 1.5,
        pointBackgroundColor: data.map(v => v < 2 ? accent : ink),
        pointBorderColor: paper,
        pointBorderWidth: 2,
        pointRadius: 4,
        pointHoverRadius: 6
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      plugins: {
        legend: { display: false },
        tooltip: { callbacks: { label: c => ' ' + c.parsed.r.toFixed(2) + ' / 4.0' } }
      },
      scales: {
        r: {
          min: 0, max: 4,
          ticks: {
            stepSize: 1, display: true,
            font: { family: "'Inter', system-ui, sans-serif", size: 9 },
            color: dimc, backdropColor: 'transparent'
          },
          grid: { color: hair },
          angleLines: { color: hair },
          pointLabels: {
            font: { family: "'Inter', system-ui, sans-serif", size: 10, weight: '500' },
            color: ink
          }
        }
      }
    }
  });
}

init();
