export type PersonId = 'me' | 'partner';

export type EventOwner = 'me' | 'partner' | 'shared';

export type RequestStatus = 'pending' | 'accepted' | 'suggested' | 'declined';

export type CalendarEvent = {
  id: string;
  title: string;
  notes?: string;
  location?: string;
  start: Date;
  end: Date;
  owner: EventOwner;
  colorHint?: string;
};

export type SharedRequest = {
  id: string;
  title: string;
  notes?: string;
  location?: string;
  proposedStart: Date;
  proposedEnd: Date;
  suggestedStart?: Date;
  suggestedEnd?: Date;
  from: PersonId;
  status: RequestStatus;
  createdAt: Date;
};

export type FreeSlot = {
  id: string;
  start: Date;
  end: Date;
  dayLabel: string;
  timeLabel: string;
  durationMinutes: number;
};

export type CoupleProfile = {
  me: { id: PersonId; name: string; shortName: string; initial: string };
  partner: { id: PersonId; name: string; shortName: string; initial: string };
};

/** Multi-day travel / away status for a person */
export type TravelStay = {
  id: string;
  person: PersonId;
  place: string;
  start: Date;
  end: Date;
};
