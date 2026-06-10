/* ============================================================
   Scope — assessment logic (vanilla)
   ============================================================ */

const ans = {};   // {num: 'A'|'B'|'C'|'D'}
const rem = {};   // {num: note}
let activeStep = 0;       // dimension index for stepper/oneatatime
let oneIndex = 0;         // flat question index for oneatatime
let hudEverShown = false;

const FLAT_Q = [];        // flat list of {dimIdx, q}
DIMS.forEach((d, di) => d.q.forEach(q => FLAT_Q.push({ dimIdx: di, q })));

/* ---------- build ---------- */
function build() {
  // dim preview in hero
  const dp = document.getElementById('dim-preview');
  dp.innerHTML = DIMS.map((d, i) => `
    <div class="dim-preview-cell">
      <span class="dim-preview-num">${String(i + 1).padStart(2, '0')}</span>
      <span class="dim-preview-title">${d.title}</span>
    </div>`).join('');

  // dimensions
  const c = document.getElementById('dimensions-container');
  c.innerHTML = DIMS.map((d, di) => {
    const num = String(di + 1).padStart(2, '0');
    const questions = d.q.map(q => questionMarkup(q)).join('');
    return `
    <section class="dim" data-dim="${di}" data-screen-label="${d.title}">
      <div class="dim-header">
        <div class="section-numeral">${num}</div>
        <div class="dim-header-text">
          <h2 class="dim-title">${d.title}</h2>
          <p class="dim-subtitle">${d.subtitle}</p>
        </div>
        <span class="dim-tag">${d.govTag}</span>
      </div>
      <div class="dim-body">${questions}</div>
    </section>`;
  }).join('');

  // stepper dots
  const dots = document.getElementById('stepper-dots');
  dots.innerHTML = DIMS.map((d, i) =>
    `<button class="stepper-dot" data-step="${i}" title="${d.title}">${String(i + 1).padStart(2, '0')}</button>`
  ).join('');
  dots.querySelectorAll('.stepper-dot').forEach(b => {
    b.addEventListener('click', () => goStep(+b.dataset.step));
  });

  // hud dimension bars
  document.getElementById('hud-dims').innerHTML =
    DIMS.map((d, i) => `<div class="live-hud-dim" data-hd="${i}"><div class="live-hud-dim-fill"></div></div>`).join('');

  // wire option buttons
  c.querySelectorAll('.opt-btn').forEach(btn => {
    btn.addEventListener('click', () => selectAnswer(+btn.dataset.q, btn.dataset.key));
  });
  // slider stops
  c.querySelectorAll('.slider-stop button').forEach(btn => {
    btn.addEventListener('click', () => selectAnswer(+btn.dataset.q, btn.dataset.key));
  });
  // note triggers
  c.querySelectorAll('.note-trigger').forEach(btn => {
    btn.addEventListener('click', () => {
      const row = document.querySelector(`.notes-row[data-q="${btn.dataset.q}"]`);
      row.classList.add('visible');
      btn.classList.add('hidden');
      row.querySelector('textarea').focus();
    });
  });
  c.querySelectorAll('.notes-row textarea').forEach(ta => {
    ta.addEventListener('input', () => { rem[+ta.dataset.q] = ta.value; persist(); });
  });

  document.getElementById('year').textContent = '© ' + new Date().getFullYear();

  // stepper controls
  document.getElementById('step-prev').addEventListener('click', () => goStep(activeStep - 1));
  document.getElementById('step-next').addEventListener('click', () => goStep(activeStep + 1));
  document.getElementById('one-prev').addEventListener('click', () => goOne(oneIndex - 1));
  document.getElementById('one-next').addEventListener('click', () => goOne(oneIndex + 1));

  restore();
  syncAnswerUi();
  applyFormMode();
  update();
}

const LADDER_NAMES = ['None', 'Ad hoc', 'Developing', 'Systematic'];

function questionMarkup(q) {
  const num = q.num;
  const keys = ['A', 'B', 'C', 'D'];

  // stack / grid markup (unchanged)
  const opts = keys.map((k, i) => {
    const ladder = [0, 1, 2, 3].map(d =>
      `<i class="${d <= i ? '' : 'off'}"></i>`).join('');
    return `
    <button class="opt-btn" data-q="${num}" data-key="${k}">
      <span class="opt-key">${k}</span>
      <span class="opt-ladder">${ladder}</span>
      <span class="opt-text">${q.opt[k]}</span>
      <span class="opt-check">●</span>
    </button>`;
  }).join('');

  // maturity ladder markup
  const stops = keys.map((k, i) => `
    <div class="slider-stop" data-q="${num}" data-key="${k}">
      <button class="ladder-stop-btn" data-q="${num}" data-key="${k}">
        <div class="ladder-node">${i + 1}</div>
      </button>
      <div class="ladder-stop-meta">
        <span class="ladder-stop-letter">${k}</span>
        <span class="ladder-stop-name">${LADDER_NAMES[i]}</span>
      </div>
    </div>`).join('');

  return `
  <div class="q-row" data-q="${num}" data-dim-q="${num}">
    <div class="q-meta">
      <span class="q-num">Q${String(num).padStart(2, '0')}</span>
      <span class="q-sep">/</span>
      <span>${q.signal}</span>
    </div>
    <p class="q-text">${q.text}</p>
    <div class="opts">${opts}</div>
    <div class="slider-wrap" style="display:none">
      <div class="ladder">
        <div class="ladder-rail"><div class="ladder-fill" data-fill-q="${num}"></div></div>
        <div class="ladder-stops">${stops}</div>
      </div>
      <div class="slider-detail" data-q="${num}">
        <div class="slider-detail-empty">Select a maturity level to see its definition.</div>
      </div>
    </div>
    <button class="note-trigger" data-q="${num}">Add note</button>
    <div class="notes-row" data-q="${num}"><textarea data-q="${num}" rows="2" placeholder="Evidence, caveats, or context for this answer…"></textarea></div>
  </div>`;
}

/* ---------- select ---------- */
function selectAnswer(num, key) {
  ans[num] = key;
  // stack/grid buttons
  document.querySelectorAll(`.opt-btn[data-q="${num}"]`).forEach(b => {
    b.classList.toggle('selected', b.dataset.key === key);
  });
  // ladder stops
  document.querySelectorAll(`.slider-stop[data-q="${num}"]`).forEach(s => {
    s.classList.toggle('selected', s.dataset.key === key);
  });
  // ladder fill bar
  const fill = document.querySelector(`.ladder-fill[data-fill-q="${num}"]`);
  if (fill) {
    const idx = ['A', 'B', 'C', 'D'].indexOf(key);
    fill.style.width = (idx / 3 * 100) + '%';
  }
  // ladder detail
  const detail = document.querySelector(`.slider-detail[data-q="${num}"]`);
  if (detail) {
    const q = FLAT_Q.find(f => f.q.num === num).q;
    const idx = ['A', 'B', 'C', 'D'].indexOf(key);
    detail.innerHTML = `<div class="slider-detail-key">${LADDER_NAMES[idx]} · Level ${idx + 1} of 4</div><div class="slider-detail-text">${q.opt[key]}</div>`;
  }
  persist();
  update();

  // auto-advance in one-at-a-time
  if (document.documentElement.getAttribute('data-form') === 'oneatatime') {
    setTimeout(() => { if (oneIndex < FLAT_Q.length - 1) goOne(oneIndex + 1); }, 280);
  }
}

/* ---------- update derived state ---------- */
function update() {
  const count = Object.keys(ans).length;
  const vals = Object.values(ans).map(v => SM[v]);
  const avg = vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
  const gaps = Object.values(ans).filter(v => v === 'A' || v === 'B').length;
  const pct = Math.round((count / TOTAL_Q) * 100);

  // submit row
  const ss = document.getElementById('submit-status');
  ss.innerHTML = `<span class="pulse"></span>${count} of ${TOTAL_Q} answered`;
  ss.classList.toggle('ready', count === TOTAL_Q);
  document.getElementById('submit-btn').disabled = count < TOTAL_Q;

  // HUD — appears after 3 answers
  const hud = document.getElementById('live-hud');
  if (count >= 3) { hud.classList.add('visible'); hudEverShown = true; }
  else if (!hudEverShown) { hud.classList.remove('visible'); }

  document.getElementById('hud-pct').textContent = pct + '%';
  document.getElementById('hud-score').textContent = avg ? avg.toFixed(2) : '—';
  document.getElementById('hud-answered').textContent = `${count} / ${TOTAL_Q}`;
  document.getElementById('hud-gaps').textContent = gaps;
  const tier = avg ? getM(avg) : null;
  document.getElementById('hud-tier').textContent = tier ? tier.label : 'Awaiting input';

  // per-dimension hud bars
  DIMS.forEach((d, i) => {
    const answered = d.q.filter(q => ans[q.num]).length;
    const el = document.querySelector(`.live-hud-dim[data-hd="${i}"]`);
    el.querySelector('.live-hud-dim-fill').style.width = (answered / d.q.length * 100) + '%';
    el.classList.toggle('complete', answered === d.q.length);
  });

  // stepper dots completion
  DIMS.forEach((d, i) => {
    const dot = document.querySelector(`.stepper-dot[data-step="${i}"]`);
    if (!dot) return;
    const done = d.q.every(q => ans[q.num]);
    dot.classList.toggle('complete', done && i !== activeStep);
    dot.classList.toggle('active', i === activeStep);
  });
}

/* ---------- form modes ---------- */
function applyFormMode() {
  const mode = document.documentElement.getAttribute('data-form') || 'scroll';
  if (mode === 'stepper') { goStep(activeStep); }
  else if (mode === 'oneatatime') { goOne(oneIndex); }
  else {
    // scroll: show all
    document.querySelectorAll('.dim').forEach(d => d.classList.remove('active'));
    document.querySelectorAll('.q-row').forEach(r => r.classList.remove('q-active'));
  }
}

function goStep(i) {
  i = Math.max(0, Math.min(DIMS.length - 1, i));
  activeStep = i;
  document.querySelectorAll('.dim').forEach((d, di) => d.classList.toggle('active', di === i));
  document.getElementById('step-prev').disabled = i === 0;
  document.getElementById('step-next').disabled = i === DIMS.length - 1;
  update();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function goOne(i) {
  i = Math.max(0, Math.min(FLAT_Q.length - 1, i));
  oneIndex = i;
  const { dimIdx, q } = FLAT_Q[i];
  document.querySelectorAll('.dim').forEach((d, di) => d.classList.toggle('active', di === dimIdx));
  document.querySelectorAll('.q-row').forEach(r => r.classList.remove('q-active'));
  const active = document.querySelector(`.dim[data-dim="${dimIdx}"] .q-row[data-q="${q.num}"]`);
  if (active) active.classList.add('q-active');
  document.getElementById('one-prev').disabled = i === 0;
  const next = document.getElementById('one-next');
  next.textContent = i === FLAT_Q.length - 1 ? 'Finish →' : 'Next question →';
  next.onclick = () => {
    if (i === FLAT_Q.length - 1) { if (Object.keys(ans).length === TOTAL_Q) generateResults(); }
    else goOne(oneIndex + 1);
  };
  update();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// called by tweaks when form mode changes
window.__scopeApplyForm = function () {
  // reset slider-wrap visibility per answer-ui
  syncAnswerUi();
  applyFormMode();
};
window.__scopeSyncAnswerUi = syncAnswerUi;

function syncAnswerUi() {
  const ui = document.documentElement.getAttribute('data-answer-ui') || 'stack';
  document.querySelectorAll('.q-row').forEach(row => {
    const opts = row.querySelector('.opts');
    const slider = row.querySelector('.slider-wrap');
    if (ui === 'slider') { opts.style.display = 'none'; slider.style.display = 'block'; }
    else { opts.style.display = ''; slider.style.display = 'none'; }
  });
}

/* ---------- persistence ---------- */
function persist() {
  const payload = {
    ans, rem,
    org: val('org-name'), ass: val('assessor-name'),
    ind: val('org-industry'), size: val('org-size')
  };
  localStorage.setItem('scope', JSON.stringify(payload));
}
function val(id) { const e = document.getElementById(id); return e ? e.value : ''; }

function restore() {
  let raw;
  try { raw = JSON.parse(localStorage.getItem('scope') || '{}'); } catch (e) { raw = {}; }
  // shape validation: corrupt/unexpected state falls back to empty
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) raw = {};
  if (raw.ans && (typeof raw.ans !== 'object' || Array.isArray(raw.ans))) raw.ans = null;
  if (raw.rem && (typeof raw.rem !== 'object' || Array.isArray(raw.rem))) raw.rem = null;
  if (raw.org) setVal('org-name', raw.org);
  if (raw.ass) setVal('assessor-name', raw.ass);
  if (raw.ind) setVal('org-industry', raw.ind);
  if (raw.size) setVal('org-size', raw.size);
  if (raw.ans) Object.entries(raw.ans).forEach(([n, k]) => {
    ans[n] = k;
    document.querySelectorAll(`.opt-btn[data-q="${n}"]`).forEach(b => b.classList.toggle('selected', b.dataset.key === k));
    document.querySelectorAll(`.slider-stop[data-q="${n}"]`).forEach(s => s.classList.toggle('selected', s.dataset.key === k));
    const idx = ['A', 'B', 'C', 'D'].indexOf(k);
    const fill = document.querySelector(`.ladder-fill[data-fill-q="${n}"]`);
    if (fill) fill.style.width = (idx / 3 * 100) + '%';
    const detail = document.querySelector(`.slider-detail[data-q="${n}"]`);
    if (detail) {
      const q = FLAT_Q.find(f => f.q.num == n).q;
      detail.innerHTML = `<div class="slider-detail-key">${LADDER_NAMES[idx]} · Level ${idx + 1} of 4</div><div class="slider-detail-text">${q.opt[k]}</div>`;
    }
  });
  if (raw.rem) Object.entries(raw.rem).forEach(([n, t]) => {
    rem[n] = t;
    const ta = document.querySelector(`.notes-row textarea[data-q="${n}"]`);
    if (ta && t) {
      ta.value = t;
      ta.closest('.notes-row').classList.add('visible');
      document.querySelector(`.note-trigger[data-q="${n}"]`).classList.add('hidden');
    }
  });
  ['org-name', 'assessor-name', 'org-industry', 'org-size'].forEach(id => {
    const e = document.getElementById(id);
    if (e) e.addEventListener('input', persist);
  });
}
function setVal(id, v) { const e = document.getElementById(id); if (e) e.value = v; }

function resetAll() {
  if (!confirm('Clear all answers and notes?')) return;
  Object.keys(ans).forEach(k => delete ans[k]);
  Object.keys(rem).forEach(k => delete rem[k]);
  localStorage.removeItem('scope');
  document.querySelectorAll('.opt-btn.selected, .slider-stop.selected').forEach(b => b.classList.remove('selected'));
  document.querySelectorAll('.notes-row').forEach(r => r.classList.remove('visible'));
  document.querySelectorAll('.notes-row textarea').forEach(t => t.value = '');
  document.querySelectorAll('.note-trigger').forEach(t => t.classList.remove('hidden'));
  document.querySelectorAll('input[type="text"]').forEach(i => i.value = '');
  document.querySelectorAll('select').forEach(s => s.selectedIndex = 0);
  hudEverShown = false;
  document.getElementById('live-hud').classList.remove('visible');
  update();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

/* ---------- reveal + submit ---------- */
function generateResults() {
  if (Object.keys(ans).length < TOTAL_Q) return;
  persist();
  const vals = Object.values(ans).map(v => SM[v]);
  const avg = vals.reduce((a, b) => a + b, 0) / vals.length;
  const m = getM(avg);

  const overlay = document.getElementById('reveal');
  const scoreEl = document.getElementById('reveal-score');
  const tierEl = document.getElementById('reveal-tier');
  const statusEl = document.getElementById('reveal-status');
  const scan = document.getElementById('reveal-scan');

  scan.innerHTML = DIMS.map(d =>
    `<div class="reveal-scan-cell">${d.govTag.replace(' Governance', '')}</div>`).join('');
  tierEl.innerHTML = '&nbsp;';
  scoreEl.innerHTML = '0<span class="denom"> / 4.0</span>';
  overlay.classList.add('active');

  const cells = [...scan.querySelectorAll('.reveal-scan-cell')];
  // scan dimensions one by one
  cells.forEach((cell, i) => {
    setTimeout(() => {
      cells.forEach(c => c.classList.remove('active'));
      cell.classList.add('active');
      statusEl.textContent = 'Scanning · ' + DIMS[i].title;
      setTimeout(() => { cell.classList.remove('active'); cell.classList.add('done'); }, 230);
    }, 180 + i * 260);
  });

  // count up after scan
  const scanDone = 180 + cells.length * 260 + 200;
  setTimeout(() => {
    statusEl.textContent = 'Maturity tier determined';
    const start = performance.now(), dur = 850;
    function up(now) {
      const p = Math.min((now - start) / dur, 1);
      const e = 1 - Math.pow(1 - p, 3);
      scoreEl.innerHTML = (e * avg).toFixed(2) + '<span class="denom"> / 4.0</span>';
      if (p < 1) requestAnimationFrame(up);
      else { tierEl.textContent = m.label; }
    }
    requestAnimationFrame(up);
  }, scanDone);

  // navigate
  setTimeout(() => { window.location.href = 'results.html'; }, scanDone + 1500);
}

document.addEventListener('DOMContentLoaded', build);
