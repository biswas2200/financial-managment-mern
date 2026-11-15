import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { BalanceNote } from './BalanceNote.jsx';

describe('BalanceNote', () => {
  it('shows the balance with paise set apart', () => {
    window.matchMedia = vi.fn().mockReturnValue({ matches: true, addEventListener() {}, removeEventListener() {} });
    render(<BalanceNote balance={4840050} net={1000000} monthLabel="November" />);
    expect(screen.getByLabelText('Balance')).toHaveTextContent('₹48,400.50');
  });

  it('tilts towards the pointer like a note held to the light, and settles on leave', () => {
    window.matchMedia = vi.fn().mockReturnValue({ matches: false, addEventListener() {}, removeEventListener() {} });
    render(<BalanceNote balance={100} net={0} monthLabel="November" />);
    const note = screen.getByLabelText('Balance');
    note.getBoundingClientRect = () => ({ left: 0, top: 0, width: 400, height: 200 });
    fireEvent.pointerMove(note, { clientX: 0, clientY: 0, pointerType: 'mouse' });
    expect(note.style.getPropertyValue('--rx')).toMatch(/^[1-9][\d.]*deg$/);
    expect(note.style.getPropertyValue('--ry')).toMatch(/^-[1-9][\d.]*deg$/);
    fireEvent.pointerLeave(note);
    expect(note.style.getPropertyValue('--rx')).toBe('0deg');
  });
});
