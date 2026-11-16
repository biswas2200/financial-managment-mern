import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Reader } from './Reader.jsx';

const renderReader = (props = {}) => {
  const onClose = vi.fn();
  render(
    <Reader open onClose={onClose} title="Build an emergency fund" meta="Saving, 5 min read" {...props}>
      <p>The article text</p>
    </Reader>,
  );
  return onClose;
};

describe('Reader', () => {
  it('is a dialog named by its title, showing the meta line and the content', () => {
    renderReader();
    const dialog = screen.getByRole('dialog', { name: 'Build an emergency fund' });
    expect(dialog).toHaveTextContent('Saving, 5 min read');
    expect(dialog).toHaveTextContent('The article text');
  });

  it('closes from the button, on Escape, and when the blurred backdrop is clicked', async () => {
    const onClose = renderReader();
    await userEvent.setup().click(screen.getByRole('button', { name: 'Close' }));
    expect(onClose).toHaveBeenCalledTimes(1);

    const dialog = screen.getByRole('dialog');
    fireEvent(dialog, new Event('cancel', { cancelable: true }));
    expect(onClose).toHaveBeenCalledTimes(2);

    fireEvent.click(dialog); // a click on the dialog itself is a click on the backdrop
    expect(onClose).toHaveBeenCalledTimes(3);
  });

  it('does not close when you click inside the content', async () => {
    const onClose = renderReader();
    await userEvent.setup().click(screen.getByText('The article text'));
    expect(onClose).not.toHaveBeenCalled();
  });

  it('renders nothing while closed', () => {
    renderReader({ open: false });
    expect(screen.queryByText('The article text')).not.toBeInTheDocument();
  });
});
