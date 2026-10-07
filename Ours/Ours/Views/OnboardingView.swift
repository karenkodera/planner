import AuthenticationServices
import CryptoKit
import SwiftUI

struct OnboardingView: View {
  @EnvironmentObject private var store: CalendarStore
  @StateObject private var appleSignIn = AppleSignInCoordinator()

  @State private var phase: Phase = .explain
  @State private var page = 0
  @State private var appear = false
  @State private var name = ""
  @State private var email = ""
  @State private var password = ""
  @State private var creatingAccount = true
  @State private var authError: String?
  @State private var busy = false

  private enum Phase {
    case explain
    case signup
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

  private var canSubmitEmail: Bool {
    email.contains("@")
      && password.count >= 6
      && (!creatingAccount || !name.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty)
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
            subtitle: "Sign in with Apple, Google, or email."
          )

          if !store.isConfigured {
            Text("Add SUPABASE_URL and SUPABASE_ANON_KEY in Ours/Secrets.xcconfig, then rebuild.")
              .font(AppFont.poppins(.regular, size: 14))
              .foregroundStyle(AppColor.danger)
              .padding(.bottom, 16)
          }

          VStack(spacing: 10) {
            authOptionButton(title: "Sign in with Apple", systemImage: "apple.logo") {
              startApple()
            }
            authOptionButton(title: "Continue with Google", systemImage: "g.circle.fill") {
              startGoogle()
            }
            authOptionButton(title: "Continue with email", systemImage: "envelope.fill") {
              withAnimation(.easeInOut(duration: 0.28)) { phase = .email }
            }
          }

          if let authError, phase == .signup {
            Text(authError)
              .font(AppFont.poppins(.regular, size: 13))
              .foregroundStyle(AppColor.danger)
              .padding(.top, 14)
          }
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
            title: creatingAccount ? "Create your account" : "Welcome back",
            subtitle: creatingAccount
              ? "Use an email and password to sign in later."
              : "Sign in with the email you already use."
          )

          VStack(spacing: 14) {
            if creatingAccount {
              field("Your name", text: $name, keyboard: .default, contentType: .name)
            }
            field("Email", text: $email, keyboard: .emailAddress, contentType: .emailAddress)
            secureField("Password", text: $password)
          }

          Text("At least 6 characters.")
            .font(AppFont.poppins(.regular, size: 12))
            .foregroundStyle(AppColor.muted)
            .padding(.top, 8)

          if let authError {
            Text(authError)
              .font(AppFont.poppins(.regular, size: 13))
              .foregroundStyle(AppColor.danger)
              .padding(.top, 10)
          }

          PrimaryButton(
            title: busy ? "Please wait…" : (creatingAccount ? "Create account" : "Sign in"),
            disabled: !canSubmitEmail || busy
          ) {
            submitEmail()
          }

          Button {
            creatingAccount.toggle()
            authError = nil
          } label: {
            Text(creatingAccount ? "Already have an account? Sign in" : "New here? Create an account")
              .font(AppType.bodyMedium)
              .foregroundStyle(AppColor.ink)
              .frame(maxWidth: .infinity)
              .padding(.vertical, 14)
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
      case .email:
        phase = .signup
        authError = nil
      case .signup:
        phase = .explain
        page = pages.count - 1
      case .explain:
        break
      }
    }
  }

  private func submitEmail() {
    guard canSubmitEmail, !busy else { return }
    busy = true
    authError = nil
    let trimmedName = name.trimmingCharacters(in: .whitespacesAndNewlines)
    let trimmedEmail = email.trimmingCharacters(in: .whitespacesAndNewlines)
    Task {
      do {
        if creatingAccount {
          try await store.signUp(name: trimmedName, email: trimmedEmail, password: password)
        } else {
          try await store.signIn(email: trimmedEmail, password: password)
        }
        UINotificationFeedbackGenerator().notificationOccurred(.success)
      } catch {
        authError = error.localizedDescription
        UINotificationFeedbackGenerator().notificationOccurred(.error)
      }
      busy = false
    }
  }

  private func startGoogle() {
    guard !busy else { return }
    busy = true
    authError = nil
    Task {
      do {
        try await store.signInWithGoogle()
        UINotificationFeedbackGenerator().notificationOccurred(.success)
      } catch {
        authError = error.localizedDescription
        UINotificationFeedbackGenerator().notificationOccurred(.error)
      }
      busy = false
    }
  }

  private func startApple() {
    guard !busy else { return }
    authError = nil
    appleSignIn.onFinish = { result in
      switch result {
      case .success(let credential):
        busy = true
        Task {
          do {
            try await store.signInWithApple(
              idToken: credential.idToken,
              nonce: credential.nonce,
              name: credential.name
            )
            UINotificationFeedbackGenerator().notificationOccurred(.success)
          } catch {
            authError = error.localizedDescription
            UINotificationFeedbackGenerator().notificationOccurred(.error)
          }
          busy = false
        }
      case .failure(let error):
        if (error as NSError).code == ASAuthorizationError.canceled.rawValue { return }
        authError = error.localizedDescription
      }
    }
    appleSignIn.start()
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

@MainActor
final class AppleSignInCoordinator: NSObject, ObservableObject, ASAuthorizationControllerDelegate, ASAuthorizationControllerPresentationContextProviding {
  var onFinish: ((Result<(idToken: String, nonce: String, name: String?), Error>) -> Void)?
  private var rawNonce = ""

  func start() {
    rawNonce = Self.randomNonce()
    let request = ASAuthorizationAppleIDProvider().createRequest()
    request.requestedScopes = [.fullName, .email]
    request.nonce = Self.sha256(rawNonce)
    let controller = ASAuthorizationController(authorizationRequests: [request])
    controller.delegate = self
    controller.presentationContextProvider = self
    controller.performRequests()
  }

  func authorizationController(controller: ASAuthorizationController, didCompleteWithAuthorization authorization: ASAuthorization) {
    guard
      let credential = authorization.credential as? ASAuthorizationAppleIDCredential,
      let tokenData = credential.identityToken,
      let token = String(data: tokenData, encoding: .utf8)
    else {
      onFinish?(.failure(BackendError.message("Apple did not return a sign-in token.")))
      return
    }
    let name = [credential.fullName?.givenName, credential.fullName?.familyName]
      .compactMap { $0 }
      .joined(separator: " ")
    onFinish?(.success((token, rawNonce, name.isEmpty ? nil : name)))
  }

  func authorizationController(controller: ASAuthorizationController, didCompleteWithError error: Error) {
    onFinish?(.failure(error))
  }

  func presentationAnchor(for controller: ASAuthorizationController) -> ASPresentationAnchor {
    UIApplication.shared.connectedScenes
      .compactMap { $0 as? UIWindowScene }
      .flatMap(\.windows)
      .first { $0.isKeyWindow } ?? ASPresentationAnchor()
  }

  private static func randomNonce(length: Int = 32) -> String {
    let charset = Array("0123456789ABCDEFGHIJKLMNOPQRSTUVXYZabcdefghijklmnopqrstuvwxyz-._")
    var bytes = [UInt8](repeating: 0, count: length)
    _ = SecRandomCopyBytes(kSecRandomDefault, bytes.count, &bytes)
    return String(bytes.map { charset[Int($0) % charset.count] })
  }

  private static func sha256(_ input: String) -> String {
    SHA256.hash(data: Data(input.utf8)).map { String(format: "%02x", $0) }.joined()
  }
}
