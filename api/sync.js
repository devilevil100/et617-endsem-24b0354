// Vercel function: shared progress and teacher reviews in Supabase Postgres (via the IPv4 session pooler).
// The connection string is a Vercel secret (DATABASE_URL); tables have RLS on with no public policies,
// so Supabase's public REST API cannot reach them, only this server can.
const { Pool } = require('pg');
const pool = process.env.DATABASE_URL ? new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false }, max: 1 }) : null;

module.exports = async (req, res) => {
  if (!pool) return res.status(503).json({ ok: false, error: 'database not configured' });
  const q = req.method === 'GET' ? req.query : (req.body || {});
  const id = String(q.id || '').slice(0, 64);
  try {
    if (q.action === 'push' && id && q.state) {          // learner device saves its progress
      await pool.query(`insert into learners (id, name, state, updated_at) values ($1, $2, $3, now())
        on conflict (id) do update set name = excluded.name, state = excluded.state, updated_at = now()`, [id, String(q.name || '').slice(0, 40), q.state]);
      return res.json({ ok: true });
    }
    if (q.action === 'reviews' && id) {                   // learner device fetches the teacher's decisions
      const r = await pool.query('select fb_id, status, teacher_text from reviews where learner_id = $1', [id]);
      return res.json({ ok: true, reviews: r.rows });
    }
    if (q.action === 'learners') {                        // teacher view: everyone, most recent first
      const r = await pool.query('select id, name, state, updated_at from learners order by updated_at desc limit 50');
      return res.json({ ok: true, learners: r.rows });
    }
    if (q.action === 'review' && id && q.fb_id) {         // teacher approves or overrides one AI judgement
      await pool.query(`insert into reviews (fb_id, learner_id, status, teacher_text, updated_at) values ($1, $2, $3, $4, now())
        on conflict (fb_id) do update set status = excluded.status, teacher_text = excluded.teacher_text, updated_at = now()`,
        [String(q.fb_id).slice(0, 64), id, q.status === 'overridden' ? 'overridden' : 'approved', String(q.teacher_text || '').slice(0, 1000)]);
      return res.json({ ok: true });
    }
    return res.status(400).json({ ok: false, error: 'bad request' });
  } catch (e) {
    return res.status(502).json({ ok: false, error: 'database error' });
  }
};
