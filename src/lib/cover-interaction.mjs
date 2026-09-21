/** Pointer math is independent of rendering, bounded for touch and extreme coordinates. */
export function coverPose(clientX, clientY, rect, coarse=false) {
  if (![clientX,clientY,rect.left,rect.top,rect.width,rect.height].every(Number.isFinite) || rect.width<=0 || rect.height<=0) {
    return {rotateX:0,rotateY:0,lightX:0,lightY:0};
  }
  const x=Math.max(-1,Math.min(1,(clientX-rect.left)/rect.width*2-1));
  const y=Math.max(-1,Math.min(1,(clientY-rect.top)/rect.height*2-1));
  const angle=coarse?4:7;
  return {rotateX:-y*angle,rotateY:x*angle,lightX:x*13,lightY:y*13};
}
/** Return a selection step only for a deliberate horizontal swipe, never for scrolling. */
export function horizontalStep(dx,dy) {
  if (!Number.isFinite(dx)||!Number.isFinite(dy)||Math.abs(dx)<55||Math.abs(dx)<=Math.abs(dy)*1.5) return 0;
  return dx<0?1:-1;
}
