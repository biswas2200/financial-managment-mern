import { useMemo } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { loginSchema, registerSchema } from '@kosha/shared';
import { useLogin, useRegister } from '../../api/hooks.js';
import { Button, Field, Input } from '../../components/ui/primitives.jsx';
import { Logo } from '../../components/brand/Logo.jsx';
import { wavePaths, rosettePath } from '../../components/brand/guilloche.js';

// Seed-dataset demo account (local development only; see server/scripts/seed.js)
const DEMO = { email: 'demo@kosha.app', password: 'Demo@1234' };

function BrandPanel() {
  const art = useMemo(
    () => ({
      waves: wavePaths({ width: 600, height: 900, count: 34, step: 8 }),
      rosette: rosettePath({ cx: 470, cy: 790, R: 130, r: 47, d: 94, turns: 27 }),
    }),
    [],
  );
  return (
    <div className="relative isolate hidden overflow-hidden bg-note lg:flex lg:flex-col lg:justify-between lg:p-12">
      <svg viewBox="0 0 600 900" preserveAspectRatio="xMidYMid slice" className="guilloche-draw absolute inset-0 -z-10 h-full w-full" aria-hidden>
        <g fill="none" stroke="var(--note-line)" strokeWidth="0.7" opacity="0.2">
          {art.waves.map((d, i) => (
            <path key={i} d={d} style={{ '--len': 900, animationDelay: `${i * 25}ms` }} />
          ))}
        </g>
        <path d={art.rosette} fill="none" stroke="var(--note-line)" strokeWidth="0.6" opacity="0.35" style={{ '--len': 40000, animationDuration: '2.6s' }} />
      </svg>
      <div
        aria-hidden
        className="absolute inset-y-0 right-24 -z-10 w-2"
        style={{ background: 'repeating-linear-gradient(to bottom, var(--thread) 0 22px, color-mix(in oklch, var(--thread) 35%, transparent) 22px 32px)' }}
      />
      <Logo size={32} />
      <div className="max-w-md">
        <p className="font-wide text-[2.5rem] leading-[1.1] font-semibold tracking-[-0.015em] text-ink">Know where every rupee goes.</p>
        <p className="mt-4 text-[1.0625rem] text-ink-2">
          Log income and expenses in seconds, see your month at a glance, and ask Copilot anything about your spending.
        </p>
      </div>
      <p className="text-sm text-ink-2">Your data stays in your own Kosha database.</p>
    </div>
  );
}

function AuthLayout({ title, subtitle, children, footer }) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <BrandPanel />
      <main className="flex items-center justify-center px-4 py-10 sm:px-8">
        <div className="w-full max-w-sm">
          <Logo size={30} className="mb-10 lg:hidden" />
          <h1 className="font-wide text-[1.875rem] leading-tight font-semibold">{title}</h1>
          <p className="mt-1.5 text-ink-2">{subtitle}</p>
          <div className="mt-8">{children}</div>
          <p className="mt-6 text-sm text-ink-2">{footer}</p>
        </div>
      </main>
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
    <AuthLayout
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
          {(a11y) => <Input {...a11y} type="password" autoComplete="current-password" {...register('password')} />}
        </Field>
        <Button type="submit" size="lg" loading={login.isPending} className="mt-2">
          Sign in
        </Button>
      </form>
      <div data-demo-hint className="mt-6 rounded-xl bg-surface p-4 text-sm ring-1 ring-line">
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
    </AuthLayout>
  );
}

export function RegisterPage() {
  const registerUser = useRegister();
  const navigate = useNavigate();
  const { register, handleSubmit, formState, setError } = useForm({ resolver: zodResolver(registerSchema) });

  const onSubmit = (values) =>
    registerUser.mutate(values, {
      onSuccess: () => navigate('/', { replace: true }),
      onError: (e) => {
        for (const [field, message] of Object.entries(e.fieldErrors ?? {})) setError(field, { message });
      },
    });

  return (
    <AuthLayout
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
          {(a11y) => <Input {...a11y} type="password" autoComplete="new-password" {...register('password')} />}
        </Field>
        <Button type="submit" size="lg" loading={registerUser.isPending} className="mt-2">
          Create account
        </Button>
      </form>
    </AuthLayout>
  );
}
