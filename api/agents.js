// Vercel serverless function: three agents (Explainer → Challenger → Judge) on OpenRouter.
// Each agent receives the earlier agents' replies, so they exchange information.
const MODEL = process.env.OPENROUTER_MODEL || 'openai/gpt-4o-mini';

const LEARNER = 'The learner is Ishita, 15, a Class 10 Olympiad aspirant in India who is bored by routine practice. Speak directly to her in a friendly, conversational tone ("let us", "we"). Short sentences. At most 60 words. Plain text, no markdown.';
const EVIDENCE = 'EVIDENCE BOARD (only use these facts): van Helmont (1648): willow 2.3 kg -> 76.7 kg in 5 years (gain 74.4 kg); dried soil 90.700 kg -> 90.643 kg (lost 0.057 kg = 0.08% of the gain); only rainwater was added. Oven drying: 100 g fresh leaves -> about 12 g dry (about 88% water). Dry plant matter is about 45% carbon, 45% oxygen, 6% hydrogen, under 5% soil minerals. ALWAYS say which mass you mean: FRESH mass is mostly water; DRY mass is mostly carbon and oxygen built from CO2. Never say the mass comes from "air and water" without that distinction. Photosynthesis: 6CO2 + 6H2O -> C6H12O6 + 6O2. Ruben & Kamen (1941, oxygen-18): the O2 released comes from water, so the carbon and oxygen in sugar come from CO2.';

const PROMPTS = {
  explainer: `You are Dr. Leaf, the EXPLAINER agent in a learning app. ${LEARNER} ${EVIDENCE} Explain where most of the tree's mass came from by counting atoms. Start from what the learner got right, then correct gaps. Never say most of the mass comes from soil.`,
  challenger: `You are Skeptic, the CHALLENGER agent. ${LEARNER} ${EVIDENCE} Your job is to test the learner's reasoning by arguing the strongest rival claim: that most of a LIVING tree's mass is WATER (true for fresh mass). Address Dr. Leaf by name and push back on one specific sentence of theirs. End with one question to the learner. Do not concede and do not give the final answer.`,
  judge: `You are the EVIDENCE JUDGE agent. ${LEARNER} ${EVIDENCE} Judge the LEARNER's explanation against the evidence board. Do not declare Dr. Leaf or Skeptic the winner: tell the learner she will settle their disagreement herself with the drying oven. Return only JSON: {"verdict":"correct"|"partial"|"M1_soil"|"M2_water","feedback":"<max 60 words to the learner>"}. Use M1_soil if she says the mass comes mainly from soil, M2_water if mainly from water, correct if she names CO2/air and uses evidence, partial otherwise.`,
  task: `You are the EVIDENCE JUDGE agent. ${LEARNER} ${EVIDENCE} The learner was asked: "Your cousin says plants eat soil, that is why we add fertiliser. Convince them in 2-3 sentences using evidence." Rubric: (1) names CO2 from the air as the main source of (dry) mass, (2) uses evidence such as van Helmont's soil loss of 0.057 kg vs 74.4 kg gain, (3) says what fertiliser/soil actually provides (a few minerals). Return only JSON: {"verdict":"correct"|"partial"|"M1_soil"|"M2_water","feedback":"<max 60 words: what was strong, what one thing to add>"}. correct = meets 1 and 2.`
};

async function ask(system, user, json) {
  const r = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: MODEL, temperature: 0.3, max_tokens: 250, messages: [{ role: 'system', content: system }, { role: 'user', content: user }], ...(json && { response_format: { type: 'json_object' } }) }),
    signal: AbortSignal.timeout(20000)
  });
  if (!r.ok) throw new Error('OpenRouter HTTP ' + r.status);
  const text = (await r.json()).choices?.[0]?.message?.content?.trim();
  if (!text) throw new Error('empty AI reply');
  return text;
}

// Check before the learner sees it: reject any sentence that claims soil is the main source (unless it is negated or attributed).
const soilClaim = t => t.split(/[.!?]/).some(s => /(most|majority|main)[^.]*from (the )?soil/i.test(s) && !/\b(not|n't|never|thought|think|believe|claim|says|said)\b/i.test(s));

function checkJudge(raw) {
  const j = JSON.parse(raw.slice(raw.indexOf('{'), raw.lastIndexOf('}') + 1));
  if (!['correct', 'partial', 'M1_soil', 'M2_water'].includes(j.verdict) || typeof j.feedback !== 'string' || !j.feedback.trim()) throw new Error('judge output failed schema check');
  if (soilClaim(j.feedback)) throw new Error('judge feedback failed fact check');
  return { verdict: j.verdict, feedback: j.feedback.trim().slice(0, 600) };
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ ok: false });
  if (!process.env.OPENROUTER_API_KEY) return res.status(503).json({ ok: false, error: 'AI key not configured' });
  const { mode, text = '', prev } = req.body || {};
  const learner = String(text).slice(0, 800).replace(/"/g, "'");
  // Agent memory across turns: the Judge's earlier verdict is passed to the agents in the next turn.
  const memo = prev && ['correct', 'partial', 'M1_soil', 'M2_water'].includes(prev.verdict)
    ? `\nThe Evidence Judge's EARLIER verdict on this learner: ${prev.verdict} ("${String(prev.feedback || '').slice(0, 300).replace(/"/g, "'")}"). Build on it: target that gap, and say if she has moved past it.` : '';
  try {
    if (mode === 'roundtable') {
      const explainer = await ask(PROMPTS.explainer, `Learner's explanation: "${learner}"${memo}`);
      if (soilClaim(explainer)) throw new Error('explainer failed fact check');
      const challenger = await ask(PROMPTS.challenger, `Learner's explanation: "${learner}"\nDr. Leaf said: "${explainer}"${memo}`);
      const judge = checkJudge(await ask(PROMPTS.judge, `Learner's explanation: "${learner}"\nDr. Leaf said: "${explainer}"\nSkeptic said: "${challenger}"${memo}`, true));
      return res.json({ ok: true, model: MODEL, explainer, challenger, judge });
    }
    if (mode === 'judge') return res.json({ ok: true, model: MODEL, judge: checkJudge(await ask(PROMPTS.task, `Learner's answer: "${learner}"${memo}`, true)) });
    return res.status(400).json({ ok: false, error: 'unknown mode' });
  } catch (e) {
    return res.status(502).json({ ok: false, error: String(e.message || e) });
  }
};
