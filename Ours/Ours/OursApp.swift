import SwiftUI

@main
struct OursApp: App {
  @StateObject private var store = CalendarStore()

  var body: some Scene {
    WindowGroup {
      Group {
        if store.isRestoringSession {
          ProgressView()
            .frame(maxWidth: .infinity, maxHeight: .infinity)
            .background(AppColor.canvas)
        } else if store.isSignedIn {
          HomeView()
            .environmentObject(store)
            .transition(.opacity)
        } else {
          OnboardingView()
            .environmentObject(store)
            .transition(.opacity)
        }
      }
      .preferredColorScheme(.light)
      .onOpenURL { store.handleIncomingURL($0) }
    }
  }
}
