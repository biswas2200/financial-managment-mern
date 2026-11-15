import { MAX_AVATAR_CHARS } from '@kosha/shared';

/** The biggest square that fits in the middle of a picture. */
export function coverCrop(width, height) {
  const side = Math.min(width, height);
  return { sx: Math.round((width - side) / 2), sy: Math.round((height - side) / 2), side };
}

const MAX_FILE_BYTES = 8 * 1024 * 1024;

/**
 * Turns a picked file into a small square JPEG (as a data URL) in the browser, so only a few kilobytes
 * are ever sent or stored. Rejects with a message that can be shown to the user.
 */
export async function fileToAvatarDataUrl(file, { size = 256, maxChars = MAX_AVATAR_CHARS } = {}) {
  if (!/^image\/(png|jpeg|webp)$/.test(file.type)) throw new Error('Use a PNG, JPEG or WebP picture.');
  if (file.size > MAX_FILE_BYTES) throw new Error('That picture is over 8 MB. Pick a smaller one.');

  let bitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    throw new Error('That file is not a picture we can read.');
  }
  const { sx, sy, side } = coverCrop(bitmap.width, bitmap.height);
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#ffffff'; // transparent PNGs become white, not black, as JPEG
  ctx.fillRect(0, 0, size, size);
  ctx.drawImage(bitmap, sx, sy, side, side, 0, 0, size, size);
  bitmap.close?.();

  for (const quality of [0.85, 0.7, 0.55, 0.4]) {
    const url = canvas.toDataURL('image/jpeg', quality);
    if (url.length <= maxChars) return url;
  }
  throw new Error('That picture is too detailed to shrink enough. Try another one.');
}
