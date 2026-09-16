import React, { useMemo } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { CalendarEvent } from '../types/calendar';
import { colors } from '../theme/colors';
import { type } from '../theme/typography';
import { useCalendar } from '../store/CalendarContext';
import {
  eventTouchesDay,
  format,
  getWeekDays,
  isSameDay,
  minutesFromDayStart,
} from '../utils/date';

const DAY_START_HOUR = 7;
const DAY_END_HOUR = 22;
const HOUR_HEIGHT = 56;
const TOTAL_HOURS = DAY_END_HOUR - DAY_START_HOUR;
const TIMELINE_HEIGHT = TOTAL_HOURS * HOUR_HEIGHT;

function EventChip({
  event,
  onPress,
  compact,
}: {
  event: CalendarEvent;
  onPress: () => void;
  compact?: boolean;
}) {
  const top = Math.max(0, minutesFromDayStart(event.start, DAY_START_HOUR)) * (HOUR_HEIGHT / 60);
  const rawHeight =
    ((event.end.getTime() - event.start.getTime()) / 60000) * (HOUR_HEIGHT / 60);
  const height = Math.max(rawHeight, event.owner === 'partner' ? 22 : 28);

  const isPartner = event.owner === 'partner';
  const isShared = event.owner === 'shared';

  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.chip,
        {
          top,
          height,
          zIndex: isShared ? 3 : isPartner ? 1 : 2,
          opacity: isPartner ? 0.72 : 1,
        },
        isPartner && styles.chipPartner,
        isShared && styles.chipShared,
        !isPartner && !isShared && styles.chipMe,
        compact && { left: 4, right: 4 },
      ]}
    >
      {isShared ? (
        <LinearGradient
          colors={[colors.sharedGlow, colors.shared]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
      ) : null}
      <View
        style={[
          styles.chipInner,
          isPartner && { borderColor: colors.partner, backgroundColor: colors.partnerSoft },
          !isPartner && !isShared && { backgroundColor: colors.me },
        ]}
      >
        <Text
          numberOfLines={height < 40 ? 1 : 2}
          style={[
            styles.chipTitle,
            {
              color: isPartner ? colors.partnerDeep : isShared ? colors.ink : colors.white,
            },
          ]}
        >
          {event.title}
        </Text>
        {height >= 44 ? (
          <Text
            style={[
              styles.chipTime,
              {
                color: isPartner
                  ? colors.partner
                  : isShared
                    ? colors.inkSoft
                    : 'rgba(255,255,255,0.85)',
              },
            ]}
          >
            {format(event.start, 'h:mm a')}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
}

export function WeekStrip() {
  const { weekAnchor, selectedDay, setSelectedDay, events, today } = useCalendar();
  const days = useMemo(() => getWeekDays(weekAnchor), [weekAnchor]);

  return (
    <View style={styles.strip}>
      {days.map((day) => {
        const selected = isSameDay(day, selectedDay);
        const isToday = isSameDay(day, today);
        const dayEvents = events.filter((e) => eventTouchesDay(e.start, e.end, day));
        const hasShared = dayEvents.some((e) => e.owner === 'shared');
        return (
          <Pressable
            key={day.toISOString()}
            onPress={() => setSelectedDay(day)}
            style={[styles.stripDay, selected && styles.stripDaySelected]}
          >
            <Text style={[styles.stripDow, selected && styles.stripTextSelected]}>
              {format(day, 'EEE')}
            </Text>
            <View style={[styles.stripDateWrap, isToday && styles.stripTodayRing]}>
              <Text style={[styles.stripDate, selected && styles.stripTextSelected]}>
                {format(day, 'd')}
              </Text>
            </View>
            <View style={styles.dots}>
              {dayEvents.some((e) => e.owner === 'me') ? (
                <View style={[styles.dot, { backgroundColor: colors.me }]} />
              ) : null}
              {dayEvents.some((e) => e.owner === 'partner') ? (
                <View style={[styles.dot, { backgroundColor: colors.partner }]} />
              ) : null}
              {hasShared ? (
                <View style={[styles.dot, { backgroundColor: colors.shared }]} />
              ) : null}
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

export function DayTimeline() {
  const { selectedDay, events, openSheet } = useCalendar();
  const { width } = useWindowDimensions();
  const gutter = 52;
  const columnWidth = width - 40 - gutter;

  const dayEvents = useMemo(
    () =>
      events
        .filter((e) => eventTouchesDay(e.start, e.end, selectedDay))
        .sort((a, b) => {
          const rank = { partner: 0, me: 1, shared: 2 };
          return rank[a.owner] - rank[b.owner] || a.start.getTime() - b.start.getTime();
        }),
    [events, selectedDay],
  );

  const hours = Array.from({ length: TOTAL_HOURS + 1 }, (_, i) => DAY_START_HOUR + i);

  return (
    <View style={styles.timelineCard}>
      <View style={styles.dayHeading}>
        <Text style={styles.dayTitle}>{format(selectedDay, 'EEEE')}</Text>
        <Text style={styles.dayMeta}>{format(selectedDay, 'MMMM d')}</Text>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 120 }}
      >
        <View style={{ height: TIMELINE_HEIGHT, marginLeft: 4 }}>
          {hours.map((hour) => {
            const top = (hour - DAY_START_HOUR) * HOUR_HEIGHT;
            return (
              <View key={hour} style={[styles.hourRow, { top }]}>
                <Text style={styles.hourLabel}>
                  {format(new Date(2026, 0, 1, hour), 'h a')}
                </Text>
                <View style={styles.hourLine} />
              </View>
            );
          })}

          <View style={[styles.eventsLayer, { left: gutter, width: columnWidth }]}>
            {dayEvents.map((event) => (
              <EventChip
                key={event.id}
                event={event}
                onPress={() => openSheet({ type: 'event', event })}
              />
            ))}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  strip: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
    marginTop: 8,
  },
  stripDay: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: 18,
    gap: 6,
  },
  stripDaySelected: {
    backgroundColor: colors.glassStrong,
    shadowColor: colors.ink,
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  stripDow: {
    ...type.micro,
    color: colors.muted,
    fontSize: 9,
  },
  stripDateWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stripTodayRing: {
    borderWidth: 1.5,
    borderColor: colors.me,
  },
  stripDate: {
    ...type.bodyMedium,
    color: colors.ink,
    fontSize: 16,
  },
  stripTextSelected: {
    color: colors.ink,
  },
  dots: {
    flexDirection: 'row',
    gap: 3,
    height: 6,
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: 3,
  },
  timelineCard: {
    flex: 1,
    marginTop: 14,
    backgroundColor: colors.glass,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: colors.line,
    paddingTop: 18,
    paddingHorizontal: 12,
    overflow: 'hidden',
  },
  dayHeading: {
    paddingHorizontal: 10,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
  },
  dayTitle: {
    ...type.title,
    color: colors.ink,
    fontSize: 24,
  },
  dayMeta: {
    ...type.caption,
    color: colors.muted,
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
    width: 46,
    ...type.micro,
    color: colors.muted,
    fontSize: 9,
  },
  hourLine: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.line,
  },
  eventsLayer: {
    position: 'absolute',
    top: 0,
    bottom: 0,
  },
  chip: {
    position: 'absolute',
    left: 0,
    right: 8,
    borderRadius: 14,
    overflow: 'hidden',
  },
  chipMe: {
    shadowColor: colors.meDeep,
    shadowOpacity: 0.25,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },
  chipPartner: {
    left: 10,
    right: 0,
  },
  chipShared: {
    left: 2,
    right: 4,
    borderWidth: 1,
    borderColor: 'rgba(201, 146, 58, 0.45)',
    shadowColor: colors.shared,
    shadowOpacity: 0.3,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  chipInner: {
    flex: 1,
    paddingHorizontal: 10,
    paddingVertical: 6,
    justifyContent: 'center',
    borderRadius: 14,
    borderWidth: 0,
  },
  chipTitle: {
    ...type.bodyMedium,
    fontSize: 13,
  },
  chipTime: {
    ...type.caption,
    fontSize: 11,
    marginTop: 2,
  },
});
