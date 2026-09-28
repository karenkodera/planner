import Foundation

enum RecurrenceUtils {
  static func occurrenceOnDay(_ event: CalendarEvent, day: Date) -> CalendarEvent? {
    let dayStart = DateUtils.startOfDay(day)
    let eventDay = DateUtils.startOfDay(event.start)
    if dayStart < eventDay { return nil }

    let recurrence = event.recurrence ?? .none
    if recurrence == .none {
      return DateUtils.eventTouchesDay(start: event.start, end: event.end, day: day) ? event : nil
    }

    let daysDiff = DateUtils.differenceInCalendarDays(dayStart, eventDay)
    let matches: Bool
    switch recurrence {
    case .daily: matches = true
    case .weekly: matches = daysDiff % 7 == 0
    case .biweekly: matches = daysDiff % 14 == 0
    case .monthly:
      matches = DateUtils.calendar.component(.day, from: day)
        == DateUtils.calendar.component(.day, from: event.start)
    case .none: matches = false
    }
    guard matches else { return nil }

    let duration = event.end.timeIntervalSince(event.start)
    var start = day
    let hour = DateUtils.calendar.component(.hour, from: event.start)
    let minute = DateUtils.calendar.component(.minute, from: event.start)
    start = DateUtils.atTime(day, hour: hour, minute: minute)
    let end = start.addingTimeInterval(duration)
    var copy = event
    copy.start = start
    copy.end = end
    return copy
  }
}
