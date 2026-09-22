import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from 'react';
import { CalendarEvent, FreeSlot, Recurrence, SharedRequest, TravelStay } from '../types/calendar';
import { couple, mockEvents, mockRequests, mockTravels, TODAY } from '../data/mock';
import { findMutualFreeSlots } from '../utils/findTime';
import { colors } from '../theme/colors';
import { addDays } from 'date-fns';
import { parseNaturalEvent } from '../utils/voiceParse';

type Sheet =
  | { type: 'none' }
  | { type: 'event'; event: CalendarEvent }
  | { type: 'edit'; event: CalendarEvent }
  | { type: 'create' }
  | { type: 'voice' }
  | { type: 'findTime' }
  | { type: 'search' }
  | { type: 'requests' }
  | { type: 'requestDetail'; request: SharedRequest };

type CalendarContextValue = {
  couple: typeof couple;
  today: Date;
  weekAnchor: Date;
  events: CalendarEvent[];
  requests: SharedRequest[];
  travels: TravelStay[];
  pendingCount: number;
  freeSlots: FreeSlot[];
  sheet: Sheet;
  selectedDay: Date;
  meColor: string;
  setMeColor: (color: string) => void;
  partnerLinked: boolean;
  setSelectedDay: (d: Date) => void;
  goWeek: (delta: number) => void;
  jumpToDay: (d: Date) => void;
  openSheet: (sheet: Sheet) => void;
  closeSheet: () => void;
  addEvent: (event: Omit<CalendarEvent, 'id'>) => void;
  updateEvent: (id: string, patch: Partial<Omit<CalendarEvent, 'id'>>) => void;
  deleteEvent: (id: string) => void;
  addFromVoice: (utterance: string, recurrence?: Recurrence) => CalendarEvent;
  sendSharedRequest: (input: {
    title: string;
    notes?: string;
    location?: string;
    start: Date;
    end: Date;
  }) => void;
  acceptRequest: (id: string) => void;
  suggestRequestTime: (id: string, start: Date, end: Date) => void;
  declineRequest: (id: string) => void;
  createFromSlot: (slot: FreeSlot, title: string, recurrence?: Recurrence) => void;
  removePartner: () => void;
};

const CalendarContext = createContext<CalendarContextValue | null>(null);

function uid(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}`;
}

export function CalendarProvider({ children }: { children: React.ReactNode }) {
  const [weekAnchor, setWeekAnchor] = useState(TODAY);
  const [selectedDay, setSelectedDay] = useState(TODAY);
  const [events, setEvents] = useState<CalendarEvent[]>(mockEvents);
  const [requests, setRequests] = useState<SharedRequest[]>(mockRequests);
  const [travels, setTravels] = useState<TravelStay[]>(mockTravels);
  const [sheet, setSheet] = useState<Sheet>({ type: 'none' });
  const [meColor, setMeColor] = useState<string>(colors.me);
  const [partnerLinked, setPartnerLinked] = useState(true);

  const pendingCount = useMemo(
    () => requests.filter((r) => r.status === 'pending' && r.from === 'partner').length,
    [requests],
  );

  const freeSlots = useMemo(
    () => findMutualFreeSlots(events, weekAnchor),
    [events, weekAnchor],
  );

  const goWeek = useCallback((delta: number) => {
    setWeekAnchor((prev) => {
      const next = addDays(prev, delta * 7);
      setSelectedDay(next);
      return next;
    });
  }, []);

  const jumpToDay = useCallback((d: Date) => {
    setWeekAnchor(d);
    setSelectedDay(d);
  }, []);

  const addEvent = useCallback((event: Omit<CalendarEvent, 'id'>) => {
    const full: CalendarEvent = { ...event, id: uid('e') };
    setEvents((prev) => [...prev, full]);
  }, []);

  const updateEvent = useCallback(
    (id: string, patch: Partial<Omit<CalendarEvent, 'id'>>) => {
      setEvents((prev) =>
        prev.map((e) => (e.id === id ? { ...e, ...patch } : e)),
      );
    },
    [],
  );

  const deleteEvent = useCallback((id: string) => {
    setEvents((prev) => prev.filter((e) => e.id !== id));
  }, []);

  const addFromVoice = useCallback((utterance: string, recurrence: Recurrence = 'none') => {
    const parsed = parseNaturalEvent(utterance, TODAY);
    if (parsed.owner === 'shared') {
      const request: SharedRequest = {
        id: uid('r'),
        title: parsed.title,
        proposedStart: parsed.start,
        proposedEnd: parsed.end,
        from: 'me',
        status: 'pending',
        createdAt: new Date(),
      };
      setRequests((prev) => [request, ...prev]);
      const event: CalendarEvent = {
        id: uid('e'),
        title: `${parsed.title} (requested)`,
        start: parsed.start,
        end: parsed.end,
        owner: 'me',
        notes: 'Waiting on Thomas',
        recurrence,
      };
      setEvents((prev) => [...prev, event]);
      return event;
    }
    const event: CalendarEvent = {
      id: uid('e'),
      title: parsed.title,
      start: parsed.start,
      end: parsed.end,
      owner: parsed.owner,
      recurrence,
    };
    setEvents((prev) => [...prev, event]);
    return event;
  }, []);

  const sendSharedRequest = useCallback(
    (input: {
      title: string;
      notes?: string;
      location?: string;
      start: Date;
      end: Date;
    }) => {
      setRequests((prev) => [
        {
          id: uid('r'),
          title: input.title,
          notes: input.notes,
          location: input.location,
          proposedStart: input.start,
          proposedEnd: input.end,
          from: 'me',
          status: 'pending',
          createdAt: new Date(),
        },
        ...prev,
      ]);
    },
    [],
  );

  const acceptRequest = useCallback((id: string) => {
    setRequests((prev) => {
      const target = prev.find((r) => r.id === id);
      if (!target) return prev;
      const start = target.suggestedStart ?? target.proposedStart;
      const end = target.suggestedEnd ?? target.proposedEnd;
      setEvents((eventsPrev) => [
        ...eventsPrev,
        {
          id: uid('e'),
          title: target.title,
          notes: target.notes,
          location: target.location,
          start,
          end,
          owner: 'shared',
        },
      ]);
      return prev.map((r) => (r.id === id ? { ...r, status: 'accepted' as const } : r));
    });
  }, []);

  const suggestRequestTime = useCallback(
    (id: string, start: Date, end: Date) => {
      setRequests((prev) =>
        prev.map((r) =>
          (r.id === id
            ? {
                ...r,
                status: 'suggested' as const,
                suggestedStart: start,
                suggestedEnd: end,
              }
            : r),
        ),
      );
    },
    [],
  );

  const declineRequest = useCallback((id: string) => {
    setRequests((prev) =>
      prev.map((r) => (r.id === id ? { ...r, status: 'declined' as const } : r)),
    );
  }, []);

  const createFromSlot = useCallback(
    (slot: FreeSlot, title: string, recurrence: Recurrence = 'none') => {
      const event: CalendarEvent = {
        id: uid('e'),
        title,
        start: slot.start,
        end: slot.end,
        owner: 'shared',
        recurrence,
      };
      setEvents((prev) => [...prev, event]);
      setRequests((prev) => [
        {
          id: uid('r'),
          title,
          proposedStart: slot.start,
          proposedEnd: slot.end,
          from: 'me',
          status: 'accepted',
          createdAt: new Date(),
        },
        ...prev,
      ]);
    },
    [],
  );

  const removePartner = useCallback(() => {
    setPartnerLinked(false);
    setEvents((prev) => prev.filter((e) => e.owner !== 'partner'));
    setTravels((prev) => prev.filter((t) => t.person !== 'partner'));
    setRequests((prev) => prev.filter((r) => r.from !== 'partner'));
  }, []);

  const value: CalendarContextValue = {
    couple,
    today: TODAY,
    weekAnchor,
    events,
    requests,
    travels,
    pendingCount,
    freeSlots,
    sheet,
    selectedDay,
    meColor,
    setMeColor,
    partnerLinked,
    setSelectedDay,
    goWeek,
    jumpToDay,
    openSheet: setSheet,
    closeSheet: () => setSheet({ type: 'none' }),
    addEvent,
    updateEvent,
    deleteEvent,
    addFromVoice,
    sendSharedRequest,
    acceptRequest,
    suggestRequestTime,
    declineRequest,
    createFromSlot,
    removePartner,
  };

  return (
    <CalendarContext.Provider value={value}>{children}</CalendarContext.Provider>
  );
}

export function useCalendar() {
  const ctx = useContext(CalendarContext);
  if (!ctx) throw new Error('useCalendar must be used within CalendarProvider');
  return ctx;
}
