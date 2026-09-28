import Foundation

enum MockData {
  /// Anchor week around Tue Sep 15, 2026
  static let today: Date = {
    var comps = DateComponents()
    comps.year = 2026
    comps.month = 9
    comps.day = 15
    comps.hour = 10
    comps.minute = 30
    return DateUtils.calendar.date(from: comps)!
  }()

  static let couple = CoupleProfile(
    me: PersonProfile(id: .me, name: "Karen", shortName: "You", initial: "K", email: "karen@kodera.us"),
    partner: PersonProfile(id: .partner, name: "Thomas Tran", shortName: "Thomas", initial: "T", email: "thomas@kodera.us")
  )

  private static var mon: Date { DateUtils.atTime(DateUtils.calendar.date(from: DateComponents(year: 2026, month: 9, day: 14))!, hour: 0) }
  private static var tue: Date { DateUtils.addDays(mon, 1) }
  private static var wed: Date { DateUtils.addDays(mon, 2) }
  private static var thu: Date { DateUtils.addDays(mon, 3) }
  private static var fri: Date { DateUtils.addDays(mon, 4) }
  private static var sat: Date { DateUtils.addDays(mon, 5) }
  private static var sun: Date { DateUtils.addDays(mon, 6) }
  private static var nextMon: Date { DateUtils.addDays(mon, 7) }
  private static var nextTue: Date { DateUtils.addDays(nextMon, 1) }
  private static var nextWed: Date { DateUtils.addDays(nextMon, 2) }
  private static var nextThu: Date { DateUtils.addDays(nextMon, 3) }
  private static var nextFri: Date { DateUtils.addDays(nextMon, 4) }
  private static var nextSat: Date { DateUtils.addDays(nextMon, 5) }
  private static var nextSun: Date { DateUtils.addDays(nextMon, 6) }

  static let events: [CalendarEvent] = [
    CalendarEvent(id: "e1", title: "Dinner with Chloe", location: "Bar Isabel", start: DateUtils.atTime(tue, hour: 19), end: DateUtils.atTime(tue, hour: 21), owner: .me),
    CalendarEvent(id: "e3", title: "Yoga", location: "River Studio", start: DateUtils.atTime(thu, hour: 18), end: DateUtils.atTime(thu, hour: 19), owner: .me),
    CalendarEvent(id: "e5", title: "Date night", notes: "Reservation under Thomas", location: "Velvet Room", start: DateUtils.atTime(fri, hour: 19, minute: 30), end: DateUtils.atTime(fri, hour: 22), owner: .shared),
    CalendarEvent(id: "e7", title: "Dinner together", location: "Home", start: DateUtils.atTime(sat, hour: 19, minute: 30), end: DateUtils.atTime(sat, hour: 21), owner: .shared),
    CalendarEvent(id: "e8", title: "Dinner with parents", location: "North End", start: DateUtils.atTime(sun, hour: 17, minute: 30), end: DateUtils.atTime(sun, hour: 20), owner: .me),
    CalendarEvent(id: "e0", title: "Team drinks", location: "The Drake", start: DateUtils.atTime(nextMon, hour: 18, minute: 30), end: DateUtils.atTime(nextMon, hour: 20, minute: 30), owner: .partner),
    CalendarEvent(id: "e9", title: "Bookstore browse", location: "Type Books", start: DateUtils.atTime(nextTue, hour: 18), end: DateUtils.atTime(nextTue, hour: 19, minute: 30), owner: .me),
    CalendarEvent(id: "e2", title: "Climbing gym", location: "Basecamp", start: DateUtils.atTime(nextWed, hour: 18, minute: 30), end: DateUtils.atTime(nextWed, hour: 20, minute: 30), owner: .partner),
    CalendarEvent(id: "e4", title: "Pub with teammates", location: "The Drake", start: DateUtils.atTime(nextThu, hour: 19, minute: 30), end: DateUtils.atTime(nextThu, hour: 22), owner: .partner),
    CalendarEvent(id: "e10", title: "Pilates", location: "River Studio", start: DateUtils.atTime(nextThu, hour: 18), end: DateUtils.atTime(nextThu, hour: 19), owner: .me),
    CalendarEvent(id: "e11", title: "Concert", notes: "Doors at 7:30", location: "History", start: DateUtils.atTime(nextFri, hour: 20), end: DateUtils.atTime(nextFri, hour: 22, minute: 30), owner: .shared),
    CalendarEvent(id: "e6", title: "Climbing", location: "Basecamp", start: DateUtils.atTime(nextSat, hour: 17), end: DateUtils.atTime(nextSat, hour: 19), owner: .partner),
    CalendarEvent(id: "e12", title: "Brunch", location: "Lady Marmalade", start: DateUtils.atTime(nextSun, hour: 11), end: DateUtils.atTime(nextSun, hour: 12, minute: 30), owner: .shared),
  ]

  static let requests: [SharedRequest] = [
    SharedRequest(id: "r1", title: "Evening walk", notes: "Quick stroll after you’re back?", location: "Riverside", proposedStart: DateUtils.atTime(sun, hour: 20, minute: 15), proposedEnd: DateUtils.atTime(sun, hour: 21, minute: 15), from: .partner, status: .pending, createdAt: DateUtils.atTime(fri, hour: 16)),
    SharedRequest(id: "r2", title: "Catch a movie?", notes: "Something light after work", location: "Scotiabank Theatre", proposedStart: DateUtils.atTime(nextWed, hour: 19, minute: 30), proposedEnd: DateUtils.atTime(nextWed, hour: 21, minute: 30), from: .me, status: .pending, createdAt: DateUtils.atTime(tue, hour: 12)),
    SharedRequest(id: "r3", title: "Coffee before work?", notes: "Quick catch-up if you’re free", location: "Dineen", proposedStart: DateUtils.atTime(nextTue, hour: 17, minute: 30), proposedEnd: DateUtils.atTime(nextTue, hour: 18, minute: 30), from: .partner, status: .pending, createdAt: DateUtils.atTime(sun, hour: 21)),
  ]

  static let travels: [TravelStay] = [
    TravelStay(id: "t1", person: .partner, place: "Miami", start: mon, end: wed),
  ]
}
