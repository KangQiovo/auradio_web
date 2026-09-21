/** Scoped colour state: never write to html/body or another album section. */
const applied = new WeakMap();
/**
 * @param {HTMLElement | null} scope
 * @param {{accent:string,dark:string,soft:string,paper:string,glow:string}} palette
 * @param {string} id
 */
export function applyAmbient(scope, palette, id) {
  if (!scope) return;
  scope.dataset.album = id;
  for (const key of ['accent', 'dark', 'soft', 'paper']) {
    scope.style.setProperty(`--album-${key}`, palette[key]);
  }
  const background = `radial-gradient(ellipse at 80% 12%, ${palette.glow} 0%, ${palette.dark} 68%)`;
  if (applied.get(scope) === background) return;
  const layers = scope.querySelectorAll(':scope > .album-ambience > div');
  const next = scope.dataset.ambientLayer === '1' ? 0 : 1;
  layers.forEach((layer, index) => {
    if (index === next) layer.style.background = background;
    layer.style.opacity = index === next ? '1' : '0';
  });
  scope.dataset.ambientLayer = String(next);
  applied.set(scope, background);
}
