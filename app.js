// The Willow Mystery: ET 617 End-Sem, 24B0354
// Learner flow: welcome → predict → ledger → roundtable → disagree → tasks → summary. Plus #teacher and #about.
const KEY = 'willow-24b0354';
const blank = () => ({ screen: 'welcome', name: '', path: null, predict: null, ledger: null, rt: null, dis: null,
  order: [], ti: 0, ans: {}, streak: 0, alt: false, hints: 0, fb: [], log: [], started: Date.now() });
let S = load();

function load() { try { return { ...blank(), ...JSON.parse(localStorage.getItem(KEY) || '{}') }; } catch { return blank(); } }
function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch {} }
function log(ev, data) { S.log.push({ t: Date.now(), ev, data }); save(); }
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const $ = id => document.getElementById(id);
const picked = name => document.querySelector(`input[name="${name}"]:checked`)?.value;
function go(screen) { S.screen = screen; log('screen', screen); render(); scrollTo(0, 0); }

const STEPS = ['predict', 'ledger', 'roundtable', 'disagree', 'tasks', 'summary'];
const STEP_NAMES = ['Predict', 'Evidence', 'Round-table', 'Disagreement', 'Challenge', 'Summary'];
const steps = () => `<div class="steps">${STEPS.map((s, i) => `<span class="${s === S.screen ? 'on' : ''}">${i + 1} ${STEP_NAMES[i]}</span>`).join('')}</div>`;

// ---------- feedback items that the teacher reviews (C5) ----------
function addFb(where, learner, text, source, verdict) {
  const item = { id: Date.now() + '' + S.fb.length, where, learner, text, source, verdict, status: 'pending', teacherText: '' };
  S.fb.push(item); save(); return item;
}
function fbView(item) {
  if (!item) return '';
  const shown = item.status === 'overridden' ? item.teacherText : item.text;
  const badge = item.status === 'approved' ? '<span class="badge approved">Approved by your teacher</span>'
    : item.status === 'overridden' ? '<span class="badge overridden">Your teacher rewrote this feedback</span>'
    : '<span class="badge">Waiting for teacher review</span>';
  const src = item.source === 'sample' ? ' <span class="badge sample">Recorded sample: live AI unavailable</span>' : '';
  return `<div class="agent judge"><b>Evidence Judge</b>${esc(shown)}<div style="margin-top:6px">${badge}${src}</div></div>`;
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
  welcome: () => `<h1>The Willow Mystery</h1>
    <p class="lead">In the 1640s, Jan van Helmont planted a <b>2.3 kg</b> willow in <b>90.7 kg</b> of dried soil. He gave it only rainwater. Five years later the tree weighed <mark>76.7 kg</mark>.</p>
    <p class="lead">Where did <b>74 kg</b> of tree come from? Let us put the question on trial with three AI agents who will <b>not</b> always agree.</p>
    <div class="card"><label for="name"><b>Your first name</b></label><input id="name" type="text" value="${esc(S.name)}" placeholder="e.g. Ishita" autocomplete="given-name">
    <p class="muted">About 15 minutes. Your progress saves on this device, so you can stop and come back. Your teacher reviews the AI's feedback.</p>
    <button data-act="start">Start the investigation →</button></div>`,

  predict: () => `${steps()}<h2>Step 1 · What do you think?</h2>
    <p>The willow gained <mark>74.4 kg</mark>. Where did most of that mass come from?</p>
    <div class="opts">${['Soil', 'Water', 'Air (carbon dioxide)', 'Sunlight'].map(o => `<label><input type="radio" name="p" value="${o}"> ${o}</label>`).join('')}</div>
    <p><b>How sure are you?</b></p>
    <div class="opts" style="grid-template-columns:repeat(3,1fr)">${['Guessing', 'Fairly sure', 'Certain'].map(o => `<label><input type="radio" name="c" value="${o}"> ${o}</label>`).join('')}</div>
    <label for="why"><b>Why? (one line)</b></label><input id="why" type="text" placeholder="Because…">
    <p><button data-act="predict">Lock in my prediction</button></p>`,

  ledger: () => {
    const intro = { M1: 'You said <b>soil</b>. Let us test it the way van Helmont did: weigh the soil before and after.',
      M2: 'You said <b>water</b>. Hold that thought, because we will come back to it. First, let us rule the soil in or out.',
      core: 'You said <b>air</b>. A good scientist still rules out the rivals. Let us weigh the soil.',
      adv: 'You are <b>certain</b> it is air. Then this should be quick: prove the soil is not the source.' }[S.path];
    const L = S.ledger;
    return `${steps()}<h2>Step 2 · Evidence lab: van Helmont's ledger</h2><p>${intro}</p>
    <div class="card"><table><tr><th></th><th>Start</th><th>After 5 years</th><th>Change (kg)</th></tr>
    <tr><td><b>Tree</b></td><td>2.3 kg</td><td>76.7 kg</td><td><input id="tg" type="number" step="any" inputmode="decimal" value="${L?.tg ?? ''}" aria-label="Tree change in kg"></td></tr>
    <tr><td><b>Soil</b> (dried)</td><td>90.700 kg</td><td>90.643 kg</td><td><input id="sl" type="number" step="any" inputmode="decimal" value="${L?.sl ?? ''}" aria-label="Soil change in kg"></td></tr></table>
    <p class="muted">Change = after − start. Type how much the tree gained and how much the soil lost.</p>
    <button data-act="ledger">Check my ledger</button><div id="lres">${L?.ok ? ledgerResult() : L ? '<div class="fb no">Not quite. Subtract carefully: 76.7 − 2.3 and 90.700 − 90.643. Watch the decimals.</div>' : ''}</div></div>
    ${L?.ok ? '<button data-act="go" data-arg="roundtable">Next: explain it to the agents →</button>' : ''}`;
  },

  roundtable: () => `${steps()}<h2>Step 3 · The round-table</h2>
    <p>The soil explains only <mark>0.08%</mark>. So where did the rest come from? Explain in 2–3 sentences. Three agents will respond, and <b>each one reads what the others said</b>.</p>
    <div class="row muted" style="gap:14px"><span><b style="color:var(--leaf)">Dr. Leaf</b>: explains</span><span><b style="color:var(--skep)">Skeptic</b>: challenges</span><span><b style="color:var(--judge)">Evidence Judge</b>: checks evidence, gives feedback</span></div>
    <textarea id="expl" placeholder="I think the mass came from…">${esc(S.rt?.learner ?? '')}</textarea>
    <p><button data-act="ask" id="askb">${S.rt ? 'Ask again' : 'Send to the round-table'}</button></p>
    <div id="rt">${S.rt ? rtView() : ''}</div>
    ${S.rt ? '<button data-act="go" data-arg="disagree">The agents disagree. Settle it →</button>' : ''}`,

  disagree: () => {
    const h = S.dis?.h ?? 0;
    return `${steps()}<h2>Step 4 · Dr. Leaf and Skeptic disagree</h2>
    <div class="versus"><div class="agent leaf"><b>Dr. Leaf</b>"Most of the tree's mass came from <mark>carbon dioxide in the air</mark>."</div>
    <div class="agent skep"><b>Skeptic</b>"No. Most of a living tree's mass is <mark>water</mark>."</div></div>
    <p>Neither agent will tell you who is right. <b>You decide</b>, using the drying oven. Drag the slider to dry 100 g of fresh willow leaves at 70 °C.</p>
    <div class="card"><label for="oven"><b>Hours in the oven: <span id="hv">${h}</span></b></label>
    <input id="oven" type="range" min="0" max="48" value="${h}" style="width:100%">
    <div id="ovenout">${ovenOut(h)}</div></div>
    <p><b>1. For the FRESH (living) tree, the biggest part of its mass is…</b></p>
    <div class="opts">${['Water', 'Matter built from CO₂'].map(o => `<label><input type="radio" name="fresh" value="${o}" ${S.dis?.fresh === o ? 'checked' : ''}> ${o}</label>`).join('')}</div>
    <p><b>2. For the DRY tree, the biggest part of its mass is…</b></p>
    <div class="opts">${['Water', 'Matter built from CO₂'].map(o => `<label><input type="radio" name="dry" value="${o}" ${S.dis?.dry === o ? 'checked' : ''}> ${o}</label>`).join('')}</div>
    <button data-act="verdict">Give my verdict</button><div id="dres">${S.dis?.fb ?? ''}</div>
    ${S.dis?.ok ? '<p><button data-act="go" data-arg="tasks">Next: the challenge set →</button></p>' : ''}`;
  },

  tasks: () => {
    const id = S.order[S.ti]; const T = TASKS[id]; const A = S.ans[id];
    if (!T) { S.screen = 'summary'; save(); return V.summary(); }
    let input = '';
    if (T.kind === 'mcq') input = `<div class="opts">${T.options.map(o => `<label><input type="radio" name="a" value="${esc(o)}" ${A?.value === o ? 'checked' : ''}> ${o}</label>`).join('')}</div>`;
    if (T.kind === 'num') input = `<div class="row"><input id="a" type="number" step="any" inputmode="decimal" style="max-width:200px" value="${A?.value ?? ''}"> <b>${T.unit}</b></div>`;
    if (T.kind === 'match') input = `<table>${T.items.map((it, i) => `<tr><td><b>${it}</b></td><td><select id="m${i}" aria-label="${it}"><option value="">choose…</option>${T.sources.map(s => `<option ${A?.value?.[i] === s ? 'selected' : ''}>${s}</option>`).join('')}</select></td></tr>`).join('')}</table>`;
    if (T.kind === 'text') input = `<textarea id="a" placeholder="Actually, plants…">${esc(A?.value ?? '')}</textarea>`;
    const done = A && (A.ok || A.tries >= 2);
    return `${steps()}<h2>Step 5 · Challenge ${S.ti + 1} of ${S.order.length}</h2>
    ${S.alt && S.altAt === S.ti ? ALT : ''}
    <div class="card"><p>${T.q}</p>${input}
    <div class="row"><button data-act="answer" ${done ? 'disabled' : ''}>Check</button><button class="ghost" data-act="hint">Hint</button></div>
    <div id="hint">${A?.hinted ? `<p class="muted">💡 ${T.hint}</p>` : ''}</div>
    <div id="tres">${A?.value !== undefined ? taskFb(id) : ''}</div></div>
    ${done ? `<button data-act="next">${S.ti + 1 < S.order.length ? 'Next challenge →' : 'See my summary →'}</button>` : ''}`;
  },

  summary: () => {
    const lo = { LO1: [], LO2: [S.ledger?.ok && S.ledger.first], LO3: [S.dis?.first] };
    S.order.forEach(id => (lo[TASKS[id].lo] ||= []).push(!!S.ans[id]?.firstOk));
    const name = { LO1: 'Explain: most dry mass comes from CO₂', LO2: 'Interpret: van Helmont\'s data rules out soil', LO3: 'Compare: fresh mass vs dry mass' };
    const mis = S.log.filter(l => l.ev === 'misconception').map(l => l.data);
    return `${steps()}<h2>Step 6 · What you figured out, ${esc(S.name || 'scientist')}</h2>
    <div class="card"><table><tr><th>Learning outcome</th><th>First-try correct</th></tr>
    ${Object.keys(name).map(k => `<tr><td>${name[k]}</td><td>${lo[k].filter(Boolean).length} / ${lo[k].length}</td></tr>`).join('')}</table></div>
    <div class="card"><b>Your journey</b><ul>
    <li>You predicted <b>${esc(S.predict?.choice)}</b> (${esc(S.predict?.conf)}).</li>
    <li>Ideas we tested along the way: ${mis.length ? [...new Set(mis)].map(m => m === 'M1' ? '"mass comes from soil"' : '"mass is mostly water"').join(', ') : 'none: you went straight to the evidence'}.</li>
    <li>Hints used: ${S.hints}. Time: ${Math.round((Date.now() - S.started) / 60000)} min.</li></ul>
    <p>Big idea: <mark>a tree is built mostly out of thin air</mark>. Carbon and oxygen atoms from CO₂ make up about 90% of its dry mass. Water makes it heavy while it is alive, and the soil adds only a pinch of minerals.</p></div>
    <h3>Feedback from the agents (reviewed by your teacher)</h3>${S.fb.map(fbView).join('') || '<p class="muted">None yet.</p>'}
    <p><button class="ghost" data-act="reset">Start over</button></p>`;
  },

  teacher: () => `<h1>Teacher view</h1><p class="muted">Mr. D'Souza · Olympiad batch. Approve or override every AI judgement before the learner relies on it. Changes appear in the learner's tab immediately.</p>
    <div class="card"><b>${esc(S.name || '(learner has not started)')}</b>, now on <b>${esc(S.screen)}</b><br>
    Prediction: <b>${esc(S.predict?.choice ?? '-')}</b> (${esc(S.predict?.conf ?? '-')}). "${esc(S.predict?.why ?? '')}"<br>
    Path chosen by the system: <b>${esc({ M1: 'Soil misconception', M2: 'Water misconception', core: 'Core', adv: 'Olympiad (advanced)' }[S.path] ?? '-')}</b><br>
    Ledger: ${S.ledger ? (S.ledger.ok ? 'correct' : 'in progress') + ` (${S.ledger.tries} tries)` : '-'} · Disagreement: ${S.dis ? (S.dis.ok ? 'resolved' : 'trying') + ` (oven max ${S.dis.maxH ?? 0} h)` : '-'} · Hints: ${S.hints}</div>
    <div class="card"><table><tr><th>Task</th><th>Answer</th><th>Tries</th><th>Result</th></tr>
    ${Object.keys(TASKS).filter(id => S.ans[id]).map(id => { const a = S.ans[id]; return `<tr><td>${id.toUpperCase()}</td><td>${esc(Array.isArray(a.value) ? a.value.join(', ') : a.value)}</td><td>${a.tries}</td><td>${a.ok ? '✔' : '✘'}${a.mis ? ' ' + a.mis : ''}</td></tr>`; }).join('') || '<tr><td colspan="4" class="muted">No answers yet.</td></tr>'}</table></div>
    <h2>AI feedback queue</h2>${S.fb.map(f => `<div class="card"><div class="row"><b>${esc(f.where)}</b><span class="badge ${f.status}">${f.status}</span>${f.source === 'sample' ? '<span class="badge sample">recorded sample</span>' : '<span class="badge">live AI</span>'}<span class="badge">verdict: ${esc(f.verdict)}</span></div>
      <p class="muted">Learner wrote: "${esc(f.learner)}"</p><p>AI said: ${esc(f.text)}</p>
      <textarea id="ov${f.id}" placeholder="Write your own feedback to replace the AI's…">${esc(f.teacherText)}</textarea>
      <div class="row" style="margin-top:8px"><button data-act="approve" data-arg="${f.id}">Approve AI feedback</button><button class="ghost" data-act="override" data-arg="${f.id}">Override with my text</button></div></div>`).join('') || '<p class="muted">No AI feedback yet.</p>'}`,

  about: () => `<h1>About</h1><div class="card">
    <p><b>The Willow Mystery</b>: a multi-agent learning environment for <i>"Where does a plant's mass come from?"</i></p>
    <table><tr><td>Identity token</td><td><b>24B0354</b></td></tr><tr><td>Problem</td><td>P3 Multi-agent collaborative learning</td></tr>
    <tr><td>Topic</td><td>P3-T9 Where does a plant's mass come from? (Cl. 7–10)</td></tr><tr><td>Learner</td><td>L6 High-achieving Olympiad learner</td></tr>
    <tr><td>Constraint</td><td>C5 Teacher-in-the-loop</td></tr></table>
    <p class="muted">Agents run on OpenRouter through a Vercel function. When the AI fails, clearly labelled recorded samples are used. Built during the ET 617 End-Sem exam with AI assistance (Claude Code). No UI library or template was used.</p>
    <button class="ghost" data-act="reset">Reset all progress on this device</button></div>`
};

function ledgerResult() {
  return `<div class="fb ok"><b>Ledger balanced.</b> The tree gained <b>74.4 kg</b>; the soil lost <b>0.057 kg</b>. Even if every gram went into the tree, soil explains only <mark>0.08%</mark> of the gain.</div>
  <div class="muted">Tree gain</div><div class="bar" style="width:100%"></div><div class="muted">Soil loss (to scale: almost invisible)</div><div class="bar" style="width:0.08%;min-width:2px;background:var(--skep)"></div>`;
}
function ovenOut(h) {
  const m = 12 + 88 * Math.exp(-h / 6);
  return `<p>Mass now: <mark><b>${m.toFixed(1)} g</b></mark> · water driven off: ${(100 - m).toFixed(1)} g ${h >= 36 ? '· <b>mass has stopped changing: this is the dry mass</b>' : ''}</p>
  <div class="bar" style="width:${m}%;background:var(--leaf)"></div>`;
}
function rtView() {
  const r = S.rt; const tag = r.source === 'sample' ? ' <span class="badge sample">Recorded sample: live AI unavailable</span>' : '';
  return `<div class="agent leaf"><b>Dr. Leaf · Explainer</b>${esc(r.explainer)}${tag}</div>
  <div class="agent skep"><b>Skeptic · Challenger</b> <small>read Dr. Leaf's reply</small><br>${esc(r.challenger)}${tag}</div>
  <small class="muted">Evidence Judge read your answer and both agents:</small>${fbView(S.fb.find(f => f.id === r.fbId))}`;
}
function taskFb(id) {
  const a = S.ans[id];
  if (TASKS[id].kind === 'text') return fbView(S.fb.find(f => f.id === a.fbId));
  return `<div class="fb ${a.ok ? 'ok' : 'no'}">${a.ok ? '✔ ' : ''}${a.fb}${!a.ok && a.tries >= 2 ? `<br><b>Model answer:</b> ${model(id)}` : !a.ok ? '<br><i>Have another go.</i>' : ''}</div>`;
}
const model = id => ({ t1: 'Carbon dioxide from the air', t2: '0.057 ÷ 74.4 × 100 ≈ 0.08%', t3: TASKS.t3.key.map((k, i) => `${TASKS.t3.items[i]} → ${k}`).join('; '), t4: 'about 45 g (spinach is ~90% water)', t6: 'In the O₂ gas released, so sugar\'s oxygen comes from CO₂' }[id]);

// ---------- actions ----------
const ACT = {
  start() { S.name = $('name').value.trim(); log('start', S.name); go('predict'); },
  go(screen) { go(screen); },
  predict() {
    const choice = picked('p'), conf = picked('c'), why = $('why').value.trim();
    if (!choice || !conf) return alert('Pick an answer and how sure you are.');
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
    const text = $('expl').value.trim(); if (text.length < 10) return alert('Write a sentence or two first.');
    $('askb').disabled = true; $('rt').innerHTML = '<p class="muted">Dr. Leaf is thinking… then Skeptic reads Dr. Leaf… then the Judge reads you both… (up to 20 s)</p>';
    let r;
    try { const d = await callAgents({ mode: 'roundtable', text, path: S.path, prev: S.rt?.judge }); r = { explainer: d.explainer, challenger: d.challenger, judge: d.judge, source: 'ai' }; }
    catch (e) { log('ai_fail', String(e)); r = { ...SAMPLE_RT, judge: ruleJudge(text), source: 'sample' }; }
    const item = addFb('Round-table', text, r.judge.feedback, r.source, r.judge.verdict);
    if (r.judge.verdict === 'M1_soil') log('misconception', 'M1'); if (r.judge.verdict === 'M2_water') log('misconception', 'M2');
    S.rt = { ...r, learner: text, fbId: item.id }; log('roundtable', { verdict: r.judge.verdict, source: r.source }); render();
  },
  verdict() {
    const fresh = picked('fresh'), dry = picked('dry'); if (!fresh || !dry) return alert('Answer both questions.');
    const ok = fresh === 'Water' && dry === 'Matter built from CO₂';
    const tries = (S.dis?.tries ?? 0) + 1;
    const fb = ok ? `<div class="fb ok"><b>You settled it, and both agents were partly right.</b> Skeptic is right about the <b>fresh</b> tree: about 88% of a living leaf is water. Dr. Leaf is right about the <b>dry</b> tree: the 12 g that never evaporates is mostly carbon and oxygen atoms built from CO₂. Van Helmont weighed a living tree, so his 74 kg was mostly water, but the part that stays is built from air.</div>`
      : dry === 'Water' ? `<div class="fb no">Run the oven to 48 hours and watch: the water is driven off, but 12 g stays. Can what is left after drying be water?</div>`
      : `<div class="fb no">Look at the oven at 0 hours versus 48 hours. How much of the fresh leaf disappeared as water vapour?</div>`;
    if (!ok) log('misconception', 'M2');
    S.dis = { ...S.dis, ok, tries, first: ok && tries === 1, fb, fresh, dry }; log('verdict', { fresh, dry, ok }); render();
  },
  hint() { const id = S.order[S.ti]; S.ans[id] = { ...(S.ans[id] || { tries: 0 }), hinted: true }; S.hints++; log('hint', id); render(); },
  async answer() {
    const id = S.order[S.ti], T = TASKS[id], prev = S.ans[id] || { tries: 0 };
    let value;
    if (T.kind === 'mcq') value = picked('a');
    if (T.kind === 'num') value = $('a').value === '' ? undefined : parseFloat($('a').value);
    if (T.kind === 'match') { value = T.items.map((_, i) => $('m' + i).value); if (value.includes('')) value = undefined; }
    if (T.kind === 'text') value = $('a').value.trim() || undefined;
    if (value === undefined || Number.isNaN(value)) return alert('Answer first.');
    let res;
    if (T.kind === 'text') {
      $('tres').innerHTML = '<p class="muted">The Evidence Judge is reading your answer…</p>';
      let j, source = 'ai';
      try { j = (await callAgents({ mode: 'judge', text: value, prev: S.rt?.judge })).judge; } catch (e) { log('ai_fail', String(e)); j = ruleJudge(value); source = 'sample'; }
      const item = addFb('Challenge: convince your cousin', value, j.feedback, source, j.verdict);
      res = { ok: j.verdict === 'correct', mis: j.verdict === 'M1_soil' ? 'M1' : j.verdict === 'M2_water' ? 'M2' : null, fbId: item.id };
      res.tries = 2; // one AI-judged attempt; the teacher reviews it
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
  approve(id) { const f = S.fb.find(x => x.id === id); f.status = 'approved'; log('teacher_approve', id); render(); },
  override(id) { const t = $('ov' + id).value.trim(); if (!t) return alert('Write your feedback first.'); const f = S.fb.find(x => x.id === id); f.status = 'overridden'; f.teacherText = t; log('teacher_override', id); render(); },
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
addEventListener('hashchange', render);

function render() {
  const view = location.hash === '#teacher' ? 'teacher' : location.hash === '#about' ? 'about' : S.screen;
  $('app').innerHTML = (V[view] || V.welcome)();
}
render();
