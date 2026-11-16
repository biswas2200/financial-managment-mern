import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent, screen } from '@testing-library/react';
import { useHotkeys } from './useHotkeys.js';

function Harness({ map }) {
  useHotkeys(map);
  return (
    <div>
      <input aria-label="search" />
      <textarea aria-label="notes" />
    </div>
  );
}

describe('useHotkeys', () => {
  it('runs the handler for a single-key shortcut', () => {
    const onNew = vi.fn();
    render(<Harness map={{ n: onNew }} />);
    fireEvent.keyDown(document.body, { key: 'n' });
    expect(onNew).toHaveBeenCalledTimes(1);
  });

  it('does nothing while a modal dialog is open, so typing n in an article does not add an expense over it', () => {
    const onNew = vi.fn();
    render(<Harness map={{ n: onNew }} />);
    const dialog = document.createElement('dialog');
    dialog.setAttribute('open', '');
    document.body.append(dialog);
    fireEvent.keyDown(document.body, { key: 'n' });
    fireEvent.keyDown(dialog, { key: 'n' });
    expect(onNew).not.toHaveBeenCalled();
    dialog.remove();
    fireEvent.keyDown(document.body, { key: 'n' });
    expect(onNew).toHaveBeenCalledTimes(1);
  });

  it('ignores keys typed into fields', () => {
    const onNew = vi.fn();
    render(<Harness map={{ n: onNew }} />);
    fireEvent.keyDown(screen.getByLabelText('search'), { key: 'n' });
    fireEvent.keyDown(screen.getByLabelText('notes'), { key: 'n' });
    expect(onNew).not.toHaveBeenCalled();
  });

  it('ignores browser shortcuts with modifier keys', () => {
    const onNew = vi.fn();
    render(<Harness map={{ n: onNew }} />);
    fireEvent.keyDown(document.body, { key: 'n', ctrlKey: true });
    fireEvent.keyDown(document.body, { key: 'n', metaKey: true });
    expect(onNew).not.toHaveBeenCalled();
  });

  it('supports symbol keys like / and ?', () => {
    const onSearch = vi.fn();
    const onHelp = vi.fn();
    render(<Harness map={{ '/': onSearch, '?': onHelp }} />);
    fireEvent.keyDown(document.body, { key: '/' });
    fireEvent.keyDown(document.body, { key: '?', shiftKey: true });
    expect(onSearch).toHaveBeenCalledTimes(1);
    expect(onHelp).toHaveBeenCalledTimes(1);
  });
});
