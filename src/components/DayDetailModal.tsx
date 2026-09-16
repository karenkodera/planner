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
import { CalendarEvent, SharedRequest } from '../types/calendar';
import { colors } from '../theme/colors';
import { useCalendar } from '../store/CalendarContext';
import { eventTouchesDay, format, formatEventTime, isSameDay, overlaps } from '../utils/date';

const HOUR_HEIGHT = 64;
const DAY_START = 8;
const DAY_END = 22;
const WORK_END = 17;
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
        {outgoing ? ' · requested' : ' · request'}
      </Text>
    </Pressable>
  );
}

type Selection =
  | { kind: 'event'; event: CalendarEvent }
  | { kind: 'request'; request: SharedRequest }
  | null;

function DayTimelinePage({
  day,
  events,
  requests,
  coupleNames,
  selection,
  onSelectEvent,
  onSelectRequest,
}: {
  day: Date;
  events: CalendarEvent[];
  requests: SharedRequest[];
  coupleNames: { me: string; partner: string };
  selection: Selection;
  onSelectEvent: (e: CalendarEvent) => void;
  onSelectRequest: (r: SharedRequest) => void;
}) {
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

  const selectedId =
    selection?.kind === 'event'
      ? selection.event.id
      : selection?.kind === 'request'
        ? selection.request.id
        : null;

  const workHeight = (WORK_END - DAY_START) * HOUR_HEIGHT;

  return (
    <View style={[styles.page, { width: SCREEN_W }]}>
      <View style={styles.laneLabels}>
        <Text style={styles.laneLabel}>{coupleNames.me}</Text>
        <Text style={styles.laneLabel}>{coupleNames.partner}</Text>
      </View>

      <ScrollView
        style={styles.timelineScroll}
        contentContainerStyle={{ paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ height: TIMELINE_HEIGHT + 24 }}>
          {HOURS.map((hour) => {
            const top = (hour - DAY_START) * HOUR_HEIGHT;
            return (
              <View key={hour} style={[styles.hourRow, { top }]}>
                <Text style={styles.hourLabel}>
                  {formatDate(new Date(2026, 0, 1, hour), 'h a')}
                </Text>
                <View style={styles.hourLine} />
              </View>
            );
          })}

          <View style={styles.lanes}>
            {isWeekday(day) ? (
              <View style={[styles.workBlock, { height: workHeight }]} pointerEvents="none">
                <Text style={styles.workBlockText}>Until 5pm</Text>
              </View>
            ) : null}

            <View style={styles.lane}>
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
}: {
  selection: Selection;
  onClose: () => void;
  onOpenRequest: (r: SharedRequest) => void;
}) {
  const { couple } = useCalendar();
  if (!selection) return null;

  if (selection.kind === 'request') {
    const { request } = selection;
    return (
      <View style={styles.infoPanel}>
        <View style={styles.infoHeader}>
          <Text style={styles.infoEyebrow}>Request</Text>
          <Pressable onPress={onClose} hitSlop={10}>
            <Ionicons name="close" size={18} color={colors.muted} />
          </Pressable>
        </View>
        <Text style={styles.infoTitle}>{request.title}</Text>
        <Text style={styles.infoMeta}>
          {formatEventTime(request.proposedStart, request.proposedEnd)}
        </Text>
        {request.location ? <Text style={styles.infoMeta}>{request.location}</Text> : null}
        {request.notes ? <Text style={styles.infoNotes}>{request.notes}</Text> : null}
        <Pressable style={styles.infoAction} onPress={() => onOpenRequest(request)}>
          <Text style={styles.infoActionText}>Respond to request</Text>
        </Pressable>
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
      {event.location ? <Text style={styles.infoMeta}>{event.location}</Text> : null}
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
  const { events, requests, setSelectedDay, openSheet, today, couple } = useCalendar();
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
        <View style={styles.header}>
          <Pressable onPress={onClose} hitSlop={12} style={styles.closeBtn}>
            <Ionicons name="chevron-down" size={24} color={colors.ink} />
          </Pressable>
          <View style={styles.headerCenter}>
            <Text style={styles.headerDow}>
              {format(currentDay, 'EEEE')}
              {isSameDay(currentDay, today) ? ' · Today' : ''}
            </Text>
            <Text style={styles.headerDate}>{format(currentDay, 'MMMM d, yyyy')}</Text>
          </View>
          <View style={styles.headerSpacer} />
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
          {days.map((day) => (
            <DayTimelinePage
              key={day.toISOString()}
              day={day}
              events={events}
              requests={requests}
              coupleNames={{ me: couple.me.name, partner: couple.partner.name }}
              selection={selection}
              onSelectEvent={(event) => {
                setSelection({ kind: 'event', event });
                Haptics.selectionAsync();
              }}
              onSelectRequest={(request) => {
                setSelection({ kind: 'request', request });
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
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 20,
    gap: 8,
  },
  closeBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
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
  headerSpacer: {
    width: 44,
  },
  pager: {
    flex: 1,
  },
  page: {
    flex: 1,
    paddingHorizontal: 16,
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
    alignItems: 'center',
    height: 20,
  },
  hourLabel: {
    width: 44,
    fontFamily: 'Poppins_400Regular',
    fontSize: 11,
    color: colors.muted,
  },
  hourLine: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.hairline,
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
    backgroundColor: colors.canvasElevated,
    borderRadius: 18,
    padding: 16,
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
});
