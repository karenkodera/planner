import { CalendarEvent, FreeSlot } from '../types/calendar';
import {
  addDays,
  addMinutes,
  atTime,
  differenceInMinutes,
  eventTouchesDay,
  format,
  getWeekDays,
  overlaps,
  slotDurationLabel,
} from '../utils/date';

const DAY_START = 8;
const DAY_END = 21;
const MIN_SLOT = 45;

type BusyInterval = { start: Date; end: Date };

function busyForPerson(
  events: CalendarEvent[],
  day: Date,
  owners: Array<CalendarEvent['owner']>,
): BusyInterval[] {
  return events
    .filter((e) => owners.includes(e.owner) && eventTouchesDay(e.start, e.end, day))
    .map((e) => ({ start: e.start, end: e.end }))
    .sort((a, b) => a.start.getTime() - b.start.getTime());
}

function mergeIntervals(intervals: BusyInterval[]): BusyInterval[] {
  if (!intervals.length) return [];
  const merged: BusyInterval[] = [{ ...intervals[0] }];
  for (let i = 1; i < intervals.length; i += 1) {
    const last = merged[merged.length - 1];
    const cur = intervals[i];
    if (cur.start <= last.end) {
      last.end = cur.end > last.end ? cur.end : last.end;
    } else {
      merged.push({ ...cur });
    }
  }
  return merged;
}

function freeGaps(busy: BusyInterval[], day: Date): BusyInterval[] {
  const windowStart = atTime(day, DAY_START);
  const windowEnd = atTime(day, DAY_END);
  const merged = mergeIntervals(
    busy.filter((b) => overlaps(b.start, b.end, windowStart, windowEnd)),
  );
  const gaps: BusyInterval[] = [];
  let cursor = windowStart;
  for (const block of merged) {
    const start = block.start < windowStart ? windowStart : block.start;
    const end = block.end > windowEnd ? windowEnd : block.end;
    if (start > cursor) gaps.push({ start: cursor, end: start });
    cursor = end > cursor ? end : cursor;
  }
  if (cursor < windowEnd) gaps.push({ start: cursor, end: windowEnd });
  return gaps.filter((g) => differenceInMinutes(g.end, g.start) >= MIN_SLOT);
}

/** Intersect two free lists to find mutual availability. */
function intersectGaps(a: BusyInterval[], b: BusyInterval[]): BusyInterval[] {
  const result: BusyInterval[] = [];
  let i = 0;
  let j = 0;
  while (i < a.length && j < b.length) {
    const start = a[i].start > b[j].start ? a[i].start : b[j].start;
    const end = a[i].end < b[j].end ? a[i].end : b[j].end;
    if (start < end && differenceInMinutes(end, start) >= MIN_SLOT) {
      result.push({ start, end });
    }
    if (a[i].end < b[j].end) i += 1;
    else j += 1;
  }
  return result;
}

export function findMutualFreeSlots(
  events: CalendarEvent[],
  weekAnchor: Date,
  maxSlots = 8,
): FreeSlot[] {
  const days = getWeekDays(weekAnchor);
  const slots: FreeSlot[] = [];

  for (const day of days) {
    const mine = freeGaps(busyForPerson(events, day, ['me', 'shared']), day);
    const theirs = freeGaps(busyForPerson(events, day, ['partner', 'shared']), day);
    const mutual = intersectGaps(mine, theirs);

    for (const gap of mutual) {
      // Prefer mid-length windows; cap display length at 2h chunks for quick picks
      let cursor = gap.start;
      while (differenceInMinutes(gap.end, cursor) >= MIN_SLOT) {
        const chunkEnd =
          differenceInMinutes(gap.end, cursor) > 120
            ? addMinutes(cursor, 120)
            : gap.end;
        const durationMinutes = differenceInMinutes(chunkEnd, cursor);
        slots.push({
          id: `slot-${day.toISOString()}-${cursor.toISOString()}`,
          start: cursor,
          end: chunkEnd,
          dayLabel: format(day, 'EEE d'),
          timeLabel: `${format(cursor, 'h:mm a')} – ${format(chunkEnd, 'h:mm a')}`,
          durationMinutes,
        });
        if (slots.length >= maxSlots) return slots;
        cursor = chunkEnd;
        if (differenceInMinutes(gap.end, cursor) < MIN_SLOT) break;
        // Skip a little so we don't flood with adjacent 2h blocks
        cursor = addMinutes(cursor, 30);
      }
    }
  }

  return slots;
}

export function suggestAlternateTime(
  events: CalendarEvent[],
  proposedStart: Date,
  durationMinutes: number,
): { start: Date; end: Date } | null {
  const weekAnchor = proposedStart;
  const slots = findMutualFreeSlots(events, weekAnchor, 20);
  const preferred = slots.find(
    (s) =>
      s.start.getTime() !== proposedStart.getTime()
      && differenceInMinutes(s.end, s.start) >= durationMinutes,
  );
  if (!preferred) return null;
  return {
    start: preferred.start,
    end: addMinutes(preferred.start, durationMinutes),
  };
}

export { slotDurationLabel, addDays };
