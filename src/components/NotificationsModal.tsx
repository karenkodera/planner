import React, { useState } from 'react';
import {
  Modal,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { colors } from '../theme/colors';

type Pref = {
  id: string;
  title: string;
  subtitle: string;
  value: boolean;
};

function PrefRow({
  pref,
  onChange,
}: {
  pref: Pref;
  onChange: (value: boolean) => void;
}) {
  return (
    <View style={styles.row}>
      <View style={styles.rowCopy}>
        <Text style={styles.rowTitle}>{pref.title}</Text>
        <Text style={styles.rowSub}>{pref.subtitle}</Text>
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

export function NotificationsModal({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose: () => void;
}) {
  const [prefs, setPrefs] = useState<Pref[]>([
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
      id: 'travel',
      title: 'Travel updates',
      subtitle: 'When either of you adds time away',
      value: false,
    },
    {
      id: 'digest',
      title: 'Evening digest',
      subtitle: 'A short rundown of tomorrow’s plans',
      value: false,
    },
  ]);

  const setPref = (id: string, value: boolean) => {
    setPrefs((prev) => prev.map((p) => (p.id === id ? { ...p, value } : p)));
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.shell} edges={['top', 'left', 'right', 'bottom']}>
        <View style={styles.handle} />
        <View style={styles.header}>
          <Text style={styles.title}>Notifications</Text>
          <Text style={styles.done} onPress={onClose}>
            Done
          </Text>
        </View>

        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.lead}>
            Choose what Ours should ping you about. You can change these anytime.
          </Text>

          <Text style={styles.sectionLabel}>Alerts</Text>
          <View style={styles.card}>
            {prefs.slice(0, 3).map((pref, idx) => (
              <View key={pref.id}>
                {idx > 0 ? <View style={styles.divider} /> : null}
                <PrefRow pref={pref} onChange={(v) => setPref(pref.id, v)} />
              </View>
            ))}
          </View>

          <Text style={styles.sectionLabel}>Quiet extras</Text>
          <View style={styles.card}>
            {prefs.slice(3).map((pref, idx) => (
              <View key={pref.id}>
                {idx > 0 ? <View style={styles.divider} /> : null}
                <PrefRow pref={pref} onChange={(v) => setPref(pref.id, v)} />
              </View>
            ))}
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  title: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 20,
    color: colors.ink,
  },
  done: {
    fontFamily: 'Poppins_500Medium',
    fontSize: 15,
    color: colors.ink,
    paddingVertical: 6,
    paddingHorizontal: 4,
  },
  content: {
    paddingBottom: 32,
  },
  lead: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 14,
    lineHeight: 20,
    color: colors.muted,
    marginBottom: 20,
  },
  sectionLabel: {
    fontFamily: 'Poppins_500Medium',
    fontSize: 12,
    color: colors.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: 8,
    marginLeft: 4,
  },
  card: {
    backgroundColor: colors.fill,
    borderRadius: 16,
    marginBottom: 18,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  rowCopy: {
    flex: 1,
    gap: 3,
  },
  rowTitle: {
    fontFamily: 'Poppins_500Medium',
    fontSize: 15,
    color: colors.ink,
  },
  rowSub: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 12,
    lineHeight: 17,
    color: colors.muted,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.hairline,
    marginLeft: 16,
  },
});
