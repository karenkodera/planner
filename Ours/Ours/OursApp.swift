import SwiftUI

@main
struct OursApp: App {
  @StateObject private var store = CalendarStore()
  @State private var hasCompletedOnboarding = false

  var body: some Scene {
    WindowGroup {
      Group {
        if hasCompletedOnboarding {
          HomeView()
            .environmentObject(store)
            .transition(.opacity)
        } else {
          OnboardingView {
            withAnimation(.easeInOut(duration: 0.35)) {
              hasCompletedOnboarding = true
            }
          }
          .environmentObject(store)
          .transition(.opacity)
        }
      }
      .preferredColorScheme(.light)
    }
  }
}
