// 2 (grensesnitt) x 2 (oppgavetype) innad i grupper.
// Blokkrekkefølge: balansert latinsk kvadrat (Williams) -> hver blokk står like ofte
// på hver plass, og hver blokk følger like ofte etter hver annen blokk.
export const BLOCKS = {
  1: { interface: 'buttons', task: 'numeric' },
  2: { interface: 'slider', task: 'numeric' },
  3: { interface: 'buttons', task: 'perceptual' },
  4: { interface: 'slider', task: 'perceptual' },
};
const SQUARE = [
  [1, 2, 4, 3],
  [2, 3, 1, 4],
  [3, 4, 2, 1],
  [4, 1, 3, 2],
];

export function orderFor(pid) {
  const group = (pid - 1) % 4;
  const blocks = SQUARE[group].map((b, i) => ({ block_index: i, ...BLOCKS[b] }));
  return { group, blocks };
}
