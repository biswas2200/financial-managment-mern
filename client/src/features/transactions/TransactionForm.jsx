import { useEffect, useMemo } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { transactionFormSchema, fromMinor, toDayKey, PAYMENT_METHODS } from '@kosha/shared';
import { ArrowDownRight, ArrowUpRight } from 'lucide-react';
import { Button, Field, Input, Select, Segmented, Textarea } from '../../components/ui/primitives.jsx';

const PAYMENT_LABELS = { UPI: 'UPI', Card: 'Card', Cash: 'Cash', Bank: 'Bank transfer', Wallet: 'Wallet' };

function toDefaults(initial) {
  if (!initial) {
    return {
      type: 'expense',
      amount: '',
      category: '',
      description: '',
      merchant: '',
      date: toDayKey(new Date()),
      paymentMethod: 'UPI',
      notes: '',
    };
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

/**
 * Add / edit a transaction. The amount is typed in rupees; the shared zod schema
 * converts it to integer paise before `onSubmit` sees it.
 */
export function TransactionForm({ categories = [], initialValues, onSubmit, onCancel, submitting = false, serverErrors }) {
  const editing = Boolean(initialValues);
  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    getValues,
    setError,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(transactionFormSchema),
    defaultValues: toDefaults(initialValues),
  });

  const type = watch('type');
  const options = useMemo(() => categories.filter((c) => c.type === type), [categories, type]);

  // Switching expense ↔ income clears a category of the other type.
  useEffect(() => {
    const current = getValues('category');
    if (current && !options.some((c) => c.id === current)) setValue('category', '');
  }, [options, getValues, setValue]);

  // Show field errors coming back from the API next to the right input.
  useEffect(() => {
    for (const [field, message] of Object.entries(serverErrors ?? {})) setError(field, { message });
  }, [serverErrors, setError]);

  return (
    <form noValidate onSubmit={handleSubmit((values) => onSubmit(clean(values)))} className="flex flex-col gap-4">
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

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Amount (₹)" error={errors.amount?.message}>
          {(a11y) => (
            <div className="relative">
              <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-ink-3">₹</span>
              <Input
                {...a11y}
                {...register('amount')}
                inputMode="decimal"
                autoComplete="off"
                placeholder="0.00"
                className="pl-7 text-lg font-semibold tabular"
                autoFocus={!editing}
              />
            </div>
          )}
        </Field>

        <Field label="Date" error={errors.date?.message}>
          {(a11y) => <Input {...a11y} {...register('date')} type="date" max={toDayKey(new Date())} />}
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Category" error={errors.category?.message}>
          {(a11y) => (
            <Select {...a11y} {...register('category')}>
              <option value="">Select a category</option>
              {options.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          )}
        </Field>

        <Field label="Payment method" error={errors.paymentMethod?.message}>
          {(a11y) => (
            <Select {...a11y} {...register('paymentMethod')}>
              {PAYMENT_METHODS.map((m) => (
                <option key={m} value={m}>
                  {PAYMENT_LABELS[m]}
                </option>
              ))}
            </Select>
          )}
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Description" error={errors.description?.message}>
          {(a11y) => <Input {...a11y} {...register('description')} placeholder="e.g. Weekly groceries" maxLength={120} />}
        </Field>
        <Field label="Merchant or payee" optional error={errors.merchant?.message}>
          {(a11y) => <Input {...a11y} {...register('merchant')} placeholder="e.g. DMart" maxLength={60} />}
        </Field>
      </div>

      <Field label="Notes" optional error={errors.notes?.message}>
        {(a11y) => <Textarea {...a11y} {...register('notes')} rows={2} maxLength={500} />}
      </Field>

      <div className="mt-1 flex justify-end gap-2">
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
