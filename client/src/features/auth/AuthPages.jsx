import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Lock } from 'lucide-react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { loginSchema, registerSchema } from '@kosha/shared';
import { useLogin, useRegister } from '../../api/hooks.js';
import { PasswordInput } from '../../components/ui/PasswordInput.jsx';
import { Button, Checkbox, Field, Input } from '../../components/ui/primitives.jsx';
import { DobInput } from '../../components/ui/DobInput.jsx';

// Seed-dataset demo account (local development only; see server/scripts/seed.js)
const DEMO = { email: 'demo@kosha.app', password: 'Demo@1234' };

/** The heading, the form and the way to the other page. The frame around it is `AuthLayout`. */
function AuthCard({ title, subtitle, children, footer }) {
  return (
    <div className="w-full max-w-sm">
      <h1 className="font-wide text-[1.875rem] leading-tight font-semibold">{title}</h1>
      <p className="mt-1.5 text-ink-2">{subtitle}</p>
      <div className="mt-8">{children}</div>
      <p className="mt-6 text-sm text-ink-2">{footer}</p>
      <p className="mt-8 flex items-center gap-1.5 text-[0.8125rem] text-ink-3">
        <Lock size={14} aria-hidden />
        Your data stays in your own Kosha database.
      </p>
    </div>
  );
}

export function LoginPage() {
  const login = useLogin();
  const navigate = useNavigate();
  const location = useLocation();
  const { register, handleSubmit, setValue, formState } = useForm({ resolver: zodResolver(loginSchema) });

  const onSubmit = (values) =>
    login.mutate(values, { onSuccess: () => navigate(location.state?.from?.pathname ?? '/', { replace: true }) });

  return (
    <AuthCard
      title="Welcome back"
      subtitle="Sign in to see your money."
      footer={
        <>
          New to Kosha?{' '}
          <Link to="/register" className="font-semibold text-brand hover:underline">
            Create an account
          </Link>
        </>
      }
    >
      <form noValidate onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
        {login.error && (
          <p role="alert" className="rounded-lg bg-bad/10 px-3 py-2 text-sm text-bad-text">
            {login.error.message}
          </p>
        )}
        <Field label="Email" error={formState.errors.email?.message}>
          {(a11y) => <Input {...a11y} type="email" autoComplete="email" {...register('email')} />}
        </Field>
        <Field label="Password" error={formState.errors.password?.message}>
          {(a11y) => <PasswordInput {...a11y} autoComplete="current-password" {...register('password')} />}
        </Field>
        <Button type="submit" size="lg" loading={login.isPending} className="mt-2">
          Sign in
        </Button>
      </form>
      {import.meta.env.DEV && (
      <div data-demo-hint className="mt-6 rounded-xl raised bg-surface p-4 text-sm shadow-raise-1">
        <p className="font-semibold">Exploring the project?</p>
        <p className="mt-1 text-ink-2">
          The seed dataset includes a demo account with a year of activity: <span className="font-medium text-ink">{DEMO.email}</span>
        </p>
        <Button
          variant="secondary"
          size="sm"
          className="mt-3"
          onClick={() => {
            setValue('email', DEMO.email);
            setValue('password', DEMO.password);
          }}
        >
          Fill in demo account
        </Button>
      </div>
      )}
    </AuthCard>
  );
}

export function RegisterPage() {
  const registerUser = useRegister();
  const navigate = useNavigate();
  const { register, handleSubmit, control, formState, setError } = useForm({
    resolver: zodResolver(registerSchema),
    defaultValues: { phone: '', dateOfBirth: '', acceptedTerms: false },
  });

  const onSubmit = (values) =>
    registerUser.mutate(values, {
      onSuccess: () => navigate('/', { replace: true }),
      onError: (e) => {
        for (const [field, message] of Object.entries(e.fieldErrors ?? {})) setError(field, { message });
      },
    });

  return (
    <AuthCard
      title="Create your account"
      subtitle="It takes less than a minute. Default categories are set up for you."
      footer={
        <>
          Already have an account?{' '}
          <Link to="/login" className="font-semibold text-brand hover:underline">
            Sign in
          </Link>
        </>
      }
    >
      <form noValidate onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
        {registerUser.error && !Object.keys(registerUser.error.fieldErrors ?? {}).length && (
          <p role="alert" className="rounded-lg bg-bad/10 px-3 py-2 text-sm text-bad-text">
            {registerUser.error.message}
          </p>
        )}
        <Field label="Name" error={formState.errors.name?.message}>
          {(a11y) => <Input {...a11y} autoComplete="name" {...register('name')} />}
        </Field>
        <Field label="Email" error={formState.errors.email?.message}>
          {(a11y) => <Input {...a11y} type="email" autoComplete="email" {...register('email')} />}
        </Field>
        <Field label="Password" error={formState.errors.password?.message} hint="At least 8 characters with a letter and a number.">
          {(a11y) => <PasswordInput {...a11y} autoComplete="new-password" {...register('password')} />}
        </Field>
        <Field label="Phone number" optional error={formState.errors.phone?.message} hint="Only to reach you about your account. No marketing.">
          {(a11y) => <Input {...a11y} type="tel" inputMode="tel" autoComplete="tel" placeholder="98765 43210" {...register('phone')} />}
        </Field>
        <Field label="Date of birth" optional error={formState.errors.dateOfBirth?.message} hint="So we can check you're old enough to use Kosha (13+).">
          {(a11y) => <Controller control={control} name="dateOfBirth" render={({ field }) => <DobInput {...a11y} value={field.value} onChange={field.onChange} />} />}
        </Field>
        <div>
          <Checkbox error={formState.errors.acceptedTerms} {...register('acceptedTerms')}>
            I agree to the{' '}
            <Link to="/terms" target="_blank" rel="noreferrer" className="font-semibold text-brand hover:underline">
              Terms of Use
            </Link>{' '}
            and the{' '}
            <Link to="/privacy" target="_blank" rel="noreferrer" className="font-semibold text-brand hover:underline">
              Privacy Policy
            </Link>
            , and I consent to Kosha storing the details I enter.
          </Checkbox>
          {formState.errors.acceptedTerms && (
            <p role="alert" className="mt-1.5 text-[0.8125rem] text-bad-text">
              {formState.errors.acceptedTerms.message}
            </p>
          )}
        </div>
        <Button type="submit" size="lg" loading={registerUser.isPending} className="mt-2">
          Create account
        </Button>
      </form>
    </AuthCard>
  );
}
