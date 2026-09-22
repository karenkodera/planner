import { differenceInCalendarDays, startOfDay } from 'date-fns';
import { CalendarEvent, Recurrence } from '../types/calendar';
import { eventTouchesDay } from './date';

export const RECURRENCE_OPTIONS: { value: Recurrence; label: string }[] = [
  { value: 'none', label: 'Does not repeat' },
  { value: 'daily', label: 'Every day' },
  { value: 'weekly', label: 'Every week' },
  { value: 'biweekly', label: 'Every 2 weeks' },
  { value: 'monthly', label: 'Every month' },
];

export function recurrenceLabel(recurrence?: Recurrence): string {
  const value = recurrence ?? 'none';
  return RECURRENCE_OPTIONS.find((o) => o.value === value)?.label ?? 'Does not repeat';
}

/** If this series has an occurrence on `day`, return a copy with that day's start/end. */
export function occurrenceOnDay(
  event: CalendarEvent,
  day: Date,
): CalendarEvent | null {
  const dayStart = startOfDay(day);
  const eventDay = startOfDay(event.start);
  if (dayStart.getTime() < eventDay.getTime()) return null;

  const recurrence = event.recurrence ?? 'none';
  if (recurrence === 'none') {
    return eventTouchesDay(event.start, event.end, day) ? event : null;
  }

  const daysDiff = differenceInCalendarDays(dayStart, eventDay);
  let matches = false;
  if (recurrence === 'daily') matches = true;
  else if (recurrence === 'weekly') matches = daysDiff % 7 === 0;
  else if (recurrence === 'biweekly') matches = daysDiff % 14 === 0;
  else if (recurrence === 'monthly') {
    matches = day.getDate() === event.start.getDate();
  }

  if (!matches) return null;

  const duration = event.end.getTime() - event.start.getTime();
  const start = new Date(day);
  start.setHours(event.start.getHours(), event.start.getMinutes(), 0, 0);
  const end = new Date(start.getTime() + duration);
  return { ...event, start, end };
}

export function colorWithAlpha(hex: string, alpha: number): string {
  const raw = hex.replace('#', '');
  const full =
    raw.length === 3
      ? raw
          .split('')
          .map((c) => c + c)
          .join('')
      : raw;
  if (full.length !== 6) return hex;
  const n = parseInt(full, 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
