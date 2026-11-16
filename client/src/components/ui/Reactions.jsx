import clsx from 'clsx';
import { ThumbsUp, ThumbsDown } from 'lucide-react';
import { formatCount } from '@kosha/shared';

/**
 * Like and dislike, each with its own count. Both are shown as plain positive numbers: the two are never
 * netted into one score, and a count can never appear below zero.
 * `onChange(value)` gets 'like', 'dislike', or null when you press the one you had already chosen.
 */
export function Reactions({ likes, dislikes, myReaction, onChange, disabled = false, className }) {
  const options = [
    { value: 'like', label: 'Like', icon: ThumbsUp, count: likes, tone: 'text-income-text bg-income/12' },
    { value: 'dislike', label: 'Dislike', icon: ThumbsDown, count: dislikes, tone: 'text-bad-text bg-bad/10' },
  ];
  return (
    <div className={clsx('inline-flex items-center gap-1', className)}>
      {options.map(({ value, label, icon: Icon, count, tone }) => {
        const pressed = myReaction === value;
        return (
          <button
            key={value}
            type="button"
            aria-label={`${label}, ${formatCount(count)}`}
            aria-pressed={pressed}
            disabled={disabled}
            onClick={() => onChange?.(pressed ? null : value)}
            className={clsx(
              'inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-sm font-medium transition-[background-color,color,transform] duration-200 active:scale-90 disabled:cursor-not-allowed disabled:opacity-60',
              pressed ? tone : 'text-ink-2 hover:bg-surface-2 hover:text-ink',
            )}
          >
            <Icon size={15} aria-hidden className={clsx('transition-transform duration-200', pressed && 'scale-110')} fill={pressed ? 'currentColor' : 'none'} />
            <span className="tabular" aria-hidden>
              {formatCount(count)}
            </span>
          </button>
        );
      })}
    </div>
  );
}
