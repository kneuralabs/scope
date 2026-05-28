/* ============================================================
   Scope — Tweaks panel
   ============================================================ */
const { useState, useEffect } = React;

const SCOPE_TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "theme": "light",
  "accent": "brick",
  "type": "helvetica",
  "density": "comfortable",
  "answerUi": "stack",
  "form": "scroll"
}/*EDITMODE-END*/;

const ACCENTS = {
  brick:  '#8a2a1f',
  ink:    '#15161a',
  forest: '#234f33',
  cobalt: '#1f3aa8',
  ochre:  '#9a6b12'
};

function applyScopePrefs(t) {
  const r = document.documentElement;
  r.setAttribute('data-theme', t.theme);
  r.setAttribute('data-type', t.type);
  r.setAttribute('data-density', t.density);
  r.setAttribute('data-answer-ui', t.answerUi);
  r.setAttribute('data-form', t.form);
  r.setAttribute('data-accent', t.accent);
  // accent override
  let ac = ACCENTS[t.accent] || ACCENTS.brick;
  // in dark mode, brick/ink need lifting for contrast
  if (t.theme === 'dark') {
    if (t.accent === 'ink') ac = '#efeee8';
    if (t.accent === 'brick') ac = '#d6584a';
    if (t.accent === 'forest') ac = '#5fae73';
    if (t.accent === 'cobalt') ac = '#6f8cff';
    if (t.accent === 'ochre') ac = '#d6a23c';
  }
  r.style.setProperty('--accent', ac);
  try { localStorage.setItem('scopePrefs', JSON.stringify(t)); } catch (e) {}
}

function ScopeTweaks() {
  const [t, setTweak] = useTweaks(SCOPE_TWEAK_DEFAULTS);

  useEffect(() => {
    applyScopePrefs(t);
    if (window.__scopeSyncAnswerUi) window.__scopeSyncAnswerUi();
    if (window.__scopeApplyForm) window.__scopeApplyForm();
  }, [t.theme, t.accent, t.type, t.density, t.answerUi, t.form]);

  return (
    <TweaksPanel title="Tweaks">
      <TweakSection label="Theme" />
      <TweakRadio label="Mode" value={t.theme}
        options={['light', 'dark']}
        onChange={(v) => setTweak('theme', v)} />
      <TweakColor label="Accent" value={ACCENTS[t.accent]}
        options={Object.values(ACCENTS)}
        onChange={(v) => {
          const key = Object.keys(ACCENTS).find(k => ACCENTS[k] === v) || 'brick';
          setTweak('accent', key);
        }} />

      <TweakSection label="Typography" />
      <TweakRadio label="Density" value={t.density}
        options={['comfortable', 'compact']}
        onChange={(v) => setTweak('density', v)} />

      <TweakSection label="Question Format" />
      <TweakSelect label="Form pattern" value={t.form}
        options={[
          { value: 'scroll', label: 'Long scroll (all visible)' },
          { value: 'stepper', label: 'Stepper (one dimension)' },
          { value: 'oneatatime', label: 'One question at a time' }
        ]}
        onChange={(v) => setTweak('form', v)} />
      <TweakSelect label="Answer style" value={t.answerUi}
        options={[
          { value: 'stack', label: 'Stacked cards' },
          { value: 'grid', label: '2×2 grid' },
          { value: 'slider', label: 'Maturity ladder' }
        ]}
        onChange={(v) => setTweak('answerUi', v)} />
    </TweaksPanel>
  );
}

(function mount() {
  const el = document.getElementById('tweaks-root');
  if (!el) return;
  ReactDOM.createRoot(el).render(<ScopeTweaks />);
})();
