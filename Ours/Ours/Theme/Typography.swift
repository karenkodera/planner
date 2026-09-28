import SwiftUI

enum AppFont {
  static func poppins(_ weight: Font.Weight = .regular, size: CGFloat) -> Font {
    let name: String
    switch weight {
    case .bold, .heavy, .black: name = "Poppins-Bold"
    case .semibold: name = "Poppins-SemiBold"
    case .medium: name = "Poppins-Medium"
    default: name = "Poppins-Regular"
    }
    return .custom(name, size: size)
  }

  static func mono(_ weight: Font.Weight = .regular, size: CGFloat) -> Font {
    let name = weight == .medium || weight == .semibold || weight == .bold
      ? "IBMPlexMono-Medium"
      : "IBMPlexMono-Regular"
    return .custom(name, size: size)
  }
}

enum AppType {
  static let title = AppFont.poppins(.semibold, size: 24)
  static let subtitle = AppFont.poppins(.medium, size: 17)
  static let body = AppFont.poppins(.regular, size: 15)
  static let bodyMedium = AppFont.poppins(.medium, size: 15)
  static let caption = AppFont.poppins(.medium, size: 12)
}
