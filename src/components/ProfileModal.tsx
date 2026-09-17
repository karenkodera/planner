import React, { useState } from 'react';
import {
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { PressableScale } from './PressableScale';
import { useCalendar } from '../store/CalendarContext';
import { colors } from '../theme/colors';

const AVATAR_COLORS = [
  colors.me,
  '#5856D6',
  '#AF52DE',
  '#FF9500',
  '#34C759',
  '#30B0C7',
  '#1C1C1E',
];

function DetailRow({
  label,
  value,
  onPress,
}: {
  label: string;
  value: string;
  onPress?: () => void;
}) {
  return (
    <Pressable
      style={styles.detailRow}
      onPress={onPress}
      disabled={!onPress}
    >
      <Text style={styles.detailLabel}>{label}</Text>
      <View style={styles.detailValueRow}>
        <Text style={styles.detailValue} numberOfLines={1}>
          {value}
        </Text>
        {onPress ? (
          <Ionicons name="chevron-forward" size={16} color={colors.muted} />
        ) : null}
      </View>
    </Pressable>
  );
}

function ActionRow({
  icon,
  label,
  value,
  destructive,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value?: string;
  destructive?: boolean;
  onPress: () => void;
}) {
  return (
    <PressableScale style={styles.actionRow} onPress={onPress} haptic="selection">
      <Ionicons
        name={icon}
        size={18}
        color={destructive ? colors.danger : colors.ink}
      />
      <Text style={[styles.actionLabel, destructive && styles.actionDestructive]}>
        {label}
      </Text>
      {value ? <Text style={styles.actionValue}>{value}</Text> : null}
      <Ionicons name="chevron-forward" size={16} color={colors.muted} />
    </PressableScale>
  );
}

export function ProfileModal({
  visible,
  onClose,
  onOpenNotifications,
}: {
  visible: boolean;
  onClose: () => void;
  onOpenNotifications?: () => void;
}) {
  const { couple, meColor, setMeColor } = useCalendar();
  const [pickingColor, setPickingColor] = useState(false);
  const [workHours, setWorkHours] = useState('9:00 AM – 5:00 PM');

  const confirmLogout = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    Alert.alert('Log out', 'You’ll need to sign in again to sync plans.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Log out',
        style: 'destructive',
        onPress: () => {
          onClose();
        },
      },
    ]);
  };

  const editWorkHours = () => {
    Alert.alert('Work hours', 'When does your workday usually end?', [
      {
        text: '5:00 PM',
        onPress: () => setWorkHours('9:00 AM – 5:00 PM'),
      },
      {
        text: '6:00 PM',
        onPress: () => setWorkHours('9:00 AM – 6:00 PM'),
      },
      {
        text: '7:00 PM',
        onPress: () => setWorkHours('9:00 AM – 7:00 PM'),
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
      onShow={() => setPickingColor(false)}
    >
      <SafeAreaView style={styles.shell} edges={['top', 'left', 'right', 'bottom']}>
        <View style={styles.handle} />

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.hero}>
            <View style={styles.avatarWrap}>
              <View style={[styles.avatar, { backgroundColor: meColor }]}>
                <Text style={styles.avatarText}>{couple.me.initial}</Text>
              </View>
              <PressableScale
                style={styles.editBadge}
                onPress={() => {
                  setPickingColor((v) => !v);
                  Haptics.selectionAsync();
                }}
                haptic="selection"
                scaleTo={0.9}
              >
                <Ionicons name="pencil" size={12} color={colors.ink} />
              </PressableScale>
            </View>

            {pickingColor ? (
              <View style={styles.colorRow}>
                {AVATAR_COLORS.map((swatch) => (
                  <Pressable
                    key={swatch}
                    onPress={() => {
                      setMeColor(swatch);
                      setPickingColor(false);
                      Haptics.selectionAsync();
                    }}
                    style={[
                      styles.colorSwatch,
                      { backgroundColor: swatch },
                      meColor === swatch && styles.colorSwatchSelected,
                    ]}
                  />
                ))}
              </View>
            ) : null}

            <Text style={styles.name}>{couple.me.name}</Text>
            <Text style={styles.email}>{couple.me.email}</Text>
          </View>

          <Text style={styles.sectionLabel}>Account</Text>
          <View style={styles.card}>
            <DetailRow label="Name" value={couple.me.name} />
            <View style={styles.divider} />
            <DetailRow label="Email" value={couple.me.email} />
            <View style={styles.divider} />
            <DetailRow label="Password" value="••••••••" onPress={() => {}} />
          </View>

          <Text style={styles.sectionLabel}>Shared with</Text>
          <View style={styles.card}>
            <View style={styles.sharedRow}>
              <View style={styles.partnerAvatar}>
                <Text style={styles.partnerAvatarText}>{couple.partner.initial}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.sharedName}>{couple.partner.name}</Text>
                <Text style={styles.sharedEmail}>{couple.partner.email}</Text>
              </View>
            </View>
          </View>

          <Text style={styles.sectionLabel}>Preferences</Text>
          <View style={styles.card}>
            <ActionRow
              icon="notifications-outline"
              label="Notifications"
              onPress={() => {
                onClose();
                setTimeout(() => onOpenNotifications?.(), 280);
              }}
            />
            <View style={styles.divider} />
            <ActionRow
              icon="briefcase-outline"
              label="Set work hours"
              value={workHours}
              onPress={editWorkHours}
            />
          </View>

          <View style={[styles.card, styles.logoutCard]}>
            <ActionRow
              icon="log-out-outline"
              label="Log out"
              destructive
              onPress={confirmLogout}
            />
          </View>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  shell: {
    flex: 1,
    backgroundColor: colors.white,
    paddingHorizontal: 20,
  },
  handle: {
    alignSelf: 'center',
    width: 36,
    height: 5,
    borderRadius: 3,
    backgroundColor: colors.fillStrong,
    marginTop: 8,
    marginBottom: 10,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 32,
  },
  hero: {
    alignItems: 'center',
    paddingTop: 12,
    paddingBottom: 24,
    gap: 6,
  },
  avatarWrap: {
    width: 72,
    height: 72,
    marginBottom: 8,
    position: 'relative',
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.me,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 28,
    color: colors.white,
  },
  editBadge: {
    position: 'absolute',
    right: -2,
    top: -2,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.hairline,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  colorRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 10,
    marginBottom: 8,
    paddingHorizontal: 8,
  },
  colorSwatch: {
    width: 28,
    height: 28,
    borderRadius: 14,
  },
  colorSwatchSelected: {
    borderWidth: 2,
    borderColor: colors.ink,
  },
  name: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 22,
    color: colors.ink,
    letterSpacing: -0.3,
  },
  email: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 14,
    color: colors.muted,
  },
  sectionLabel: {
    fontFamily: 'Poppins_500Medium',
    fontSize: 12,
    color: colors.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: 8,
    marginTop: 8,
    marginLeft: 4,
  },
  card: {
    backgroundColor: colors.fill,
    borderRadius: 16,
    marginBottom: 16,
    overflow: 'hidden',
  },
  logoutCard: {
    marginTop: 8,
  },
  sharedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  partnerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.partner,
    alignItems: 'center',
    justifyContent: 'center',
  },
  partnerAvatarText: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 15,
    color: colors.white,
  },
  sharedName: {
    fontFamily: 'Poppins_500Medium',
    fontSize: 15,
    color: colors.ink,
  },
  sharedEmail: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 13,
    color: colors.muted,
    marginTop: 2,
  },
  detailRow: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  detailLabel: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 15,
    color: colors.inkSoft,
  },
  detailValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flexShrink: 1,
  },
  detailValue: {
    fontFamily: 'Poppins_500Medium',
    fontSize: 15,
    color: colors.ink,
    textAlign: 'right',
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.hairline,
    marginLeft: 16,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  actionLabel: {
    flex: 1,
    fontFamily: 'Poppins_500Medium',
    fontSize: 15,
    color: colors.ink,
  },
  actionValue: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 13,
    color: colors.muted,
    maxWidth: 140,
  },
  actionDestructive: {
    color: colors.danger,
  },
});
