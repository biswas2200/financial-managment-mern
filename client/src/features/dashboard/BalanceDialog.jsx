import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import clsx from 'clsx';
import { setBalanceFormSchema } from '@kosha/shared';
import { Check, Landmark, Loader, PenLine } from 'lucide-react';
import { useDemoBanks, useFetchDemoBank, useSetBalance } from '../../api/hooks.js';
import { Button, Dialog, Field, Input, Segmented } from '../../components/ui/primitives.jsx';
import { Dropdown } from '../../components/ui/Dropdown.jsx';
import { useToast } from '../../components/ui/toast.jsx';
import { prefersReducedMotion } from '../../lib/motion.js';
import { money } from '../../lib/format.js';

const STEPS = ['Connecting securely', 'Asking for your balance', 'Balance received'];

function ManualForm({ current, onClose }) {
  const setBalance = useSetBalance();
  const toast = useToast();
  const { register, handleSubmit, formState } = useForm({ resolver: zodResolver(setBalanceFormSchema), defaultValues: { balance: '' } });

  return (
    <form
      noValidate
      className="flex flex-col gap-4"
      onSubmit={handleSubmit((values) =>
        setBalance.mutate(values, {
          onSuccess: (r) => {
            toast.success(`Balance set to ${money(r.balance)}`);
            onClose();
          },
          onError: (e) => toast.error(e.message),
        }),
      )}
    >
      <p className="text-sm text-ink-2">
        Kosha currently shows <span className="font-semibold text-ink tabular">{money(current)}</span>, worked out from what you have recorded. If your real
        balance is different, type it here. Your transactions stay as they are.
      </p>
      <Field
        label="What's in your accounts right now? (₹)"
        error={formState.errors.balance?.message}
        hint="Add up your bank accounts and cash. Use a minus sign if you're overdrawn, like -2,500."
      >
        {(a11y) => <Input {...a11y} {...register('balance')} inputMode="text" autoComplete="off" placeholder="e.g. 25,000" className="tabular" autoFocus />}
      </Field>
      <div className="flex justify-end gap-2">
        <Button variant="ghost" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit" loading={setBalance.isPending}>
          Save balance
        </Button>
      </div>
    </form>
  );
}

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function BankFetch({ onClose }) {
  const { data: banks = [] } = useDemoBanks();
  const fetchBank = useFetchDemoBank();
  const setBalance = useSetBalance();
  const toast = useToast();
  const [bankId, setBankId] = useState('');
  const [phase, setPhase] = useState('idle'); // idle | fetching | done
  const [step, setStep] = useState(0);
  const [result, setResult] = useState(null);
  const alive = useRef(true);
  // Set on mount too: React's dev StrictMode runs the cleanup once straight after the first mount.
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  const chosen = bankId || banks[0]?.id || '';

  const run = async () => {
    setPhase('fetching');
    setStep(0);
    const pause = prefersReducedMotion() ? 0 : 650;
    const ticker = (async () => {
      await wait(pause);
      if (alive.current) setStep(1);
      await wait(pause);
    })();
    try {
      const [data] = await Promise.all([fetchBank.mutateAsync(chosen), ticker]);
      if (!alive.current) return;
      setStep(2);
      setResult(data);
      setPhase('done');
    } catch (e) {
      if (!alive.current) return;
      toast.error(e.message);
      setPhase('idle');
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-start gap-3 rounded-xl bg-warn/16 px-4 py-3 text-sm text-ink">
        <span className="mt-0.5 rounded-md bg-warn/30 px-1.5 py-0.5 text-[0.6875rem] font-bold tracking-wide text-warn-text uppercase">Demo only</span>
        <p>No real bank is connected. These are sample accounts with made-up figures, to show how fetching a balance would work.</p>
      </div>

      {phase !== 'done' && (
        <>
          <Field label="Bank">
            {(a11y) => (
              <Dropdown
                {...a11y}
                value={chosen}
                onChange={setBankId}
                disabled={phase === 'fetching'}
                options={banks.map((b) => ({ value: b.id, label: b.name, hint: b.account, icon: <Landmark size={16} aria-hidden className="text-ink-3" /> }))}
                placeholder="Choose a bank"
              />
            )}
          </Field>

          {phase === 'fetching' && (
            <ol className="flex flex-col gap-2 rounded-xl bg-surface-2 p-4 text-sm" aria-live="polite">
              {STEPS.slice(0, 2).map((label, i) => (
                <li key={label} className={clsx('flex items-center gap-2.5 transition-opacity duration-300', i > step && 'opacity-35')}>
                  {i < step ? <Check size={16} className="pop-in text-good-text" aria-hidden /> : i === step ? <Loader size={16} className="animate-spin text-brand" aria-hidden /> : <span className="h-4 w-4" />}
                  {label}
                </li>
              ))}
            </ol>
          )}

          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={run} loading={phase === 'fetching'} disabled={!chosen}>
              Fetch balance
            </Button>
          </div>
        </>
      )}

      {phase === 'done' && result && (
        <div className="page-in flex flex-col gap-4">
          <div className="rounded-xl bg-note p-5 text-ink ring-1 ring-note-line/20">
            <p className="flex items-center gap-2 text-sm font-medium text-ink-2">
              <Check size={16} className="pop-in text-good-text" aria-hidden />
              {result.bank.name}, {result.bank.account}
            </p>
            <p data-testid="fetched-balance" className="mt-1 font-condensed text-[2.5rem] leading-tight font-semibold tabular">
              {money(result.balance)}
            </p>
            <p className="text-[0.8125rem] text-ink-2">Sample data, fetched just now. Nothing was read from a real account.</p>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setPhase('idle')}>
              Fetch again
            </Button>
            <Button
              loading={setBalance.isPending}
              onClick={() =>
                setBalance.mutate(
                  { balance: result.balance },
                  {
                    onSuccess: (r) => {
                      toast.success(`Balance set to ${money(r.balance)}`);
                      onClose();
                    },
                    onError: (e) => toast.error(e.message),
                  },
                )
              }
            >
              Use this balance
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function Body({ current, initialTab, onClose }) {
  const [tab, setTab] = useState(initialTab);
  return (
    <div className="flex flex-col gap-5">
      <Segmented
        label="How to update your balance"
        value={tab}
        onChange={setTab}
        className="self-start"
        options={[
          { value: 'manual', label: 'Enter it myself', icon: <PenLine size={15} aria-hidden /> },
          { value: 'bank', label: 'Fetch from bank (demo)', icon: <Landmark size={15} aria-hidden /> },
        ]}
      />
      {tab === 'manual' ? <ManualForm current={current} onClose={onClose} /> : <BankFetch onClose={onClose} />}
    </div>
  );
}

/** Set the balance Kosha shows: type what you have, or fetch a sample figure from a demo bank. */
export function BalanceDialog({ open, onClose, current = 0, initialTab = 'manual' }) {
  return (
    <Dialog open={open} onClose={onClose} title="Update your balance" description="Kosha adds your income and spending to the figure you give it.">
      <Body key={initialTab} current={current} initialTab={initialTab} onClose={onClose} />
    </Dialog>
  );
}
