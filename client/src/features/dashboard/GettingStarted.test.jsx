import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { buildOnboardingSteps } from './onboarding.js';
import { GettingStarted } from './GettingStarted.jsx';

describe('buildOnboardingSteps', () => {
  it('marks each step done from the user’s data', () => {
    const r = buildOnboardingSteps({ incomeCount: 1, expenseCount: 0, budgetCount: 0, chatCount: 3 });
    expect(r.steps.map((s) => [s.id, s.done])).toEqual([
      ['income', true],
      ['expense', false],
      ['budget', false],
      ['copilot', true],
    ]);
    expect(r).toMatchObject({ doneCount: 2, total: 4, complete: false });
  });

  it('is complete when every step is done', () => {
    expect(buildOnboardingSteps({ incomeCount: 2, expenseCount: 9, budgetCount: 1, chatCount: 1 }).complete).toBe(true);
  });
});

function setup(counts) {
  const props = { onAddIncome: vi.fn(), onAddExpense: vi.fn(), onDismiss: vi.fn() };
  render(
    <MemoryRouter>
      <GettingStarted counts={counts} {...props} />
    </MemoryRouter>,
  );
  return { ...props, u: userEvent.setup() };
}

describe('GettingStarted', () => {
  it('shows progress and the next actions for a new account', () => {
    setup({ incomeCount: 0, expenseCount: 0, budgetCount: 0, chatCount: 0 });
    expect(screen.getByRole('heading', { name: /get started/i })).toBeInTheDocument();
    expect(screen.getByText(/0 of 4 done/i)).toBeInTheDocument();
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '0');
    expect(screen.getByRole('link', { name: /set a budget/i })).toHaveAttribute('href', '/budgets');
    expect(screen.getByRole('link', { name: /ask copilot/i })).toHaveAttribute('href', '/copilot');
  });

  it('opens the right form from each step', async () => {
    const { u, onAddIncome, onAddExpense } = setup({ incomeCount: 0, expenseCount: 0, budgetCount: 0, chatCount: 0 });
    await u.click(screen.getByRole('button', { name: /add income/i }));
    await u.click(screen.getByRole('button', { name: /add an expense/i }));
    expect(onAddIncome).toHaveBeenCalledTimes(1);
    expect(onAddExpense).toHaveBeenCalledTimes(1);
  });

  it('ticks off finished steps and hides their buttons', () => {
    setup({ incomeCount: 1, expenseCount: 0, budgetCount: 0, chatCount: 0 });
    expect(screen.getByText(/1 of 4 done/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /add income/i })).not.toBeInTheDocument();
    expect(screen.getByText('Add your income').closest('li')).toHaveAttribute('data-done', 'true');
  });

  it('can be hidden', async () => {
    const { u, onDismiss } = setup({ incomeCount: 1, expenseCount: 0, budgetCount: 0, chatCount: 0 });
    await u.click(screen.getByRole('button', { name: /hide/i }));
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('renders nothing once everything is done', () => {
    const { container } = render(
      <MemoryRouter>
        <GettingStarted counts={{ incomeCount: 1, expenseCount: 1, budgetCount: 1, chatCount: 1 }} onAddIncome={() => {}} onAddExpense={() => {}} onDismiss={() => {}} />
      </MemoryRouter>,
    );
    expect(container).toBeEmptyDOMElement();
  });
});
