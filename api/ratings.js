import { q, route, fail, isInt, oneOf, UUID } from '../lib/db.js';

export default route('POST', async (req, res) => {
  const b = req.body ?? {};
  if (!UUID.test(b.participant_id ?? '')) fail('participant_id');
  if (!oneOf(b.interface, ['buttons', 'slider'])) fail('interface');
  if (!oneOf(b.task, ['numeric', 'perceptual'])) fail('task');
  for (const k of ['ease', 'precision', 'satisfaction']) if (!isInt(b[k], 1, 7)) fail(k);

  await q(
    `insert into ratings (participant_id, interface, task, ease, precision, satisfaction)
     values ($1,$2,$3,$4,$5,$6)
     on conflict (participant_id, interface, task)
     do update set ease = excluded.ease, precision = excluded.precision, satisfaction = excluded.satisfaction`,
    [b.participant_id, b.interface, b.task, b.ease, b.precision, b.satisfaction]
  );
  res.status(201).json({ ok: true });
});
