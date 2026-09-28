import Foundation
import SwiftUI

@MainActor
final class CalendarStore: ObservableObject {
  let today = MockData.today

  @Published var couple = MockData.couple
  @Published var weekAnchor: Date
  @Published var selectedDay: Date
  @Published var events: [CalendarEvent]
  @Published var requests: [SharedRequest]
  @Published var travels: [TravelStay]
  @Published var sheet: SheetRoute = .none
  @Published var meColor: Color = AppColor.me
  @Published var partnerLinked = true
  @Published var dayDetailDay: Date?
  @Published var dayDetailSelection: TimelineSelection?
  /// How the current user signed in — drives Account row label in settings.
  @Published var meLoginMethod: LoginMethod = .email

  enum LoginMethod {
    case phone
    case email
    case google
  }

  init() {
    weekAnchor = MockData.today
    selectedDay = MockData.today
    events = MockData.events
    requests = MockData.requests
    travels = MockData.travels
  }

  func updateMeProfile(name: String, contact: String, method: LoginMethod) {
    let trimmed = name.trimmingCharacters(in: .whitespacesAndNewlines)
    guard !trimmed.isEmpty else { return }
    let short = trimmed.split(separator: " ").first.map(String.init) ?? trimmed
    let initial = String(trimmed.prefix(1)).uppercased()
    couple.me.name = trimmed
    couple.me.shortName = short
    couple.me.initial = initial
    meLoginMethod = method
    let trimmedContact = contact.trimmingCharacters(in: .whitespacesAndNewlines)
    if !trimmedContact.isEmpty {
      couple.me.email = trimmedContact
    } else if method == .google {
      couple.me.email = "Signed in with Google"
    }
  }

  var pendingCount: Int {
    requests.filter { $0.status == .pending && $0.from == .partner }.count
  }

  var freeSlots: [FreeSlot] {
    freeSlots(scope: .together)
  }

  func freeSlots(scope: FindTimeScope) -> [FreeSlot] {
    FindTime.findFreeSlots(events: events, weekAnchor: weekAnchor, scope: scope)
  }

  func goWeek(_ delta: Int) {
    let next = DateUtils.addDays(weekAnchor, delta * 7)
    weekAnchor = next
    selectedDay = next
  }

  func jumpToDay(_ day: Date) {
    weekAnchor = day
    selectedDay = day
  }

  func openSheet(_ route: SheetRoute) { sheet = route }
  func closeSheet() { sheet = .none }

  func openDayDetail(_ day: Date, selecting selection: TimelineSelection? = nil) {
    jumpToDay(day)
    dayDetailSelection = selection
    dayDetailDay = day
  }

  func shareURL(for kind: ShareKind) -> URL {
    let slug = couple.me.name.lowercased().replacingOccurrences(of: " ", with: "-")
    switch kind {
    case .availability:
      return URL(string: "https://ours.app/book/\(slug)")!
    case .calendar:
      return URL(string: "https://ours.app/join/\(slug)")!
    }
  }

  func shareMessage(for kind: ShareKind) -> String {
    let link = shareURL(for: kind).absoluteString
    switch kind {
    case .availability:
      return "Here’s when I’m free this week. Pick a time and I’ll get the invite: \(link)"
    case .calendar:
      return "Join me on Ours so we can keep our calendars together: \(link)"
    }
  }

  func receiveGuestBooking(title: String, start: Date, end: Date, guestName: String, guestPhone: String) {
    requests.insert(
      SharedRequest(
        id: uid("r"),
        title: title,
        notes: "From \(guestName) · \(guestPhone)",
        proposedStart: start,
        proposedEnd: end,
        from: .partner,
        status: .pending,
        createdAt: Date()
      ),
      at: 0
    )
  }

  func addEvent(_ event: CalendarEvent) {
    var copy = event
    if copy.id.isEmpty { copy = withId(event) }
    events.append(copy)
  }

  func addEvent(
    title: String,
    start: Date,
    end: Date,
    owner: EventOwner,
    notes: String? = nil,
    location: String? = nil,
    recurrence: Recurrence = .none
  ) {
    events.append(
      CalendarEvent(
        id: uid("e"),
        title: title,
        notes: notes,
        location: location,
        start: start,
        end: end,
        owner: owner,
        recurrence: recurrence
      )
    )
  }

  func updateEvent(id: String, title: String, recurrence: Recurrence) {
    guard let idx = events.firstIndex(where: { $0.id == id }) else { return }
    events[idx].title = title
    events[idx].recurrence = recurrence
  }

  func deleteEvent(id: String) {
    events.removeAll { $0.id == id }
  }

  func sendSharedRequest(title: String, start: Date, end: Date, notes: String? = nil, location: String? = nil) {
    requests.insert(
      SharedRequest(
        id: uid("r"),
        title: title,
        notes: notes,
        location: location,
        proposedStart: start,
        proposedEnd: end,
        from: .me,
        status: .pending,
        createdAt: Date()
      ),
      at: 0
    )
  }

  func acceptRequest(id: String) {
    guard let target = requests.first(where: { $0.id == id }) else { return }
    let start = target.suggestedStart ?? target.proposedStart
    let end = target.suggestedEnd ?? target.proposedEnd
    events.append(
      CalendarEvent(
        id: uid("e"),
        title: target.title,
        notes: target.notes,
        location: target.location,
        start: start,
        end: end,
        owner: .shared
      )
    )
    if let idx = requests.firstIndex(where: { $0.id == id }) {
      requests[idx].status = .accepted
    }
  }

  func suggestRequestTime(id: String, start: Date, end: Date) {
    guard let idx = requests.firstIndex(where: { $0.id == id }) else { return }
    requests[idx].status = .suggested
    requests[idx].suggestedStart = start
    requests[idx].suggestedEnd = end
  }

  func declineRequest(id: String) {
    guard let idx = requests.firstIndex(where: { $0.id == id }) else { return }
    requests[idx].status = .declined
  }

  func updateRequest(
    id: String,
    title: String,
    notes: String?,
    location: String?,
    start: Date,
    end: Date
  ) {
    guard let idx = requests.firstIndex(where: { $0.id == id }) else { return }
    requests[idx].title = title
    requests[idx].notes = notes
    requests[idx].location = location
    requests[idx].proposedStart = start
    requests[idx].proposedEnd = end
  }

  func createFromSlot(
    _ slot: FreeSlot,
    title: String,
    recurrence: Recurrence = .none,
    scope: FindTimeScope = .together
  ) {
    let start = slot.start
    let end = slot.end
    switch scope {
    case .solo:
      addEvent(title: title, start: start, end: end, owner: .me, recurrence: recurrence)
    case .together:
      events.append(
        CalendarEvent(
          id: uid("e"),
          title: title,
          start: start,
          end: end,
          owner: .shared,
          recurrence: recurrence
        )
      )
      requests.insert(
        SharedRequest(
          id: uid("r"),
          title: title,
          proposedStart: start,
          proposedEnd: end,
          from: .me,
          status: .accepted,
          createdAt: Date()
        ),
        at: 0
      )
    }
  }

  func removePartner() {
    partnerLinked = false
    events.removeAll { $0.owner == .partner }
    travels.removeAll { $0.person == .partner }
    requests.removeAll { $0.from == .partner }
  }

  func itemsForDay(_ day: Date) -> [DayItem] {
    let dayEvents = events
      .compactMap { RecurrenceUtils.occurrenceOnDay($0, day: day) }
      .map { DayItem.event($0) }

    let myBusy = dayEvents.compactMap { item -> CalendarEvent? in
      if case .event(let e) = item, e.owner == .me || e.owner == .shared { return e }
      return nil
    }

    let dayRequests = requests
      .filter { r in
        guard r.status == .pending || r.status == .suggested else { return false }
        guard DateUtils.isSameDay(r.proposedStart, day) else { return false }
        return !myBusy.contains {
          DateUtils.overlaps($0.start, $0.end, r.proposedStart, r.proposedEnd)
        }
      }
      .map { DayItem.request($0) }

    return (dayEvents + dayRequests).sorted { $0.start < $1.start }
  }

  private func uid(_ prefix: String) -> String {
    "\(prefix)-\(UUID().uuidString.prefix(8).lowercased())"
  }

  private func withId(_ event: CalendarEvent) -> CalendarEvent {
    CalendarEvent(
      id: uid("e"),
      title: event.title,
      notes: event.notes,
      location: event.location,
      start: event.start,
      end: event.end,
      owner: event.owner,
      colorHint: event.colorHint,
      recurrence: event.recurrence
    )
  }
}
