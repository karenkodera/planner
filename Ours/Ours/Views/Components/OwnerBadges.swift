import SwiftUI

struct OwnerBadge: View {
  let letter: String
  let tone: EventOwner
  var meColor: Color = AppColor.me

  var body: some View {
    Text(letter)
      .font(AppFont.poppins(.bold, size: 10))
      .foregroundStyle(AppColor.white)
      .frame(width: 22, height: 22)
      .background(badgeColor)
      .clipShape(Circle())
  }

  private var badgeColor: Color {
    switch tone {
    case .me: return meColor
    case .partner: return AppColor.partner
    case .shared: return AppColor.shared
    }
  }
}

struct LinkedOwnerBadges: View {
  let meInitial: String
  let partnerInitial: String

  var body: some View {
    ZStack(alignment: .leading) {
      OwnerBadge(letter: meInitial, tone: .shared)
      OwnerBadge(letter: partnerInitial, tone: .shared)
        .overlay(Circle().stroke(AppColor.white, lineWidth: 1.5))
        .offset(x: 14)
    }
    .frame(width: 36, height: 22, alignment: .leading)
  }
}

struct OwnerBadgesView: View {
  let owner: EventOwner
  let meInitial: String
  let partnerInitial: String
  var meColor: Color = AppColor.me

  var body: some View {
    switch owner {
    case .me:
      OwnerBadge(letter: meInitial, tone: .me, meColor: meColor)
    case .partner:
      OwnerBadge(letter: partnerInitial, tone: .partner)
    case .shared:
      LinkedOwnerBadges(meInitial: meInitial, partnerInitial: partnerInitial)
    }
  }
}

struct MiniInitial: View {
  let letter: String
  let tone: EventOwner
  var selected = false
  var meColor: Color = AppColor.me

  var body: some View {
    Text(letter)
      .font(AppFont.poppins(.bold, size: 8))
      .foregroundStyle(textColor)
      .frame(width: 14, height: 14)
      .background(bg)
      .clipShape(Circle())
  }

  private var bg: Color {
    if selected {
      return tone == .shared ? Color.white.opacity(0.95) : Color.white.opacity(0.92)
    }
    switch tone {
    case .me: return meColor
    case .partner: return AppColor.partner
    case .shared: return AppColor.shared
    }
  }

  private var textColor: Color {
    if selected {
      return tone == .shared ? AppColor.shared : AppColor.ink
    }
    return AppColor.white
  }
}

struct LinkedMonthMarks: View {
  let meInitial: String
  let partnerInitial: String
  var selected = false

  var body: some View {
    ZStack(alignment: .leading) {
      MiniInitial(letter: meInitial, tone: .shared, selected: selected)
      MiniInitial(letter: partnerInitial, tone: .shared, selected: selected)
        .overlay(
          Circle().stroke(selected ? AppColor.ink : AppColor.white, lineWidth: 1)
        )
        .offset(x: 9)
    }
    .frame(width: 23, height: 14, alignment: .leading)
  }
}

struct PlanParticipantsPicker: View {
  @Binding var includePartner: Bool
  let meInitial: String
  let partnerInitial: String
  var meColor: Color = AppColor.me
  var partnerLinked: Bool = true

  var body: some View {
    HStack(spacing: 8) {
      participantCircle(
        letter: meInitial,
        filled: true,
        fill: meColor
      )

      if partnerLinked {
        Button {
          includePartner.toggle()
          UISelectionFeedbackGenerator().selectionChanged()
        } label: {
          participantCircle(
            letter: partnerInitial,
            filled: includePartner,
            fill: AppColor.partner
          )
        }
        .buttonStyle(ScaleButtonStyle(scaleTo: 0.94))
      }

      Spacer(minLength: 0)
    }
  }

  private func participantCircle(letter: String, filled: Bool, fill: Color) -> some View {
    Text(letter)
      .font(AppFont.poppins(.semibold, size: 15))
      .foregroundStyle(filled ? AppColor.white : AppColor.muted)
      .frame(width: 40, height: 40)
      .background(filled ? fill : Color.clear)
      .clipShape(Circle())
      .overlay {
        if filled {
          Circle().stroke(fill.opacity(0.35), lineWidth: 2)
        } else {
          Circle().strokeBorder(
            AppColor.muted.opacity(0.45),
            style: StrokeStyle(lineWidth: 1.5, dash: [4, 3])
          )
        }
      }
  }
}

struct ScaleButtonStyle: ButtonStyle {
  var scaleTo: CGFloat = 0.96

  func makeBody(configuration: Configuration) -> some View {
    configuration.label
      .scaleEffect(configuration.isPressed ? scaleTo : 1)
      .animation(.spring(response: 0.25, dampingFraction: 0.7), value: configuration.isPressed)
  }
}
