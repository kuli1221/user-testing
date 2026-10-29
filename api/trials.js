import { pool, route, fail, isInt, oneOf, UUID } from '../lib/db.js';

export default route('POST', async (req, res) => {
  const { participant_id, trials } = req.body ?? {};
  if (!UUID.test(participant_id ?? '')) fail('participant_id');
  if (!Array.isArray(trials) || trials.length === 0 || trials.length > 40) fail('trials');

  for (const t of trials) {
    if (!isInt(t.block_index, 0, 3)) fail('block_index');
    if (!oneOf(t.interface, ['buttons', 'slider'])) fail('interface');
    if (!oneOf(t.task, ['numeric', 'perceptual'])) fail('task');
    if (!isInt(t.trial_number, 0, 100)) fail('trial_number');
    if (!oneOf(t.distance_cat, ['near', 'far'])) fail('distance_cat');
    for (const k of ['target', 'start_value', 'final_value']) if (!isInt(t[k], 0, 100)) fail(k);
    if (!isInt(t.time_ms, 0, 3_600_000)) fail('time_ms');
    if (t.first_input_ms != null && !isInt(t.first_input_ms, 0, 3_600_000)) fail('first_input_ms');
    if (!isInt(t.n_interactions, 0, 100000)) fail('n_interactions');
    if (!isInt(t.n_overshoots, 0, 100000)) fail('n_overshoots');
  }

  const c = await pool.connect();
  try {
    await c.query('begin');
    for (const t of trials) {
      await c.query(
        `insert into trials (participant_id, block_index, interface, task, trial_number, is_practice,
           target, start_value, distance_cat, final_value, time_ms, first_input_ms, n_interactions, n_overshoots)
         values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
         on conflict do nothing`,
        [participant_id, t.block_index, t.interface, t.task, t.trial_number, !!t.is_practice,
         t.target, t.start_value, t.distance_cat, t.final_value, t.time_ms, t.first_input_ms ?? null,
         t.n_interactions, t.n_overshoots]
      );
    }
    await c.query('commit');
  } catch (e) {
    await c.query('rollback');
    throw e;
  } finally {
    c.release();
  }
  res.status(201).json({ saved: trials.length });
});
