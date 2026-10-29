// ===== STUB – erstattes i steg 4 =====
// Kontrakt som app.js forventer:
// window.runTrial({container, interface:'buttons'|'slider', task:'numeric'|'perceptual',
//                  target, start, texts}) -> Promise<{final_value, time_ms, first_input_ms,
//                  n_interactions, n_overshoots}>   (alle heltall, final_value 0..100)
window.runTrial = ({ container, interface: ui, task, target, start, texts }) =>
  new Promise((resolve) => {
    const t0 = performance.now();
    const info = document.createElement('p');
    info.textContent = `[STUB ${ui}/${task}] ${texts.label_maal}: ${target}, start: ${start}`;
    const btn = document.createElement('button');
    btn.className = 'primary';
    btn.textContent = texts.bekreft_knapp;
    btn.onclick = () =>
      resolve({ final_value: start, time_ms: Math.round(performance.now() - t0),
                first_input_ms: null, n_interactions: 0, n_overshoots: 0 });
    container.replaceChildren(info, btn);
  });
