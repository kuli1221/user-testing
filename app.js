'use strict';
const app = document.getElementById('app');
const S = { id: null, pid: null, blocks: [] };
let T;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const h = (tag, attrs = {}, ...kids) => {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'class') e.className = v;
    else if (k.startsWith('on')) e.addEventListener(k.slice(2), v);
    else e.setAttribute(k, v);
  }
  e.append(...kids.flat().filter((x) => x != null));
  return e;
};
const show = (...nodes) => { app.replaceChildren(...nodes); window.scrollTo(0, 0); };
const para = (t) => t.split('\n').filter(Boolean).map((s) => h('p', {}, s));

// Viser en skjerm og venter på klikk. validate() returnerer feilmelding eller ''.
const next = (nodes, label, validate) =>
  new Promise((res) => {
    const err = h('p', { class: 'err' });
    const btn = h('button', { class: 'primary', onclick: () => {
      const m = validate ? validate() : '';
      if (m) { err.textContent = m; return; }
      res();
    } }, label);
    show(...nodes, err, btn);
  });

async function api(path, body) {
  let err;
  for (let i = 0; i < 3; i++) {
    try {
      const r = await fetch('/api/' + path, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
      });
      const j = await r.json().catch(() => ({}));
      if (r.ok) return j;
      err = new Error(j.error || r.status);
      if (r.status < 500) { err.fatal = true; throw err; }
    } catch (e) { err = e; if (e.fatal) throw e; }
    await sleep(800 * (i + 1));
  }
  throw err;
}
// Lagrer, og lar deltakeren prøve igjen hvis nettverket feiler (data går ikke tapt)
async function persist(path, body) {
  for (;;) {
    try { return await api(path, body); }
    catch (e) { await next([h('p', { class: 'err' }, 'Kunne ikke lagre (' + e.message + '). Sjekk nettverket.')], 'Prøv igjen'); }
  }
}

// ---- Forsøksgenerering: seedet, så samme deltaker/blokk alltid gir samme sett ----
function mulberry32(a) {
  return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
function genTrials(seed) {
  const rnd = mulberry32(seed);
  const ri = (a, b) => a + Math.floor(rnd() * (b - a + 1));
  const mk = (cat) => {
    for (;;) {
      const d = cat === 'near' ? ri(8, 15) : ri(45, 70);
      const s = ri(5, 95), t = s + (rnd() < 0.5 ? -d : d);
      if (t >= 5 && t <= 95) return { start_value: s, target: t, distance_cat: cat };
    }
  };
  const shuffle = (a) => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const practice = [mk('near'), mk('far')].map((t, i) => ({ ...t, is_practice: true, trial_number: i }));
  const real = shuffle([...Array(4)].flatMap(() => [mk('near'), mk('far')]))
    .map((t, i) => ({ ...t, is_practice: false, trial_number: i }));
  return [...practice, ...real];
}

// ---- Skjermer ----
const consent = () => {
  const cb = h('input', { type: 'checkbox' });
  return next([h('h1', {}, T.samtykke_tittel), ...para(T.samtykke_tekst),
    h('label', {}, cb, ' ' + T.samtykke_avkrysning)], T.samtykke_knapp,
    () => (cb.checked ? '' : 'Du må krysse av for å fortsette.'));
};

async function demographics() {
  const sel = (opts) => h('select', {}, h('option', { value: '' }, '–'),
    ...Object.entries(opts).map(([v, l]) => h('option', { value: v }, l)));
  const age = sel(T.alder_valg), sex = sel(T.kjonn_valg);
  for (;;) {
    await next([h('p', {}, T.demografi_intro),
      h('label', { class: 'field' }, T.label_alder, age), h('label', { class: 'field' }, T.label_kjonn, sex)],
      T.neste_knapp, () => (age.value && sex.value ? '' : 'Velg et alternativ i begge felt.'));
    try {
      const r = await api('participants', {
        consent: true, age_group: age.value, gender: sex.value,
        device_class: matchMedia('(pointer: coarse)').matches ? 'touch' : 'mouse',
        viewport_w: innerWidth, viewport_h: innerHeight,
      });
      Object.assign(S, { id: r.participant_id, pid: r.pid, blocks: r.blocks });
      return;
    } catch (e) { await next([h('p', { class: 'err' }, 'Kunne ikke starte: ' + e.message)], 'Prøv igjen'); }
  }
}

async function runBlock(b) {
  const uiKey = b.interface === 'buttons' ? 'knapper' : 'slider';
  await next([h('p', { class: 'step' }, `Del ${b.block_index + 1} av 4`),
    ...para(T[`instruksjon_${uiKey}_${b.task}`])], T.start_knapp);
  const out = [], stage = h('div', { class: 'stage' }), head = h('p', { class: 'step' });
  for (const t of genTrials(S.pid * 10 + b.block_index)) {
    if (!t.is_practice && t.trial_number === 0) await next([h('p', {}, T.ovingsforsok_ferdig)], T.start_knapp);
    head.textContent = t.is_practice ? T.ovingsforsok_melding : `${t.trial_number + 1} / 8`;
    show(head, stage);
    const r = await window.runTrial({ container: stage, interface: b.interface, task: b.task,
      target: t.target, start: t.start_value, texts: T });
    out.push({ block_index: b.block_index, interface: b.interface, task: b.task,
      trial_number: t.trial_number, is_practice: t.is_practice, target: t.target,
      start_value: t.start_value, distance_cat: t.distance_cat, ...r });
  }
  await persist('trials', { participant_id: S.id, trials: out });
  await rate(b);
}

async function rate(b) {
  const qs = [['ease', 'sporsmal_enkelhet'], ['precision', 'sporsmal_presisjon'], ['satisfaction', 'sporsmal_tilfredshet']];
  const ans = {};
  const rows = qs.map(([k, tk]) => h('fieldset', {}, h('legend', {}, T[tk]),
    h('div', { class: 'scale' }, ...[1, 2, 3, 4, 5, 6, 7].map((n) => h('label', {},
      h('input', { type: 'radio', name: k, value: n, onchange: () => { ans[k] = n; } }), h('span', {}, String(n)))))));
  const label = T[b.interface === 'buttons' ? 'label_knapper' : 'label_slider'];
  await next([h('p', {}, T.blokk_ferdig_melding), h('h1', {}, label), h('p', {}, T.vurdering_intro),
    h('p', { class: 'note' }, T.skala_lav + ' · ' + T.skala_hoy), ...rows],
    T.neste_knapp, () => (qs.every(([k]) => ans[k]) ? '' : 'Svar på alle tre spørsmålene.'));
  await persist('ratings', { participant_id: S.id, interface: b.interface, task: b.task, ...ans });
}

async function finish() {
  const opts = [['buttons', T.label_knapper], ['slider', T.label_slider], ['none', T.label_ingen]];
  const qs = [['preferred_interface', 'sporsmal_pref_samlet'], ['preferred_numeric', 'sporsmal_pref_numerisk'],
    ['preferred_perceptual', 'sporsmal_pref_perseptuell']];
  const ans = {};
  const rows = qs.map(([k, tk]) => h('fieldset', {}, h('legend', {}, T[tk]),
    ...opts.map(([v, l]) => h('label', { class: 'opt' },
      h('input', { type: 'radio', name: k, onchange: () => { ans[k] = v; } }), ' ' + l))));
  const ta = h('textarea', { maxlength: '500', rows: '4' });
  await next([h('p', {}, T.preferanse_intro), ...rows,
    h('label', { class: 'field' }, T.kommentar_label, ta), h('p', { class: 'note' }, T.kommentar_advarsel)],
    T.send_knapp, () => (qs.every(([k]) => ans[k]) ? '' : 'Svar på alle tre spørsmålene.'));
  await persist('finish', { participant_id: S.id, ...ans, comments: ta.value.trim() || null });
  window.removeEventListener('beforeunload', warn);
  show(h('h1', {}, T.takk_tittel), h('p', {}, T.takk_tekst));
}

const warn = (e) => { e.preventDefault(); e.returnValue = ''; };

async function main() {
  T = await (await fetch('texts.json')).json();
  await consent();
  await demographics();
  window.addEventListener('beforeunload', warn);
  await next(para(T.intro_oppgaver), T.start_knapp);
  for (const b of S.blocks) await runBlock(b);
  await finish();
}
main().catch((e) => show(h('p', { class: 'err' }, 'Noe gikk galt: ' + e.message)));
