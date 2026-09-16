import {
  addDays,
  addMinutes,
  differenceInMinutes,
  eachDayOfInterval,
  endOfDay,
  endOfMonth,
  format,
  isSameDay,
  isSameMonth,
  isWithinInterval,
  max,
  min,
  setHours,
  setMinutes,
  startOfDay,
  startOfMonth,
  startOfWeek,
} from 'date-fns';

export const WEEK_STARTS_ON = 1 as const; // Monday

export function getWeekDays(anchor: Date): Date[] {
  const start = startOfWeek(anchor, { weekStartsOn: WEEK_STARTS_ON });
  return eachDayOfInterval({ start, end: addDays(start, 6) });
}

/** Full calendar grid (Mon–Sun) covering the month of `anchor`. */
export function getMonthGrid(anchor: Date): Date[] {
  const monthStart = startOfMonth(anchor);
  const monthEnd = endOfMonth(anchor);
  const gridStart = startOfWeek(monthStart, { weekStartsOn: WEEK_STARTS_ON });
  const gridEnd = addDays(startOfWeek(monthEnd, { weekStartsOn: WEEK_STARTS_ON }), 6);
  return eachDayOfInterval({ start: gridStart, end: gridEnd });
}

export { isSameMonth, startOfMonth, endOfMonth };

export function weekLabel(anchor: Date, today: Date = new Date()): string {
  const days = getWeekDays(anchor);
  const todayWeek = getWeekDays(today);
  if (isSameDay(days[0], todayWeek[0])) {
    return 'This week';
  }
  const start = days[0];
  const end = days[6];
  if (start.getMonth() === end.getMonth()) {
    return `${format(start, 'MMM d')} – ${format(end, 'd')}`;
  }
  return `${format(start, 'MMM d')} – ${format(end, 'MMM d')}`;
}

export function formatEventTime(start: Date, end: Date): string {
  return `${format(start, 'h:mm a')} – ${format(end, 'h:mm a')}`;
}

export function minutesFromDayStart(date: Date, dayStartHour = 7): number {
  return date.getHours() * 60 + date.getMinutes() - dayStartHour * 60;
}

export function overlaps(aStart: Date, aEnd: Date, bStart: Date, bEnd: Date): boolean {
  return aStart < bEnd && bStart < aEnd;
}

export function clampToDay(date: Date, day: Date): { start: Date; end: Date } {
  return {
    start: max([date, startOfDay(day)]),
    end: min([date, endOfDay(day)]),
  };
}

export function eventTouchesDay(start: Date, end: Date, day: Date): boolean {
  return isWithinInterval(start, { start: startOfDay(day), end: endOfDay(day) })
    || isWithinInterval(end, { start: startOfDay(day), end: endOfDay(day) })
    || (start < startOfDay(day) && end > endOfDay(day))
    || isSameDay(start, day);
}

export function atTime(day: Date, hour: number, minute = 0): Date {
  return setMinutes(setHours(day, hour), minute);
}

export function slotDurationLabel(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
}

export { addDays, addMinutes, differenceInMinutes, format, isSameDay, startOfDay };
