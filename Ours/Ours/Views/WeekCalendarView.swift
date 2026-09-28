import SwiftUI

struct WeekDayCardsView: View {
  @EnvironmentObject private var store: CalendarStore
  @State private var dayDetailOpen = false
  @State private var detailDay = MockData.today
  @State private var detailSelection: TimelineSelection?

  private let weekPageCount = 41
  private let weekCenter = 20

  private var weekPages: [Date] {
    let origin = DateUtils.startOfWeek(store.today)
    return (0..<weekPageCount).map { DateUtils.addDays(origin, ($0 - weekCenter) * 7) }
  }

  private var anchorIndex: Int {
    let weekStart = DateUtils.startOfWeek(store.weekAnchor)
    return weekPages.firstIndex { DateUtils.isSameDay($0, weekStart) } ?? weekCenter
  }

  var body: some View {
    TabView(selection: Binding(
      get: { anchorIndex },
      set: { newIdx in
        guard weekPages.indices.contains(newIdx) else { return }
        store.jumpToDay(weekPages[newIdx])
        UISelectionFeedbackGenerator().selectionChanged()
      }
    )) {
      ForEach(Array(weekPages.enumerated()), id: \.offset) { pageIdx, weekStartDay in
        let days = DateUtils.getWeekDays(weekStartDay)
        ScrollView(showsIndicators: false) {
          LazyVStack(spacing: 10) {
            ForEach(Array(days.enumerated()), id: \.offset) { index, day in
              DayCardView(
                day: day,
                items: store.itemsForDay(day),
                isToday: DateUtils.isSameDay(day, store.today),
                index: pageIdx == anchorIndex ? index : 0,
                meInitial: store.couple.me.initial,
                partnerInitial: store.couple.partner.initial,
                travels: store.travels.filter { DateUtils.travelTouchesDay(travelStart: $0.start, travelEnd: $0.end, day: day) },
                meColor: store.meColor,
                onPress: {
                  detailDay = day
                  store.selectedDay = day
                  dayDetailOpen = true
                },
                onRequestPress: { store.openSheet(.requestDetail($0)) }
              )
            }
          }
          .padding(.horizontal, 20)
          .padding(.bottom, 28)
          .padding(.top, 2)
        }
        .tag(pageIdx)
      }
    }
    .tabViewStyle(.page(indexDisplayMode: .never))
    .sheet(isPresented: $dayDetailOpen) {
      DayDetailView(
        initialDay: detailDay,
        isPresented: $dayDetailOpen,
        initialSelection: detailSelection
      )
        .environmentObject(store)
        .oursSheetTopInset()
        .presentationDragIndicator(.hidden)
        .presentationBackground(AppColor.white)
    }
    .onChange(of: store.dayDetailDay) { _, day in
      guard let day else { return }
      detailDay = day
      detailSelection = store.dayDetailSelection
      store.dayDetailSelection = nil
      dayDetailOpen = true
      store.dayDetailDay = nil
    }
    .onChange(of: dayDetailOpen) { _, open in
      if !open { detailSelection = nil }
    }
  }
}

struct DayCardView: View {
  let day: Date
  let items: [DayItem]
  let isToday: Bool
  let index: Int
  let meInitial: String
  let partnerInitial: String
  let travels: [TravelStay]
  let meColor: Color
  let onPress: () -> Void
  let onRequestPress: (SharedRequest) -> Void

  @State private var appeared = false

  var body: some View {
    Button(action: onPress) {
      HStack(alignment: .center, spacing: 0) {
        dateColumn
          .frame(width: 64, alignment: .leading)

        Rectangle()
          .fill(Color(red: 60 / 255, green: 60 / 255, blue: 67 / 255, opacity: 0.28))
          .frame(width: 0.5)
          .padding(.horizontal, 12)

        VStack(alignment: .leading, spacing: 8) {
          if items.isEmpty && travels.isEmpty {
            Text("Free evening")
              .font(AppFont.poppins(.regular, size: 13))
              .italic()
              .foregroundStyle(AppColor.emptyPlans)
          }

          ForEach(items) { item in
            switch item {
            case .event(let event):
              eventRow(event)
            case .request(let request):
              requestRow(request)
            }
          }

          ForEach(travels) { travel in
            HStack(spacing: 8) {
              OwnerBadge(
                letter: travel.person == .me ? meInitial : partnerInitial,
                tone: travel.person == .me ? .me : .partner,
                meColor: meColor
              )
              Text("in \(travel.place)")
                .font(AppFont.poppins(.regular, size: 13))
                .foregroundStyle(AppColor.inkSoft)
            }
          }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
      }
      .padding(.vertical, 14)
      .padding(.horizontal, 14)
      .frame(maxWidth: .infinity, minHeight: 88, alignment: .center)
      .background(AppColor.canvasElevated)
      .overlay(
        RoundedRectangle(cornerRadius: 18, style: .continuous)
          .stroke(isToday ? AppColor.ink : Color.clear, lineWidth: 1.5)
      )
      .clipShape(RoundedRectangle(cornerRadius: 18, style: .continuous))
    }
    .buttonStyle(ScaleButtonStyle(scaleTo: 0.985))
    .opacity(appeared ? 1 : 0)
    .offset(y: appeared ? 0 : 10)
    .onAppear {
      withAnimation(.easeOut(duration: 0.32).delay(Double(index) * 0.045)) {
        appeared = true
      }
    }
  }

  @ViewBuilder
  private var dateColumn: some View {
    if isToday {
      Text("Today")
        .font(AppFont.poppins(.semibold, size: 16))
        .foregroundStyle(AppColor.ink)
    } else {
      VStack(alignment: .leading, spacing: 2) {
        Text(DateUtils.format(day, "EEE").uppercased())
          .font(AppFont.poppins(.medium, size: 11))
          .tracking(0.4)
          .foregroundStyle(AppColor.muted)
        Text(DateUtils.format(day, "MMM d"))
          .font(AppFont.poppins(.semibold, size: 16))
          .foregroundStyle(AppColor.muted)
      }
    }
  }

  private func eventRow(_ event: CalendarEvent) -> some View {
    let isShared = event.owner == .shared
    let isMine = event.owner == .me
    return HStack(spacing: 10) {
      VStack(alignment: .leading, spacing: 2) {
        Text(DateUtils.format(event.start, "h:mm a"))
          .font(AppFont.poppins(.medium, size: 11))
          .foregroundStyle(AppColor.muted)
        Text(event.title)
          .font(AppFont.poppins(isShared ? .medium : .regular, size: 13))
          .foregroundStyle(AppColor.ink)
          .lineLimit(2)
      }
      .frame(maxWidth: .infinity, alignment: .leading)

      OwnerBadgesView(
        owner: event.owner,
        meInitial: meInitial,
        partnerInitial: partnerInitial,
        meColor: meColor
      )
    }
    .padding(.horizontal, isShared || isMine ? 10 : 0)
    .padding(.vertical, isShared || isMine ? 8 : 0)
    .background(
      Group {
        if isShared {
          AppColor.sharedSoft
        } else if isMine {
          meColor.opacity(0.1)
        } else {
          Color.clear
        }
      }
    )
    .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
  }

  private func requestRow(_ request: SharedRequest) -> some View {
    let outgoing = request.from == .me
    return Button {
      onRequestPress(request)
    } label: {
      HStack(spacing: 10) {
        VStack(alignment: .leading, spacing: 2) {
          Text(DateUtils.format(request.proposedStart, "h:mm a"))
            .font(AppFont.poppins(.medium, size: 11))
            .foregroundStyle(AppColor.muted)
          Text(request.title)
            .font(AppFont.poppins(.medium, size: 13))
            .foregroundStyle(AppColor.inkSoft)
            .lineLimit(2)
        }
        .frame(maxWidth: .infinity, alignment: .leading)

        VStack(alignment: .trailing, spacing: 6) {
          Text(outgoing ? "Awaiting reply" : "RSVP")
            .font(AppFont.poppins(.medium, size: 10))
            .foregroundStyle(outgoing ? AppColor.muted : AppColor.shared)
          LinkedOwnerBadges(meInitial: meInitial, partnerInitial: partnerInitial)
        }
      }
      .padding(.horizontal, 10)
      .padding(.vertical, 8)
      .background(outgoing ? Color.clear : AppColor.sharedSoft)
      .overlay(
        RoundedRectangle(cornerRadius: 12, style: .continuous)
          .stroke(
            outgoing ? Color(red: 60 / 255, green: 60 / 255, blue: 67 / 255, opacity: 0.35) : AppColor.shared,
            style: StrokeStyle(lineWidth: 1.5, dash: [5, 4])
          )
      )
    }
    .buttonStyle(.plain)
  }
}

struct MonthViewSheet: View {
  @EnvironmentObject private var store: CalendarStore
  @Binding var isPresented: Bool
  @State private var monthAnchor: Date = MockData.today
  @State private var lastTitleTap: Date?

  private let dows = ["M", "T", "W", "T", "F", "S", "S"]

  var body: some View {
    VStack(spacing: 0) {
      HStack {
        monthNavButton(systemName: "chevron.left") {
          monthAnchor = DateUtils.addMonths(monthAnchor, -1)
        }
        Spacer()
        Button(action: onTitlePress) {
          Text(DateUtils.format(monthAnchor, "MMMM yyyy"))
            .font(AppFont.poppins(.semibold, size: 20))
            .foregroundStyle(AppColor.ink)
            .lineLimit(1)
            .minimumScaleFactor(0.85)
        }
        Spacer()
        monthNavButton(systemName: "chevron.right") {
          monthAnchor = DateUtils.addMonths(monthAnchor, 1)
        }
      }
      .padding(.horizontal, 20)
      .padding(.top, 14)
      .padding(.bottom, 18)

      HStack {
        ForEach(Array(dows.enumerated()), id: \.offset) { _, d in
          Text(d)
            .font(AppFont.poppins(.medium, size: 11))
            .foregroundStyle(AppColor.muted)
            .frame(maxWidth: .infinity)
        }
      }
      .padding(.horizontal, 16)
      .padding(.bottom, 10)

      let grid = DateUtils.getMonthGrid(monthAnchor)
      LazyVGrid(columns: Array(repeating: GridItem(.flexible(), spacing: 4), count: 7), spacing: 8) {
        ForEach(Array(grid.enumerated()), id: \.offset) { _, day in
          monthCell(day)
        }
      }
      .padding(.horizontal, 12)
      .padding(.bottom, 16)
    }
    .frame(maxWidth: .infinity, alignment: .top)
    .background(AppColor.white)
    .onAppear { monthAnchor = store.weekAnchor }
  }

  private func monthNavButton(systemName: String, action: @escaping () -> Void) -> some View {
    Button {
      UISelectionFeedbackGenerator().selectionChanged()
      action()
    } label: {
      Image(systemName: systemName)
        .font(.system(size: 16, weight: .semibold))
        .foregroundStyle(AppColor.ink)
        .frame(width: 36, height: 36)
        .background(AppColor.fill)
        .clipShape(Circle())
    }
    .buttonStyle(ScaleButtonStyle(scaleTo: 0.9))
  }

  private func onTitlePress() {
    let now = Date()
    if let last = lastTitleTap, now.timeIntervalSince(last) < 0.32 {
      monthAnchor = store.today
      store.jumpToDay(store.today)
      UINotificationFeedbackGenerator().notificationOccurred(.success)
      lastTitleTap = nil
      return
    }
    lastTitleTap = now
  }

  private func monthCell(_ day: Date) -> some View {
    let inMonth = DateUtils.isSameMonth(day, monthAnchor)
    let isToday = DateUtils.isSameDay(day, store.today)
    let isSelected = DateUtils.isSameDay(day, store.selectedDay) && !isToday
    let dayEvents = store.events.compactMap { RecurrenceUtils.occurrenceOnDay($0, day: day) }
    let hasShared = dayEvents.contains { $0.owner == .shared }
    let hasMine = dayEvents.contains { $0.owner == .me }
    let hasPartner = dayEvents.contains { $0.owner == .partner }

    return Button {
      store.jumpToDay(day)
      UISelectionFeedbackGenerator().selectionChanged()
      isPresented = false
    } label: {
      VStack(spacing: 4) {
        Text(DateUtils.format(day, "d"))
          .font(AppFont.poppins(.medium, size: 15))
          .foregroundStyle(
            isToday ? AppColor.white : (inMonth ? AppColor.ink : AppColor.muted)
          )
          .frame(height: 22)

        HStack(spacing: 3) {
          if hasShared {
            LinkedMonthMarks(
              meInitial: store.couple.me.initial,
              partnerInitial: store.couple.partner.initial,
              selected: isToday
            )
          } else {
            if hasMine {
              MiniInitial(
                letter: store.couple.me.initial,
                tone: .me,
                selected: isToday,
                meColor: store.meColor
              )
            }
            if hasPartner {
              MiniInitial(
                letter: store.couple.partner.initial,
                tone: .partner,
                selected: isToday
              )
            }
          }
        }
        .frame(height: 16)
      }
      .frame(maxWidth: .infinity)
      .frame(height: 58)
      .padding(.vertical, 4)
      .background(
        isToday
          ? AppColor.ink
          : (isSelected ? AppColor.accentSoft : Color.clear)
      )
      .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
      .opacity(inMonth ? 1 : 0.35)
    }
    .buttonStyle(.plain)
  }
}
