import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AtmosphereBackground, BrandMark, LayerLegend } from '../components/Atmosphere';
import { DayTimeline, WeekStrip } from '../components/WeekCalendar';
import { ActionDock, SheetsHost } from '../components/Sheets';
import { useCalendar } from '../store/CalendarContext';
import { colors } from '../theme/colors';
import { type } from '../theme/typography';
import { weekLabel } from '../utils/date';

export function HomeScreen() {
  const { weekAnchor, goWeek } = useCalendar();

  return (
    <AtmosphereBackground>
      <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
        <View style={styles.header}>
          <BrandMark />
          <View style={styles.weekNav}>
            <Pressable onPress={() => goWeek(-1)} hitSlop={12} style={styles.navBtn}>
              <Text style={styles.navGlyph}>‹</Text>
            </Pressable>
            <Text style={styles.weekLabel}>{weekLabel(weekAnchor)}</Text>
            <Pressable onPress={() => goWeek(1)} hitSlop={12} style={styles.navBtn}>
              <Text style={styles.navGlyph}>›</Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.legendRow}>
          <LayerLegend />
        </View>

        <WeekStrip />
        <DayTimeline />
      </SafeAreaView>

      <ActionDock />
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
    marginBottom: 10,
  },
  weekNav: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.glass,
    borderRadius: 999,
    paddingHorizontal: 6,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: colors.line,
  },
  weekLabel: {
    ...type.caption,
    color: colors.inkSoft,
    minWidth: 92,
    textAlign: 'center',
  },
  navBtn: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navGlyph: {
    fontSize: 22,
    color: colors.ink,
    marginTop: -2,
  },
  legendRow: {
    marginBottom: 4,
  },
});
