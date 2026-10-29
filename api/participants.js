import { q, route, fail, isInt, oneOf } from '../lib/db.js';
import { orderFor } from '../lib/design.js';

export default route('POST', async (req, res) => {
  const b = req.body ?? {};
  if (b.consent !== true) fail('Samtykke mangler');
  if (!oneOf(b.device_class, ['mouse', 'touch'])) fail('device_class');
  if (!oneOf(b.age_group, ['18-19', '20-29', '30-39', '40-49', '50+'])) fail('age_group');
  if (!oneOf(b.gender, ['kvinne', 'mann', 'annet', 'vil_ikke_oppgi'])) fail('gender');
  const vw = isInt(b.viewport_w, 0, 20000) ? b.viewport_w : null;
  const vh = isInt(b.viewport_h, 0, 20000) ? b.viewport_h : null;

  const { rows: [{ pid }] } = await q(`select nextval('participants_pid_seq')::int as pid`);
  const { group, blocks } = orderFor(pid);
  const blockOrder = blocks.map((x) => `${x.interface}-${x.task}`).join(',');

  const { rows: [p] } = await q(
    `insert into participants (pid, consent, age_group, gender, device_class, viewport_w, viewport_h, order_group, block_order)
     values ($1, true, $2, $3, $4, $5, $6, $7, $8) returning id`,
    [pid, b.age_group, b.gender, b.device_class, vw, vh, group, blockOrder]
  );
  res.status(201).json({ participant_id: p.id, pid, order_group: group, blocks });
});
