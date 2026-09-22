import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Keyboard,
  Modal,
  Platform,
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
import { CalendarEvent, Recurrence } from '../types/calendar';
import { format, formatEventTime } from '../utils/date';
import { addMonths, getDaysInMonth, startOfMonth } from 'date-fns';
import { slotDurationLabel } from '../utils/findTime';
import { parseNaturalEvent, VOICE_DEMO_PHRASES } from '../utils/voiceParse';
import {
  RECURRENCE_OPTIONS,
  recurrenceLabel,
} from '../utils/recurrence';
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
  const [keyboardOffset, setKeyboardOffset] = useState(0);

  useEffect(() => {
    if (!visible) {
      setKeyboardOffset(0);
      return;
    }
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const onShow = Keyboard.addListener(showEvent, (e) => {
      setKeyboardOffset(e.endCoordinates.height);
    });
    const onHide = Keyboard.addListener(hideEvent, () => {
      setKeyboardOffset(0);
    });
    return () => {
      onShow.remove();
      onHide.remove();
    };
  }, [visible]);

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      onRequestClose={onClose}
    >
      <View style={[styles.overlay, { paddingBottom: keyboardOffset }]}>
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
      <CreateEventSheet />
      <EditEventSheet />
      <FindTimeSheet />
      <SearchSheet />
      <RequestsSheet />
    </>
  );
}

function RecurrenceDropdown({
  value,
  onChange,
}: {
  value: Recurrence;
  onChange: (value: Recurrence) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <View>
      <Text style={styles.fieldLabel}>Repeats</Text>
      <Pressable
        style={styles.dropdown}
        onPress={() => setOpen((v) => !v)}
      >
        <Text style={styles.dropdownValue}>{recurrenceLabel(value)}</Text>
        <Ionicons
          name={open ? 'chevron-up' : 'chevron-down'}
          size={18}
          color={colors.muted}
        />
      </Pressable>
      {open ? (
        <ScrollView style={styles.dropdownMenu} nestedScrollEnabled>
          {RECURRENCE_OPTIONS.map((opt) => {
            const selected = opt.value === value;
            return (
              <Pressable
                key={opt.value}
                style={[styles.dropdownItem, selected && styles.dropdownItemOn]}
                onPress={() => {
                  onChange(opt.value);
                  setOpen(false);
                  Haptics.selectionAsync();
                }}
              >
                <Text
                  style={[
                    styles.dropdownItemText,
                    selected && styles.dropdownItemTextOn,
                  ]}
                >
                  {opt.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      ) : null}
    </View>
  );
}

function CreateEventSheet() {
  const {
    sheet,
    closeSheet,
    freeSlots,
    createFromSlot,
    today,
    addEvent,
    sendSharedRequest,
  } = useCalendar();
  const visible = sheet.type === 'create';
  const [step, setStep] = useState<'compose' | 'confirm'>('compose');
  const [text, setText] = useState('');
  const [listening, setListening] = useState(false);
  const [showFindTime, setShowFindTime] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<(typeof freeSlots)[number] | null>(null);
  const [recurrence, setRecurrence] = useState<Recurrence>('none');
  const [confirmTitle, setConfirmTitle] = useState('');
  const pulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (visible) {
      setStep('compose');
      setText('');
      setListening(false);
      setShowFindTime(false);
      setSelectedSlot(null);
      setRecurrence('none');
      setConfirmTitle('');
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

  const canContinue = Boolean(text.trim() || selectedSlot);

  const draft = (() => {
    if (selectedSlot) {
      return {
        title: confirmTitle.trim() || text.trim() || 'Time together',
        start: selectedSlot.start,
        end: selectedSlot.end,
        owner: 'shared' as const,
        note: 'Shared plan — added for both of you.',
      };
    }
    const parsed = parseNaturalEvent(text.trim() || 'New plan', today);
    return {
      title: confirmTitle.trim() || parsed.title,
      start: parsed.start,
      end: parsed.end,
      owner: parsed.owner,
      note: parsed.confidenceNote,
    };
  })();

  const goConfirm = () => {
    if (!canContinue) return;
    const raw = text.trim() || (selectedSlot ? 'Time together' : 'New plan');
    if (selectedSlot) {
      setConfirmTitle(raw === 'Time together' ? 'Time together' : raw);
    } else {
      setConfirmTitle(parseNaturalEvent(raw, today).title);
    }
    setRecurrence('none');
    setStep('confirm');
    Haptics.selectionAsync();
  };

  const finalize = () => {
    const title = confirmTitle.trim() || draft.title;
    if (!title) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    if (selectedSlot) {
      createFromSlot(selectedSlot, title, recurrence);
    } else {
      const parsed = parseNaturalEvent(text.trim() || title, today);
      if (parsed.owner === 'shared') {
        sendSharedRequest({
          title,
          start: parsed.start,
          end: parsed.end,
        });
        addEvent({
          title: `${title} (requested)`,
          start: parsed.start,
          end: parsed.end,
          owner: 'me',
          notes: 'Waiting on Thomas',
          recurrence,
        });
      } else {
        addEvent({
          title,
          start: parsed.start,
          end: parsed.end,
          owner: parsed.owner,
          recurrence,
        });
      }
    }
    closeSheet();
  };

  if (step === 'confirm') {
    return (
      <SheetShell
        visible
        onClose={closeSheet}
        title="Confirm event"
        subtitle="Does everything look right?"
      >
        <Text style={styles.fieldLabel}>Title</Text>
        <TextInput
          value={confirmTitle}
          onChangeText={setConfirmTitle}
          style={styles.confirmTitleInput}
          placeholder="Event title"
          placeholderTextColor={colors.muted}
        />

        <Text style={[styles.fieldLabel, { marginTop: 14 }]}>When</Text>
        <View style={styles.confirmMetaBox}>
          <Text style={styles.confirmMetaText}>
            {formatEventTime(draft.start, draft.end)}
          </Text>
        </View>

        <Text style={[styles.fieldLabel, { marginTop: 14 }]}>Who</Text>
        <View style={styles.confirmMetaBox}>
          <Text style={styles.confirmMetaText}>
            {draft.owner === 'shared' ? 'Together' : 'Just you'}
          </Text>
          <Text style={styles.confirmNote}>{draft.note}</Text>
        </View>

        <View style={{ marginTop: 14 }}>
          <RecurrenceDropdown value={recurrence} onChange={setRecurrence} />
        </View>

        <PressableScale
          style={[styles.primaryBtn, !confirmTitle.trim() && styles.btnDisabled]}
          onPress={finalize}
          disabled={!confirmTitle.trim()}
          haptic="light"
        >
          <Text style={styles.primaryBtnText}>Add to calendar</Text>
        </PressableScale>
        <Pressable style={styles.ghostBtn} onPress={() => setStep('compose')}>
          <Text style={styles.ghostBtnText}>Back</Text>
        </Pressable>
      </SheetShell>
    );
  }

  return (
    <SheetShell visible onClose={closeSheet} title="New event">
      <ScrollView
        style={styles.createScroll}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
      >
        {!selectedSlot ? (
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
                      setSelectedSlot(slot);
                      setShowFindTime(false);
                      Haptics.selectionAsync();
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
        ) : (
          <View style={styles.selectedSlotChip}>
            <View style={{ flex: 1 }}>
              <Text style={styles.selectedSlotLabel}>Selected time</Text>
              <Text style={styles.selectedSlotValue}>
                {selectedSlot.dayLabel} · {selectedSlot.timeLabel}
              </Text>
            </View>
            <Pressable
              onPress={() => setSelectedSlot(null)}
              hitSlop={8}
              accessibilityLabel="Clear selected time"
            >
              <Ionicons name="close-circle" size={20} color={colors.muted} />
            </Pressable>
          </View>
        )}

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

        <PressableScale
          style={[styles.primaryBtn, !canContinue && styles.btnDisabled]}
          onPress={goConfirm}
          disabled={!canContinue}
          haptic="light"
        >
          <Text style={styles.primaryBtnText}>Continue</Text>
        </PressableScale>
      </ScrollView>
    </SheetShell>
  );
}

function EditEventSheet() {
  const { sheet, closeSheet, updateEvent, deleteEvent } = useCalendar();
  const visible = sheet.type === 'edit';
  const event = visible ? sheet.event : null;
  const [title, setTitle] = useState('');
  const [recurrence, setRecurrence] = useState<Recurrence>('none');

  useEffect(() => {
    if (visible && event) {
      setTitle(event.title);
      setRecurrence(event.recurrence ?? 'none');
    }
  }, [visible, event]);

  if (!visible || !event) return null;

  const canSave = Boolean(title.trim());

  return (
    <SheetShell
      visible
      onClose={closeSheet}
      title="Edit event"
      subtitle={formatEventTime(event.start, event.end)}
    >
      <Text style={styles.fieldLabel}>Title</Text>
      <TextInput
        value={title}
        onChangeText={setTitle}
        style={styles.confirmTitleInput}
        placeholder="Event title"
        placeholderTextColor={colors.muted}
      />

      <View style={{ marginTop: 14 }}>
        <RecurrenceDropdown value={recurrence} onChange={setRecurrence} />
      </View>

      <PressableScale
        style={[styles.primaryBtn, !canSave && styles.btnDisabled]}
        onPress={() => {
          if (!canSave) return;
          updateEvent(event.id, {
            title: title.trim(),
            recurrence,
          });
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          closeSheet();
        }}
        disabled={!canSave}
        haptic="light"
      >
        <Text style={styles.primaryBtnText}>Save changes</Text>
      </PressableScale>

      <Pressable
        style={styles.declineBtn}
        onPress={() => {
          deleteEvent(event.id);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          closeSheet();
        }}
      >
        <Text style={styles.declineBtnText}>Delete event</Text>
      </Pressable>
    </SheetShell>
  );
}

function SearchSheet() {
  const { sheet, closeSheet, events, requests, jumpToDay, openSheet, couple } =
    useCalendar();
  const visible = sheet.type === 'search';
  const [query, setQuery] = useState('');

  useEffect(() => {
    if (visible) setQuery('');
  }, [visible]);

  if (!visible) return null;

  const q = query.trim().toLowerCase();
  const matchedEvents = q
    ? events.filter(
        (e) =>
          e.title.toLowerCase().includes(q)
          || (e.location ?? '').toLowerCase().includes(q)
          || (e.notes ?? '').toLowerCase().includes(q),
      )
    : [];
  const matchedRequests = q
    ? requests.filter(
        (r) =>
          r.title.toLowerCase().includes(q)
          || (r.location ?? '').toLowerCase().includes(q)
          || (r.notes ?? '').toLowerCase().includes(q),
      )
    : [];

  const ownerLabel = (owner: CalendarEvent['owner']) => {
    if (owner === 'me') return couple.me.name;
    if (owner === 'partner') return couple.partner.name;
    return 'Together';
  };

  return (
    <SheetShell
      visible
      onClose={closeSheet}
      title="Search"
      subtitle="Find plans and requests"
    >
      <View style={styles.searchField}>
        <Ionicons name="search" size={18} color={colors.muted} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Dinner, climbing, walk…"
          placeholderTextColor={colors.muted}
          style={styles.searchInput}
          autoFocus
          clearButtonMode="while-editing"
        />
      </View>

      {!q ? (
        <Text style={styles.empty}>Start typing to search your week.</Text>
      ) : matchedEvents.length + matchedRequests.length === 0 ? (
        <Text style={styles.empty}>No matches for “{query.trim()}”.</Text>
      ) : (
        <ScrollView style={styles.sheetList} showsVerticalScrollIndicator={false}>
          {matchedEvents.map((event) => (
            <PressableScale
              key={event.id}
              style={styles.requestCard}
              onPress={() => {
                jumpToDay(event.start);
                closeSheet();
              }}
              haptic="selection"
            >
              <View style={{ flex: 1 }}>
                <Text style={styles.slotDay}>{event.title}</Text>
                <Text style={styles.slotTime}>
                  {format(event.start, 'EEE · MMM d · h:mm a')} · {ownerLabel(event.owner)}
                </Text>
              </View>
              <Text style={styles.chevron}>›</Text>
            </PressableScale>
          ))}
          {matchedRequests.map((request) => (
            <PressableScale
              key={request.id}
              style={styles.requestCard}
              onPress={() => openSheet({ type: 'requestDetail', request })}
              haptic="selection"
            >
              <View style={{ flex: 1 }}>
                <Text style={styles.slotDay}>{request.title}</Text>
                <Text style={styles.slotTime}>
                  {format(request.proposedStart, 'EEE · MMM d · h:mm a')} · RSVP
                </Text>
              </View>
              <Text style={styles.chevron}>›</Text>
            </PressableScale>
          ))}
        </ScrollView>
      )}
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
      {!freeSlots.length ? (
        <Text style={styles.empty}>No mutual openings this week — try next week.</Text>
      ) : freeSlots.length <= 4 ? (
        <View>
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
        </View>
      ) : (
        <ScrollView style={styles.sheetList} showsVerticalScrollIndicator={false}>
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
        </ScrollView>
      )}
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
    today,
  } = useCalendar();
  const visible = sheet.type === 'requests' || sheet.type === 'requestDetail';
  const [step, setStep] = useState<'detail' | 'suggestTime'>('detail');
  const [pickedMonth, setPickedMonth] = useState(() => startOfMonth(today));
  const [pickedDay, setPickedDay] = useState(today.getDate());
  const [pickedHour, setPickedHour] = useState(19);
  const [pickedMinute, setPickedMinute] = useState(0);
  const [openDropdown, setOpenDropdown] = useState<'month' | 'day' | 'time' | null>(null);

  useEffect(() => {
    if (!visible) return;
    setStep('detail');
    setOpenDropdown(null);
    if (sheet.type === 'requestDetail') {
      const start = sheet.request.proposedStart;
      setPickedMonth(startOfMonth(start));
      setPickedDay(start.getDate());
      setPickedHour(start.getHours());
      setPickedMinute(start.getMinutes() < 30 ? 0 : 30);
    }
  }, [visible, sheet, today]);

  if (!visible) return null;

  const detail = sheet.type === 'requestDetail' ? sheet.request : null;

  if (detail) {
    const start = detail.suggestedStart ?? detail.proposedStart;
    const end = detail.suggestedEnd ?? detail.proposedEnd;
    const fromPartner = detail.from === 'partner';
    const speakerInitial = fromPartner
      ? couple.partner.initial
      : couple.me.initial;
    const durationMins = Math.max(
      30,
      Math.round((detail.proposedEnd.getTime() - detail.proposedStart.getTime()) / 60000),
    );

    const daysInMonth = getDaysInMonth(pickedMonth);
    const safeDay = Math.min(pickedDay, daysInMonth);
    const monthOptions = Array.from({ length: 12 }, (_, i) =>
      addMonths(startOfMonth(today), i - 1),
    );
    const dayOptions = Array.from({ length: daysInMonth }, (_, i) => i + 1);
    const timeOptions = Array.from({ length: 48 }, (_, i) => ({
      hour: Math.floor(i / 2),
      minute: i % 2 === 0 ? 0 : 30,
    }));

    if (step === 'suggestTime') {
      const suggestedStart = new Date(pickedMonth);
      suggestedStart.setDate(safeDay);
      suggestedStart.setHours(pickedHour, pickedMinute, 0, 0);
      const suggestedEnd = new Date(suggestedStart.getTime() + durationMins * 60000);
      const monthLabel = format(pickedMonth, 'MMMM');
      const dayLabel = String(safeDay);
      const timeLabel = format(suggestedStart, 'h:mm a');

      return (
        <SheetShell
          visible
          onClose={closeSheet}
          title="Suggest a time"
          subtitle={`For “${detail.title}”`}
        >
          <Text style={styles.fieldLabel}>Month</Text>
          <Pressable
            style={styles.dropdown}
            onPress={() =>
              setOpenDropdown((v) => (v === 'month' ? null : 'month'))
            }
          >
            <Text style={styles.dropdownValue}>{monthLabel}</Text>
            <Ionicons
              name={openDropdown === 'month' ? 'chevron-up' : 'chevron-down'}
              size={18}
              color={colors.muted}
            />
          </Pressable>
          {openDropdown === 'month' ? (
            <ScrollView style={styles.dropdownMenu} nestedScrollEnabled>
              {monthOptions.map((month) => {
                const selected =
                  month.getFullYear() === pickedMonth.getFullYear()
                  && month.getMonth() === pickedMonth.getMonth();
                return (
                  <Pressable
                    key={month.toISOString()}
                    style={[styles.dropdownItem, selected && styles.dropdownItemOn]}
                    onPress={() => {
                      setPickedMonth(month);
                      const maxDay = getDaysInMonth(month);
                      if (pickedDay > maxDay) setPickedDay(maxDay);
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
                      {format(month, 'MMMM')}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          ) : null}

          <Text style={[styles.fieldLabel, { marginTop: 14 }]}>Date</Text>
          <Pressable
            style={styles.dropdown}
            onPress={() =>
              setOpenDropdown((v) => (v === 'day' ? null : 'day'))
            }
          >
            <Text style={styles.dropdownValue}>{dayLabel}</Text>
            <Ionicons
              name={openDropdown === 'day' ? 'chevron-up' : 'chevron-down'}
              size={18}
              color={colors.muted}
            />
          </Pressable>
          {openDropdown === 'day' ? (
            <ScrollView style={styles.dropdownMenu} nestedScrollEnabled>
              {dayOptions.map((day) => {
                const selected = day === safeDay;
                return (
                  <Pressable
                    key={day}
                    style={[styles.dropdownItem, selected && styles.dropdownItemOn]}
                    onPress={() => {
                      setPickedDay(day);
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
                      {day}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          ) : null}

          <Text style={[styles.fieldLabel, { marginTop: 14 }]}>Time</Text>
          <Pressable
            style={styles.dropdown}
            onPress={() =>
              setOpenDropdown((v) => (v === 'time' ? null : 'time'))
            }
          >
            <Text style={styles.dropdownValue}>{timeLabel}</Text>
            <Ionicons
              name={openDropdown === 'time' ? 'chevron-up' : 'chevron-down'}
              size={18}
              color={colors.muted}
            />
          </Pressable>
          {openDropdown === 'time' ? (
            <ScrollView style={styles.dropdownMenu} nestedScrollEnabled>
              {timeOptions.map((opt) => {
                const selected =
                  opt.hour === pickedHour && opt.minute === pickedMinute;
                const label = format(
                  new Date(2026, 0, 1, opt.hour, opt.minute),
                  'h:mm a',
                );
                return (
                  <Pressable
                    key={`${opt.hour}-${opt.minute}`}
                    style={[styles.dropdownItem, selected && styles.dropdownItemOn]}
                    onPress={() => {
                      setPickedHour(opt.hour);
                      setPickedMinute(opt.minute);
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
                      {label}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          ) : null}

          <PressableScale
            style={styles.primaryBtn}
            onPress={() => {
              suggestRequestTime(detail.id, suggestedStart, suggestedEnd);
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              closeSheet();
            }}
            haptic="light"
          >
            <Text style={styles.primaryBtnText}>Send suggestion</Text>
          </PressableScale>
          <Pressable
            style={styles.ghostBtn}
            onPress={() => {
              setOpenDropdown(null);
              setStep('detail');
            }}
          >
            <Text style={styles.ghostBtnText}>Back</Text>
          </Pressable>
        </SheetShell>
      );
    }

    return (
      <SheetShell
        visible
        onClose={closeSheet}
        title={detail.title}
        subtitle={`From ${fromPartner ? couple.partner.name : 'you'}`}
      >
        <Text style={styles.detailTime}>{formatEventTime(start, end)}</Text>
        {detail.location ? (
          <View style={styles.detailLocationRow}>
            <Ionicons name="location-outline" size={15} color={colors.ink} />
            <Text style={styles.detailMeta}>{detail.location}</Text>
          </View>
        ) : null}
        {detail.notes ? (
          <View style={styles.detailNotesRow}>
            <View style={styles.noteInitial}>
              <Text style={styles.noteInitialText}>{speakerInitial}</Text>
            </View>
            <Text style={styles.detailNotes}>{detail.notes}</Text>
          </View>
        ) : null}
        {detail.status === 'suggested' && detail.suggestedStart ? (
          <Text style={styles.previewNote}>
            Suggested alternate: {formatEventTime(detail.suggestedStart, detail.suggestedEnd!)}
          </Text>
        ) : null}

        {detail.status === 'pending' && fromPartner ? (
          <View style={styles.stackBtns}>
            <Pressable
              style={[styles.primaryBtn, { marginTop: 0 }]}
              onPress={() => {
                acceptRequest(detail.id);
                closeSheet();
              }}
            >
              <Text style={styles.primaryBtnText}>Accept</Text>
            </Pressable>
            <Pressable
              style={styles.secondaryBtn}
              onPress={() => {
                setStep('suggestTime');
                setOpenDropdown(null);
                Haptics.selectionAsync();
              }}
            >
              <Text style={styles.secondaryBtnText}>Suggest time</Text>
            </Pressable>
            <Pressable
              style={styles.declineBtn}
              onPress={() => {
                declineRequest(detail.id);
                closeSheet();
              }}
            >
              <Text style={styles.declineBtnText}>Decline</Text>
            </Pressable>
          </View>
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

        {detail.status === 'pending' && detail.from === 'me' ? (
          <Pressable
            style={styles.declineBtn}
            onPress={() => {
              declineRequest(detail.id);
              closeSheet();
            }}
          >
            <Text style={styles.declineBtnText}>Cancel invite</Text>
          </Pressable>
        ) : null}
      </SheetShell>
    );
  }

  return (
    <SheetShell
      visible
      onClose={closeSheet}
      title="Requests"
      subtitle="Plans waiting for your reply"
    >
      {(() => {
        const pending = requests.filter(
          (r) =>
            r.from === 'partner'
            && (r.status === 'pending' || r.status === 'suggested'),
        );
        if (!pending.length) {
          return <Text style={styles.empty}>Nothing needs a reply</Text>;
        }
        const list = pending.map((r) => (
          <PressableScale
            key={r.id}
            style={styles.requestCard}
            onPress={() => openSheet({ type: 'requestDetail', request: r })}
            haptic="selection"
          >
            <View style={{ flex: 1 }}>
              <Text style={styles.slotDay}>{r.title}</Text>
              <Text style={styles.slotTime}>
                {format(r.proposedStart, 'EEE · h:mm a')}
                {` · From ${couple.partner.shortName}`}
              </Text>
            </View>
            <Text style={styles.chevron}>›</Text>
          </PressableScale>
        ));
        if (pending.length <= 4) {
          return <View>{list}</View>;
        }
        return (
          <ScrollView style={styles.sheetList} showsVerticalScrollIndicator={false}>
            {list}
          </ScrollView>
        );
      })()}
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
    backgroundColor: colors.white,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 22,
    paddingTop: 10,
    paddingBottom: 28,
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
    fontSize: 20,
    lineHeight: 26,
    color: colors.ink,
    marginBottom: 14,
  },
  sheetSub: {
    ...type.body,
    color: colors.muted,
    marginTop: -6,
    marginBottom: 16,
  },
  detailTime: {
    ...type.subtitle,
    color: colors.inkSoft,
    marginBottom: 8,
  },
  detailMeta: {
    ...type.bodyMedium,
    color: colors.ink,
    flexShrink: 1,
  },
  detailLocationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  detailNotesRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginBottom: 16,
  },
  noteInitial: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.partnerSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  noteInitialText: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 11,
    color: colors.partnerDeep,
  },
  detailNotes: {
    ...type.body,
    color: colors.inkSoft,
    flex: 1,
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
  sheetList: {
    maxHeight: 360,
  },
  stackBtns: {
    marginTop: 18,
    gap: 10,
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
    flexGrow: 0,
  },
  confirmTitleInput: {
    ...type.body,
    backgroundColor: colors.fill,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 14,
    color: colors.ink,
  },
  confirmMetaBox: {
    backgroundColor: colors.fill,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 14,
    gap: 4,
  },
  confirmMetaText: {
    fontFamily: 'Poppins_500Medium',
    fontSize: 15,
    color: colors.ink,
  },
  confirmNote: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 12,
    color: colors.muted,
    marginTop: 2,
  },
  searchField: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.fill,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 14,
  },
  searchInput: {
    flex: 1,
    fontFamily: 'Poppins_400Regular',
    fontSize: 15,
    color: colors.ink,
    padding: 0,
  },
  findTimeBlock: {
    marginTop: 0,
    marginBottom: 16,
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
  selectedSlotChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.fill,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 14,
  },
  selectedSlotLabel: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 11,
    color: colors.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  selectedSlotValue: {
    fontFamily: 'Poppins_500Medium',
    fontSize: 15,
    color: colors.ink,
    marginTop: 2,
  },
  secondaryBtn: {
    backgroundColor: colors.white,
    borderRadius: 18,
    paddingVertical: 16,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: colors.ink,
  },
  secondaryBtnText: {
    ...type.bodyMedium,
    color: colors.ink,
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
  declineBtn: {
    paddingVertical: 16,
    alignItems: 'center',
    borderRadius: 18,
  },
  declineBtnText: {
    ...type.bodyMedium,
    color: colors.danger,
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
});
