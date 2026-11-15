import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { DobInput } from './DobInput.jsx';

function Harness({ initial = '', onValue = () => {} }) {
  const [value, setValue] = useState(initial);
  return (
    <DobInput
      id="dob"
      value={value}
      onChange={(v) => {
        setValue(v);
        onValue(v);
      }}
    />
  );
}

const day = () => screen.getByLabelText('Date of birth, day');
const month = () => screen.getByLabelText('Date of birth, month');
const year = () => screen.getByLabelText('Date of birth, year');

describe('DobInput', () => {
  it('moves on by itself after two digits, so a date is typed in one go', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.click(day());
    await user.keyboard('0904');
    expect(day()).toHaveValue('09');
    expect(month()).toHaveValue('04');
    expect(year()).toHaveFocus();
    await user.keyboard('2001');
    expect(year()).toHaveValue('2001');
  });

  it('reports a YYYY-MM-DD value once the date is complete', async () => {
    const user = userEvent.setup();
    const onValue = vi.fn();
    render(<Harness onValue={onValue} />);
    await user.click(day());
    await user.keyboard('09042001');
    expect(onValue).toHaveBeenLastCalledWith('2001-04-09');
  });

  it('shows the age as a small badge when the date is valid', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.click(day());
    await user.keyboard('0101');
    const thisYear = new Date().getFullYear();
    await user.keyboard(String(thisYear - 30));
    expect(await screen.findByText(/You're 2[89]|You're 30/)).toBeInTheDocument();
  });

  it('is empty when nothing is typed, and keeps a half-typed date visible as an invalid value', async () => {
    const user = userEvent.setup();
    const onValue = vi.fn();
    render(<Harness onValue={onValue} />);
    await user.click(day());
    await user.keyboard('12');
    // Not empty and not a real date, so the form can say "Enter a valid date of birth".
    expect(onValue).toHaveBeenLastCalledWith(expect.not.stringMatching(/^(\d{4}-\d{2}-\d{2})?$/));
    await user.clear(day());
    expect(onValue).toHaveBeenLastCalledWith('');
  });

  it('fills the three boxes from an existing value', () => {
    render(<Harness initial="1999-04-02" />);
    expect(day()).toHaveValue('02');
    expect(month()).toHaveValue('04');
    expect(year()).toHaveValue('1999');
  });

  it('Backspace in an empty box goes back to the one before', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.click(month());
    await user.keyboard('{Backspace}');
    expect(day()).toHaveFocus();
  });

  it('ignores anything that is not a digit', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.click(day());
    await user.keyboard('a1b2');
    expect(day()).toHaveValue('12');
  });
});
