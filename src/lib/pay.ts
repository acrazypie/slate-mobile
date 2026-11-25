// Earnings and overtime for the summary. Pay comes from shifts only, minus
// their unpaid breaks (see paidShiftMinutes). Overtime is counted per
// Monday-to-Sunday week: hours above the weekly limit are paid at the
// multiplier. Pure functions, so the rules are tested without the UI.

import type { PaySettings } from '../data/schema';

export interface WeekMinutes {
  /** Monday of the week, 'yyyy-MM-dd'. */
  weekStart: string;
  minutes: number;
}

export interface PayTotals {
  regularMinutes: number;
  overtimeMinutes: number;
  /** null when no hourly rate is set. Rounded to cents. */
  amount: number | null;
}

export function computePay(weeks: WeekMinutes[], pay: PaySettings): PayTotals {
  const limit = pay.overtimeAfterHours === null ? Infinity : pay.overtimeAfterHours * 60;
  let regularMinutes = 0;
  let overtimeMinutes = 0;
  let amount = 0;
  for (const week of weeks) {
    const regular = Math.min(week.minutes, limit);
    const overtime = week.minutes - regular;
    regularMinutes += regular;
    overtimeMinutes += overtime;
    if (pay.hourlyRate !== null) {
      amount += (regular / 60) * pay.hourlyRate + (overtime / 60) * pay.hourlyRate * pay.overtimeMultiplier;
    }
  }
  return {
    regularMinutes,
    overtimeMinutes,
    amount: pay.hourlyRate === null ? null : Math.round(amount * 100) / 100,
  };
}

/** "1 234,50 €" in the device's locale; the currency is optional. */
export function formatMoney(amount: number, currency: string, locale: string): string {
  const number = new Intl.NumberFormat(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount);
  return currency ? `${number} ${currency}` : number;
}
