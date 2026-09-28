import SwiftUI
import UIKit

struct ActivityShareSheet: UIViewControllerRepresentable {
  let items: [Any]
  var messagesOnly = true
  var onComplete: (() -> Void)? = nil

  func makeUIViewController(context: Context) -> UIActivityViewController {
    let controller = UIActivityViewController(activityItems: items, applicationActivities: nil)
    if messagesOnly {
      controller.excludedActivityTypes = Self.excludedWhenMessagesOnly
    }
    controller.completionWithItemsHandler = { _, _, _, _ in
      onComplete?()
    }
    return controller
  }

  func updateUIViewController(_ uiViewController: UIActivityViewController, context: Context) {}

  /// Hide non-Messages destinations so the sheet effectively offers Messages.
  private static let excludedWhenMessagesOnly: [UIActivity.ActivityType] = [
    .postToFacebook,
    .postToTwitter,
    .postToWeibo,
    .mail,
    .print,
    .copyToPasteboard,
    .assignToContact,
    .saveToCameraRoll,
    .addToReadingList,
    .postToFlickr,
    .postToVimeo,
    .postToTencentWeibo,
    .airDrop,
    .openInIBooks,
    .markupAsPDF,
    .sharePlay,
    .collaborationInviteWithLink,
    .collaborationCopyLink,
    UIActivity.ActivityType("com.apple.DocumentManagerUICore.SaveToFiles"),
    UIActivity.ActivityType("com.apple.reminders.RemindersEditorExtension"),
    UIActivity.ActivityType("com.apple.mobilenotes.SharingExtension"),
  ]
}

/// Guest web / in-app booking experience for shared availability (OpenTable-style).
struct GuestBookingView: View {
  @EnvironmentObject private var store: CalendarStore
  @Binding var isPresented: Bool
  @State private var step: Step = .times
  @State private var selectedSlot: FreeSlot?
  @State private var guestName = ""
  @State private var guestPhone = ""
  @State private var sent = false

  enum Step { case times, phone, done }

  private var slots: [FreeSlot] {
    store.freeSlots(scope: .solo)
  }

  private var slotsByDay: [(String, [FreeSlot])] {
    var order: [String] = []
    var map: [String: [FreeSlot]] = [:]
    for slot in slots {
      if map[slot.dayLabel] == nil {
        order.append(slot.dayLabel)
        map[slot.dayLabel] = []
      }
      map[slot.dayLabel]?.append(slot)
    }
    return order.map { ($0, map[$0] ?? []) }
  }

  private var canConfirmPhone: Bool {
    guestName.trimmingCharacters(in: .whitespaces).count >= 2
      && guestPhone.filter(\.isNumber).count >= 10
  }

  var body: some View {
    VStack(spacing: 0) {
      HStack {
        if step == .phone {
          Button {
            step = .times
            UISelectionFeedbackGenerator().selectionChanged()
          } label: {
            Image(systemName: "chevron.left")
              .font(.system(size: 14, weight: .semibold))
              .foregroundStyle(AppColor.ink)
              .frame(width: 32, height: 32)
              .background(AppColor.fill)
              .clipShape(Circle())
          }
        }
        Spacer()
        Button { isPresented = false } label: {
          Image(systemName: "xmark")
            .font(.system(size: 13, weight: .semibold))
            .foregroundStyle(AppColor.inkSoft)
            .frame(width: 32, height: 32)
            .background(AppColor.fill)
            .clipShape(Circle())
        }
      }
      .padding(.horizontal, 20)
      .padding(.bottom, 8)

      Group {
        switch step {
        case .times: timesStep
        case .phone: phoneStep
        case .done: doneStep
        }
      }
      .padding(.horizontal, 22)
    }
    .padding(.top, 8)
    .padding(.bottom, 20)
    .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .top)
    .background(AppColor.white)
    .presentationDragIndicator(.hidden)
  }

  private var timesStep: some View {
    VStack(alignment: .leading, spacing: 0) {
      HStack(spacing: 12) {
        Text(store.couple.me.initial)
          .font(AppFont.poppins(.semibold, size: 18))
          .foregroundStyle(AppColor.white)
          .frame(width: 44, height: 44)
          .background(store.meColor)
          .clipShape(Circle())
        VStack(alignment: .leading, spacing: 2) {
          Text("Book time with \(store.couple.me.name)")
            .font(AppFont.poppins(.semibold, size: 18))
            .foregroundStyle(AppColor.ink)
          Text("Open times · pick one to send an invite")
            .font(AppFont.poppins(.regular, size: 13))
            .foregroundStyle(AppColor.muted)
        }
      }
      .padding(.bottom, 20)

      if slots.isEmpty {
        Text("No open windows this week.")
          .font(AppType.body)
          .foregroundStyle(AppColor.muted)
          .frame(maxWidth: .infinity)
          .padding(.vertical, 32)
      } else {
        ScrollView {
          VStack(alignment: .leading, spacing: 18) {
            ForEach(slotsByDay, id: \.0) { day, daySlots in
              VStack(alignment: .leading, spacing: 10) {
                Text(day)
                  .font(AppFont.poppins(.medium, size: 13))
                  .foregroundStyle(AppColor.muted)
                  .textCase(.uppercase)
                  .tracking(0.3)
                FlowTimeChips(slots: daySlots, selected: selectedSlot) { slot in
                  selectedSlot = slot
                  UISelectionFeedbackGenerator().selectionChanged()
                }
              }
            }
          }
          .padding(.bottom, 12)
        }
      }

      PrimaryButton(title: "Continue", disabled: selectedSlot == nil) {
        step = .phone
        UISelectionFeedbackGenerator().selectionChanged()
      }
    }
  }

  private var phoneStep: some View {
    VStack(alignment: .leading, spacing: 0) {
      Text("Confirm your number")
        .font(AppFont.poppins(.semibold, size: 20))
        .foregroundStyle(AppColor.ink)
        .padding(.bottom, 8)
      Text("\(store.couple.me.name) can send updates or cancellations to this number. No Ours account needed.")
        .font(AppFont.poppins(.regular, size: 14))
        .foregroundStyle(AppColor.muted)
        .padding(.bottom, 20)

      if let slot = selectedSlot {
        Text("\(slot.dayLabel) · \(slot.timeLabel)")
          .font(AppFont.poppins(.medium, size: 15))
          .foregroundStyle(AppColor.ink)
          .padding(14)
          .frame(maxWidth: .infinity, alignment: .leading)
          .background(AppColor.fill)
          .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
          .padding(.bottom, 16)
      }

      field("Your name", text: $guestName, keyboard: .default)
        .padding(.bottom, 12)
      field("Phone number", text: $guestPhone, keyboard: .phonePad)

      Spacer(minLength: 16)

      PrimaryButton(title: "Send invite to \(store.couple.me.name)", disabled: !canConfirmPhone) {
        guard let slot = selectedSlot else { return }
        let name = guestName.trimmingCharacters(in: .whitespaces)
        store.receiveGuestBooking(
          title: "Plan with \(name)",
          start: slot.start,
          end: slot.end,
          guestName: name,
          guestPhone: guestPhone
        )
        UINotificationFeedbackGenerator().notificationOccurred(.success)
        withAnimation(.spring(response: 0.4, dampingFraction: 0.8)) {
          step = .done
          sent = true
        }
      }
    }
  }

  private var doneStep: some View {
    VStack(spacing: 14) {
      Spacer(minLength: 24)
      Image(systemName: "checkmark.circle.fill")
        .font(.system(size: 52))
        .foregroundStyle(AppColor.success)
        .scaleEffect(sent ? 1 : 0.7)
      Text("Invite sent")
        .font(AppFont.poppins(.semibold, size: 20))
        .foregroundStyle(AppColor.ink)
      Text("\(store.couple.me.name) will get your request and can confirm or suggest another time.")
        .font(AppFont.poppins(.regular, size: 14))
        .foregroundStyle(AppColor.muted)
        .multilineTextAlignment(.center)
        .padding(.horizontal, 12)
      Spacer(minLength: 24)
      PrimaryButton(title: "Done") { isPresented = false }
    }
    .frame(maxWidth: .infinity)
  }

  private func field(_ label: String, text: Binding<String>, keyboard: UIKeyboardType) -> some View {
    VStack(alignment: .leading, spacing: 8) {
      Text(label)
        .font(AppFont.poppins(.medium, size: 11))
        .tracking(0.4)
        .textCase(.uppercase)
        .foregroundStyle(AppColor.muted)
      TextField(label, text: text)
        .font(AppType.body)
        .keyboardType(keyboard)
        .padding(14)
        .background(AppColor.fill)
        .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
    }
  }
}

private struct FlowTimeChips: View {
  let slots: [FreeSlot]
  let selected: FreeSlot?
  let onSelect: (FreeSlot) -> Void

  var body: some View {
    LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 8) {
      ForEach(slots) { slot in
        let isOn = selected?.id == slot.id
        Button {
          onSelect(slot)
        } label: {
          Text(DateUtils.format(slot.start, "h:mm a"))
            .font(AppFont.poppins(isOn ? .medium : .regular, size: 15))
            .foregroundStyle(isOn ? AppColor.white : AppColor.ink)
            .frame(maxWidth: .infinity)
            .padding(.vertical, 14)
            .background(isOn ? AppColor.accent : AppColor.canvasElevated)
            .overlay(
              RoundedRectangle(cornerRadius: 14, style: .continuous)
                .stroke(isOn ? AppColor.accent : AppColor.hairline, lineWidth: 1)
            )
            .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
        }
        .buttonStyle(ScaleButtonStyle())
      }
    }
  }
}
