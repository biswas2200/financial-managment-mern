import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CopilotProvider, CopilotLauncher, useCopilot } from './CopilotDrawer.jsx';

vi.mock('./CopilotChat.jsx', () => ({
  CopilotChat: ({ initialPrompt, onPromptConsumed }) => (
    <div data-testid="chat" data-prompt={initialPrompt ?? ''}>
      <button type="button" onClick={onPromptConsumed}>
        consume
      </button>
    </div>
  ),
}));

function AskButton({ prompt }) {
  const { open } = useCopilot();
  return (
    <button type="button" onClick={() => open(prompt)}>
      Ask about this
    </button>
  );
}

const renderApp = (prompt) =>
  render(
    <CopilotProvider>
      <CopilotLauncher />
      <AskButton prompt={prompt} />
    </CopilotProvider>,
  );

describe('Copilot drawer', () => {
  it('opens from the floating button as a dialog named Copilot', async () => {
    renderApp();
    expect(screen.queryByRole('dialog', { name: 'Copilot' })).not.toBeInTheDocument();
    await userEvent.setup().click(screen.getByRole('button', { name: 'Ask Copilot' }));
    expect(screen.getByRole('dialog', { name: 'Copilot' })).toBeInTheDocument();
    expect(screen.getByTestId('chat').dataset.prompt).toBe('');
  });

  it('opens with a question already filled in when a page asks Copilot about something', async () => {
    renderApp('Explain the P/E ratio of RELIANCE');
    await userEvent.setup().click(screen.getByRole('button', { name: 'Ask about this' }));
    expect(screen.getByRole('dialog', { name: 'Copilot' })).toBeInTheDocument();
    expect(screen.getByTestId('chat').dataset.prompt).toBe('Explain the P/E ratio of RELIANCE');
  });

  it('forgets the question once Copilot has taken it, so it is not asked twice', async () => {
    renderApp('Explain SIPs');
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: 'Ask about this' }));
    await user.click(screen.getByRole('button', { name: 'consume' }));
    expect(screen.getByTestId('chat').dataset.prompt).toBe('');
  });

  it('closes with the close button and on Escape, and brings the launcher back', async () => {
    renderApp();
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: 'Ask Copilot' }));
    expect(screen.queryByRole('button', { name: 'Ask Copilot' })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Close Copilot' }));
    expect(screen.queryByRole('dialog', { name: 'Copilot' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Ask Copilot' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Ask Copilot' }));
    fireEvent(screen.getByRole('dialog', { name: 'Copilot' }), new Event('cancel', { cancelable: true }));
    expect(screen.queryByRole('dialog', { name: 'Copilot' })).not.toBeInTheDocument();
  });

  it('gives focus back to the button that opened it, when it closes', async () => {
    renderApp();
    const user = userEvent.setup();
    const asker = screen.getByRole('button', { name: 'Ask about this' });
    await user.click(asker);
    await user.click(screen.getByRole('button', { name: 'Close Copilot' }));
    expect(asker).toHaveFocus();
  });

  it('does nothing harmful when used outside a provider', async () => {
    function Lonely() {
      const { open } = useCopilot();
      return <button onClick={() => open('x')}>go</button>;
    }
    render(<Lonely />);
    await userEvent.setup().click(screen.getByRole('button', { name: 'go' }));
    expect(screen.getByRole('button', { name: 'go' })).toBeInTheDocument();
  });
});
