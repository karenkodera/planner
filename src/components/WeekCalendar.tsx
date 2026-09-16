import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { addMonths, format as formatDate, isSameDay as dfIsSameDay } from 'date-fns';
import { CalendarEvent, SharedRequest } from '../types/calendar';
import { colors } from '../theme/colors';
import { type } from '../theme/typography';
import { useCalendar } from '../store/CalendarContext';
import { DayDetailModal } from './DayDetailModal';
import { PressableScale } from './PressableScale';
import {
  eventTouchesDay,
  format,
  getMonthGrid,
  getWeekDays,
  isSameDay,
  isSameMonth,
  overlaps,
} from '../utils/date';

function TogetherIcon({ size = 14 }: { size?: number }) {
  return <Ionicons name="people" size={size} color={colors.shared} />;
}

function MiniInitial({
  letter,
  tone,
  selected,
}: {
  letter: string;
  tone: 'me' | 'partner';
  selected?: boolean;
}) {
  return (
    <View
      style={[
        styles.miniInitial,
        tone === 'me' ? styles.miniInitialMe : styles.miniInitialPartner,
        selected && styles.miniInitialOnDark,
      ]}
    >
      <Text style={[styles.miniInitialText, selected && styles.miniInitialTextOnDark]}>
        {letter}
      </Text>
    </View>
  );
}

type DayItem =
  | { kind: 'event'; event: CalendarEvent }
  | { kind: 'request'; request: SharedRequest };

function EventLines({
  time,
  title,
  titleStyle,
  timeStyle,
}: {
  time: string;
  title: string;
  titleStyle?: object;
  timeStyle?: object;
}) {
  return (
    <View style={styles.eventText}>
      <Text style={[styles.planTime, timeStyle]}>{time}</Text>
      <Text numberOfLines={2} style={[styles.planTitle, titleStyle]}>
        {title}
      </Text>
    </View>
  );
}

function DayCard({
  day,
  items,
  isToday,
  index,
  onPress,
  onRequestPress,
}: {
  day: Date;
  items: DayItem[];
  selected: boolean;
  isToday: boolean;
  index: number;
  onPress: () => void;
  onRequestPress: (request: SharedRequest) => void;
}) {
  const appear = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(appear, {
      toValue: 1,
      duration: 320,
      delay: index * 45,
      useNativeDriver: true,
    }).start();
  }, [appear, index]);

  const mine = items.filter(
    (i) => i.kind === 'event' && i.event.owner === 'me',
  );
  const partner = items.filter(
    (i) => i.kind === 'event' && i.event.owner === 'partner',
  );
  const shared = items.filter(
    (i) => i.kind === 'event' && i.event.owner === 'shared',
  );
  const dayRequests = items.filter((i) => i.kind === 'request');
  const isEmpty =
    mine.length === 0
    && partner.length === 0
    && shared.length === 0
    && dayRequests.length === 0;

  const hasWrapCluster = shared.length > 0 && partner.length > 0;
  const sharedOnly = shared.length > 0 && partner.length === 0;

  return (
    <Animated.View
      style={{
        opacity: appear,
        transform: [
          {
            translateY: appear.interpolate({
              inputRange: [0, 1],
              outputRange: [10, 0],
            }),
          },
        ],
      }}
    >
      <PressableScale style={styles.dayCard} onPress={onPress} scaleTo={0.985} haptic="light">
        <View style={[styles.dayInner, isToday && styles.dayCardToday]}>
          <View style={styles.dateCol}>
            <Text style={[styles.dayDow, isToday && styles.dayDowToday]}>
              {format(day, 'EEE')}
            </Text>
            <Text style={[styles.dayDate, isToday && styles.dayDateToday]}>
              {format(day, 'MMM d')}
            </Text>
          </View>

          <View style={styles.dateDivider} />

          <View style={styles.cols}>
            {isEmpty ? (
              <View style={styles.emptyWrap}>
                <Text style={styles.emptyPlans}>Free evening</Text>
              </View>
            ) : null}

            {/* Solo plans in two columns (when not wrapped into together blob) */}
            {!hasWrapCluster && (mine.length > 0 || partner.length > 0 || dayRequests.length > 0) ? (
              <View style={styles.dualRow}>
                <View style={styles.lane}>
                  {mine.map((item) => {
                    if (item.kind !== 'event') return null;
                    return (
                      <EventLines
                        key={item.event.id}
                        time={format(item.event.start, 'h:mm a')}
                        title={item.event.title}
                      />
                    );
                  })}
                  {dayRequests.map((item) => {
                    if (item.kind !== 'request') return null;
                    const { request } = item;
                    return (
                      <Pressable
                        key={`req-${request.id}`}
                        onPress={() => onRequestPress(request)}
                        style={styles.requestBox}
                      >
                        <EventLines
                          time={format(request.proposedStart, 'h:mm a')}
                          title={request.title}
                          titleStyle={styles.requestTitle}
                        />
                        <Text style={styles.requestPillText}>Request</Text>
                      </Pressable>
                    );
                  })}
                  {mine.length === 0 && dayRequests.length === 0 && !sharedOnly ? (
                    <Text style={styles.emptyPlans}>You’re free</Text>
                  ) : null}
                </View>
                <View style={styles.lane}>
                  {partner.map((item) => {
                    if (item.kind !== 'event') return null;
                    return (
                      <EventLines
                        key={item.event.id}
                        time={format(item.event.start, 'h:mm a')}
                        title={item.event.title}
                        titleStyle={styles.partnerTitle}
                        timeStyle={styles.partnerTime}
                      />
                    );
                  })}
                </View>
              </View>
            ) : null}

            {/* Shared alone — one spanning blob across both columns */}
            {sharedOnly
              ? shared.map((item) => {
                  if (item.kind !== 'event') return null;
                  const { event } = item;
                  return (
                    <View key={event.id} style={styles.togetherBlob}>
                      <View style={styles.togetherBlobInner}>
                        <EventLines
                          time={format(event.start, 'h:mm a')}
                          title={event.title}
                          titleStyle={styles.planTitleShared}
                        />
                        <View style={styles.togetherBadge}>
                          <TogetherIcon size={14} />
                        </View>
                      </View>
                    </View>
                  );
                })
              : null}

            {/* Shared + partner — melted blob wrapping around partner events */}
            {hasWrapCluster ? (
              <View style={styles.togetherWrap}>
                <View
                  style={[
                    styles.wrapTop,
                    mine.length === 0 && dayRequests.length === 0 && styles.wrapTopPartnerOnly,
                  ]}
                >
                  {mine.length > 0 || dayRequests.length > 0 ? (
                    <View style={styles.wrapLeft}>
                      {mine.map((item) => {
                        if (item.kind !== 'event') return null;
                        return (
                          <EventLines
                            key={item.event.id}
                            time={format(item.event.start, 'h:mm a')}
                            title={item.event.title}
                          />
                        );
                      })}
                      {dayRequests.map((item) => {
                        if (item.kind !== 'request') return null;
                        const { request } = item;
                        return (
                          <Pressable
                            key={`req-${request.id}`}
                            onPress={() => onRequestPress(request)}
                            style={styles.requestBox}
                          >
                            <EventLines
                              time={format(request.proposedStart, 'h:mm a')}
                              title={request.title}
                              titleStyle={styles.requestTitle}
                            />
                            <Text style={styles.requestPillText}>Request</Text>
                          </Pressable>
                        );
                      })}
                    </View>
                  ) : (
                    <View style={styles.wrapLeftSpacer} />
                  )}
                  <View style={styles.wrapIsland}>
                    {partner.map((item) => {
                      if (item.kind !== 'event') return null;
                      return (
                        <EventLines
                          key={item.event.id}
                          time={format(item.event.start, 'h:mm a')}
                          title={item.event.title}
                          titleStyle={styles.partnerTitle}
                          timeStyle={styles.partnerTime}
                        />
                      );
                    })}
                  </View>
                </View>
                {shared.map((item) => {
                  if (item.kind !== 'event') return null;
                  const { event } = item;
                  return (
                    <View key={event.id} style={styles.wrapSharedRow}>
                      <EventLines
                        time={format(event.start, 'h:mm a')}
                        title={event.title}
                        titleStyle={styles.planTitleShared}
                      />
                      <View style={styles.togetherBadge}>
                        <TogetherIcon size={14} />
                      </View>
                    </View>
                  );
                })}
              </View>
            ) : null}

            {/* Shared-only day still needs requests under blob */}
            {sharedOnly && dayRequests.length > 0 ? (
              <View style={styles.dualRow}>
                <View style={styles.lane}>
                  {dayRequests.map((item) => {
                    if (item.kind !== 'request') return null;
                    const { request } = item;
                    return (
                      <Pressable
                        key={`req-${request.id}`}
                        onPress={() => onRequestPress(request)}
                        style={styles.requestBox}
                      >
                        <EventLines
                          time={format(request.proposedStart, 'h:mm a')}
                          title={request.title}
                          titleStyle={styles.requestTitle}
                        />
                        <Text style={styles.requestPillText}>Request</Text>
                      </Pressable>
                    );
                  })}
                </View>
                <View style={styles.lane} />
              </View>
            ) : null}
          </View>
        </View>
      </PressableScale>
    </Animated.View>
  );
}

export function WeekDayCards() {
  const {
    weekAnchor,
    selectedDay,
    setSelectedDay,
    events,
    requests,
    today,
    openSheet,
    couple,
  } = useCalendar();
  const [monthOpen, setMonthOpen] = useState(false);
  const [dayDetailOpen, setDayDetailOpen] = useState(false);
  const [detailDay, setDetailDay] = useState(selectedDay);

  const days = useMemo(() => getWeekDays(weekAnchor), [weekAnchor]);

  const itemsForDay = (day: Date): DayItem[] => {
    const dayEvents = events
      .filter((e) => eventTouchesDay(e.start, e.end, day))
      .map((event) => ({ kind: 'event' as const, event }));

    const myBusy = events.filter(
      (e) =>
        (e.owner === 'me' || e.owner === 'shared')
        && eventTouchesDay(e.start, e.end, day),
    );

    const dayRequests = requests
      .filter((r) => {
        if (r.status !== 'pending' && r.status !== 'suggested') return false;
        if (!dfIsSameDay(r.proposedStart, day)) return false;
        return !myBusy.some((e) =>
          overlaps(e.start, e.end, r.proposedStart, r.proposedEnd),
        );
      })
      .map((request) => ({ kind: 'request' as const, request }));

    return [...dayEvents, ...dayRequests].sort((a, b) => {
      const aStart = a.kind === 'event' ? a.event.start : a.request.proposedStart;
      const bStart = b.kind === 'event' ? b.event.start : b.request.proposedStart;
      return aStart.getTime() - bStart.getTime();
    });
  };

  const openDayDetail = (day: Date) => {
    setSelectedDay(day);
    setDetailDay(day);
    setDayDetailOpen(true);
  };

  return (
    <View style={styles.weekWrap}>
      <View style={styles.colHeaders}>
        <View style={styles.dateColSpacer} />
        <View style={styles.colHeaderDivider} />
        <View style={styles.colHeaderLanes}>
          <Text style={styles.colHeaderText}>{couple.me.name}</Text>
          <Text style={styles.colHeaderText}>{couple.partner.name}</Text>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.weekStack}
      >
        {days.map((day, index) => (
          <DayCard
            key={day.toISOString()}
            day={day}
            items={itemsForDay(day)}
            selected={isSameDay(day, selectedDay)}
            isToday={isSameDay(day, today)}
            index={index}
            onPress={() => openDayDetail(day)}
            onRequestPress={(request) =>
              openSheet({ type: 'requestDetail', request })
            }
          />
        ))}

        <PressableScale
          style={styles.monthButton}
          onPress={() => setMonthOpen(true)}
          haptic="light"
        >
          <Ionicons name="calendar-outline" size={18} color={colors.white} />
          <Text style={styles.monthButtonText}>Calendar view</Text>
        </PressableScale>
      </ScrollView>

      <MonthViewModal
        visible={monthOpen}
        onClose={() => setMonthOpen(false)}
      />
      <DayDetailModal
        visible={dayDetailOpen}
        initialDay={detailDay}
        onClose={() => setDayDetailOpen(false)}
      />
    </View>
  );
}

function MonthViewModal({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose: () => void;
}) {
  const { weekAnchor, selectedDay, events, today, jumpToDay, couple } =
    useCalendar();
  const [monthAnchor, setMonthAnchor] = useState(weekAnchor);
  const slide = useRef(new Animated.Value(480)).current;

  useEffect(() => {
    if (visible) setMonthAnchor(weekAnchor);
  }, [visible, weekAnchor]);

  useEffect(() => {
    if (!visible) return;
    slide.setValue(480);
    Animated.spring(slide, {
      toValue: 0,
      damping: 22,
      stiffness: 220,
      useNativeDriver: true,
    }).start();
  }, [visible, slide]);

  const grid = useMemo(() => getMonthGrid(monthAnchor), [monthAnchor]);
  const dows = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

  const selectDay = (day: Date) => {
    jumpToDay(day);
    Haptics.selectionAsync();
    onClose();
  };

  return (
    <Modal visible={visible} animationType="none" transparent onRequestClose={onClose}>
      <View style={styles.monthOverlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <Animated.View style={[styles.monthSheet, { transform: [{ translateY: slide }] }]}>
          <View style={styles.monthHandle} />
          <View style={styles.monthHeader}>
            <PressableScale
              hitSlop={12}
              onPress={() => {
                setMonthAnchor((d) => addMonths(d, -1));
              }}
              style={styles.monthNavBtn}
              haptic="selection"
              scaleTo={0.9}
            >
              <Ionicons name="chevron-back" size={20} color={colors.ink} />
            </PressableScale>
            <Text style={styles.monthTitle}>{formatDate(monthAnchor, 'MMMM yyyy')}</Text>
            <PressableScale
              hitSlop={12}
              onPress={() => {
                setMonthAnchor((d) => addMonths(d, 1));
              }}
              style={styles.monthNavBtn}
              haptic="selection"
              scaleTo={0.9}
            >
              <Ionicons name="chevron-forward" size={20} color={colors.ink} />
            </PressableScale>
          </View>

          <View style={styles.dowRow}>
            {dows.map((d, i) => (
              <Text key={`${d}-${i}`} style={styles.dowCell}>
                {d}
              </Text>
            ))}
          </View>

          <View style={styles.monthGrid}>
            {grid.map((day) => {
              const inMonth = isSameMonth(day, monthAnchor);
              const selected = isSameDay(day, selectedDay);
              const isToday = isSameDay(day, today);
              const dayEvents = events.filter((e) =>
                eventTouchesDay(e.start, e.end, day),
              );
              const hasShared = dayEvents.some((e) => e.owner === 'shared');
              const hasMine = dayEvents.some((e) => e.owner === 'me');
              const hasPartner = dayEvents.some((e) => e.owner === 'partner');

              return (
                <Pressable
                  key={day.toISOString()}
                  onPress={() => selectDay(day)}
                  style={[
                    styles.monthCell,
                    selected && styles.monthCellSelected,
                    isToday && !selected && styles.monthCellToday,
                    !inMonth && styles.monthCellMuted,
                  ]}
                >
                  <Text
                    style={[
                      styles.monthDayNum,
                      selected && styles.monthDayNumSelected,
                      !inMonth && styles.monthDayNumMuted,
                    ]}
                  >
                    {format(day, 'd')}
                  </Text>
                  <View style={styles.monthMarks}>
                    {(hasMine || hasShared) && (
                      <MiniInitial
                        letter={couple.me.initial}
                        tone="me"
                        selected={selected}
                      />
                    )}
                    {(hasPartner || hasShared) && (
                      <MiniInitial
                        letter={couple.partner.initial}
                        tone="partner"
                        selected={selected}
                      />
                    )}
                  </View>
                </Pressable>
              );
            })}
          </View>

          <PressableScale style={styles.monthClose} onPress={onClose} haptic="light">
            <Text style={styles.monthCloseText}>Done</Text>
          </PressableScale>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  weekWrap: {
    flex: 1,
    marginTop: 2,
  },
  colHeaders: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    paddingHorizontal: 14,
  },
  dateColSpacer: {
    width: 64,
  },
  colHeaderDivider: {
    width: StyleSheet.hairlineWidth,
    marginHorizontal: 12,
  },
  colHeaderLanes: {
    flex: 1,
    flexDirection: 'row',
    gap: 10,
  },
  colHeaderText: {
    flex: 1,
    fontFamily: 'Poppins_500Medium',
    fontSize: 12,
    color: colors.muted,
    letterSpacing: 0.2,
  },
  weekStack: {
    gap: 10,
    paddingBottom: 28,
    paddingTop: 2,
  },
  dayCard: {
    borderRadius: 18,
  },
  dayInner: {
    flexDirection: 'row',
    alignItems: 'stretch',
    backgroundColor: colors.canvasElevated,
    borderRadius: 18,
    paddingVertical: 14,
    paddingHorizontal: 14,
    minHeight: 88,
  },
  dayCardToday: {
    borderWidth: 1.5,
    borderColor: colors.ink,
  },
  dateCol: {
    width: 64,
    justifyContent: 'center',
    paddingRight: 4,
  },
  dayDow: {
    fontFamily: 'Poppins_500Medium',
    fontSize: 11,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    color: colors.muted,
  },
  dayDowToday: {
    color: colors.ink,
  },
  dayDate: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 16,
    letterSpacing: -0.2,
    color: colors.muted,
    lineHeight: 22,
    marginTop: 2,
  },
  dayDateToday: {
    color: colors.ink,
  },
  dateDivider: {
    width: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(60, 60, 67, 0.28)',
    marginHorizontal: 12,
    alignSelf: 'stretch',
  },
  cols: {
    flex: 1,
    gap: 8,
    justifyContent: 'center',
  },
  emptyWrap: {
    paddingVertical: 4,
  },
  dualRow: {
    flexDirection: 'row',
    gap: 10,
  },
  lane: {
    flex: 1,
    gap: 8,
    justifyContent: 'center',
  },
  emptyPlans: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 13,
    color: '#C7C7CC',
    fontStyle: 'italic',
  },
  eventText: {
    gap: 2,
    flex: 1,
  },
  planTime: {
    fontFamily: 'Poppins_500Medium',
    fontSize: 11,
    color: colors.muted,
  },
  planTitle: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 13,
    color: colors.ink,
  },
  planTitleShared: {
    fontFamily: 'Poppins_500Medium',
    fontSize: 13,
    color: colors.ink,
  },
  partnerTime: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 11,
    color: colors.muted,
  },
  partnerTitle: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 13,
    color: colors.inkSoft,
  },
  togetherBlob: {
    backgroundColor: colors.sharedSoft,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  togetherBlobInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  togetherWrap: {
    backgroundColor: colors.sharedSoft,
    borderRadius: 16,
    padding: 10,
    gap: 8,
  },
  wrapTop: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'stretch',
  },
  wrapTopPartnerOnly: {
    justifyContent: 'flex-end',
  },
  wrapLeft: {
    flex: 1,
    justifyContent: 'center',
  },
  wrapLeftSpacer: {
    flex: 1,
  },
  wrapIsland: {
    flex: 1,
    backgroundColor: colors.white,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 8,
    gap: 6,
  },
  wrapSharedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 4,
    paddingBottom: 2,
  },
  requestBox: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(60, 60, 67, 0.35)',
    borderStyle: 'dashed',
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: 'transparent',
    gap: 4,
  },
  requestTitle: {
    fontFamily: 'Poppins_500Medium',
    fontSize: 13,
    color: colors.inkSoft,
  },
  requestPillText: {
    fontFamily: 'Poppins_500Medium',
    fontSize: 10,
    color: colors.muted,
  },
  togetherBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthButton: {
    marginTop: 12,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.ink,
    borderRadius: 999,
    paddingVertical: 14,
    paddingHorizontal: 22,
    minHeight: 48,
  },
  monthButtonText: {
    fontFamily: 'Poppins_500Medium',
    fontSize: 14,
    color: colors.white,
  },
  monthOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.28)',
  },
  monthSheet: {
    backgroundColor: colors.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 36,
  },
  monthHandle: {
    alignSelf: 'center',
    width: 36,
    height: 5,
    borderRadius: 3,
    backgroundColor: colors.fillStrong,
    marginBottom: 16,
  },
  monthHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 18,
  },
  monthNavBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.fill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthTitle: {
    ...type.title,
    fontSize: 20,
    color: colors.ink,
  },
  dowRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  dowCell: {
    flex: 1,
    textAlign: 'center',
    fontFamily: 'Poppins_500Medium',
    fontSize: 11,
    color: colors.muted,
  },
  monthGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  monthCell: {
    width: `${100 / 7}%` as `${number}%`,
    aspectRatio: 0.95,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    paddingVertical: 4,
  },
  monthCellSelected: {
    backgroundColor: colors.accent,
  },
  monthCellToday: {
    backgroundColor: colors.accentSoft,
  },
  monthCellMuted: {
    opacity: 0.35,
  },
  monthDayNum: {
    fontFamily: 'Poppins_500Medium',
    fontSize: 15,
    color: colors.ink,
  },
  monthDayNumSelected: {
    color: colors.white,
  },
  monthDayNumMuted: {
    color: colors.muted,
  },
  monthMarks: {
    flexDirection: 'row',
    gap: 3,
    height: 14,
    alignItems: 'center',
    marginTop: 3,
  },
  miniInitial: {
    width: 14,
    height: 14,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
  },
  miniInitialMe: {
    backgroundColor: colors.me,
  },
  miniInitialPartner: {
    backgroundColor: colors.partner,
  },
  miniInitialOnDark: {
    backgroundColor: 'rgba(255,255,255,0.92)',
  },
  miniInitialText: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 8,
    color: colors.white,
    lineHeight: 10,
  },
  miniInitialTextOnDark: {
    color: colors.ink,
  },
  monthClose: {
    marginTop: 18,
    backgroundColor: colors.fill,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  monthCloseText: {
    fontFamily: 'Poppins_500Medium',
    color: colors.ink,
  },
});
