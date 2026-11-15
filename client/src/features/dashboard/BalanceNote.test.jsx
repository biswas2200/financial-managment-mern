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

  describe('when the balance is below zero', () => {
    const renderNegative = (props = {}) => {
      window.matchMedia = vi.fn().mockReturnValue({ matches: true, addEventListener() {}, removeEventListener() {} });
      return render(<BalanceNote balance={-38226400} net={-7800000} monthLabel="November" onUpdate={() => {}} {...props} />);
    };

    it('shows the minus sign and says why, in plain words', () => {
      renderNegative();
      const note = screen.getByLabelText('Balance');
      expect(note).toHaveTextContent('-₹3,82,264');
      expect(screen.getByText(/below zero/i)).toBeInTheDocument();
      expect(screen.getByText(/spending you have recorded is more than the income/i)).toBeInTheDocument();
    });

    it('offers the two ways out: type the real balance, or fetch it from a bank', async () => {
      const onUpdate = vi.fn();
      renderNegative({ onUpdate });
      fireEvent.click(screen.getByRole('button', { name: 'Set my balance' }));
      expect(onUpdate).toHaveBeenLastCalledWith('manual');
      fireEvent.click(screen.getByRole('button', { name: /fetch from bank/i }));
      expect(onUpdate).toHaveBeenLastCalledWith('bank');
    });
  });

  it('a positive balance stays calm, with a small way to correct it', () => {
    window.matchMedia = vi.fn().mockReturnValue({ matches: true, addEventListener() {}, removeEventListener() {} });
    const onUpdate = vi.fn();
    render(<BalanceNote balance={4840050} net={1000000} monthLabel="November" onUpdate={onUpdate} />);
    expect(screen.queryByText(/below zero/i)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Update balance' }));
    expect(onUpdate).toHaveBeenCalledWith('manual');
  });

  it('describes a starting balance when one was set', () => {
    window.matchMedia = vi.fn().mockReturnValue({ matches: true, addEventListener() {}, removeEventListener() {} });
    render(<BalanceNote balance={4840050} net={1000000} openingBalance={2500000} monthLabel="November" onUpdate={() => {}} />);
    expect(screen.getByText(/includes the starting balance you set/i)).toBeInTheDocument();
  });
});
