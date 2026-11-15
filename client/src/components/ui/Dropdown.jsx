import { useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react';
import clsx from 'clsx';
import { Check, ChevronDown } from 'lucide-react';

/**
 * A themed replacement for the browser's <select>: options can carry an icon and a hint, the list opens
 * with a short animation, and an optional last row can be an action (like "New category…") rather than a value.
 *
 * Follows the ARIA "select-only combobox" pattern: focus stays on the control and the highlighted option
 * is announced through aria-activedescendant. Keys: arrows, Home/End, Enter/Space, Esc, and type-ahead.
 *
 * options: [{ value, label, icon?, hint?, disabled? }]   footer: { label, icon?, onSelect }
 */
export function Dropdown({ id, value, onChange, options, placeholder = 'Select…', footer, disabled = false, size = 'md', className, menuClassName, ...aria }) {
  const uid = useId().replace(/:/g, '');
  const listId = `dd-${uid}`;
  const optionId = (i) => `${listId}-${i}`;

  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [place, setPlace] = useState(null);
  const triggerRef = useRef(null);
  const listRef = useRef(null);
  const typed = useRef({ text: '', timer: 0 });

  // Every row the keyboard can land on: the options, then the footer action.
  const items = useMemo(
    () => [...options.map((o) => ({ ...o, kind: 'option' })), ...(footer ? [{ ...footer, kind: 'action', value: '__action__' }] : [])],
    [options, footer],
  );
  const selected = options.find((o) => o.value === value);
  const enabled = (i) => items[i] && !items[i].disabled;
  const firstEnabled = () => items.findIndex((_, i) => enabled(i));
  const lastEnabled = () => items.map((_, i) => i).reverse().find(enabled) ?? -1;
  const step = (from, dir) => {
    for (let i = from + dir; i >= 0 && i < items.length; i += dir) if (enabled(i)) return i;
    return from;
  };

  const close = useCallback((refocus = true) => {
    setOpen(false);
    if (refocus) triggerRef.current?.focus();
  }, []);

  const openList = () => {
    if (disabled) return;
    const current = items.findIndex((it) => it.kind === 'option' && it.value === value && !it.disabled);
    setActive(current >= 0 ? current : firstEnabled());
    setOpen(true);
  };

  const choose = (i) => {
    const item = items[i];
    if (!item || item.disabled) return;
    close();
    if (item.kind === 'action') item.onSelect?.();
    else onChange(item.value);
  };

  // Place the list under the control, or above it when there is no room below.
  useLayoutEffect(() => {
    if (!open || !triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const below = window.innerHeight - rect.bottom;
    const above = rect.top;
    const up = below < 240 && above > below;
    setPlace(
      up
        ? { left: rect.left, width: rect.width, bottom: window.innerHeight - rect.top + 6, maxHeight: Math.min(320, above - 14), up: true }
        : { left: rect.left, width: rect.width, top: rect.bottom + 6, maxHeight: Math.min(320, Math.max(160, below - 14)), up: false },
    );
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;
    const onPointer = (e) => {
      if (!triggerRef.current?.contains(e.target) && !listRef.current?.contains(e.target)) close(false);
    };
    const onScroll = (e) => {
      if (!listRef.current?.contains(e.target)) close(false);
    };
    document.addEventListener('mousedown', onPointer);
    window.addEventListener('scroll', onScroll, true);
    const onResize = () => close(false);
    window.addEventListener('resize', onResize);
    return () => {
      document.removeEventListener('mousedown', onPointer);
      window.removeEventListener('scroll', onScroll, true);
      window.removeEventListener('resize', onResize);
    };
  }, [open, close]);

  useEffect(() => {
    if (open && active >= 0) document.getElementById(optionId(active))?.scrollIntoView?.({ block: 'nearest' });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, active]);

  const onKeyDown = (e) => {
    if (disabled) return;
    const { key } = e;
    if (!open) {
      if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(key)) {
        e.preventDefault();
        openList();
      }
      return;
    }
    if (key === 'ArrowDown') setActive((a) => step(a, 1));
    else if (key === 'ArrowUp') setActive((a) => step(a, -1));
    else if (key === 'Home') setActive(firstEnabled());
    else if (key === 'End') setActive(lastEnabled());
    else if (key === 'Enter' || key === ' ') choose(active);
    else if (key === 'Escape') close();
    else if (key === 'Tab') close(false);
    else if (key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
      clearTimeout(typed.current.timer);
      typed.current.text += key.toLowerCase();
      typed.current.timer = setTimeout(() => (typed.current.text = ''), 600);
      const hit = items.findIndex((it, i) => enabled(i) && it.label.toLowerCase().startsWith(typed.current.text));
      if (hit >= 0) setActive(hit);
      return;
    } else return;
    e.preventDefault();
  };

  return (
    <div className={clsx('relative', className)}>
      <button
        ref={triggerRef}
        id={id}
        type="button"
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        aria-activedescendant={open && active >= 0 ? optionId(active) : undefined}
        disabled={disabled}
        onClick={() => (open ? close(false) : openList())}
        onKeyDown={onKeyDown}
        className={clsx('control flex w-full cursor-pointer items-center gap-2.5 rounded-[10px] bg-surface px-3 text-left text-[0.9375rem] text-ink', size === 'sm' ? 'h-9' : 'h-10')}
        {...aria}
      >
        {selected?.icon}
        <span className={clsx('min-w-0 flex-1 truncate', !selected && 'text-ink-3')}>{selected ? selected.label : placeholder}</span>
        <ChevronDown size={16} aria-hidden className={clsx('shrink-0 text-ink-3 transition-transform duration-200', open && 'rotate-180')} />
      </button>

      {open && (
        <ul
          ref={listRef}
          id={listId}
          role="listbox"
          tabIndex={-1}
          aria-label={aria['aria-label']}
          data-up={place?.up || undefined}
          onMouseDown={(e) => e.preventDefault()} // keep focus on the control
          style={place ? { position: 'fixed', left: place.left, width: place.width, top: place.top, bottom: place.bottom, maxHeight: place.maxHeight } : { position: 'fixed', visibility: 'hidden' }}
          className={clsx('menu-in raised z-[70] flex min-w-44 flex-col gap-0.5 overflow-auto rounded-xl bg-surface p-1.5 shadow-raise-2 scrollbar-thin', menuClassName)}
        >
          {items.map((item, i) => {
            const isSelected = item.kind === 'option' && item.value === value;
            return (
              <li
                key={`${item.kind}-${item.value}`}
                id={optionId(i)}
                role="option"
                aria-selected={isSelected}
                aria-disabled={item.disabled || undefined}
                style={{ '--i': i }}
                onMouseMove={() => !item.disabled && active !== i && setActive(i)}
                onClick={() => choose(i)}
                className={clsx(
                  'flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[0.9375rem] transition-colors duration-100',
                  item.disabled ? 'cursor-not-allowed opacity-45' : 'cursor-pointer',
                  active === i && !item.disabled && 'bg-surface-2',
                  isSelected && 'font-semibold',
                  item.kind === 'action' && 'mt-1 border-t border-line pt-2.5 font-semibold text-brand',
                )}
              >
                {item.icon}
                <span className="min-w-0 flex-1 truncate">{item.label}</span>
                {item.hint && <span className="shrink-0 text-[0.75rem] font-normal text-ink-3">{item.hint}</span>}
                {isSelected && <Check size={16} aria-hidden className="shrink-0 text-brand" />}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
