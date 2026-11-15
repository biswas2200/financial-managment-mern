/**
 * First-run checklist. Each step is "done" when the user's own data shows it,
 * so the list updates itself as people use the app.
 */
export function buildOnboardingSteps({ incomeCount = 0, expenseCount = 0, budgetCount = 0, chatCount = 0 } = {}) {
  const steps = [
    { id: 'income', title: 'Add your income', body: 'Log your salary or any money you receive.', done: incomeCount > 0 },
    { id: 'expense', title: 'Log an expense', body: 'Record something you spent today. It takes a few seconds.', done: expenseCount > 0 },
    { id: 'budget', title: 'Set a monthly budget', body: 'Give your biggest category a spending limit.', done: budgetCount > 0 },
    { id: 'copilot', title: 'Ask Copilot a question', body: 'Try "Where is my money going?"', done: chatCount > 0 },
  ];
  const doneCount = steps.filter((s) => s.done).length;
  return { steps, doneCount, total: steps.length, complete: doneCount === steps.length };
}
