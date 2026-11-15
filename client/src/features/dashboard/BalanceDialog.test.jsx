import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider } from '../../app/theme.jsx';
import { ToastProvider } from '../../components/ui/toast.jsx';
import { BalanceDialog } from './BalanceDialog.jsx';

const setBalance = vi.fn();
const fetchBank = vi.fn();

vi.mock('../../api/hooks.js', () => ({
  useSetBalance: () => ({ mutate: setBalance, isPending: false }),
  useDemoBanks: () => ({
    data: [
      { id: 'sample-savings', name: 'Sample Bank', account: 'Savings, ending 4821' },
      { id: 'sample-salary', name: 'Demo Credit Union', account: 'Salary account, ending 1307' },
    ],
  }),
  useFetchDemoBank: () => ({ mutateAsync: fetchBank, isPending: false }),
}));

function setup(props = {}) {
  const onClose = vi.fn();
  const user = userEvent.setup();
  render(
    <ThemeProvider>
      <ToastProvider>
        <BalanceDialog open onClose={onClose} current={-38226400} {...props} />
      </ToastProvider>
    </ThemeProvider>,
  );
  return { onClose, user, dialog: screen.getByRole('dialog', { name: 'Update your balance' }) };
}

describe('BalanceDialog: type it yourself', () => {
  beforeEach(() => setBalance.mockReset());

  it('saves what you type as paise, and a minus sign means overdrawn', async () => {
    const { user, dialog } = setup();
    await user.type(within(dialog).getByLabelText(/in your accounts/i), '-2,500.50');
    await user.click(within(dialog).getByRole('button', { name: 'Save balance' }));
    expect(setBalance.mock.calls[0][0]).toEqual({ balance: -250050 });
  });

  it('says what is wrong with something that is not an amount', async () => {
    const { user, dialog } = setup();
    await user.type(within(dialog).getByLabelText(/in your accounts/i), 'lots');
    await user.click(within(dialog).getByRole('button', { name: 'Save balance' }));
    expect(await within(dialog).findByText(/valid amount/i)).toBeInTheDocument();
    expect(setBalance).not.toHaveBeenCalled();
  });

  it('tells you what Kosha shows now, so you know what you are correcting', () => {
    const { dialog } = setup();
    expect(within(dialog).getByText(/kosha currently shows/i)).toHaveTextContent('-₹3,82,264');
  });

  it('closes after a save', async () => {
    setBalance.mockImplementation((_vars, opts) => opts.onSuccess({ balance: 500000 }));
    const { user, dialog, onClose } = setup();
    await user.type(within(dialog).getByLabelText(/in your accounts/i), '5000');
    await user.click(within(dialog).getByRole('button', { name: 'Save balance' }));
    expect(onClose).toHaveBeenCalled();
  });
});

describe('BalanceDialog: fetch from a demo bank', () => {
  beforeEach(() => {
    setBalance.mockReset();
    fetchBank.mockReset().mockResolvedValue({
      bank: { id: 'sample-savings', name: 'Sample Bank', account: 'Savings, ending 4821' },
      balance: 12345678,
      fetchedAt: '2026-11-16T08:00:00.000Z',
      simulated: true,
    });
  });

  it('is upfront that no real bank is connected', async () => {
    const { user, dialog } = setup({ initialTab: 'bank' });
    expect(within(dialog).getByText(/demo only/i)).toBeInTheDocument();
    expect(within(dialog).getByText(/no real bank is connected/i)).toBeInTheDocument();
    expect(user).toBeTruthy();
  });

  it('fetches the sample balance for the chosen bank and shows where it came from', async () => {
    const { user, dialog } = setup({ initialTab: 'bank' });
    await user.click(within(dialog).getByRole('combobox', { name: 'Bank' }));
    await user.click(screen.getByRole('option', { name: /Demo Credit Union/ }));
    await user.click(within(dialog).getByRole('button', { name: 'Fetch balance' }));
    expect(fetchBank).toHaveBeenCalledWith('sample-salary');
    expect(await within(dialog).findByText('₹1,23,456.78', {}, { timeout: 4000 })).toBeInTheDocument();
    expect(within(dialog).getByText(/sample data/i)).toBeInTheDocument();
  });

  it('uses the fetched balance only when you say so', async () => {
    const { user, dialog } = setup({ initialTab: 'bank' });
    await user.click(within(dialog).getByRole('button', { name: 'Fetch balance' }));
    await within(dialog).findByText('₹1,23,456.78', {}, { timeout: 4000 });
    expect(setBalance).not.toHaveBeenCalled();
    await user.click(within(dialog).getByRole('button', { name: 'Use this balance' }));
    expect(setBalance.mock.calls[0][0]).toEqual({ balance: 12345678 });
  });
});
