import Foundation

enum FindTime {
  private static let weekdayStart = 17
  private static let weekendStart = 10
  private static let dayEnd = 22
  private static let minSlot = 45

  private struct BusyInterval {
    var start: Date
    var end: Date
  }

  static func findFreeSlots(
    events: [CalendarEvent],
    weekAnchor: Date,
    scope: FindTimeScope,
    maxSlots: Int = 8
  ) -> [FreeSlot] {
    switch scope {
    case .solo:
      return slotsFromGaps(
        weekAnchor: weekAnchor,
        gapProvider: { day in
          freeGaps(busyForPerson(events, day: day, owners: [.me, .shared]), day: day)
        },
        maxSlots: maxSlots
      )
    case .together:
      return slotsFromGaps(
        weekAnchor: weekAnchor,
        gapProvider: { day in
          let mine = freeGaps(busyForPerson(events, day: day, owners: [.me, .shared]), day: day)
          let theirs = freeGaps(busyForPerson(events, day: day, owners: [.partner, .shared]), day: day)
          return intersectGaps(mine, theirs)
        },
        maxSlots: maxSlots
      )
    }
  }

  static func findMutualFreeSlots(
    events: [CalendarEvent],
    weekAnchor: Date,
    maxSlots: Int = 8
  ) -> [FreeSlot] {
    findFreeSlots(events: events, weekAnchor: weekAnchor, scope: .together, maxSlots: maxSlots)
  }

  private static func slotsFromGaps(
    weekAnchor: Date,
    gapProvider: (Date) -> [BusyInterval],
    maxSlots: Int
  ) -> [FreeSlot] {
    let days = DateUtils.getWeekDays(weekAnchor)
    var slots: [FreeSlot] = []

    for day in days {
      let gaps = gapProvider(day)
      for gap in gaps {
        var cursor = gap.start
        while DateUtils.differenceInMinutes(gap.end, cursor) >= minSlot {
          let remaining = DateUtils.differenceInMinutes(gap.end, cursor)
          let chunkEnd = remaining > 120 ? DateUtils.addMinutes(cursor, 120) : gap.end
          let duration = DateUtils.differenceInMinutes(chunkEnd, cursor)
          slots.append(
            FreeSlot(
              id: "slot-\(day.timeIntervalSince1970)-\(cursor.timeIntervalSince1970)",
              start: cursor,
              end: chunkEnd,
              dayLabel: DateUtils.format(day, "EEE d"),
              timeLabel: "\(DateUtils.format(cursor, "h:mm a")) – \(DateUtils.format(chunkEnd, "h:mm a"))",
              durationMinutes: duration
            )
          )
          if slots.count >= maxSlots { return slots }
          cursor = chunkEnd
          if DateUtils.differenceInMinutes(gap.end, cursor) < minSlot { break }
          cursor = DateUtils.addMinutes(cursor, 30)
        }
      }
    }
    return slots
  }

  private static func dayWindowStart(_ day: Date) -> Date {
    let dow = DateUtils.calendar.component(.weekday, from: day)
    let isWeekend = dow == 1 || dow == 7
    return DateUtils.atTime(day, hour: isWeekend ? weekendStart : weekdayStart)
  }

  private static func busyForPerson(
    _ events: [CalendarEvent],
    day: Date,
    owners: [EventOwner]
  ) -> [BusyInterval] {
    events
      .compactMap { RecurrenceUtils.occurrenceOnDay($0, day: day) }
      .filter { owners.contains($0.owner) }
      .map { BusyInterval(start: $0.start, end: $0.end) }
      .sorted { $0.start < $1.start }
  }

  private static func mergeIntervals(_ intervals: [BusyInterval]) -> [BusyInterval] {
    guard let first = intervals.first else { return [] }
    var merged = [first]
    for cur in intervals.dropFirst() {
      var last = merged[merged.count - 1]
      if cur.start <= last.end {
        last.end = max(last.end, cur.end)
        merged[merged.count - 1] = last
      } else {
        merged.append(cur)
      }
    }
    return merged
  }

  private static func freeGaps(_ busy: [BusyInterval], day: Date) -> [BusyInterval] {
    let windowStart = dayWindowStart(day)
    let windowEnd = DateUtils.atTime(day, hour: dayEnd)
    let merged = mergeIntervals(
      busy.filter { DateUtils.overlaps($0.start, $0.end, windowStart, windowEnd) }
    )
    var gaps: [BusyInterval] = []
    var cursor = windowStart
    for block in merged {
      let start = max(block.start, windowStart)
      let end = min(block.end, windowEnd)
      if start > cursor { gaps.append(BusyInterval(start: cursor, end: start)) }
      cursor = max(cursor, end)
    }
    if cursor < windowEnd { gaps.append(BusyInterval(start: cursor, end: windowEnd)) }
    return gaps.filter { DateUtils.differenceInMinutes($0.end, $0.start) >= minSlot }
  }

  private static func intersectGaps(_ a: [BusyInterval], _ b: [BusyInterval]) -> [BusyInterval] {
    var result: [BusyInterval] = []
    var i = 0
    var j = 0
    while i < a.count && j < b.count {
      let start = max(a[i].start, b[j].start)
      let end = min(a[i].end, b[j].end)
      if start < end && DateUtils.differenceInMinutes(end, start) >= minSlot {
        result.append(BusyInterval(start: start, end: end))
      }
      if a[i].end < b[j].end { i += 1 } else { j += 1 }
    }
    return result
  }
}
