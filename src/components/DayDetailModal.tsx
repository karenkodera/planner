import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Dimensions,
  Modal,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { addDays, format as formatDate, getDay } from 'date-fns';
import { CalendarEvent, SharedRequest, TravelStay } from '../types/calendar';
import { colors } from '../theme/colors';
import { useCalendar } from '../store/CalendarContext';
import {
  eventTouchesDay,
  format,
  formatEventTime,
  isSameDay,
  overlaps,
  travelTouchesDay,
} from '../utils/date';

const HOUR_HEIGHT = 64;
const DAY_START = 8;
const DAY_END = 22;
const WORK_END_ME = 17;
const WORK_END_PARTNER = 18;
const HOURS = Array.from({ length: DAY_END - DAY_START + 1 }, (_, i) => DAY_START + i);
const TIMELINE_HEIGHT = (DAY_END - DAY_START) * HOUR_HEIGHT;
const { width: SCREEN_W } = Dimensions.get('window');

function isWeekday(day: Date): boolean {
  const d = getDay(day);
  return d >= 1 && d <= 5;
}

function minutesFromStart(date: Date): number {
  return date.getHours() * 60 + date.getMinutes() - DAY_START * 60;
}

function EventBlock({
  event,
  lane,
  selected,
  onPress,
  spanning,
}: {
  event: CalendarEvent;
  lane: 'solo' | 'shared';
  selected: boolean;
  onPress: () => void;
  spanning?: boolean;
}) {
  const top = Math.max(0, minutesFromStart(event.start)) * (HOUR_HEIGHT / 60);
  const durationMins = Math.max(
    30,
    (event.end.getTime() - event.start.getTime()) / 60000,
  );
  const height = durationMins * (HOUR_HEIGHT / 60);

  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.block,
        spanning && styles.blockSpanning,
        { top, height },
        lane === 'solo' && styles.blockSolo,
        lane === 'shared' && styles.blockShared,
        selected && styles.blockSelected,
      ]}
    >
      <Text
        numberOfLines={2}
        style={[
          styles.blockTitle,
          lane === 'shared' && styles.blockTitleShared,
        ]}
      >
        {event.title}
      </Text>
      <Text
        style={[
          styles.blockTime,
          lane === 'shared' && styles.blockTimeShared,
        ]}
      >
        {format(event.start, 'h:mm a')}
      </Text>
    </Pressable>
  );
}

function RequestBlock({
  request,
  selected,
  onPress,
}: {
  request: SharedRequest;
  selected: boolean;
  onPress: () => void;
}) {
  const top = Math.max(0, minutesFromStart(request.proposedStart)) * (HOUR_HEIGHT / 60);
  const durationMins = Math.max(
    30,
    (request.proposedEnd.getTime() - request.proposedStart.getTime()) / 60000,
  );
  const height = durationMins * (HOUR_HEIGHT / 60);
  const outgoing = request.from === 'me';

  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.block,
        styles.blockSpanning,
        outgoing ? styles.blockRequestOutgoing : styles.blockRequestIncoming,
        { top, height },
        selected && styles.blockSelected,
      ]}
    >
      <Text numberOfLines={2} style={styles.blockTitleRequest}>
        {request.title}
      </Text>
      <Text style={styles.blockTimeRequest}>
        {format(request.proposedStart, 'h:mm a')}
        {outgoing ? ' · awaiting reply' : ' · RSVP'}
      </Text>
    </Pressable>
  );
}

type Selection =
  | { kind: 'event'; event: CalendarEvent }
  | { kind: 'request'; request: SharedRequest }
  | { kind: 'travel'; travel: TravelStay }
  | null;

function DayTimelinePage({
  day,
  events,
  requests,
  travels,
  coupleNames,
  selection,
  isActive,
  onSelectEvent,
  onSelectRequest,
  onSelectTravel,
}: {
  day: Date;
  events: CalendarEvent[];
  requests: SharedRequest[];
  travels: TravelStay[];
  coupleNames: { me: string; partner: string };
  selection: Selection;
  isActive: boolean;
  onSelectEvent: (e: CalendarEvent) => void;
  onSelectRequest: (r: SharedRequest) => void;
  onSelectTravel: (t: TravelStay) => void;
}) {
  const scrollRef = useRef<ScrollView>(null);
  const dayEvents = events.filter((e) => eventTouchesDay(e.start, e.end, day));
  const mine = dayEvents.filter((e) => e.owner === 'me');
  const partner = dayEvents.filter((e) => e.owner === 'partner');
  const shared = dayEvents.filter((e) => e.owner === 'shared');
  const dayRequests = requests.filter((r) => {
    if (r.status !== 'pending' && r.status !== 'suggested') return false;
    if (!isSameDay(r.proposedStart, day)) return false;
    const myBusy = dayEvents.filter((e) => e.owner === 'me' || e.owner === 'shared');
    return !myBusy.some((e) =>
      overlaps(e.start, e.end, r.proposedStart, r.proposedEnd),
    );
  });
  const dayTravels = travels.filter((t) =>
    travelTouchesDay(t.start, t.end, day),
  );

  const selectedId =
    selection?.kind === 'event'
      ? selection.event.id
      : selection?.kind === 'request'
        ? selection.request.id
        : selection?.kind === 'travel'
          ? selection.travel.id
          : null;

  const workHeightMe = (WORK_END_ME - DAY_START) * HOUR_HEIGHT;
  const workHeightPartner = (WORK_END_PARTNER - DAY_START) * HOUR_HEIGHT;
  const weekday = isWeekday(day);

  useEffect(() => {
    if (!isActive || !weekday) return;
    const timer = setTimeout(() => {
      scrollRef.current?.scrollToEnd({ animated: false });
    }, 50);
    return () => clearTimeout(timer);
  }, [isActive, weekday, day]);

  return (
    <View style={[styles.page, { width: SCREEN_W }]}>
      {dayTravels.length > 0 ? (
        <View style={styles.travelBannerList}>
          {dayTravels.map((travel) => (
            <Pressable
              key={travel.id}
              onPress={() => onSelectTravel(travel)}
              style={[
                styles.travelBanner,
                selectedId === travel.id && styles.travelBannerSelected,
              ]}
            >
              <Ionicons name="airplane" size={16} color={colors.inkSoft} />
              <Text style={styles.travelBannerText}>
                {travel.person === 'me' ? coupleNames.me : coupleNames.partner}
                {' in '}
                {travel.place}
              </Text>
            </Pressable>
          ))}
        </View>
      ) : null}

      <View style={styles.laneLabels}>
        <Text style={styles.laneLabel}>{coupleNames.me}</Text>
        <Text style={styles.laneLabel}>{coupleNames.partner}</Text>
      </View>

      <ScrollView
        ref={scrollRef}
        style={styles.timelineScroll}
        contentContainerStyle={{ paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ height: TIMELINE_HEIGHT + 34 }}>
          {HOURS.map((hour) => {
            const top = 10 + (hour - DAY_START) * HOUR_HEIGHT;
            return (
              <View key={hour} style={[styles.hourRow, { top }]}>
                <Text style={styles.hourLabel}>
                  {formatDate(new Date(2026, 0, 1, hour), 'h a')}
                </Text>
                <View style={styles.hourLine} />
              </View>
            );
          })}

          <View style={[styles.lanes, { top: 10 }]}>
            <View style={styles.lane}>
              {weekday ? (
                <View
                  style={[styles.workBlock, { height: workHeightMe }]}
                  pointerEvents="none"
                >
                  <Text style={styles.workBlockText}>Work</Text>
                </View>
              ) : null}
              {mine.map((e) => (
                <EventBlock
                  key={e.id}
                  event={e}
                  lane="solo"
                  selected={selectedId === e.id}
                  onPress={() => onSelectEvent(e)}
                />
              ))}
            </View>
            <View style={styles.lane}>
              {weekday ? (
                <View
                  style={[styles.workBlock, { height: workHeightPartner }]}
                  pointerEvents="none"
                >
                  <Text style={styles.workBlockText}>Work</Text>
                </View>
              ) : null}
              {partner.map((e) => (
                <EventBlock
                  key={e.id}
                  event={e}
                  lane="solo"
                  selected={selectedId === e.id}
                  onPress={() => onSelectEvent(e)}
                />
              ))}
            </View>

            {shared.map((e) => (
              <EventBlock
                key={`shared-${e.id}`}
                event={e}
                lane="shared"
                spanning
                selected={selectedId === e.id}
                onPress={() => onSelectEvent(e)}
              />
            ))}
            {dayRequests.map((r) => (
              <RequestBlock
                key={r.id}
                request={r}
                selected={selectedId === r.id}
                onPress={() => onSelectRequest(r)}
              />
            ))}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

function EventInfoPanel({
  selection,
  onClose,
  onOpenRequest,
  onCancelInvite,
}: {
  selection: Selection;
  onClose: () => void;
  onOpenRequest: (r: SharedRequest) => void;
  onCancelInvite: (r: SharedRequest) => void;
}) {
  const { couple } = useCalendar();
  if (!selection) return null;

  if (selection.kind === 'travel') {
    const { travel } = selection;
    const who = travel.person === 'me' ? couple.me.name : couple.partner.name;
    const sameMonth = travel.start.getMonth() === travel.end.getMonth();
    const dateRange = sameMonth
      ? `${format(travel.start, 'EEE, MMM d')} – ${format(travel.end, 'EEE, d')}`
      : `${format(travel.start, 'EEE, MMM d')} – ${format(travel.end, 'EEE, MMM d')}`;

    return (
      <View style={styles.infoPanel}>
        <View style={styles.infoHeader}>
          <Text style={styles.infoEyebrow}>Travel</Text>
          <Pressable onPress={onClose} hitSlop={10}>
            <Ionicons name="close" size={18} color={colors.muted} />
          </Pressable>
        </View>
        <Text style={styles.infoTitle}>
          {who} in {travel.place}
        </Text>
        <Text style={styles.infoMeta}>{dateRange}</Text>
        <View style={styles.infoLocationRow}>
          <Ionicons name="location-outline" size={14} color={colors.ink} />
          <Text style={styles.infoLocationText}>{travel.place}</Text>
        </View>
      </View>
    );
  }

  if (selection.kind === 'request') {
    const { request } = selection;
    const outgoing = request.from === 'me';
    return (
      <View style={styles.infoPanel}>
        <View style={styles.infoHeader}>
          <Text style={styles.infoEyebrow}>
            {outgoing ? 'Awaiting reply' : 'RSVP'}
          </Text>
          <Pressable onPress={onClose} hitSlop={10}>
            <Ionicons name="close" size={18} color={colors.muted} />
          </Pressable>
        </View>
        <Text style={styles.infoTitle}>{request.title}</Text>
        <Text style={styles.infoMeta}>
          {formatEventTime(request.proposedStart, request.proposedEnd)}
        </Text>
        {request.location ? (
          <View style={styles.infoLocationRow}>
            <Ionicons name="location-outline" size={14} color={colors.ink} />
            <Text style={styles.infoLocationText}>{request.location}</Text>
          </View>
        ) : null}
        {request.notes ? <Text style={styles.infoNotes}>{request.notes}</Text> : null}
        <Pressable style={styles.infoAction} onPress={() => onOpenRequest(request)}>
          <Text style={styles.infoActionText}>
            {outgoing ? 'View invite' : 'RSVP'}
          </Text>
        </Pressable>
        {outgoing ? (
          <Pressable
            style={styles.infoCancel}
            onPress={() => onCancelInvite(request)}
          >
            <Text style={styles.infoCancelText}>Cancel invite</Text>
          </Pressable>
        ) : null}
      </View>
    );
  }

  const { event } = selection;
  const who =
    event.owner === 'me'
      ? couple.me.name
      : event.owner === 'partner'
        ? couple.partner.name
        : 'Together';

  return (
    <View style={styles.infoPanel}>
      <View style={styles.infoHeader}>
        <Text style={styles.infoEyebrow}>{who}</Text>
        <Pressable onPress={onClose} hitSlop={10}>
          <Ionicons name="close" size={18} color={colors.muted} />
        </Pressable>
      </View>
      <Text style={styles.infoTitle}>{event.title}</Text>
      <Text style={styles.infoMeta}>{formatEventTime(event.start, event.end)}</Text>
      {event.location ? (
        <View style={styles.infoLocationRow}>
          <Ionicons name="location-outline" size={14} color={colors.ink} />
          <Text style={styles.infoLocationText}>{event.location}</Text>
        </View>
      ) : null}
      {event.notes ? <Text style={styles.infoNotes}>{event.notes}</Text> : null}
    </View>
  );
}

export function DayDetailModal({
  visible,
  initialDay,
  onClose,
}: {
  visible: boolean;
  initialDay: Date;
  onClose: () => void;
}) {
  const { events, requests, travels, setSelectedDay, openSheet, today, couple, declineRequest } =
    useCalendar();
  const pagerRef = useRef<ScrollView>(null);
  const [selection, setSelection] = useState<Selection>(null);

  const days = useMemo(() => {
    const start = addDays(initialDay, -14);
    return Array.from({ length: 29 }, (_, i) => addDays(start, i));
  }, [initialDay]);

  const initialIndex = 14;
  const [pageIndex, setPageIndex] = useState(initialIndex);
  const currentDay = days[pageIndex] ?? initialDay;

  useEffect(() => {
    if (!visible) return;
    setPageIndex(initialIndex);
    setSelection(null);
    requestAnimationFrame(() => {
      pagerRef.current?.scrollTo({ x: SCREEN_W * initialIndex, animated: false });
    });
  }, [visible, initialDay, initialIndex]);

  const onMomentumEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const idx = Math.round(e.nativeEvent.contentOffset.x / SCREEN_W);
    if (idx !== pageIndex && days[idx]) {
      setPageIndex(idx);
      setSelectedDay(days[idx]);
      setSelection(null);
      Haptics.selectionAsync();
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.shell} edges={['top', 'left', 'right', 'bottom']}>
        <View style={styles.sheetHandle} />
        <View style={styles.header}>
          <View style={styles.headerCenter}>
            <Text style={styles.headerDow}>
              {format(currentDay, 'EEEE')}
              {isSameDay(currentDay, today) ? ' · Today' : ''}
            </Text>
            <Text style={styles.headerDate}>{format(currentDay, 'MMMM d, yyyy')}</Text>
          </View>
        </View>

        <ScrollView
          ref={pagerRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={onMomentumEnd}
          decelerationRate="fast"
          style={styles.pager}
        >
          {days.map((day, idx) => (
            <DayTimelinePage
              key={day.toISOString()}
              day={day}
              events={events}
              requests={requests}
              travels={travels}
              coupleNames={{ me: couple.me.shortName, partner: couple.partner.shortName }}
              selection={selection}
              isActive={idx === pageIndex}
              onSelectEvent={(event) => {
                setSelection({ kind: 'event', event });
                Haptics.selectionAsync();
              }}
              onSelectRequest={(request) => {
                setSelection({ kind: 'request', request });
                Haptics.selectionAsync();
              }}
              onSelectTravel={(travel) => {
                setSelection({ kind: 'travel', travel });
                Haptics.selectionAsync();
              }}
            />
          ))}
        </ScrollView>

        <EventInfoPanel
          selection={selection}
          onClose={() => setSelection(null)}
          onOpenRequest={(request) => {
            openSheet({ type: 'requestDetail', request });
          }}
          onCancelInvite={(request) => {
            declineRequest(request.id);
            setSelection(null);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          }}
        />
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  shell: {
    flex: 1,
    backgroundColor: colors.white,
    paddingTop: 8,
  },
  sheetHandle: {
    alignSelf: 'center',
    width: 36,
    height: 5,
    borderRadius: 3,
    backgroundColor: colors.fillStrong,
    marginTop: 4,
    marginBottom: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 20,
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
    gap: 6,
    paddingTop: 4,
  },
  headerDow: {
    fontFamily: 'Poppins_500Medium',
    fontSize: 14,
    color: colors.muted,
    letterSpacing: 0.2,
  },
  headerDate: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 20,
    color: colors.ink,
    letterSpacing: -0.3,
    lineHeight: 26,
  },
  pager: {
    flex: 1,
  },
  page: {
    flex: 1,
    paddingHorizontal: 16,
  },
  travelBannerList: {
    gap: 6,
    marginBottom: 18,
  },
  travelBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.fill,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  travelBannerSelected: {
    backgroundColor: colors.fillStrong,
  },
  travelBannerText: {
    fontFamily: 'Poppins_500Medium',
    fontSize: 14,
    color: colors.inkSoft,
  },
  laneLabels: {
    flexDirection: 'row',
    marginLeft: 48,
    marginBottom: 12,
    gap: 10,
  },
  laneLabel: {
    flex: 1,
    fontFamily: 'Poppins_500Medium',
    fontSize: 12,
    color: colors.inkSoft,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  timelineScroll: {
    flex: 1,
  },
  hourRow: {
    position: 'absolute',
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'flex-start',
    height: HOUR_HEIGHT,
  },
  hourLabel: {
    width: 44,
    fontFamily: 'Poppins_400Regular',
    fontSize: 11,
    color: colors.muted,
    marginTop: -7,
    textAlign: 'right',
    paddingRight: 8,
  },
  hourLine: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.hairline,
    marginTop: 0,
  },
  lanes: {
    position: 'absolute',
    left: 48,
    right: 0,
    top: 0,
    height: TIMELINE_HEIGHT,
    flexDirection: 'row',
    gap: 10,
  },
  lane: {
    flex: 1,
    position: 'relative',
  },
  workBlock: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    backgroundColor: 'rgba(120, 120, 128, 0.08)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(120, 120, 128, 0.12)',
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 0,
    opacity: 0.7,
  },
  workBlockText: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 12,
    color: colors.muted,
    fontStyle: 'italic',
  },
  block: {
    position: 'absolute',
    left: 0,
    right: 0,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 8,
    overflow: 'hidden',
    zIndex: 2,
  },
  blockSpanning: {
    left: 0,
    right: 0,
  },
  blockSolo: {
    backgroundColor: colors.fillStrong,
  },
  blockShared: {
    backgroundColor: colors.sharedSoft,
  },
  blockRequestIncoming: {
    backgroundColor: colors.sharedSoft,
    borderWidth: 1.5,
    borderColor: colors.shared,
    borderStyle: 'dashed',
  },
  blockRequestOutgoing: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: 'rgba(60, 60, 67, 0.35)',
    borderStyle: 'dashed',
  },
  blockSelected: {
    opacity: 1,
    transform: [{ scale: 1.01 }],
  },
  blockTitle: {
    fontFamily: 'Poppins_500Medium',
    fontSize: 13,
    color: colors.ink,
  },
  blockTitleShared: {
    color: colors.ink,
    fontFamily: 'Poppins_500Medium',
    fontSize: 13,
  },
  blockTitleRequest: {
    color: colors.ink,
    fontFamily: 'Poppins_500Medium',
    fontSize: 13,
  },
  blockTime: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 11,
    color: colors.muted,
    marginTop: 2,
  },
  blockTimeShared: {
    color: colors.inkSoft,
  },
  blockTimeRequest: {
    color: colors.inkSoft,
    fontFamily: 'Poppins_400Regular',
    fontSize: 11,
    marginTop: 2,
  },
  infoPanel: {
    marginHorizontal: 16,
    marginBottom: 8,
    backgroundColor: colors.mist,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.hairline,
  },
  infoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  infoEyebrow: {
    fontFamily: 'Poppins_500Medium',
    fontSize: 11,
    color: colors.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  infoTitle: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 18,
    color: colors.ink,
    letterSpacing: -0.3,
  },
  infoMeta: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 14,
    color: colors.inkSoft,
    marginTop: 4,
  },
  infoLocationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 4,
  },
  infoLocationText: {
    fontFamily: 'Poppins_500Medium',
    fontSize: 14,
    color: colors.ink,
    flexShrink: 1,
  },
  infoNotes: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 14,
    color: colors.muted,
    marginTop: 8,
  },
  infoAction: {
    marginTop: 14,
    backgroundColor: colors.ink,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  infoActionText: {
    fontFamily: 'Poppins_500Medium',
    fontSize: 14,
    color: colors.white,
  },
  infoCancel: {
    marginTop: 6,
    paddingVertical: 12,
    alignItems: 'center',
  },
  infoCancelText: {
    fontFamily: 'Poppins_500Medium',
    fontSize: 14,
    color: colors.danger,
  },
});
