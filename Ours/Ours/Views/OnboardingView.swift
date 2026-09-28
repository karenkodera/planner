import SwiftUI

struct OnboardingView: View {
  @EnvironmentObject private var store: CalendarStore
  var onFinished: () -> Void

  @State private var phase: Phase = .explain
  @State private var page = 0
  @State private var appear = false
  @State private var name = ""
  @State private var phone = ""
  @State private var email = ""
  @State private var password = ""
  @State private var otp = ""
  @State private var otpError = false
  @State private var resendSeconds = 0

  private enum Phase {
    case explain
    case signup
    case otp
    case email
  }

  private let pages: [OnboardingPage] = [
    OnboardingPage(
      id: 0,
      brandFirst: true,
      title: "Ours",
      body: "One calm place for your plans—and the person you share them with.",
      visual: .welcome
    ),
    OnboardingPage(
      id: 1,
      brandFirst: false,
      title: "Both calendars, one week",
      body: "Yours, theirs, and together—side by side, without the back-and-forth.",
      visual: .week
    ),
    OnboardingPage(
      id: 2,
      brandFirst: false,
      title: "Find time that works",
      body: "Spot open windows, or share your availability so friends can pick a time.",
      visual: .findTime
    ),
  ]

  private var canSendCode: Bool {
    !name.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
      && phoneDigits.count >= 10
  }

  private var canVerifyOTP: Bool {
    otp.filter(\.isNumber).count == 6
  }

  private var canCreateEmailAccount: Bool {
    !name.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
      && email.contains("@")
      && password.count >= 6
  }

  private var phoneDigits: String {
    phone.filter(\.isNumber)
  }

  private var maskedPhone: String {
    let digits = phoneDigits
    guard digits.count >= 4 else { return phone }
    let last4 = String(digits.suffix(4))
    return "•••• \(last4)"
  }

  var body: some View {
    ZStack {
      background

      VStack(spacing: 0) {
        topBar
        switch phase {
        case .explain:
          explainContent
        case .signup:
          signupContent
        case .otp:
          otpContent
        case .email:
          emailContent
        }
      }
    }
    .onAppear {
      withAnimation(.spring(response: 0.55, dampingFraction: 0.82)) {
        appear = true
      }
    }
  }

  private var topBar: some View {
    HStack {
      if phase != .explain {
        Button(action: goBack) {
          Image(systemName: "chevron.left")
            .font(.system(size: 15, weight: .semibold))
            .foregroundStyle(AppColor.inkSoft)
            .frame(width: 36, height: 36)
        }
      }
      Spacer()
      if phase == .explain {
        Button("Skip") {
          goSignup()
        }
        .font(AppFont.poppins(.medium, size: 15))
        .foregroundStyle(AppColor.muted)
      }
    }
    .padding(.horizontal, 24)
    .padding(.top, 12)
    .frame(height: 44)
  }

  private var explainContent: some View {
    VStack(spacing: 0) {
      TabView(selection: $page) {
        ForEach(pages) { item in
          pageContent(item)
            .tag(item.id)
        }
      }
      .tabViewStyle(.page(indexDisplayMode: .never))
      .animation(.easeInOut(duration: 0.28), value: page)

      pageDots
        .padding(.bottom, 18)

      PrimaryButton(title: "Continue", action: advanceExplain)
        .padding(.horizontal, 24)
        .padding(.bottom, 28)
    }
  }

  private var signupContent: some View {
    VStack(spacing: 0) {
      ScrollView(showsIndicators: false) {
        VStack(alignment: .leading, spacing: 0) {
          signupHeader(
            title: "Create your account",
            subtitle: "Start with your phone, or use email."
          )

          VStack(spacing: 14) {
            field("Your name", text: $name, keyboard: .default, contentType: .name)
            field("Phone number", text: $phone, keyboard: .phonePad, contentType: .telephoneNumber)
          }

          PrimaryButton(title: "Send code", disabled: !canSendCode) {
            sendCode()
          }

          orDivider
            .padding(.top, 8)
            .padding(.bottom, 18)

          VStack(spacing: 10) {
            authOptionButton(
              title: "Continue with Google",
              systemImage: "g.circle.fill"
            ) {
              finishWithGoogle()
            }

            authOptionButton(
              title: "Continue with email",
              systemImage: "envelope.fill"
            ) {
              withAnimation(.easeInOut(duration: 0.28)) {
                phase = .email
              }
            }
          }
        }
        .padding(.horizontal, 28)
        .padding(.bottom, 28)
      }
    }
  }

  private var otpContent: some View {
    VStack(spacing: 0) {
      ScrollView(showsIndicators: false) {
        VStack(alignment: .leading, spacing: 0) {
          signupHeader(
            title: "Enter the code",
            subtitle: "We sent a 6-digit code to \(maskedPhone)."
          )

          field("One-time code", text: $otp, keyboard: .numberPad, contentType: .oneTimeCode)
            .onChange(of: otp) { _, value in
              let digits = String(value.filter(\.isNumber).prefix(6))
              if digits != value { otp = digits }
              otpError = false
            }

          if otpError {
            Text("That code didn’t work. Try again.")
              .font(AppFont.poppins(.regular, size: 13))
              .foregroundStyle(AppColor.danger)
              .padding(.top, 10)
          }

          PrimaryButton(title: "Verify", disabled: !canVerifyOTP) {
            verifyOTP()
          }

          Button {
            guard resendSeconds == 0 else { return }
            sendCode()
          } label: {
            Text(resendSeconds > 0 ? "Resend code in \(resendSeconds)s" : "Resend code")
              .font(AppType.bodyMedium)
              .foregroundStyle(resendSeconds > 0 ? AppColor.muted : AppColor.ink)
              .frame(maxWidth: .infinity)
              .padding(.vertical, 14)
          }
          .disabled(resendSeconds > 0)
          .padding(.top, 4)
        }
        .padding(.horizontal, 28)
        .padding(.bottom, 28)
      }
    }
  }

  private var emailContent: some View {
    VStack(spacing: 0) {
      ScrollView(showsIndicators: false) {
        VStack(alignment: .leading, spacing: 0) {
          signupHeader(
            title: "Continue with email",
            subtitle: "Use an email and password to sign in later."
          )

          VStack(spacing: 14) {
            field("Your name", text: $name, keyboard: .default, contentType: .name)
            field("Email", text: $email, keyboard: .emailAddress, contentType: .emailAddress)
            secureField("Password", text: $password)
          }

          Text("At least 6 characters.")
            .font(AppFont.poppins(.regular, size: 12))
            .foregroundStyle(AppColor.muted)
            .padding(.top, 8)

          PrimaryButton(title: "Create account", disabled: !canCreateEmailAccount) {
            finishWithEmail()
          }
        }
        .padding(.horizontal, 28)
        .padding(.bottom, 28)
      }
    }
  }

  private func signupHeader(title: String, subtitle: String) -> some View {
    VStack(alignment: .leading, spacing: 12) {
      Text(title)
        .font(AppFont.poppins(.semibold, size: 28))
        .foregroundStyle(AppColor.ink)
      Text(subtitle)
        .font(AppFont.poppins(.regular, size: 16))
        .foregroundStyle(AppColor.inkSoft)
        .lineSpacing(3)
    }
    .frame(maxWidth: .infinity, alignment: .leading)
    .padding(.bottom, 28)
    .opacity(appear ? 1 : 0)
  }

  private var orDivider: some View {
    HStack(spacing: 12) {
      Rectangle()
        .fill(AppColor.hairline)
        .frame(height: 1)
      Text("or")
        .font(AppFont.poppins(.medium, size: 13))
        .foregroundStyle(AppColor.muted)
      Rectangle()
        .fill(AppColor.hairline)
        .frame(height: 1)
    }
  }

  private func authOptionButton(title: String, systemImage: String, action: @escaping () -> Void) -> some View {
    Button(action: action) {
      HStack(spacing: 10) {
        Image(systemName: systemImage)
          .font(.system(size: 18, weight: .semibold))
          .foregroundStyle(AppColor.ink)
          .frame(width: 22)
        Text(title)
          .font(AppType.bodyMedium)
          .foregroundStyle(AppColor.ink)
        Spacer()
      }
      .padding(.horizontal, 16)
      .padding(.vertical, 16)
      .background(AppColor.white.opacity(0.72))
      .overlay(
        RoundedRectangle(cornerRadius: 18, style: .continuous)
          .stroke(AppColor.ink, lineWidth: 1.5)
      )
      .clipShape(RoundedRectangle(cornerRadius: 18, style: .continuous))
    }
    .buttonStyle(ScaleButtonStyle(scaleTo: 0.98))
  }

  private var background: some View {
    ZStack {
      AppColor.canvas.ignoresSafeArea()
      LinearGradient(
        colors: [
          AppColor.meSoft.opacity(0.55),
          AppColor.white,
          AppColor.partnerSoft.opacity(0.4),
        ],
        startPoint: .topLeading,
        endPoint: .bottomTrailing
      )
      .ignoresSafeArea()
    }
  }

  private func pageContent(_ item: OnboardingPage) -> some View {
    VStack(spacing: 0) {
      Spacer(minLength: 12)

      OnboardingVisual(kind: item.visual)
        .frame(height: 280)
        .scaleEffect(appear ? 1 : 0.94)
        .opacity(appear ? 1 : 0)
        .padding(.horizontal, 28)

      Spacer(minLength: 28)

      VStack(alignment: .leading, spacing: 12) {
        if item.brandFirst {
          Text(item.title)
            .font(AppFont.poppins(.bold, size: 42))
            .foregroundStyle(AppColor.ink)
            .tracking(-0.5)
        } else {
          Text(item.title)
            .font(AppFont.poppins(.semibold, size: 28))
            .foregroundStyle(AppColor.ink)
        }
        Text(item.body)
          .font(AppFont.poppins(.regular, size: 16))
          .foregroundStyle(AppColor.inkSoft)
          .lineSpacing(3)
          .fixedSize(horizontal: false, vertical: true)
      }
      .frame(maxWidth: .infinity, alignment: .leading)
      .padding(.horizontal, 28)
      .padding(.bottom, 20)
    }
  }

  private var pageDots: some View {
    HStack(spacing: 8) {
      ForEach(pages) { item in
        Capsule()
          .fill(item.id == page ? AppColor.ink : AppColor.fillStrong)
          .frame(width: item.id == page ? 22 : 7, height: 7)
          .animation(.spring(response: 0.35, dampingFraction: 0.8), value: page)
      }
    }
  }

  private func field(
    _ label: String,
    text: Binding<String>,
    keyboard: UIKeyboardType,
    contentType: UITextContentType
  ) -> some View {
    VStack(alignment: .leading, spacing: 8) {
      Text(label)
        .font(AppFont.poppins(.medium, size: 11))
        .tracking(0.4)
        .textCase(.uppercase)
        .foregroundStyle(AppColor.muted)
      TextField(label, text: text)
        .font(AppType.body)
        .keyboardType(keyboard)
        .textContentType(contentType)
        .textInputAutocapitalization(contentType == .emailAddress ? .never : .words)
        .autocorrectionDisabled(contentType == .emailAddress || contentType == .oneTimeCode)
        .padding(14)
        .background(AppColor.fill)
        .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
    }
  }

  private func secureField(_ label: String, text: Binding<String>) -> some View {
    VStack(alignment: .leading, spacing: 8) {
      Text(label)
        .font(AppFont.poppins(.medium, size: 11))
        .tracking(0.4)
        .textCase(.uppercase)
        .foregroundStyle(AppColor.muted)
      SecureField(label, text: text)
        .font(AppType.body)
        .textContentType(.newPassword)
        .padding(14)
        .background(AppColor.fill)
        .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
    }
  }

  private func advanceExplain() {
    UISelectionFeedbackGenerator().selectionChanged()
    if page < pages.count - 1 {
      withAnimation(.easeInOut(duration: 0.28)) {
        page += 1
      }
    } else {
      goSignup()
    }
  }

  private func goSignup() {
    UISelectionFeedbackGenerator().selectionChanged()
    withAnimation(.easeInOut(duration: 0.28)) {
      phase = .signup
    }
  }

  private func goBack() {
    UISelectionFeedbackGenerator().selectionChanged()
    withAnimation(.easeInOut(duration: 0.28)) {
      switch phase {
      case .otp, .email:
        phase = .signup
        otp = ""
        otpError = false
      case .signup:
        phase = .explain
        page = pages.count - 1
      case .explain:
        break
      }
    }
  }

  private func sendCode() {
    guard canSendCode else { return }
    otp = ""
    otpError = false
    resendSeconds = 30
    UINotificationFeedbackGenerator().notificationOccurred(.success)
    withAnimation(.easeInOut(duration: 0.28)) {
      phase = .otp
    }
    tickResend()
  }

  private func tickResend() {
    guard resendSeconds > 0 else { return }
    DispatchQueue.main.asyncAfter(deadline: .now() + 1) {
      guard phase == .otp, resendSeconds > 0 else { return }
      resendSeconds -= 1
      tickResend()
    }
  }

  private func verifyOTP() {
    guard canVerifyOTP else { return }
    // Demo: any 6-digit code works except 000000
    if otp == "000000" {
      otpError = true
      UINotificationFeedbackGenerator().notificationOccurred(.error)
      return
    }
    store.updateMeProfile(
      name: name.trimmingCharacters(in: .whitespacesAndNewlines),
      contact: phone.trimmingCharacters(in: .whitespacesAndNewlines),
      method: .phone
    )
    UINotificationFeedbackGenerator().notificationOccurred(.success)
    onFinished()
  }

  private func finishWithGoogle() {
    let resolved = name.trimmingCharacters(in: .whitespacesAndNewlines)
    store.updateMeProfile(
      name: resolved.isEmpty ? "Karen" : resolved,
      contact: "",
      method: .google
    )
    UINotificationFeedbackGenerator().notificationOccurred(.success)
    onFinished()
  }

  private func finishWithEmail() {
    guard canCreateEmailAccount else { return }
    store.updateMeProfile(
      name: name.trimmingCharacters(in: .whitespacesAndNewlines),
      contact: email.trimmingCharacters(in: .whitespacesAndNewlines),
      method: .email
    )
    UINotificationFeedbackGenerator().notificationOccurred(.success)
    onFinished()
  }
}

private struct OnboardingPage: Identifiable {
  let id: Int
  let brandFirst: Bool
  let title: String
  let body: String
  let visual: OnboardingVisualKind
}

private enum OnboardingVisualKind {
  case welcome
  case week
  case findTime
}

private struct OnboardingVisual: View {
  let kind: OnboardingVisualKind

  var body: some View {
    switch kind {
    case .welcome:
      welcomeVisual
    case .week:
      weekVisual
    case .findTime:
      findTimeVisual
    }
  }

  private var welcomeVisual: some View {
    ZStack {
      RoundedRectangle(cornerRadius: 28, style: .continuous)
        .fill(AppColor.white)
        .shadow(color: .black.opacity(0.06), radius: 24, y: 10)

      VStack(spacing: 18) {
        HStack(spacing: 0) {
          avatar("K", AppColor.me)
          avatar("T", AppColor.partner)
            .overlay(Circle().stroke(AppColor.white, lineWidth: 3))
            .offset(x: -14)
        }
        .padding(.trailing, -14)

        Text("Your week, together")
          .font(AppFont.poppins(.medium, size: 15))
          .foregroundStyle(AppColor.inkSoft)

        HStack(spacing: 8) {
          miniBar(AppColor.meSoft, AppColor.me)
          miniBar(AppColor.sharedSoft, AppColor.shared)
          miniBar(AppColor.partnerSoft, AppColor.partner)
        }
        .padding(.horizontal, 36)
      }
    }
  }

  private var weekVisual: some View {
    ZStack {
      RoundedRectangle(cornerRadius: 28, style: .continuous)
        .fill(AppColor.white)
        .shadow(color: .black.opacity(0.06), radius: 24, y: 10)

      VStack(alignment: .leading, spacing: 12) {
        Text("This week")
          .font(AppFont.poppins(.medium, size: 13))
          .foregroundStyle(AppColor.muted)
        ForEach(Array(weekRows.enumerated()), id: \.offset) { _, row in
          HStack(spacing: 10) {
            Text(row.day)
              .font(AppFont.mono(.medium, size: 12))
              .foregroundStyle(AppColor.muted)
              .frame(width: 28, alignment: .leading)
            RoundedRectangle(cornerRadius: 10, style: .continuous)
              .fill(row.color.opacity(0.16))
              .overlay(alignment: .leading) {
                Text(row.label)
                  .font(AppFont.poppins(.medium, size: 13))
                  .foregroundStyle(row.color)
                  .padding(.horizontal, 12)
              }
              .frame(height: 36)
          }
        }
      }
      .padding(24)
    }
  }

  private var findTimeVisual: some View {
    ZStack {
      RoundedRectangle(cornerRadius: 28, style: .continuous)
        .fill(AppColor.white)
        .shadow(color: .black.opacity(0.06), radius: 24, y: 10)

      VStack(alignment: .leading, spacing: 14) {
        Label("Open times", systemImage: "sparkles")
          .font(AppFont.poppins(.medium, size: 14))
          .foregroundStyle(AppColor.ink)

        LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 10) {
          ForEach(["5:30 PM", "6:00 PM", "7:00 PM", "8:00 PM"], id: \.self) { time in
            Text(time)
              .font(AppFont.poppins(.medium, size: 14))
              .foregroundStyle(time == "7:00 PM" ? AppColor.white : AppColor.ink)
              .frame(maxWidth: .infinity)
              .padding(.vertical, 14)
              .background(time == "7:00 PM" ? AppColor.ink : AppColor.mist)
              .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
          }
        }
      }
      .padding(24)
    }
  }

  private func avatar(_ letter: String, _ color: Color) -> some View {
    Text(letter)
      .font(AppFont.poppins(.semibold, size: 22))
      .foregroundStyle(AppColor.white)
      .frame(width: 56, height: 56)
      .background(color)
      .clipShape(Circle())
  }

  private func miniBar(_ soft: Color, _ ink: Color) -> some View {
    RoundedRectangle(cornerRadius: 8, style: .continuous)
      .fill(soft)
      .overlay(
        Capsule()
          .fill(ink)
          .frame(width: 18, height: 6)
          .padding(.leading, 10),
        alignment: .leading
      )
      .frame(height: 28)
  }

  private var weekRows: [(day: String, label: String, color: Color)] {
    [
      ("Tue", "Dinner · you", AppColor.me),
      ("Fri", "Date night · together", AppColor.shared),
      ("Sat", "Climbing · Thomas", AppColor.partner),
    ]
  }
}
