import { forwardRef, useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import clsx from 'clsx';
import { Input } from './primitives.jsx';

/** Password field with a show/hide toggle, so people can check what they typed. */
export const PasswordInput = forwardRef(function PasswordInput({ className, ...props }, ref) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="relative">
      <Input ref={ref} {...props} type={visible ? 'text' : 'password'} className={clsx('pr-11', className)} />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? 'Hide password' : 'Show password'}
        aria-pressed={visible}
        className="absolute inset-y-0 right-1 my-auto flex h-8 w-9 items-center justify-center rounded-lg text-ink-3 hover:bg-surface-2 hover:text-ink"
      >
        {visible ? <EyeOff size={17} aria-hidden /> : <Eye size={17} aria-hidden />}
      </button>
    </div>
  );
});
