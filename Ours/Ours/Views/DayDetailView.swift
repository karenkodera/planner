import SwiftUI

private let hourHeight: CGFloat = 64
private let dayStart = 8
private let dayEnd = 22
private let workEndMe = 17
private let workEndPartner = 18
private let timelineHeight = CGFloat(dayEnd - dayStart) * hourHeight

enum TimelineSelection: Equatable {
  case event(CalendarEvent)
  case request(SharedRequest)
  case travel(TravelStay)
}

struct DayDetailView: View {
  @EnvironmentObject private var store: CalendarStore
  let initialDay: Date
  @Binding var isPresented: Bool
  var initialSelection: TimelineSelection? = nil
  @State private var anchorDay: Date
  @State private var pageIndex = 14
  @State private var selection: TimelineSelection?
  @State private var lastHeaderTap: Date?

  init(initialDay: Date, isPresented: Binding<Bool>, initialSelection: TimelineSelection? = nil) {
    self.initialDay = initialDay
    self._isPresented = isPresented
    self.initialSelection = initialSelection
    self._anchorDay = State(initialValue: initialDay)
  }

  private var days: [Date] {
    let start = DateUtils.addDays(anchorDay, -14)
    return (0..<29).map { DateUtils.addDays(start, $0) }
  }

  private var currentDay: Date {
    days.indices.contains(pageIndex) ? days[pageIndex] : anchorDay
  }

  var body: some View {
    VStack(spacing: 0) {
      HStack(alignment: .top, spacing: 12) {
        Button(action: onHeaderPress) {
          VStack(alignment: .leading, spacing: 6) {
            Text(
              DateUtils.format(currentDay, "EEEE")
                + (DateUtils.isSameDay(currentDay, store.today) ? " · Today" : "")
            )
            .font(AppFont.poppins(.medium, size: 14))
            .foregroundStyle(AppColor.muted)
            Text(DateUtils.format(currentDay, "MMMM d, yyyy"))
              .font(AppFont.poppins(.semibold, size: 20))
              .foregroundStyle(AppColor.ink)
          }
          .frame(maxWidth: .infinity, alignment: .leading)
        }
        .buttonStyle(.plain)

        Button { isPresented = false } label: {
          Image(systemName: "xmark")
            .font(.system(size: 13, weight: .semibold))
            .foregroundStyle(AppColor.inkSoft)
            .frame(width: 32, height: 32)
            .background(AppColor.fill)
            .clipShape(Circle())
        }
        .buttonStyle(ScaleButtonStyle(scaleTo: 0.92))
        .accessibilityLabel("Close")
      }
      .padding(.horizontal, 20)
      .padding(.bottom, 20)

      TabView(selection: $pageIndex) {
        ForEach(Array(days.enumerated()), id: \.offset) { idx, day in
          DayTimelinePage(
            day: day,
            events: store.events,
            requests: store.requests,
            travels: store.travels,
            coupleNames: (store.couple.me.shortName, store.couple.partner.shortName),
            selection: selection,
            isActive: idx == pageIndex,
            onSelect: { selection = $0 }
          )
          .tag(idx)
        }
      }
      .tabViewStyle(.page(indexDisplayMode: .never))
      .onChange(of: pageIndex) { _, newValue in
        if days.indices.contains(newValue) {
          store.selectedDay = days[newValue]
          selection = nil
          UISelectionFeedbackGenerator().selectionChanged()
        }
      }

      if let selection {
        EventInfoPanel(
          selection: selection,
          onClose: { self.selection = nil },
          onOpenRequest: { store.openSheet(.requestDetail($0)) },
          onCancelInvite: {
            store.declineRequest(id: $0.id)
            self.selection = nil
            UINotificationFeedbackGenerator().notificationOccurred(.success)
          },
          onEditEvent: { event in
            self.selection = nil
            isPresented = false
            DispatchQueue.main.asyncAfter(deadline: .now() + 0.28) {
              store.openSheet(.edit(event))
            }
          }
        )
        .padding(.horizontal, 16)
        .padding(.bottom, 8)
      }
    }
    .background(AppColor.white)
    .onAppear {
      anchorDay = initialDay
      pageIndex = 14
      selection = initialSelection
    }
  }

  private func onHeaderPress() {
    let now = Date()
    if let last = lastHeaderTap, now.timeIntervalSince(last) < 0.32 {
      anchorDay = store.today
      store.jumpToDay(store.today)
      pageIndex = 14
      selection = nil
      UINotificationFeedbackGenerator().notificationOccurred(.success)
      lastHeaderTap = nil
      return
    }
    lastHeaderTap = now
  }
}

struct DayTimelinePage: View {
  let day: Date
  let events: [CalendarEvent]
  let requests: [SharedRequest]
  let travels: [TravelStay]
  let coupleNames: (String, String)
  let selection: TimelineSelection?
  let isActive: Bool
  let onSelect: (TimelineSelection) -> Void

  private var dayEvents: [CalendarEvent] {
    events.compactMap { RecurrenceUtils.occurrenceOnDay($0, day: day) }
  }

  private var mine: [CalendarEvent] { dayEvents.filter { $0.owner == .me } }
  private var partner: [CalendarEvent] { dayEvents.filter { $0.owner == .partner } }
  private var shared: [CalendarEvent] { dayEvents.filter { $0.owner == .shared } }

  private var dayRequests: [SharedRequest] {
    let myBusy = dayEvents.filter { $0.owner == .me || $0.owner == .shared }
    return requests.filter { r in
      guard r.status == .pending || r.status == .suggested else { return false }
      guard DateUtils.isSameDay(r.proposedStart, day) else { return false }
      return !myBusy.contains { DateUtils.overlaps($0.start, $0.end, r.proposedStart, r.proposedEnd) }
    }
  }

  private var dayTravels: [TravelStay] {
    travels.filter { DateUtils.travelTouchesDay(travelStart: $0.start, travelEnd: $0.end, day: day) }
  }

  private var selectedId: String? {
    switch selection {
    case .event(let e): return e.id
    case .request(let r): return r.id
    case .travel(let t): return t.id
    case nil: return nil
    }
  }

  var body: some View {
    VStack(alignment: .leading, spacing: 0) {
      if !dayTravels.isEmpty {
        VStack(spacing: 6) {
          ForEach(dayTravels) { travel in
            Button {
              onSelect(.travel(travel))
              UISelectionFeedbackGenerator().selectionChanged()
            } label: {
              HStack(spacing: 8) {
                Image(systemName: "airplane")
                  .foregroundStyle(AppColor.inkSoft)
                Text("\(travel.person == .me ? coupleNames.0 : coupleNames.1) in \(travel.place)")
                  .font(AppFont.poppins(.medium, size: 14))
                  .foregroundStyle(AppColor.inkSoft)
              }
              .padding(.horizontal, 12)
              .padding(.vertical, 10)
              .frame(maxWidth: .infinity, alignment: .leading)
              .background(selectedId == travel.id ? AppColor.fillStrong : AppColor.fill)
              .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
            }
            .buttonStyle(.plain)
          }
        }
        .padding(.bottom, 18)
      }

      HStack(spacing: 10) {
        Text(coupleNames.0)
          .font(AppFont.poppins(.medium, size: 12))
          .tracking(0.4)
          .textCase(.uppercase)
          .foregroundStyle(AppColor.inkSoft)
          .frame(maxWidth: .infinity, alignment: .leading)
        Text(coupleNames.1)
          .font(AppFont.poppins(.medium, size: 12))
          .tracking(0.4)
          .textCase(.uppercase)
          .foregroundStyle(AppColor.inkSoft)
          .frame(maxWidth: .infinity, alignment: .leading)
      }
      .padding(.leading, 48)
      .padding(.bottom, 12)

      ScrollViewReader { proxy in
        ScrollView(showsIndicators: false) {
          ZStack(alignment: .topLeading) {
            ForEach(dayStart...dayEnd, id: \.self) { hour in
              HStack(alignment: .top, spacing: 0) {
                Text(DateUtils.format(DateUtils.atTime(day, hour: hour), "h a"))
                  .font(AppFont.poppins(.regular, size: 11))
                  .foregroundStyle(AppColor.muted)
                  .frame(width: 44, alignment: .trailing)
                  .padding(.trailing, 8)
                  .offset(y: -7)
                Rectangle()
                  .fill(AppColor.hairline)
                  .frame(height: 0.5)
              }
              .offset(y: 10 + CGFloat(hour - dayStart) * hourHeight)
            }

            HStack(alignment: .top, spacing: 10) {
              lane(events: mine, workEnd: workEndMe)
              lane(events: partner, workEnd: workEndPartner)
            }
            .padding(.leading, 48)
            .padding(.top, 10)
            .frame(height: timelineHeight)

            ForEach(shared) { event in
              eventBlock(event, lane: .shared, spanning: true)
                .padding(.leading, 48)
                .padding(.top, 10)
            }
            ForEach(dayRequests) { request in
              requestBlock(request)
                .padding(.leading, 48)
                .padding(.top, 10)
            }
          }
          .frame(height: timelineHeight + 34)
          .padding(.bottom, 40)
          .id("bottom")
        }
        .onAppear {
          if isActive && DateUtils.isWeekday(day) {
            DispatchQueue.main.asyncAfter(deadline: .now() + 0.05) {
              proxy.scrollTo("bottom", anchor: .bottom)
            }
          }
        }
      }
    }
    .padding(.horizontal, 16)
  }

  private func lane(events: [CalendarEvent], workEnd: Int) -> some View {
    ZStack(alignment: .top) {
      if DateUtils.isWeekday(day) {
        RoundedRectangle(cornerRadius: 12, style: .continuous)
          .stroke(Color(red: 120 / 255, green: 120 / 255, blue: 128 / 255, opacity: 0.12), style: StrokeStyle(lineWidth: 1, dash: [4, 3]))
          .background(
            RoundedRectangle(cornerRadius: 12, style: .continuous)
              .fill(Color(red: 120 / 255, green: 120 / 255, blue: 128 / 255, opacity: 0.08))
          )
          .overlay(
            Text("Work")
              .font(AppFont.poppins(.regular, size: 12))
              .italic()
              .foregroundStyle(AppColor.muted)
          )
          .frame(height: CGFloat(workEnd - dayStart) * hourHeight)
          .opacity(0.7)
          .allowsHitTesting(false)
      }
      ForEach(events) { event in
        eventBlock(event, lane: .solo, spanning: false)
      }
    }
    .frame(maxWidth: .infinity, alignment: .top)
  }

  private enum LaneStyle { case solo, shared }

  private func eventBlock(_ event: CalendarEvent, lane: LaneStyle, spanning: Bool) -> some View {
    let top = max(0, minutesFromStart(event.start)) * (hourHeight / 60)
    let duration = max(30, event.end.timeIntervalSince(event.start) / 60)
    let height = CGFloat(duration) * (hourHeight / 60)

    return Button {
      onSelect(.event(event))
      UISelectionFeedbackGenerator().selectionChanged()
    } label: {
      VStack(alignment: .leading, spacing: 2) {
        Text(event.title)
          .font(AppFont.poppins(.medium, size: 13))
          .foregroundStyle(AppColor.ink)
          .lineLimit(2)
        Text(DateUtils.format(event.start, "h:mm a"))
          .font(AppFont.poppins(.regular, size: 11))
          .foregroundStyle(lane == .shared ? AppColor.inkSoft : AppColor.muted)
      }
      .padding(.horizontal, 10)
      .padding(.vertical, 8)
      .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
      .background(lane == .shared ? AppColor.sharedSoft : AppColor.fillStrong)
      .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
      .scaleEffect(selectedId == event.id ? 1.01 : 1)
    }
    .buttonStyle(.plain)
    .frame(height: height)
    .offset(y: top)
    .frame(maxWidth: spanning ? .infinity : nil, alignment: .top)
  }

  private func requestBlock(_ request: SharedRequest) -> some View {
    let top = max(0, minutesFromStart(request.proposedStart)) * (hourHeight / 60)
    let duration = max(30, request.proposedEnd.timeIntervalSince(request.proposedStart) / 60)
    let height = CGFloat(duration) * (hourHeight / 60)
    let outgoing = request.from == .me

    return Button {
      onSelect(.request(request))
      UISelectionFeedbackGenerator().selectionChanged()
    } label: {
      VStack(alignment: .leading, spacing: 2) {
        Text(request.title)
          .font(AppFont.poppins(.medium, size: 13))
          .foregroundStyle(AppColor.ink)
          .lineLimit(2)
        Text("\(DateUtils.format(request.proposedStart, "h:mm a"))\(outgoing ? " · awaiting reply" : " · RSVP")")
          .font(AppFont.poppins(.regular, size: 11))
          .foregroundStyle(AppColor.inkSoft)
      }
      .padding(.horizontal, 10)
      .padding(.vertical, 8)
      .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
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
    .frame(height: height)
    .offset(y: top)
  }

  private func minutesFromStart(_ date: Date) -> CGFloat {
    CGFloat(DateUtils.calendar.component(.hour, from: date) * 60
      + DateUtils.calendar.component(.minute, from: date)
      - dayStart * 60)
  }
}

struct EventInfoPanel: View {
  @EnvironmentObject private var store: CalendarStore
  let selection: TimelineSelection
  let onClose: () -> Void
  let onOpenRequest: (SharedRequest) -> Void
  let onCancelInvite: (SharedRequest) -> Void
  let onEditEvent: (CalendarEvent) -> Void

  var body: some View {
    VStack(alignment: .leading, spacing: 0) {
      HStack {
        Text(eyebrow)
          .font(AppFont.poppins(.medium, size: 11))
          .tracking(0.4)
          .textCase(.uppercase)
          .foregroundStyle(AppColor.muted)
        Spacer()
        Button(action: onClose) {
          Image(systemName: "xmark")
            .font(.system(size: 14, weight: .medium))
            .foregroundStyle(AppColor.muted)
        }
      }
      .padding(.bottom, 6)

      Text(title)
        .font(AppFont.poppins(.semibold, size: 18))
        .foregroundStyle(AppColor.ink)

      Text(meta)
        .font(AppFont.poppins(.regular, size: 14))
        .foregroundStyle(AppColor.inkSoft)
        .padding(.top, 4)

      if let location {
        HStack(spacing: 5) {
          Image(systemName: "location")
            .font(.system(size: 12))
          Text(location)
            .font(AppFont.poppins(.medium, size: 14))
        }
        .foregroundStyle(AppColor.ink)
        .padding(.top, 4)
      }

      if let notes {
        Text(notes)
          .font(AppFont.poppins(.regular, size: 14))
          .foregroundStyle(AppColor.muted)
          .padding(.top, 8)
      }

      actionButtons
    }
    .padding(16)
    .background(AppColor.mist)
    .overlay(
      RoundedRectangle(cornerRadius: 18, style: .continuous)
        .stroke(AppColor.hairline, lineWidth: 1)
    )
    .clipShape(RoundedRectangle(cornerRadius: 18, style: .continuous))
  }

  private var eyebrow: String {
    switch selection {
    case .travel: return "Travel"
    case .request(let r): return r.from == .me ? "Awaiting reply" : "RSVP"
    case .event(let e):
      switch e.owner {
      case .me: return store.couple.me.name
      case .partner: return store.couple.partner.name
      case .shared: return "Together"
      }
    }
  }

  private var title: String {
    switch selection {
    case .travel(let t):
      let who = t.person == .me ? store.couple.me.name : store.couple.partner.name
      return "\(who) in \(t.place)"
    case .request(let r): return r.title
    case .event(let e): return e.title
    }
  }

  private var meta: String {
    switch selection {
    case .travel(let t):
      let sameMonth = DateUtils.calendar.component(.month, from: t.start)
        == DateUtils.calendar.component(.month, from: t.end)
      if sameMonth {
        return "\(DateUtils.format(t.start, "EEE, MMM d")) – \(DateUtils.format(t.end, "EEE, d"))"
      }
      return "\(DateUtils.format(t.start, "EEE, MMM d")) – \(DateUtils.format(t.end, "EEE, MMM d"))"
    case .request(let r):
      return DateUtils.formatEventTime(r.proposedStart, r.proposedEnd)
    case .event(let e):
      return DateUtils.formatEventTime(e.start, e.end)
    }
  }

  private var location: String? {
    switch selection {
    case .travel(let t): return t.place
    case .request(let r): return r.location
    case .event(let e): return e.location
    }
  }

  private var notes: String? {
    switch selection {
    case .request(let r): return r.notes
    case .event(let e): return e.notes
    case .travel: return nil
    }
  }

  @ViewBuilder
  private var actionButtons: some View {
    switch selection {
    case .request(let request):
      Button {
        onOpenRequest(request)
      } label: {
        Text(request.from == .me ? "View invite" : "RSVP")
          .font(AppFont.poppins(.medium, size: 14))
          .foregroundStyle(AppColor.white)
          .frame(maxWidth: .infinity)
          .padding(.vertical, 12)
          .background(AppColor.ink)
          .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
      }
      .padding(.top, 14)
      if request.from == .me {
        Button { onCancelInvite(request) } label: {
          Text("Cancel invite")
            .font(AppFont.poppins(.medium, size: 14))
            .foregroundStyle(AppColor.danger)
            .frame(maxWidth: .infinity)
            .padding(.vertical, 12)
        }
        .padding(.top, 6)
      }
    case .event(let event):
      if event.owner == .me || event.owner == .shared {
        Button { onEditEvent(event) } label: {
          Text("Edit event")
            .font(AppFont.poppins(.medium, size: 14))
            .foregroundStyle(AppColor.white)
            .frame(maxWidth: .infinity)
            .padding(.vertical, 12)
            .background(AppColor.ink)
            .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
        }
        .padding(.top, 14)
      }
    case .travel:
      EmptyView()
    }
  }
}
