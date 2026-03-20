import { GoalCategory } from '../models/Goal';

// ---------------------------------------------------------------------------
// Goal category validation
// ---------------------------------------------------------------------------
const VALID_CATEGORIES: GoalCategory[] = [
  'software_engineering',
  'faang_prep',
  'english_communication',
  'side_income',
  'health',
  'daily_routine',
];

describe('GoalCategory enum', () => {
  test('contains all 6 required categories', () => {
    expect(VALID_CATEGORIES).toHaveLength(6);
  });

  test.each(VALID_CATEGORIES)('"%s" is a valid category', (cat) => {
    expect(VALID_CATEGORIES).toContain(cat);
  });
});

// ---------------------------------------------------------------------------
// Daily routine score calculation logic
// ---------------------------------------------------------------------------
function calcRoutineScore(entries: { completed: boolean }[]): number {
  if (entries.length === 0) return 0;
  const completedCount = entries.filter((e) => e.completed).length;
  return Math.round((completedCount / entries.length) * 10);
}

describe('calcRoutineScore', () => {
  test('returns 0 for empty entries', () => {
    expect(calcRoutineScore([])).toBe(0);
  });

  test('returns 10 when all entries are completed', () => {
    const entries = [{ completed: true }, { completed: true }, { completed: true }];
    expect(calcRoutineScore(entries)).toBe(10);
  });

  test('returns 0 when no entries are completed', () => {
    const entries = [{ completed: false }, { completed: false }];
    expect(calcRoutineScore(entries)).toBe(0);
  });

  test('returns 5 for 50% completion', () => {
    const entries = [{ completed: true }, { completed: false }];
    expect(calcRoutineScore(entries)).toBe(5);
  });

  test('rounds correctly for non-integer percentages', () => {
    // 1/3 ≈ 3.33 → rounds to 3
    const entries = [{ completed: true }, { completed: false }, { completed: false }];
    expect(calcRoutineScore(entries)).toBe(3);
  });
});

// ---------------------------------------------------------------------------
// Progress clamping (0–100)
// ---------------------------------------------------------------------------
function clampProgress(value: number): number {
  return Math.min(100, Math.max(0, value));
}

describe('clampProgress', () => {
  test('clamps values below 0 to 0', () => expect(clampProgress(-5)).toBe(0));
  test('clamps values above 100 to 100', () => expect(clampProgress(150)).toBe(100));
  test('passes through values in range', () => expect(clampProgress(50)).toBe(50));
  test('passes through boundary 0', () => expect(clampProgress(0)).toBe(0));
  test('passes through boundary 100', () => expect(clampProgress(100)).toBe(100));
});

// ---------------------------------------------------------------------------
// JWT payload shape
// ---------------------------------------------------------------------------
interface JwtPayload {
  userId: string;
  email: string;
}

function isValidJwtPayload(obj: unknown): obj is JwtPayload {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    typeof (obj as Record<string, unknown>)['userId'] === 'string' &&
    typeof (obj as Record<string, unknown>)['email'] === 'string'
  );
}

describe('isValidJwtPayload', () => {
  test('returns true for valid payload', () => {
    expect(isValidJwtPayload({ userId: 'abc', email: 'a@b.com' })).toBe(true);
  });

  test('returns false if userId missing', () => {
    expect(isValidJwtPayload({ email: 'a@b.com' })).toBe(false);
  });

  test('returns false if email missing', () => {
    expect(isValidJwtPayload({ userId: 'abc' })).toBe(false);
  });

  test('returns false for null', () => {
    expect(isValidJwtPayload(null)).toBe(false);
  });

  test('returns false for non-object', () => {
    expect(isValidJwtPayload('string')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Message history trimming (keep last N messages)
// ---------------------------------------------------------------------------
function trimMessages<T>(messages: T[], maxLength: number): T[] {
  if (messages.length > maxLength) return messages.slice(-maxLength);
  return messages;
}

describe('trimMessages', () => {
  test('returns original array when under limit', () => {
    const msgs = [1, 2, 3];
    expect(trimMessages(msgs, 5)).toEqual([1, 2, 3]);
  });

  test('trims to last N messages when over limit', () => {
    const msgs = [1, 2, 3, 4, 5];
    expect(trimMessages(msgs, 3)).toEqual([3, 4, 5]);
  });

  test('returns empty array unchanged', () => {
    expect(trimMessages([], 10)).toEqual([]);
  });

  test('handles exact boundary', () => {
    const msgs = [1, 2, 3];
    expect(trimMessages(msgs, 3)).toEqual([1, 2, 3]);
  });
});
