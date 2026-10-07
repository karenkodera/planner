import Foundation
import Supabase
import SwiftUI

@MainActor
final class CalendarStore: ObservableObject {
  let today = Date()

  @Published var couple: CoupleProfile
  @Published var weekAnchor: Date
  @Published var selectedDay: Date
  @Published var events: [CalendarEvent] = []
  @Published var requests: [SharedRequest] = []
  @Published var travels: [TravelStay] = []
  @Published var sheet: SheetRoute = .none
  @Published var meColor: Color = AppColor.me
  @Published var partnerLinked = false
  @Published var partnerInvitePending = false
  @Published var dayDetailDay: Date?
  @Published var dayDetailSelection: TimelineSelection?
  @Published var meLoginMethod: LoginMethod = .email
  @Published var isRestoringSession = false
  @Published var isSignedIn = false
  @Published var lastError: String?
  @Published var guestBooking: GuestBookingSession?
  @Published var availabilityLinks: [AvailabilityLink] = []
  @Published var googleEmail: String?
  @Published var workStartMinute: Int?
  @Published var workEndMinute: Int?

  private var shareLink: URL?
  private var backend: AppBackend?
  private var userId: UUID?
  private var partnershipId: UUID?
  private var partnerUserId: UUID?
  private var googleIds: [String: String] = [:]
  private var pendingURL: URL?
  private var loadGeneration = 0
  private var reloadTask: Task<Void, Never>?

  enum LoginMethod {
    case email
    case apple
    case google
  }

  var isConfigured: Bool { backend != nil }

  init() {
    let now = Date()
    weekAnchor = now
    selectedDay = now
    couple = CoupleProfile(
      me: PersonProfile(id: .me, name: "", shortName: "", initial: "", email: ""),
      partner: PersonProfile(id: .partner, name: "", shortName: "", initial: "", email: "")
    )
    guard let url = AppConfig.supabaseURL, let key = AppConfig.anonKey else { return }
    let backend = AppBackend(url: url, key: key)
    self.backend = backend
    isRestoringSession = true
    backend.onRemoteChange = { [weak self] in
      self?.scheduleReload()
    }
    backend.listen { [weak self] session in
      self?.apply(session: session)
    }
  }

  var pendingCount: Int {
    requests.filter { $0.status == .pending && $0.from != .me }.count
  }

  var weekdayFreeStart: Int {
    guard let workEndMinute else { return 17 }
    return min(max(workEndMinute / 60, 0), 23)
  }

  var freeSlots: [FreeSlot] {
    freeSlots(scope: .together)
  }

  func freeSlots(scope: FindTimeScope) -> [FreeSlot] {
    FindTime.findFreeSlots(
      events: events,
      weekAnchor: weekAnchor,
      scope: scope,
      weekdayStartHour: weekdayFreeStart
    )
  }

  func requestCounterpartyName(_ request: SharedRequest) -> String {
    if let name = request.senderName, !name.isEmpty { return name }
    return couple.partner.name.isEmpty ? "them" : couple.partner.name
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

  func signUp(name: String, email: String, password: String) async throws {
    _ = try await backend?.signUp(email: email, password: password, name: name)
  }

  func signIn(email: String, password: String) async throws {
    _ = try await backend?.signIn(email: email, password: password)
  }

  func signInWithGoogle() async throws {
    _ = try await backend?.signInWithGoogle()
  }

  func signInWithApple(idToken: String, nonce: String, name: String?) async throws {
    guard let backend else { throw BackendError.message("Supabase is not configured.") }
    let session = try await backend.signInWithApple(idToken: idToken, nonce: nonce)
    if let name, !name.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
      try? await backend.updateName(name, userId: session.user.id)
    }
  }

  func signOut() {
    Task { await backend?.signOut() }
  }

  func setAvatarColor(hex: String) {
    meColor = AvatarPalette.color(hex: hex)
    guard let backend, let userId else { return }
    Task {
      do { try await backend.updateColor(hex: hex, userId: userId) }
      catch { self.lastError = error.localizedDescription }
    }
  }

  func setWorkHours(start: Int?, end: Int?) {
    workStartMinute = start
    workEndMinute = end
    guard let backend, let userId else { return }
    Task {
      do { try await backend.updateWorkHours(start: start, end: end, userId: userId) }
      catch { self.lastError = error.localizedDescription }
    }
  }

  func shareURL(for kind: ShareKind) -> URL {
    if let shareLink { return shareLink }
    switch kind {
    case .availability:
      return URL(string: "ours://availability/pending")!
    case .calendar:
      return URL(string: "ours://partner/pending")!
    }
  }

  func shareMessage(for kind: ShareKind) -> String {
    let link = shareURL(for: kind).absoluteString
    switch kind {
    case .availability:
      return "Here’s when I’m free this week. You’ll need Ours and a login to pick a time: \(link)"
    case .calendar:
      return "Join me on Ours so we can keep our calendars together. You’ll need the app and a login: \(link)"
    }
  }

  func prepareShare(_ kind: ShareKind) async throws {
    guard let backend else { throw BackendError.message("Supabase is not configured.") }
    switch kind {
    case .availability:
      let result = try await backend.createShareSession()
      shareLink = URL(string: "ours://availability/\(result.token)")
    case .calendar:
      let result = try await backend.createPartnerInvite()
      shareLink = URL(string: "ours://partner/\(result.token)")
      partnerInvitePending = true
    }
    scheduleReload()
  }

  func revokeAvailability(_ id: UUID) async {
    do {
      try await backend?.revokeShareSession(id: id)
      availabilityLinks.removeAll { $0.id == id }
    } catch {
      lastError = error.localizedDescription
    }
  }

  func handleIncomingURL(_ url: URL) {
    guard url.scheme == "ours" else { return }
    let host = url.host ?? ""
    if host == "auth-callback" || host == "google-callback" { return }
    guard isSignedIn else {
      pendingURL = url
      return
    }
    Task { await consume(url) }
  }

  func connectGoogleCalendar() async {
    do {
      try await backend?.connectGoogleCalendar()
      googleEmail = try await backend?.googleEmail()
      scheduleReload()
    } catch {
      lastError = error.localizedDescription
    }
  }

  func disconnectGoogleCalendar() async {
    do {
      try await backend?.disconnectGoogle()
      googleEmail = nil
    } catch {
      lastError = error.localizedDescription
    }
  }

  func loadGuestSlots(sessionId: UUID) async -> [FreeSlot] {
    guard let backend else { return [] }
    let start = DateUtils.startOfWeek(weekAnchor)
    let end = DateUtils.addDays(start, 7)
    do {
      let busy = try await backend.busyBlocks(sessionId: sessionId, start: start, end: end)
      return FindTime.findMutualSlots(
        myEvents: events,
        otherBusy: busy,
        weekAnchor: weekAnchor,
        weekdayStartHour: weekdayFreeStart
      )
    } catch {
      lastError = error.localizedDescription
      return []
    }
  }

  func sendGuestRequest(session: GuestBookingSession, title: String, start: Date, end: Date) async throws {
    guard let backend, let userId else { throw BackendError.message("Sign in to send a request.") }
    try await backend.insertRequest(
      RequestWrite(
        id: UUID(),
        fromUserId: userId,
        toUserId: session.hostId,
        partnershipId: nil,
        shareSessionId: session.id,
        title: title,
        notes: nil,
        location: nil,
        proposedStart: start,
        proposedEnd: end,
        status: "pending"
      )
    )
    scheduleReload()
  }

  func addEvent(_ event: CalendarEvent) {
    var copy = event
    if copy.id.isEmpty || UUID(uuidString: copy.id) == nil {
      copy = withId(event)
    }
    events.append(copy)
    persistNewEvent(copy)
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
    addEvent(
      CalendarEvent(
        id: UUID().uuidString.lowercased(),
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
    guard let uuid = UUID(uuidString: id), let backend else { return }
    let owner = events[idx].owner
    Task {
      do {
        try await backend.updateEvent(id: uuid, title: title, recurrence: recurrence.rawValue)
        if owner == .me { await backend.pushEvent(id: uuid) }
      } catch {
        self.lastError = error.localizedDescription
        self.scheduleReload()
      }
    }
  }

  func deleteEvent(id: String) {
    let googleId = googleIds[id]
    events.removeAll { $0.id == id }
    guard let uuid = UUID(uuidString: id), let backend else { return }
    Task {
      do {
        try await backend.deleteEvent(id: uuid)
        if let googleId { await backend.deleteGoogleEvent(id: googleId) }
      } catch {
        self.lastError = error.localizedDescription
        self.scheduleReload()
      }
    }
  }

  func sendSharedRequest(title: String, start: Date, end: Date, notes: String? = nil, location: String? = nil) {
    let request = SharedRequest(
      id: UUID().uuidString.lowercased(),
      title: title,
      notes: notes,
      location: location,
      proposedStart: start,
      proposedEnd: end,
      from: .me,
      status: .pending,
      createdAt: Date(),
      senderName: couple.partner.name,
      partnershipId: partnershipId?.uuidString.lowercased()
    )
    requests.insert(request, at: 0)
    guard let backend, let userId, let partnerUserId, let partnershipId else { return }
    Task {
      do {
        try await backend.insertRequest(
          RequestWrite(
            id: UUID(uuidString: request.id) ?? UUID(),
            fromUserId: userId,
            toUserId: partnerUserId,
            partnershipId: partnershipId,
            shareSessionId: nil,
            title: title,
            notes: notes,
            location: location,
            proposedStart: start,
            proposedEnd: end,
            status: "pending"
          )
        )
      } catch {
        self.lastError = error.localizedDescription
        self.scheduleReload()
      }
    }
  }

  func acceptRequest(id: String) {
    guard let uuid = UUID(uuidString: id) else { return }
    if let idx = requests.firstIndex(where: { $0.id == id }) {
      requests[idx].status = .accepted
    }
    Task {
      do {
        let eventId = try await backend?.acceptRequest(id: uuid)
        await reloadNow()
        if let eventId { await backend?.pushEvent(id: eventId) }
      } catch {
        self.lastError = error.localizedDescription
        self.scheduleReload()
      }
    }
  }

  func suggestRequestTime(id: String, start: Date, end: Date) {
    guard let idx = requests.firstIndex(where: { $0.id == id }) else { return }
    requests[idx].status = .suggested
    requests[idx].suggestedStart = start
    requests[idx].suggestedEnd = end
    guard let uuid = UUID(uuidString: id) else { return }
    Task {
      do { try await backend?.suggestRequest(id: uuid, start: start, end: end) }
      catch {
        self.lastError = error.localizedDescription
        self.scheduleReload()
      }
    }
  }

  func declineRequest(id: String) {
    guard let idx = requests.firstIndex(where: { $0.id == id }) else { return }
    requests[idx].status = .declined
    guard let uuid = UUID(uuidString: id) else { return }
    Task {
      do { try await backend?.declineRequest(id: uuid) }
      catch {
        self.lastError = error.localizedDescription
        self.scheduleReload()
      }
    }
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
    guard let uuid = UUID(uuidString: id) else { return }
    Task {
      do {
        try await backend?.updateRequest(id: uuid, title: title, notes: notes, location: location, start: start, end: end)
      } catch {
        self.lastError = error.localizedDescription
        self.scheduleReload()
      }
    }
  }

  func createFromSlot(
    _ slot: FreeSlot,
    title: String,
    recurrence: Recurrence = .none,
    scope: FindTimeScope = .together
  ) {
    switch scope {
    case .solo:
      addEvent(title: title, start: slot.start, end: slot.end, owner: .me, recurrence: recurrence)
    case .together:
      guard partnershipId != nil else {
        addEvent(title: title, start: slot.start, end: slot.end, owner: .me, recurrence: recurrence)
        return
      }
      addEvent(title: title, start: slot.start, end: slot.end, owner: .shared, recurrence: recurrence)
      let request = SharedRequest(
        id: UUID().uuidString.lowercased(),
        title: title,
        proposedStart: slot.start,
        proposedEnd: slot.end,
        from: .me,
        status: .accepted,
        createdAt: Date(),
        senderName: couple.partner.name,
        partnershipId: partnershipId?.uuidString.lowercased()
      )
      requests.insert(request, at: 0)
      guard let backend, let userId, let partnerUserId, let partnershipId else { return }
      Task {
        do {
          try await backend.insertRequest(
            RequestWrite(
              id: UUID(uuidString: request.id) ?? UUID(),
              fromUserId: userId,
              toUserId: partnerUserId,
              partnershipId: partnershipId,
              shareSessionId: nil,
              title: title,
              notes: nil,
              location: nil,
              proposedStart: slot.start,
              proposedEnd: slot.end,
              status: "accepted"
            )
          )
        } catch {
          self.lastError = error.localizedDescription
        }
      }
    }
  }

  func removePartner() {
    partnerLinked = false
    partnerInvitePending = false
    partnerUserId = nil
    events.removeAll { $0.owner == .partner }
    travels.removeAll { $0.person == .partner }
    Task {
      do {
        try await backend?.endPartnership()
        await reloadNow()
      } catch {
        self.lastError = error.localizedDescription
      }
    }
  }

  func itemsForDay(_ day: Date) -> [DayItem] {
    let dayEvents = events
      .compactMap { RecurrenceUtils.occurrenceOnDay($0, day: day) }
      .map { DayItem.event($0) }

    let myBusy = dayEvents.compactMap { item -> CalendarEvent? in
      if case .event(let event) = item, event.owner == .me || event.owner == .shared { return event }
      return nil
    }

    let dayRequests = requests
      .filter { request in
        guard request.status == .pending || request.status == .suggested else { return false }
        guard DateUtils.isSameDay(request.proposedStart, day) else { return false }
        return !myBusy.contains {
          DateUtils.overlaps($0.start, $0.end, request.proposedStart, request.proposedEnd)
        }
      }
      .map { DayItem.request($0) }

    return (dayEvents + dayRequests).sorted { $0.start < $1.start }
  }

  private func apply(session: Session?) {
    loadGeneration += 1
    let generation = loadGeneration
    guard let session else {
      clearAccount()
      isRestoringSession = false
      return
    }
    userId = session.user.id
    isSignedIn = true
    meLoginMethod = loginMethod(from: session)
    Task {
      await reload(generation: generation)
      guard generation == loadGeneration else { return }
      isRestoringSession = false
      await backend?.subscribe()
      if let pendingURL {
        self.pendingURL = nil
        await consume(pendingURL)
      }
    }
  }

  private func clearAccount() {
    userId = nil
    partnershipId = nil
    partnerUserId = nil
    isSignedIn = false
    partnerLinked = false
    partnerInvitePending = false
    events = []
    requests = []
    availabilityLinks = []
    googleEmail = nil
    googleIds = [:]
    guestBooking = nil
    couple.me = PersonProfile(id: .me, name: "", shortName: "", initial: "", email: "")
    couple.partner = PersonProfile(id: .partner, name: "", shortName: "", initial: "", email: "")
  }

  private func scheduleReload() {
    reloadTask?.cancel()
    reloadTask = Task {
      try? await Task.sleep(nanoseconds: 250_000_000)
      if Task.isCancelled { return }
      await reloadNow()
    }
  }

  private func reloadNow() async {
    loadGeneration += 1
    await reload(generation: loadGeneration)
  }

  private func reload(generation: Int) async {
    guard let backend, let userId else { return }
    do {
      let profile = try await backend.loadProfile(id: userId)
      let partnerships = try await backend.loadPartnerships()
      let eventRows = try await backend.loadEvents()
      let requestRows = try await backend.loadRequests()
      let sessions = try await backend.loadShareSessions()
      let google = try await backend.googleEmail()
      guard generation == loadGeneration else { return }

      if let profile {
        couple.me = PersonProfile(
          id: .me,
          name: profile.displayName,
          shortName: profile.shortName,
          initial: profile.initial,
          email: profile.email ?? ""
        )
        meColor = AvatarPalette.color(hex: profile.colorHex)
        workStartMinute = profile.workStartMinute
        workEndMinute = profile.workEndMinute
      }

      let open = partnerships.filter { $0.status == "pending" || $0.status == "active" }
      let active = open.first { $0.status == "active" }
      partnershipId = active?.id
      if let active {
        partnerLinked = true
        partnerInvitePending = false
        partnerUserId = active.hostId == userId ? active.partnerId : active.hostId
      } else {
        partnerLinked = false
        partnerUserId = nil
        partnershipId = nil
        partnerInvitePending = open.contains { $0.status == "pending" && $0.hostId == userId }
      }

      var names: [UUID: ProfileRecord] = [:]
      var ids = Set<UUID>()
      if let partnerUserId { ids.insert(partnerUserId) }
      for request in requestRows {
        ids.insert(request.fromUserId)
        ids.insert(request.toUserId)
      }
      ids.remove(userId)
      if !ids.isEmpty {
        let profiles = try await backend.loadProfiles(ids: Array(ids))
        guard generation == loadGeneration else { return }
        for profile in profiles { names[profile.id] = profile }
      }

      if let partnerUserId, let partner = names[partnerUserId] {
        couple.partner = PersonProfile(
          id: .partner,
          name: partner.displayName,
          shortName: partner.shortName,
          initial: partner.initial,
          email: partner.email ?? ""
        )
      } else if !partnerLinked {
        couple.partner = PersonProfile(id: .partner, name: "", shortName: "", initial: "", email: "")
      }

      googleIds = [:]
      events = eventRows.map { row in
        let id = row.id.uuidString.lowercased()
        if let googleEventId = row.googleEventId { googleIds[id] = googleEventId }
        let owner: EventOwner
        if row.visibility == "shared" {
          owner = .shared
        } else if row.ownerId == userId {
          owner = .me
        } else {
          owner = .partner
        }
        return CalendarEvent(
          id: id,
          title: row.title,
          notes: row.notes,
          location: row.location,
          start: row.startAt,
          end: row.endAt,
          owner: owner,
          recurrence: Recurrence(rawValue: row.recurrence) ?? Recurrence.none
        )
      }

      requests = requestRows.map { row in
        let otherId = row.fromUserId == userId ? row.toUserId : row.fromUserId
        return SharedRequest(
          id: row.id.uuidString.lowercased(),
          title: row.title,
          notes: row.notes,
          location: row.location,
          proposedStart: row.proposedStart,
          proposedEnd: row.proposedEnd,
          suggestedStart: row.suggestedStart,
          suggestedEnd: row.suggestedEnd,
          from: row.fromUserId == userId ? .me : .partner,
          status: RequestStatus(rawValue: row.status) ?? .pending,
          createdAt: row.createdAt,
          senderName: names[otherId]?.displayName,
          partnershipId: row.partnershipId?.uuidString.lowercased(),
          shareSessionId: row.shareSessionId?.uuidString.lowercased()
        )
      }.sorted { $0.createdAt > $1.createdAt }

      availabilityLinks = sessions
        .filter { $0.hostId == userId && ($0.status == "pending" || $0.status == "active") && $0.expiresAt > Date() }
        .map { AvailabilityLink(id: $0.id, expiresAt: $0.expiresAt, status: $0.status) }
        .sorted { $0.expiresAt < $1.expiresAt }

      googleEmail = google
    } catch {
      guard generation == loadGeneration else { return }
      lastError = error.localizedDescription
    }
  }

  private func consume(_ url: URL) async {
    let host = url.host ?? ""
    let token = url.path.trimmingCharacters(in: CharacterSet(charactersIn: "/"))
    guard !token.isEmpty, let backend else { return }
    do {
      switch host {
      case "partner":
        _ = try await backend.acceptPartnerInvite(token: token)
        await reloadNow()
      case "availability":
        let result = try await backend.acceptShareSession(token: token)
        guestBooking = GuestBookingSession(
          id: result.sessionId,
          hostId: result.hostId,
          hostName: result.hostName,
          hostInitial: result.hostInitial
        )
      default:
        break
      }
    } catch {
      lastError = error.localizedDescription
    }
  }

  private func persistNewEvent(_ event: CalendarEvent) {
    guard let backend, let userId, let id = UUID(uuidString: event.id) else { return }
    let visibility = event.owner == .shared ? "shared" : "partner"
    let linkedPartnership = event.owner == .shared ? partnershipId : nil
    Task {
      do {
        try await backend.insertEvent(
          EventWrite(
            id: id,
            ownerId: userId,
            partnershipId: linkedPartnership,
            title: event.title,
            notes: event.notes,
            location: event.location,
            startAt: event.start,
            endAt: event.end,
            visibility: visibility,
            recurrence: (event.recurrence ?? .none).rawValue,
            source: "ours"
          )
        )
        if event.owner == .me { await backend.pushEvent(id: id) }
      } catch {
        self.lastError = error.localizedDescription
        self.scheduleReload()
      }
    }
  }

  private func loginMethod(from session: Session) -> LoginMethod {
    if case .string(let provider) = session.user.appMetadata["provider"] {
      if provider == "apple" { return .apple }
      if provider == "google" { return .google }
    }
    return .email
  }

  private func withId(_ event: CalendarEvent) -> CalendarEvent {
    CalendarEvent(
      id: UUID().uuidString.lowercased(),
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
