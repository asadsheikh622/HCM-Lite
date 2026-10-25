import { IHoliday } from '../types';

export function calculateWorkingDaysBetween(
  startDateStr: string,
  endDateStr: string,
  weekendDays: number[] = [0, 6],
  holidays: IHoliday[] = []
): number {
  const start = new Date(startDateStr);
  const end = new Date(endDateStr);

  if (start > end) return 0;

  const holidaySet = new Set(holidays.map((h) => h.date));
  let count = 0;
  const current = new Date(start);

  while (current <= end) {
    const dayOfWeek = current.getDay();
    const isoDate = current.toISOString().split('T')[0];

    const isWeekend = weekendDays.includes(dayOfWeek);
    const isHoliday = holidaySet.has(isoDate);

    if (!isWeekend && !isHoliday) {
      count++;
    }

    current.setDate(current.getDate() + 1);
  }

  return count;
}

export function doDatesOverlap(startA: string, endA: string, startB: string, endB: string): boolean {
  return startA <= endB && startB <= endA;
}
