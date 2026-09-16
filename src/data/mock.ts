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
  partner: { id: 'partner', name: 'Alex', shortName: 'Alex', initial: 'A' },
};

export const mockEvents: CalendarEvent[] = [
  {
    id: 'e1',
    title: 'Design critique',
    location: 'Studio',
    start: atTime(mon, 9, 0),
    end: atTime(mon, 10, 30),
    owner: 'me',
  },
  {
    id: 'e2',
    title: 'Team standup',
    start: atTime(mon, 11, 0),
    end: atTime(mon, 11, 30),
    owner: 'me',
  },
  {
    id: 'e3',
    title: 'Client workshop',
    location: 'Downtown',
    start: atTime(mon, 13, 0),
    end: atTime(mon, 16, 0),
    owner: 'partner',
  },
  {
    id: 'e4',
    title: 'Morning run',
    start: atTime(tue, 7, 0),
    end: atTime(tue, 8, 0),
    owner: 'me',
  },
  {
    id: 'e5',
    title: 'Product sync',
    start: atTime(tue, 10, 0),
    end: atTime(tue, 11, 30),
    owner: 'me',
  },
  {
    id: 'e6',
    title: 'Physio',
    location: 'North Clinic',
    start: atTime(tue, 12, 0),
    end: atTime(tue, 13, 0),
    owner: 'partner',
  },
  {
    id: 'e7',
    title: 'Deep work block',
    start: atTime(tue, 14, 0),
    end: atTime(tue, 17, 0),
    owner: 'partner',
  },
  {
    id: 'e8',
    title: 'Grocery run together',
    location: 'Market Hall',
    start: atTime(tue, 18, 30),
    end: atTime(tue, 19, 30),
    owner: 'shared',
    notes: 'Grab flowers if they look good',
  },
  {
    id: 'e9',
    title: 'Coffee with Maya',
    location: 'Lumen Café',
    start: atTime(wed, 9, 30),
    end: atTime(wed, 10, 30),
    owner: 'me',
  },
  {
    id: 'e10',
    title: 'Sprint planning',
    start: atTime(wed, 11, 0),
    end: atTime(wed, 12, 30),
    owner: 'me',
  },
  {
    id: 'e11',
    title: 'Teaching prep',
    start: atTime(wed, 14, 0),
    end: atTime(wed, 16, 30),
    owner: 'partner',
  },
  {
    id: 'e12',
    title: 'Cook dinner',
    location: 'Home',
    start: atTime(wed, 19, 0),
    end: atTime(wed, 20, 30),
    owner: 'shared',
    notes: 'Pasta night',
  },
  {
    id: 'e13',
    title: 'Focus morning',
    start: atTime(thu, 8, 30),
    end: atTime(thu, 11, 30),
    owner: 'me',
  },
  {
    id: 'e14',
    title: 'Office hours',
    start: atTime(thu, 13, 0),
    end: atTime(thu, 15, 0),
    owner: 'partner',
  },
  {
    id: 'e15',
    title: 'Yoga',
    location: 'River Studio',
    start: atTime(thu, 18, 0),
    end: atTime(thu, 19, 0),
    owner: 'me',
  },
  {
    id: 'e16',
    title: 'Board meeting',
    start: atTime(fri, 9, 0),
    end: atTime(fri, 11, 0),
    owner: 'partner',
  },
  {
    id: 'e17',
    title: 'Ship review',
    start: atTime(fri, 14, 0),
    end: atTime(fri, 15, 30),
    owner: 'me',
  },
  {
    id: 'e18',
    title: 'Date night — jazz bar',
    location: 'Velvet Room',
    start: atTime(fri, 19, 30),
    end: atTime(fri, 22, 0),
    owner: 'shared',
    notes: 'Reservation under Alex',
  },
  {
    id: 'e19',
    title: 'Farmers market',
    start: atTime(sat, 9, 0),
    end: atTime(sat, 11, 0),
    owner: 'shared',
  },
  {
    id: 'e20',
    title: 'Reading hour',
    start: atTime(sat, 15, 0),
    end: atTime(sat, 16, 30),
    owner: 'me',
  },
  {
    id: 'e21',
    title: 'Climbing',
    location: 'Boulder Gym',
    start: atTime(sat, 11, 30),
    end: atTime(sat, 13, 30),
    owner: 'partner',
  },
  {
    id: 'e22',
    title: 'Slow morning',
    start: atTime(sun, 10, 0),
    end: atTime(sun, 12, 0),
    owner: 'shared',
    notes: 'No plans, just us',
  },
  {
    id: 'e23',
    title: 'Call Mom',
    start: atTime(sun, 16, 0),
    end: atTime(sun, 16, 45),
    owner: 'me',
  },
];

export const mockRequests: SharedRequest[] = [
  {
    id: 'r1',
    title: 'Sunday picnic',
    notes: 'If the weather holds — blanket by the river?',
    location: 'Riverside Park',
    proposedStart: atTime(sun, 13, 0),
    proposedEnd: atTime(sun, 15, 0),
    from: 'partner',
    status: 'pending',
    createdAt: atTime(tue, 9, 0),
  },
  {
    id: 'r2',
    title: 'Thursday lunch',
    location: 'Nori Bowl',
    proposedStart: atTime(thu, 12, 15),
    proposedEnd: atTime(thu, 13, 15),
    from: 'me',
    status: 'suggested',
    suggestedStart: atTime(thu, 12, 45),
    suggestedEnd: atTime(thu, 13, 45),
    createdAt: atTime(mon, 20, 0),
  },
];
