import { forwardRef, useEffect, useMemo, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import clsx from 'clsx';
import { transactionFormSchema, fromMinor, toDayKey, PAYMENT_METHODS } from '@kosha/shared';
import { ArrowDownRight, ArrowUpRight, StickyNote } from 'lucide-react';
import { Button, Field, Input, Segmented, Textarea } from '../../components/ui/primitives.jsx';
import { CategoryIcon } from '../../components/ui/CategoryIcon.jsx';

const PAYMENT_LABELS = { UPI: 'UPI', Card: 'Card', Cash: 'Cash', Bank: 'Bank transfer', Wallet: 'Wallet' };
const today = () => toDayKey(new Date());
const yesterday = () => toDayKey(new Date(Date.now() - 86400000));

function toDefaults(initial, defaultType) {
  if (!initial) {
    return { type: defaultType, amount: '', category: '', description: '', merchant: '', date: today(), paymentMethod: 'UPI', notes: '' };
  }
  return {
    type: initial.type,
    amount: fromMinor(initial.amount),
    category: initial.category?.id ?? initial.category ?? '',
    description: initial.description ?? '',
    merchant: initial.merchant ?? '',
    date: toDayKey(new Date(initial.date)),
    paymentMethod: initial.paymentMethod ?? 'UPI',
    notes: initial.notes ?? '',
  };
}

/** Drop empty optional strings so the API stores nothing rather than "". */
function clean(values) {
  return Object.fromEntries(Object.entries(values).filter(([, v]) => v !== '' && v !== undefined));
}

/** A radio input styled as a pill. The visible label is the accessible name. */
const Chip = forwardRef(function Chip({ checked, children, className, ...input }, ref) {
  return (
    <label
      className={clsx(
        'chip-pick relative inline-flex cursor-pointer items-center gap-2 rounded-full px-3 py-1.5 text-sm font-medium ring-1 transition-[background-color,box-shadow,color] select-none active:scale-95',
        'has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-brand',
        checked ? 'bg-brand-soft text-brand ring-brand/50 shadow-inset' : 'bg-surface text-ink-2 ring-line-strong shadow-[0_1px_0_rgb(21_27_51/0.08),0_2px_5px_-2px_rgb(21_27_51/0.18)] hover:bg-surface-2 hover:text-ink',
        className,
      )}
    >
      <input ref={ref} type="radio" className="sr-only" checked={checked} {...input} />
      {children}
    </label>
  );
});

function GroupError({ message, id }) {
  return message ? (
    <p id={id} className="mt-1.5 text-[0.8125rem] text-bad-text">
      {message}
    </p>
  ) : null;
}

/**
 * Add / edit a transaction with as few decisions as possible:
 * amount, a category chip, and one tap for the day. Everything else is optional.
 */
export function TransactionForm({ categories = [], initialValues, defaultType = 'expense', onSubmit, onCancel, submitting = false, serverErrors }) {
  const editing = Boolean(initialValues);
  const defaults = useMemo(() => toDefaults(initialValues, defaultType), [initialValues, defaultType]);
  const [showNotes, setShowNotes] = useState(Boolean(defaults.notes));
  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    getValues,
    setError,
    formState: { errors },
  } = useForm({ resolver: zodResolver(transactionFormSchema), defaultValues: defaults });

  const type = watch('type');
  const category = watch('category');
  const date = watch('date');
  const paymentMethod = watch('paymentMethod');
  const options = useMemo(() => categories.filter((c) => c.type === type), [categories, type]);

  // Switching expense ↔ income clears a category of the other type.
  useEffect(() => {
    const current = getValues('category');
    if (current && !options.some((c) => c.id === current)) setValue('category', '');
  }, [options, getValues, setValue]);

  useEffect(() => {
    for (const [field, message] of Object.entries(serverErrors ?? {})) setError(field, { message });
  }, [serverErrors, setError]);

  const submit = (values) => {
    const name = categories.find((c) => c.id === values.category)?.name ?? '';
    const description = values.description?.trim() || values.merchant?.trim() || name;
    onSubmit(clean({ ...values, description }));
  };

  return (
    <form noValidate onSubmit={handleSubmit(submit)} className="flex flex-col gap-5">
      <Controller
        control={control}
        name="type"
        render={({ field }) => (
          <Segmented
            label="Transaction type"
            value={field.value}
            onChange={field.onChange}
            className="self-start"
            options={[
              { value: 'expense', label: 'Expense', icon: <ArrowDownRight size={16} aria-hidden /> },
              { value: 'income', label: 'Income', icon: <ArrowUpRight size={16} aria-hidden /> },
            ]}
          />
        )}
      />

      <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
        <Field label="Amount (₹)" error={errors.amount?.message}>
          {(a11y) => (
            <div className="relative">
              <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-lg text-ink-3">₹</span>
              <Input
                {...a11y}
                {...register('amount')}
                inputMode="decimal"
                autoComplete="off"
                placeholder="0.00"
                className="h-12 pl-8 text-xl font-semibold tabular"
                autoFocus={!editing}
              />
            </div>
          )}
        </Field>

        <fieldset>
          <legend className="mb-1.5 text-sm font-medium text-ink-2">Date</legend>
          <div className="flex flex-wrap items-center gap-2">
            <div role="radiogroup" aria-label="Date shortcuts" className="flex gap-2">
              <Chip name="date-shortcut" checked={date === today()} onChange={() => setValue('date', today(), { shouldValidate: true })}>
                Today
              </Chip>
              <Chip name="date-shortcut" checked={date === yesterday()} onChange={() => setValue('date', yesterday(), { shouldValidate: true })}>
                Yesterday
              </Chip>
            </div>
            <label className="flex min-w-36 flex-1 items-center gap-2">
              <span className="sr-only">Pick a date</span>
              <Input {...register('date')} type="date" max={today()} aria-invalid={Boolean(errors.date)} className="h-9" />
            </label>
          </div>
          <GroupError message={errors.date?.message} />
        </fieldset>
      </div>

      <fieldset aria-describedby={errors.category ? 'category-error' : undefined}>
        <legend className="mb-2 text-sm font-medium text-ink-2">Category</legend>
        <div role="radiogroup" aria-label="Category" className="flex flex-wrap gap-2">
          {options.map((c) => (
            <Chip key={c.id} value={c.id} checked={category === c.id} {...register('category')} className="pr-3.5 pl-1.5">
              <CategoryIcon icon={c.icon} color={c.color} size="sm" className="h-6 w-6 rounded-full" />
              {c.name}
            </Chip>
          ))}
        </div>
        <GroupError id="category-error" message={errors.category?.message} />
      </fieldset>

      <fieldset>
        <legend className="mb-2 text-sm font-medium text-ink-2">Paid with</legend>
        <div role="radiogroup" aria-label="Paid with" className="flex flex-wrap gap-2">
          {PAYMENT_METHODS.map((m) => (
            <Chip key={m} value={m} checked={paymentMethod === m} {...register('paymentMethod')}>
              {PAYMENT_LABELS[m]}
            </Chip>
          ))}
        </div>
      </fieldset>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Merchant or payee" optional error={errors.merchant?.message}>
          {(a11y) => <Input {...a11y} {...register('merchant')} placeholder="e.g. DMart" maxLength={60} />}
        </Field>
        <Field label="Description" optional hint="Leave blank to use the merchant or category." error={errors.description?.message}>
          {(a11y) => <Input {...a11y} {...register('description')} placeholder="e.g. Weekly groceries" maxLength={120} />}
        </Field>
      </div>

      {showNotes ? (
        <Field label="Notes" optional error={errors.notes?.message}>
          {(a11y) => <Textarea {...a11y} {...register('notes')} rows={2} maxLength={500} autoFocus={!defaults.notes} />}
        </Field>
      ) : (
        <button
          type="button"
          onClick={() => setShowNotes(true)}
          className="inline-flex items-center gap-2 self-start rounded-lg text-sm font-medium text-brand hover:underline"
        >
          <StickyNote size={15} aria-hidden />
          Add a note
        </button>
      )}

      <div className="flex justify-end gap-2 border-t border-line pt-4">
        {onCancel && (
          <Button variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
        )}
        <Button type="submit" loading={submitting}>
          {editing ? 'Save changes' : 'Save transaction'}
        </Button>
      </div>
    </form>
  );
}
