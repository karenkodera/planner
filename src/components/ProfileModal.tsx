import React, { useState } from 'react';
import {
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { format } from 'date-fns';
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

const TIME_OPTIONS = Array.from({ length: 48 }, (_, i) => ({
  hour: Math.floor(i / 2),
  minute: i % 2 === 0 ? 0 : 30,
}));

function formatClock(hour: number, minute: number) {
  return format(new Date(2026, 0, 1, hour, minute), 'h:mm a');
}

type NotifPref = {
  id: string;
  title: string;
  subtitle: string;
  value: boolean;
};

function DetailRow({
  label,
  value,
  onPress,
  showChevron,
}: {
  label: string;
  value: string;
  onPress?: () => void;
  showChevron?: boolean;
}) {
  const chevron = showChevron ?? Boolean(onPress);
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
        {chevron ? (
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
  showChevron = true,
  onPress,
}: {
  icon?: keyof typeof Ionicons.glyphMap;
  label: string;
  value?: string;
  destructive?: boolean;
  showChevron?: boolean;
  onPress: () => void;
}) {
  return (
    <PressableScale style={styles.actionRow} onPress={onPress} haptic="selection">
      {icon ? (
        <Ionicons
          name={icon}
          size={18}
          color={destructive ? colors.danger : colors.ink}
        />
      ) : null}
      <Text style={[styles.actionLabel, destructive && styles.actionDestructive]}>
        {label}
      </Text>
      {value ? <Text style={styles.actionValue}>{value}</Text> : null}
      {showChevron ? (
        <Ionicons name="chevron-forward" size={16} color={colors.muted} />
      ) : null}
    </PressableScale>
  );
}

function PrefRow({
  pref,
  onChange,
}: {
  pref: NotifPref;
  onChange: (value: boolean) => void;
}) {
  return (
    <View style={styles.prefRow}>
      <View style={styles.prefCopy}>
        <Text style={styles.prefTitle}>{pref.title}</Text>
        <Text style={styles.prefSub}>{pref.subtitle}</Text>
      </View>
      <Switch
        value={pref.value}
        onValueChange={(v) => {
          Haptics.selectionAsync();
          onChange(v);
        }}
        trackColor={{ false: colors.mistDeep, true: colors.me }}
        thumbColor={colors.white}
      />
    </View>
  );
}

type Page = 'main' | 'partner' | 'notifications' | 'workHours';

export function ProfileModal({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose: () => void;
}) {
  const { couple, meColor, setMeColor, partnerLinked, removePartner } =
    useCalendar();
  const [pickingColor, setPickingColor] = useState(false);
  const [page, setPage] = useState<Page>('main');
  const [startHour, setStartHour] = useState(9);
  const [startMinute, setStartMinute] = useState(0);
  const [endHour, setEndHour] = useState(17);
  const [endMinute, setEndMinute] = useState(0);
  const [workHoursSet, setWorkHoursSet] = useState(true);
  const [openDropdown, setOpenDropdown] = useState<'start' | 'end' | null>(null);
  const [notifPrefs, setNotifPrefs] = useState<NotifPref[]>([
    {
      id: 'rsvp',
      title: 'RSVP requests',
      subtitle: 'When Thomas sends a plan that needs your reply',
      value: true,
    },
    {
      id: 'replies',
      title: 'Invite replies',
      subtitle: 'When someone accepts, declines, or suggests a time',
      value: true,
    },
    {
      id: 'reminders',
      title: 'Event reminders',
      subtitle: 'A nudge before shared plans start',
      value: true,
    },
    {
      id: 'calendar',
      title: 'Calendar updates',
      subtitle: 'When either of you adds or changes plans',
      value: false,
    },
    {
      id: 'digest',
      title: 'Evening digest',
      subtitle: 'A short rundown of tomorrow’s plans',
      value: false,
    },
  ]);

  const workHoursLabel = workHoursSet
    ? `${formatClock(startHour, startMinute)} – ${formatClock(endHour, endMinute)}`
    : 'Not set';

  const goBack = () => {
    setOpenDropdown(null);
    setPage('main');
  };

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

  const confirmRemovePartner = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    Alert.alert(
      'Remove from calendar',
      `${couple.partner.name} won’t see your shared calendar anymore, and their events will be removed from yours.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => {
            removePartner();
            setPage('main');
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          },
        },
      ],
    );
  };

  const setPref = (id: string, value: boolean) => {
    setNotifPrefs((prev) => prev.map((p) => (p.id === id ? { ...p, value } : p)));
  };

  const backRow = (
    <PressableScale style={styles.backRow} onPress={goBack} haptic="selection">
      <Ionicons name="chevron-back" size={18} color={colors.ink} />
      <Text style={styles.backText}>Profile</Text>
    </PressableScale>
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={() => {
        if (page !== 'main') {
          goBack();
          return;
        }
        onClose();
      }}
      onShow={() => {
        setPickingColor(false);
        setPage('main');
        setOpenDropdown(null);
      }}
    >
      <SafeAreaView style={styles.shell} edges={['top', 'left', 'right', 'bottom']}>
        <View style={styles.handle} />

        {page === 'partner' ? (
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {backRow}
            <View style={styles.hero}>
              <View style={[styles.avatar, { backgroundColor: colors.partner }]}>
                <Text style={styles.avatarText}>{couple.partner.initial}</Text>
              </View>
              <Text style={styles.name}>{couple.partner.name}</Text>
              <Text style={styles.email}>{couple.partner.email}</Text>
            </View>

            <Text style={styles.sectionLabel}>Account</Text>
            <View style={styles.card}>
              <DetailRow label="Name" value={couple.partner.name} />
              <View style={styles.divider} />
              <DetailRow label="Email" value={couple.partner.email} />
            </View>

            <View style={[styles.card, styles.logoutCard]}>
              <ActionRow
                icon="person-remove-outline"
                label="Remove from calendar"
                destructive
                showChevron={false}
                onPress={confirmRemovePartner}
              />
            </View>
          </ScrollView>
        ) : page === 'notifications' ? (
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {backRow}
            <Text style={styles.pageTitle}>Notifications</Text>
            <Text style={styles.lead}>
              Choose what Ours should ping you about. You can change these anytime.
            </Text>

            <Text style={styles.sectionLabel}>Alerts</Text>
            <View style={styles.card}>
              {notifPrefs.slice(0, 3).map((pref, idx) => (
                <View key={pref.id}>
                  {idx > 0 ? <View style={styles.divider} /> : null}
                  <PrefRow pref={pref} onChange={(v) => setPref(pref.id, v)} />
                </View>
              ))}
            </View>

            <Text style={styles.sectionLabel}>Quiet extras</Text>
            <View style={styles.card}>
              {notifPrefs.slice(3).map((pref, idx) => (
                <View key={pref.id}>
                  {idx > 0 ? <View style={styles.divider} /> : null}
                  <PrefRow pref={pref} onChange={(v) => setPref(pref.id, v)} />
                </View>
              ))}
            </View>
          </ScrollView>
        ) : page === 'workHours' ? (
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {backRow}
            <Text style={styles.pageTitle}>Work hours</Text>
            <Text style={styles.lead}>
              Used to suggest free time outside your usual day.
            </Text>

            {workHoursSet ? (
              <>
                <Text style={styles.fieldLabel}>Start of day</Text>
                <Pressable
                  style={styles.dropdown}
                  onPress={() =>
                    setOpenDropdown((v) => (v === 'start' ? null : 'start'))
                  }
                >
                  <Text style={styles.dropdownValue}>
                    {formatClock(startHour, startMinute)}
                  </Text>
                  <Ionicons
                    name={openDropdown === 'start' ? 'chevron-up' : 'chevron-down'}
                    size={18}
                    color={colors.muted}
                  />
                </Pressable>
                {openDropdown === 'start' ? (
                  <ScrollView style={styles.dropdownMenu} nestedScrollEnabled>
                    {TIME_OPTIONS.map((opt) => {
                      const selected =
                        opt.hour === startHour && opt.minute === startMinute;
                      return (
                        <Pressable
                          key={`start-${opt.hour}-${opt.minute}`}
                          style={[styles.dropdownItem, selected && styles.dropdownItemOn]}
                          onPress={() => {
                            setStartHour(opt.hour);
                            setStartMinute(opt.minute);
                            setWorkHoursSet(true);
                            setOpenDropdown(null);
                            Haptics.selectionAsync();
                          }}
                        >
                          <Text
                            style={[
                              styles.dropdownItemText,
                              selected && styles.dropdownItemTextOn,
                            ]}
                          >
                            {formatClock(opt.hour, opt.minute)}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </ScrollView>
                ) : null}

                <Text style={[styles.fieldLabel, { marginTop: 14 }]}>End of day</Text>
                <Pressable
                  style={styles.dropdown}
                  onPress={() =>
                    setOpenDropdown((v) => (v === 'end' ? null : 'end'))
                  }
                >
                  <Text style={styles.dropdownValue}>
                    {formatClock(endHour, endMinute)}
                  </Text>
                  <Ionicons
                    name={openDropdown === 'end' ? 'chevron-up' : 'chevron-down'}
                    size={18}
                    color={colors.muted}
                  />
                </Pressable>
                {openDropdown === 'end' ? (
                  <ScrollView style={styles.dropdownMenu} nestedScrollEnabled>
                    {TIME_OPTIONS.map((opt) => {
                      const selected =
                        opt.hour === endHour && opt.minute === endMinute;
                      return (
                        <Pressable
                          key={`end-${opt.hour}-${opt.minute}`}
                          style={[styles.dropdownItem, selected && styles.dropdownItemOn]}
                          onPress={() => {
                            setEndHour(opt.hour);
                            setEndMinute(opt.minute);
                            setWorkHoursSet(true);
                            setOpenDropdown(null);
                            Haptics.selectionAsync();
                          }}
                        >
                          <Text
                            style={[
                              styles.dropdownItemText,
                              selected && styles.dropdownItemTextOn,
                            ]}
                          >
                            {formatClock(opt.hour, opt.minute)}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </ScrollView>
                ) : null}

                <Pressable
                  style={styles.removeWorkHours}
                  onPress={() => {
                    setWorkHoursSet(false);
                    setOpenDropdown(null);
                    Haptics.notificationAsync(
                      Haptics.NotificationFeedbackType.Success,
                    );
                  }}
                >
                  <Text style={styles.removeWorkHoursText}>Remove work hours</Text>
                </Pressable>
              </>
            ) : (
              <Pressable
                style={styles.setWorkHoursBtn}
                onPress={() => {
                  setWorkHoursSet(true);
                  Haptics.selectionAsync();
                }}
              >
                <Text style={styles.setWorkHoursBtnText}>Set work hours</Text>
              </Pressable>
            )}
          </ScrollView>
        ) : (
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
              <DetailRow label="Password" value="••••••••" />
            </View>

            <Text style={styles.sectionLabel}>Shared with</Text>
            <View style={styles.card}>
              {partnerLinked ? (
                <Pressable
                  style={styles.sharedRow}
                  onPress={() => {
                    setPage('partner');
                    Haptics.selectionAsync();
                  }}
                >
                  <View style={styles.partnerAvatar}>
                    <Text style={styles.partnerAvatarText}>
                      {couple.partner.initial}
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.sharedName}>{couple.partner.name}</Text>
                    <Text style={styles.sharedEmail}>{couple.partner.email}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color={colors.muted} />
                </Pressable>
              ) : (
                <View style={styles.sharedRow}>
                  <Text style={styles.sharedEmpty}>No one shared yet</Text>
                </View>
              )}
            </View>

            <Text style={styles.sectionLabel}>Preferences</Text>
            <View style={styles.card}>
              <ActionRow
                label="Notifications"
                onPress={() => setPage('notifications')}
              />
              <View style={styles.divider} />
              <ActionRow
                label="Set work hours"
                value={workHoursLabel}
                onPress={() => {
                  setOpenDropdown(null);
                  setPage('workHours');
                }}
              />
            </View>

            <View style={[styles.card, styles.logoutCard]}>
              <ActionRow
                icon="log-out-outline"
                label="Log out"
                destructive
                showChevron={false}
                onPress={confirmLogout}
              />
            </View>
          </ScrollView>
        )}
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
  pageTitle: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 22,
    color: colors.ink,
    letterSpacing: -0.3,
    marginBottom: 8,
  },
  lead: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 14,
    lineHeight: 20,
    color: colors.muted,
    marginBottom: 20,
  },
  fieldLabel: {
    fontFamily: 'Poppins_500Medium',
    fontSize: 11,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    color: colors.muted,
    marginBottom: 8,
  },
  dropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.fill,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  dropdownValue: {
    fontFamily: 'Poppins_500Medium',
    fontSize: 15,
    color: colors.ink,
  },
  dropdownMenu: {
    maxHeight: 220,
    marginTop: 8,
    backgroundColor: colors.fill,
    borderRadius: 14,
    overflow: 'hidden',
  },
  dropdownItem: {
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  dropdownItemOn: {
    backgroundColor: colors.accentSoft,
  },
  dropdownItemText: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 15,
    color: colors.inkSoft,
  },
  dropdownItemTextOn: {
    fontFamily: 'Poppins_500Medium',
    color: colors.ink,
  },
  hero: {
    alignItems: 'center',
    paddingTop: 16,
    paddingBottom: 24,
    gap: 6,
    overflow: 'visible',
  },
  avatarWrap: {
    width: 72,
    height: 72,
    marginBottom: 8,
    position: 'relative',
    overflow: 'visible',
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
    right: -4,
    top: -4,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.white,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.hairline,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 3,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 3,
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
  backRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    paddingVertical: 8,
    marginBottom: 4,
  },
  backText: {
    fontFamily: 'Poppins_500Medium',
    fontSize: 15,
    color: colors.ink,
  },
  sharedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  sharedEmpty: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 15,
    color: colors.muted,
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
  removeWorkHours: {
    marginTop: 24,
    paddingVertical: 14,
    alignItems: 'center',
  },
  removeWorkHoursText: {
    fontFamily: 'Poppins_500Medium',
    fontSize: 15,
    color: colors.danger,
  },
  setWorkHoursBtn: {
    marginTop: 24,
    backgroundColor: colors.ink,
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
  },
  setWorkHoursBtnText: {
    fontFamily: 'Poppins_500Medium',
    fontSize: 15,
    color: colors.white,
  },
  prefRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  prefCopy: {
    flex: 1,
    gap: 3,
  },
  prefTitle: {
    fontFamily: 'Poppins_500Medium',
    fontSize: 15,
    color: colors.ink,
  },
  prefSub: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 12,
    lineHeight: 17,
    color: colors.muted,
  },
});
