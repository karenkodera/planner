import { CalendarEvent, CoupleProfile, SharedRequest, TravelStay } from '../types/calendar';
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

const nextMon = addDays(mon, 7);
const nextTue = addDays(nextMon, 1);
const nextWed = addDays(nextMon, 2);
const nextThu = addDays(nextMon, 3);
const nextFri = addDays(nextMon, 4);
const nextSat = addDays(nextMon, 5);
const nextSun = addDays(nextMon, 6);

export const couple: CoupleProfile = {
  me: {
    id: 'me',
    name: 'Karen',
    shortName: 'You',
    initial: 'K',
    email: 'karen@kodera.us',
  },
  partner: {
    id: 'partner',
    name: 'Thomas Tran',
    shortName: 'Thomas',
    initial: 'T',
    email: 'thomas@kodera.us',
  },
};

/**
 * This week: Thomas is in Miami Mon–Wed, so no local partner events those days.
 * Next week: fuller mix of solo / shared / partner plans.
 * Weekdays: nothing before 5:00pm.
 */
export const mockEvents: CalendarEvent[] = [
  // —— This week (Thomas away Mon–Wed) ——
  {
    id: 'e1',
    title: 'Dinner with Chloe',
    location: 'Bar Isabel',
    start: atTime(tue, 19, 0),
    end: atTime(tue, 21, 0),
    owner: 'me',
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
    id: 'e5',
    title: 'Date night',
    location: 'Velvet Room',
    start: atTime(fri, 19, 30),
    end: atTime(fri, 22, 0),
    owner: 'shared',
    notes: 'Reservation under Thomas',
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

  // —— Next week (show the full mix) ——
  {
    id: 'e0',
    title: 'Team drinks',
    location: 'The Drake',
    start: atTime(nextMon, 18, 30),
    end: atTime(nextMon, 20, 30),
    owner: 'partner',
  },
  {
    id: 'e9',
    title: 'Bookstore browse',
    location: 'Type Books',
    start: atTime(nextTue, 18, 0),
    end: atTime(nextTue, 19, 30),
    owner: 'me',
  },
  {
    id: 'e2',
    title: 'Climbing gym',
    location: 'Basecamp',
    start: atTime(nextWed, 18, 30),
    end: atTime(nextWed, 20, 30),
    owner: 'partner',
  },
  {
    id: 'e4',
    title: 'Pub with teammates',
    location: 'The Drake',
    start: atTime(nextThu, 19, 30),
    end: atTime(nextThu, 22, 0),
    owner: 'partner',
  },
  {
    id: 'e10',
    title: 'Pilates',
    location: 'River Studio',
    start: atTime(nextThu, 18, 0),
    end: atTime(nextThu, 19, 0),
    owner: 'me',
  },
  {
    id: 'e11',
    title: 'Concert',
    location: 'History',
    start: atTime(nextFri, 20, 0),
    end: atTime(nextFri, 22, 30),
    owner: 'shared',
    notes: 'Doors at 7:30',
  },
  {
    id: 'e6',
    title: 'Climbing',
    location: 'Basecamp',
    start: atTime(nextSat, 17, 0),
    end: atTime(nextSat, 19, 0),
    owner: 'partner',
  },
  {
    id: 'e12',
    title: 'Brunch',
    location: 'Lady Marmalade',
    start: atTime(nextSun, 11, 0),
    end: atTime(nextSun, 12, 30),
    owner: 'shared',
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
    createdAt: atTime(fri, 16, 0),
  },
  {
    id: 'r2',
    title: 'Catch a movie?',
    notes: 'Something light after work',
    location: 'Scotiabank Theatre',
    proposedStart: atTime(nextWed, 19, 30),
    proposedEnd: atTime(nextWed, 21, 30),
    from: 'me',
    status: 'pending',
    createdAt: atTime(tue, 12, 0),
  },
  {
    id: 'r3',
    title: 'Coffee before work?',
    notes: 'Quick catch-up if you’re free',
    location: 'Dineen',
    proposedStart: atTime(nextTue, 17, 30),
    proposedEnd: atTime(nextTue, 18, 30),
    from: 'partner',
    status: 'pending',
    createdAt: atTime(sun, 21, 0),
  },
];

/** Thomas in Miami Mon–Wed this week — no other local plans those days */
export const mockTravels: TravelStay[] = [
  {
    id: 't1',
    person: 'partner',
    place: 'Miami',
    start: mon,
    end: wed,
  },
];
