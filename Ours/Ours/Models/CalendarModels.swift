import Foundation
import SwiftUI

enum PersonId: String, Codable, Hashable {
  case me
  case partner
}

enum EventOwner: String, Codable, Hashable {
  case me
  case partner
  case shared
}

enum RequestStatus: String, Codable, Hashable {
  case pending
  case accepted
  case suggested
  case declined
}

enum Recurrence: String, Codable, Hashable, CaseIterable, Identifiable {
  case none
  case daily
  case weekly
  case biweekly
  case monthly

  var id: String { rawValue }

  var label: String {
    switch self {
    case .none: return "Does not repeat"
    case .daily: return "Every day"
    case .weekly: return "Every week"
    case .biweekly: return "Every 2 weeks"
    case .monthly: return "Every month"
    }
  }
}

struct PersonProfile: Identifiable, Hashable {
  let id: PersonId
  var name: String
  var shortName: String
  var initial: String
  var email: String
}

struct CoupleProfile: Hashable {
  var me: PersonProfile
  var partner: PersonProfile
}

struct CalendarEvent: Identifiable, Hashable {
  let id: String
  var title: String
  var notes: String?
  var location: String?
  var start: Date
  var end: Date
  var owner: EventOwner
  var colorHint: String?
  var recurrence: Recurrence?
}

struct SharedRequest: Identifiable, Hashable {
  let id: String
  var title: String
  var notes: String?
  var location: String?
  var proposedStart: Date
  var proposedEnd: Date
  var suggestedStart: Date?
  var suggestedEnd: Date?
  var from: PersonId
  var status: RequestStatus
  var createdAt: Date
}

struct FreeSlot: Identifiable, Hashable {
  let id: String
  var start: Date
  var end: Date
  var dayLabel: String
  var timeLabel: String
  var durationMinutes: Int
}

enum FindTimeScope: String, CaseIterable, Identifiable {
  case solo
  case together

  var id: String { rawValue }

  func menuLabel(couple: CoupleProfile) -> String {
    switch self {
    case .solo: return "Just you"
    case .together: return "\(couple.me.shortName) & \(couple.partner.shortName)"
    }
  }

  func subtitle(couple: CoupleProfile) -> String {
    switch self {
    case .solo: return "Open windows on your calendar"
    case .together: return "Open windows when you’re both free"
    }
  }
}

struct TravelStay: Identifiable, Hashable {
  let id: String
  var person: PersonId
  var place: String
  var start: Date
  var end: Date
}

enum ShareKind: String, CaseIterable, Identifiable, Hashable {
  case availability
  case calendar

  var id: String { rawValue }

  var title: String {
    switch self {
    case .availability: return "Share availability"
    case .calendar: return "Share calendar indefinitely"
    }
  }

  var subtitle: String {
    switch self {
    case .availability:
      return "Friends pick an open time and send you an invite"
    case .calendar:
      return "Invite someone to join Ours and link calendars"
    }
  }

  var icon: String {
    switch self {
    case .availability: return "clock"
    case .calendar: return "calendar.badge.plus"
    }
  }
}

struct ShareContact: Identifiable, Hashable {
  let id: String
  var name: String
  var phone: String
  var initial: String
  var hasOurs: Bool
}

struct GuestBookingDraft: Hashable {
  var hostName: String
  var hostInitial: String
  var slot: FreeSlot
  var guestPhone: String
  var guestName: String
}

enum SheetRoute: Equatable, Hashable {
  case none
  case create
  case edit(CalendarEvent)
  case findTime
  case search
  case requests
  case requestDetail(SharedRequest)
}

enum DayItem: Identifiable {
  case event(CalendarEvent)
  case request(SharedRequest)

  var id: String {
    switch self {
    case .event(let e): return "e-\(e.id)"
    case .request(let r): return "r-\(r.id)"
    }
  }

  var start: Date {
    switch self {
    case .event(let e): return e.start
    case .request(let r): return r.proposedStart
    }
  }
}
