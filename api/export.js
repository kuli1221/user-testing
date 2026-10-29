import { q, route, fail } from '../lib/db.js';

const COMBOS = [['buttons', 'numeric'], ['slider', 'numeric'], ['buttons', 'perceptual'], ['slider', 'perceptual']];
const METRICS = [['time_ms', 'time'], ['error_abs', 'err'], ['n_interactions', 'int'], ['n_overshoots', 'over']];
const RATINGS = ['ease', 'precision', 'satisfaction'];

function toCsv(rows) {
  if (!rows.length) return '';
  const cols = Object.keys(rows[0]);
  const esc = (v) => {
    if (v == null) return '';
    const s = v instanceof Date ? v.toISOString() : String(v);
    return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [cols.join(','), ...rows.map((r) => cols.map((c) => esc(r[c])).join(','))].join('\n');
}

export default route('GET', async (req, res) => {
  const key = req.headers['x-export-key'] ?? req.query.key;
  if (!process.env.EXPORT_KEY || key !== process.env.EXPORT_KEY) fail('Ikke tilgang', 401);

  const format = req.query.format === 'wide' ? 'wide' : 'long';
  let sql;

  if (format === 'long') {
    // ?practice=1 tar med øvingsforsøk, ?all=1 tar med uferdige deltakere
    const practice = req.query.practice === '1' ? '' : 'and not t.is_practice';
    const done = req.query.all === '1' ? '' : 'and p.completed_at is not null';
    sql = `select p.pid, p.order_group, p.device_class, p.age_group, p.gender,
             t.block_index, t.interface, t.task, t.trial_number, t.is_practice,
             t.target, t.start_value, t.distance_cat, t.distance_abs, t.final_value,
             t.error_abs, t.time_ms, t.first_input_ms, t.n_interactions, t.n_overshoots
           from trials t join participants p on p.id = t.participant_id
           where true ${practice} ${done}
           order by p.pid, t.block_index, t.trial_number`;
  } else {
    // Én rad per deltaker: gjennomsnitt per betingelse (til repeated measures i JASP)
    const tcols = COMBOS.flatMap(([i, k]) =>
      METRICS.map(([c, n]) => `avg(t.${c}) filter (where t.interface='${i}' and t.task='${k}') as ${n}_${i}_${k}`)
    ).join(',\n');
    const rcols = COMBOS.flatMap(([i, k]) =>
      RATINGS.map((c) => `max(r.${c}) filter (where r.interface='${i}' and r.task='${k}') as ${c}_${i}_${k}`)
    ).join(',\n');
    sql = `select p.pid, p.order_group, p.device_class, p.age_group, p.gender,
             p.preferred_interface, p.preferred_numeric, p.preferred_perceptual,
             tt.*, rr.*
           from participants p
           left join lateral (select ${tcols} from trials t
                              where t.participant_id = p.id and not t.is_practice) tt on true
           left join lateral (select ${rcols} from ratings r
                              where r.participant_id = p.id) rr on true
           where p.completed_at is not null
           order by p.pid`;
  }

  const { rows } = await q(sql);
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${format}.csv"`);
  res.status(200).send(toCsv(rows));
});
