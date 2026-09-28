import Foundation

struct ParsedVoiceEvent {
  var title: String
  var owner: EventOwner
  var start: Date
  var end: Date
  var location: String?
  var confidenceNote: String
}

enum VoiceParse {
  static let demoPhrases = [
    "Dinner with Thomas Friday at 7",
    "Climbing Wednesday at 6:30",
    "Date night Saturday at 8pm",
    "Yoga Thursday at 6pm",
  ]

  private static let dayWords: [String: Int] = [
    "monday": 0, "mon": 0,
    "tuesday": 1, "tue": 1, "tues": 1,
    "wednesday": 2, "wed": 2,
    "thursday": 3, "thu": 3, "thurs": 3,
    "friday": 4, "fri": 4,
    "saturday": 5, "sat": 5,
    "sunday": 6, "sun": 6,
  ]

  static func parseNaturalEvent(_ utterance: String, anchor: Date = MockData.today) -> ParsedVoiceEvent {
    let day = resolveDay(utterance, anchor: anchor)
    let time = resolveTime(utterance)
    let duration = resolveDuration(utterance)
    let start = DateUtils.atTime(day, hour: time.hour, minute: time.minute)
    let end = DateUtils.addMinutes(start, duration)
    let owner = resolveOwner(utterance)
    let title = resolveTitle(utterance)
    return ParsedVoiceEvent(
      title: title,
      owner: owner,
      start: start,
      end: end,
      confidenceNote: owner == .shared
        ? "Heard as a shared plan — Thomas will see a request."
        : "Added to your calendar."
    )
  }

  private static func weekMonday(from: Date) -> Date {
    DateUtils.startOfWeek(from)
  }

  private static func resolveDay(_ text: String, anchor: Date) -> Date {
    let lower = text.lowercased()
    if lower.contains("tomorrow") { return DateUtils.addDays(anchor, 1) }
    if lower.contains("today") { return anchor }
    for (word, offset) in dayWords {
      if lower.range(of: "\\b\(word)\\b", options: .regularExpression) != nil {
        return DateUtils.addDays(weekMonday(from: anchor), offset)
      }
    }
    return DateUtils.addDays(anchor, 1)
  }

  private static func resolveTime(_ text: String) -> (hour: Int, minute: Int) {
    let lower = text.lowercased()
    let pattern = #"(\d{1,2})(?::(\d{2}))?\s*(am|pm)?"#
    if let match = lower.range(of: pattern, options: .regularExpression) {
      let snippet = String(lower[match])
      let regex = try! NSRegularExpression(pattern: pattern)
      let ns = snippet as NSString
      if let result = regex.firstMatch(in: snippet, range: NSRange(location: 0, length: ns.length)) {
        var hour = Int(ns.substring(with: result.range(at: 1))) ?? 18
        let minute = result.range(at: 2).location != NSNotFound
          ? Int(ns.substring(with: result.range(at: 2))) ?? 0
          : 0
        let meridiem = result.range(at: 3).location != NSNotFound
          ? ns.substring(with: result.range(at: 3))
          : nil
        if meridiem == "pm", hour < 12 { hour += 12 }
        if meridiem == "am", hour == 12 { hour = 0 }
        if meridiem == nil, hour < 12 { hour += 12 }
        if hour < 17 { hour = 17 }
        return (hour, minute)
      }
    }
    if lower.contains("evening") || lower.contains("dinner") || lower.contains("date") {
      return (19, 0)
    }
    return (18, 0)
  }

  private static func resolveDuration(_ text: String) -> Int {
    let lower = text.lowercased()
    if let match = lower.range(of: #"(\d+(?:\.\d+)?)\s*hours?"#, options: .regularExpression) {
      let digits = String(lower[match]).components(separatedBy: CharacterSet.decimalDigits.inverted.union(CharacterSet(charactersIn: ".")).inverted).joined()
      // simpler parse:
      if let regex = try? NSRegularExpression(pattern: #"(\d+(?:\.\d+)?)"#),
         let m = regex.firstMatch(in: String(lower[match]), range: NSRange(location: 0, length: (lower[match] as NSString).length)) {
        let num = Double((String(lower[match]) as NSString).substring(with: m.range)) ?? 1
        return Int((num * 60).rounded())
      }
      _ = digits
    }
    if let match = lower.range(of: #"(\d+)\s*min"#, options: .regularExpression) {
      let nums = String(lower[match]).filter(\.isNumber)
      return Int(nums) ?? 90
    }
    if lower.contains("dinner") || lower.contains("date") { return 120 }
    if lower.contains("lunch") || lower.contains("coffee") { return 60 }
    return 90
  }

  private static func resolveOwner(_ text: String) -> EventOwner {
    let lower = text.lowercased()
    let sharedHints = ["together", "with thomas", "with us", "date", "shared", "both", "with alex"]
    if sharedHints.contains(where: { lower.contains($0) }) { return .shared }
    return .me
  }

  private static func resolveTitle(_ text: String) -> String {
    var cleaned = text
    let patterns = [
      #"\b(add|create|schedule|put|please|can you|i want to|remind me to)\b"#,
      #"\b(on|at|from|this|next)\b"#,
      #"\b(monday|tuesday|wednesday|thursday|friday|saturday|sunday|today|tomorrow|mon|tue|wed|thu|fri|sat|sun)\b"#,
      #"\b\d{1,2}(?::\d{2})?\s*(am|pm)?\b"#,
      #"\b(am|pm)\b"#,
    ]
    for pattern in patterns {
      cleaned = cleaned.replacingOccurrences(of: pattern, with: " ", options: [.regularExpression, .caseInsensitive])
    }
    cleaned = cleaned.replacingOccurrences(of: #"\s+"#, with: " ", options: .regularExpression)
      .trimmingCharacters(in: .whitespacesAndNewlines)
    if cleaned.isEmpty { cleaned = "New plan" }
    return cleaned.prefix(1).uppercased() + cleaned.dropFirst()
  }
}
