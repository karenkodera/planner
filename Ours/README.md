# Ours (Native Swift)

True native iOS rewrite of the couples calendar prototype — SwiftUI, no React Native / Expo runtime.

## Requirements

- macOS with Xcode 15+
- iOS 17+ Simulator or device

## Run

```bash
cd Ours
xcodegen generate   # only needed after project.yml changes
xcodebuild -project Ours.xcodeproj -scheme Ours \
  -destination 'platform=iOS Simulator,name=iPhone 17' build
xcrun simctl install booted \
  ~/Library/Developer/Xcode/DerivedData/Ours-*/Build/Products/Debug-iphonesimulator/Ours.app
xcrun simctl launch booted us.kodera.ours
```

Or open `Ours/Ours.xcodeproj` in Xcode and press Run.

After pulling changes or adding Swift files, regenerate the project and reinstall on the simulator so Xcode picks up new sources:

```bash
cd Ours
xcodegen generate
# Product → Clean Build Folder in Xcode, then Run
```

## What’s included

Same UI and mock data as the Expo prototype:

- Week day cards with yours / partner / together layers
- Month picker, day timeline detail
- Create / edit events, voice quick-add (mock), find time together
- Shared request RSVP flow
- Profile, notifications prefs, work hours

Fonts: Poppins + IBM Plex Mono (bundled).
