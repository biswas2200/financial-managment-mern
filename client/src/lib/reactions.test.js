import { describe, it, expect } from 'vitest';
import { applyReaction } from './reactions.js';

const base = { likes: 3, dislikes: 1, myReaction: null };

describe('applyReaction', () => {
  it('adds a like or a dislike to its own count only', () => {
    expect(applyReaction(base, 'like')).toEqual({ likes: 4, dislikes: 1, myReaction: 'like' });
    expect(applyReaction(base, 'dislike')).toEqual({ likes: 3, dislikes: 2, myReaction: 'dislike' });
  });

  it('moves a reaction when you change your mind', () => {
    expect(applyReaction({ likes: 4, dislikes: 1, myReaction: 'like' }, 'dislike')).toEqual({ likes: 3, dislikes: 2, myReaction: 'dislike' });
    expect(applyReaction({ likes: 3, dislikes: 2, myReaction: 'dislike' }, 'like')).toEqual({ likes: 4, dislikes: 1, myReaction: 'like' });
  });

  it('takes a reaction back with null', () => {
    expect(applyReaction({ likes: 4, dislikes: 1, myReaction: 'like' }, null)).toEqual({ likes: 3, dislikes: 1, myReaction: null });
    expect(applyReaction({ likes: 3, dislikes: 2, myReaction: 'dislike' }, null)).toEqual({ likes: 3, dislikes: 1, myReaction: null });
  });

  it('does nothing when the reaction is already set', () => {
    const liked = { likes: 4, dislikes: 1, myReaction: 'like' };
    expect(applyReaction(liked, 'like')).toEqual(liked);
    expect(applyReaction(base, null)).toEqual(base);
  });

  it('never lets either count go below zero, even from inconsistent data', () => {
    expect(applyReaction({ likes: 0, dislikes: 0, myReaction: 'like' }, 'dislike')).toEqual({ likes: 0, dislikes: 1, myReaction: 'dislike' });
    expect(applyReaction({ likes: 0, dislikes: 0, myReaction: 'dislike' }, null)).toEqual({ likes: 0, dislikes: 0, myReaction: null });
    expect(applyReaction({ likes: -4, dislikes: -2, myReaction: null }, 'like')).toEqual({ likes: 1, dislikes: 0, myReaction: 'like' });
  });

  it('survives any sequence of clicks with both counts as whole numbers of zero or more', () => {
    let state = { likes: 0, dislikes: 0, myReaction: null };
    for (const value of ['like', 'dislike', null, 'like', 'like', null, null, 'dislike', 'like', null]) {
      state = applyReaction(state, value);
      expect(Number.isInteger(state.likes) && state.likes >= 0).toBe(true);
      expect(Number.isInteger(state.dislikes) && state.dislikes >= 0).toBe(true);
    }
  });
});
