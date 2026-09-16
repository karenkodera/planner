import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { AtmosphereBackground, BrandMark } from '../components/Atmosphere';
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
          <View style={styles.headerActions}>
            <Pressable
              style={styles.topBtn}
              onPress={() => openSheet({ type: 'findTime' })}
            >
              <Ionicons name="sparkles-outline" size={15} color={colors.ink} />
              <Text style={styles.topBtnText}>Find time</Text>
            </Pressable>
            <Pressable
              style={styles.topBtn}
              onPress={() => openSheet({ type: 'requests' })}
            >
              <Ionicons name="swap-horizontal" size={16} color={colors.ink} />
              <Text style={styles.topBtnText}>Requests</Text>
              {pendingCount > 0 ? (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{pendingCount}</Text>
                </View>
              ) : null}
            </Pressable>
            <Pressable
              style={[styles.topBtn, styles.topBtnPrimary]}
              onPress={() => openSheet({ type: 'create' })}
            >
              <Ionicons name="add" size={16} color={colors.white} />
              <Text style={[styles.topBtnText, styles.topBtnTextPrimary]}>New event</Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.subHeader}>
          <View style={styles.weekNav}>
            <Pressable onPress={() => goWeek(-1)} hitSlop={12} style={styles.navBtn}>
              <Ionicons name="chevron-back" size={18} color={colors.ink} />
            </Pressable>
            <Text style={styles.weekLabel}>{weekLabel(weekAnchor, today)}</Text>
            <Pressable onPress={() => goWeek(1)} hitSlop={12} style={styles.navBtn}>
              <Ionicons name="chevron-forward" size={18} color={colors.ink} />
            </Pressable>
          </View>
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
    marginBottom: 12,
    gap: 12,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  topBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: colors.fill,
    borderRadius: 20,
    paddingHorizontal: 10,
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
  subHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    marginBottom: 10,
  },
  weekNav: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: colors.fill,
    borderRadius: 12,
    paddingHorizontal: 4,
    paddingVertical: 4,
  },
  weekLabel: {
    ...type.caption,
    color: colors.inkSoft,
    minWidth: 88,
    textAlign: 'center',
    fontFamily: 'Poppins_500Medium',
    fontSize: 12,
  },
  navBtn: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
  },
});
