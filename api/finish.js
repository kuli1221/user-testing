import { q, route, fail, oneOf, UUID } from '../lib/db.js';

export default route('POST', async (req, res) => {
  const b = req.body ?? {};
  if (!UUID.test(b.participant_id ?? '')) fail('participant_id');
  const P = ['buttons', 'slider', 'none'];
  for (const k of ['preferred_interface', 'preferred_numeric', 'preferred_perceptual'])
    if (!oneOf(b[k], P)) fail(k);
  const comments = typeof b.comments === 'string' ? b.comments.slice(0, 500) : null;

  const r = await q(
    `update participants set preferred_interface=$2, preferred_numeric=$3, preferred_perceptual=$4,
       comments=$5, completed_at=now() where id=$1`,
    [b.participant_id, b.preferred_interface, b.preferred_numeric, b.preferred_perceptual, comments]
  );
  if (r.rowCount === 0) fail('Ukjent deltaker', 404);
  res.json({ ok: true });
});
