/**
 * What a like/dislike count becomes when one person sets their reaction. The server is the source of truth;
 * this lets the screen answer instantly. Both counts stay whole numbers of zero or more, and they are kept
 * apart: a dislike never makes a like count go negative, it only moves a count that really was there.
 */
const whole = (n) => (Number.isFinite(n) && n > 0 ? Math.floor(n) : 0);

export function applyReaction({ likes = 0, dislikes = 0, myReaction = null } = {}, value = null) {
  let l = whole(likes);
  let d = whole(dislikes);
  if (value === myReaction) return { likes: l, dislikes: d, myReaction };
  if (myReaction === 'like') l = Math.max(0, l - 1);
  if (myReaction === 'dislike') d = Math.max(0, d - 1);
  if (value === 'like') l += 1;
  if (value === 'dislike') d += 1;
  return { likes: l, dislikes: d, myReaction: value };
}
