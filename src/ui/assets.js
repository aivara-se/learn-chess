/* The chrome's sprites, and the one place their paths live.
 *
 * They are the UI pack the assets card shipped (`assets/ui/**`, byte-for-byte
 * pack members; see ATTRIBUTION.md), plus Pip. Every path here is named in
 * `assets/manifest.json` and nothing else, so the offline worker precaches
 * exactly what the chrome asks for and a screen never edits `sw.js`.
 *
 * `loadChrome()` is awaited at the top of a scene module on purpose: the shell
 * imports a scene with `await import(...)` inside a `try`, so a sprite that is
 * missing fails in the shell's own error path — on screen and in the console —
 * rather than in a floating promise nothing catches.
 */
import { Assets, Sprite } from '../../vendor/pixi/pixi.min.mjs';

export const SPRITE = {
  raised: 'assets/ui/button.png',
  flat: 'assets/ui/panel.png',
  square: 'assets/ui/button-square.png',
  round: 'assets/ui/button-round.png',
  star: 'assets/ui/star.png',
  starOutline: 'assets/ui/star-outline.png',
  badge: 'assets/ui/rank-badge.png',
  lock: 'assets/ui/lock.png',
  tick: 'assets/ui/check.png',
  east: 'assets/ui/arrow-east.png',
  west: 'assets/ui/arrow-west.png',
  divider: 'assets/ui/divider.png',
  track: 'assets/ui/progress-track.png',
  fill: 'assets/ui/progress-fill.png',
  pip: 'assets/characters/pip.png',
};

export async function loadChrome() {
  const paths = Object.values(SPRITE);
  await Assets.load(paths);
  return paths;
}

export function texture(path) {
  const found = Assets.get(path);
  if (!found) throw new Error(`the chrome sprite ${path} is not loaded`);
  return found;
}

export function sprite(path, { width = 0, height = 0 } = {}) {
  const node = new Sprite(texture(path));
  if (width) node.width = width;
  if (height) node.height = height;
  return node;
}
