import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from 'react';
import { CalendarEvent, FreeSlot, SharedRequest } from '../types/calendar';
import { couple, mockEvents, mockRequests, TODAY } from '../data/mock';
import { findMutualFreeSlots, suggestAlternateTime } from '../utils/findTime';
import { addDays, differenceInMinutes } from 'date-fns';
import { parseNaturalEvent } from '../utils/voiceParse';

type Sheet =
  | { type: 'none' }
  | { type: 'event'; event: CalendarEvent }
  | { type: 'create' }
  | { type: 'voice' }
  | { type: 'findTime' }
  | { type: 'requests' }
  | { type: 'requestDetail'; request: SharedRequest };

type CalendarContextValue = {
  couple: typeof couple;
  today: Date;
  weekAnchor: Date;
  events: CalendarEvent[];
  requests: SharedRequest[];
  pendingCount: number;
  freeSlots: FreeSlot[];
  sheet: Sheet;
  selectedDay: Date;
  setSelectedDay: (d: Date) => void;
  goWeek: (delta: number) => void;
  jumpToDay: (d: Date) => void;
  openSheet: (sheet: Sheet) => void;
  closeSheet: () => void;
  addEvent: (event: Omit<CalendarEvent, 'id'>) => void;
  addFromVoice: (utterance: string) => CalendarEvent;
  sendSharedRequest: (input: {
    title: string;
    notes?: string;
    location?: string;
    start: Date;
    end: Date;
  }) => void;
  acceptRequest: (id: string) => void;
  suggestRequestTime: (id: string) => void;
  declineRequest: (id: string) => void;
  createFromSlot: (slot: FreeSlot, title: string) => void;
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
  const [sheet, setSheet] = useState<Sheet>({ type: 'none' });

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
    if (event.owner === 'shared') {
      // Shared creations from "me" also land as accepted together time
    }
  }, []);

  const addFromVoice = useCallback((utterance: string) => {
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
    (id: string) => {
      setRequests((prev) => {
        const target = prev.find((r) => r.id === id);
        if (!target) return prev;
        const duration = differenceInMinutes(target.proposedEnd, target.proposedStart);
        const alt = suggestAlternateTime(events, target.proposedStart, duration);
        if (!alt) return prev;
        return prev.map((r) =>
          (r.id === id
            ? {
                ...r,
                status: 'suggested' as const,
                suggestedStart: alt.start,
                suggestedEnd: alt.end,
              }
            : r),
        );
      });
    },
    [events],
  );

  const declineRequest = useCallback((id: string) => {
    setRequests((prev) =>
      prev.map((r) => (r.id === id ? { ...r, status: 'declined' as const } : r)),
    );
  }, []);

  const createFromSlot = useCallback((slot: FreeSlot, title: string) => {
    const event: CalendarEvent = {
      id: uid('e'),
      title,
      start: slot.start,
      end: slot.end,
      owner: 'shared',
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
  }, []);

  const value: CalendarContextValue = {
    couple,
    today: TODAY,
    weekAnchor,
    events,
    requests,
    pendingCount,
    freeSlots,
    sheet,
    selectedDay,
    setSelectedDay,
    goWeek,
    jumpToDay,
    openSheet: setSheet,
    closeSheet: () => setSheet({ type: 'none' }),
    addEvent,
    addFromVoice,
    sendSharedRequest,
    acceptRequest,
    suggestRequestTime,
    declineRequest,
    createFromSlot,
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
