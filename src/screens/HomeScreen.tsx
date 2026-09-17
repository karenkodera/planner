import React, { useEffect, useMemo, useRef, useState } from 'react';
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
  } = useCalendar();
  const lastWeekTap = useRef(0);
  const [searchOpen, setSearchOpen] = useState(false);
  const [requestsOpen, setRequestsOpen] = useState(false);
  const [monthOpen, setMonthOpen] = useState(false);
  const [query, setQuery] = useState('');
  const weekPulse = useRef(new Animated.Value(1)).current;
  const drawerAnim = useRef(new Animated.Value(0)).current;
  const searchSlide = useRef(new Animated.Value(0)).current;

  const activeRequests = useMemo(
    () =>
      requests.filter((r) => r.status === 'pending' || r.status === 'suggested'),
    [requests],
  );

  const drawerOpenHeight = useMemo(() => {
    if (!activeRequests.length) return 56;
    return 14 + activeRequests.length * 70;
  }, [activeRequests.length]);

  useEffect(() => {
    Animated.timing(drawerAnim, {
      toValue: requestsOpen ? 1 : 0,
      duration: 260,
      easing: requestsOpen
        ? Easing.out(Easing.cubic)
        : Easing.in(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [requestsOpen, drawerAnim, drawerOpenHeight]);

  const openSearch = () => {
    if (requestsOpen) setRequestsOpen(false);
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

  const toggleRequests = () => {
    Haptics.selectionAsync();
    setRequestsOpen((v) => !v);
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

  const drawerHeight = drawerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, drawerOpenHeight],
  });

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
            <View>
              <View style={styles.actionRow}>
                <PressableScale
                  style={[
                    styles.topBtn,
                    requestsOpen && styles.requestsTabOpen,
                  ]}
                  onPress={toggleRequests}
                  haptic="selection"
                >
                  <Ionicons name="swap-horizontal" size={16} color={colors.ink} />
                  <Text style={styles.topBtnText}>Requests</Text>
                  {pendingCount > 0 ? (
                    <View style={styles.badge}>
                      <Text style={styles.badgeText}>{pendingCount}</Text>
                    </View>
                  ) : null}
                  <Ionicons
                    name={requestsOpen ? 'chevron-up' : 'chevron-down'}
                    size={14}
                    color={colors.muted}
                  />
                </PressableScale>

                <View style={styles.iconGroup}>
                  <PressableScale
                    style={[styles.iconBtn, styles.iconBtnLeft]}
                    onPress={() => setMonthOpen(true)}
                    haptic="selection"
                    scaleTo={0.9}
                  >
                    <Ionicons name="calendar-outline" size={18} color={colors.ink} />
                  </PressableScale>
                  <View style={styles.iconDivider} />
                  <PressableScale
                    style={styles.iconBtn}
                    onPress={() => openSheet({ type: 'create' })}
                    haptic="light"
                    scaleTo={0.9}
                  >
                    <Ionicons name="add" size={20} color={colors.ink} />
                  </PressableScale>
                  <View style={styles.iconDivider} />
                  <PressableScale
                    style={[styles.iconBtn, styles.iconBtnRight]}
                    onPress={openSearch}
                    haptic="selection"
                    scaleTo={0.9}
                  >
                    <Ionicons name="search" size={18} color={colors.ink} />
                  </PressableScale>
                </View>
              </View>

              <Animated.View
                style={[
                  styles.requestsDrawer,
                  {
                    height: drawerHeight,
                    marginBottom: drawerAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0, 10],
                    }),
                  },
                ]}
                pointerEvents={requestsOpen ? 'auto' : 'none'}
              >
                <View style={styles.requestsDrawerInner}>
                  {activeRequests.map((request) => (
                    <PressableScale
                      key={request.id}
                      style={styles.drawerRow}
                      onPress={() => {
                        setRequestsOpen(false);
                        openSheet({ type: 'requestDetail', request });
                      }}
                      haptic="selection"
                    >
                      <View style={{ flex: 1 }}>
                        <Text style={styles.drawerTitle}>{request.title}</Text>
                        <Text style={styles.drawerMeta}>
                          {format(request.proposedStart, 'EEE · h:mm a')}
                          {' · '}
                          {request.from === 'me'
                            ? 'Awaiting reply'
                            : `From ${couple.partner.name} · RSVP`}
                        </Text>
                      </View>
                      <Ionicons name="chevron-forward" size={16} color={colors.muted} />
                    </PressableScale>
                  ))}
                  {!activeRequests.length ? (
                    <Text style={styles.drawerEmpty}>Nothing needs a reply</Text>
                  ) : null}
                </View>
              </Animated.View>
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
                          ? couple.partner.name
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
      </SafeAreaView>

      <MonthViewModal visible={monthOpen} onClose={() => setMonthOpen(false)} />
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
    alignItems: 'center',
    gap: 8,
  },
  iconGroup: {
    marginLeft: 'auto',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.fill,
    borderRadius: 12,
    overflow: 'hidden',
    height: 40,
  },
  iconBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBtnLeft: {},
  iconBtnRight: {},
  iconDivider: {
    width: StyleSheet.hairlineWidth,
    height: 22,
    backgroundColor: 'rgba(60, 60, 67, 0.28)',
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
    gap: 5,
    backgroundColor: colors.fill,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
    zIndex: 2,
  },
  requestsTabOpen: {
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    marginBottom: 0,
    paddingBottom: 12,
  },
  topBtnText: {
    fontFamily: 'Poppins_500Medium',
    fontSize: 12,
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
  requestsDrawer: {
    width: '100%',
    overflow: 'hidden',
    backgroundColor: colors.fill,
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
    borderTopRightRadius: 16,
    marginTop: -1,
  },
  requestsDrawerInner: {
    paddingTop: 4,
    paddingBottom: 10,
    paddingHorizontal: 6,
  },
  drawerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginVertical: 3,
    backgroundColor: colors.white,
    borderRadius: 12,
  },
  drawerTitle: {
    fontFamily: 'Poppins_500Medium',
    fontSize: 14,
    color: colors.ink,
  },
  drawerMeta: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 12,
    color: colors.muted,
    marginTop: 2,
  },
  drawerEmpty: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 13,
    color: colors.muted,
    fontStyle: 'italic',
    paddingHorizontal: 16,
    paddingVertical: 18,
  },
});
