import SwiftUI

enum AppColor {
  static let canvas = Color(hex: 0xFFFFFF)
  static let canvasElevated = Color(hex: 0xFAFAFB)
  static let ink = Color(hex: 0x1C1C1E)
  static let inkSoft = Color(hex: 0x3A3A3C)
  static let muted = Color(hex: 0x8E8E93)
  static let hairline = Color(red: 60 / 255, green: 60 / 255, blue: 67 / 255, opacity: 0.12)
  static let fill = Color(red: 120 / 255, green: 120 / 255, blue: 128 / 255, opacity: 0.12)
  static let fillStrong = Color(red: 120 / 255, green: 120 / 255, blue: 128 / 255, opacity: 0.2)
  static let white = Color.white
  static let black = Color.black

  static let accent = Color(hex: 0x1C1C1E)
  static let accentSoft = Color(red: 28 / 255, green: 28 / 255, blue: 30 / 255, opacity: 0.08)
  static let me = Color(hex: 0x007AFF)
  static let meSoft = Color(red: 0 / 255, green: 122 / 255, blue: 255 / 255, opacity: 0.1)
  static let partner = Color(hex: 0x30B0C7)
  static let partnerSoft = Color(red: 48 / 255, green: 176 / 255, blue: 199 / 255, opacity: 0.12)
  static let shared = Color(hex: 0xFF375F)
  static let sharedSoft = Color(red: 255 / 255, green: 55 / 255, blue: 95 / 255, opacity: 0.1)

  static let success = Color(hex: 0x34C759)
  static let danger = Color(hex: 0xFF3B30)
  static let mist = Color(hex: 0xF2F2F7)
  static let mistDeep = Color(hex: 0xE5E5EA)
  static let meDeep = Color(hex: 0x0056B3)
  static let partnerDeep = Color(hex: 0x1F7A8A)
  static let sharedDeep = Color(hex: 0xD12B4A)

  static let emptyPlans = Color(hex: 0xC7C7CC)
  static let avatarColors: [Color] = AvatarPalette.swatches.map(\.color)
}

enum AvatarPalette {
  static let swatches: [(hex: String, color: Color)] = [
    ("007AFF", AppColor.me),
    ("5856D6", Color(hex: 0x5856D6)),
    ("AF52DE", Color(hex: 0xAF52DE)),
    ("FF9500", Color(hex: 0xFF9500)),
    ("34C759", Color(hex: 0x34C759)),
    ("30B0C7", Color(hex: 0x30B0C7)),
    ("1C1C1E", Color(hex: 0x1C1C1E)),
  ]

  static func color(hex: String) -> Color {
    swatches.first { $0.hex.caseInsensitiveCompare(hex) == .orderedSame }?.color ?? AppColor.me
  }
}

extension Color {
  init(hex: UInt, opacity: Double = 1) {
    self.init(
      .sRGB,
      red: Double((hex >> 16) & 0xFF) / 255,
      green: Double((hex >> 8) & 0xFF) / 255,
      blue: Double(hex & 0xFF) / 255,
      opacity: opacity
    )
  }

  func withAlpha(_ alpha: Double) -> Color {
    self.opacity(alpha)
  }
}
