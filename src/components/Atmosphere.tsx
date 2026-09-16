import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '../theme/colors';
import { type } from '../theme/typography';
import { useCalendar } from '../store/CalendarContext';

export function AtmosphereBackground({ children }: { children: React.ReactNode }) {
  return (
    <View style={styles.root}>
      <LinearGradient
        colors={[colors.canvasTop, colors.mist, colors.canvasBottom]}
        locations={[0, 0.45, 1]}
        style={StyleSheet.absoluteFill}
      />
      <View style={[styles.orb, styles.orbWarm]} />
      <View style={[styles.orb, styles.orbCool]} />
      {children}
    </View>
  );
}

export function BrandMark() {
  const { couple } = useCalendar();
  return (
    <View style={styles.brandRow}>
      <View style={styles.avatarPair}>
        <View style={[styles.avatar, styles.avatarMe]}>
          <Text style={styles.avatarText}>{couple.me.initial}</Text>
        </View>
        <View style={[styles.avatar, styles.avatarPartner]}>
          <Text style={styles.avatarText}>{couple.partner.initial}</Text>
        </View>
      </View>
      <View>
        <Text style={styles.brand}>Ours</Text>
        <Text style={styles.brandSub}>this week, together</Text>
      </View>
    </View>
  );
}

export function LayerLegend() {
  return (
    <View style={styles.legend}>
      <LegendDot color={colors.me} label="Yours" solid />
      <LegendDot color={colors.partner} label="Alex" solid={false} />
      <LegendDot color={colors.shared} label="Together" solid />
    </View>
  );
}

function LegendDot({
  color,
  label,
  solid,
}: {
  color: string;
  label: string;
  solid: boolean;
}) {
  return (
    <View style={styles.legendItem}>
      <View
        style={[
          styles.legendSwatch,
          {
            backgroundColor: solid ? color : 'transparent',
            borderColor: color,
            opacity: solid ? 1 : 0.85,
          },
        ]}
      />
      <Text style={styles.legendLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.mist,
  },
  orb: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 110,
    opacity: 0.35,
  },
  orbWarm: {
    top: -40,
    right: -50,
    backgroundColor: colors.sharedSoft,
  },
  orbCool: {
    bottom: 120,
    left: -70,
    backgroundColor: colors.partnerSoft,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatarPair: {
    flexDirection: 'row',
    width: 54,
  },
  avatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.canvasTop,
  },
  avatarMe: {
    backgroundColor: colors.me,
    zIndex: 2,
  },
  avatarPartner: {
    backgroundColor: colors.partner,
    marginLeft: -12,
    zIndex: 1,
  },
  avatarText: {
    ...type.caption,
    color: colors.white,
    fontFamily: 'DMSans_700Bold',
  },
  brand: {
    ...type.title,
    color: colors.ink,
    fontSize: 28,
  },
  brandSub: {
    ...type.caption,
    color: colors.muted,
    marginTop: -2,
  },
  legend: {
    flexDirection: 'row',
    gap: 14,
    alignItems: 'center',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendSwatch: {
    width: 10,
    height: 10,
    borderRadius: 3,
    borderWidth: 1.5,
  },
  legendLabel: {
    ...type.caption,
    color: colors.inkSoft,
  },
});
