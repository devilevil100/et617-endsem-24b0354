// The Willow Mystery: ET 617 End-Sem, 24B0354
// Learner flow: welcome → predict → ledger → roundtable → disagree → tasks → summary. Plus #teacher and #about.
const KEY = 'willow-24b0354';
const blank = () => ({ id: crypto.randomUUID(), screen: 'welcome', name: '', path: null, predict: null, ledger: null, rt: null, dis: null,
  order: [], ti: 0, ans: {}, streak: 0, alt: false, hints: 0, fb: [], log: [], started: Date.now() });
let S = load();

function load() { try { return { ...blank(), ...JSON.parse(localStorage.getItem(KEY) || '{}') }; } catch { return blank(); } }
function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch {} clearTimeout(pushT); pushT = setTimeout(push, 1500); }
// ---------- shared database (Supabase via /api/sync); the app still works offline from localStorage ----------
let pushT;
const post = body => fetch('/api/sync', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
function push() { if (S.predict) post({ action: 'push', id: S.id, name: S.name, state: S }).catch(() => {}); }
const typing = () => ['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName);
// Learner device: apply the teacher's approve/override decisions (stored separately, so they never overwrite progress).
async function pullReviews() {
  if (!S.predict || location.hash === '#teacher') return;
  try {
    const d = await (await fetch(`/api/sync?action=reviews&id=${encodeURIComponent(S.id)}`)).json();
    let changed = false;
    for (const r of d.reviews || []) { const f = S.fb.find(x => x.id === r.fb_id); if (f && (f.status !== r.status || f.teacherText !== r.teacher_text)) { f.status = r.status; f.teacherText = r.teacher_text; changed = true; } }
    if (changed) { save(); if (!typing()) render(); }
  } catch {}
}
// Teacher device: the class list from the database (falls back to this device's learner).
const T = { learners: null, cur: null, err: false, bad: false, code: (() => { try { return sessionStorage.getItem('tcode') || ''; } catch { return ''; } })() };
async function loadLearners() {
  if (!T.code) { if (location.hash === '#teacher') render(); return; }
  try {
    const r = await fetch(`/api/sync?action=learners&code=${encodeURIComponent(T.code)}`);
    if (r.status === 401) { T.bad = true; T.code = ''; try { sessionStorage.removeItem('tcode'); } catch {} }
    const d = await r.json(); if (!d.ok) throw 0; T.learners = d.learners; T.err = false;
    if (!T.learners.some(l => l.id === T.cur)) T.cur = T.learners[0]?.id ?? null; }
  catch { T.err = !T.bad; T.learners = null; }
  if (location.hash === '#teacher' && !typing()) render();
}
async function review(fbId, status, text) {
  const L = T.learners?.find(l => l.id === T.cur)?.state || S;
  for (const st of new Set([L, L.id === S.id ? S : L])) { const f = st.fb.find(x => x.id === fbId); if (f) { f.status = status; f.teacherText = text; } }
  if (L.id === S.id) log('teacher_' + status, fbId);
  render();
  try { await post({ action: 'review', id: L.id, fb_id: fbId, status, teacher_text: text, code: T.code }); } catch {}
}
function log(ev, data) { S.log.push({ t: Date.now(), ev, data }); save(); }
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const $ = id => document.getElementById(id);
const picked = name => document.querySelector(`input[name="${name}"]:checked`)?.value;
function go(screen) { S.screen = screen; log('screen', screen); render(); scrollTo(0, 0); }
// Inline message next to the button that was pressed (no browser pop-ups).
function say(msg) {
  let m = $('msg'); if (!m) { m = document.createElement('p'); m.id = 'msg'; m.className = 'fb no'; m.setAttribute('role', 'alert'); }
  m.textContent = msg; (document.activeElement?.closest('button') || $('app').lastElementChild).insertAdjacentElement('afterend', m);
}
// AI vs rule check: a direct contradiction (one says correct, the other a misconception) is flagged for the teacher.
const clash = (ai, rule) => (ai === 'correct' && rule.startsWith('M')) || (rule === 'correct' && ai.startsWith('M'));

const STEPS = ['predict', 'ledger', 'roundtable', 'disagree', 'tasks', 'summary'];
const STEP_NAMES = ['Predict', 'Evidence', 'Round-table', 'Disagreement', 'Challenge', 'Summary'];
// Icons: authored SVG, one 2px round stroke.
const svg = (d, fill = 'none') => `<svg viewBox="0 0 24 24" width="22" height="22" fill="${fill}" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
const ICON = {
  leaf: svg('<path d="M5 19c0-8 6-14 14-14 0 8-6 14-14 14Z"/><path d="M5 19l8-8"/>'),
  skep: svg('<path d="M4 5h16v11H9l-5 4z"/><path d="M10 9a2 2 0 1 1 3 1.7c-.7.4-1 .8-1 1.6"/><path d="M12 14.2h.01"/>'),
  judge: svg('<path d="M12 4v16M8 20h8M5 7h14"/><path d="M5 7l-3 6a3 3 0 0 0 6 0zM19 7l-3 6a3 3 0 0 0 6 0z"/>'),
  arrow: svg('<path d="M5 12h14M13 6l6 6-6 6"/>')
};
// Progress: one segment per step; the current step is the long orange pill.
const steps = () => { const at = STEPS.indexOf(S.screen);
  return `<nav class="progress" aria-label="Progress: step ${at + 1} of 6, ${STEP_NAMES[at]}"><span class="dots">${STEPS.map((s, i) => `<i class="${i < at ? 'done' : i === at ? 'on' : ''}"></i>`).join('')}</span><span>${at + 1} of 6</span>${at > 0 ? `<button class="back" data-act="go" data-arg="${STEPS[at - 1]}"><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M19 12H5M11 6l-6 6 6 6"/></svg>Back</button>` : ''}</nav>`; };
// Agent card: avatar, name, role, a fixed badge slot, the reply, and the evidence it leans on.
const CITES = { leaf: '6CO₂ + 6H₂O → C₆H₁₂O₆ + 6O₂', skep: 'oven: 100 g fresh leaves → 12 g dry', judge: 'ledger: soil −0.057 kg vs tree +74.4 kg' };
ICON.play = svg('<path d="M8 5v14l11-7z" fill="currentColor"/>');
ICON.user = svg('<circle cx="12" cy="8" r="4"/><path d="M4 21c1-4 4-6 8-6s7 2 8 6"/>');
// Cartoon faces for the three agents (drawn for this app).
const FACE = {
  leaf: `<svg viewBox="0 0 48 48" aria-hidden="true"><circle cx="24" cy="24" r="24" fill="#2EE06E"/><path d="M24 5c7 0 11 4 11 9-6 1-10-2-11-9Z" fill="#13863F" stroke="#141414" stroke-width="1.5"/><circle cx="24" cy="28" r="14" fill="#C98E5E" stroke="#141414" stroke-width="2"/><path d="M10.5 25c1-8 6-12.5 13.5-12.5S36.5 17 37.5 25c-4-3-9-4.5-13.5-4.5S14.5 22 10.5 25Z" fill="#2b2118"/><circle cx="19" cy="29" r="4.2" fill="#fff" stroke="#141414" stroke-width="1.8"/><circle cx="29" cy="29" r="4.2" fill="#fff" stroke="#141414" stroke-width="1.8"/><path d="M23.2 29h1.6" stroke="#141414" stroke-width="1.8"/><circle cx="19" cy="29.5" r="1.7" fill="#141414"/><circle cx="29" cy="29.5" r="1.7" fill="#141414"/><path d="M20 35.5c2.5 2.5 5.5 2.5 8 0" fill="none" stroke="#141414" stroke-width="2" stroke-linecap="round"/></svg>`,
  skep: `<svg viewBox="0 0 48 48" aria-hidden="true"><circle cx="24" cy="24" r="24" fill="#F2622A"/><circle cx="24" cy="28" r="14" fill="#D9A06F" stroke="#141414" stroke-width="2"/><path d="M10 24l3-10 5 5 3-8 4 6 4-6 3 8 4-4 2 9c-5-3-10-4.5-14-4.5S15 21 10 24Z" fill="#141414"/><path d="M15.5 25.5l6-2.5" stroke="#141414" stroke-width="2.3" stroke-linecap="round"/><path d="M27 25.5h6" stroke="#141414" stroke-width="2.3" stroke-linecap="round"/><circle cx="19" cy="29.5" r="1.9" fill="#141414"/><circle cx="30" cy="29.5" r="1.9" fill="#141414"/><path d="M19.5 36c3.5-1.5 6.5-1.2 9.5.8" fill="none" stroke="#141414" stroke-width="2" stroke-linecap="round"/></svg>`,
  judge: `<svg viewBox="0 0 48 48" aria-hidden="true"><circle cx="24" cy="24" r="24" fill="#FDB62F"/><g fill="#fff" stroke="#141414" stroke-width="1.6"><circle cx="12.5" cy="24" r="4.2"/><circle cx="12.5" cy="32" r="4.2"/><circle cx="35.5" cy="24" r="4.2"/><circle cx="35.5" cy="32" r="4.2"/></g><circle cx="24" cy="28.5" r="12.5" fill="#B87A4B" stroke="#141414" stroke-width="2"/><path d="M11.5 22c0-7.5 5.5-12 12.5-12s12.5 4.5 12.5 12c-3.5-2.5-8-3.5-12.5-3.5S15 19.5 11.5 22Z" fill="#fff" stroke="#141414" stroke-width="1.6"/><path d="M17.5 25.5h5M25.5 25.5h5" stroke="#141414" stroke-width="2" stroke-linecap="round"/><circle cx="20" cy="29.5" r="1.8" fill="#141414"/><circle cx="28" cy="29.5" r="1.8" fill="#141414"/><path d="M20.5 35.5h7" stroke="#141414" stroke-width="2" stroke-linecap="round"/></svg>`
};
// Leaf points: a light game layer for an Olympiad learner (first-try 100, after retry 50, ledger and verdict 100 each).
const points = () => Object.values(S.ans).reduce((n, a) => n + (a.firstOk ? 100 : a.ok ? 50 : 0), 0) + (S.ledger?.ok ? 100 : 0) + (S.dis?.ok ? 100 : 0);
const COIN = `<svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true"><circle cx="12" cy="12" r="10.5" fill="#FDB62F" stroke="#E89A12" stroke-width="2"/><path d="M8 16c0-5.5 3-8.5 8.5-8.5 0 5.5-3 8.5-8.5 8.5Z" fill="#fff"/><path d="M8.5 15.5l4.5-4.5" stroke="#E89A12" stroke-width="1.5" stroke-linecap="round"/></svg>`;
const topbar = () => `<div class="topbar"><span class="chip"><span class="me">${esc((S.name || '?')[0].toUpperCase())}</span>${esc(S.name || 'Scientist')}</span><span class="chip" aria-label="${points()} leaf points">${points()} ${COIN}</span></div>`;
const plaque = (cls, name, role, body, slot = '') => `<article class="plaque ${cls}"><header><span class="av">${FACE[cls]}</span><span class="who"><b>${name}</b><small>${role}</small></span><span class="slot">${slot}</span></header><p>${body}</p><p class="cites">Leans on: ${CITES[cls]}</p></article>`;
// Hero: the willow in its pot, standing on van Helmont's scale.
const HERO = `<svg class="hero-art" viewBox="0 0 320 250" role="img" aria-label="A cartoon willow in a pot standing on a scale that reads 76.7 kg">
  <path d="M28 62c.5 6 3.5 9 9.5 9.5-6 .5-9 3.5-9.5 9.5-.5-6-3.5-9-9.5-9.5 6-.5 9-3.5 9.5-9.5Z" fill="#FFFFFF"/>
  <path d="M286 30c.4 4.6 2.7 7 7.3 7.3-4.6.4-7 2.7-7.3 7.3-.4-4.6-2.7-7-7.3-7.3 4.6-.4 7-2.7 7.3-7.3Z" fill="#FDB62F"/>
  <path d="M278 132c.3 3.4 2 5.1 5.4 5.4-3.4.3-5.1 2-5.4 5.4-.3-3.4-2-5.1-5.4-5.4 3.4-.3 5.1-2 5.4-5.4Z" fill="#F2622A"/>
  <path d="M14 184c8-12 14 12 22 0s14 12 22 0" fill="none" stroke="#2EE06E" stroke-width="5" stroke-linecap="round"/>
  <path d="M252 96c7-10 12 10 19 0s12 10 19 0" fill="none" stroke="#FDB62F" stroke-width="5" stroke-linecap="round"/>
  <ellipse cx="160" cy="236" rx="112" ry="8" fill="#141414" opacity=".18"/>
  <rect x="64" y="186" width="192" height="44" rx="14" fill="#fff" stroke="#141414" stroke-width="3"/>
  <rect x="116" y="196" width="88" height="24" rx="7" fill="#141414"/>
  <text x="160" y="213" text-anchor="middle" font-family="Outfit, sans-serif" font-weight="800" font-size="15" fill="#2EE06E">76.7 kg</text>
  <rect x="78" y="174" width="164" height="14" rx="7" fill="#FFFFFF" stroke="#141414" stroke-width="3"/>
  <path d="M159 116c-3-18-1-34 5-50" fill="none" stroke="#141414" stroke-width="12" stroke-linecap="round"/>
  <path d="M159 116c-3-18-1-34 5-50" fill="none" stroke="#8a5530" stroke-width="6" stroke-linecap="round"/>
  <g stroke="#141414" stroke-width="3"><circle cx="128" cy="62" r="28" fill="#20b558"/><circle cx="196" cy="60" r="27" fill="#20b558"/><circle cx="162" cy="44" r="33" fill="#2EE06E"/><circle cx="160" cy="80" r="26" fill="#2EE06E"/></g>
  <g fill="none" stroke="#149c45" stroke-width="3.5" stroke-linecap="round"><path d="M112 80c-4 12-2 24 2 34"/><path d="M134 88c-2 12 0 22 3 28"/><path d="M190 86c3 12 1 22-2 30"/><path d="M212 76c5 12 3 24-1 34"/></g>
  <path d="M112 126h96l-12 50h-72z" fill="#FDB62F" stroke="#141414" stroke-width="3" stroke-linejoin="round"/>
  <rect x="104" y="114" width="112" height="16" rx="8" fill="#E89A12" stroke="#141414" stroke-width="3"/>
  <g stroke="#141414" stroke-width="2.5"><circle cx="146" cy="148" r="8" fill="#fff"/><circle cx="174" cy="148" r="8" fill="#fff"/></g>
  <circle cx="148" cy="149" r="3.5" fill="#141414"/><circle cx="176" cy="149" r="3.5" fill="#141414"/>
  <path d="M152 162c5 5 11 5 16 0" fill="none" stroke="#141414" stroke-width="3" stroke-linecap="round"/>
</svg>`;

// ---------- feedback items that the teacher reviews (C5) ----------
function addFb(where, learner, text, source, verdict, extra = {}) {
  const item = { id: Date.now() + '' + S.fb.length, where, learner, text, source, verdict, status: 'pending', teacherText: '', ...extra };
  S.fb.push(item); save(); return item;
}
function fbView(item) {
  if (!item) return '';
  const shown = item.status === 'overridden' ? item.teacherText : item.text;
  const badge = item.status === 'approved' ? '<span class="badge approved">Approved by your teacher</span>'
    : item.status === 'overridden' ? '<span class="badge overridden">Your teacher rewrote this feedback</span>'
    : '<span class="badge">Waiting for teacher review</span>';
  const src = (item.source === 'sample' ? ' <span class="badge sample">Recorded sample: live AI unavailable</span>' : item.source === 'rules' ? ' <span class="badge sample">AI Judge reply failed a check: rule-based feedback</span>' : '')
    + (item.flag && item.status === 'pending' ? ' <span class="badge sample">Your teacher will double-check this one</span>' : '');
  return plaque('judge', 'Evidence Judge', 'checks claims against evidence', esc(shown), badge + src);
}

// ---------- rule-based judge: fallback when AI fails, and the check for T5 ----------
function ruleJudge(t) {
  t = t.toLowerCase();
  const air = /co2|co₂|carbon dioxide|\bair\b|carbon/.test(t);
  const soilMain = /soil/.test(t) && !/(not|n't|isn't|wasn't|never)[^.]*soil|soil[^.]*(lost|only|tiny|0\.0|57)/.test(t);
  const evidence = /57|0\.0|0\.08|helmont|weigh|ledger|lost/.test(t);
  if (soilMain && !air) return { verdict: 'M1_soil', feedback: 'You are leaning on the soil. But the ledger says the soil lost only 0.057 kg while the tree gained 74.4 kg. That is 0.08%. Where else could atoms come from? Look at the left side of the photosynthesis equation.' };
  if (/water/.test(t) && !air) return { verdict: 'M2_water', feedback: 'Water is a big part of a living tree, so you are half right. But dry the tree and the water leaves. What builds the dry part that stays? Check which gas the leaves take in.' };
  if (air) return { verdict: evidence ? 'correct' : 'partial', feedback: evidence ? 'Strong answer: you named carbon dioxide from the air and backed it with evidence. Now let us see if you can defend it against the Skeptic.' : 'Good: carbon dioxide from the air is the key source. Make it stronger by quoting evidence, e.g. how little the soil lost.' };
  return { verdict: 'partial', feedback: 'Let us be specific: which substance supplied the atoms that make up the tree? Use the ledger numbers in your answer.' };
}

const SAMPLE_RT = {
  explainer: 'Let us count atoms. The soil lost only 0.057 kg, so the soil cannot be the source. In photosynthesis the leaves take in CO₂ from the air. Its carbon and oxygen atoms are built into sugar, then into wood. So most of the tree is made from air!',
  challenger: 'Dr. Leaf, you are forgetting the roots. A living willow is mostly water: cut a fresh branch and it is wet and heavy. Van Helmont weighed a living tree, so most of his 74 kg was water. Ishita, can you prove that the air matters more than the water?'
};

async function callAgents(body) {
  const ctrl = new AbortController(); const timer = setTimeout(() => ctrl.abort(), 30000);
  try {
    const r = await fetch('/api/agents', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), signal: ctrl.signal });
    const d = await r.json();
    if (!d.ok) throw new Error(d.error || 'AI failed');
    return d;
  } finally { clearTimeout(timer); }
}

// ---------- challenge tasks ----------
const TASKS = {
  t1: { lo: 'LO1', kind: 'mcq', q: 'If we dry a tree completely, where did <mark>most of that dry mass</mark> come from?',
    options: ['Minerals from the soil', 'Water from the roots', 'Carbon dioxide from the air', 'Sunlight'],
    hint: 'Water leaves when we dry the tree. Which input is left?',
    check: a => a === 'Carbon dioxide from the air' ? { ok: true, fb: 'Yes! About 90% of dry mass is carbon and oxygen atoms that came in as CO₂.' }
      : a === 'Minerals from the soil' ? { ok: false, mis: 'M1', fb: 'Remember the ledger: the soil lost 0.057 kg while the tree gained 74.4 kg. Minerals are under 5% of dry mass.' }
      : a === 'Water from the roots' ? { ok: false, mis: 'M2', fb: 'That is true for fresh mass. But the question says dry. The oven removed the water, so what is left?' }
      : { ok: false, fb: 'Light brings energy, not atoms. Energy adds no measurable mass. Which input brings atoms?' } },
  t2: { lo: 'LO2', kind: 'num', q: 'The soil lost <mark>0.057 kg</mark>. The tree gained <mark>74.4 kg</mark>. What percentage of the gain could the soil explain?', unit: '%',
    hint: 'Percentage = (soil lost ÷ tree gain) × 100.',
    check: a => a >= 0.07 && a <= 0.09 ? { ok: true, fb: 'Exactly: about 0.08%. Even if every gram of lost soil went into the tree, it explains almost nothing.' }
      : Math.abs(a - 0.00077) < 0.0002 ? { ok: false, fb: 'Close! You found the fraction. Multiply by 100 to get a percentage.' }
      : a > 10 ? { ok: false, mis: 'M1', fb: 'That would make the soil a big source. Divide 0.057 by 74.4 and you will see how small it is.' }
      : { ok: false, fb: 'Divide 0.057 by 74.4, then multiply by 100.' } },
  t3: { lo: 'LO1', kind: 'match', q: 'Match each element in dry plant matter to the substance it came from.',
    items: ['Carbon', 'Hydrogen', 'Oxygen inside the sugar', 'Nitrogen and magnesium'], sources: ['CO₂ (air)', 'H₂O (water)', 'Soil minerals'],
    key: ['CO₂ (air)', 'H₂O (water)', 'CO₂ (air)', 'Soil minerals'],
    hint: 'Look at the equation: 6CO₂ + 6H₂O → C₆H₁₂O₆ + 6O₂. Only water brings hydrogen.',
    check: a => {
      const k = TASKS.t3.key;
      if (a.every((v, i) => v === k[i])) return { ok: true, fb: 'All correct. Carbon and the sugar\'s oxygen come from CO₂, hydrogen from water, and only a few minerals from soil.' };
      if (a[0] === 'Soil minerals') return { ok: false, mis: 'M1', fb: 'Carbon is the backbone of wood, and the only carbon-carrying input is CO₂. Soil supplies just a few minerals.' };
      if (a[2] === 'H₂O (water)') return { ok: false, mis: 'M2', fb: 'Tricky one! The O₂ that plants release comes from water. So the oxygen that stays in the sugar comes from CO₂.' };
      return { ok: false, fb: 'Some matches are off. Check which substance in the equation brings each element.' };
    } },
  t4: { lo: 'LO3', kind: 'num', q: 'We put <mark>500 g of fresh spinach</mark> in a drying oven until its mass stops changing. Predict its dry mass.', unit: 'g',
    hint: 'Our oven took 100 g of leaves down to about 12 g. Spinach is even juicier.',
    check: a => a >= 30 && a <= 80 ? { ok: true, fb: 'Good prediction! Spinach is about 90% water, so roughly 45 g stays. That dry part is mostly carbon-based matter built from CO₂.' }
      : a > 150 ? { ok: false, mis: 'M2', fb: 'Too high. Most of a fresh leaf is water, and it leaves in the oven. Remember 100 g → 12 g.' }
      : { ok: false, fb: 'Too low. The dry matter stays behind: it does not evaporate. Use the oven ratio (100 g → 12 g).' } },
  t5: { lo: 'LO1', kind: 'text', q: 'Your cousin says: <i>"Plants eat soil. That\'s why we add fertiliser."</i> Convince them in 2–3 sentences. <mark>Use evidence.</mark>',
    hint: 'Strong answers name the source (CO₂ from the air) and quote a number from the ledger.' },
  t6: { lo: 'LO1', kind: 'mcq', q: 'Olympiad twist: in 1941, Ruben and Kamen gave plants water made with heavy oxygen (¹⁸O). Where did the ¹⁸O end up?',
    options: ['In the O₂ gas the plant released', 'In the glucose', 'In the soil', 'Nowhere: it was destroyed'],
    hint: 'Follow the atoms: the O₂ released has to come from somewhere.',
    check: a => a === 'In the O₂ gas the plant released' ? { ok: true, fb: 'Brilliant. Water\'s oxygen leaves as O₂, so the oxygen atoms inside the sugar must come from CO₂. Even more of the dry mass comes from the air.' }
      : a === 'In the glucose' ? { ok: false, mis: 'M2', fb: 'That is what most people expect! The experiment found the ¹⁸O in the released O₂. So water gives its oxygen away as gas.' }
      : { ok: false, fb: 'Atoms are not destroyed in chemical reactions (conservation of mass). Where could they go?' } }
};
// Adaptive start (learner profile): the diagnostic prediction picks the task order.
const ORDERS = { M1: ['t1', 't2', 't3', 't4', 't5'], M2: ['t4', 't1', 't3', 't2', 't5'], core: ['t1', 't2', 't3', 't4', 't5'], adv: ['t6', 't3', 't2', 't4', 't5'] };
const ALT = `<div class="card"><h3 style="margin-top:0">Let us try it another way: atoms as LEGO bricks</h3>
<p>A tree can only be built from bricks that arrive. Count the bricks in <b>6CO₂ + 6H₂O → C₆H₁₂O₆ + 6O₂</b>:</p>
<ol><li><b>Carbon:</b> all 6 C come in with CO₂. Water and soil bring none.</li>
<li><b>Hydrogen:</b> all 12 H come from water.</li>
<li><b>Oxygen:</b> the 6 O₂ released are water's oxygen, so the 6 O kept in the sugar came from CO₂.</li></ol>
<p>By mass, glucose is 72 g carbon + 96 g oxygen + 12 g hydrogen per 180 g. That means <mark>168 of every 180 g came from CO₂</mark>.</p></div>`;

// ---------- views ----------
const V = {
  welcome: () => `<label class="namebar"><span class="sr">Your first name</span>${ICON.user}<input id="name" type="text" value="${esc(S.name)}" placeholder="Type your first name" autocomplete="given-name"></label>
    <h1 class="title">Solve the<br>Willow Mystery</h1>
    <div class="carousel" id="car" tabindex="0" aria-roledescription="carousel" aria-label="About the mystery: swipe or use arrow keys">
      <section class="slide feature" aria-label="1 of 3"><h2>Where did 74 kg of tree come from?</h2>${HERO}<button class="play" data-act="start">${ICON.play}Start</button></section>
      <section class="slide s-agents" aria-label="2 of 3"><h2>Meet the round-table</h2>
        <ul class="who-list">
          <li><span class="av">${FACE.leaf}</span><span><b>Dr. Leaf</b><small>explains, by counting atoms</small></span></li>
          <li><span class="av">${FACE.skep}</span><span><b>Skeptic</b><small>argues the other side</small></span></li>
          <li><span class="av">${FACE.judge}</span><span><b>Evidence Judge</b><small>checks every claim, gives you feedback</small></span></li>
        </ul><p class="note">They will not always agree. <b>You</b> settle it, with evidence.</p></section>
      <section class="slide s-how" aria-label="3 of 3"><h2>How it works</h2>
        <ol class="how"><li>Predict</li><li>Weigh the evidence</li><li>Explain to the agents</li><li>Settle their disagreement</li><li>Take the challenge</li><li>See what changed</li></ol>
        <p class="note">About 15 min · stop and resume any time · your teacher reviews the AI</p></section>
    </div>
    <div class="pager">${[0, 1, 2].map(i => `<button class="dot ${i ? '' : 'on'}" data-act="slide" data-arg="${i}" aria-label="Show slide ${i + 1} of 3"></button>`).join('')}</div>
    <div class="card story"><p>In the 1640s, Jan van Helmont planted a <b>2.3 kg</b> willow in <b>90.7 kg</b> of dried soil and gave it only rainwater. Five years later it weighed <mark>76.7 kg</mark>.</p>
    <p>Put the question on trial with three AI agents who will <b>not</b> always agree.</p></div>`,

  predict: () => S.predict ? `${steps()}<h2>Step 1 · Your prediction</h2>
    <div class="fb ok">You locked in <b>${esc(S.predict.choice)}</b> (${esc(S.predict.conf)}). Predictions stay locked, so we can see how your thinking changes by the end.</div>
    <button data-act="go" data-arg="ledger">Back to the evidence</button>` : `${steps()}<h2>Step 1 · What do you think?</h2>
    <p>The willow gained <mark>74.4 kg</mark>. Where did most of that mass come from?</p>
    <div class="opts">${['Soil', 'Water', 'Air (carbon dioxide)', 'Sunlight'].map(o => `<label><input type="radio" name="p" value="${o}"> ${o}</label>`).join('')}</div>
    <p><b>How sure are you?</b></p>
    <div class="opts seg">${['Guessing', 'Fairly sure', 'Certain'].map(o => `<label><input type="radio" name="c" value="${o}"> ${o}</label>`).join('')}</div>
    <label for="why"><b>Why? (one line)</b></label><input id="why" type="text" placeholder="Because…">
    <p><button data-act="predict">Lock in my prediction</button></p>`,

  ledger: () => {
    const intro = { M1: 'You said <b>soil</b>. Let us test it the way van Helmont did: weigh the soil before and after.',
      M2: 'You said <b>water</b>. Hold that thought, because we will come back to it. First, let us rule the soil in or out.',
      core: 'You said <b>air</b>. A good scientist still rules out the rivals. Let us weigh the soil.',
      adv: 'You are <b>certain</b> it is air. Then this should be quick: prove the soil is not the source.' }[S.path];
    const L = S.ledger;
    return `${steps()}<h2>Step 2 · Evidence lab: van Helmont's ledger</h2><p>${intro}</p>
    <div class="card"><table class="ledger"><caption class="muted">All masses in kg</caption><tr><th></th><th>Start</th><th>After 5 yr</th><th>Change</th></tr>
    <tr><td><b>Tree</b></td><td>2.3</td><td>76.7</td><td><input id="tg" type="number" step="any" inputmode="decimal" value="${L?.tg ?? ''}" aria-label="Tree change in kg"></td></tr>
    <tr><td><b>Soil</b></td><td>90.700</td><td>90.643</td><td><input id="sl" type="number" step="any" inputmode="decimal" value="${L?.sl ?? ''}" aria-label="Soil change in kg"></td></tr></table>
    <p class="muted">Change = after − start. Type how much the tree gained and how much the soil lost.</p>
    <button data-act="ledger">Check my ledger</button><div id="lres">${L?.ok ? ledgerResult() : L ? '<div class="fb no">Not quite. Subtract carefully: 76.7 − 2.3 and 90.700 − 90.643. Watch the decimals.</div>' : ''}</div></div>
    ${L?.ok ? '<button data-act="go" data-arg="roundtable">Next: explain it to the agents</button>'
      : L?.tries >= 2 ? '<div class="fb ok"><b>Worked answer:</b> tree 76.7 − 2.3 = <b>74.4 kg gained</b>; soil 90.700 − 90.643 = <b>0.057 kg lost</b>. So the soil explains only 0.057 ÷ 74.4 ≈ <mark>0.08%</mark> of the gain.</div><button data-act="go" data-arg="roundtable">Next: explain it to the agents</button>' : ''}`;
  },

  roundtable: () => `${steps()}<h2>Step 3 · The round-table</h2>
    <p>The soil explains only <mark>0.08%</mark>. So where did the rest come from? Explain in 2–3 sentences. Three agents will respond, and <b>each one reads what the others said</b>.</p>
    <div class="podium" aria-label="Speaking order: Dr. Leaf explains, Skeptic challenges, the Evidence Judge decides on your feedback">
      <div class="col"><span class="av big">${FACE.leaf}</span><b>Dr. Leaf</b><small>explains</small><div class="blk b1">1st</div></div>
      <div class="col"><span class="av big">${FACE.skep}</span><b>Skeptic</b><small>challenges</small><div class="blk b2">2nd</div></div>
      <div class="col"><span class="av big">${FACE.judge}</span><b>Evidence Judge</b><small>gives feedback</small><div class="blk b3">3rd</div></div>
    </div>
    <div class="sheet"><label for="expl"><b>Your explanation</b></label>
    <textarea id="expl" placeholder="I think the mass came from…">${esc(S.rt?.learner ?? '')}</textarea>
    <p><button data-act="ask" id="askb">${S.rt ? 'Ask again' : 'Send to the round-table'}</button></p></div>
    <div id="rt">${S.rt ? rtView() : ''}</div>
    ${S.rt ? '<button data-act="go" data-arg="disagree">The agents disagree. Settle it</button>' : ''}`,

  disagree: () => {
    const h = S.dis?.h ?? 0;
    return `${steps()}<h2>Step 4 · Dr. Leaf and Skeptic disagree</h2>
    <div class="versus">${plaque('leaf', 'Dr. Leaf', 'claims', '"Most of the tree\'s mass came from <mark>carbon dioxide in the air</mark>."')}
    ${plaque('skep', 'Skeptic', 'claims', '"No. Most of a living tree\'s mass is <mark>water</mark>."')}</div>
    <p>Neither agent will tell you who is right. <b>You decide</b>, using the drying oven. Drag the slider to dry 100 g of fresh willow leaves at 70 °C.</p>
    <div class="card"><label for="oven"><b>Hours in the oven: <span id="hv">${h}</span></b></label>
    <input id="oven" type="range" min="0" max="48" value="${h}" style="width:100%">
    <div id="ovenout">${ovenOut(h)}</div></div>
    <p><b>1. For the FRESH (living) tree, the biggest part of its mass is…</b></p>
    <div class="opts seg">${['Water', 'Matter built from CO₂'].map(o => `<label><input type="radio" name="fresh" value="${o}" ${S.dis?.fresh === o ? 'checked' : ''}> ${o}</label>`).join('')}</div>
    <p><b>2. For the DRY tree, the biggest part of its mass is…</b></p>
    <div class="opts seg">${['Water', 'Matter built from CO₂'].map(o => `<label><input type="radio" name="dry" value="${o}" ${S.dis?.dry === o ? 'checked' : ''}> ${o}</label>`).join('')}</div>
    <button data-act="verdict">Give my verdict</button><div id="dres">${S.dis?.fb ?? ''}</div>
    ${S.dis?.ok || S.dis?.tries >= 2 ? '<p><button data-act="go" data-arg="tasks">Next: the challenge set</button></p>' : ''}`;
  },

  tasks: () => {
    const id = S.order[S.ti]; const T = TASKS[id]; const A = S.ans[id];
    if (!T) { S.screen = 'summary'; save(); return V.summary(); }
    let input = '';
    if (T.kind === 'mcq') input = `<div class="opts">${T.options.map(o => `<label><input type="radio" name="a" value="${esc(o)}" ${A?.value === o ? 'checked' : ''}> ${o}</label>`).join('')}</div>`;
    if (T.kind === 'num') input = `<label class="unit"><span class="sr">Your answer in ${T.unit}</span><input id="a" type="number" step="any" inputmode="decimal" value="${A?.value ?? ''}"><span aria-hidden="true">${T.unit}</span></label>`;
    if (T.kind === 'match') input = `<table>${T.items.map((it, i) => `<tr><td><b>${it}</b></td><td><select id="m${i}" aria-label="${it}"><option value="">choose…</option>${T.sources.map(s => `<option ${A?.value?.[i] === s ? 'selected' : ''}>${s}</option>`).join('')}</select></td></tr>`).join('')}</table>`;
    if (T.kind === 'text') input = `<textarea id="a" placeholder="Actually, plants…">${esc(A?.value ?? '')}</textarea>`;
    const done = A && (A.ok || A.tries >= 2);
    return `${steps()}<h2>Step 5 · Challenge ${S.ti + 1} of ${S.order.length}</h2>
    ${S.alt && S.altAt === S.ti ? ALT : ''}
    <div class="card"><p>${T.q}</p>${input}
    <div class="row"><button data-act="answer" ${done ? 'disabled' : ''}>${T.kind === 'text' && A?.value !== undefined && !done ? 'Send my revised answer' : 'Check'}</button><button class="ghost" data-act="hint" ${done || A?.hinted ? 'disabled' : ''}>Hint</button></div>
    <div id="hint">${A?.hinted ? `<p class="muted"><b>Hint:</b> ${T.hint}</p>` : ''}</div>
    <div id="tres">${A?.value !== undefined ? taskFb(id) : ''}</div></div>
    ${done ? `<button data-act="next">${S.ti + 1 < S.order.length ? 'Next challenge' : 'See my summary'}</button>` : ''}`;
  },

  summary: () => {
    const lo = { LO1: [], LO2: [S.ledger?.ok && S.ledger.first], LO3: [S.dis?.first] };
    S.order.forEach(id => (lo[TASKS[id].lo] ||= []).push(!!S.ans[id]?.firstOk));
    const name = { LO1: 'Explain: most dry mass comes from CO₂', LO2: 'Interpret: van Helmont\'s data rules out soil', LO3: 'Compare: fresh mass vs dry mass' };
    const mis = S.log.filter(l => l.ev === 'misconception').map(l => l.data);
    const after = S.post ? `<div class="card"><h3 style="margin-top:0">Before and after</h3><table class="facts"><tr><th>Before</th><td>${esc(S.predict?.choice)} (${esc(S.predict?.conf)})</td></tr><tr><th>Now (dry mass)</th><td><b>${esc(S.post.choice)}</b> (${esc(S.post.conf)})</td></tr></table>
      <p>${S.post.choice.startsWith('Air') ? (S.predict?.choice.startsWith('Air') ? 'You held the right idea, and now you have the evidence behind it.' : 'You changed your mind because of the evidence. That is exactly how science works.') : 'Not yet. Look back at the oven: the 12 g left after drying is built from which gas?'}</p></div>`
      : `<div class="card"><h3 style="margin-top:0">One last question</h3><p>Now that you have weighed the evidence: where did most of a willow's <b>dry</b> mass come from?</p>
      <div class="opts">${['Soil', 'Water', 'Air (carbon dioxide)', 'Sunlight'].map(o => `<label><input type="radio" name="post" value="${o}"> ${o}</label>`).join('')}</div>
      <div class="opts seg">${['Guessing', 'Fairly sure', 'Certain'].map(o => `<label><input type="radio" name="pc" value="${o}"> ${o}</label>`).join('')}</div>
      <button data-act="post">Lock in my final answer</button></div>`;
    return `${steps()}<h2>Step 6 · What you figured out, ${esc(S.name || 'scientist')}</h2>${after}
    <div class="card"><table><tr><th>Learning outcome</th><th>First-try correct</th></tr>
    ${Object.keys(name).map(k => `<tr><td>${name[k]}</td><td>${lo[k].filter(Boolean).length} / ${lo[k].length}</td></tr>`).join('')}</table></div>
    <div class="card"><b>Your journey</b><ul>
    <li>You predicted <b>${esc(S.predict?.choice)}</b> (${esc(S.predict?.conf)}).</li>
    <li>Ideas we tested along the way: ${mis.length ? [...new Set(mis)].map(m => m === 'M1' ? '"mass comes from soil"' : '"mass is mostly water"').join(', ') : 'none: you went straight to the evidence'}.</li>
    <li>Hints used: ${S.hints}. Time: ${Math.round((Date.now() - S.started) / 60000)} min.</li>
    <li>Leaf points: <b>${points()}</b> (100 for each first-try answer, 50 after a retry, 100 each for the ledger and the verdict).</li></ul>
    <p>Big idea: <mark>a tree is built mostly out of thin air</mark>. Carbon and oxygen atoms from CO₂ make up about 90% of its dry mass. Water makes it heavy while it is alive, and the soil adds only a pinch of minerals.</p></div>
    <h3>Feedback from the agents (reviewed by your teacher)</h3>${S.fb.map(fbView).join('') || '<p class="muted">None yet.</p>'}
    <p><button class="ghost" data-act="reset">Start over</button></p>`;
  },

  teacher: () => {
    if (!T.code) return `<div class="arch"><h1>Teacher view</h1></div><div class="card"><label for="tcode"><b>Teacher code</b></label>
      <input id="tcode" type="password" autocomplete="off" style="margin-top:8px"><p class="muted">${T.bad ? '<b>That code did not work.</b> ' : ''}Only the coach can see learners' answers and review the AI.</p>
      <button data-act="tlogin">Open teacher view</button></div>`;
    const L = T.learners?.find(l => l.id === T.cur)?.state || S;
    const all = T.learners?.map(l => l.state) || [], air = c => c?.startsWith('Air');
    const glance = all.length ? `<div class="card"><h3 style="margin-top:0">Class at a glance</h3><table class="facts">
      <tr><th>Learners</th><td>${all.length}</td></tr>
      <tr><th>Started with soil / water idea</th><td>${all.filter(x => x.path === 'M1').length} / ${all.filter(x => x.path === 'M2').length}</td></tr>
      <tr><th>Dry mass from air, at the end</th><td>${all.filter(x => air(x.post?.choice)).length} of ${all.filter(x => x.post).length} who finished</td></tr>
      <tr><th>AI items waiting</th><td>${all.reduce((n, x) => n + (x.fb || []).filter(f => f.status === 'pending').length, 0)} (${all.reduce((n, x) => n + (x.fb || []).filter(f => f.status === 'pending' && f.flag).length, 0)} flagged)</td></tr></table></div>` : '';
    const src = T.learners ? `Shared database · ${T.learners.length} learner${T.learners.length === 1 ? '' : 's'}` : T.err ? 'This device only (database unavailable)' : 'Loading the class…';
    return `<div class="arch"><h1>Teacher view</h1></div><p class="muted">Mr. D'Souza · Olympiad batch. Approve or override every AI judgement. The learner's app picks up your decision within 15 seconds, on any device.</p>
    <div class="card"><label for="who"><b>Learner</b></label> <span class="badge">${esc(src)}</span>
    ${T.learners?.length ? `<select id="who" style="margin-top:8px">${T.learners.map(l => `<option value="${esc(l.id)}" ${l.id === T.cur ? 'selected' : ''}>${esc(l.name || 'Unnamed')} · ${esc(l.state?.screen ?? '')} · ${new Date(l.updated_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</option>`).join('')}</select>` : ''}</div>
    ${glance}<div class="card"><h3 style="margin-top:0">${esc(L.name || 'Learner')} <span class="badge">now on: ${esc(STEP_NAMES[STEPS.indexOf(L.screen)] ?? 'Welcome')}</span></h3>
    <table class="facts">
      <tr><th>Prediction</th><td><b>${esc(L.predict?.choice ?? 'not yet')}</b>${L.predict ? ` (${esc(L.predict.conf)})` : ''}${L.predict?.why ? `<br><span class="muted">"${esc(L.predict.why)}"</span>` : ''}</td></tr>
      <tr><th>After (dry mass)</th><td>${L.post ? `<b>${esc(L.post.choice)}</b> (${esc(L.post.conf)})` : '-'}</td></tr>
      <tr><th>Path</th><td>${esc({ M1: 'Soil misconception', M2: 'Water misconception', core: 'Core', adv: 'Olympiad (advanced)' }[L.path] ?? '-')}</td></tr>
      <tr><th>Ledger</th><td>${L.ledger ? `${L.ledger.ok ? 'correct' : 'not yet'} · ${L.ledger.tries} ${L.ledger.tries === 1 ? 'try' : 'tries'}` : '-'}</td></tr>
      <tr><th>Disagreement</th><td>${L.dis?.tries ? `${L.dis.ok ? 'resolved' : 'not resolved'} · oven used up to ${L.dis.maxH ?? 0} h` : '-'}</td></tr>
      <tr><th>Hints</th><td>${L.hints ?? 0}</td></tr>
    </table></div>
    <div class="card"><table><tr><th>Task</th><th>Answer</th><th>Tries</th><th>Result</th></tr>
    ${Object.keys(TASKS).filter(id => L.ans[id]?.value !== undefined).map(id => { const a = L.ans[id]; return `<tr><td>${id.toUpperCase()}</td><td>${esc(Array.isArray(a.value) ? a.value.join(', ') : a.value)}</td><td>${a.tries}</td><td>${a.ok ? 'correct' : 'wrong'}${a.mis ? ' ' + a.mis : ''}</td></tr>`; }).join('') || '<tr><td colspan="4" class="muted">No answers yet.</td></tr>'}</table></div>
    <h2>AI feedback queue</h2><p class="muted">Flagged items (the AI and the rule check disagree) come first.</p>${[...L.fb].sort((a, b) => (b.flag && b.status === 'pending') - (a.flag && a.status === 'pending')).map(f => `<div class="card"><div class="row"><b>${esc(f.where)}</b><span class="badge ${f.status}">${f.status}</span>${f.flag ? '<span class="badge sample">flagged: AI and rule check disagree</span>' : ''}${f.source === 'sample' ? '<span class="badge sample">recorded sample</span>' : f.source === 'rules' ? '<span class="badge sample">rule-based judge (AI failed check)</span>' : '<span class="badge">live AI</span>'}<span class="badge">verdict: ${esc(f.verdict)}</span></div>
      <p class="muted">Learner wrote: "${esc(f.learner)}"</p><p>AI Judge said: ${esc(f.text)}</p>
      ${f.agents ? `<details><summary>What Dr. Leaf and Skeptic told the learner</summary><p><b>Dr. Leaf:</b> ${esc(f.agents.explainer)}</p><p><b>Skeptic:</b> ${esc(f.agents.challenger)}</p></details>` : ''}
      <textarea id="ov${f.id}" placeholder="Write your own feedback to replace the AI's…">${esc(f.teacherText)}</textarea>
      <div class="row" style="margin-top:8px"><button data-act="approve" data-arg="${f.id}">Approve AI feedback</button><button class="ghost" data-act="override" data-arg="${f.id}">Override with my text</button></div></div>`).join('') || '<p class="muted">No AI feedback yet.</p>'}`; },

  about: () => `<div class="arch"><h1>About</h1></div><div class="card">
    <p><b>The Willow Mystery</b>: a multi-agent learning environment for <i>"Where does a plant's mass come from?"</i></p>
    <table><tr><td>Identity token</td><td><b>24B0354</b></td></tr><tr><td>Problem</td><td>P3 Multi-agent collaborative learning</td></tr>
    <tr><td>Topic</td><td>P3-T9 Where does a plant's mass come from? (Cl. 7–10)</td></tr><tr><td>Learner</td><td>L6 High-achieving Olympiad learner</td></tr>
    <tr><td>Constraint</td><td>C5 Teacher-in-the-loop</td></tr></table>
    <p class="muted">Agents run on OpenRouter through a Vercel function. When the AI fails, clearly labelled recorded samples are used. Built during the ET 617 End-Sem exam with AI assistance (Claude Code). No UI library or template was used.</p>
    <button class="ghost" data-act="reset">Reset all progress on this device</button></div>`
};

function ledgerResult() {
  return `<div class="fb ok"><b>Ledger balanced.</b> The tree gained <b>74.4 kg</b>; the soil lost <b>0.057 kg</b>. Even if every gram went into the tree, soil explains only <mark>0.08%</mark> of the gain.</div>
  <div class="muted">Tree gained 74.4 kg</div><div class="track"><div class="bar" style="width:100%"></div></div>
  <div class="muted">Soil lost 0.057 kg, drawn to the same scale (0.08%: too thin to see)</div><div class="track"><div class="bar" style="width:0.08%"></div></div>`;
}
function ovenOut(h) {
  const m = 12 + 88 * Math.exp(-h / 6);
  return `<p>Mass now: <mark><b>${m.toFixed(1)} g</b></mark> · water driven off: ${(100 - m).toFixed(1)} g ${h >= 36 ? '· <b>mass has stopped changing: this is the dry mass</b>' : ''}</p>
  <div class="track" aria-hidden="true"><div class="bar" style="width:${m}%"></div></div>`;
}
function rtView() {
  const r = S.rt; const tag = r.source === 'sample' ? ' <span class="badge sample">Recorded sample: live AI unavailable</span>' : '';
  return `${plaque('leaf', 'Dr. Leaf', 'Explainer', esc(r.explainer), tag)}
  ${plaque('skep', 'Skeptic', 'Challenger · read Dr. Leaf\'s reply', esc(r.challenger), tag)}
  <p class="muted">The Evidence Judge read your answer and both agents:</p>${fbView(S.fb.find(f => f.id === r.fbId))}`;
}
function taskFb(id) {
  const a = S.ans[id];
  if (TASKS[id].kind === 'text') return fbView(S.fb.find(f => f.id === a.fbId));
  return `<div class="fb ${a.ok ? 'ok' : 'no'}">${a.ok ? '<b>Correct.</b> ' : ''}${a.fb}${!a.ok && a.tries >= 2 ? `<br><b>Model answer:</b> ${model(id)}` : !a.ok ? '<br><i>Have another go.</i>' : ''}</div>`;
}
const model = id => ({ t1: 'Carbon dioxide from the air', t2: '0.057 ÷ 74.4 × 100 ≈ 0.08%', t3: TASKS.t3.key.map((k, i) => `${TASKS.t3.items[i]} → ${k}`).join('; '), t4: 'about 45 g (spinach is ~90% water)', t6: 'In the O₂ gas released, so sugar\'s oxygen comes from CO₂' }[id]);

// ---------- actions ----------
const ACT = {
  start() { S.name = $('name').value.trim(); if (!S.predict) S.started = Date.now(); log('start', S.name); go(S.predict ? S.screen : 'predict'); },
  go(screen) { if (screen === 'tasks' && S.ti >= S.order.length) S.ti = Math.max(0, S.order.length - 1); go(screen); },
  predict() {
    const choice = picked('p'), conf = picked('c'), why = $('why').value.trim();
    if (!choice || !conf) return say('Pick an answer and how sure you are.');
    S.predict = { choice, conf, why };
    S.path = choice === 'Soil' ? 'M1' : choice === 'Water' ? 'M2' : choice.startsWith('Air') && conf === 'Certain' ? 'adv' : 'core';
    S.order = ORDERS[S.path];
    log('predict', { ...S.predict, path: S.path }); if (S.path === 'M1' || S.path === 'M2') log('misconception', S.path);
    go('ledger');
  },
  ledger() {
    const tg = parseFloat($('tg').value), sl = Math.abs(parseFloat($('sl').value));
    const ok = Math.abs(tg - 74.4) < 0.11 && Math.abs(sl - 0.057) < 0.0011;
    const tries = (S.ledger?.tries ?? 0) + 1;
    S.ledger = { tg: $('tg').value, sl: $('sl').value, ok, tries, first: ok && tries === 1 }; log('ledger', S.ledger); render();
  },
  async ask() {
    const text = $('expl').value.trim(); if (text.length < 10) return say('Write a sentence or two first.');
    $('askb').disabled = true; $('rt').innerHTML = '<p class="muted">Dr. Leaf is thinking… then Skeptic reads Dr. Leaf… then the Judge reads you both… (up to 20 s)</p>';
    let r;
    try { const d = await callAgents({ mode: 'roundtable', text, path: S.path, prev: S.rt?.judge }); r = { explainer: d.explainer, challenger: d.challenger, judge: d.judge || ruleJudge(text), source: d.judge ? 'ai' : 'rules' }; if (!d.judge) log('judge_check_failed', d.judgeNote); }
    catch (e) { log('ai_fail', String(e)); r = { ...SAMPLE_RT, judge: ruleJudge(text), source: 'sample' }; }
    const item = addFb('Round-table', text, r.judge.feedback, r.source, r.judge.verdict,
      { flag: r.source === 'ai' && clash(r.judge.verdict, ruleJudge(text).verdict), agents: { explainer: r.explainer, challenger: r.challenger } });
    if (r.judge.verdict === 'M1_soil') log('misconception', 'M1'); if (r.judge.verdict === 'M2_water') log('misconception', 'M2');
    S.rt = { ...r, learner: text, fbId: item.id }; log('roundtable', { verdict: r.judge.verdict, source: r.source }); render();
  },
  verdict() {
    const fresh = picked('fresh'), dry = picked('dry'); if (!fresh || !dry) return say('Answer both questions.');
    const ok = fresh === 'Water' && dry === 'Matter built from CO₂';
    const tries = (S.dis?.tries ?? 0) + 1;
    const fb = ok ? `<div class="fb ok"><b>You settled it, and both agents were partly right.</b> Skeptic is right about the <b>fresh</b> tree: about 88% of a living leaf is water. Dr. Leaf is right about the <b>dry</b> tree: the 12 g that never evaporates is mostly carbon and oxygen atoms built from CO₂. Van Helmont weighed a living tree, so his 74 kg was mostly water, but the part that stays is built from air.</div>`
      : dry === 'Water' ? `<div class="fb no">Run the oven to 48 hours and watch: the water is driven off, but 12 g stays. Can what is left after drying be water?</div>`
      : `<div class="fb no">Look at the oven at 0 hours versus 48 hours. How much of the fresh leaf disappeared as water vapour?</div>`;
    const resolved = !ok && tries >= 2 ? `<div class="fb ok"><b>Here is how it resolves.</b> A living leaf is about 88% water, so Skeptic is right about <b>fresh</b> mass. The 12 g left after drying is mostly carbon and oxygen built from CO₂, so Dr. Leaf is right about <b>dry</b> mass. Both were partly right.</div>` : '';
    if (!ok) log('misconception', 'M2');
    S.dis = { ...S.dis, ok, tries, first: ok && tries === 1, fb: fb + resolved, fresh, dry }; log('verdict', { fresh, dry, ok }); render();
  },
  hint() { const id = S.order[S.ti]; S.ans[id] = { ...(S.ans[id] || { tries: 0 }), hinted: true }; S.hints++; log('hint', id); render(); },
  async answer() {
    const id = S.order[S.ti], T = TASKS[id], prev = S.ans[id] || { tries: 0 };
    let value;
    if (T.kind === 'mcq') value = picked('a');
    if (T.kind === 'num') value = $('a').value === '' ? undefined : parseFloat($('a').value);
    if (T.kind === 'match') { value = T.items.map((_, i) => $('m' + i).value); if (value.includes('')) value = undefined; }
    if (T.kind === 'text') value = $('a').value.trim() || undefined;
    if (value === undefined || Number.isNaN(value)) return say('Answer first.');
    let res;
    if (T.kind === 'text') {
      $('tres').innerHTML = '<p class="muted">The Evidence Judge is reading your answer…</p>';
      let j, source = 'ai';
      try { j = (await callAgents({ mode: 'judge', text: value, prev: S.rt?.judge })).judge; } catch (e) { log('ai_fail', String(e)); j = ruleJudge(value); source = 'sample'; }
      const item = addFb('Challenge: convince your cousin', value, j.feedback, source, j.verdict, { flag: source === 'ai' && clash(j.verdict, ruleJudge(value).verdict) });
      // Two attempts: she can revise once after reading the Judge's feedback.
      res = { ok: j.verdict === 'correct', mis: j.verdict === 'M1_soil' ? 'M1' : j.verdict === 'M2_water' ? 'M2' : null, fbId: item.id };
    } else res = T.check(value);
    const tries = res.tries ?? prev.tries + 1;
    S.ans[id] = { ...prev, ...res, value, tries, firstOk: res.ok && prev.tries === 0 };
    if (res.mis) log('misconception', res.mis);
    // Adaptive rule (performance): two wrong answers in a row → alternative explanation before the next task.
    S.streak = res.ok ? 0 : S.streak + 1;
    if (S.streak >= 2 && !S.alt) { S.alt = true; S.altAt = S.ti + 1; log('alt_explanation', id); }
    // Adaptive rule (harder task): core-path learner with all first-try correct gets the Olympiad twist.
    log('answer', { id, value, ok: res.ok }); render();
  },
  next() {
    S.ti++;
    if (S.ti === S.order.length && S.path === 'core' && !S.order.includes('t6') && S.order.every(id => S.ans[id]?.firstOk || TASKS[id].kind === 'text')) { S.order = [...S.order, 't6']; log('unlock', 't6'); }
    save(); S.ti < S.order.length ? render() : go('summary');
  },
  slide(i) { $('car').children[+i].scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' }); },
  post() { const choice = picked('post'), conf = picked('pc'); if (!choice || !conf) return say('Pick an answer and how sure you are.'); S.post = { choice, conf }; log('post', S.post); render(); },
  tlogin() { const c = $('tcode').value.trim(); if (!c) return say('Enter the teacher code.'); T.code = c; T.bad = false; try { sessionStorage.setItem('tcode', c); } catch {} T.learners = null; render(); loadLearners(); },
  approve(id) { review(id, 'approved', ''); },
  override(id) { const t = $('ov' + id).value.trim(); if (!t) return say('Write your feedback first.'); review(id, 'overridden', t); },
  reset() { if (confirm('Erase all progress on this device?')) { S = blank(); save(); location.hash = ''; render(); } }
};

document.addEventListener('click', e => { const a = e.target.closest('[data-act]'); if (a && !a.disabled) ACT[a.dataset.act](a.dataset.arg); });
document.addEventListener('input', e => {
  if (e.target.id !== 'oven') return;
  const h = +e.target.value; S.dis = { ...(S.dis || {}), h, maxH: Math.max(h, S.dis?.maxH ?? 0) }; save();
  $('hv').textContent = h; $('ovenout').innerHTML = ovenOut(h);
});
// Teacher edits in another tab update this tab live.
addEventListener('storage', e => { if (e.key === KEY) { S = load(); render(); } });
addEventListener('hashchange', () => { render(); if (location.hash === '#teacher') loadLearners(); });
document.addEventListener('change', e => { if (e.target.id === 'who') { T.cur = e.target.value; render(); } });
setInterval(() => (location.hash === '#teacher' ? loadLearners() : pullReviews()), 15000);

function render() {
  const view = location.hash === '#teacher' ? 'teacher' : location.hash === '#about' ? 'about' : S.screen;
  $('app').innerHTML = (view === 'teacher' || view === 'about' ? '' : topbar()) + (V[view] || V.welcome)();
  const here = view === 'teacher' ? '#teacher' : view === 'about' ? '#about' : '#';
  document.querySelectorAll('.dock a').forEach(a => a.classList.toggle('on', a.getAttribute('href') === here));
  // Welcome carousel: native scroll-snap; the dots follow the swipe and jump on tap.
  const car = $('car');
  if (car) car.addEventListener('scroll', () => {
    const i = Math.round(car.scrollLeft / Math.max(1, car.scrollWidth - car.clientWidth) * (car.children.length - 1));
    document.querySelectorAll('.pager .dot').forEach((d, k) => d.classList.toggle('on', k === i));
  }, { passive: true });
}
render();
if (location.hash === '#teacher') loadLearners(); else pullReviews();
