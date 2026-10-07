import AuthenticationServices
import Foundation
import Supabase

enum AppConfig {
  static var supabaseURL: URL? {
    guard
      let raw = Bundle.main.object(forInfoDictionaryKey: "SUPABASE_URL") as? String,
      raw.hasPrefix("https://"),
      let url = URL(string: raw),
      url.host != nil
    else { return nil }
    return url
  }

  static var anonKey: String? {
    guard
      let key = Bundle.main.object(forInfoDictionaryKey: "SUPABASE_ANON_KEY") as? String,
      key.count > 20
    else { return nil }
    return key
  }

  static var isConfigured: Bool { supabaseURL != nil && anonKey != nil }
}

enum BackendError: LocalizedError {
  case message(String)

  var errorDescription: String? {
    switch self {
    case .message(let text): return text
    }
  }
}

struct ProfileRecord: Decodable, Identifiable {
  let id: UUID
  var displayName: String
  var shortName: String
  var initial: String
  var email: String?
  var colorHex: String
  var workStartMinute: Int?
  var workEndMinute: Int?

  enum CodingKeys: String, CodingKey {
    case id
    case displayName = "display_name"
    case shortName = "short_name"
    case initial
    case email
    case colorHex = "color_hex"
    case workStartMinute = "work_start_minute"
    case workEndMinute = "work_end_minute"
  }
}

struct EventRecord: Decodable {
  let id: UUID
  let ownerId: UUID
  let partnershipId: UUID?
  let title: String
  let notes: String?
  let location: String?
  let startAt: Date
  let endAt: Date
  let visibility: String
  let recurrence: String
  let googleEventId: String?
  let source: String

  enum CodingKeys: String, CodingKey {
    case id
    case ownerId = "owner_id"
    case partnershipId = "partnership_id"
    case title, notes, location
    case startAt = "start_at"
    case endAt = "end_at"
    case visibility, recurrence
    case googleEventId = "google_event_id"
    case source
  }
}

struct RequestRecord: Decodable {
  let id: UUID
  let fromUserId: UUID
  let toUserId: UUID
  let partnershipId: UUID?
  let shareSessionId: UUID?
  let title: String
  let notes: String?
  let location: String?
  let proposedStart: Date
  let proposedEnd: Date
  let suggestedStart: Date?
  let suggestedEnd: Date?
  let status: String
  let createdAt: Date

  enum CodingKeys: String, CodingKey {
    case id
    case fromUserId = "from_user_id"
    case toUserId = "to_user_id"
    case partnershipId = "partnership_id"
    case shareSessionId = "share_session_id"
    case title, notes, location
    case proposedStart = "proposed_start"
    case proposedEnd = "proposed_end"
    case suggestedStart = "suggested_start"
    case suggestedEnd = "suggested_end"
    case status
    case createdAt = "created_at"
  }
}

struct PartnershipRecord: Decodable {
  let id: UUID
  let hostId: UUID
  let partnerId: UUID?
  let status: String
  let token: String

  enum CodingKeys: String, CodingKey {
    case id
    case hostId = "host_id"
    case partnerId = "partner_id"
    case status, token
  }
}

struct ShareSessionRecord: Decodable {
  let id: UUID
  let hostId: UUID
  let guestId: UUID?
  let status: String
  let token: String
  let expiresAt: Date

  enum CodingKeys: String, CodingKey {
    case id
    case hostId = "host_id"
    case guestId = "guest_id"
    case status, token
    case expiresAt = "expires_at"
  }
}

struct PartnerInviteResult: Decodable {
  let token: String
  let partnershipId: UUID
  let status: String

  enum CodingKeys: String, CodingKey {
    case token
    case partnershipId = "partnership_id"
    case status
  }
}

struct AcceptPartnerResult: Decodable {
  let partnershipId: UUID
  let hostId: UUID
  let hostName: String
  let hostShortName: String
  let hostInitial: String
  let hostEmail: String?

  enum CodingKeys: String, CodingKey {
    case partnershipId = "partnership_id"
    case hostId = "host_id"
    case hostName = "host_name"
    case hostShortName = "host_short_name"
    case hostInitial = "host_initial"
    case hostEmail = "host_email"
  }
}

struct ShareSessionResult: Decodable {
  let token: String
  let sessionId: UUID
  let expiresAt: Date

  enum CodingKeys: String, CodingKey {
    case token
    case sessionId = "session_id"
    case expiresAt = "expires_at"
  }
}

struct AcceptShareResult: Decodable {
  let sessionId: UUID
  let hostId: UUID
  let hostName: String
  let hostShortName: String
  let hostInitial: String
  let expiresAt: Date

  enum CodingKeys: String, CodingKey {
    case sessionId = "session_id"
    case hostId = "host_id"
    case hostName = "host_name"
    case hostShortName = "host_short_name"
    case hostInitial = "host_initial"
    case expiresAt = "expires_at"
  }
}

struct BusyRow: Decodable {
  let startAt: Date
  let endAt: Date

  enum CodingKeys: String, CodingKey {
    case startAt = "start_at"
    case endAt = "end_at"
  }
}

struct AcceptRequestResult: Decodable {
  let eventId: UUID?

  enum CodingKeys: String, CodingKey {
    case eventId = "event_id"
  }
}

private struct TokenParams: Encodable {
  let pToken: String
  enum CodingKeys: String, CodingKey { case pToken = "p_token" }
}

private struct SessionParams: Encodable {
  let pSessionId: UUID
  enum CodingKeys: String, CodingKey { case pSessionId = "p_session_id" }
}

private struct BusyParams: Encodable {
  let pSessionId: UUID
  let pStart: Date
  let pEnd: Date
  enum CodingKeys: String, CodingKey {
    case pSessionId = "p_session_id"
    case pStart = "p_start"
    case pEnd = "p_end"
  }
}

private struct RequestParams: Encodable {
  let pRequestId: UUID
  enum CodingKeys: String, CodingKey { case pRequestId = "p_request_id" }
}

struct EventWrite: Encodable {
  let id: UUID
  let ownerId: UUID
  let partnershipId: UUID?
  let title: String
  let notes: String?
  let location: String?
  let startAt: Date
  let endAt: Date
  let visibility: String
  let recurrence: String
  let source: String

  enum CodingKeys: String, CodingKey {
    case id
    case ownerId = "owner_id"
    case partnershipId = "partnership_id"
    case title, notes, location
    case startAt = "start_at"
    case endAt = "end_at"
    case visibility, recurrence, source
  }
}

struct RequestWrite: Encodable {
  let id: UUID
  let fromUserId: UUID
  let toUserId: UUID
  let partnershipId: UUID?
  let shareSessionId: UUID?
  let title: String
  let notes: String?
  let location: String?
  let proposedStart: Date
  let proposedEnd: Date
  let status: String

  enum CodingKeys: String, CodingKey {
    case id
    case fromUserId = "from_user_id"
    case toUserId = "to_user_id"
    case partnershipId = "partnership_id"
    case shareSessionId = "share_session_id"
    case title, notes, location
    case proposedStart = "proposed_start"
    case proposedEnd = "proposed_end"
    case status
  }
}

@MainActor
final class AppBackend {
  let client: SupabaseClient
  var onRemoteChange: (() -> Void)?

  private var channel: RealtimeChannelV2?
  private var subscriptions: [RealtimeSubscription] = []
  private var authTask: Task<Void, Never>?

  init(url: URL, key: String) {
    client = SupabaseClient(supabaseURL: url, supabaseKey: key)
  }

  func listen(_ onSession: @escaping @MainActor (Session?) -> Void) {
    authTask?.cancel()
    authTask = Task { @MainActor in
      for await (event, session) in client.auth.authStateChanges {
        if Task.isCancelled { return }
        switch event {
        case .initialSession, .signedIn, .signedOut:
          onSession(session)
        default:
          break
        }
      }
    }
  }

  func signUp(email: String, password: String, name: String) async throws -> Session {
    let response = try await client.auth.signUp(
      email: email,
      password: password,
      data: ["display_name": .string(name)]
    )
    guard let session = response.session else {
      throw BackendError.message("Check your email to confirm the account, then sign in.")
    }
    try await updateName(name, userId: session.user.id)
    return session
  }

  func signIn(email: String, password: String) async throws -> Session {
    try await client.auth.signIn(email: email, password: password)
  }

  func signInWithGoogle() async throws -> Session {
    try await client.auth.signInWithOAuth(
      provider: .google,
      redirectTo: URL(string: "ours://auth-callback")
    )
  }

  func signInWithApple(idToken: String, nonce: String) async throws -> Session {
    try await client.auth.signInWithIdToken(
      credentials: OpenIDConnectCredentials(provider: .apple, idToken: idToken, nonce: nonce)
    )
  }

  func signOut() async {
    await unsubscribe()
    try? await client.auth.signOut()
  }

  func updateName(_ name: String, userId: UUID) async throws {
    let trimmed = name.trimmingCharacters(in: .whitespacesAndNewlines)
    guard !trimmed.isEmpty else { return }
    let short = trimmed.split(separator: " ").first.map(String.init) ?? trimmed
    let initial = String(trimmed.prefix(1)).uppercased()
    struct Patch: Encodable {
      let displayName: String
      let shortName: String
      let initial: String
      enum CodingKeys: String, CodingKey {
        case displayName = "display_name"
        case shortName = "short_name"
        case initial
      }
    }
    try await client.from("profiles")
      .update(Patch(displayName: trimmed, shortName: short, initial: initial))
      .eq("id", value: userId.uuidString)
      .execute()
  }

  func updateColor(hex: String, userId: UUID) async throws {
    struct Patch: Encodable {
      let colorHex: String
      enum CodingKeys: String, CodingKey { case colorHex = "color_hex" }
    }
    try await client.from("profiles")
      .update(Patch(colorHex: hex))
      .eq("id", value: userId.uuidString)
      .execute()
  }

  func updateWorkHours(start: Int?, end: Int?, userId: UUID) async throws {
    struct Patch: Encodable {
      let workStartMinute: Int?
      let workEndMinute: Int?
      enum CodingKeys: String, CodingKey {
        case workStartMinute = "work_start_minute"
        case workEndMinute = "work_end_minute"
      }
      func encode(to encoder: Encoder) throws {
        var container = encoder.container(keyedBy: CodingKeys.self)
        try container.encode(workStartMinute, forKey: .workStartMinute)
        try container.encode(workEndMinute, forKey: .workEndMinute)
      }
    }
    try await client.from("profiles")
      .update(Patch(workStartMinute: start, workEndMinute: end))
      .eq("id", value: userId.uuidString)
      .execute()
  }

  func loadProfile(id: UUID) async throws -> ProfileRecord? {
    let rows: [ProfileRecord] = try await client.from("profiles")
      .select("id,display_name,short_name,initial,email,color_hex,work_start_minute,work_end_minute")
      .eq("id", value: id.uuidString)
      .execute()
      .value
    return rows.first
  }

  func loadProfiles(ids: [UUID]) async throws -> [ProfileRecord] {
    guard !ids.isEmpty else { return [] }
    let rows: [ProfileRecord] = try await client.from("profiles")
      .select("id,display_name,short_name,initial,email,color_hex,work_start_minute,work_end_minute")
      .in("id", values: ids.map(\.uuidString))
      .execute()
      .value
    return rows
  }

  func loadPartnerships() async throws -> [PartnershipRecord] {
    try await client.from("partnerships")
      .select("id,host_id,partner_id,status,token")
      .execute()
      .value
  }

  func loadEvents() async throws -> [EventRecord] {
    try await client.from("events")
      .select("id,owner_id,partnership_id,title,notes,location,start_at,end_at,visibility,recurrence,google_event_id,source")
      .execute()
      .value
  }

  func loadRequests() async throws -> [RequestRecord] {
    try await client.from("shared_requests")
      .select("id,from_user_id,to_user_id,partnership_id,share_session_id,title,notes,location,proposed_start,proposed_end,suggested_start,suggested_end,status,created_at")
      .execute()
      .value
  }

  func loadShareSessions() async throws -> [ShareSessionRecord] {
    try await client.from("share_sessions")
      .select("id,host_id,guest_id,status,token,expires_at")
      .execute()
      .value
  }

  func googleEmail() async throws -> String? {
    struct Row: Decodable {
      let googleEmail: String?
      enum CodingKeys: String, CodingKey { case googleEmail = "google_email" }
    }
    let rows: [Row] = try await client.from("google_connections")
      .select("google_email")
      .execute()
      .value
    return rows.first?.googleEmail
  }

  func insertEvent(_ event: EventWrite) async throws {
    try await client.from("events").insert(event).execute()
  }

  func updateEvent(id: UUID, title: String, recurrence: String) async throws {
    struct Patch: Encodable {
      let title: String
      let recurrence: String
    }
    try await client.from("events").update(Patch(title: title, recurrence: recurrence)).eq("id", value: id.uuidString).execute()
  }

  func deleteEvent(id: UUID) async throws {
    try await client.from("events").delete().eq("id", value: id.uuidString).execute()
  }

  func insertRequest(_ request: RequestWrite) async throws {
    try await client.from("shared_requests").insert(request).execute()
  }

  func updateRequest(
    id: UUID,
    title: String,
    notes: String?,
    location: String?,
    start: Date,
    end: Date
  ) async throws {
    struct Patch: Encodable {
      let title: String
      let notes: String?
      let location: String?
      let proposedStart: Date
      let proposedEnd: Date
      enum CodingKeys: String, CodingKey {
        case title, notes, location
        case proposedStart = "proposed_start"
        case proposedEnd = "proposed_end"
      }
    }
    try await client.from("shared_requests")
      .update(Patch(title: title, notes: notes, location: location, proposedStart: start, proposedEnd: end))
      .eq("id", value: id.uuidString)
      .execute()
  }

  func suggestRequest(id: UUID, start: Date, end: Date) async throws {
    struct Patch: Encodable {
      let status: String
      let suggestedStart: Date
      let suggestedEnd: Date
      enum CodingKeys: String, CodingKey {
        case status
        case suggestedStart = "suggested_start"
        case suggestedEnd = "suggested_end"
      }
    }
    try await client.from("shared_requests")
      .update(Patch(status: "suggested", suggestedStart: start, suggestedEnd: end))
      .eq("id", value: id.uuidString)
      .execute()
  }

  func declineRequest(id: UUID) async throws {
    struct Patch: Encodable { let status: String }
    try await client.from("shared_requests").update(Patch(status: "declined")).eq("id", value: id.uuidString).execute()
  }

  func createPartnerInvite() async throws -> PartnerInviteResult {
    try await client.rpc("create_partner_invite").execute().value
  }

  func acceptPartnerInvite(token: String) async throws -> AcceptPartnerResult {
    try await client.rpc("accept_partner_invite", params: TokenParams(pToken: token)).execute().value
  }

  func endPartnership() async throws {
    try await client.rpc("end_partnership").execute()
  }

  func createShareSession() async throws -> ShareSessionResult {
    try await client.rpc("create_share_session").execute().value
  }

  func acceptShareSession(token: String) async throws -> AcceptShareResult {
    try await client.rpc("accept_share_session", params: TokenParams(pToken: token)).execute().value
  }

  func revokeShareSession(id: UUID) async throws {
    try await client.rpc("revoke_share_session", params: SessionParams(pSessionId: id)).execute()
  }

  func busyBlocks(sessionId: UUID, start: Date, end: Date) async throws -> [DateInterval] {
    let rows: [BusyRow] = try await client.rpc(
      "busy_blocks",
      params: BusyParams(pSessionId: sessionId, pStart: start, pEnd: end)
    ).execute().value
    return rows.map { DateInterval(start: $0.startAt, end: $0.endAt) }
  }

  func acceptRequest(id: UUID) async throws -> UUID? {
    let result: AcceptRequestResult = try await client.rpc(
      "accept_shared_request",
      params: RequestParams(pRequestId: id)
    ).execute().value
    return result.eventId
  }

  func subscribe() async {
    await unsubscribe()
    let channel = client.channel("calendar")
    let tables = ["events", "shared_requests", "partnerships", "share_sessions"]
    subscriptions = tables.map { table in
      channel.onPostgresChange(AnyAction.self, schema: "public", table: table) { [weak self] _ in
        Task { @MainActor in
          self?.onRemoteChange?()
        }
      }
    }
    self.channel = channel
    try? await channel.subscribeWithError()
  }

  func unsubscribe() async {
    subscriptions.removeAll()
    if let channel {
      await client.removeChannel(channel)
    }
    channel = nil
  }

  func connectGoogleCalendar() async throws {
    struct Start: Decodable { let url: String }
    struct Body: Encodable { let action: String }
    let start: Start = try await client.functions.invoke(
      "google-oauth",
      options: FunctionInvokeOptions(body: Body(action: "start"))
    )
    guard let url = URL(string: start.url) else {
      throw BackendError.message("Google did not return a sign-in link.")
    }
    let callback = try await WebAuth.start(url: url, scheme: "ours")
    let items = URLComponents(url: callback, resolvingAgainstBaseURL: false)?.queryItems ?? []
    if let error = items.first(where: { $0.name == "error" })?.value {
      throw BackendError.message("Google Calendar connection failed (\(error)).")
    }
    try await client.functions.invoke(
      "google-sync",
      options: FunctionInvokeOptions(body: Body(action: "import"))
    )
  }

  func pushEvent(id: UUID) async {
    struct Body: Encodable {
      let action: String
      let eventId: String
      enum CodingKeys: String, CodingKey {
        case action
        case eventId = "event_id"
      }
    }
    try? await client.functions.invoke(
      "google-sync",
      options: FunctionInvokeOptions(body: Body(action: "upsert", eventId: id.uuidString))
    )
  }

  func deleteGoogleEvent(id: String) async {
    struct Body: Encodable {
      let action: String
      let googleEventId: String
      enum CodingKeys: String, CodingKey {
        case action
        case googleEventId = "google_event_id"
      }
    }
    try? await client.functions.invoke(
      "google-sync",
      options: FunctionInvokeOptions(body: Body(action: "delete", googleEventId: id))
    )
  }

  func disconnectGoogle() async throws {
    struct Body: Encodable { let action: String }
    try await client.functions.invoke(
      "google-sync",
      options: FunctionInvokeOptions(body: Body(action: "disconnect"))
    )
  }
}

private enum WebAuth {
  @MainActor
  static func start(url: URL, scheme: String) async throws -> URL {
    try await withCheckedThrowingContinuation { continuation in
      let session = ASWebAuthenticationSession(url: url, callbackURLScheme: scheme) { callback, error in
        if let callback {
          continuation.resume(returning: callback)
        } else {
          continuation.resume(throwing: error ?? URLError(.cancelled))
        }
      }
      session.presentationContextProvider = Presenter.shared
      session.prefersEphemeralWebBrowserSession = false
      Presenter.shared.retain(session)
      if !session.start() {
        continuation.resume(throwing: BackendError.message("Could not open the browser."))
      }
    }
  }

  private final class Presenter: NSObject, ASWebAuthenticationPresentationContextProviding {
    static let shared = Presenter()
    private var session: ASWebAuthenticationSession?

    func retain(_ session: ASWebAuthenticationSession) {
      self.session = session
    }

    func presentationAnchor(for session: ASWebAuthenticationSession) -> ASPresentationAnchor {
      UIApplication.shared.connectedScenes
        .compactMap { $0 as? UIWindowScene }
        .flatMap(\.windows)
        .first { $0.isKeyWindow } ?? ASPresentationAnchor()
    }
  }
}
