import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { categoryApiSchema } from '@kosha/shared';
import { useSaveCategory } from '../../api/hooks.js';
import { Button, Field, Input } from '../../components/ui/primitives.jsx';
import { Dropdown } from '../../components/ui/Dropdown.jsx';
import { CategoryIcon, CATEGORY_ICONS } from '../../components/ui/CategoryIcon.jsx';
import { useToast } from '../../components/ui/toast.jsx';

export const SWATCHES = ['#2a78d6', '#eb6834', '#1baf7a', '#eda100', '#e87ba4', '#008300', '#6250d6', '#e34948'];

const TYPE_OPTIONS = [
  { value: 'expense', label: 'Expense' },
  { value: 'income', label: 'Income' },
];

/**
 * Create or edit a category: a name, a colour and an icon from the full set.
 * `fixedType` hides the type choice when the caller already knows it (a budget is always for an expense).
 * `onSaved` receives the saved category, so a caller can select it straight away.
 */
export function CategoryForm({ editing, fixedType, onDone, onSaved }) {
  const save = useSaveCategory();
  const toast = useToast();
  const { register, handleSubmit, watch, setValue, control, formState } = useForm({
    resolver: zodResolver(editing ? categoryApiSchema.partial() : categoryApiSchema),
    defaultValues: { name: editing?.name ?? '', type: fixedType ?? editing?.type ?? 'expense', color: editing?.color ?? SWATCHES[0], icon: editing?.icon ?? 'circle' },
  });
  const color = watch('color');
  const icon = watch('icon');

  return (
    <form
      noValidate
      className="flex flex-col gap-4"
      onSubmit={handleSubmit((v) =>
        save.mutate(editing ? { id: editing.id, name: v.name, color: v.color, icon: v.icon } : v, {
          onSuccess: (saved) => {
            toast.success(editing ? 'Category updated' : `Added "${v.name}"`);
            onSaved?.(saved);
            onDone();
          },
          onError: (e) => toast.error(e.message),
        }),
      )}
    >
      <div className={fixedType ? undefined : 'grid gap-4 sm:grid-cols-2'}>
        <Field label="Name" error={formState.errors.name?.message}>
          {(a11y) => <Input {...a11y} {...register('name')} placeholder="e.g. Pets" autoFocus />}
        </Field>
        {!fixedType && (
          <Field label="Type">
            {(a11y) => (
              <Controller
                control={control}
                name="type"
                render={({ field }) => <Dropdown {...a11y} value={field.value} onChange={field.onChange} options={TYPE_OPTIONS} disabled={Boolean(editing)} />}
              />
            )}
          </Field>
        )}
      </div>
      <fieldset>
        <legend className="mb-2 text-sm font-medium text-ink-2">Colour</legend>
        <div className="flex flex-wrap gap-2">
          {SWATCHES.map((s) => (
            <button
              key={s}
              type="button"
              aria-label={`Colour ${s}`}
              aria-pressed={color === s}
              onClick={() => setValue('color', s)}
              className="h-8 w-8 rounded-full ring-offset-2 ring-offset-surface transition-transform duration-150 hover:scale-110 aria-pressed:scale-110 aria-pressed:ring-2 aria-pressed:ring-ink"
              style={{ background: s }}
            />
          ))}
        </div>
      </fieldset>
      <fieldset>
        <legend className="mb-2 text-sm font-medium text-ink-2">Icon</legend>
        <div className="scrollbar-thin flex max-h-44 flex-wrap gap-1.5 overflow-y-auto rounded-xl p-1 shadow-inset">
          {Object.keys(CATEGORY_ICONS).map((name) => (
            <button
              key={name}
              type="button"
              aria-label={`Icon ${name}`}
              title={name.replace(/-/g, ' ')}
              aria-pressed={icon === name}
              onClick={() => setValue('icon', name)}
              className="rounded-[11px] p-0.5 transition-transform duration-150 hover:scale-110 aria-pressed:ring-2 aria-pressed:ring-brand"
            >
              <CategoryIcon icon={name} color={color} />
            </button>
          ))}
        </div>
      </fieldset>
      <div className="flex justify-end gap-2">
        <Button variant="ghost" onClick={onDone}>
          Cancel
        </Button>
        <Button type="submit" loading={save.isPending}>
          {editing ? 'Save category' : 'Add category'}
        </Button>
      </div>
    </form>
  );
}
