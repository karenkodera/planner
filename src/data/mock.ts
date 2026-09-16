import { CalendarEvent, CoupleProfile, SharedRequest } from '../types/calendar';
import { addDays, atTime } from '../utils/date';

/** Anchor week around Tue Sep 15, 2026 */
export const TODAY = new Date(2026, 8, 15, 10, 30, 0);

const mon = new Date(2026, 8, 14);
const tue = addDays(mon, 1);
const wed = addDays(mon, 2);
const thu = addDays(mon, 3);
const fri = addDays(mon, 4);
const sat = addDays(mon, 5);
const sun = addDays(mon, 6);

export const couple: CoupleProfile = {
  me: { id: 'me', name: 'Karen', shortName: 'You', initial: 'K' },
  partner: { id: 'partner', name: 'Thomas', shortName: 'Thomas', initial: 'T' },
};

/**
 * After-work / out-of-house / together plans only.
 * Weekdays: nothing before 5:00pm.
 */
export const mockEvents: CalendarEvent[] = [
  {
    id: 'e0',
    title: 'Team drinks',
    location: 'The Drake',
    start: atTime(mon, 18, 30),
    end: atTime(mon, 20, 30),
    owner: 'partner',
  },
  {
    id: 'e1',
    title: 'Dinner with Chloe',
    location: 'Bar Isabel',
    start: atTime(tue, 19, 0),
    end: atTime(tue, 21, 0),
    owner: 'me',
  },
  {
    id: 'e2',
    title: 'Climbing gym',
    location: 'Basecamp',
    start: atTime(wed, 18, 30),
    end: atTime(wed, 20, 30),
    owner: 'partner',
  },
  {
    id: 'e3',
    title: 'Yoga',
    location: 'River Studio',
    start: atTime(thu, 18, 0),
    end: atTime(thu, 19, 0),
    owner: 'me',
  },
  {
    id: 'e4',
    title: 'Pub with teammates',
    location: 'The Drake',
    start: atTime(thu, 19, 30),
    end: atTime(thu, 22, 0),
    owner: 'partner',
  },
  {
    id: 'e5',
    title: 'Date night',
    location: 'Velvet Room',
    start: atTime(fri, 19, 30),
    end: atTime(fri, 22, 0),
    owner: 'shared',
    notes: 'Reservation under Thomas',
  },
  {
    id: 'e6',
    title: 'Climbing',
    location: 'Basecamp',
    start: atTime(sat, 17, 0),
    end: atTime(sat, 19, 0),
    owner: 'partner',
  },
  {
    id: 'e7',
    title: 'Dinner together',
    location: 'Home',
    start: atTime(sat, 19, 30),
    end: atTime(sat, 21, 0),
    owner: 'shared',
  },
  {
    id: 'e8',
    title: 'Dinner with parents',
    location: 'North End',
    start: atTime(sun, 17, 30),
    end: atTime(sun, 20, 0),
    owner: 'me',
  },
];

export const mockRequests: SharedRequest[] = [
  {
    id: 'r1',
    title: 'Evening walk',
    notes: 'Quick stroll after you’re back?',
    location: 'Riverside',
    proposedStart: atTime(sun, 20, 15),
    proposedEnd: atTime(sun, 21, 15),
    from: 'partner',
    status: 'pending',
    createdAt: atTime(tue, 20, 0),
  },
  {
    id: 'r2',
    title: 'Catch a movie?',
    notes: 'Something light after work',
    location: 'Scotiabank Theatre',
    proposedStart: atTime(wed, 19, 30),
    proposedEnd: atTime(wed, 21, 30),
    from: 'me',
    status: 'pending',
    createdAt: atTime(tue, 12, 0),
  },
];
