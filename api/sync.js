// Vercel function: shared progress and teacher reviews in Supabase (PostgREST over fetch, no SDK).
// The service_role key stays on the server; tables have RLS on with no public policies.
const BASE = process.env.SUPABASE_URL, KEY = process.env.SUPABASE_SERVICE_KEY;
const db = (path, opts = {}) => fetch(`${BASE}/rest/v1/${path}`, {
  ...opts,
  headers: { apikey: KEY, Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json', ...opts.headers },
  signal: AbortSignal.timeout(8000)
});
const upsert = (table, row) => db(table, { method: 'POST', headers: { Prefer: 'resolution=merge-duplicates' }, body: JSON.stringify(row) });

module.exports = async (req, res) => {
  if (!BASE || !KEY) return res.status(503).json({ ok: false, error: 'database not configured' });
  const q = req.method === 'GET' ? req.query : (req.body || {});
  const id = String(q.id || '').slice(0, 64);
  try {
    if (q.action === 'push' && id && q.state) {          // learner device saves its progress
      const r = await upsert('learners', { id, name: String(q.name || '').slice(0, 40), state: q.state, updated_at: new Date().toISOString() });
      return res.status(r.ok ? 200 : 502).json({ ok: r.ok });
    }
    if (q.action === 'reviews' && id) {                   // learner device fetches the teacher's decisions
      const r = await db(`reviews?learner_id=eq.${encodeURIComponent(id)}&select=fb_id,status,teacher_text`);
      return res.json({ ok: r.ok, reviews: r.ok ? await r.json() : [] });
    }
    if (q.action === 'learners') {                        // teacher view: everyone, most recent first
      const r = await db('learners?select=id,name,state,updated_at&order=updated_at.desc&limit=50');
      return res.json({ ok: r.ok, learners: r.ok ? await r.json() : [] });
    }
    if (q.action === 'review' && id && q.fb_id) {         // teacher approves or overrides one AI judgement
      const r = await upsert('reviews', { fb_id: String(q.fb_id).slice(0, 64), learner_id: id, status: q.status === 'overridden' ? 'overridden' : 'approved',
        teacher_text: String(q.teacher_text || '').slice(0, 1000), updated_at: new Date().toISOString() });
      return res.status(r.ok ? 200 : 502).json({ ok: r.ok });
    }
    return res.status(400).json({ ok: false, error: 'bad request' });
  } catch (e) {
    return res.status(502).json({ ok: false, error: String(e.message || e) });
  }
};
