import { useState } from 'react';
import { Trash2, Plus, Pencil } from 'lucide-react';
import { useCategories, useDeleteCategory } from '../../api/hooks.js';
import { Button, Dialog, Skeleton } from '../../components/ui/primitives.jsx';
import { CategoryIcon } from '../../components/ui/CategoryIcon.jsx';
import { CategoryForm } from '../categories/CategoryForm.jsx';
import { useToast } from '../../components/ui/toast.jsx';
import { moneyWhole } from '../../lib/format.js';
import { Section } from './SettingsSection.jsx';

function CategoryManager() {
  const { data, isLoading } = useCategories({ withUsage: true });
  const remove = useDeleteCategory();
  const toast = useToast();
  const [dialog, setDialog] = useState(null);

  if (isLoading) return <Skeleton className="h-64" />;
  const groups = [
    ['expense', 'Expense categories'],
    ['income', 'Income categories'],
  ];

  return (
    <>
      <Button variant="secondary" size="sm" onClick={() => setDialog({})}>
        <Plus size={16} aria-hidden />
        New category
      </Button>
      <div className="mt-4 grid gap-6 md:grid-cols-2">
        {groups.map(([type, label]) => (
          <div key={type}>
            <h3 className="mb-2 text-sm font-semibold text-ink-2">{label}</h3>
            <ul className="divide-y divide-line rounded-xl ring-1 ring-line">
              {data
                ?.filter((c) => c.type === type)
                .map((c) => (
                  <li key={c.id} className="flex items-center gap-3 px-3 py-2.5">
                    <CategoryIcon icon={c.icon} color={c.color} size="sm" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{c.name}</p>
                      <p className="text-[0.8125rem] text-ink-3">
                        {c.transactionCount
                          ? `${c.transactionCount} ${c.transactionCount === 1 ? 'transaction' : 'transactions'}, ${moneyWhole(c.totalAmount)}`
                          : 'Not used yet'}
                      </p>
                    </div>
                    <Button variant="ghost" size="icon" aria-label={`Edit ${c.name}`} onClick={() => setDialog({ editing: c })}>
                      <Pencil size={15} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={`Delete ${c.name}`}
                      disabled={c.transactionCount > 0}
                      title={c.transactionCount > 0 ? 'Categories with transactions cannot be deleted' : undefined}
                      onClick={() => remove.mutate(c.id, { onSuccess: () => toast.success(`Deleted "${c.name}"`), onError: (e) => toast.error(e.message) })}
                    >
                      <Trash2 size={15} />
                    </Button>
                  </li>
                ))}
            </ul>
          </div>
        ))}
      </div>
      <Dialog open={Boolean(dialog)} onClose={() => setDialog(null)} title={dialog?.editing ? 'Edit category' : 'New category'}>
        {dialog && <CategoryForm editing={dialog.editing} onDone={() => setDialog(null)} />}
      </Dialog>
    </>
  );
}

export default function CategoriesSettings() {
  return (
    <Section title="Categories" description="Rename the defaults or add your own. Categories that have transactions can't be deleted.">
      <CategoryManager />
    </Section>
  );
}
