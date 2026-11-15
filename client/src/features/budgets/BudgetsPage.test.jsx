import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { ThemeProvider } from '../../app/theme.jsx';
import { ToastProvider } from '../../components/ui/toast.jsx';
import BudgetsPage from './BudgetsPage.jsx';

const saveBudget = vi.fn();
const saveCategory = vi.fn();

const CATS = [
  { id: 'c1', name: 'Groceries', type: 'expense', icon: 'shopping-basket', color: '#eb6834' },
  { id: 'c2', name: 'Travel', type: 'expense', icon: 'plane', color: '#1baf7a' },
  { id: 'c3', name: 'Education', type: 'expense', icon: 'graduation-cap', color: '#eb6834' },
];

vi.mock('../../api/hooks.js', () => ({
  useBudgets: () => ({
    isLoading: false,
    data: {
      items: [
        {
          id: 'b1',
          category: CATS[0],
          limit: 600000,
          spent: 250000,
          remaining: 350000,
          percentUsed: 42,
          status: 'ok',
          transactionCount: 4,
        },
      ],
      totals: { limit: 600000, spent: 250000, remaining: 350000 },
    },
  }),
  useCategories: () => ({ data: CATS }),
  useSaveBudget: () => ({ mutateAsync: saveBudget, isPending: false }),
  useDeleteBudget: () => ({ mutate: vi.fn() }),
  useCopyBudgets: () => ({ mutate: vi.fn(), isPending: false }),
  useSaveCategory: () => ({ mutate: saveCategory, isPending: false }),
}));

function renderPage() {
  return render(
    <MemoryRouter>
      <ThemeProvider>
        <ToastProvider>
          <BudgetsPage />
        </ToastProvider>
      </ThemeProvider>
    </MemoryRouter>,
  );
}

async function openAddBudget(user) {
  await user.click(screen.getAllByRole('button', { name: /^Add budget$/ })[0]);
  return screen.getByRole('dialog', { name: 'Add a budget' });
}

describe('Add a budget', () => {
  beforeEach(() => {
    saveBudget.mockReset().mockResolvedValue({});
    saveCategory.mockReset();
  });

  it('lists every expense category, not only the ones without a budget, and marks the budgeted ones', async () => {
    const user = userEvent.setup();
    renderPage();
    const dialog = await openAddBudget(user);
    await user.click(within(dialog).getByRole('combobox', { name: 'Category' }));
    const list = screen.getByRole('listbox');
    expect(within(list).getAllByRole('option').map((o) => o.textContent)).toEqual(
      expect.arrayContaining(['GroceriesBudget set', 'Travel', 'Education', 'New category…']),
    );
  });

  it('saves a limit for the chosen category', async () => {
    const user = userEvent.setup();
    renderPage();
    const dialog = await openAddBudget(user);
    await user.click(within(dialog).getByRole('combobox', { name: 'Category' }));
    await user.click(screen.getByRole('option', { name: /Travel/ }));
    await user.type(within(dialog).getByLabelText(/Monthly limit/), '8000');
    await user.click(within(dialog).getByRole('button', { name: 'Save budget' }));
    await vi.waitFor(() => expect(saveBudget).toHaveBeenCalled());
    expect(saveBudget.mock.calls[0][0]).toMatchObject({ category: 'c2', limit: 800000 });
  });

  it('can start a brand-new category with its own icon, and picks it for the budget', async () => {
    const user = userEvent.setup();
    saveCategory.mockImplementation((vars, opts) =>
      opts.onSuccess({ id: 'c9', name: vars.name, type: vars.type, icon: vars.icon, color: vars.color }),
    );
    renderPage();
    const dialog = await openAddBudget(user);
    await user.click(within(dialog).getByRole('combobox', { name: 'Category' }));
    await user.click(screen.getByRole('option', { name: 'New category…' }));

    const newDialog = await screen.findByRole('dialog', { name: 'New category' });
    // An expense budget can only use an expense category, so the type is not asked again.
    expect(within(newDialog).queryByLabelText('Type')).not.toBeInTheDocument();
    expect(within(newDialog).getAllByRole('button', { name: /^Icon / }).length).toBeGreaterThanOrEqual(50);

    await user.type(within(newDialog).getByLabelText('Name'), 'Pets');
    await user.click(within(newDialog).getByRole('button', { name: 'Icon paw-print' }));
    await user.click(within(newDialog).getByRole('button', { name: 'Add category' }));

    expect(saveCategory.mock.calls[0][0]).toMatchObject({ name: 'Pets', type: 'expense', icon: 'paw-print' });
    expect(within(dialog).getByRole('combobox', { name: 'Category' })).toHaveTextContent('Pets');
  });

  it('offers a "New category" shortcut next to the categories without a budget', async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(screen.getByRole('button', { name: /new category/i }));
    expect(await screen.findByRole('dialog', { name: 'New category' })).toBeInTheDocument();
  });
});
