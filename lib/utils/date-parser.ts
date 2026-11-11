import { parseISO, startOfDay, endOfDay, subDays, startOfWeek, endOfWeek, getDay, parse, isValid } from 'date-fns';

export interface DateRange {
  start: Date;
  end: Date;
}

export function parseRelativeDate(text: string, _userTimezone: string): DateRange {
  const now = new Date();
  const normalized = text.toLowerCase().trim();

  // ISO date passthrough
  if (/^\d{4}-\d{2}-\d{2}/.test(text)) {
    const parsed = parseISO(text);
    if (isValid(parsed)) {
      return { start: startOfDay(parsed), end: endOfDay(parsed) };
    }
  }

  // yesterday
  if (normalized === 'yesterday') {
    const yesterday = subDays(now, 1);
    return { start: startOfDay(yesterday), end: endOfDay(yesterday) };
  }

  // this morning
  if (normalized === 'this morning') {
    const start = startOfDay(now);
    const end = new Date(start);
    end.setHours(12, 0, 0, 0);
    return { start, end };
  }

  // last week
  if (normalized === 'last week') {
    const lastWeekEnd = endOfWeek(subDays(now, 7), { weekStartsOn: 1 });
    const lastWeekStart = startOfWeek(subDays(now, 7), { weekStartsOn: 1 });
    return { start: lastWeekStart, end: lastWeekEnd };
  }

  // Named weekday: "Monday", "last Tuesday"
  const weekdayMatch = normalized.match(/^(?:last\s+)?(?:monday|tuesday|wednesday|thursday|friday|saturday|sunday)$/);
  if (weekdayMatch) {
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const dayName = normalized.replace('last ', '');
    const targetDay = dayNames.indexOf(dayName);
    const currentDay = getDay(now);

    let daysBack = currentDay - targetDay;
    if (daysBack <= 0) daysBack += 7; // go to previous occurrence

    const targetDate = subDays(now, daysBack);
    return { start: startOfDay(targetDate), end: endOfDay(targetDate) };
  }

  // "November 3" or "3 November"
  const monthDayMatch = normalized.match(/(?:(\d{1,2})\s+(january|february|march|april|may|june|july|august|september|october|november|december))|((?:january|february|march|april|may|june|july|august|september|october|november|december))\s+(\d{1,2})/);
  if (monthDayMatch) {
    const day = monthDayMatch[1] || monthDayMatch[4];
    const month = monthDayMatch[2] || monthDayMatch[3];
    const currentYear = now.getFullYear();

    const tryParse = (year: number) => parse(`${month} ${day} ${year}`, 'MMMM d yyyy', now);
    let parsed = tryParse(currentYear);

    // if future, try last year
    if (parsed > now) {
      parsed = tryParse(currentYear - 1);
    }

    if (isValid(parsed)) {
      return { start: startOfDay(parsed), end: endOfDay(parsed) };
    }
  }

  // fallback: return today
  return { start: startOfDay(now), end: endOfDay(now) };
}

export function extractDateReference(text: string): string | null {
  const patterns = [
    /\b(?:last\s+)?(?:monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/i,
    /\b(?:yesterday|today|tomorrow)\b/i,
    /\b(?:last|this)\s+(?:week|month|year|morning|evening)\b/i,
    /\b(?:january|february|march|april|may|june|july|august|september|october|november|december)\s+\d{1,2}\b/i,
    /\b\d{1,2}\s+(?:january|february|march|april|may|june|july|august|september|october|november|december)\b/i,
    /\b\d{4}-\d{2}-\d{2}\b/,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) return match[0];
  }

  return null;
}
