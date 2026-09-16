import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { AtmosphereBackground, BrandMark } from '../components/Atmosphere';
import { PressableScale } from '../components/PressableScale';
import { WeekDayCards } from '../components/WeekCalendar';
import { SheetsHost } from '../components/Sheets';
import { useCalendar } from '../store/CalendarContext';
import { colors } from '../theme/colors';
import { type } from '../theme/typography';
import { weekLabel } from '../utils/date';

export function HomeScreen() {
  const { weekAnchor, goWeek, openSheet, pendingCount, today } = useCalendar();

  return (
    <AtmosphereBackground>
      <SafeAreaView style={styles.safe} edges={['top', 'left', 'right', 'bottom']}>
        <View style={styles.header}>
          <BrandMark />
        </View>

        <View style={styles.actionRow}>
          <PressableScale
            style={styles.topBtn}
            onPress={() => openSheet({ type: 'findTime' })}
            haptic="selection"
          >
            <Ionicons name="sparkles-outline" size={15} color={colors.ink} />
            <Text style={styles.topBtnText}>Find time</Text>
          </PressableScale>
          <PressableScale
            style={styles.topBtn}
            onPress={() => openSheet({ type: 'requests' })}
            haptic="selection"
          >
            <Ionicons name="swap-horizontal" size={16} color={colors.ink} />
            <Text style={styles.topBtnText}>Requests</Text>
            {pendingCount > 0 ? (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{pendingCount}</Text>
              </View>
            ) : null}
          </PressableScale>
          <PressableScale
            style={[styles.topBtn, styles.topBtnPrimary]}
            onPress={() => openSheet({ type: 'create' })}
            haptic="light"
          >
            <Ionicons name="add" size={16} color={colors.white} />
            <Text style={[styles.topBtnText, styles.topBtnTextPrimary]}>New event</Text>
          </PressableScale>
        </View>

        <View style={styles.weekNav}>
          <PressableScale
            onPress={() => goWeek(-1)}
            hitSlop={12}
            style={styles.navBtn}
            haptic="selection"
            scaleTo={0.9}
          >
            <Ionicons name="chevron-back" size={18} color={colors.ink} />
          </PressableScale>
          <Text style={styles.weekLabel}>{weekLabel(weekAnchor, today)}</Text>
          <PressableScale
            onPress={() => goWeek(1)}
            hitSlop={12}
            style={styles.navBtn}
            haptic="selection"
            scaleTo={0.9}
          >
            <Ionicons name="chevron-forward" size={18} color={colors.ink} />
          </PressableScale>
        </View>

        <WeekDayCards />
      </SafeAreaView>

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
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  topBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: colors.fill,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  topBtnPrimary: {
    backgroundColor: colors.ink,
  },
  topBtnText: {
    fontFamily: 'Poppins_500Medium',
    fontSize: 12,
    color: colors.ink,
  },
  topBtnTextPrimary: {
    color: colors.white,
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
    marginBottom: 12,
    width: '100%',
  },
  weekLabel: {
    ...type.caption,
    color: colors.inkSoft,
    textAlign: 'center',
    fontFamily: 'Poppins_500Medium',
    fontSize: 13,
    flex: 1,
  },
  navBtn: {
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    backgroundColor: colors.white,
  },
});
