import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { updateProfileSchema, changePasswordSchema } from '@kosha/shared';
import { useMe, useUpdateProfile, useChangePassword } from '../../api/hooks.js';
import { Button, Field, Input } from '../../components/ui/primitives.jsx';
import { PasswordInput } from '../../components/ui/PasswordInput.jsx';
import { DobInput } from '../../components/ui/DobInput.jsx';
import { useToast } from '../../components/ui/toast.jsx';
import { AvatarPicker } from './AvatarPicker.jsx';
import { Section } from './SettingsSection.jsx';

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

export default function ProfileSettings() {
  const { data: user } = useMe();
  return (
    <>
      <Section title="Profile">{user && <ProfileForm user={user} />}</Section>
      <Section title="Password" description="Use a password you don't use anywhere else.">
        <PasswordForm />
      </Section>
    </>
  );
}
