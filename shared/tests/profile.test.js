import { describe, it, expect } from 'vitest';
import {
  normalizePhone,
  ageFromDob,
  AVATAR_PRESETS,
  POLICY_VERSION,
  MIN_AGE,
} from '../src/profile.js';
import {
  registerSchema,
  updateProfileSchema,
  avatarSchema,
  setBalanceFormSchema,
  setBalanceApiSchema,
} from '../src/schemas.js';
import { toSignedMinor } from '../src/money.js';
import { firstTrackedMonth } from '../src/dates.js';

describe('normalizePhone', () => {
  it('turns common Indian formats into E.164', () => {
    for (const input of ['9876543210', '98765 43210', '+91 98765-43210', '09876543210', '(+91) 9876543210']) {
      expect(normalizePhone(input), input).toBe('+919876543210');
    }
  });

  it('keeps a valid international number', () => {
    expect(normalizePhone('+1 415 555 2671')).toBe('+14155552671');
  });

  it('rejects numbers that cannot be real', () => {
    for (const input of ['12345', '5876543210', 'call me', '+91 12345', '98765432101234567']) {
      expect(normalizePhone(input), input).toBeNull();
    }
  });
});

describe('ageFromDob', () => {
  const now = new Date('2026-11-16T10:00:00+05:30');
  it('counts whole years and respects the birthday', () => {
    expect(ageFromDob('2000-11-16', now)).toBe(26);
    expect(ageFromDob('2000-11-17', now)).toBe(25);
    expect(ageFromDob('2013-11-16', now)).toBe(13);
  });
});

describe('registerSchema (consent, phone, date of birth)', () => {
  const base = { name: 'Asha Rao', email: 'asha@example.com', password: 'secret123', acceptedTerms: true };

  it('needs the Terms and Privacy Policy to be accepted', () => {
    const missing = registerSchema.safeParse({ ...base, acceptedTerms: false });
    expect(missing.success).toBe(false);
    expect(missing.error.issues[0].path).toEqual(['acceptedTerms']);
    expect(missing.error.issues[0].message).toMatch(/terms/i);
    expect(registerSchema.safeParse({ ...base, acceptedTerms: undefined }).success).toBe(false);
  });

  it('keeps phone and date of birth optional, and normalises the phone', () => {
    expect(registerSchema.parse(base)).toEqual({ ...base, email: 'asha@example.com' });
    const full = registerSchema.parse({ ...base, phone: '98765 43210', dateOfBirth: '1999-04-02' });
    expect(full).toMatchObject({ phone: '+919876543210', dateOfBirth: '1999-04-02' });
    expect(registerSchema.parse({ ...base, phone: '', dateOfBirth: '' })).toMatchObject({ phone: null, dateOfBirth: null });
  });

  it('refuses a bad phone, an impossible date, a future date and anyone under the minimum age', () => {
    expect(registerSchema.safeParse({ ...base, phone: '12345' }).success).toBe(false);
    expect(registerSchema.safeParse({ ...base, dateOfBirth: '2001-02-30' }).success).toBe(false);
    expect(registerSchema.safeParse({ ...base, dateOfBirth: '2999-01-01' }).success).toBe(false);
    const young = new Date();
    young.setFullYear(young.getFullYear() - (MIN_AGE - 1));
    const result = registerSchema.safeParse({ ...base, dateOfBirth: young.toISOString().slice(0, 10) });
    expect(result.success).toBe(false);
    expect(result.error.issues[0].message).toContain(String(MIN_AGE));
  });
});

describe('avatarSchema', () => {
  it('accepts a preset icon with a colour', () => {
    expect(avatarSchema.safeParse({ type: 'preset', preset: AVATAR_PRESETS[0], color: '#2a78d6' }).success).toBe(true);
  });

  it('rejects an unknown preset or a malformed colour', () => {
    expect(avatarSchema.safeParse({ type: 'preset', preset: 'not-an-icon', color: '#2a78d6' }).success).toBe(false);
    expect(avatarSchema.safeParse({ type: 'preset', preset: AVATAR_PRESETS[0], color: 'blue' }).success).toBe(false);
  });

  it('accepts a small uploaded image and nothing else', () => {
    const png = 'data:image/png;base64,iVBORw0KGgo=';
    expect(avatarSchema.safeParse({ type: 'image', image: png }).success).toBe(true);
    expect(avatarSchema.safeParse({ type: 'image', image: 'https://example.com/me.png' }).success).toBe(false);
    expect(avatarSchema.safeParse({ type: 'image', image: 'data:text/html;base64,PHNjcmlwdD4=' }).success).toBe(false);
    expect(avatarSchema.safeParse({ type: 'image', image: `data:image/jpeg;base64,${'A'.repeat(100_000)}` }).success).toBe(false);
  });
});

describe('updateProfileSchema', () => {
  it('lets phone, date of birth and avatar be set or cleared', () => {
    const r = updateProfileSchema.parse({ name: 'Asha', phone: '', dateOfBirth: null, avatar: null });
    expect(r).toEqual({ name: 'Asha', phone: null, dateOfBirth: null, avatar: null });
  });
});

describe('balance', () => {
  it('toSignedMinor reads rupees with an optional minus sign, and allows zero', () => {
    expect(toSignedMinor('1,234.50')).toBe(123450);
    expect(toSignedMinor('-250')).toBe(-25000);
    expect(toSignedMinor('0')).toBe(0);
    expect(() => toSignedMinor('abc')).toThrow(/valid amount/i);
  });

  it('the form schema turns rupees into signed paise', () => {
    expect(setBalanceFormSchema.parse({ balance: '-3,82,264.50' })).toEqual({ balance: -38226450 });
  });

  it('the API schema wants whole paise within a sane range', () => {
    expect(setBalanceApiSchema.safeParse({ balance: -500 }).success).toBe(true);
    expect(setBalanceApiSchema.safeParse({ balance: 10.5 }).success).toBe(false);
    expect(setBalanceApiSchema.safeParse({ balance: 1e15 }).success).toBe(false);
  });
});

describe('firstTrackedMonth', () => {
  it('is the earlier of the sign-up month and the oldest transaction', () => {
    expect(firstTrackedMonth({ accountCreatedAt: '2026-11-03T08:00:00Z', oldestTransactionDate: '2025-12-02T08:00:00Z' })).toBe('2025-12');
    expect(firstTrackedMonth({ accountCreatedAt: '2026-11-03T08:00:00Z' })).toBe('2026-11');
    expect(firstTrackedMonth({ accountCreatedAt: '2026-11-03T08:00:00Z', oldestTransactionDate: '2026-12-01T08:00:00Z' })).toBe('2026-11');
  });
});

describe('policy version', () => {
  it('is a date so each consent can be traced to the text the user saw', () => {
    expect(POLICY_VERSION).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
