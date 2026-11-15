import { useRef, useState } from 'react';
import clsx from 'clsx';
import { AVATAR_COLORS, AVATAR_PRESETS } from '@kosha/shared';
import { ImagePlus, Loader, Undo2 } from 'lucide-react';
import { Avatar, AVATAR_ICONS } from '../../components/ui/Avatar.jsx';
import { fileToAvatarDataUrl } from '../../lib/image.js';

/**
 * Choose a profile picture: an icon on a colour, or your own photo (shrunk in the browser first).
 * `value` is null (initials), { type: 'preset', preset, color } or { type: 'image', image }.
 */
export function AvatarPicker({ name, value, onChange }) {
  const fileRef = useRef(null);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const isPreset = value?.type === 'preset';
  const color = isPreset ? value.color : AVATAR_COLORS[0];

  const upload = async (file) => {
    if (!file) return;
    setError(null);
    setBusy(true);
    try {
      onChange({ type: 'image', image: await fileToAvatarDataUrl(file) });
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:gap-6">
      <div className="flex flex-row items-center gap-4 sm:flex-col sm:items-center">
        <Avatar user={{ name, avatar: value }} size={88} className="transition-transform duration-300" />
        <div className="flex flex-col gap-1.5">
          <label className="btn-3d-soft inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-lg bg-surface px-3 text-sm font-semibold hover:bg-surface-2 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-brand">
            {busy ? <Loader size={15} className="animate-spin" aria-hidden /> : <ImagePlus size={15} aria-hidden />}
            Upload a photo
            <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" onChange={(e) => upload(e.target.files?.[0])} />
          </label>
          <button
            type="button"
            disabled={!value}
            onClick={() => onChange(null)}
            className="inline-flex h-8 items-center justify-center gap-1.5 rounded-lg text-[0.8125rem] font-medium text-ink-2 transition-colors hover:bg-surface-2 hover:text-ink disabled:opacity-45"
          >
            <Undo2 size={13} aria-hidden />
            Use my initials
          </button>
        </div>
      </div>

      <div className="min-w-0 flex-1">
        {error && (
          <p role="alert" className="mb-3 rounded-lg bg-bad/10 px-3 py-2 text-sm text-bad-text">
            {error}
          </p>
        )}
        <p className="mb-2 text-sm font-medium text-ink-2">Or pick an icon</p>
        <div className="flex flex-wrap gap-1.5">
          {AVATAR_PRESETS.map((preset) => {
            const Icon = AVATAR_ICONS[preset];
            const selected = isPreset && value.preset === preset;
            return (
              <button
                key={preset}
                type="button"
                aria-label={`Use the ${preset} icon`}
                aria-pressed={selected}
                onClick={() => onChange({ type: 'preset', preset, color })}
                className={clsx(
                  'flex h-10 w-10 items-center justify-center rounded-xl bg-surface-2 text-ink-2 transition-[transform,background-color,box-shadow] duration-150 hover:scale-110 hover:text-ink active:scale-95',
                  selected && 'bg-brand-soft text-brand ring-2 ring-brand',
                )}
              >
                <Icon size={19} aria-hidden />
              </button>
            );
          })}
        </div>
        <p className="mt-4 mb-2 text-sm font-medium text-ink-2">Background</p>
        <div className="flex flex-wrap gap-2">
          {AVATAR_COLORS.map((c) => (
            <button
              key={c}
              type="button"
              aria-label={`Background ${c}`}
              aria-pressed={isPreset && value.color === c}
              disabled={!isPreset}
              title={isPreset ? undefined : 'Pick an icon first'}
              onClick={() => onChange({ ...value, color: c })}
              className="h-7 w-7 rounded-full ring-offset-2 ring-offset-surface transition-transform duration-150 hover:scale-110 disabled:opacity-40 disabled:hover:scale-100 aria-pressed:scale-110 aria-pressed:ring-2 aria-pressed:ring-ink"
              style={{ background: c }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
