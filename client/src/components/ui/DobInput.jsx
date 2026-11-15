import { useEffect, useRef, useState } from 'react';
import clsx from 'clsx';
import { ageFromDob } from '@kosha/shared';

const SEGMENTS = [
  { key: 'day', label: 'day', placeholder: 'DD', length: 2, width: 'w-14' },
  { key: 'month', label: 'month', placeholder: 'MM', length: 2, width: 'w-14' },
  { key: 'year', label: 'year', placeholder: 'YYYY', length: 4, width: 'w-[4.75rem]' },
];

const pad = (v) => v.padStart(2, '0');

function split(value) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value ?? '');
  return m ? { year: m[1], month: m[2], day: m[3] } : { day: '', month: '', year: '' };
}

/** The "YYYY-MM-DD" the form stores. Empty stays empty; a half-typed date stays visibly invalid so it can be reported. */
function compose({ day, month, year }) {
  if (!day && !month && !year) return '';
  if (year.length === 4 && month && day) return `${year}-${pad(month)}-${pad(day)}`;
  return `${year}-${month}-${day}`;
}

/**
 * Date of birth typed as DD / MM / YYYY. Each box moves on by itself once it is full,
 * Backspace in an empty box steps back, and a small badge pops in with the age when the date is real.
 */
export function DobInput({ id, value, onChange, className, ...rest }) {
  const [parts, setParts] = useState(() => split(value));
  const refs = useRef({});

  // Follow the form when it resets or loads a saved value, without fighting what is being typed.
  useEffect(() => {
    if ((value ?? '') !== compose(parts) && /^(\d{4}-\d{2}-\d{2})?$/.test(value ?? '')) setParts(split(value));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const update = (key, raw, index) => {
    const digits = raw.replace(/\D/g, '').slice(0, SEGMENTS[index].length);
    const next = { ...parts, [key]: digits };
    setParts(next);
    onChange(compose(next));
    if (digits.length === SEGMENTS[index].length && index < SEGMENTS.length - 1) refs.current[SEGMENTS[index + 1].key]?.focus();
  };

  const age = /^\d{4}-\d{2}-\d{2}$/.test(value ?? '') ? ageFromDob(value) : null;

  return (
    <div role="group" aria-label="Date of birth" className={clsx('flex flex-wrap items-center gap-2', className)}>
      {SEGMENTS.map((seg, i) => (
        <span key={seg.key} className="flex items-center gap-2">
          <input
            {...(i === 0 ? { id } : {})}
            {...(i === 0 ? rest : { 'aria-invalid': rest['aria-invalid'] })}
            ref={(el) => {
              refs.current[seg.key] = el;
            }}
            inputMode="numeric"
            autoComplete={i === 0 ? 'bday-day' : i === 1 ? 'bday-month' : 'bday-year'}
            aria-label={`Date of birth, ${seg.label}`}
            placeholder={seg.placeholder}
            value={parts[seg.key]}
            onChange={(e) => update(seg.key, e.target.value, i)}
            onKeyDown={(e) => {
              if (e.key === 'Backspace' && !parts[seg.key] && i > 0) {
                e.preventDefault();
                refs.current[SEGMENTS[i - 1].key]?.focus();
              }
            }}
            className={clsx('control h-10 rounded-[10px] bg-surface text-center text-[0.9375rem] text-ink tabular placeholder:text-ink-3', seg.width)}
          />
          {i < SEGMENTS.length - 1 && (
            <span aria-hidden className="text-ink-3">
              /
            </span>
          )}
        </span>
      ))}
      {age !== null && age >= 0 && age <= 120 && (
        <span key={age} className="pop-in ml-1 rounded-full bg-brand-soft px-2.5 py-1 text-[0.8125rem] font-semibold text-brand" aria-live="polite">
          You&apos;re {age}
        </span>
      )}
    </div>
  );
}
