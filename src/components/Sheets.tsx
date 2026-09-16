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
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import { colors } from '../theme/colors';
import { type } from '../theme/typography';
import { useCalendar } from '../store/CalendarContext';
import { formatEventTime } from '../utils/date';
import { slotDurationLabel } from '../utils/findTime';
import { VOICE_DEMO_PHRASES, parseNaturalEvent } from '../utils/voiceParse';
import { atTime, format } from '../utils/date';
import { EventOwner } from '../types/calendar';

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
  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <Text style={styles.sheetTitle}>{title}</Text>
          {subtitle ? <Text style={styles.sheetSub}>{subtitle}</Text> : null}
          {children}
        </View>
      </View>
    </Modal>
  );
}

export function SheetsHost() {
  return (
    <>
      <EventDetailSheet />
      <CreateEventSheet />
      <VoiceSheet />
      <FindTimeSheet />
      <RequestsSheet />
    </>
  );
}

function EventDetailSheet() {
  const { sheet, closeSheet, couple } = useCalendar();
  if (sheet.type !== 'event') return null;
  const { event } = sheet;
  const ownerLabel =
    event.owner === 'me'
      ? couple.me.shortName
      : event.owner === 'partner'
        ? couple.partner.name
        : 'Together';

  return (
    <SheetShell
      visible
      onClose={closeSheet}
      title={event.title}
      subtitle={`${ownerLabel} · ${format(event.start, 'EEE, MMM d')}`}
    >
      <Text style={styles.detailTime}>{formatEventTime(event.start, event.end)}</Text>
      {event.location ? <Text style={styles.detailMeta}>{event.location}</Text> : null}
      {event.notes ? <Text style={styles.detailNotes}>{event.notes}</Text> : null}
      <Pressable style={styles.primaryBtn} onPress={closeSheet}>
        <Text style={styles.primaryBtnText}>Close</Text>
      </Pressable>
    </SheetShell>
  );
}

function CreateEventSheet() {
  const { sheet, closeSheet, addEvent, sendSharedRequest, selectedDay } = useCalendar();
  const visible = sheet.type === 'create';
  const [title, setTitle] = useState('');
  const [owner, setOwner] = useState<EventOwner>('me');
  const [hour, setHour] = useState(18);

  useEffect(() => {
    if (visible) {
      setTitle('');
      setOwner('me');
      setHour(18);
    }
  }, [visible]);

  if (!visible) return null;

  const start = atTime(selectedDay, hour, 0);
  const end = atTime(selectedDay, hour + (owner === 'shared' ? 2 : 1), 0);

  const submit = () => {
    if (!title.trim()) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    if (owner === 'shared') {
      sendSharedRequest({
        title: title.trim(),
        start,
        end,
      });
      addEvent({
        title: `${title.trim()} (requested)`,
        start,
        end,
        owner: 'me',
        notes: 'Waiting on Alex',
      });
    } else {
      addEvent({ title: title.trim(), start, end, owner });
    }
    closeSheet();
  };

  return (
    <SheetShell
      visible
      onClose={closeSheet}
      title="New plan"
      subtitle={format(selectedDay, 'EEEE, MMMM d')}
    >
      <TextInput
        value={title}
        onChangeText={setTitle}
        placeholder="What are you planning?"
        placeholderTextColor={colors.muted}
        style={styles.input}
      />

      <Text style={styles.fieldLabel}>Who is this for?</Text>
      <View style={styles.segment}>
        {(
          [
            { id: 'me', label: 'Just you' },
            { id: 'shared', label: 'Ask Alex' },
          ] as const
        ).map((opt) => (
          <Pressable
            key={opt.id}
            onPress={() => setOwner(opt.id)}
            style={[styles.segmentItem, owner === opt.id && styles.segmentItemOn]}
          >
            <Text style={[styles.segmentText, owner === opt.id && styles.segmentTextOn]}>
              {opt.label}
            </Text>
          </Pressable>
        ))}
      </View>

      <Text style={styles.fieldLabel}>Starts around</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.hourScroll}>
        {[9, 12, 15, 17, 18, 19, 20].map((h) => (
          <Pressable
            key={h}
            onPress={() => setHour(h)}
            style={[styles.chipBtn, hour === h && styles.chipBtnOn]}
          >
            <Text style={[styles.chipBtnText, hour === h && styles.chipBtnTextOn]}>
              {format(atTime(selectedDay, h), 'h a')}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      <Pressable style={styles.primaryBtn} onPress={submit}>
        <Text style={styles.primaryBtnText}>
          {owner === 'shared' ? 'Send request' : 'Add to your week'}
        </Text>
      </Pressable>
    </SheetShell>
  );
}

function VoiceSheet() {
  const { sheet, closeSheet, addFromVoice } = useCalendar();
  const visible = sheet.type === 'voice';
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [preview, setPreview] = useState<ReturnType<typeof parseNaturalEvent> | null>(null);
  const pulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!visible) {
      setListening(false);
      setTranscript('');
      setPreview(null);
      return;
    }
  }, [visible]);

  useEffect(() => {
    if (!listening) {
      pulse.setValue(1);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.18, duration: 700, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 700, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [listening, pulse]);

  if (!visible) return null;

  const startListening = async () => {
    setListening(true);
    setTranscript('');
    setPreview(null);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    // Mock speech recognition with a realistic delay + phrase
    const phrase =
      VOICE_DEMO_PHRASES[Math.floor(Math.random() * VOICE_DEMO_PHRASES.length)];
    setTimeout(() => {
      setTranscript(phrase);
      setPreview(parseNaturalEvent(phrase));
      setListening(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }, 1600);
  };

  const confirm = () => {
    if (!transcript) return;
    addFromVoice(transcript);
    closeSheet();
  };

  return (
    <SheetShell
      visible
      onClose={closeSheet}
      title="Speak a plan"
      subtitle="Describe it like a text to a friend"
    >
      <View style={styles.voiceStage}>
        <Animated.View style={{ transform: [{ scale: pulse }] }}>
          <Pressable
            onPress={startListening}
            style={[styles.mic, listening && styles.micOn]}
          >
            <Text style={[styles.micGlyph, listening && styles.micGlyphOn]}>
              {listening ? '•••' : 'mic'}
            </Text>
          </Pressable>
        </Animated.View>
        <Text style={styles.voiceHint}>
          {listening ? 'Listening…' : transcript ? 'Got it' : 'Tap to talk'}
        </Text>
        {transcript ? <Text style={styles.transcript}>“{transcript}”</Text> : null}
        {preview ? (
          <View style={styles.previewCard}>
            <Text style={styles.previewTitle}>{preview.title}</Text>
            <Text style={styles.previewMeta}>
              {format(preview.start, 'EEE h:mm a')} ·{' '}
              {preview.owner === 'shared' ? 'Shared request' : 'Your calendar'}
            </Text>
            <Text style={styles.previewNote}>{preview.confidenceNote}</Text>
          </View>
        ) : null}
      </View>

      <Text style={styles.fieldLabel}>Or try a phrase</Text>
      <View style={styles.phraseWrap}>
        {VOICE_DEMO_PHRASES.map((p) => (
          <Pressable
            key={p}
            style={styles.phraseChip}
            onPress={() => {
              setTranscript(p);
              setPreview(parseNaturalEvent(p));
            }}
          >
            <Text style={styles.phraseText}>{p}</Text>
          </Pressable>
        ))}
      </View>

      <Pressable
        style={[styles.primaryBtn, !transcript && styles.btnDisabled]}
        onPress={confirm}
        disabled={!transcript}
      >
        <Text style={styles.primaryBtnText}>Add this</Text>
      </Pressable>
    </SheetShell>
  );
}

function FindTimeSheet() {
  const { sheet, closeSheet, freeSlots, createFromSlot } = useCalendar();
  const visible = sheet.type === 'findTime';
  const [title, setTitle] = useState('Time together');

  useEffect(() => {
    if (visible) setTitle('Time together');
  }, [visible]);

  if (!visible) return null;

  return (
    <SheetShell
      visible
      onClose={closeSheet}
      title="Find time together"
      subtitle="Open windows when you’re both free"
    >
      <TextInput
        value={title}
        onChangeText={setTitle}
        placeholder="What should we do?"
        placeholderTextColor={colors.muted}
        style={styles.input}
      />
      <ScrollView style={{ maxHeight: 340 }} showsVerticalScrollIndicator={false}>
        {freeSlots.map((slot) => (
          <Pressable
            key={slot.id}
            style={styles.slotCard}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              createFromSlot(slot, title.trim() || 'Time together');
              closeSheet();
            }}
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
          </Pressable>
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
          <Pressable
            key={r.id}
            style={styles.requestCard}
            onPress={() => openSheet({ type: 'requestDetail', request: r })}
          >
            <View style={{ flex: 1 }}>
              <Text style={styles.slotDay}>{r.title}</Text>
              <Text style={styles.slotTime}>
                {format(r.proposedStart, 'EEE · h:mm a')} · {r.status}
              </Text>
            </View>
            <Text style={styles.chevron}>›</Text>
          </Pressable>
        ))}
      </ScrollView>
    </SheetShell>
  );
}

export function ActionDock() {
  const { openSheet, pendingCount } = useCalendar();
  return (
    <View style={styles.dockWrap}>
      <BlurView intensity={40} tint="light" style={styles.dock}>
        <DockButton label="Add" onPress={() => openSheet({ type: 'create' })} glyph="＋" />
        <DockButton label="Voice" onPress={() => openSheet({ type: 'voice' })} glyph="◌" />
        <DockButton
          label="Find time"
          onPress={() => openSheet({ type: 'findTime' })}
          glyph="◎"
          emphasize
        />
        <DockButton
          label="Requests"
          onPress={() => openSheet({ type: 'requests' })}
          glyph="↔"
          badge={pendingCount}
        />
      </BlurView>
    </View>
  );
}

function DockButton({
  label,
  glyph,
  onPress,
  badge,
  emphasize,
}: {
  label: string;
  glyph: string;
  onPress: () => void;
  badge?: number;
  emphasize?: boolean;
}) {
  return (
    <Pressable onPress={onPress} style={[styles.dockBtn, emphasize && styles.dockBtnEmph]}>
      <View>
        <Text style={[styles.dockGlyph, emphasize && styles.dockGlyphEmph]}>{glyph}</Text>
        {badge ? (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{badge}</Text>
          </View>
        ) : null}
      </View>
      <Text style={[styles.dockLabel, emphasize && styles.dockLabelEmph]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(27, 36, 32, 0.28)',
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
    backgroundColor: colors.line,
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
    backgroundColor: colors.white,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: colors.line,
    color: colors.ink,
    marginBottom: 16,
  },
  fieldLabel: {
    ...type.micro,
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
    backgroundColor: colors.ink,
    borderRadius: 18,
    paddingVertical: 16,
    alignItems: 'center',
  },
  primaryBtnText: {
    ...type.bodyMedium,
    color: colors.white,
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
  btnDisabled: {
    opacity: 0.4,
  },
  voiceStage: {
    alignItems: 'center',
    paddingVertical: 12,
    gap: 10,
  },
  mic: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: colors.meSoft,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(196, 92, 74, 0.25)',
  },
  micOn: {
    backgroundColor: colors.me,
  },
  micGlyph: {
    fontFamily: 'DMSans_700Bold',
    fontSize: 16,
    letterSpacing: 1,
    color: colors.meDeep,
    textTransform: 'uppercase',
  },
  micGlyphOn: {
    color: colors.white,
  },
  voiceHint: {
    ...type.caption,
    color: colors.muted,
  },
  transcript: {
    ...type.subtitle,
    color: colors.ink,
    textAlign: 'center',
    paddingHorizontal: 12,
  },
  previewCard: {
    width: '100%',
    backgroundColor: colors.white,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.line,
    marginTop: 4,
  },
  previewTitle: {
    ...type.bodyMedium,
    color: colors.ink,
    fontSize: 17,
  },
  previewMeta: {
    ...type.caption,
    color: colors.muted,
    marginTop: 4,
  },
  previewNote: {
    ...type.body,
    color: colors.partnerDeep,
    marginTop: 8,
    fontSize: 13,
  },
  phraseWrap: {
    gap: 8,
    marginBottom: 4,
  },
  phraseChip: {
    backgroundColor: colors.mist,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  phraseText: {
    ...type.body,
    color: colors.inkSoft,
    fontSize: 14,
  },
  slotCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.white,
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
    backgroundColor: colors.white,
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
  dockWrap: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 24,
  },
  dock: {
    flexDirection: 'row',
    borderRadius: 24,
    overflow: 'hidden',
    paddingVertical: 10,
    paddingHorizontal: 8,
    backgroundColor: 'rgba(255,255,255,0.75)',
    borderWidth: 1,
    borderColor: colors.line,
  },
  dockBtn: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
  },
  dockBtnEmph: {
    backgroundColor: colors.ink,
    borderRadius: 18,
  },
  dockGlyph: {
    fontSize: 18,
    color: colors.ink,
  },
  dockGlyphEmph: {
    color: colors.white,
  },
  dockLabel: {
    ...type.micro,
    color: colors.muted,
    fontSize: 9,
  },
  dockLabelEmph: {
    color: 'rgba(255,255,255,0.85)',
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -10,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: colors.me,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    color: colors.white,
    fontSize: 10,
    fontFamily: 'DMSans_700Bold',
  },
});
