// Oppgavekomponent (steg 4).
// window.runTrial({container, interface:'buttons'|'slider', task:'numeric'|'perceptual',
//                  target, start, texts}) -> Promise<{final_value, time_ms, first_input_ms,
//                  n_interactions, n_overshoots}>
//
// Måledefinisjoner:
//  time_ms          fra oppgaven vises til «Bekreft» trykkes
//  first_input_ms   fra oppgaven vises til første interaksjon
//  n_interactions   knapper: antall klikk på verdiknapper. slider: antall «grep»
//                   (pointerdown) + tastetrykk (uten hold-repetisjon)
//  n_overshoots     antall ganger verdien krysser målet (bytter side av målverdien)
// Perseptuell oppgave: verdi 0..100 -> fargetone (hue) 0..300 grader, fast metning/lysstyrke.
(() => {
    const style = document.createElement('style');
    style.textContent = `
    .tr button, .tr input { touch-action: manipulation; user-select: none; -webkit-user-select: none; }
    .tr .info { font-size: 1.6rem; text-align: center; margin: .3rem 0; }
    .tr .info b { font-variant-numeric: tabular-nums; }
    .tr .swatches { display: flex; margin: 1rem 0; }
    .tr .sw { flex: 1; text-align: center; }
    .tr .sw div { height: 140px; }
    .tr .steps { display: flex; gap: .5rem; margin: 1.2rem 0; }
    .tr .steps button { flex: 1; min-height: 64px; font-size: 1.4rem; cursor: pointer; }
    .tr .slider { width: 100%; height: 56px; margin: 1.2rem 0; accent-color: var(--accent); }
    .tr .ok { width: 100%; }`;
    document.head.append(style);

    const el = (tag, cls, txt) => {
        const e = document.createElement(tag);
        if (cls) e.className = cls;
        if (txt != null) e.textContent = txt;
        return e;
    };
    const hue = (v) => `hsl(${v * 3}, 70%, 50%)`;

    window.runTrial = ({ container, interface: ui, task, target, start, texts }) =>
        new Promise((resolve) => {
            let value = start, n = 0, over = 0, first = null, t0 = 0;
            let last = Math.sign(start - target);

            const touch = () => { n++; if (first === null) first = Math.round(performance.now() - t0); };
            const set = (v) => {
                value = Math.max(0, Math.min(100, v));
                const s = Math.sign(value - target);
                if (s !== 0) { if (last !== 0 && s !== last) over++; last = s; }
                draw();
            };

            const root = el('div', 'tr');
            let drawFn = () => {};
            const draw = () => drawFn();

            // --- visning ---
            if (task === 'numeric') {
                const mal = el('b', null, String(target)), din = el('b', null, String(value));
                const l1 = el('p', 'info', texts.label_maal + ': '); l1.append(mal);
                const l2 = el('p', 'info', texts.label_din + ': '); l2.append(din);
                root.append(l1, l2);
                drawFn = () => { din.textContent = String(value); };
            } else {
                const sw = (label) => { const w = el('div', 'sw'), box = el('div'); w.append(box, el('p', 'note', label)); return [w, box]; };
                const [w1, b1] = sw(texts.label_prove), [w2, b2] = sw(texts.label_din);
                b1.style.background = hue(target);
                b2.style.background = hue(value);
                const row = el('div', 'swatches'); row.append(w1, w2);
                root.append(row);
                drawFn = () => { b2.style.background = hue(value); };
            }

            // --- kontroll ---
            if (ui === 'buttons') {
                const row = el('div', 'steps');
                [-10, -1, 1, 10].forEach((d) => {
                    const b = el('button', null, (d > 0 ? '+' : '−') + Math.abs(d));
                    b.addEventListener('click', () => { touch(); set(value + d); });
                    row.append(b);
                });
                root.append(row);
            } else {
                const r = el('input', 'slider');
                r.type = 'range'; r.min = 0; r.max = 100; r.step = 1; r.value = start;
                r.addEventListener('pointerdown', touch);
                r.addEventListener('keydown', (e) => {
                    if (!e.repeat && /^(Arrow|Home$|End$|Page)/.test(e.key)) touch();
                });
                r.addEventListener('input', () => set(Number(r.value)));
                root.append(r);
            }

            const ok = el('button', 'primary ok', texts.bekreft_knapp);
            ok.addEventListener('click', () => resolve({
                final_value: value, time_ms: Math.round(performance.now() - t0),
                first_input_ms: first, n_interactions: n, n_overshoots: over,
            }));
            root.append(ok);

            container.replaceChildren(root);
            t0 = performance.now();
        });
})();