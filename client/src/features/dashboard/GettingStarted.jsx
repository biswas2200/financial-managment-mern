import { Link } from 'react-router-dom';
import clsx from 'clsx';
import { Check } from 'lucide-react';
import { Button } from '../../components/ui/primitives.jsx';
import { buildOnboardingSteps } from './onboarding.js';

/**
 * "Get started" checklist for new accounts. Each step ticks itself off from real data,
 * and the card disappears once all four are done (or the user hides it).
 */
export function GettingStarted({ counts, onAddIncome, onAddExpense, onDismiss }) {
  const { steps, doneCount, total, complete } = buildOnboardingSteps(counts);
  if (complete) return null;

  const action = (id) => {
    const cls = 'shrink-0';
    if (id === 'income') return <Button size="sm" variant="secondary" className={cls} onClick={onAddIncome}>Add income</Button>;
    if (id === 'expense') return <Button size="sm" className={cls} onClick={onAddExpense}>Add an expense</Button>;
    const to = id === 'budget' ? '/budgets' : '/copilot';
    const text = id === 'budget' ? 'Set a budget' : 'Ask Copilot';
    return (
      <Link
        to={to}
        className="inline-flex h-8 shrink-0 items-center rounded-lg bg-surface px-3 text-sm font-semibold ring-1 ring-line-strong ring-inset hover:bg-surface-2"
      >
        {text}
      </Link>
    );
  };

  return (
    <section aria-labelledby="getting-started" className="mb-5 rounded-[22px] bg-surface p-5 ring-1 ring-line sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 id="getting-started" className="font-wide text-lg font-semibold">
            Get started with Kosha
          </h2>
          <p className="mt-0.5 text-sm text-ink-2">Four quick steps and your dashboard comes to life.</p>
        </div>
        <Button variant="ghost" size="sm" onClick={onDismiss}>
          Hide for now
        </Button>
      </div>

      <div className="mt-4 flex items-center gap-3">
        <div
          role="progressbar"
          aria-label="Setup progress"
          aria-valuemin={0}
          aria-valuemax={total}
          aria-valuenow={doneCount}
          className="h-2 flex-1 overflow-hidden rounded-full bg-surface-2"
        >
          <div className="h-full rounded-full bg-income transition-[width] duration-500" style={{ width: `${(doneCount / total) * 100}%` }} />
        </div>
        <span className="text-sm font-medium text-ink-2 tabular">
          {doneCount} of {total} done
        </span>
      </div>

      <ol className="mt-4 grid gap-2.5 md:grid-cols-2">
        {steps.map((step, i) => (
          <li
            key={step.id}
            data-done={step.done}
            className={clsx('flex items-center gap-3 rounded-xl p-3 ring-1', step.done ? 'bg-surface-2/60 ring-transparent' : 'ring-line')}
          >
            <span
              aria-hidden
              className={clsx(
                'flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-sm font-semibold',
                step.done ? 'bg-income text-white' : 'bg-brand-soft text-brand',
              )}
            >
              {step.done ? <Check size={15} strokeWidth={3} /> : i + 1}
            </span>
            <div className="min-w-0 flex-1">
              <p className={clsx('text-[0.9375rem] font-semibold', step.done && 'text-ink-2 line-through decoration-ink-3/60')}>{step.title}</p>
              <p className="text-[0.8125rem] text-ink-2">{step.done ? 'Done' : step.body}</p>
            </div>
            {!step.done && action(step.id)}
          </li>
        ))}
      </ol>
    </section>
  );
}
