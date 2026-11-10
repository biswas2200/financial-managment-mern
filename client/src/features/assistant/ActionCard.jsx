import clsx from 'clsx';
import { CircleCheck, Undo2 } from 'lucide-react';
import { CategoryIcon } from '../../components/ui/CategoryIcon.jsx';
import { Button } from '../../components/ui/primitives.jsx';
import { money, dateLong } from '../../lib/format.js';

const PAYMENT_LABELS = { UPI: 'UPI', Card: 'Card', Cash: 'Cash', Bank: 'Bank transfer', Wallet: 'Wallet' };

/**
 * A write the Copilot has drafted. Nothing is saved until the user confirms.
 */
export function ActionCard({ action, onConfirm, onCancel, busy = false }) {
  const { type, status, preview } = action;
  const isTxn = type === 'create_transaction';
  const heading = isTxn ? (preview.type === 'income' ? 'New income' : 'New expense') : 'Monthly budget';
  const amount = isTxn ? preview.amount : preview.limit;

  return (
    <div
      className={clsx(
        'mt-3 max-w-sm overflow-hidden rounded-xl bg-surface ring-1',
        status === 'pending' ? 'ring-brand/40' : 'ring-line',
      )}
    >
      <div className="flex items-center gap-3 border-b border-dashed border-line px-4 py-3">
        <CategoryIcon icon={preview.category?.icon} color={preview.category?.color} />
        <div className="min-w-0 flex-1">
          <p className="text-[0.8125rem] text-ink-2">{heading}</p>
          <p className="truncate font-semibold" data-field="category">
            {preview.category?.name}
          </p>
        </div>
        <p
          className={clsx(
            'font-condensed text-xl font-semibold tabular',
            isTxn && preview.type === 'income' ? 'text-income-text' : 'text-ink',
          )}
        >
          {money(amount)}
        </p>
      </div>

      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 px-4 py-3 text-sm">
        {isTxn ? (
          <>
            <dt className="text-ink-3">Description</dt>
            <dd className="truncate">{preview.description}</dd>
            {preview.merchant && (
              <>
                <dt className="text-ink-3">Merchant</dt>
                <dd>{preview.merchant}</dd>
              </>
            )}
            <dt className="text-ink-3">Date</dt>
            <dd>{dateLong(preview.date)}</dd>
            <dt className="text-ink-3">Paid with</dt>
            <dd>{PAYMENT_LABELS[preview.paymentMethod] ?? preview.paymentMethod}</dd>
          </>
        ) : (
          <>
            <dt className="text-ink-3">Month</dt>
            <dd>{preview.monthLabel ?? preview.month}</dd>
            <dt className="text-ink-3">Limit</dt>
            <dd>{money(preview.limit)} per month</dd>
          </>
        )}
      </dl>

      <div className="flex items-center gap-2 bg-surface-2/60 px-4 py-3">
        {status === 'pending' && (
          <>
            <Button size="sm" onClick={onConfirm} loading={busy} disabled={busy}>
              {busy ? 'Saving…' : 'Confirm'}
            </Button>
            <Button size="sm" variant="ghost" onClick={onCancel} disabled={busy}>
              Discard
            </Button>
          </>
        )}
        {(status === 'confirmed' || status === 'confirming') && (
          <p className="flex items-center gap-1.5 text-sm font-medium text-good-text">
            <CircleCheck size={16} aria-hidden />
            {isTxn ? 'Saved to your transactions' : 'Budget saved'}
          </p>
        )}
        {status === 'cancelled' && (
          <p className="flex items-center gap-1.5 text-sm text-ink-2">
            <Undo2 size={16} aria-hidden />
            Discarded. Nothing was saved
          </p>
        )}
      </div>
    </div>
  );
}
