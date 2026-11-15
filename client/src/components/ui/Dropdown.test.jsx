import { describe, it, expect, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { Dropdown } from './Dropdown.jsx';

const OPTIONS = [
  { value: 'groceries', label: 'Groceries', hint: 'Budget set' },
  { value: 'travel', label: 'Travel' },
  { value: 'gifts', label: 'Gifts', disabled: true },
  { value: 'health', label: 'Health' },
];

function Harness({ initial = '', onChange = () => {}, footer, ...props }) {
  const [value, setValue] = useState(initial);
  return (
    <>
      <label htmlFor="cat">Category</label>
      <Dropdown
        id="cat"
        value={value}
        onChange={(v) => {
          setValue(v);
          onChange(v);
        }}
        placeholder="Select a category"
        footer={footer}
        options={OPTIONS}
        {...props}
      />
      <button type="button">elsewhere</button>
    </>
  );
}

const trigger = () => screen.getByRole('combobox', { name: 'Category' });

describe('Dropdown', () => {
  it('shows the placeholder, then the chosen label', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    expect(trigger()).toHaveTextContent('Select a category');
    expect(trigger()).toHaveAttribute('aria-haspopup', 'listbox');
    expect(trigger()).toHaveAttribute('aria-expanded', 'false');
    await user.click(trigger());
    await user.click(screen.getByRole('option', { name: /Travel/ }));
    expect(trigger()).toHaveTextContent('Travel');
  });

  it('opens a listbox of options with the current one selected', async () => {
    const user = userEvent.setup();
    render(<Harness initial="health" />);
    await user.click(trigger());
    expect(trigger()).toHaveAttribute('aria-expanded', 'true');
    const list = screen.getByRole('listbox');
    const options = within(list).getAllByRole('option');
    expect(options.map((o) => o.textContent)).toEqual(expect.arrayContaining(['Groceries' + 'Budget set', 'Travel', 'Gifts', 'Health']));
    expect(screen.getByRole('option', { name: /Health/ })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('option', { name: /Travel/ })).toHaveAttribute('aria-selected', 'false');
  });

  it('selecting an option reports the value, closes, and keeps focus on the control', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Harness onChange={onChange} />);
    await user.click(trigger());
    await user.click(screen.getByRole('option', { name: /Groceries/ }));
    expect(onChange).toHaveBeenCalledWith('groceries');
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    expect(trigger()).toHaveFocus();
  });

  it('works from the keyboard: arrows move, Enter chooses, disabled options are skipped', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Harness onChange={onChange} />);
    trigger().focus();
    await user.keyboard('{ArrowDown}'); // opens on the first option
    expect(screen.getByRole('listbox')).toBeInTheDocument();
    expect(trigger().getAttribute('aria-activedescendant')).toBe(screen.getByRole('option', { name: /Groceries/ }).id);
    await user.keyboard('{ArrowDown}{ArrowDown}'); // Travel, then past the disabled Gifts to Health
    expect(trigger().getAttribute('aria-activedescendant')).toBe(screen.getByRole('option', { name: /Health/ }).id);
    await user.keyboard('{Enter}');
    expect(onChange).toHaveBeenCalledWith('health');
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('Home and End jump to the ends, and Escape closes without changing anything', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Harness initial="travel" onChange={onChange} />);
    trigger().focus();
    await user.keyboard('{Enter}{End}');
    expect(trigger().getAttribute('aria-activedescendant')).toBe(screen.getByRole('option', { name: /Health/ }).id);
    await user.keyboard('{Home}');
    expect(trigger().getAttribute('aria-activedescendant')).toBe(screen.getByRole('option', { name: /Groceries/ }).id);
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    expect(onChange).not.toHaveBeenCalled();
  });

  it('typing a letter jumps to the option that starts with it', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    trigger().focus();
    await user.keyboard('{Enter}h');
    expect(trigger().getAttribute('aria-activedescendant')).toBe(screen.getByRole('option', { name: /Health/ }).id);
  });

  it('does not choose a disabled option', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Harness onChange={onChange} />);
    await user.click(trigger());
    await user.click(screen.getByRole('option', { name: /Gifts/ }));
    expect(onChange).not.toHaveBeenCalled();
    expect(screen.getByRole('listbox')).toBeInTheDocument();
  });

  it('closes when you click somewhere else', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.click(trigger());
    await user.click(screen.getByRole('button', { name: 'elsewhere' }));
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('can end with an action such as "New category", which is not a value', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    const onChange = vi.fn();
    render(<Harness onChange={onChange} footer={{ label: 'New category…', onSelect }} />);
    await user.click(trigger());
    await user.click(screen.getByRole('option', { name: 'New category…' }));
    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onChange).not.toHaveBeenCalled();
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('stays shut when disabled', async () => {
    const user = userEvent.setup();
    render(<Harness disabled />);
    await user.click(trigger());
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    expect(trigger()).toBeDisabled();
  });

  it('shows an icon next to each option', async () => {
    const user = userEvent.setup();
    render(<Harness options={[{ value: 'a', label: 'Alpha', icon: <svg data-testid="icon-a" /> }]} />);
    await user.click(trigger());
    expect(within(screen.getByRole('listbox')).getByTestId('icon-a')).toBeInTheDocument();
  });
});
