import Foundation

enum DateUtils {
  static let weekStartsOn: Int = 2 // Monday (Calendar weekday: 1=Sun … 7=Sat)

  static var calendar: Calendar {
    var cal = Calendar(identifier: .gregorian)
    cal.firstWeekday = weekStartsOn
    return cal
  }

  static func startOfWeek(_ date: Date) -> Date {
    calendar.dateInterval(of: .weekOfYear, for: date)?.start
      ?? calendar.startOfDay(for: date)
  }

  static func getWeekDays(_ anchor: Date) -> [Date] {
    let start = startOfWeek(anchor)
    return (0..<7).compactMap { calendar.date(byAdding: .day, value: $0, to: start) }
  }

  static func getMonthGrid(_ anchor: Date) -> [Date] {
    let monthStart = calendar.date(from: calendar.dateComponents([.year, .month], from: anchor))!
    let monthEnd = calendar.date(byAdding: DateComponents(month: 1, day: -1), to: monthStart)!
    let gridStart = startOfWeek(monthStart)
    let gridEndWeek = startOfWeek(monthEnd)
    let gridEnd = calendar.date(byAdding: .day, value: 6, to: gridEndWeek)!
    var days: [Date] = []
    var cursor = gridStart
    while cursor <= gridEnd {
      days.append(cursor)
      cursor = calendar.date(byAdding: .day, value: 1, to: cursor)!
    }
    return days
  }

  static func addDays(_ date: Date, _ amount: Int) -> Date {
    calendar.date(byAdding: .day, value: amount, to: date)!
  }

  static func addMonths(_ date: Date, _ amount: Int) -> Date {
    calendar.date(byAdding: .month, value: amount, to: date)!
  }

  static func addMinutes(_ date: Date, _ amount: Int) -> Date {
    calendar.date(byAdding: .minute, value: amount, to: date)!
  }

  static func atTime(_ day: Date, hour: Int, minute: Int = 0) -> Date {
    var comps = calendar.dateComponents([.year, .month, .day], from: day)
    comps.hour = hour
    comps.minute = minute
    comps.second = 0
    return calendar.date(from: comps)!
  }

  static func isSameDay(_ a: Date, _ b: Date) -> Bool {
    calendar.isDate(a, inSameDayAs: b)
  }

  static func isSameMonth(_ a: Date, _ b: Date) -> Bool {
    calendar.isDate(a, equalTo: b, toGranularity: .month)
  }

  static func startOfDay(_ date: Date) -> Date {
    calendar.startOfDay(for: date)
  }

  static func endOfDay(_ date: Date) -> Date {
    let start = startOfDay(date)
    return calendar.date(byAdding: DateComponents(day: 1, second: -1), to: start)!
  }

  static func startOfMonth(_ date: Date) -> Date {
    calendar.date(from: calendar.dateComponents([.year, .month], from: date))!
  }

  static func daysInMonth(_ date: Date) -> Int {
    calendar.range(of: .day, in: .month, for: date)?.count ?? 30
  }

  static func overlaps(_ aStart: Date, _ aEnd: Date, _ bStart: Date, _ bEnd: Date) -> Bool {
    aStart < bEnd && bStart < aEnd
  }

  static func eventTouchesDay(start: Date, end: Date, day: Date) -> Bool {
    let dayStart = startOfDay(day)
    let dayEnd = endOfDay(day)
    return (start >= dayStart && start <= dayEnd)
      || (end >= dayStart && end <= dayEnd)
      || (start < dayStart && end > dayEnd)
      || isSameDay(start, day)
  }

  static func travelTouchesDay(travelStart: Date, travelEnd: Date, day: Date) -> Bool {
    let dayStart = startOfDay(day).timeIntervalSince1970
    let rangeStart = startOfDay(travelStart).timeIntervalSince1970
    let rangeEnd = endOfDay(travelEnd).timeIntervalSince1970
    return dayStart >= rangeStart && dayStart <= rangeEnd
  }

  static func differenceInMinutes(_ end: Date, _ start: Date) -> Int {
    Int(end.timeIntervalSince(start) / 60)
  }

  static func differenceInCalendarDays(_ a: Date, _ b: Date) -> Int {
    calendar.dateComponents([.day], from: startOfDay(b), to: startOfDay(a)).day ?? 0
  }

  static func weekLabel(anchor: Date, today: Date) -> String {
    let days = getWeekDays(anchor)
    let todayWeek = getWeekDays(today)
    if isSameDay(days[0], todayWeek[0]) { return "This week" }
    let start = days[0]
    let end = days[6]
    if calendar.component(.month, from: start) == calendar.component(.month, from: end) {
      return "\(format(start, "MMM d")) – \(format(end, "d"))"
    }
    return "\(format(start, "MMM d")) – \(format(end, "MMM d"))"
  }

  static func formatEventTime(_ start: Date, _ end: Date) -> String {
    "\(format(start, "h:mm a")) – \(format(end, "h:mm a"))"
  }

  static func slotDurationLabel(_ minutes: Int) -> String {
    if minutes < 60 { return "\(minutes)m" }
    let h = minutes / 60
    let m = minutes % 60
    return m == 0 ? "\(h)h" : "\(h)h \(m)m"
  }

  static func format(_ date: Date, _ template: String) -> String {
    let formatter = DateFormatter()
    formatter.locale = Locale(identifier: "en_US_POSIX")
    formatter.dateFormat = template
    return formatter.string(from: date)
  }

  static func isWeekday(_ day: Date) -> Bool {
    let d = calendar.component(.weekday, from: day)
    return d >= 2 && d <= 6
  }
}
