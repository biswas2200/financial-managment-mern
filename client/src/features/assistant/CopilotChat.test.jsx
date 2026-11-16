import { StrictMode } from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ToastProvider } from '../../components/ui/toast.jsx';
import { CopilotChat } from './CopilotChat.jsx';

const send = vi.fn();
let history = [];
let loading = false;

vi.mock('../../api/hooks.js', () => ({
  useAssistantHistory: () => ({ data: history, isLoading: loading }),
  useAssistantStatus: () => ({ data: { provider: 'offline' } }),
  useSendMessage: () => ({ mutate: send, isPending: false }),
  useConfirmAction: () => ({ mutate: vi.fn() }),
  useCancelAction: () => ({ mutate: vi.fn() }),
  useClearHistory: () => ({ mutate: vi.fn(), isPending: false }),
}));

const renderChat = (props) =>
  render(
    <StrictMode>
      <ToastProvider>
        <CopilotChat {...props} />
      </ToastProvider>
    </StrictMode>,
  );

describe('CopilotChat with a question handed in by another page', () => {
  beforeEach(() => {
    send.mockReset();
    history = [];
    loading = false;
  });

  it('sends it once, even when React runs effects twice, and says it has taken it', () => {
    const consumed = vi.fn();
    renderChat({ initialPrompt: 'Explain what an index fund is', onPromptConsumed: consumed });
    expect(send).toHaveBeenCalledTimes(1);
    expect(send.mock.calls[0][0]).toBe('Explain what an index fund is');
    expect(consumed).toHaveBeenCalledTimes(1);
  });

  it('does not send anything when no question was handed in', () => {
    renderChat({});
    expect(send).not.toHaveBeenCalled();
  });

  it('waits for the chat history to load before sending', () => {
    loading = true;
    renderChat({ initialPrompt: 'Hello' });
    expect(send).not.toHaveBeenCalled();
  });

  it('ignores a blank question', () => {
    renderChat({ initialPrompt: '   ' });
    expect(send).not.toHaveBeenCalled();
  });

  it('still shows the normal suggestions on an empty chat', () => {
    renderChat({});
    expect(screen.getByText('Ask about your money')).toBeInTheDocument();
  });
});
