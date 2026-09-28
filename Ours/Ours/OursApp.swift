import SwiftUI

@main
struct OursApp: App {
  @StateObject private var store = CalendarStore()

  var body: some Scene {
    WindowGroup {
      HomeView()
        .environmentObject(store)
        .preferredColorScheme(.light)
    }
  }
}
