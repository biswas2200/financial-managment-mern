import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useNavigate } from 'react-router-dom';
import { updateProfileSchema, changePasswordSchema, deleteAccountSchema } from '@kosha/shared';
import { Trash2, Plus, Pencil, Monitor, Sun, Moon } from 'lucide-react';
import {
  useMe,
  useUpdateProfile,
  useDeleteAccount,
  useChangePassword,
  useCategories,
  useDeleteCategory,
  useAssistantStatus,
} from '../../api/hooks.js';
import { useTheme } from '../../app/theme.jsx';
import { PageHeader } from '../../components/layout/AppShell.jsx';
import { Button, Dialog, Field, Input, Segmented, Skeleton } from '../../components/ui/primitives.jsx';
import { CategoryIcon } from '../../components/ui/CategoryIcon.jsx';
import { CategoryForm } from '../categories/CategoryForm.jsx';
import { PasswordInput } from '../../components/ui/PasswordInput.jsx';
import { DobInput } from '../../components/ui/DobInput.jsx';
import { AvatarPicker } from './AvatarPicker.jsx';
import { useToast } from '../../components/ui/toast.jsx';
import { EngineBadge } from '../assistant/CopilotChat.jsx';
import { moneyWhole, dateLong } from '../../lib/format.js';

function Section({ title, description, children }) {
  return (
    <section className="grid gap-4 border-b border-line py-8 first:pt-0 last:border-0 lg:grid-cols-[260px_minmax(0,1fr)] lg:gap-10">
      <div>
        <h2 className="font-wide text-[1.0625rem] font-semibold">{title}</h2>
        {description && <p className="mt-1 text-sm text-ink-2">{description}</p>}
      </div>
      <div className="min-w-0">{children}</div>
    </section>
  );
}

function ProfileForm({ user }) {
  const update = useUpdateProfile();
  const toast = useToast();
  const { register, handleSubmit, control, formState } = useForm({
    resolver: zodResolver(updateProfileSchema),
    defaultValues: { name: user.name, phone: user.phone ?? '', dateOfBirth: user.dateOfBirth ?? '', avatar: user.avatar ?? null },
  });
  return (
    <form
      noValidate
      className="flex max-w-xl flex-col gap-5"
      onSubmit={handleSubmit((v) => update.mutate(v, { onSuccess: () => toast.success('Profile updated'), onError: (e) => toast.error(e.message) }))}
    >
      <Controller
        control={control}
        name="avatar"
        render={({ field }) => <AvatarPicker name={user.name} value={field.value} onChange={field.onChange} />}
      />
      <Field label="Name" error={formState.errors.name?.message}>
        {(a11y) => <Input {...a11y} {...register('name')} autoComplete="name" />}
      </Field>
      <Field label="Email" hint="Your email is your sign-in and can't be changed here.">
        {(a11y) => <Input {...a11y} value={user.email} readOnly disabled />}
      </Field>
      <Field label="Phone number" optional error={formState.errors.phone?.message} hint="Only used to reach you about your account. Clear it to remove it.">
        {(a11y) => <Input {...a11y} type="tel" inputMode="tel" autoComplete="tel" placeholder="98765 43210" {...register('phone')} />}
      </Field>
      <Field label="Date of birth" optional error={formState.errors.dateOfBirth?.message} hint="Used to check you are old enough (13+) and to show your age.">
        {(a11y) => <Controller control={control} name="dateOfBirth" render={({ field }) => <DobInput {...a11y} value={field.value} onChange={field.onChange} />} />}
      </Field>
      <Button type="submit" className="self-start" loading={update.isPending}>
        Save profile
      </Button>
    </form>
  );
}

function PasswordForm() {
  const change = useChangePassword();
  const toast = useToast();
  const { register, handleSubmit, reset, setError, formState } = useForm({ resolver: zodResolver(changePasswordSchema) });
  return (
    <form
      noValidate
      className="flex max-w-md flex-col gap-4"
      onSubmit={handleSubmit((v) =>
        change.mutate(v, {
          onSuccess: () => {
            toast.success('Password changed');
            reset({ currentPassword: '', newPassword: '' });
          },
          onError: (e) => {
            for (const [field, message] of Object.entries(e.fieldErrors ?? {})) setError(field, { message });
            toast.error(e.message);
          },
        }),
      )}
    >
      <Field label="Current password" error={formState.errors.currentPassword?.message}>
        {(a11y) => <PasswordInput {...a11y} autoComplete="current-password" {...register('currentPassword')} />}
      </Field>
      <Field label="New password" error={formState.errors.newPassword?.message} hint="At least 8 characters with a letter and a number.">
        {(a11y) => <PasswordInput {...a11y} autoComplete="new-password" {...register('newPassword')} />}
      </Field>
      <Button type="submit" variant="secondary" className="self-start" loading={change.isPending}>
        Change password
      </Button>
    </form>
  );
}

function DeleteAccountDialog({ open, onClose }) {
  const del = useDeleteAccount();
  const navigate = useNavigate();
  const { register, handleSubmit, reset, formState } = useForm({ resolver: zodResolver(deleteAccountSchema), defaultValues: { password: '' } });
  const [serverError, setServerError] = useState(null);

  const close = () => {
    reset();
    setServerError(null);
    onClose();
  };

  return (
    <Dialog open={open} onClose={close} title="Delete your account?">
      <form
        noValidate
        className="flex flex-col gap-4"
        onSubmit={handleSubmit((values) => {
          setServerError(null);
          // The session is gone, so go to sign-in the same way signing out does.
          del.mutate(values, { onSuccess: () => navigate('/login', { replace: true }), onError: (e) => setServerError(e.message) });
        })}
      >
        <p className="text-sm text-ink-2">
          This permanently deletes your profile, transactions, budgets, categories and Copilot messages. It cannot be undone. If you want a copy first, use
          Export CSV on the Transactions page.
        </p>
        <Field label="Your password" error={formState.errors.password?.message}>
          {(a11y) => <PasswordInput {...a11y} autoComplete="current-password" {...register('password')} />}
        </Field>
        {serverError && (
          <p role="alert" className="rounded-lg bg-bad/10 px-3 py-2 text-sm text-bad-text">
            {serverError}
          </p>
        )}
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={close}>
            Cancel
          </Button>
          <Button type="submit" variant="danger" loading={del.isPending}>
            Delete everything
          </Button>
        </div>
      </form>
    </Dialog>
  );
}

function PrivacySection({ user }) {
  const [deleting, setDeleting] = useState(false);
  const consent = user?.consent;
  return (
    <div className="flex flex-col gap-4 text-sm text-ink-2">
      <p>
        {consent
          ? `You accepted version ${consent.termsVersion} of the Terms and Privacy Policy on ${dateLong(consent.acceptedAt)}.`
          : 'Your account was created before Kosha recorded this. You can read the documents below at any time.'}
      </p>
      <p className="flex flex-wrap gap-x-5 gap-y-1">
        <Link to="/privacy" target="_blank" rel="noreferrer" className="font-semibold text-brand hover:underline">
          Privacy Policy
        </Link>
        <Link to="/terms" target="_blank" rel="noreferrer" className="font-semibold text-brand hover:underline">
          Terms of Use
        </Link>
      </p>
      <div className="mt-2 rounded-xl border border-bad/30 bg-bad/5 p-4">
        <p className="font-semibold text-ink">Delete your account</p>
        <p className="mt-1">Removes your profile and every record you have added. Your password is needed to confirm.</p>
        <Button variant="danger" size="sm" className="mt-3" onClick={() => setDeleting(true)}>
          Delete my account
        </Button>
      </div>
      <DeleteAccountDialog open={deleting} onClose={() => setDeleting(false)} />
    </div>
  );
}

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

export default function SettingsPage() {
  const { data: user } = useMe();
  const { preference, setTheme } = useTheme();
  const { data: status } = useAssistantStatus();

  return (
    <>
      <PageHeader title="Settings" description="Your profile, categories and how Kosha looks." />
      <div className="raised rounded-2xl bg-surface px-5 py-8 shadow-raise-1 sm:px-8">
        <Section title="Profile">{user && <ProfileForm user={user} />}</Section>
        <Section title="Password" description="Use a password you don't use anywhere else.">
          <PasswordForm />
        </Section>
        <Section title="Appearance" description="Follow your device, or pick a theme.">
          <Segmented
            label="Theme"
            value={preference}
            onChange={setTheme}
            options={[
              { value: 'system', label: 'System', icon: <Monitor size={16} aria-hidden /> },
              { value: 'light', label: 'Light', icon: <Sun size={16} aria-hidden /> },
              { value: 'dark', label: 'Dark', icon: <Moon size={16} aria-hidden /> },
            ]}
          />
        </Section>
        <Section title="Categories" description="Rename the defaults or add your own. Categories that have transactions can't be deleted.">
          <CategoryManager />
        </Section>
        <Section title="Privacy and your data" description="What you agreed to, and how to leave.">
          {user && <PrivacySection user={user} />}
        </Section>
        <Section title="Copilot engine" description="Which engine is answering your questions.">
          <div className="flex flex-col gap-2 text-sm text-ink-2">
            <EngineBadge status={status} />
            <p>
              {status?.provider === 'gemini'
                ? `Connected to Google Gemini (${status.model}) ${status.auth === 'adc' ? 'through your Google Cloud sign-in (Application Default Credentials), so no API key is stored' : 'with an API key'}. Your questions and the figures Copilot looks up are sent to Gemini to write each answer.`
                : 'Gemini is not set up on the server (no API key or Google Cloud project), so Copilot answers with its built-in offline engine.'}
            </p>
          </div>
        </Section>
      </div>
    </>
  );
}
