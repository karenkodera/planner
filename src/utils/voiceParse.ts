import { addMinutes } from 'date-fns';
import { EventOwner } from '../types/calendar';
import { addDays, atTime } from './date';
import { TODAY } from '../data/mock';

export type ParsedVoiceEvent = {
  title: string;
  owner: EventOwner;
  start: Date;
  end: Date;
  location?: string;
  confidenceNote: string;
};

const DAY_WORDS: Record<string, number> = {
  monday: 0,
  mon: 0,
  tuesday: 1,
  tue: 1,
  tues: 1,
  wednesday: 2,
  wed: 2,
  thursday: 3,
  thu: 3,
  thurs: 3,
  friday: 4,
  fri: 4,
  saturday: 5,
  sat: 5,
  sunday: 6,
  sun: 6,
};

function weekMonday(from: Date): Date {
  const d = new Date(from);
  const day = (d.getDay() + 6) % 7;
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - day);
  return d;
}

function resolveDay(text: string, anchor: Date): Date {
  const lower = text.toLowerCase();
  if (lower.includes('tomorrow')) return addDays(anchor, 1);
  if (lower.includes('today')) return anchor;

  for (const [word, offset] of Object.entries(DAY_WORDS)) {
    if (new RegExp(`\\b${word}\\b`).test(lower)) {
      return addDays(weekMonday(anchor), offset);
    }
  }
  return addDays(anchor, 1);
}

function resolveTime(text: string): { hour: number; minute: number } {
  const lower = text.toLowerCase();
  const match = lower.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/);
  if (!match) {
    if (lower.includes('noon')) return { hour: 12, minute: 0 };
    if (lower.includes('evening') || lower.includes('dinner')) return { hour: 19, minute: 0 };
    if (lower.includes('lunch')) return { hour: 12, minute: 30 };
    if (lower.includes('morning')) return { hour: 9, minute: 0 };
    return { hour: 18, minute: 0 };
  }
  let hour = parseInt(match[1], 10);
  const minute = match[2] ? parseInt(match[2], 10) : 0;
  const meridiem = match[3];
  if (meridiem === 'pm' && hour < 12) hour += 12;
  if (meridiem === 'am' && hour === 12) hour = 0;
  if (!meridiem && hour < 8) hour += 12;
  return { hour, minute };
}

function resolveDuration(text: string): number {
  const lower = text.toLowerCase();
  const hourMatch = lower.match(/(\d+(?:\.\d+)?)\s*hours?/);
  if (hourMatch) return Math.round(parseFloat(hourMatch[1]) * 60);
  const minMatch = lower.match(/(\d+)\s*min/);
  if (minMatch) return parseInt(minMatch[1], 10);
  if (lower.includes('dinner') || lower.includes('date')) return 120;
  if (lower.includes('lunch') || lower.includes('coffee')) return 60;
  return 90;
}

function resolveOwner(text: string): EventOwner {
  const lower = text.toLowerCase();
  if (
    lower.includes('together')
    || lower.includes('with alex')
    || lower.includes('with us')
    || lower.includes('date')
    || lower.includes('shared')
    || lower.includes('both')
  ) {
    return 'shared';
  }
  return 'me';
}

function resolveTitle(text: string): string {
  let cleaned = text
    .replace(/\b(add|create|schedule|put|please|can you|i want to|remind me to)\b/gi, '')
    .replace(/\b(on|at|from|this|next)\b/gi, ' ')
    .replace(/\b(monday|tuesday|wednesday|thursday|friday|saturday|sunday|today|tomorrow|mon|tue|wed|thu|fri|sat|sun)\b/gi, '')
    .replace(/\b\d{1,2}(?::\d{2})?\s*(am|pm)?\b/gi, '')
    .replace(/\b(am|pm)\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim();

  if (!cleaned) cleaned = 'New plan';
  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
}

/** Mock natural-language parser for voice / typed quick-add. */
export function parseNaturalEvent(
  utterance: string,
  anchor: Date = TODAY,
): ParsedVoiceEvent {
  const day = resolveDay(utterance, anchor);
  const { hour, minute } = resolveTime(utterance);
  const duration = resolveDuration(utterance);
  const start = atTime(day, hour, minute);
  const end = addMinutes(start, duration);
  const owner = resolveOwner(utterance);
  const title = resolveTitle(utterance);

  return {
    title,
    owner,
    start,
    end,
    confidenceNote:
      owner === 'shared'
        ? 'Heard as a shared plan — Alex will see a request.'
        : 'Added to your calendar.',
  };
}

export const VOICE_DEMO_PHRASES = [
  'Dinner with Alex Friday at 7',
  'Yoga tomorrow morning at 8',
  'Coffee with Maya Wednesday at 10am',
  'Date night Saturday at 8pm for 2 hours',
];
