import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme/colors';
import { type } from '../theme/typography';
import { useCalendar } from '../store/CalendarContext';

export function AtmosphereBackground({ children }: { children: React.ReactNode }) {
  return <View style={styles.root}>{children}</View>;
}

export function BrandMark() {
  const { couple, meColor } = useCalendar();
  return (
    <View style={styles.brandRow}>
      <View style={styles.avatarPair}>
        <View style={[styles.avatar, styles.avatarMe, { backgroundColor: meColor }]}>
          <Text style={styles.avatarText}>{couple.me.initial}</Text>
        </View>
        <View style={[styles.avatar, styles.avatarPartner]}>
          <Text style={styles.avatarText}>{couple.partner.initial}</Text>
        </View>
      </View>
      <Text style={styles.brandSub}>synced</Text>
    </View>
  );
}

export function LayerLegend() {
  return (
    <View style={styles.legend}>
      <LegendDot color={colors.me} label="You" />
      <LegendDot color={colors.partner} label="Thomas" />
      <LegendDot color={colors.shared} label="Together" icon />
    </View>
  );
}

function LegendDot({
  color,
  label,
  icon,
}: {
  color: string;
  label: string;
  icon?: boolean;
}) {
  return (
    <View style={styles.legendItem}>
      {icon ? (
        <View style={[styles.legendIcon, { backgroundColor: colors.sharedSoft }]}>
          <Text style={{ color, fontSize: 9, fontFamily: 'Poppins_700Bold' }}>◎</Text>
        </View>
      ) : (
        <View style={[styles.legendSwatch, { backgroundColor: color }]} />
      )}
      <Text style={styles.legendLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.canvas,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatarPair: {
    flexDirection: 'row',
    width: 52,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.canvas,
  },
  avatarMe: {
    backgroundColor: colors.me,
    zIndex: 2,
  },
  avatarPartner: {
    backgroundColor: colors.partner,
    marginLeft: -10,
    zIndex: 1,
  },
  avatarText: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 12,
    color: colors.white,
  },
  brand: {
    ...type.title,
    color: colors.ink,
    fontSize: 26,
  },
  brandSub: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 13,
    color: colors.muted,
  },
  legend: {
    flexDirection: 'row',
    gap: 16,
    alignItems: 'center',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendSwatch: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendIcon: {
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  legendLabel: {
    ...type.caption,
    color: colors.inkSoft,
  },
});
