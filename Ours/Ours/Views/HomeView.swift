import SwiftUI

struct HomeView: View {
  @EnvironmentObject private var store: CalendarStore
  @State private var searchOpen = false
  @State private var query = ""
  @State private var monthOpen = false
  @State private var profileOpen = false
  @State private var weekPulse: CGFloat = 1
  @State private var lastWeekTap: Date?

  var body: some View {
    ZStack(alignment: .bottomTrailing) {
      AppColor.canvas.ignoresSafeArea()

      VStack(spacing: 0) {
        header
          .padding(.horizontal, 20)
          .padding(.top, 4)
          .padding(.bottom, 10)

        if searchOpen && !query.trimmingCharacters(in: .whitespaces).isEmpty {
          searchResults
            .padding(.horizontal, 20)
        } else if !searchOpen {
          weekNav
            .padding(.horizontal, 20)
            .padding(.bottom, 12)
            .scaleEffect(weekPulse)

          WeekDayCardsView()
        } else {
          Spacer()
        }
      }

      if !searchOpen {
        Button {
          UIImpactFeedbackGenerator(style: .light).impactOccurred()
          store.openSheet(.create)
        } label: {
          Image(systemName: "plus")
            .font(.system(size: 22, weight: .semibold))
            .foregroundStyle(AppColor.white)
            .frame(width: 58, height: 58)
            .background(AppColor.ink)
            .clipShape(Circle())
            .shadow(color: .black.opacity(0.18), radius: 10, y: 4)
        }
        .buttonStyle(ScaleButtonStyle(scaleTo: 0.94))
        .padding(.trailing, 20)
        .padding(.bottom, 24)
      }
    }
    .sheet(isPresented: $monthOpen) {
      MonthViewSheet(isPresented: $monthOpen)
        .environmentObject(store)
        .presentationDetents([.height(520)])
        .presentationDragIndicator(.visible)
        .presentationBackground(AppColor.white)
    }
    .sheet(isPresented: $profileOpen) {
      ProfileView(isPresented: $profileOpen)
        .environmentObject(store)
        .oursSheetTopInset()
        .presentationDragIndicator(.hidden)
    }
    .sheet(isPresented: Binding(
      get: { store.sheet != .none },
      set: { if !$0 { store.closeSheet() } }
    )) {
      SheetsHost()
        .environmentObject(store)
    }
  }

  @ViewBuilder
  private var header: some View {
    if searchOpen {
      HStack(spacing: 10) {
        HStack(spacing: 8) {
          Image(systemName: "magnifyingglass")
            .foregroundStyle(AppColor.muted)
          TextField("Search plans…", text: $query)
            .font(AppFont.poppins(.regular, size: 15))
            .foregroundStyle(AppColor.ink)
          if !query.isEmpty {
            Button { query = "" } label: {
              Image(systemName: "xmark.circle.fill")
                .foregroundStyle(AppColor.muted)
            }
          }
        }
        .padding(.horizontal, 12)
        .frame(height: 44)
        .background(AppColor.fill)
        .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))

        Button {
          UISelectionFeedbackGenerator().selectionChanged()
          searchOpen = false
          query = ""
        } label: {
          Text("Cancel")
            .font(AppFont.poppins(.medium, size: 14))
            .foregroundStyle(AppColor.inkSoft)
        }
        .buttonStyle(ScaleButtonStyle(scaleTo: 0.94))
      }
    } else {
      HStack(spacing: 8) {
        Button {
          UISelectionFeedbackGenerator().selectionChanged()
          profileOpen = true
        } label: {
          Text(store.couple.me.initial)
            .font(AppFont.poppins(.semibold, size: 14))
            .foregroundStyle(AppColor.white)
            .frame(width: 40, height: 40)
            .background(store.meColor)
            .clipShape(Circle())
        }
        .buttonStyle(ScaleButtonStyle(scaleTo: 0.92))

        Spacer()

        HStack(spacing: 0) {
          iconButton("calendar") { monthOpen = true }
          iconButton("magnifyingglass") {
            UIImpactFeedbackGenerator(style: .light).impactOccurred()
            query = ""
            searchOpen = true
          }
          ZStack(alignment: .topTrailing) {
            iconButton("bell.fill") { store.openSheet(.requests) }
            if store.pendingCount > 0 {
              Text("\(store.pendingCount)")
                .font(AppFont.poppins(.bold, size: 9))
                .foregroundStyle(AppColor.white)
                .padding(.horizontal, 4)
                .frame(minWidth: 16, minHeight: 16)
                .background(AppColor.shared)
                .clipShape(Capsule())
                .offset(x: -6, y: 6)
            }
          }
        }
        .padding(.horizontal, 2)
        .frame(height: 42)
        .background(AppColor.fill)
        .clipShape(Capsule())
      }
      .frame(minHeight: 44)
    }
  }

  private func iconButton(_ systemName: String, action: @escaping () -> Void) -> some View {
    Button {
      UISelectionFeedbackGenerator().selectionChanged()
      action()
    } label: {
      Image(systemName: systemName)
        .font(.system(size: 18, weight: .regular))
        .foregroundStyle(AppColor.ink)
        .frame(width: 42, height: 42)
    }
    .buttonStyle(ScaleButtonStyle(scaleTo: 0.9))
  }

  private var weekNav: some View {
    HStack {
      Button {
        UISelectionFeedbackGenerator().selectionChanged()
        store.goWeek(-1)
      } label: {
        Image(systemName: "chevron.left")
          .font(.system(size: 14, weight: .semibold))
          .foregroundStyle(AppColor.ink)
          .frame(width: 34, height: 34)
          .background(AppColor.white)
          .clipShape(RoundedRectangle(cornerRadius: 10, style: .continuous))
      }
      .buttonStyle(ScaleButtonStyle(scaleTo: 0.9))

      Button(action: onWeekLabelPress) {
        Text(DateUtils.weekLabel(anchor: store.weekAnchor, today: store.today))
          .font(AppFont.poppins(.medium, size: 13))
          .foregroundStyle(AppColor.inkSoft)
          .frame(maxWidth: .infinity)
          .padding(.vertical, 6)
      }

      Button {
        UISelectionFeedbackGenerator().selectionChanged()
        store.goWeek(1)
      } label: {
        Image(systemName: "chevron.right")
          .font(.system(size: 14, weight: .semibold))
          .foregroundStyle(AppColor.ink)
          .frame(width: 34, height: 34)
          .background(AppColor.white)
          .clipShape(RoundedRectangle(cornerRadius: 10, style: .continuous))
      }
      .buttonStyle(ScaleButtonStyle(scaleTo: 0.9))
    }
    .padding(.horizontal, 6)
    .padding(.vertical, 6)
    .background(AppColor.fill)
    .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
  }

  private func onWeekLabelPress() {
    let now = Date()
    if let last = lastWeekTap, now.timeIntervalSince(last) < 0.32 {
      store.jumpToDay(store.today)
      UINotificationFeedbackGenerator().notificationOccurred(.success)
      withAnimation(.spring(response: 0.3, dampingFraction: 0.6)) { weekPulse = 1.04 }
      DispatchQueue.main.asyncAfter(deadline: .now() + 0.15) {
        withAnimation(.spring(response: 0.3, dampingFraction: 0.7)) { weekPulse = 1 }
      }
      lastWeekTap = nil
      return
    }
    lastWeekTap = now
  }

  private var searchResults: some View {
    let q = query.trimmingCharacters(in: .whitespacesAndNewlines).lowercased()
    let matchedEvents = store.events.filter {
      $0.title.lowercased().contains(q)
        || ($0.location ?? "").lowercased().contains(q)
        || ($0.notes ?? "").lowercased().contains(q)
    }
    let matchedRequests = store.requests.filter {
      $0.title.lowercased().contains(q)
        || ($0.location ?? "").lowercased().contains(q)
        || ($0.notes ?? "").lowercased().contains(q)
    }

    return ScrollView {
      LazyVStack(alignment: .leading, spacing: 0) {
        ForEach(matchedEvents) { event in
          Button {
            searchOpen = false
            query = ""
            store.openDayDetail(event.start, selecting: .event(event))
          } label: {
            resultRow(
              title: event.title,
              meta: "\(DateUtils.format(event.start, "EEE · MMM d · h:mm a")) · \(ownerLabel(event.owner))"
            )
          }
        }
        ForEach(matchedRequests) { request in
          Button {
            searchOpen = false
            query = ""
            store.openDayDetail(request.proposedStart, selecting: .request(request))
          } label: {
            resultRow(
              title: request.title,
              meta: "\(DateUtils.format(request.proposedStart, "EEE · MMM d · h:mm a")) · RSVP"
            )
          }
        }
        if matchedEvents.isEmpty && matchedRequests.isEmpty {
          Text("No matches")
            .font(AppFont.poppins(.regular, size: 13))
            .italic()
            .foregroundStyle(AppColor.muted)
            .padding(14)
        }
      }
    }
    .background(AppColor.canvasElevated)
    .overlay(
      RoundedRectangle(cornerRadius: 16, style: .continuous)
        .stroke(AppColor.hairline, lineWidth: 1)
    )
    .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
  }

  private func resultRow(title: String, meta: String) -> some View {
    VStack(alignment: .leading, spacing: 2) {
      Text(title)
        .font(AppFont.poppins(.medium, size: 14))
        .foregroundStyle(AppColor.ink)
      Text(meta)
        .font(AppFont.poppins(.regular, size: 12))
        .foregroundStyle(AppColor.muted)
    }
    .frame(maxWidth: .infinity, alignment: .leading)
    .padding(.horizontal, 14)
    .padding(.vertical, 12)
  }

  private func ownerLabel(_ owner: EventOwner) -> String {
    switch owner {
    case .me: return store.couple.me.name
    case .partner: return store.couple.partner.shortName
    case .shared: return "Together"
    }
  }
}
