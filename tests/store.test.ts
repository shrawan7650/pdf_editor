import { describe, it, expect } from 'vitest';
import { useStore, DEFAULT_STYLE } from '../lib/store';
import { at } from '../lib/export';
const mk = (id: string) => ({ id, page: 0, type: 'rect' as const, x: 0, y: 0, w: 10, h: 10, rotation: 0, style: DEFAULT_STYLE });
describe('history', () => {
  it('undo/redo', () => {
    useStore.getState().add(mk('a')); useStore.getState().add(mk('b'));
    useStore.getState().undo(); expect(useStore.getState().anns.length).toBe(1);
    useStore.getState().redo(); expect(useStore.getState().anns.length).toBe(2);
    useStore.getState().add(mk('c')); useStore.getState().redo(); expect(useStore.getState().anns.length).toBe(3);
  });
  it('coalesces slider edits into one undo step', () => {
    useStore.getState().update('a', { rotation: 5 }, 'k'); useStore.getState().update('a', { rotation: 9 }, 'k');
    const n = useStore.getState().past.length; useStore.getState().undo();
    expect(useStore.getState().past.length).toBe(n - 1);
  });
});
describe('geometry', () => {
  it('maps top-left box to PDF space', () => expect(at({ ...mk('x'), x: 10, y: 20 }, 100, 0, 0)).toEqual({ x: 10, y: 70 }));
  it('rotates 90deg clockwise about centre', () => { const p = at({ ...mk('x'), rotation: 90 }, 100, 0, 0); expect(p.x).toBeCloseTo(0); expect(p.y).toBeCloseTo(100); });
});
