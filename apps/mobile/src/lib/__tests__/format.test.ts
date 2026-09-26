import { formatDuration, initialsOf } from '@/lib/format';

describe('formatDuration', () => {
  it('writes minutes and padded seconds, the same in every language', () => {
    expect(formatDuration(154_000)).toBe('2:34');
    expect(formatDuration(5_000)).toBe('0:05');
    expect(formatDuration(-1)).toBe('0:00');
  });
});

describe('initialsOf', () => {
  it('takes up to two letters or digits from the start of a name', () => {
    expect(initialsOf('ekin')).toBe('EK');
    expect(initialsOf('k.ubi')).toBe('KU');
    expect(initialsOf('***')).toBe('?');
  });
});
