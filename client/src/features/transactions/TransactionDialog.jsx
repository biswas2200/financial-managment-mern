import { useState } from 'react';
import { Dialog } from '../../components/ui/primitives.jsx';
import { useCategories, useSaveTransaction } from '../../api/hooks.js';
import { useToast } from '../../components/ui/toast.jsx';
import { money } from '../../lib/format.js';
import { TransactionForm } from './TransactionForm.jsx';

/** Add or edit a transaction in a modal. `editing` is a transaction object or null. */
export function TransactionDialog({ open, editing, onClose }) {
  const { data: categories = [] } = useCategories();
  const save = useSaveTransaction();
  const toast = useToast();
  const [serverErrors, setServerErrors] = useState(null);

  const close = () => {
    setServerErrors(null);
    save.reset();
    onClose();
  };

  const handleSubmit = async (values) => {
    try {
      const saved = await save.mutateAsync(editing ? { id: editing.id, ...values } : values);
      toast.success(
        editing
          ? 'Transaction updated'
          : `${saved.type === 'income' ? 'Income' : 'Expense'} of ${money(saved.amount)} added`,
      );
      close();
    } catch (err) {
      setServerErrors(err.fieldErrors ?? null);
      toast.error(err.message);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={close}
      title={editing ? 'Edit transaction' : 'Add a transaction'}
      description={editing ? undefined : 'Log money in or out. It shows up on your dashboard right away.'}
      size="lg"
    >
      <TransactionForm
        key={editing?.id ?? 'new'}
        categories={categories}
        initialValues={editing ?? undefined}
        onSubmit={handleSubmit}
        onCancel={close}
        submitting={save.isPending}
        serverErrors={serverErrors}
      />
    </Dialog>
  );
}
