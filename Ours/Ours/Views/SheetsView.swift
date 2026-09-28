import SwiftUI

struct SheetsHost: View {
  @EnvironmentObject private var store: CalendarStore
  @State private var contentHeight: CGFloat = 420

  private var detentHeight: CGFloat {
    let screen = UIScreen.main.bounds.height
    let maxHeight = screen * SheetLayout.maxSheetFraction
    let padded = contentHeight + SheetLayout.topInset + 20
    return min(max(padded, 280), maxHeight)
  }

  var body: some View {
    Group {
      switch store.sheet {
      case .create:
        CreateEventSheet()
      case .edit(let event):
        EditEventSheet(event: event)
      case .findTime:
        FindTimeSheet()
      case .search:
        SearchSheet()
      case .requests, .requestDetail:
        RequestsSheet()
      case .none:
        Text("").onAppear { store.closeSheet() }
      }
    }
    .oursSheetTopInset()
    .frame(maxWidth: .infinity, alignment: .topLeading)
    .background(AppColor.white)
    .id(store.sheet)
    .onPreferenceChange(SheetContentHeightKey.self) { contentHeight = $0 }
    .presentationDetents([.height(detentHeight)])
    .presentationDragIndicator(.hidden)
    .presentationBackground(AppColor.white)
    .transaction { $0.animation = nil }
  }
}

struct RecurrenceDropdown: View {
  @Binding var value: Recurrence
  @State private var open = false

  var body: some View {
    VStack(alignment: .leading, spacing: 0) {
      Text("Repeats")
        .font(AppFont.poppins(.medium, size: 11))
        .tracking(0.4)
        .textCase(.uppercase)
        .foregroundStyle(AppColor.muted)
        .padding(.bottom, 8)
      Button { open.toggle() } label: {
        HStack {
          Text(value.label)
            .font(AppFont.poppins(.medium, size: 15))
            .foregroundStyle(AppColor.ink)
          Spacer()
          Image(systemName: open ? "chevron.up" : "chevron.down")
            .foregroundStyle(AppColor.muted)
        }
        .padding(.horizontal, 14)
        .padding(.vertical, 14)
        .background(AppColor.fill)
        .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
      }
      if open {
        ScrollView {
          VStack(spacing: 0) {
            ForEach(Recurrence.allCases) { opt in
              Button {
                value = opt
                open = false
                UISelectionFeedbackGenerator().selectionChanged()
              } label: {
                Text(opt.label)
                  .font(AppFont.poppins(opt == value ? .medium : .regular, size: 15))
                  .foregroundStyle(opt == value ? AppColor.ink : AppColor.inkSoft)
                  .frame(maxWidth: .infinity, alignment: .leading)
                  .padding(.horizontal, 14)
                  .padding(.vertical, 12)
                  .background(opt == value ? AppColor.accentSoft : Color.clear)
              }
            }
          }
        }
        .frame(maxHeight: 220)
        .background(AppColor.fill)
        .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
        .padding(.top, 8)
      }
    }
  }
}

struct PrimaryButton: View {
  let title: String
  var disabled = false
  let action: () -> Void

  var body: some View {
    Button(action: action) {
      Text(title)
        .font(AppType.bodyMedium)
        .foregroundStyle(AppColor.white)
        .frame(maxWidth: .infinity)
        .padding(.vertical, 16)
        .background(AppColor.accent)
        .clipShape(RoundedRectangle(cornerRadius: 18, style: .continuous))
        .opacity(disabled ? 0.4 : 1)
    }
    .disabled(disabled)
    .buttonStyle(ScaleButtonStyle(scaleTo: 0.98))
    .padding(.top, 18)
  }
}

struct CreateEventSheet: View {
  @EnvironmentObject private var store: CalendarStore
  @State private var step: Step = .compose
  @State private var text = ""
  @State private var listening = false
  @State private var showFindTime = false
  @State private var includePartner = false
  @State private var selectedSlot: FreeSlot?
  @State private var recurrence: Recurrence = .none
  @State private var confirmTitle = ""
  @State private var confirmEditing = false
  @State private var confirmPickedMonth = Date()
  @State private var confirmPickedDay = 1
  @State private var confirmStartHour = 19
  @State private var confirmStartMinute = 0
  @State private var confirmEndHour = 21
  @State private var confirmEndMinute = 0
  @State private var confirmTimeDropdown: ConfirmTimeDropdown?
  @State private var pulse: CGFloat = 1
  @State private var confirmedJumpDay: Date?

  enum Step { case compose, confirm, celebrating }
  enum ConfirmTimeDropdown { case date, startTime, endTime }

  private var planScope: FindTimeScope { includePartner ? .together : .solo }

  private var canContinue: Bool {
    !text.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty || selectedSlot != nil
  }

  private var confirmDayDate: Date {
    let daysInMonth = DateUtils.daysInMonth(confirmPickedMonth)
    let safeDay = min(confirmPickedDay, daysInMonth)
    return DateUtils.calendar.date(bySetting: .day, value: safeDay, of: confirmPickedMonth) ?? confirmPickedMonth
  }

  private var resolvedConfirmStart: Date {
    DateUtils.atTime(confirmDayDate, hour: confirmStartHour, minute: confirmStartMinute)
  }

  private var resolvedConfirmEnd: Date {
    let end = DateUtils.atTime(confirmDayDate, hour: confirmEndHour, minute: confirmEndMinute)
    if end <= resolvedConfirmStart {
      return DateUtils.addMinutes(resolvedConfirmStart, 30)
    }
    return end
  }

  private var resolvedTitle: String {
    let trimmed = confirmTitle.trimmingCharacters(in: .whitespaces)
    return trimmed.isEmpty ? defaultTitle : trimmed
  }

  private var defaultTitle: String {
    if !text.trimmingCharacters(in: .whitespaces).isEmpty {
      return text.trimmingCharacters(in: .whitespaces)
    }
    return includePartner ? "Time together" : "New plan"
  }

  var body: some View {
    Group {
      switch step {
      case .compose:
        composeStep
      case .confirm:
        confirmStep
      case .celebrating:
        celebratingStep
      }
    }
    .onAppear(perform: resetFlow)
  }

  private func resetFlow() {
    step = .compose
    text = ""
    listening = false
    showFindTime = false
    includePartner = false
    selectedSlot = nil
    recurrence = .none
    confirmTitle = ""
    confirmEditing = false
    confirmTimeDropdown = nil
    confirmedJumpDay = nil
  }

  private var composeStep: some View {
    SheetChrome(title: "New event", onClose: { store.closeSheet() }) {
      fieldLabel("Who’s coming")
      PlanParticipantsPicker(
        includePartner: $includePartner,
        meInitial: store.couple.me.initial,
        partnerInitial: store.couple.partner.initial,
        meColor: store.meColor,
        partnerLinked: store.partnerLinked
      )
      .onChange(of: includePartner) { _, _ in selectedSlot = nil }
      .padding(.bottom, 16)

      HStack(alignment: .top, spacing: 10) {
        TextField(
          "Tell us what you’re doing at what time on what date with who and we’ll put it in the calendar.",
          text: $text,
          axis: .vertical
        )
        .font(AppType.body)
        .foregroundStyle(AppColor.ink)
        .lineLimit(3...6)
        .padding(14)
        .frame(minHeight: 96, alignment: .topLeading)
        .background(AppColor.canvasElevated)
        .overlay(
          RoundedRectangle(cornerRadius: 16, style: .continuous)
            .stroke(AppColor.hairline, lineWidth: 0.5)
        )
        .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))

        Button(action: startListening) {
          Image(systemName: listening ? "mic.fill" : "mic")
            .font(.system(size: 20))
            .foregroundStyle(listening ? AppColor.white : AppColor.ink)
            .frame(width: 48, height: 48)
            .background(listening ? AppColor.accent : AppColor.accentSoft)
            .clipShape(Circle())
            .scaleEffect(pulse)
        }
        .padding(.top, 4)
      }
      .padding(.bottom, 16)

      if let slot = selectedSlot {
        HStack {
          VStack(alignment: .leading, spacing: 2) {
            Text("Selected time")
              .font(AppFont.poppins(.regular, size: 11))
              .tracking(0.3)
              .textCase(.uppercase)
              .foregroundStyle(AppColor.muted)
            Text("\(slot.dayLabel) · \(slot.timeLabel)")
              .font(AppFont.poppins(.medium, size: 15))
              .foregroundStyle(AppColor.ink)
          }
          Spacer()
          Button { selectedSlot = nil } label: {
            Image(systemName: "xmark.circle.fill")
              .foregroundStyle(AppColor.muted)
          }
        }
        .padding(14)
        .background(AppColor.fill)
        .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
        .padding(.bottom, 14)
      } else {
        findTimeBlock
      }
    } footer: {
      PrimaryButton(title: "Continue", disabled: !canContinue, action: goConfirm)
        .padding(.top, 4)
    }
  }

  private var findTimeBlock: some View {
    let slots = store.freeSlots(scope: planScope)
    return VStack(spacing: 0) {
      Button {
        UISelectionFeedbackGenerator().selectionChanged()
        showFindTime.toggle()
      } label: {
        HStack(spacing: 10) {
          Image(systemName: "sparkles")
            .foregroundStyle(AppColor.ink)
          VStack(alignment: .leading, spacing: 2) {
            Text("Find time")
              .font(AppFont.poppins(.medium, size: 14))
              .foregroundStyle(AppColor.ink)
            Text(planScope.subtitle(couple: store.couple))
              .font(AppFont.poppins(.regular, size: 12))
              .foregroundStyle(AppColor.muted)
          }
          Spacer()
          Image(systemName: showFindTime ? "chevron.up" : "chevron.down")
            .foregroundStyle(AppColor.muted)
        }
        .padding(14)
        .background(AppColor.fill)
        .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
      }
      .buttonStyle(ScaleButtonStyle())

      if showFindTime {
        ScrollView {
          VStack(spacing: 10) {
            ForEach(slots) { slot in
              Button {
                selectedSlot = slot
                showFindTime = false
                UISelectionFeedbackGenerator().selectionChanged()
              } label: {
                slotCard(slot)
              }
              .buttonStyle(ScaleButtonStyle())
            }
            if slots.isEmpty {
              Text(includePartner
                ? "No mutual openings this week — try next week."
                : "No open windows this week — try next week.")
                .font(AppType.body)
                .foregroundStyle(AppColor.muted)
                .multilineTextAlignment(.center)
                .padding(.vertical, 24)
            }
          }
        }
        .frame(maxHeight: 220)
        .padding(.top, 10)
      }
    }
  }

  private var confirmStep: some View {
    SheetChrome(
      title: confirmEditing ? "Edit details" : "Does everything look right?",
      subtitle: nil,
      onClose: { store.closeSheet() }
    ) {
      if confirmEditing {
        confirmEditForm
      } else {
        confirmReview
      }
    }
  }

  private var confirmReview: some View {
    VStack(alignment: .leading, spacing: 0) {
      Image(systemName: "calendar")
        .font(.system(size: 22, weight: .medium))
        .foregroundStyle(AppColor.inkSoft)
        .padding(.bottom, 20)

      Text(resolvedTitle)
        .font(AppFont.poppins(.regular, size: 22))
        .foregroundStyle(AppColor.ink)
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(.bottom, 18)

      condensedRow(label: "Date", value: DateUtils.format(confirmDayDate, "MMMM d"))
      condensedRow(label: "When", value: DateUtils.formatEventTime(resolvedConfirmStart, resolvedConfirmEnd))
        .padding(.top, 14)
      condensedParticipants(includePartner: includePartner)
        .padding(.top, 14)
      condensedRow(label: "Repeats", value: recurrence.label)
        .padding(.top, 14)

      PrimaryButton(title: "Confirm", disabled: resolvedTitle.isEmpty, action: commitAndShowConfirmed)

      Button {
        confirmEditing = true
        confirmTimeDropdown = nil
        UISelectionFeedbackGenerator().selectionChanged()
      } label: {
        Text("Edit")
          .font(AppType.bodyMedium)
          .foregroundStyle(AppColor.muted)
          .frame(maxWidth: .infinity)
          .padding(.vertical, 12)
      }
      .padding(.top, 6)
    }
  }

  private var celebratingStep: some View {
    SheetChrome(title: "", showTitle: false, onClose: {
      finishCelebration()
    }) {
      ReservationConfirmedBanner()
        .onAppear {
          DispatchQueue.main.asyncAfter(deadline: .now() + 1.35) {
            finishCelebration()
          }
        }
    }
  }

  private func finishCelebration() {
    if let day = confirmedJumpDay {
      store.jumpToDay(day)
    }
    store.closeSheet()
  }

  private var confirmEditForm: some View {
    VStack(alignment: .leading, spacing: 0) {
      fieldLabel("Title")
      TextField("Event title", text: $confirmTitle)
        .font(AppType.body)
        .padding(14)
        .background(AppColor.fill)
        .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))

      dateCalendarDropdown
        .padding(.top, 14)

      HStack(alignment: .top, spacing: 10) {
        confirmDropdownField(
          label: "Start",
          value: DateUtils.format(resolvedConfirmStart, "h:mm a"),
          isOpen: confirmTimeDropdown == .startTime,
          selectedScrollId: timeId(confirmStartHour, confirmStartMinute),
          toggle: {
            confirmTimeDropdown = confirmTimeDropdown == .startTime ? nil : .startTime
          }
        ) {
          timeOptions(selectedHour: confirmStartHour, selectedMinute: confirmStartMinute) { hour, minute in
            confirmStartHour = hour
            confirmStartMinute = minute
            confirmTimeDropdown = nil
          }
        }

        confirmDropdownField(
          label: "End",
          value: DateUtils.format(resolvedConfirmEnd, "h:mm a"),
          isOpen: confirmTimeDropdown == .endTime,
          selectedScrollId: timeId(confirmEndHour, confirmEndMinute),
          toggle: {
            confirmTimeDropdown = confirmTimeDropdown == .endTime ? nil : .endTime
          }
        ) {
          timeOptions(selectedHour: confirmEndHour, selectedMinute: confirmEndMinute) { hour, minute in
            confirmEndHour = hour
            confirmEndMinute = minute
            confirmTimeDropdown = nil
          }
        }
      }
      .padding(.top, 14)

      fieldLabel("Who").padding(.top, 14)
      PlanParticipantsPicker(
        includePartner: $includePartner,
        meInitial: store.couple.me.initial,
        partnerInitial: store.couple.partner.initial,
        meColor: store.meColor,
        partnerLinked: store.partnerLinked
      )

      RecurrenceDropdown(value: $recurrence)
        .padding(.top, 14)

      PrimaryButton(title: "Save details") {
        confirmEditing = false
        confirmTimeDropdown = nil
        UISelectionFeedbackGenerator().selectionChanged()
      }

      Button {
        confirmEditing = false
        confirmTimeDropdown = nil
      } label: {
        Text("Cancel editing")
          .font(AppType.bodyMedium)
          .foregroundStyle(AppColor.muted)
          .frame(maxWidth: .infinity)
          .padding(.vertical, 12)
      }
      .padding(.top, 10)
    }
  }

  private var dateCalendarDropdown: some View {
    let daysInMonth = DateUtils.daysInMonth(confirmPickedMonth)
    let safeDay = min(confirmPickedDay, daysInMonth)
    let isOpen = confirmTimeDropdown == .date
    let dows = ["M", "T", "W", "T", "F", "S", "S"]
    let grid = DateUtils.getMonthGrid(confirmPickedMonth)

    return VStack(alignment: .leading, spacing: 0) {
      Text("Date")
        .font(AppFont.poppins(.medium, size: 11))
        .tracking(0.4)
        .textCase(.uppercase)
        .foregroundStyle(AppColor.muted)
        .padding(.bottom, 8)

      Button {
        confirmTimeDropdown = isOpen ? nil : .date
        UISelectionFeedbackGenerator().selectionChanged()
      } label: {
        HStack(spacing: 10) {
          Image(systemName: "calendar")
            .font(.system(size: 14, weight: .semibold))
            .foregroundStyle(AppColor.inkSoft)
          Text("\(DateUtils.format(confirmPickedMonth, "MMMM")) \(safeDay)")
            .font(AppFont.poppins(.medium, size: 15))
            .foregroundStyle(AppColor.ink)
          Spacer()
          Image(systemName: isOpen ? "chevron.up" : "chevron.down")
            .foregroundStyle(AppColor.muted)
        }
        .padding(14)
        .background(AppColor.fill)
        .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
      }

      if isOpen {
        VStack(spacing: 10) {
          HStack {
            Button {
              confirmPickedMonth = DateUtils.addMonths(confirmPickedMonth, -1)
              UISelectionFeedbackGenerator().selectionChanged()
            } label: {
              Image(systemName: "chevron.left")
                .font(.system(size: 13, weight: .semibold))
                .foregroundStyle(AppColor.ink)
                .frame(width: 32, height: 32)
                .background(AppColor.canvasElevated)
                .clipShape(Circle())
            }
            Spacer()
            Text(DateUtils.format(confirmPickedMonth, "MMMM"))
              .font(AppFont.poppins(.semibold, size: 15))
              .foregroundStyle(AppColor.ink)
            Spacer()
            Button {
              confirmPickedMonth = DateUtils.addMonths(confirmPickedMonth, 1)
              UISelectionFeedbackGenerator().selectionChanged()
            } label: {
              Image(systemName: "chevron.right")
                .font(.system(size: 13, weight: .semibold))
                .foregroundStyle(AppColor.ink)
                .frame(width: 32, height: 32)
                .background(AppColor.canvasElevated)
                .clipShape(Circle())
            }
          }

          HStack {
            ForEach(Array(dows.enumerated()), id: \.offset) { _, d in
              Text(d)
                .font(AppFont.poppins(.medium, size: 11))
                .foregroundStyle(AppColor.muted)
                .frame(maxWidth: .infinity)
            }
          }

          LazyVGrid(columns: Array(repeating: GridItem(.flexible(), spacing: 0), count: 7), spacing: 4) {
            ForEach(Array(grid.enumerated()), id: \.offset) { _, day in
              let inMonth = DateUtils.isSameMonth(day, confirmPickedMonth)
              let dayNum = DateUtils.calendar.component(.day, from: day)
              let selected = inMonth && dayNum == safeDay
              Button {
                guard inMonth else { return }
                confirmPickedDay = dayNum
                confirmTimeDropdown = nil
                UISelectionFeedbackGenerator().selectionChanged()
              } label: {
                Text("\(dayNum)")
                  .font(AppFont.poppins(selected ? .semibold : .regular, size: 14))
                  .foregroundStyle(
                    selected ? AppColor.white : (inMonth ? AppColor.ink : AppColor.muted.opacity(0.35))
                  )
                  .frame(maxWidth: .infinity)
                  .frame(height: 34)
                  .background(selected ? AppColor.accent : Color.clear)
                  .clipShape(Circle())
              }
              .disabled(!inMonth)
            }
          }
        }
        .padding(12)
        .background(AppColor.fill)
        .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
        .padding(.top, 8)
      }
    }
  }

  private func condensedRow(label: String, value: String) -> some View {
    VStack(alignment: .leading, spacing: 4) {
      Text(label)
        .font(AppFont.poppins(.medium, size: 11))
        .tracking(0.4)
        .textCase(.uppercase)
        .foregroundStyle(AppColor.muted)
      Text(value)
        .font(AppFont.poppins(.medium, size: 16))
        .foregroundStyle(AppColor.ink)
    }
    .frame(maxWidth: .infinity, alignment: .leading)
  }

  private func condensedParticipants(includePartner: Bool) -> some View {
    VStack(alignment: .leading, spacing: 8) {
      Text("Who")
        .font(AppFont.poppins(.medium, size: 11))
        .tracking(0.4)
        .textCase(.uppercase)
        .foregroundStyle(AppColor.muted)
      HStack(spacing: 8) {
        OwnerBadge(letter: store.couple.me.initial, tone: .me, meColor: store.meColor)
        if includePartner {
          OwnerBadge(letter: store.couple.partner.initial, tone: .partner)
        }
      }
    }
    .frame(maxWidth: .infinity, alignment: .leading)
  }

  @ViewBuilder
  private func timeOptions(
    selectedHour: Int,
    selectedMinute: Int,
    onPick: @escaping (Int, Int) -> Void
  ) -> some View {
    ForEach(0..<48, id: \.self) { index in
      let hour = index / 2
      let minute = index % 2 == 0 ? 0 : 30
      let label = DateUtils.format(DateUtils.atTime(store.today, hour: hour, minute: minute), "h:mm a")
      confirmDropdownItem(label, selected: hour == selectedHour && minute == selectedMinute) {
        onPick(hour, minute)
      }
      .id(timeId(hour, minute))
    }
  }

  private func timeId(_ hour: Int, _ minute: Int) -> String {
    "t-\(hour)-\(minute)"
  }

  private func fieldLabel(_ text: String) -> some View {
    Text(text)
      .font(AppFont.poppins(.medium, size: 11))
      .tracking(0.4)
      .textCase(.uppercase)
      .foregroundStyle(AppColor.muted)
      .padding(.bottom, 8)
  }

  private func slotCard(_ slot: FreeSlot) -> some View {
    HStack {
      VStack(alignment: .leading, spacing: 3) {
        Text(slot.dayLabel)
          .font(AppFont.poppins(.medium, size: 16))
          .foregroundStyle(AppColor.ink)
        Text(slot.timeLabel)
          .font(AppType.caption)
          .foregroundStyle(AppColor.muted)
      }
      Spacer()
      Text(DateUtils.slotDurationLabel(slot.durationMinutes))
        .font(AppType.caption)
        .foregroundStyle(AppColor.sharedDeep)
        .padding(.horizontal, 10)
        .padding(.vertical, 6)
        .background(AppColor.sharedSoft)
        .clipShape(Capsule())
    }
    .padding(16)
    .background(AppColor.canvasElevated)
    .overlay(
      RoundedRectangle(cornerRadius: 18, style: .continuous)
        .stroke(AppColor.hairline, lineWidth: 1)
    )
    .clipShape(RoundedRectangle(cornerRadius: 18, style: .continuous))
  }

  private func startListening() {
    listening = true
    UIImpactFeedbackGenerator(style: .medium).impactOccurred()
    withAnimation(.easeInOut(duration: 0.65).repeatForever(autoreverses: true)) { pulse = 1.12 }
    let phrase = VoiceParse.demoPhrases.randomElement()!
    DispatchQueue.main.asyncAfter(deadline: .now() + 1.4) {
      text = phrase
      listening = false
      pulse = 1
      UINotificationFeedbackGenerator().notificationOccurred(.success)
    }
  }

  private func goConfirm() {
    guard canContinue else { return }
    confirmTitle = defaultTitle
    if let slot = selectedSlot {
      seedConfirmTime(from: slot.start, end: slot.end)
    } else {
      let parsed = VoiceParse.parseNaturalEvent(
        text.trimmingCharacters(in: .whitespaces).isEmpty ? confirmTitle : text.trimmingCharacters(in: .whitespaces),
        anchor: store.today
      )
      confirmTitle = parsed.title
      includePartner = parsed.owner == .shared
      seedConfirmTime(from: parsed.start, end: parsed.end)
    }
    recurrence = .none
    confirmEditing = false
    confirmTimeDropdown = nil
    step = .confirm
    UISelectionFeedbackGenerator().selectionChanged()
  }

  private func seedConfirmTime(from start: Date, end: Date) {
    confirmPickedMonth = DateUtils.startOfMonth(start)
    confirmPickedDay = DateUtils.calendar.component(.day, from: start)
    confirmStartHour = DateUtils.calendar.component(.hour, from: start)
    confirmStartMinute = snapMinute(DateUtils.calendar.component(.minute, from: start))
    confirmEndHour = DateUtils.calendar.component(.hour, from: end)
    confirmEndMinute = snapMinute(DateUtils.calendar.component(.minute, from: end))
    if end <= start {
      let bumped = DateUtils.addMinutes(start, 30)
      confirmEndHour = DateUtils.calendar.component(.hour, from: bumped)
      confirmEndMinute = snapMinute(DateUtils.calendar.component(.minute, from: bumped))
    }
  }

  private func snapMinute(_ minute: Int) -> Int {
    minute < 30 ? 0 : 30
  }

  private func commitAndShowConfirmed() {
    let title = resolvedTitle
    guard !title.isEmpty else { return }
    let start = resolvedConfirmStart
    let end = resolvedConfirmEnd
    UINotificationFeedbackGenerator().notificationOccurred(.success)

    if selectedSlot != nil || includePartner {
      let slot = FreeSlot(
        id: "edited-\(start.timeIntervalSince1970)",
        start: start,
        end: end,
        dayLabel: DateUtils.format(start, "EEE d"),
        timeLabel: "\(DateUtils.format(start, "h:mm a")) – \(DateUtils.format(end, "h:mm a"))",
        durationMinutes: DateUtils.differenceInMinutes(end, start)
      )
      store.createFromSlot(slot, title: title, recurrence: recurrence, scope: planScope)
    } else {
      let parsed = VoiceParse.parseNaturalEvent(
        text.trimmingCharacters(in: .whitespaces).isEmpty ? title : text.trimmingCharacters(in: .whitespaces),
        anchor: store.today
      )
      if parsed.owner == .shared && includePartner {
        store.sendSharedRequest(title: title, start: start, end: end)
        store.addEvent(
          title: "\(title) (requested)",
          start: start,
          end: end,
          owner: .me,
          notes: "Waiting on \(store.couple.partner.shortName)",
          recurrence: recurrence
        )
      } else {
        store.addEvent(title: title, start: start, end: end, owner: .me, recurrence: recurrence)
      }
    }

    confirmedJumpDay = start
    confirmEditing = false
    confirmTimeDropdown = nil
    step = .celebrating
  }

  private func confirmDropdownField<Content: View>(
    label: String,
    value: String,
    isOpen: Bool,
    selectedScrollId: String? = nil,
    toggle: @escaping () -> Void,
    @ViewBuilder menu: () -> Content
  ) -> some View {
    let menuContent = menu()
    return VStack(alignment: .leading, spacing: 0) {
      Text(label)
        .font(AppFont.poppins(.medium, size: 11))
        .tracking(0.4)
        .textCase(.uppercase)
        .foregroundStyle(AppColor.muted)
        .padding(.bottom, 8)
      Button(action: toggle) {
        HStack {
          Text(value).font(AppFont.poppins(.medium, size: 15)).foregroundStyle(AppColor.ink)
          Spacer()
          Image(systemName: isOpen ? "chevron.up" : "chevron.down").foregroundStyle(AppColor.muted)
        }
        .padding(14)
        .background(AppColor.fill)
        .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
      }
      if isOpen {
        ScrollViewReader { proxy in
          ScrollView {
            VStack(spacing: 0) { menuContent }
          }
          .frame(height: 160)
          .background(AppColor.fill)
          .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
          .padding(.top, 8)
          .onAppear {
            guard let selectedScrollId else { return }
            DispatchQueue.main.async {
              proxy.scrollTo(selectedScrollId, anchor: .center)
            }
          }
        }
      }
    }
  }

  private func confirmDropdownItem(_ label: String, selected: Bool, action: @escaping () -> Void) -> some View {
    Button {
      action()
      UISelectionFeedbackGenerator().selectionChanged()
    } label: {
      Text(label)
        .font(AppFont.poppins(selected ? .medium : .regular, size: 15))
        .foregroundStyle(selected ? AppColor.ink : AppColor.inkSoft)
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(.horizontal, 14)
        .padding(.vertical, 12)
        .background(selected ? AppColor.accentSoft : Color.clear)
    }
  }
}

struct EditEventSheet: View {
  @EnvironmentObject private var store: CalendarStore
  let event: CalendarEvent
  @State private var title = ""
  @State private var recurrence: Recurrence = .none

  var body: some View {
    SheetChrome(title: "Edit event", subtitle: DateUtils.formatEventTime(event.start, event.end), onClose: { store.closeSheet() }) {
      Text("Title")
        .font(AppFont.poppins(.medium, size: 11))
        .tracking(0.4)
        .textCase(.uppercase)
        .foregroundStyle(AppColor.muted)
        .padding(.bottom, 8)
      TextField("Event title", text: $title)
        .font(AppType.body)
        .padding(14)
        .background(AppColor.fill)
        .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))

      RecurrenceDropdown(value: $recurrence)
        .padding(.top, 14)

      PrimaryButton(title: "Save changes", disabled: title.trimmingCharacters(in: .whitespaces).isEmpty) {
        store.updateEvent(id: event.id, title: title.trimmingCharacters(in: .whitespaces), recurrence: recurrence)
        UINotificationFeedbackGenerator().notificationOccurred(.success)
        store.closeSheet()
      }

      Button {
        store.deleteEvent(id: event.id)
        UINotificationFeedbackGenerator().notificationOccurred(.warning)
        store.closeSheet()
      } label: {
        Text("Delete event")
          .font(AppType.bodyMedium)
          .foregroundStyle(AppColor.danger)
          .frame(maxWidth: .infinity)
          .padding(.vertical, 16)
      }
    }
    .onAppear {
      title = event.title
      recurrence = event.recurrence ?? .none
    }
  }
}

struct FindTimeSheet: View {
  @EnvironmentObject private var store: CalendarStore
  @State private var includePartner = false

  private var planScope: FindTimeScope { includePartner ? .together : .solo }

  private var slots: [FreeSlot] {
    store.freeSlots(scope: planScope)
  }

  var body: some View {
    SheetChrome(title: "Find time", subtitle: planScope.subtitle(couple: store.couple), onClose: { store.closeSheet() }) {
      PlanParticipantsPicker(
        includePartner: $includePartner,
        meInitial: store.couple.me.initial,
        partnerInitial: store.couple.partner.initial,
        meColor: store.meColor,
        partnerLinked: store.partnerLinked
      )
      .padding(.bottom, 14)

      if slots.isEmpty {
        Text(includePartner
          ? "No mutual openings this week — try next week."
          : "No open windows this week — try next week.")
          .font(AppType.body)
          .foregroundStyle(AppColor.muted)
          .multilineTextAlignment(.center)
          .padding(.vertical, 24)
          .frame(maxWidth: .infinity)
      } else {
        VStack(spacing: 10) {
          ForEach(slots) { slot in
            Button {
              let title = includePartner ? "Time together" : "New plan"
              store.createFromSlot(slot, title: title, scope: planScope)
              store.closeSheet()
            } label: {
              HStack {
                VStack(alignment: .leading, spacing: 3) {
                  Text(slot.dayLabel).font(AppFont.poppins(.medium, size: 16)).foregroundStyle(AppColor.ink)
                  Text(slot.timeLabel).font(AppType.caption).foregroundStyle(AppColor.muted)
                }
                Spacer()
                Text(DateUtils.slotDurationLabel(slot.durationMinutes))
                  .font(AppType.caption)
                  .foregroundStyle(AppColor.sharedDeep)
                  .padding(.horizontal, 10)
                  .padding(.vertical, 6)
                  .background(AppColor.sharedSoft)
                  .clipShape(Capsule())
              }
              .padding(16)
              .background(AppColor.canvasElevated)
              .overlay(RoundedRectangle(cornerRadius: 18).stroke(AppColor.hairline))
              .clipShape(RoundedRectangle(cornerRadius: 18, style: .continuous))
            }
            .buttonStyle(ScaleButtonStyle())
          }
        }
      }
    }
  }
}

struct SearchSheet: View {
  @EnvironmentObject private var store: CalendarStore
  @State private var query = ""

  var body: some View {
    SheetChrome(title: "Search", subtitle: "Find plans and requests", onClose: { store.closeSheet() }) {
      HStack(spacing: 10) {
        Image(systemName: "magnifyingglass").foregroundStyle(AppColor.muted)
        TextField("Dinner, climbing, walk…", text: $query)
          .font(AppFont.poppins(.regular, size: 15))
      }
      .padding(14)
      .background(AppColor.fill)
      .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
      .padding(.bottom, 14)

      let q = query.trimmingCharacters(in: .whitespaces).lowercased()
      if q.isEmpty {
        Text("Start typing to search your week.")
          .font(AppType.body)
          .foregroundStyle(AppColor.muted)
          .frame(maxWidth: .infinity)
          .padding(.vertical, 24)
      } else {
        let events = store.events.filter {
          $0.title.lowercased().contains(q)
            || ($0.location ?? "").lowercased().contains(q)
            || ($0.notes ?? "").lowercased().contains(q)
        }
        let requests = store.requests.filter {
          $0.title.lowercased().contains(q)
            || ($0.location ?? "").lowercased().contains(q)
            || ($0.notes ?? "").lowercased().contains(q)
        }
        if events.isEmpty && requests.isEmpty {
          Text("No matches for “\(query.trimmingCharacters(in: .whitespaces))”.")
            .font(AppType.body)
            .foregroundStyle(AppColor.muted)
            .frame(maxWidth: .infinity)
            .padding(.vertical, 24)
        } else {
          ScrollView {
            VStack(spacing: 10) {
              ForEach(events) { event in
                Button {
                  store.closeSheet()
                  DispatchQueue.main.asyncAfter(deadline: .now() + 0.25) {
                    store.openDayDetail(event.start, selecting: .event(event))
                  }
                } label: {
                  requestCard(
                    title: event.title,
                    meta: "\(DateUtils.format(event.start, "EEE · MMM d · h:mm a")) · \(ownerLabel(event.owner))"
                  )
                }
              }
              ForEach(requests) { request in
                Button {
                  store.closeSheet()
                  DispatchQueue.main.asyncAfter(deadline: .now() + 0.25) {
                    store.openDayDetail(request.proposedStart, selecting: .request(request))
                  }
                } label: {
                  requestCard(
                    title: request.title,
                    meta: "\(DateUtils.format(request.proposedStart, "EEE · MMM d · h:mm a")) · RSVP"
                  )
                }
              }
            }
          }
          .frame(maxHeight: 360)
        }
      }
    }
  }

  private func ownerLabel(_ owner: EventOwner) -> String {
    switch owner {
    case .me: return store.couple.me.name
    case .partner: return store.couple.partner.name
    case .shared: return "Together"
    }
  }

  private func requestCard(title: String, meta: String) -> some View {
    HStack {
      VStack(alignment: .leading, spacing: 3) {
        Text(title).font(AppFont.poppins(.medium, size: 16)).foregroundStyle(AppColor.ink)
        Text(meta).font(AppType.caption).foregroundStyle(AppColor.muted)
      }
      Spacer()
      Text("›").font(.system(size: 24)).foregroundStyle(AppColor.muted)
    }
    .padding(16)
    .background(AppColor.canvasElevated)
    .overlay(RoundedRectangle(cornerRadius: 18).stroke(AppColor.hairline))
    .clipShape(RoundedRectangle(cornerRadius: 18, style: .continuous))
  }
}

struct RequestsSheet: View {
  @EnvironmentObject private var store: CalendarStore
  @State private var step: Step = .detail
  @State private var pickedMonth = DateUtils.startOfMonth(MockData.today)
  @State private var pickedDay = 15
  @State private var startHour = 19
  @State private var startMinute = 0
  @State private var endHour = 21
  @State private var endMinute = 0
  @State private var openDropdown: Dropdown?
  @State private var showDeclineConfirm = false

  enum Step { case detail, suggestTime }
  enum Dropdown { case date, startTime, endTime }

  private var detail: SharedRequest? {
    if case .requestDetail(let r) = store.sheet { return r }
    return nil
  }

  private var confirmDayDate: Date {
    let daysInMonth = DateUtils.daysInMonth(pickedMonth)
    let safeDay = min(pickedDay, daysInMonth)
    return DateUtils.calendar.date(bySetting: .day, value: safeDay, of: pickedMonth) ?? pickedMonth
  }

  private var suggestedStart: Date {
    DateUtils.atTime(confirmDayDate, hour: startHour, minute: startMinute)
  }

  private var suggestedEnd: Date {
    let end = DateUtils.atTime(confirmDayDate, hour: endHour, minute: endMinute)
    return end <= suggestedStart ? DateUtils.addMinutes(suggestedStart, 30) : end
  }

  var body: some View {
    Group {
      if let detail {
        if step == .suggestTime {
          suggestTimeView(detail)
        } else {
          detailView(detail)
        }
      } else {
        listView
      }
    }
    .onAppear {
      step = .detail
      openDropdown = nil
      showDeclineConfirm = false
      if case .requestDetail(let r) = store.sheet {
        seedTimes(from: r)
      }
    }
    .alert("Decline invite?", isPresented: $showDeclineConfirm) {
      Button("Cancel", role: .cancel) {}
      Button("Decline", role: .destructive) {
        if let detail {
          store.declineRequest(id: detail.id)
          store.closeSheet()
        }
      }
    } message: {
      Text("Are you sure you want to decline this invite?")
    }
  }

  private func seedTimes(from request: SharedRequest) {
    let start = request.suggestedStart ?? request.proposedStart
    let end = request.suggestedEnd ?? request.proposedEnd
    pickedMonth = DateUtils.startOfMonth(start)
    pickedDay = DateUtils.calendar.component(.day, from: start)
    startHour = DateUtils.calendar.component(.hour, from: start)
    let startMin = DateUtils.calendar.component(.minute, from: start)
    startMinute = startMin < 30 ? 0 : 30
    endHour = DateUtils.calendar.component(.hour, from: end)
    let endMin = DateUtils.calendar.component(.minute, from: end)
    endMinute = endMin < 30 ? 0 : 30
  }

  private var listView: some View {
    let pending = store.requests.filter {
      $0.from == .partner && ($0.status == .pending || $0.status == .suggested)
    }
    return SheetChrome(title: "Requests", subtitle: "Plans waiting for your reply", onClose: { store.closeSheet() }) {
      if pending.isEmpty {
        Text("Nothing needs a reply")
          .font(AppType.body)
          .foregroundStyle(AppColor.muted)
          .frame(maxWidth: .infinity)
          .padding(.vertical, 16)
      } else {
        VStack(spacing: 10) {
          ForEach(pending) { r in
            Button {
              store.openSheet(.requestDetail(r))
            } label: {
              HStack {
                VStack(alignment: .leading, spacing: 3) {
                  Text(r.title).font(AppFont.poppins(.medium, size: 16)).foregroundStyle(AppColor.ink)
                  Text("\(DateUtils.format(r.proposedStart, "EEE · h:mm a")) · From \(store.couple.partner.shortName)")
                    .font(AppType.caption)
                    .foregroundStyle(AppColor.muted)
                }
                Spacer()
                Text("›").font(.system(size: 24)).foregroundStyle(AppColor.muted)
              }
              .padding(16)
              .background(AppColor.canvasElevated)
              .overlay(RoundedRectangle(cornerRadius: 18).stroke(AppColor.hairline))
              .clipShape(RoundedRectangle(cornerRadius: 18, style: .continuous))
            }
            .buttonStyle(ScaleButtonStyle())
          }
        }
      }
    }
  }

  private func detailView(_ detail: SharedRequest) -> some View {
    let start = detail.suggestedStart ?? detail.proposedStart
    let end = detail.suggestedEnd ?? detail.proposedEnd
    let fromPartner = detail.from == .partner

    return SheetChrome(
      title: detail.title,
      subtitle: "From \(fromPartner ? store.couple.partner.name : "you")",
      onClose: { store.closeSheet() }
    ) {
      Text(DateUtils.format(start, "MMMM d"))
        .font(AppFont.poppins(.medium, size: 15))
        .foregroundStyle(AppColor.ink)
        .padding(.bottom, 4)
      Text(DateUtils.formatEventTime(start, end))
        .font(AppType.subtitle)
        .foregroundStyle(AppColor.inkSoft)
        .padding(.bottom, 8)

      if let location = detail.location {
        HStack(spacing: 6) {
          Image(systemName: "location")
          Text(location).font(AppType.bodyMedium)
        }
        .foregroundStyle(AppColor.ink)
        .padding(.bottom, 8)
      }

      if detail.status == .pending && fromPartner {
        VStack(spacing: 10) {
          PrimaryButton(title: "Accept") {
            store.acceptRequest(id: detail.id)
            store.closeSheet()
          }
          .padding(.top, 0)

          Button {
            seedTimes(from: detail)
            step = .suggestTime
            openDropdown = nil
            UISelectionFeedbackGenerator().selectionChanged()
          } label: {
            Text("Suggest time")
              .font(AppType.bodyMedium)
              .foregroundStyle(AppColor.ink)
              .frame(maxWidth: .infinity)
              .padding(.vertical, 16)
              .overlay(
                RoundedRectangle(cornerRadius: 18, style: .continuous)
                  .stroke(AppColor.ink, lineWidth: 1.5)
              )
          }

          Button {
            showDeclineConfirm = true
          } label: {
            Text("Decline")
              .font(AppType.bodyMedium)
              .foregroundStyle(AppColor.danger)
              .frame(maxWidth: .infinity)
              .padding(.vertical, 16)
          }
        }
        .padding(.top, 18)
      }

      if detail.status == .suggested && detail.from == .me {
        PrimaryButton(title: "Accept suggested time") {
          store.acceptRequest(id: detail.id)
          store.closeSheet()
        }
      }

      if detail.status == .pending && detail.from == .me {
        Button {
          store.declineRequest(id: detail.id)
          store.closeSheet()
        } label: {
          Text("Cancel invite")
            .font(AppType.bodyMedium)
            .foregroundStyle(AppColor.danger)
            .frame(maxWidth: .infinity)
            .padding(.vertical, 16)
        }
      }
    }
  }

  private func suggestTimeView(_ detail: SharedRequest) -> some View {
    SheetChrome(title: "Suggest a time", subtitle: "For “\(detail.title)”", onClose: { store.closeSheet() }) {
      suggestDateCalendarDropdown
        .padding(.bottom, 14)

      HStack(alignment: .top, spacing: 10) {
        suggestTimeDropdown(
          label: "Start",
          value: DateUtils.format(suggestedStart, "h:mm a"),
          isOpen: openDropdown == .startTime,
          selectedId: timeId(startHour, startMinute),
          toggle: { openDropdown = openDropdown == .startTime ? nil : .startTime }
        ) {
          timeMenu(selectedHour: startHour, selectedMinute: startMinute) { hour, minute in
            startHour = hour
            startMinute = minute
            openDropdown = nil
          }
        }

        suggestTimeDropdown(
          label: "End",
          value: DateUtils.format(suggestedEnd, "h:mm a"),
          isOpen: openDropdown == .endTime,
          selectedId: timeId(endHour, endMinute),
          toggle: { openDropdown = openDropdown == .endTime ? nil : .endTime }
        ) {
          timeMenu(selectedHour: endHour, selectedMinute: endMinute) { hour, minute in
            endHour = hour
            endMinute = minute
            openDropdown = nil
          }
        }
      }

      PrimaryButton(title: "Send suggestion") {
        store.suggestRequestTime(id: detail.id, start: suggestedStart, end: suggestedEnd)
        UINotificationFeedbackGenerator().notificationOccurred(.success)
        store.closeSheet()
      }

      Button {
        openDropdown = nil
        step = .detail
      } label: {
        Text("Back")
          .font(AppType.bodyMedium)
          .foregroundStyle(AppColor.muted)
          .frame(maxWidth: .infinity)
          .padding(.vertical, 12)
      }
      .padding(.top, 10)
    }
  }

  private var suggestDateCalendarDropdown: some View {
    let daysInMonth = DateUtils.daysInMonth(pickedMonth)
    let safeDay = min(pickedDay, daysInMonth)
    let isOpen = openDropdown == .date
    let dows = ["M", "T", "W", "T", "F", "S", "S"]
    let grid = DateUtils.getMonthGrid(pickedMonth)

    return VStack(alignment: .leading, spacing: 0) {
      Text("Date")
        .font(AppFont.poppins(.medium, size: 11))
        .tracking(0.4)
        .textCase(.uppercase)
        .foregroundStyle(AppColor.muted)
        .padding(.bottom, 8)

      Button {
        openDropdown = isOpen ? nil : .date
        UISelectionFeedbackGenerator().selectionChanged()
      } label: {
        HStack(spacing: 10) {
          Image(systemName: "calendar")
            .font(.system(size: 14, weight: .semibold))
            .foregroundStyle(AppColor.inkSoft)
          Text("\(DateUtils.format(pickedMonth, "MMMM")) \(safeDay)")
            .font(AppFont.poppins(.medium, size: 15))
            .foregroundStyle(AppColor.ink)
          Spacer()
          Image(systemName: isOpen ? "chevron.up" : "chevron.down")
            .foregroundStyle(AppColor.muted)
        }
        .padding(14)
        .background(AppColor.fill)
        .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
      }

      if isOpen {
        VStack(spacing: 10) {
          HStack {
            Button {
              pickedMonth = DateUtils.addMonths(pickedMonth, -1)
              UISelectionFeedbackGenerator().selectionChanged()
            } label: {
              Image(systemName: "chevron.left")
                .font(.system(size: 13, weight: .semibold))
                .foregroundStyle(AppColor.ink)
                .frame(width: 32, height: 32)
                .background(AppColor.canvasElevated)
                .clipShape(Circle())
            }
            Spacer()
            Text(DateUtils.format(pickedMonth, "MMMM"))
              .font(AppFont.poppins(.semibold, size: 15))
              .foregroundStyle(AppColor.ink)
            Spacer()
            Button {
              pickedMonth = DateUtils.addMonths(pickedMonth, 1)
              UISelectionFeedbackGenerator().selectionChanged()
            } label: {
              Image(systemName: "chevron.right")
                .font(.system(size: 13, weight: .semibold))
                .foregroundStyle(AppColor.ink)
                .frame(width: 32, height: 32)
                .background(AppColor.canvasElevated)
                .clipShape(Circle())
            }
          }

          HStack {
            ForEach(Array(dows.enumerated()), id: \.offset) { _, d in
              Text(d)
                .font(AppFont.poppins(.medium, size: 11))
                .foregroundStyle(AppColor.muted)
                .frame(maxWidth: .infinity)
            }
          }

          LazyVGrid(columns: Array(repeating: GridItem(.flexible(), spacing: 0), count: 7), spacing: 4) {
            ForEach(Array(grid.enumerated()), id: \.offset) { _, day in
              let inMonth = DateUtils.isSameMonth(day, pickedMonth)
              let dayNum = DateUtils.calendar.component(.day, from: day)
              let selected = inMonth && dayNum == safeDay
              Button {
                guard inMonth else { return }
                pickedDay = dayNum
                openDropdown = nil
                UISelectionFeedbackGenerator().selectionChanged()
              } label: {
                Text("\(dayNum)")
                  .font(AppFont.poppins(selected ? .semibold : .regular, size: 14))
                  .foregroundStyle(
                    selected ? AppColor.white : (inMonth ? AppColor.ink : AppColor.muted.opacity(0.35))
                  )
                  .frame(maxWidth: .infinity)
                  .frame(height: 34)
                  .background(selected ? AppColor.accent : Color.clear)
                  .clipShape(Circle())
              }
              .disabled(!inMonth)
            }
          }
        }
        .padding(12)
        .background(AppColor.fill)
        .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
        .padding(.top, 8)
      }
    }
  }

  private func suggestTimeDropdown<Content: View>(
    label: String,
    value: String,
    isOpen: Bool,
    selectedId: String,
    toggle: @escaping () -> Void,
    @ViewBuilder menu: () -> Content
  ) -> some View {
    let menuContent = menu()
    return VStack(alignment: .leading, spacing: 0) {
      Text(label)
        .font(AppFont.poppins(.medium, size: 11))
        .tracking(0.4)
        .textCase(.uppercase)
        .foregroundStyle(AppColor.muted)
        .padding(.bottom, 8)
      Button(action: toggle) {
        HStack {
          Text(value).font(AppFont.poppins(.medium, size: 15)).foregroundStyle(AppColor.ink)
          Spacer()
          Image(systemName: isOpen ? "chevron.up" : "chevron.down").foregroundStyle(AppColor.muted)
        }
        .padding(14)
        .background(AppColor.fill)
        .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
      }
      if isOpen {
        ScrollViewReader { proxy in
          ScrollView {
            VStack(spacing: 0) { menuContent }
          }
          .frame(height: 160)
          .background(AppColor.fill)
          .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
          .padding(.top, 8)
          .onAppear {
            DispatchQueue.main.async {
              proxy.scrollTo(selectedId, anchor: .center)
            }
          }
        }
      }
    }
  }

  @ViewBuilder
  private func timeMenu(
    selectedHour: Int,
    selectedMinute: Int,
    onPick: @escaping (Int, Int) -> Void
  ) -> some View {
    ForEach(0..<48, id: \.self) { index in
      let hour = index / 2
      let minute = index % 2 == 0 ? 0 : 30
      let label = DateUtils.format(DateUtils.atTime(store.today, hour: hour, minute: minute), "h:mm a")
      let selected = hour == selectedHour && minute == selectedMinute
      Button {
        onPick(hour, minute)
        UISelectionFeedbackGenerator().selectionChanged()
      } label: {
        Text(label)
          .font(AppFont.poppins(selected ? .medium : .regular, size: 15))
          .foregroundStyle(selected ? AppColor.ink : AppColor.inkSoft)
          .frame(maxWidth: .infinity, alignment: .leading)
          .padding(.horizontal, 14)
          .padding(.vertical, 12)
          .background(selected ? AppColor.accentSoft : Color.clear)
      }
      .id(timeId(hour, minute))
    }
  }

  private func timeId(_ hour: Int, _ minute: Int) -> String {
    "rt-\(hour)-\(minute)"
  }
}
