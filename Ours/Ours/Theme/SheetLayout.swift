import SwiftUI

enum SheetLayout {
  static let topInset: CGFloat = 22
  static let maxSheetFraction: CGFloat = 0.9
}

struct SheetContentHeightKey: PreferenceKey {
  static var defaultValue: CGFloat = 0
  static func reduce(value: inout CGFloat, nextValue: () -> CGFloat) {
    value = max(value, nextValue())
  }
}

extension View {
  func oursSheetTopInset() -> some View {
    padding(.top, SheetLayout.topInset)
  }

  func reportSheetContentHeight() -> some View {
    background(
      GeometryReader { geo in
        Color.clear.preference(key: SheetContentHeightKey.self, value: geo.size.height)
      }
    )
  }
}

struct SheetChrome<Content: View, Footer: View>: View {
  let title: String
  var subtitle: String?
  var showTitle = true
  let onClose: () -> Void
  @ViewBuilder var content: Content
  @ViewBuilder var footer: Footer

  init(
    title: String,
    subtitle: String? = nil,
    showTitle: Bool = true,
    onClose: @escaping () -> Void,
    @ViewBuilder content: () -> Content,
    @ViewBuilder footer: () -> Footer = { EmptyView() }
  ) {
    self.title = title
    self.subtitle = subtitle
    self.showTitle = showTitle
    self.onClose = onClose
    self.content = content()
    self.footer = footer()
  }

  var body: some View {
    VStack(alignment: .leading, spacing: 0) {
      header
      content
      footer
    }
    .padding(.horizontal, 22)
    .padding(.top, 4)
    .padding(.bottom, 16)
    .frame(maxWidth: .infinity, alignment: .topLeading)
    .background(AppColor.white)
    .reportSheetContentHeight()
  }

  private var header: some View {
    HStack(alignment: .top, spacing: 12) {
      if showTitle {
        VStack(alignment: .leading, spacing: 8) {
          Text(title)
            .font(AppFont.poppins(.semibold, size: 20))
            .foregroundStyle(AppColor.ink)
          if let subtitle {
            Text(subtitle)
              .font(AppType.body)
              .foregroundStyle(AppColor.muted)
          }
        }
      }
      Spacer(minLength: 8)
      Button(action: onClose) {
        Image(systemName: "xmark")
          .font(.system(size: 13, weight: .semibold))
          .foregroundStyle(AppColor.inkSoft)
          .frame(width: 32, height: 32)
          .background(AppColor.fill)
          .clipShape(Circle())
      }
      .buttonStyle(ScaleButtonStyle(scaleTo: 0.92))
      .accessibilityLabel("Close")
    }
    .padding(.bottom, showTitle ? 18 : 8)
  }
}

struct SheetCloseButton: View {
  let action: () -> Void

  var body: some View {
    HStack {
      Spacer()
      Button(action: action) {
        Image(systemName: "xmark")
          .font(.system(size: 13, weight: .semibold))
          .foregroundStyle(AppColor.inkSoft)
          .frame(width: 32, height: 32)
          .background(AppColor.fill)
          .clipShape(Circle())
      }
      .buttonStyle(ScaleButtonStyle(scaleTo: 0.92))
      .accessibilityLabel("Close")
    }
    .padding(.horizontal, 20)
    .padding(.bottom, 8)
  }
}

struct ReservationConfirmedBanner: View {
  @State private var appeared = false

  var body: some View {
    VStack(spacing: 14) {
      Image(systemName: "checkmark.circle.fill")
        .font(.system(size: 52))
        .foregroundStyle(AppColor.success)
        .scaleEffect(appeared ? 1 : 0.55)
      Text("Reservation confirmed")
        .font(AppFont.poppins(.semibold, size: 18))
        .foregroundStyle(AppColor.ink)
        .opacity(appeared ? 1 : 0)
    }
    .frame(maxWidth: .infinity)
    .padding(.vertical, 28)
    .onAppear {
      withAnimation(.spring(response: 0.48, dampingFraction: 0.72)) {
        appeared = true
      }
    }
  }
}
