import { ICompany, IHoliday } from '../types';

export interface ITaxBreakdown {
  annualGross: number;
  annualTax: number;
  monthlyTax: number;
  slab: string;
}

export function calculateAnnualTax(annualGross: number): ITaxBreakdown {
  let annualTax = 0;
  let slab = '0% (Up to 600,000)';

  if (annualGross <= 600000) {
    annualTax = 0;
    slab = '0% (Below 600,000 threshold)';
  } else if (annualGross <= 1200000) {
    annualTax = (annualGross - 600000) * 0.05;
    slab = '5% on excess over 600,000';
  } else if (annualGross <= 2400000) {
    annualTax = 30000 + (annualGross - 1200000) * 0.15;
    slab = '30,000 + 15% on excess over 1,200,000';
  } else if (annualGross <= 3600000) {
    annualTax = 210000 + (annualGross - 2400000) * 0.25;
    slab = '210,000 + 25% on excess over 2,400,000';
  } else {
    annualTax = 510000 + (annualGross - 3600000) * 0.35;
    slab = '510,000 + 35% on excess over 3,600,000';
  }

  const roundedAnnual = Math.round(annualTax);
  const monthlyTax = Math.round(roundedAnnual / 12);

  return {
    annualGross,
    annualTax: roundedAnnual,
    monthlyTax,
    slab,
  };
}

export function getWorkingDaysInMonth(
  year: number,
  monthIndex: number, // 0-based
  weekendDays: number[] = [0, 6],
  holidays: IHoliday[] = []
): number {
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  let count = 0;

  const holidayDates = new Set(
    holidays.map((h) => {
      // YYYY-MM-DD
      const parts = h.date.split('-');
      return `${parseInt(parts[1], 10)}-${parseInt(parts[2], 10)}`;
    })
  );

  for (let day = 1; day <= daysInMonth; day++) {
    const d = new Date(year, monthIndex, day);
    const dayOfWeek = d.getDay();
    const dateKey = `${monthIndex + 1}-${day}`;

    // Skip weekends
    if (weekendDays.includes(dayOfWeek)) continue;
    // Skip holidays
    if (holidayDates.has(dateKey)) continue;

    count++;
  }

  return Math.max(count, 1); // Avoid division by zero
}
