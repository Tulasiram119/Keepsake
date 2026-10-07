import {
  atDayOffset,
  daysSince,
  daysUntilBirthday,
  formatBirthday,
  formatDay,
  isValidBirthday,
  relativeDays,
  setHour,
  shiftDays,
} from '@/utils/dates';

const now = new Date(2026, 9, 7, 10, 0, 0); // 7 Oct 2026, 10:00 local

describe('daysSince', () => {
  it('counts calendar days, not 24h blocks', () => {
    expect(daysSince(new Date(2026, 9, 6, 23, 0).toISOString(), now)).toBe(1);
    expect(daysSince(new Date(2026, 9, 7, 1, 0).toISOString(), now)).toBe(0);
    expect(daysSince(new Date(2026, 8, 25, 12, 0).toISOString(), now)).toBe(12);
  });
});

describe('relativeDays', () => {
  it.each([
    [0, 'today'],
    [1, 'yesterday'],
    [12, '12 days ago'],
    [-1, 'tomorrow'],
    [-3, 'in 3 days'],
  ])('%i → %s', (days, text) => {
    expect(relativeDays(days)).toBe(text);
  });
});

describe('formatDay', () => {
  it('omits the year for the current year', () => {
    expect(formatDay(new Date(2026, 2, 3).toISOString(), now)).toBe('Tue, 3 Mar');
  });
  it('includes the year otherwise', () => {
    expect(formatDay(new Date(2025, 11, 25).toISOString(), now)).toBe('25 Dec 2025');
  });
});

describe('date arithmetic', () => {
  it('atDayOffset keeps time unless an hour is given', () => {
    const y = new Date(atDayOffset(now, -1));
    expect([y.getDate(), y.getHours()]).toEqual([6, 10]);
    const t = new Date(atDayOffset(now, 1, 18));
    expect([t.getDate(), t.getHours(), t.getMinutes()]).toEqual([8, 18, 0]);
  });
  it('shiftDays and setHour', () => {
    const base = now.toISOString();
    expect(new Date(shiftDays(base, 3)).getDate()).toBe(10);
    expect(new Date(setHour(base, 7)).getHours()).toBe(7);
  });
});

describe('birthdays', () => {
  it('validates MM-DD and YYYY-MM-DD', () => {
    expect(isValidBirthday('03-12')).toBe(true);
    expect(isValidBirthday('1994-03-12')).toBe(true);
    expect(isValidBirthday('13-01')).toBe(false);
    expect(isValidBirthday('3-12')).toBe(false);
    expect(isValidBirthday('')).toBe(false);
  });
  it('formats', () => {
    expect(formatBirthday('03-12')).toBe('12 Mar');
    expect(formatBirthday('1994-03-12')).toBe('12 Mar 1994');
  });
  it('counts days until the next birthday', () => {
    expect(daysUntilBirthday('10-07', now)).toBe(0);
    expect(daysUntilBirthday('10-19', now)).toBe(12);
    expect(daysUntilBirthday('1990-10-06', now)).toBe(364);
  });
});
