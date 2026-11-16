import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useNavigate } from 'react-router-dom';
import { deleteAccountSchema } from '@kosha/shared';
import { useMe, useDeleteAccount } from '../../api/hooks.js';
import { Button, Dialog, Field } from '../../components/ui/primitives.jsx';
import { PasswordInput } from '../../components/ui/PasswordInput.jsx';
import { dateLong } from '../../lib/format.js';
import { Section } from './SettingsSection.jsx';

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

export default function PrivacySettings() {
  const { data: user } = useMe();
  return (
    <Section title="Privacy and your data" description="What you agreed to, and how to leave.">
      {user && <PrivacySection user={user} />}
    </Section>
  );
}
