import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  Easing,
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
import * as Haptics from 'expo-haptics';
import {
  addDays,
  addMonths,
  format as formatDate,
  isSameDay as dfIsSameDay,
  startOfWeek,
} from 'date-fns';
import { CalendarEvent, SharedRequest, TravelStay } from '../types/calendar';
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
  travelTouchesDay,
  WEEK_STARTS_ON,
} from '../utils/date';

const { width: SCREEN_W } = Dimensions.get('window');
const WEEK_PAGE_COUNT = 41;
const WEEK_CENTER = 20;

function OwnerBadge({
  letter,
  tone,
}: {
  letter: string;
  tone: 'me' | 'partner' | 'shared';
}) {
  return (
    <View
      style={[
        styles.ownerBadge,
        tone === 'me' && styles.ownerBadgeMe,
        tone === 'partner' && styles.ownerBadgePartner,
        tone === 'shared' && styles.ownerBadgeShared,
      ]}
    >
      <Text style={styles.ownerBadgeText}>{letter}</Text>
    </View>
  );
}

function MiniInitial({
  letter,
  tone,
  selected,
}: {
  letter: string;
  tone: 'me' | 'partner' | 'shared';
  selected?: boolean;
}) {
  return (
    <View
      style={[
        styles.miniInitial,
        tone === 'me' && styles.miniInitialMe,
        tone === 'partner' && styles.miniInitialPartner,
        tone === 'shared' && styles.miniInitialShared,
        selected && tone !== 'shared' && styles.miniInitialOnDark,
        selected && tone === 'shared' && styles.miniInitialSharedOnDark,
      ]}
    >
      <Text
        style={[
          styles.miniInitialText,
          selected && tone !== 'shared' && styles.miniInitialTextOnDark,
          selected && tone === 'shared' && styles.miniInitialTextSharedOnDark,
        ]}
      >
        {letter}
      </Text>
    </View>
  );
}

function LinkedMonthMarks({
  meInitial,
  partnerInitial,
  selected,
}: {
  meInitial: string;
  partnerInitial: string;
  selected?: boolean;
}) {
  return (
    <View style={styles.linkedMonthPair}>
      <View style={styles.linkedMonthBar} />
      <View style={[styles.linkedMonthBadge, styles.linkedMonthFront]}>
        <MiniInitial letter={meInitial} tone="shared" selected={selected} />
      </View>
      <View style={[styles.linkedMonthBadge, styles.linkedMonthBack]}>
        <MiniInitial letter={partnerInitial} tone="shared" selected={selected} />
      </View>
    </View>
  );
}

function OwnerBadges({
  owner,
  meInitial,
  partnerInitial,
}: {
  owner: 'me' | 'partner' | 'shared' | 'both';
  meInitial: string;
  partnerInitial: string;
}) {
  if (owner === 'me') {
    return <OwnerBadge letter={meInitial} tone="me" />;
  }
  if (owner === 'partner') {
    return <OwnerBadge letter={partnerInitial} tone="partner" />;
  }
  return (
    <View style={styles.linkedPair}>
      <View style={styles.linkedBar} />
      <View style={[styles.linkedBadge, styles.linkedBadgeFront]}>
        <OwnerBadge letter={meInitial} tone="shared" />
      </View>
      <View style={[styles.linkedBadge, styles.linkedBadgeBack]}>
        <OwnerBadge letter={partnerInitial} tone="shared" />
      </View>
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
  meInitial,
  partnerInitial,
  travels,
  onPress,
  onRequestPress,
}: {
  day: Date;
  items: DayItem[];
  selected: boolean;
  isToday: boolean;
  index: number;
  meInitial: string;
  partnerInitial: string;
  travels: TravelStay[];
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

  const isEmpty = items.length === 0;
  const dayTravels = travels.filter((t) =>
    travelTouchesDay(t.start, t.end, day),
  );

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
      <PressableScale
        style={[styles.mainBox, isToday && styles.dayCardToday]}
        onPress={onPress}
        scaleTo={0.985}
        haptic="light"
      >
        <View style={styles.dateCol}>
          <Text style={[styles.dayDow, isToday && styles.dayDowToday]}>
            {format(day, 'EEE')}
          </Text>
          <Text style={[styles.dayDate, isToday && styles.dayDateToday]}>
            {format(day, 'MMM d')}
          </Text>
        </View>

        <View style={styles.dateDivider} />

        <View style={styles.plansCol}>
          {isEmpty && dayTravels.length === 0 ? (
            <Text style={styles.emptyPlans}>Free evening</Text>
          ) : null}

          {items.map((item) => {
            if (item.kind === 'event') {
              const { event } = item;
              const isShared = event.owner === 'shared';
              return (
                <View
                  key={event.id}
                  style={[styles.eventRow, isShared && styles.togetherBlob]}
                >
                  <EventLines
                    time={format(event.start, 'h:mm a')}
                    title={event.title}
                    titleStyle={isShared ? styles.planTitleShared : undefined}
                  />
                  <OwnerBadges
                    owner={event.owner}
                    meInitial={meInitial}
                    partnerInitial={partnerInitial}
                  />
                </View>
              );
            }

            const { request } = item;
            const outgoing = request.from === 'me';
            return (
              <Pressable
                key={`req-${request.id}`}
                onPress={() => onRequestPress(request)}
                style={[
                  styles.requestBox,
                  outgoing ? styles.requestBoxOutgoing : styles.requestBoxIncoming,
                ]}
              >
                <View style={styles.requestRowInner}>
                  <EventLines
                    time={format(request.proposedStart, 'h:mm a')}
                    title={request.title}
                    titleStyle={styles.requestTitle}
                  />
                  <View style={styles.requestMeta}>
                    <Text
                      style={[
                        styles.requestPillText,
                        outgoing && styles.requestPillOutgoing,
                      ]}
                    >
                      {outgoing ? 'Awaiting reply' : 'RSVP'}
                    </Text>
                    <OwnerBadges
                      owner="both"
                      meInitial={meInitial}
                      partnerInitial={partnerInitial}
                    />
                  </View>
                </View>
              </Pressable>
            );
          })}

          {dayTravels.map((travel) => (
            <View key={travel.id} style={styles.travelRow}>
              <OwnerBadge
                letter={travel.person === 'me' ? meInitial : partnerInitial}
                tone={travel.person === 'me' ? 'me' : 'partner'}
              />
              <Text style={styles.travelText}>in {travel.place}</Text>
            </View>
          ))}
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
    travels,
    today,
    openSheet,
    couple,
    jumpToDay,
  } = useCalendar();
  const [dayDetailOpen, setDayDetailOpen] = useState(false);
  const [detailDay, setDetailDay] = useState(selectedDay);
  const pagerRef = useRef<ScrollView>(null);
  const syncingFromAnchor = useRef(false);
  const pageIndexRef = useRef(WEEK_CENTER);

  const weekPages = useMemo(() => {
    const origin = startOfWeek(today, { weekStartsOn: WEEK_STARTS_ON });
    return Array.from({ length: WEEK_PAGE_COUNT }, (_, i) =>
      addDays(origin, (i - WEEK_CENTER) * 7),
    );
  }, [today]);

  const weekStart = startOfWeek(weekAnchor, { weekStartsOn: WEEK_STARTS_ON });
  const anchorIndex = useMemo(() => {
    const idx = weekPages.findIndex((w) => isSameDay(w, weekStart));
    return idx >= 0 ? idx : WEEK_CENTER;
  }, [weekPages, weekStart]);

  useEffect(() => {
    if (pageIndexRef.current === anchorIndex) return;
    syncingFromAnchor.current = true;
    pageIndexRef.current = anchorIndex;
    requestAnimationFrame(() => {
      pagerRef.current?.scrollTo({ x: SCREEN_W * anchorIndex, animated: true });
      setTimeout(() => {
        syncingFromAnchor.current = false;
      }, 350);
    });
  }, [anchorIndex]);

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

  const onWeekMomentumEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (syncingFromAnchor.current) return;
    const idx = Math.round(e.nativeEvent.contentOffset.x / SCREEN_W);
    if (idx === pageIndexRef.current) return;
    if (!weekPages[idx]) return;
    pageIndexRef.current = idx;
    jumpToDay(weekPages[idx]);
    Haptics.selectionAsync();
  };

  return (
    <View style={styles.weekWrap}>
      <ScrollView
        ref={pagerRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={onWeekMomentumEnd}
        decelerationRate="fast"
        style={styles.weekPager}
        contentOffset={{ x: SCREEN_W * WEEK_CENTER, y: 0 }}
      >
        {weekPages.map((weekStartDay, pageIdx) => {
          const days = getWeekDays(weekStartDay);
          return (
            <View key={weekStartDay.toISOString()} style={[styles.weekPage, { width: SCREEN_W }]}>
              <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.weekStack}
                nestedScrollEnabled
              >
                {days.map((day, index) => (
                  <DayCard
                    key={day.toISOString()}
                    day={day}
                    items={itemsForDay(day)}
                    selected={isSameDay(day, selectedDay)}
                    isToday={isSameDay(day, today)}
                    index={pageIdx === anchorIndex ? index : 0}
                    meInitial={couple.me.initial}
                    partnerInitial={couple.partner.initial}
                    travels={travels}
                    onPress={() => openDayDetail(day)}
                    onRequestPress={(request) =>
                      openSheet({ type: 'requestDetail', request })
                    }
                  />
                ))}
              </ScrollView>
            </View>
          );
        })}
      </ScrollView>

      <DayDetailModal
        visible={dayDetailOpen}
        initialDay={detailDay}
        onClose={() => setDayDetailOpen(false)}
      />
    </View>
  );
}

export function MonthViewModal({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose: () => void;
}) {
  const { weekAnchor, selectedDay, events, today, jumpToDay, couple } =
    useCalendar();
  const [monthAnchor, setMonthAnchor] = useState(weekAnchor);
  const slide = useRef(new Animated.Value(0)).current;
  const pagerRef = useRef<ScrollView>(null);
  const syncing = useRef(false);
  const PAGE_W = SCREEN_W;

  useEffect(() => {
    if (visible) {
      setMonthAnchor(weekAnchor);
      slide.setValue(40);
      Animated.timing(slide, {
        toValue: 0,
        duration: 220,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
      requestAnimationFrame(() => {
        pagerRef.current?.scrollTo({ x: PAGE_W, animated: false });
      });
    }
  }, [visible, weekAnchor, slide, PAGE_W]);

  const monthPages = useMemo(
    () => [addMonths(monthAnchor, -1), monthAnchor, addMonths(monthAnchor, 1)],
    [monthAnchor],
  );

  const dows = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

  const selectDay = (day: Date) => {
    jumpToDay(day);
    Haptics.selectionAsync();
    onClose();
  };

  const goMonth = (delta: number) => {
    setMonthAnchor((d) => addMonths(d, delta));
    requestAnimationFrame(() => {
      pagerRef.current?.scrollTo({ x: PAGE_W, animated: false });
    });
  };

  const onMonthMomentumEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (syncing.current) return;
    const idx = Math.round(e.nativeEvent.contentOffset.x / PAGE_W);
    if (idx === 1) return;
    syncing.current = true;
    const delta = idx === 0 ? -1 : 1;
    setMonthAnchor((d) => addMonths(d, delta));
    Haptics.selectionAsync();
    requestAnimationFrame(() => {
      pagerRef.current?.scrollTo({ x: PAGE_W, animated: false });
      syncing.current = false;
    });
  };

  if (!visible) return null;

  return (
    <Modal visible={visible} animationType="none" transparent onRequestClose={onClose}>
      <View style={styles.monthOverlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <Animated.View
          style={[
            styles.monthSheet,
            {
              opacity: slide.interpolate({
                inputRange: [0, 40],
                outputRange: [1, 0.85],
              }),
              transform: [{ translateY: slide }],
            },
          ]}
        >
          <View style={styles.monthHandle} />
          <View style={styles.monthHeader}>
            <PressableScale
              hitSlop={12}
              onPress={() => goMonth(-1)}
              style={styles.monthNavBtn}
              haptic="selection"
              scaleTo={0.9}
            >
              <Ionicons name="chevron-back" size={20} color={colors.ink} />
            </PressableScale>
            <Text style={styles.monthTitle}>{formatDate(monthAnchor, 'MMMM yyyy')}</Text>
            <PressableScale
              hitSlop={12}
              onPress={() => goMonth(1)}
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

          <ScrollView
            ref={pagerRef}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={onMonthMomentumEnd}
            decelerationRate="fast"
            style={styles.monthPager}
            contentOffset={{ x: PAGE_W, y: 0 }}
          >
            {monthPages.map((month) => {
              const grid = getMonthGrid(month);
              return (
                <View key={month.toISOString()} style={[styles.monthPage, { width: PAGE_W }]}>
                  <View style={styles.monthGrid}>
                    {grid.map((day) => {
                      const inMonth = isSameMonth(day, month);
                      const selected = isSameDay(day, selectedDay);
                      const isToday = isSameDay(day, today);
                      const dayEvents = events.filter((e) =>
                        eventTouchesDay(e.start, e.end, day),
                      );
                      const hasShared = dayEvents.some((e) => e.owner === 'shared');
                      const hasMine = dayEvents.some((e) => e.owner === 'me');
                      const hasPartner = dayEvents.some((e) => e.owner === 'partner');

                      return (
                        <View key={day.toISOString()} style={styles.monthCellWrap}>
                          <Pressable
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
                              {hasShared ? (
                                <LinkedMonthMarks
                                  meInitial={couple.me.initial}
                                  partnerInitial={couple.partner.initial}
                                  selected={selected}
                                />
                              ) : (
                                <>
                                  {hasMine ? (
                                    <MiniInitial
                                      letter={couple.me.initial}
                                      tone="me"
                                      selected={selected}
                                    />
                                  ) : null}
                                  {hasPartner ? (
                                    <MiniInitial
                                      letter={couple.partner.initial}
                                      tone="partner"
                                      selected={selected}
                                    />
                                  ) : null}
                                </>
                              )}
                            </View>
                          </Pressable>
                        </View>
                      );
                    })}
                  </View>
                </View>
              );
            })}
          </ScrollView>

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
    marginHorizontal: -20,
  },
  weekPager: {
    flex: 1,
  },
  weekPage: {
    flex: 1,
    paddingHorizontal: 20,
  },
  weekStack: {
    gap: 10,
    paddingBottom: 28,
    paddingTop: 2,
  },
  mainBox: {
    flexDirection: 'row',
    alignItems: 'stretch',
    backgroundColor: colors.canvasElevated,
    borderRadius: 18,
    paddingVertical: 14,
    paddingHorizontal: 14,
    minHeight: 88,
    width: '100%',
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
  plansCol: {
    flex: 1,
    justifyContent: 'center',
    gap: 8,
  },
  emptyPlans: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 13,
    color: '#C7C7CC',
    fontStyle: 'italic',
  },
  eventRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
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
  ownerBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ownerBadgeMe: {
    backgroundColor: colors.me,
  },
  ownerBadgePartner: {
    backgroundColor: colors.partner,
  },
  ownerBadgeShared: {
    backgroundColor: colors.shared,
  },
  ownerBadgeText: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 10,
    color: colors.white,
    textAlign: 'center',
    includeFontPadding: false,
    textAlignVertical: 'center',
    lineHeight: 12,
    width: 22,
    marginTop: 0.5,
  },
  linkedPair: {
    flexDirection: 'row',
    alignItems: 'center',
    width: 36,
    height: 22,
    position: 'relative',
  },
  linkedBar: {
    position: 'absolute',
    left: 10,
    right: 10,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.shared,
  },
  linkedBadge: {
    position: 'absolute',
    top: 0,
  },
  linkedBadgeFront: {
    left: 0,
    zIndex: 2,
  },
  linkedBadgeBack: {
    right: 0,
    zIndex: 1,
  },
  togetherBlob: {
    backgroundColor: colors.sharedSoft,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  requestBox: {
    borderRadius: 12,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  requestBoxIncoming: {
    borderColor: colors.shared,
    backgroundColor: colors.sharedSoft,
  },
  requestBoxOutgoing: {
    borderColor: 'rgba(60, 60, 67, 0.35)',
    backgroundColor: 'transparent',
  },
  requestRowInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  requestMeta: {
    alignItems: 'flex-end',
    gap: 6,
  },
  requestTitle: {
    fontFamily: 'Poppins_500Medium',
    fontSize: 13,
    color: colors.inkSoft,
  },
  requestPillText: {
    fontFamily: 'Poppins_500Medium',
    fontSize: 10,
    color: colors.shared,
  },
  requestPillOutgoing: {
    color: colors.muted,
  },
  travelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 2,
  },
  travelText: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 13,
    color: colors.inkSoft,
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
    paddingBottom: 24,
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
  monthPager: {
    marginHorizontal: -20,
  },
  monthPage: {
    paddingHorizontal: 20,
  },
  monthGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  monthCellWrap: {
    width: `${100 / 7}%` as `${number}%`,
  },
  monthCell: {
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
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
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
  miniInitialShared: {
    backgroundColor: colors.shared,
  },
  miniInitialOnDark: {
    backgroundColor: 'rgba(255,255,255,0.92)',
  },
  miniInitialSharedOnDark: {
    backgroundColor: 'rgba(255,255,255,0.95)',
  },
  miniInitialText: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 8,
    color: colors.white,
    lineHeight: 10,
    textAlign: 'center',
    includeFontPadding: false,
  },
  miniInitialTextOnDark: {
    color: colors.ink,
  },
  miniInitialTextSharedOnDark: {
    color: colors.shared,
  },
  linkedMonthPair: {
    width: 24,
    height: 14,
    position: 'relative',
  },
  linkedMonthBar: {
    position: 'absolute',
    left: 6,
    right: 6,
    top: 5,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.shared,
  },
  linkedMonthBadge: {
    position: 'absolute',
    top: 0,
  },
  linkedMonthFront: {
    left: 0,
    zIndex: 2,
  },
  linkedMonthBack: {
    right: 0,
    zIndex: 1,
  },
  monthClose: {
    marginTop: 8,
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
