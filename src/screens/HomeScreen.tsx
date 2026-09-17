import React, { useMemo, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  LayoutAnimation,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  UIManager,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { PressableScale } from '../components/PressableScale';
import { MonthViewModal, WeekDayCards } from '../components/WeekCalendar';
import { ProfileModal } from '../components/ProfileModal';
import { NotificationsModal } from '../components/NotificationsModal';
import { SheetsHost } from '../components/Sheets';
import { useCalendar } from '../store/CalendarContext';
import { colors } from '../theme/colors';
import { type } from '../theme/typography';
import { format, weekLabel } from '../utils/date';
import { AtmosphereBackground } from '../components/Atmosphere';

if (
  Platform.OS === 'android'
  && UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export function HomeScreen() {
  const {
    weekAnchor,
    goWeek,
    jumpToDay,
    openSheet,
    pendingCount,
    today,
    events,
    requests,
    couple,
    meColor,
  } = useCalendar();
  const lastWeekTap = useRef(0);
  const [searchOpen, setSearchOpen] = useState(false);
  const [monthOpen, setMonthOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const weekPulse = useRef(new Animated.Value(1)).current;
  const searchSlide = useRef(new Animated.Value(0)).current;

  const activeRequests = useMemo(
    () =>
      requests.filter(
        (r) =>
          r.from === 'partner'
          && (r.status === 'pending' || r.status === 'suggested'),
      ),
    [requests],
  );

  const openSearch = () => {
    setQuery('');
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    LayoutAnimation.configureNext(
      LayoutAnimation.create(
        200,
        LayoutAnimation.Types.easeInEaseOut,
        LayoutAnimation.Properties.opacity,
      ),
    );
    setSearchOpen(true);
    searchSlide.setValue(10);
    Animated.timing(searchSlide, {
      toValue: 0,
      duration: 180,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  };

  const closeSearch = () => {
    Haptics.selectionAsync();
    LayoutAnimation.configureNext(
      LayoutAnimation.create(
        180,
        LayoutAnimation.Types.easeInEaseOut,
        LayoutAnimation.Properties.opacity,
      ),
    );
    setSearchOpen(false);
    setQuery('');
  };

  const onWeekLabelPress = () => {
    const now = Date.now();
    if (now - lastWeekTap.current < 320) {
      jumpToDay(today);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Animated.sequence([
        Animated.spring(weekPulse, { toValue: 1.04, useNativeDriver: true, friction: 5 }),
        Animated.spring(weekPulse, { toValue: 1, useNativeDriver: true, friction: 6 }),
      ]).start();
      lastWeekTap.current = 0;
      return;
    }
    lastWeekTap.current = now;
  };

  const q = query.trim().toLowerCase();
  const matchedEvents = useMemo(() => {
    if (!q) return [];
    return events.filter(
      (e) =>
        e.title.toLowerCase().includes(q)
        || (e.location ?? '').toLowerCase().includes(q)
        || (e.notes ?? '').toLowerCase().includes(q),
    );
  }, [events, q]);
  const matchedRequests = useMemo(() => {
    if (!q) return [];
    return requests.filter(
      (r) =>
        r.title.toLowerCase().includes(q)
        || (r.location ?? '').toLowerCase().includes(q)
        || (r.notes ?? '').toLowerCase().includes(q),
    );
  }, [requests, q]);

  return (
    <AtmosphereBackground>
      <SafeAreaView style={styles.safe} edges={['top', 'left', 'right', 'bottom']}>
        <View style={styles.header}>
          {searchOpen ? (
            <Animated.View
              style={[
                styles.searchRow,
                { transform: [{ translateY: searchSlide }] },
              ]}
            >
              <View style={styles.searchField}>
                <Ionicons name="search" size={18} color={colors.muted} />
                <TextInput
                  value={query}
                  onChangeText={setQuery}
                  placeholder="Search plans…"
                  placeholderTextColor={colors.muted}
                  style={styles.searchInput}
                  autoFocus
                  returnKeyType="search"
                />
                {query.length > 0 ? (
                  <Pressable onPress={() => setQuery('')} hitSlop={8}>
                    <Ionicons name="close-circle" size={18} color={colors.muted} />
                  </Pressable>
                ) : null}
              </View>
              <PressableScale
                style={styles.searchCancel}
                onPress={closeSearch}
                haptic="selection"
                scaleTo={0.94}
              >
                <Text style={styles.searchCancelText}>Cancel</Text>
              </PressableScale>
            </Animated.View>
          ) : (
            <View style={styles.actionRow}>
              <View style={styles.leftStack}>
                <PressableScale
                  style={[styles.profileBtn, { backgroundColor: meColor }]}
                  onPress={() => setProfileOpen(true)}
                  haptic="selection"
                  scaleTo={0.92}
                >
                  <Text style={styles.profileBtnText}>{couple.me.initial}</Text>
                </PressableScale>

                {activeRequests.length > 0 ? (
                  <PressableScale
                    style={styles.topBtn}
                    onPress={() => openSheet({ type: 'requests' })}
                    haptic="selection"
                  >
                    <Ionicons name="notifications" size={16} color={colors.ink} />
                    <Text style={styles.topBtnText}>Requests</Text>
                    {pendingCount > 0 ? (
                      <View style={styles.badge}>
                        <Text style={styles.badgeText}>{pendingCount}</Text>
                      </View>
                    ) : null}
                  </PressableScale>
                ) : null}
              </View>

              <View style={styles.iconGroup}>
                <PressableScale
                  style={styles.iconBtn}
                  onPress={() => setMonthOpen(true)}
                  haptic="selection"
                  scaleTo={0.9}
                >
                  <Ionicons name="calendar-outline" size={20} color={colors.ink} />
                </PressableScale>
                <PressableScale
                  style={styles.iconBtn}
                  onPress={openSearch}
                  haptic="selection"
                  scaleTo={0.9}
                >
                  <Ionicons name="search" size={20} color={colors.ink} />
                </PressableScale>
                <PressableScale
                  style={styles.iconBtn}
                  onPress={() => setNotificationsOpen(true)}
                  haptic="selection"
                  scaleTo={0.9}
                >
                  <Ionicons name="notifications-outline" size={20} color={colors.ink} />
                </PressableScale>
              </View>
            </View>
          )}
        </View>

        {searchOpen && q ? (
          <View style={styles.searchResults}>
            <ScrollView
              keyboardShouldPersistTaps="handled"
              style={{ maxHeight: 220 }}
              showsVerticalScrollIndicator={false}
            >
              {matchedEvents.map((event) => (
                <PressableScale
                  key={event.id}
                  style={styles.resultRow}
                  onPress={() => {
                    jumpToDay(event.start);
                    closeSearch();
                  }}
                  haptic="selection"
                >
                  <View style={{ flex: 1 }}>
                    <Text style={styles.resultTitle}>{event.title}</Text>
                    <Text style={styles.resultMeta}>
                      {format(event.start, 'EEE · MMM d · h:mm a')}
                      {' · '}
                      {event.owner === 'me'
                        ? couple.me.name
                        : event.owner === 'partner'
                          ? couple.partner.shortName
                          : 'Together'}
                    </Text>
                  </View>
                </PressableScale>
              ))}
              {matchedRequests.map((request) => (
                <PressableScale
                  key={request.id}
                  style={styles.resultRow}
                  onPress={() => {
                    openSheet({ type: 'requestDetail', request });
                    closeSearch();
                  }}
                  haptic="selection"
                >
                  <View style={{ flex: 1 }}>
                    <Text style={styles.resultTitle}>{request.title}</Text>
                    <Text style={styles.resultMeta}>
                      {format(request.proposedStart, 'EEE · MMM d · h:mm a')} · RSVP
                    </Text>
                  </View>
                </PressableScale>
              ))}
              {!matchedEvents.length && !matchedRequests.length ? (
                <Text style={styles.noResults}>No matches</Text>
              ) : null}
            </ScrollView>
          </View>
        ) : null}

        <Animated.View
          style={[
            styles.weekNav,
            {
              transform: [{ scale: weekPulse }],
              marginBottom: 12,
            },
          ]}
        >
          <PressableScale
            onPress={() => goWeek(-1)}
            hitSlop={12}
            style={styles.navBtn}
            haptic="selection"
            scaleTo={0.9}
          >
            <Ionicons name="chevron-back" size={18} color={colors.ink} />
          </PressableScale>
          <Pressable onPress={onWeekLabelPress} style={styles.weekLabelHit}>
            <Text style={styles.weekLabel}>{weekLabel(weekAnchor, today)}</Text>
          </Pressable>
          <PressableScale
            onPress={() => goWeek(1)}
            hitSlop={12}
            style={styles.navBtn}
            haptic="selection"
            scaleTo={0.9}
          >
            <Ionicons name="chevron-forward" size={18} color={colors.ink} />
          </PressableScale>
        </Animated.View>

        <WeekDayCards />

        <PressableScale
          style={styles.fab}
          onPress={() => openSheet({ type: 'create' })}
          haptic="light"
          scaleTo={0.94}
        >
          <Ionicons name="add" size={28} color={colors.white} />
        </PressableScale>
      </SafeAreaView>

      <MonthViewModal visible={monthOpen} onClose={() => setMonthOpen(false)} />
      <ProfileModal
        visible={profileOpen}
        onClose={() => setProfileOpen(false)}
        onOpenNotifications={() => setNotificationsOpen(true)}
      />
      <NotificationsModal
        visible={notificationsOpen}
        onClose={() => setNotificationsOpen(false)}
      />
      <SheetsHost />
    </AtmosphereBackground>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    paddingHorizontal: 20,
  },
  header: {
    marginTop: 4,
    marginBottom: 10,
    minHeight: 44,
    justifyContent: 'center',
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  leftStack: {
    alignItems: 'flex-start',
    gap: 8,
  },
  profileBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.me,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileBtnText: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 14,
    color: colors.white,
  },
  iconGroup: {
    marginLeft: 'auto',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.fill,
    borderRadius: 999,
    overflow: 'hidden',
    height: 42,
    paddingHorizontal: 2,
  },
  iconBtn: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  searchField: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.fill,
    borderRadius: 14,
    paddingHorizontal: 12,
    height: 44,
  },
  searchInput: {
    flex: 1,
    fontFamily: 'Poppins_400Regular',
    fontSize: 15,
    color: colors.ink,
    padding: 0,
    margin: 0,
  },
  searchCancel: {
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  searchCancelText: {
    fontFamily: 'Poppins_500Medium',
    fontSize: 14,
    color: colors.inkSoft,
  },
  searchResults: {
    backgroundColor: colors.canvasElevated,
    borderRadius: 16,
    paddingVertical: 6,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.hairline,
  },
  resultRow: {
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  resultTitle: {
    fontFamily: 'Poppins_500Medium',
    fontSize: 14,
    color: colors.ink,
  },
  resultMeta: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 12,
    color: colors.muted,
    marginTop: 2,
  },
  noResults: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 13,
    color: colors.muted,
    padding: 14,
    fontStyle: 'italic',
  },
  topBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.fill,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  topBtnText: {
    fontFamily: 'Poppins_500Medium',
    fontSize: 13,
    color: colors.ink,
  },
  badge: {
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.shared,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 5,
  },
  badgeText: {
    color: colors.white,
    fontSize: 10,
    fontFamily: 'Poppins_700Bold',
  },
  weekNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.fill,
    borderRadius: 14,
    paddingHorizontal: 6,
    paddingVertical: 6,
    width: '100%',
    overflow: 'hidden',
  },
  weekLabelHit: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
  },
  weekLabel: {
    ...type.caption,
    color: colors.inkSoft,
    textAlign: 'center',
    fontFamily: 'Poppins_500Medium',
    fontSize: 13,
  },
  navBtn: {
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    backgroundColor: colors.white,
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 24,
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
});
