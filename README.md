# Ours

A warm, personal couples calendar for coordinating life one week at a time.

Native **SwiftUI** iPhone app. Your schedule is the primary layer, your partner’s sits softly underneath, and shared plans glow as a distinct third type. The first version uses rich mock data so the visual and interaction design can come first — no accounts, backends, or real calendar sync yet.

## Features

- **Week-at-a-time calendar** with day strip + layered day timeline
- **Three event layers**: yours, partner, together
- **Create individual plans** or **send shared requests**
- **Accept / suggest a different time / decline** on incoming requests
- **Voice quick-add** with mock speech recognition + natural language parsing
- **Find Time Together** — intersects both calendars and offers mutual free windows

## Run

```bash
cd Ours
xcodegen generate   # only after project.yml changes
open Ours.xcodeproj
```

Then press **Run** in Xcode (iOS 17+ Simulator or device).

## Stack

- SwiftUI · iOS 17+
- Poppins + IBM Plex Mono
- XcodeGen for the Xcode project

## Layout

```
Ours/
  Ours/           # Swift sources (views, store, theme, mock data)
  Fonts/          # Bundled typefaces
  Ours.xcodeproj
  project.yml
```
