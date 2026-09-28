import SwiftUI

struct ProfileView: View {
  @EnvironmentObject private var store: CalendarStore
  @Binding var isPresented: Bool
  @State private var page: Page = .main
  @State private var pickingColor = false
  @State private var startHour = 9
  @State private var startMinute = 0
  @State private var endHour = 17
  @State private var endMinute = 0
  @State private var workHoursSet = true
  @State private var openDropdown: WorkDropdown?
  @State private var showLogoutAlert = false
  @State private var showRemovePartnerAlert = false
  @State private var shareKind: ShareKind = .availability
  @State private var showShareSheet = false
  @State private var showCalendarShareWarning = false
  @State private var notifPrefs: [NotifPref] = [
    .init(id: "rsvp", title: "RSVP requests", subtitle: "When Thomas sends a plan that needs your reply", value: true),
    .init(id: "replies", title: "Invite replies", subtitle: "When someone accepts, declines, or suggests a time", value: true),
    .init(id: "reminders", title: "Event reminders", subtitle: "A nudge before shared plans start", value: true),
    .init(id: "calendar", title: "Calendar updates", subtitle: "When either of you adds or changes plans", value: false),
    .init(id: "digest", title: "Evening digest", subtitle: "A short rundown of tomorrow’s plans", value: false),
  ]

  enum Page { case main, partner, notifications, workHours }
  enum WorkDropdown { case start, end }

  struct NotifPref: Identifiable {
    let id: String
    var title: String
    var subtitle: String
    var value: Bool
  }

  private var workHoursLabel: String {
    workHoursSet
      ? "\(formatClock(startHour, startMinute)) – \(formatClock(endHour, endMinute))"
      : "Not set"
  }

  var body: some View {
    NavigationStack {
      VStack(spacing: 0) {
        profileHeader
        ScrollView(showsIndicators: true) {
          Group {
            switch page {
            case .main: mainPage
            case .partner: partnerPage
            case .notifications: notificationsPage
            case .workHours: workHoursPage
            }
          }
          .padding(.horizontal, 20)
          .padding(.bottom, 32)
        }
      }
      .background(AppColor.white)
    }
    .presentationDetents([.large])
    .presentationDragIndicator(.hidden)
    .onAppear {
      pickingColor = false
      page = .main
      openDropdown = nil
    }
    .sheet(isPresented: $showShareSheet) {
      ActivityShareSheet(items: shareActivityItems) {
        showShareSheet = false
      }
    }
    .alert("Log out", isPresented: $showLogoutAlert) {
      Button("Cancel", role: .cancel) {}
      Button("Log out", role: .destructive) { isPresented = false }
    } message: {
      Text("You’ll need to sign in again to sync plans.")
    }
    .alert("Remove from calendar", isPresented: $showRemovePartnerAlert) {
      Button("Cancel", role: .cancel) {}
      Button("Unshare", role: .destructive) {
        store.removePartner()
        page = .main
        UINotificationFeedbackGenerator().notificationOccurred(.success)
      }
    } message: {
      Text("\(store.couple.partner.name) won’t see your shared calendar anymore, and their events will be removed from yours.")
    }
    .alert("Share with one person only", isPresented: $showCalendarShareWarning) {
      Button("Cancel", role: .cancel) {}
      Button("Continue") {
        shareKind = .calendar
        showShareSheet = true
      }
    } message: {
      Text("You can only share calendars indefinitely with one person at a time. Inviting someone else later means unsharing with your current partner first.")
    }
  }

  private var profileHeader: some View {
    HStack(alignment: .center, spacing: 12) {
      if page != .main {
        Button {
          openDropdown = nil
          page = .main
          UISelectionFeedbackGenerator().selectionChanged()
        } label: {
          HStack(spacing: 4) {
            Image(systemName: "chevron.left")
              .font(.system(size: 14, weight: .semibold))
            Text("Profile")
              .font(AppFont.poppins(.medium, size: 15))
          }
          .foregroundStyle(AppColor.ink)
        }
      }
      Spacer(minLength: 8)
      Button { isPresented = false } label: {
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

  private var mainPage: some View {
    VStack(spacing: 0) {
      VStack(spacing: 6) {
        ZStack(alignment: .topTrailing) {
          Text(store.couple.me.initial)
            .font(AppFont.poppins(.semibold, size: 28))
            .foregroundStyle(AppColor.white)
            .frame(width: 72, height: 72)
            .background(store.meColor)
            .clipShape(Circle())
          Button {
            pickingColor.toggle()
            UISelectionFeedbackGenerator().selectionChanged()
          } label: {
            Image(systemName: "pencil")
              .font(.system(size: 11, weight: .semibold))
              .foregroundStyle(AppColor.ink)
              .frame(width: 28, height: 28)
              .background(AppColor.white)
              .overlay(Circle().stroke(AppColor.hairline, lineWidth: 0.5))
              .clipShape(Circle())
              .shadow(color: .black.opacity(0.12), radius: 4, y: 1)
          }
          .offset(x: 4, y: -4)
        }
        .padding(.bottom, 8)

        if pickingColor {
          HStack(spacing: 10) {
            ForEach(Array(AppColor.avatarColors.enumerated()), id: \.offset) { _, swatch in
              Button {
                store.meColor = swatch
                pickingColor = false
                UISelectionFeedbackGenerator().selectionChanged()
              } label: {
                Circle()
                  .fill(swatch)
                  .frame(width: 28, height: 28)
                  .overlay(
                    Circle().stroke(store.meColor == swatch ? AppColor.ink : Color.clear, lineWidth: 2)
                  )
              }
            }
          }
          .padding(.bottom, 8)
        }

        Text(store.couple.me.name)
          .font(AppFont.poppins(.semibold, size: 22))
          .foregroundStyle(AppColor.ink)
        Text(store.couple.me.email)
          .font(AppFont.poppins(.regular, size: 14))
          .foregroundStyle(AppColor.muted)
      }
      .frame(maxWidth: .infinity)
      .padding(.top, 8)
      .padding(.bottom, 24)

      sectionLabel("Account")
      card {
        detailRow("Name", store.couple.me.name)
        divider
        detailRow("Email", store.couple.me.email)
        divider
        detailRow("Password", "••••••••")
      }
      sectionLabel("Shared with")
      card {
        if store.partnerLinked {
          Button {
            page = .partner
            UISelectionFeedbackGenerator().selectionChanged()
          } label: {
            HStack(spacing: 12) {
              Text(store.couple.partner.initial)
                .font(AppFont.poppins(.semibold, size: 15))
                .foregroundStyle(AppColor.white)
                .frame(width: 40, height: 40)
                .background(AppColor.partner)
                .clipShape(Circle())
              VStack(alignment: .leading, spacing: 2) {
                Text(store.couple.partner.name)
                  .font(AppFont.poppins(.medium, size: 15))
                  .foregroundStyle(AppColor.ink)
                Text(store.couple.partner.email)
                  .font(AppFont.poppins(.regular, size: 13))
                  .foregroundStyle(AppColor.muted)
              }
              Spacer()
              Image(systemName: "chevron.forward")
                .font(.system(size: 14))
                .foregroundStyle(AppColor.muted)
            }
            .padding(.horizontal, 16)
            .padding(.vertical, 14)
          }
        } else {
          Text("No one shared yet")
            .font(AppFont.poppins(.regular, size: 15))
            .foregroundStyle(AppColor.muted)
            .padding(16)
            .frame(maxWidth: .infinity, alignment: .leading)
        }
      }

      sectionLabel("Share")
      card {
        shareActionRow(.availability) {
          shareKind = .availability
          showShareSheet = true
        }
        divider
        if store.partnerLinked {
          Button {
            UISelectionFeedbackGenerator().selectionChanged()
            showRemovePartnerAlert = true
          } label: {
            HStack(spacing: 12) {
              Image(systemName: "person.badge.minus")
                .font(.system(size: 15, weight: .semibold))
                .foregroundStyle(AppColor.danger)
                .frame(width: 28)
              VStack(alignment: .leading, spacing: 2) {
                Text("Unshare calendar with \(store.couple.partner.shortName)")
                  .font(AppFont.poppins(.medium, size: 15))
                  .foregroundStyle(AppColor.danger)
                  .multilineTextAlignment(.leading)
                Text("Stop sharing calendars indefinitely")
                  .font(AppFont.poppins(.regular, size: 12))
                  .foregroundStyle(AppColor.muted)
                  .multilineTextAlignment(.leading)
              }
              Spacer(minLength: 8)
            }
            .padding(.horizontal, 16)
            .padding(.vertical, 14)
          }
        } else {
          shareActionRow(.calendar) {
            showCalendarShareWarning = true
          }
        }
      }
      Text("You can only invite one person to share calendars indefinitely at a time.")
        .font(AppFont.poppins(.regular, size: 12))
        .foregroundStyle(AppColor.muted)
        .padding(.horizontal, 4)
        .padding(.bottom, 16)
        .frame(maxWidth: .infinity, alignment: .leading)

      sectionLabel("Preferences")
      card {
        actionRow("Notifications") { page = .notifications }
        divider
        actionRow("Set work hours", value: workHoursLabel) {
          openDropdown = nil
          page = .workHours
        }
      }
      card {
        Button {
          UINotificationFeedbackGenerator().notificationOccurred(.warning)
          showLogoutAlert = true
        } label: {
          HStack(spacing: 12) {
            Image(systemName: "rectangle.portrait.and.arrow.right")
              .foregroundStyle(AppColor.danger)
            Text("Log out")
              .font(AppFont.poppins(.medium, size: 15))
              .foregroundStyle(AppColor.danger)
            Spacer()
          }
          .padding(.horizontal, 16)
          .padding(.vertical, 14)
        }
      }
      .padding(.top, 8)
    }
  }

  private var partnerPage: some View {
    VStack(spacing: 0) {
      VStack(spacing: 6) {
        Text(store.couple.partner.initial)
          .font(AppFont.poppins(.semibold, size: 28))
          .foregroundStyle(AppColor.white)
          .frame(width: 72, height: 72)
          .background(AppColor.partner)
          .clipShape(Circle())
          .padding(.bottom, 8)
        Text(store.couple.partner.name)
          .font(AppFont.poppins(.semibold, size: 22))
          .foregroundStyle(AppColor.ink)
        Text(store.couple.partner.email)
          .font(AppFont.poppins(.regular, size: 14))
          .foregroundStyle(AppColor.muted)
      }
      .padding(.top, 8)
      .padding(.bottom, 24)

      sectionLabel("Account")
      card {
        detailRow("Name", store.couple.partner.name)
        divider
        detailRow("Email", store.couple.partner.email)
      }
      card {
        Button {
          UINotificationFeedbackGenerator().notificationOccurred(.warning)
          showRemovePartnerAlert = true
        } label: {
          HStack(spacing: 12) {
            Image(systemName: "person.badge.minus")
              .foregroundStyle(AppColor.danger)
            Text("Remove from calendar")
              .font(AppFont.poppins(.medium, size: 15))
              .foregroundStyle(AppColor.danger)
            Spacer()
          }
          .padding(.horizontal, 16)
          .padding(.vertical, 14)
        }
      }
      .padding(.top, 8)
    }
  }

  private var notificationsPage: some View {
    VStack(alignment: .leading, spacing: 0) {
      Text("Notifications")
        .font(AppFont.poppins(.semibold, size: 22))
        .foregroundStyle(AppColor.ink)
        .padding(.bottom, 8)
      Text("Choose what Ours should ping you about. You can change these anytime.")
        .font(AppFont.poppins(.regular, size: 14))
        .foregroundStyle(AppColor.muted)
        .padding(.bottom, 20)

      sectionLabel("Alerts")
      card {
        ForEach(Array(notifPrefs.prefix(3).enumerated()), id: \.element.id) { idx, pref in
          if idx > 0 { divider }
          prefRow(pref)
        }
      }
      sectionLabel("Quiet extras")
      card {
        ForEach(Array(notifPrefs.suffix(from: 3).enumerated()), id: \.element.id) { idx, pref in
          if idx > 0 { divider }
          prefRow(pref)
        }
      }
    }
  }

  private var workHoursPage: some View {
    VStack(alignment: .leading, spacing: 0) {
      Text("Work hours")
        .font(AppFont.poppins(.semibold, size: 22))
        .foregroundStyle(AppColor.ink)
        .padding(.bottom, 8)
      Text("Used to suggest free time outside your usual day.")
        .font(AppFont.poppins(.regular, size: 14))
        .foregroundStyle(AppColor.muted)
        .padding(.bottom, 20)

      if workHoursSet {
        timeDropdown(label: "Start of day", hour: startHour, minute: startMinute, which: .start) { h, m in
          startHour = h
          startMinute = m
        }
        timeDropdown(label: "End of day", hour: endHour, minute: endMinute, which: .end) { h, m in
          endHour = h
          endMinute = m
        }
        .padding(.top, 14)

        Button {
          workHoursSet = false
          openDropdown = nil
          UINotificationFeedbackGenerator().notificationOccurred(.success)
        } label: {
          Text("Remove work hours")
            .font(AppFont.poppins(.medium, size: 15))
            .foregroundStyle(AppColor.danger)
            .frame(maxWidth: .infinity)
            .padding(.vertical, 14)
        }
        .padding(.top, 24)
      } else {
        Button {
          workHoursSet = true
          UISelectionFeedbackGenerator().selectionChanged()
        } label: {
          Text("Set work hours")
            .font(AppFont.poppins(.medium, size: 15))
            .foregroundStyle(AppColor.white)
            .frame(maxWidth: .infinity)
            .padding(.vertical, 14)
            .background(AppColor.ink)
            .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
        }
        .padding(.top, 24)
      }
    }
  }

  private var shareActivityItems: [Any] {
    [store.shareMessage(for: shareKind), store.shareURL(for: shareKind)]
  }

  private func shareActionRow(_ kind: ShareKind, action: @escaping () -> Void) -> some View {
    Button {
      UISelectionFeedbackGenerator().selectionChanged()
      action()
    } label: {
      HStack(spacing: 12) {
        Image(systemName: kind.icon)
          .font(.system(size: 15, weight: .semibold))
          .foregroundStyle(AppColor.inkSoft)
          .frame(width: 28)
        VStack(alignment: .leading, spacing: 2) {
          Text(kind.title)
            .font(AppFont.poppins(.medium, size: 15))
            .foregroundStyle(AppColor.ink)
          Text(kind.subtitle)
            .font(AppFont.poppins(.regular, size: 12))
            .foregroundStyle(AppColor.muted)
            .multilineTextAlignment(.leading)
        }
        Spacer(minLength: 8)
        Image(systemName: "chevron.forward")
          .font(.system(size: 14))
          .foregroundStyle(AppColor.muted)
      }
      .padding(.horizontal, 16)
      .padding(.vertical, 14)
    }
  }

  private func sectionLabel(_ text: String) -> some View {
    Text(text)
      .font(AppFont.poppins(.medium, size: 12))
      .tracking(0.4)
      .textCase(.uppercase)
      .foregroundStyle(AppColor.muted)
      .padding(.leading, 4)
      .padding(.bottom, 8)
      .padding(.top, 8)
      .frame(maxWidth: .infinity, alignment: .leading)
  }

  private func card<Content: View>(@ViewBuilder content: () -> Content) -> some View {
    VStack(spacing: 0) { content() }
      .background(AppColor.fill)
      .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
      .padding(.bottom, 16)
  }

  private var divider: some View {
    Rectangle()
      .fill(AppColor.hairline)
      .frame(height: 0.5)
      .padding(.leading, 16)
  }

  private func detailRow(_ label: String, _ value: String) -> some View {
    HStack {
      Text(label)
        .font(AppFont.poppins(.regular, size: 15))
        .foregroundStyle(AppColor.inkSoft)
      Spacer()
      Text(value)
        .font(AppFont.poppins(.medium, size: 15))
        .foregroundStyle(AppColor.ink)
    }
    .padding(.horizontal, 16)
    .padding(.vertical, 14)
  }

  private func actionRow(_ label: String, value: String? = nil, action: @escaping () -> Void) -> some View {
    Button {
      UISelectionFeedbackGenerator().selectionChanged()
      action()
    } label: {
      HStack(spacing: 12) {
        Text(label)
          .font(AppFont.poppins(.medium, size: 15))
          .foregroundStyle(AppColor.ink)
        Spacer()
        if let value {
          Text(value)
            .font(AppFont.poppins(.regular, size: 13))
            .foregroundStyle(AppColor.muted)
            .lineLimit(1)
        }
        Image(systemName: "chevron.forward")
          .font(.system(size: 14))
          .foregroundStyle(AppColor.muted)
      }
      .padding(.horizontal, 16)
      .padding(.vertical, 14)
    }
  }

  private func prefRow(_ pref: NotifPref) -> some View {
    HStack(spacing: 14) {
      VStack(alignment: .leading, spacing: 3) {
        Text(pref.title)
          .font(AppFont.poppins(.medium, size: 15))
          .foregroundStyle(AppColor.ink)
        Text(pref.subtitle)
          .font(AppFont.poppins(.regular, size: 12))
          .foregroundStyle(AppColor.muted)
      }
      Spacer()
      Toggle("", isOn: Binding(
        get: { notifPrefs.first(where: { $0.id == pref.id })?.value ?? false },
        set: { newValue in
          UISelectionFeedbackGenerator().selectionChanged()
          if let idx = notifPrefs.firstIndex(where: { $0.id == pref.id }) {
            notifPrefs[idx].value = newValue
          }
        }
      ))
      .labelsHidden()
      .tint(AppColor.me)
    }
    .padding(.horizontal, 16)
    .padding(.vertical, 14)
  }

  private func timeDropdown(
    label: String,
    hour: Int,
    minute: Int,
    which: WorkDropdown,
    onPick: @escaping (Int, Int) -> Void
  ) -> some View {
    VStack(alignment: .leading, spacing: 0) {
      Text(label)
        .font(AppFont.poppins(.medium, size: 11))
        .tracking(0.4)
        .textCase(.uppercase)
        .foregroundStyle(AppColor.muted)
        .padding(.bottom, 8)
      Button {
        openDropdown = openDropdown == which ? nil : which
      } label: {
        HStack {
          Text(formatClock(hour, minute))
            .font(AppFont.poppins(.medium, size: 15))
            .foregroundStyle(AppColor.ink)
          Spacer()
          Image(systemName: openDropdown == which ? "chevron.up" : "chevron.down")
            .foregroundStyle(AppColor.muted)
        }
        .padding(14)
        .background(AppColor.fill)
        .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
      }
      if openDropdown == which {
        ScrollView {
          VStack(spacing: 0) {
            ForEach(0..<48, id: \.self) { i in
              let h = i / 2
              let m = i % 2 == 0 ? 0 : 30
              Button {
                onPick(h, m)
                workHoursSet = true
                openDropdown = nil
                UISelectionFeedbackGenerator().selectionChanged()
              } label: {
                Text(formatClock(h, m))
                  .font(AppFont.poppins(h == hour && m == minute ? .medium : .regular, size: 15))
                  .foregroundStyle(h == hour && m == minute ? AppColor.ink : AppColor.inkSoft)
                  .frame(maxWidth: .infinity, alignment: .leading)
                  .padding(.horizontal, 14)
                  .padding(.vertical, 12)
                  .background(h == hour && m == minute ? AppColor.accentSoft : Color.clear)
              }
            }
          }
        }
        .frame(maxHeight: 220)
        .background(AppColor.fill)
        .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
        .padding(.top, 8)
      }
    }
  }

  private func formatClock(_ hour: Int, _ minute: Int) -> String {
    DateUtils.format(DateUtils.atTime(store.today, hour: hour, minute: minute), "h:mm a")
  }
}
