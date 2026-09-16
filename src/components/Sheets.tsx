import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { type } from '../theme/typography';
import { useCalendar } from '../store/CalendarContext';
import { format, formatEventTime } from '../utils/date';
import { slotDurationLabel } from '../utils/findTime';
import { VOICE_DEMO_PHRASES } from '../utils/voiceParse';
import { PressableScale } from './PressableScale';
function SheetShell({
  visible,
  onClose,
  children,
  title,
  subtitle,
}: {
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title: string;
  subtitle?: string;
}) {
  const slide = useRef(new Animated.Value(520)).current;

  useEffect(() => {
    if (!visible) return;
    slide.setValue(520);
    Animated.spring(slide, {
      toValue: 0,
      damping: 22,
      stiffness: 220,
      useNativeDriver: true,
    }).start();
  }, [visible, slide]);

  return (
    <Modal visible={visible} animationType="none" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <Animated.View style={[styles.sheet, { transform: [{ translateY: slide }] }]}>
          <View style={styles.handle} />
          <Text style={styles.sheetTitle}>{title}</Text>
          {subtitle ? <Text style={styles.sheetSub}>{subtitle}</Text> : null}
          {children}
        </Animated.View>
      </View>
    </Modal>
  );
}

export function SheetsHost() {
  return (
    <>
      <CreateEventSheet />
      <FindTimeSheet />
      <RequestsSheet />
    </>
  );
}

function CreateEventSheet() {
  const { sheet, closeSheet, addFromVoice, freeSlots, createFromSlot } = useCalendar();
  const visible = sheet.type === 'create';
  const [text, setText] = useState('');
  const [listening, setListening] = useState(false);
  const [showFindTime, setShowFindTime] = useState(false);
  const pulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (visible) {
      setText('');
      setListening(false);
      setShowFindTime(false);
    }
  }, [visible]);

  useEffect(() => {
    if (!listening) {
      pulse.setValue(1);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.12, duration: 650, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 650, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [listening, pulse]);

  if (!visible) return null;

  const startListening = () => {
    setListening(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const phrase =
      VOICE_DEMO_PHRASES[Math.floor(Math.random() * VOICE_DEMO_PHRASES.length)];
    setTimeout(() => {
      setText(phrase);
      setListening(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }, 1400);
  };

  const submit = () => {
    if (!text.trim()) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    addFromVoice(text.trim());
    closeSheet();
  };

  return (
    <SheetShell visible onClose={closeSheet} title="New event">
      <ScrollView
        style={styles.createScroll}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.composeRow}>
          <TextInput
            value={text}
            onChangeText={setText}
            placeholder="Tell us what you’re doing at what time on what date with who and we’ll put it in the calendar."
            placeholderTextColor={colors.muted}
            style={styles.composeInput}
            multiline
            textAlignVertical="top"
          />
          <Animated.View style={{ transform: [{ scale: pulse }] }}>
            <Pressable
              onPress={startListening}
              style={[styles.micBtn, listening && styles.micBtnOn]}
              accessibilityLabel="Dictate with microphone"
            >
              <Ionicons
                name={listening ? 'mic' : 'mic-outline'}
                size={22}
                color={listening ? colors.white : colors.ink}
              />
            </Pressable>
          </Animated.View>
        </View>

        <Text style={styles.composeHint}>
          {listening
            ? 'Listening…'
            : 'Type it out, or tap the mic and say it.'}
        </Text>

        <PressableScale
          style={[styles.primaryBtn, !text.trim() && styles.btnDisabled]}
          onPress={submit}
          disabled={!text.trim()}
          haptic="light"
        >
          <Text style={styles.primaryBtnText}>Add to calendar</Text>
        </PressableScale>

        <View style={styles.findTimeBlock}>
          <PressableScale
            style={styles.findTimeToggle}
            onPress={() => setShowFindTime((v) => !v)}
            haptic="selection"
          >
            <View style={styles.findTimeToggleLeft}>
              <Ionicons name="sparkles-outline" size={16} color={colors.ink} />
              <View style={styles.findTimeCopy}>
                <Text style={styles.findTimeTitle}>Find time together</Text>
                <Text style={styles.findTimeSub}>Open windows when you’re both free</Text>
              </View>
            </View>
            <Ionicons
              name={showFindTime ? 'chevron-up' : 'chevron-down'}
              size={18}
              color={colors.muted}
            />
          </PressableScale>

          {showFindTime ? (
            <View style={styles.findTimeList}>
              {freeSlots.map((slot) => (
                <PressableScale
                  key={slot.id}
                  style={styles.slotCard}
                  onPress={() => {
                    createFromSlot(slot, 'Time together');
                    closeSheet();
                  }}
                  haptic="light"
                >
                  <View>
                    <Text style={styles.slotDay}>{slot.dayLabel}</Text>
                    <Text style={styles.slotTime}>{slot.timeLabel}</Text>
                  </View>
                  <View style={styles.slotBadge}>
                    <Text style={styles.slotBadgeText}>
                      {slotDurationLabel(slot.durationMinutes)}
                    </Text>
                  </View>
                </PressableScale>
              ))}
              {!freeSlots.length ? (
                <Text style={styles.empty}>No mutual openings this week — try next week.</Text>
              ) : null}
            </View>
          ) : null}
        </View>
      </ScrollView>
    </SheetShell>
  );
}

function FindTimeSheet() {
  const { sheet, closeSheet, freeSlots, createFromSlot } = useCalendar();
  const visible = sheet.type === 'findTime';

  if (!visible) return null;

  return (
    <SheetShell
      visible
      onClose={closeSheet}
      title="Find time together"
      subtitle="Open windows when you’re both free"
    >
      <ScrollView style={{ maxHeight: 420 }} showsVerticalScrollIndicator={false}>
        {freeSlots.map((slot) => (
          <PressableScale
            key={slot.id}
            style={styles.slotCard}
            onPress={() => {
              createFromSlot(slot, 'Time together');
              closeSheet();
            }}
            haptic="light"
          >
            <View>
              <Text style={styles.slotDay}>{slot.dayLabel}</Text>
              <Text style={styles.slotTime}>{slot.timeLabel}</Text>
            </View>
            <View style={styles.slotBadge}>
              <Text style={styles.slotBadgeText}>
                {slotDurationLabel(slot.durationMinutes)}
              </Text>
            </View>
          </PressableScale>
        ))}
        {!freeSlots.length ? (
          <Text style={styles.empty}>No mutual openings this week — try next week.</Text>
        ) : null}
      </ScrollView>
    </SheetShell>
  );
}

function RequestsSheet() {
  const {
    sheet,
    closeSheet,
    requests,
    acceptRequest,
    suggestRequestTime,
    declineRequest,
    openSheet,
    couple,
  } = useCalendar();
  const visible = sheet.type === 'requests' || sheet.type === 'requestDetail';

  if (!visible) return null;

  const detail = sheet.type === 'requestDetail' ? sheet.request : null;

  if (detail) {
    const start = detail.suggestedStart ?? detail.proposedStart;
    const end = detail.suggestedEnd ?? detail.proposedEnd;
    return (
      <SheetShell
        visible
        onClose={closeSheet}
        title={detail.title}
        subtitle={`From ${detail.from === 'me' ? 'you' : couple.partner.name}`}
      >
        <Text style={styles.detailTime}>{formatEventTime(start, end)}</Text>
        {detail.location ? <Text style={styles.detailMeta}>{detail.location}</Text> : null}
        {detail.notes ? <Text style={styles.detailNotes}>{detail.notes}</Text> : null}
        {detail.status === 'suggested' && detail.suggestedStart ? (
          <Text style={styles.previewNote}>
            Suggested alternate: {formatEventTime(detail.suggestedStart, detail.suggestedEnd!)}
          </Text>
        ) : null}

        {detail.status === 'pending' && detail.from === 'partner' ? (
          <View style={styles.rowBtns}>
            <Pressable
              style={[styles.secondaryBtn, { flex: 1 }]}
              onPress={() => {
                suggestRequestTime(detail.id);
                Haptics.selectionAsync();
              }}
            >
              <Text style={styles.secondaryBtnText}>Suggest time</Text>
            </Pressable>
            <Pressable
              style={[styles.primaryBtn, { flex: 1, marginTop: 0 }]}
              onPress={() => {
                acceptRequest(detail.id);
                closeSheet();
              }}
            >
              <Text style={styles.primaryBtnText}>Accept</Text>
            </Pressable>
          </View>
        ) : null}

        {detail.status === 'pending' && detail.from === 'partner' ? (
          <Pressable style={styles.ghostBtn} onPress={() => declineRequest(detail.id)}>
            <Text style={styles.ghostBtnText}>Decline</Text>
          </Pressable>
        ) : null}

        {detail.status === 'suggested' && detail.from === 'me' ? (
          <Pressable
            style={styles.primaryBtn}
            onPress={() => {
              acceptRequest(detail.id);
              closeSheet();
            }}
          >
            <Text style={styles.primaryBtnText}>Accept suggested time</Text>
          </Pressable>
        ) : null}

        <Pressable style={styles.ghostBtn} onPress={() => openSheet({ type: 'requests' })}>
          <Text style={styles.ghostBtnText}>Back to requests</Text>
        </Pressable>
      </SheetShell>
    );
  }

  return (
    <SheetShell
      visible
      onClose={closeSheet}
      title="Shared requests"
      subtitle="Plans waiting for a yes"
    >
      <ScrollView style={{ maxHeight: 420 }} showsVerticalScrollIndicator={false}>
        {requests.map((r) => (
          <PressableScale
            key={r.id}
            style={styles.requestCard}
            onPress={() => openSheet({ type: 'requestDetail', request: r })}
            haptic="selection"
          >
            <View style={{ flex: 1 }}>
              <Text style={styles.slotDay}>{r.title}</Text>
              <Text style={styles.slotTime}>
                {format(r.proposedStart, 'EEE · h:mm a')} · {r.status}
              </Text>
            </View>
            <Text style={styles.chevron}>›</Text>
          </PressableScale>
        ))}
      </ScrollView>
    </SheetShell>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.28)',
  },
  sheet: {
    backgroundColor: colors.glassStrong,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 22,
    paddingTop: 10,
    paddingBottom: 36,
    maxHeight: '88%',
  },
  handle: {
    alignSelf: 'center',
    width: 42,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.fillStrong,
    marginBottom: 14,
  },
  sheetTitle: {
    ...type.title,
    color: colors.ink,
  },
  sheetSub: {
    ...type.body,
    color: colors.muted,
    marginTop: 4,
    marginBottom: 16,
  },
  detailTime: {
    ...type.subtitle,
    color: colors.inkSoft,
    marginBottom: 8,
  },
  detailMeta: {
    ...type.bodyMedium,
    color: colors.partnerDeep,
    marginBottom: 8,
  },
  detailNotes: {
    ...type.body,
    color: colors.inkSoft,
    marginBottom: 16,
  },
  input: {
    ...type.body,
    backgroundColor: colors.canvasElevated,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: colors.line,
    color: colors.ink,
    marginBottom: 16,
  },
  composeRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  composeInput: {
    flex: 1,
    minHeight: 140,
    ...type.body,
    backgroundColor: colors.canvasElevated,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.hairline,
    color: colors.ink,
  },
  micBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  micBtnOn: {
    backgroundColor: colors.accent,
  },
  composeHint: {
    ...type.caption,
    color: colors.muted,
    marginTop: 10,
    marginBottom: 4,
  },
  btnDisabled: {
    opacity: 0.4,
  },
  fieldLabel: {
    fontFamily: 'Poppins_500Medium',
    fontSize: 11,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    color: colors.muted,
    marginBottom: 8,
  },
  segment: {
    flexDirection: 'row',
    backgroundColor: colors.mist,
    borderRadius: 14,
    padding: 4,
    marginBottom: 16,
  },
  segmentItem: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: 'center',
  },
  segmentItemOn: {
    backgroundColor: colors.white,
  },
  segmentText: {
    ...type.bodyMedium,
    color: colors.muted,
    fontSize: 14,
  },
  segmentTextOn: {
    color: colors.ink,
  },
  hourScroll: {
    marginBottom: 8,
  },
  chipBtn: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: colors.mist,
    marginRight: 8,
  },
  chipBtnOn: {
    backgroundColor: colors.ink,
  },
  chipBtnText: {
    ...type.caption,
    color: colors.inkSoft,
  },
  chipBtnTextOn: {
    color: colors.white,
  },
  primaryBtn: {
    marginTop: 18,
    backgroundColor: colors.accent,
    borderRadius: 18,
    paddingVertical: 16,
    alignItems: 'center',
  },
  primaryBtnText: {
    ...type.bodyMedium,
    color: colors.white,
  },
  createScroll: {
    maxHeight: 520,
  },
  findTimeBlock: {
    marginTop: 18,
    marginBottom: 8,
  },
  findTimeToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.fill,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 10,
  },
  findTimeToggleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  findTimeCopy: {
    flex: 1,
    gap: 2,
  },
  findTimeTitle: {
    fontFamily: 'Poppins_500Medium',
    fontSize: 14,
    color: colors.ink,
  },
  findTimeSub: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 12,
    color: colors.muted,
  },
  findTimeList: {
    marginTop: 10,
  },
  secondaryBtn: {
    backgroundColor: colors.sharedSoft,
    borderRadius: 18,
    paddingVertical: 16,
    alignItems: 'center',
  },
  secondaryBtnText: {
    ...type.bodyMedium,
    color: colors.sharedDeep,
  },
  ghostBtn: {
    marginTop: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  ghostBtnText: {
    ...type.bodyMedium,
    color: colors.muted,
  },
  previewNote: {
    ...type.body,
    color: colors.partnerDeep,
    marginTop: 8,
    fontSize: 13,
  },
  slotCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.canvasElevated,
    borderRadius: 18,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.line,
  },
  slotDay: {
    ...type.bodyMedium,
    color: colors.ink,
    fontSize: 16,
  },
  slotTime: {
    ...type.caption,
    color: colors.muted,
    marginTop: 3,
  },
  slotBadge: {
    backgroundColor: colors.sharedSoft,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  slotBadgeText: {
    ...type.caption,
    color: colors.sharedDeep,
  },
  empty: {
    ...type.body,
    color: colors.muted,
    textAlign: 'center',
    paddingVertical: 24,
  },
  requestCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.canvasElevated,
    borderRadius: 18,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.line,
    gap: 8,
  },
  chevron: {
    fontSize: 24,
    color: colors.muted,
  },
  rowBtns: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 18,
  },
});
